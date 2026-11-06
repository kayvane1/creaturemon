import { spawn } from 'node:child_process';

const REQUEST_TIMEOUT_MS = 15_000;
const TURN_TIMEOUT_MS = 9_000;
const IDLE_SHUTDOWN_MS = Number(process.env.CREATUREMON_CODEX_IDLE_SHUTDOWN_MS ?? 60_000);
const CODEX_CHAT_MODEL = process.env.CREATUREMON_CODEX_MODEL ?? 'gpt-5.3-codex-spark';
const WARM_PROFILE_IDS = ['bedroom_computer', 'mom', 'townie_1', 'townie_2'];

const CHAT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    gift: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['id', 'reason'],
        },
      ],
    },
  },
  required: ['reply', 'gift'],
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 12_000) {
        reject(new Error('Chat payload is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Chat payload must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function textInput(text) {
  return { type: 'text', text, text_elements: [] };
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseChatOutput(text) {
  const direct = stripCodeFence(text);
  try {
    return JSON.parse(direct);
  } catch {
    const start = direct.indexOf('{');
    const end = direct.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(direct.slice(start, end + 1));
      } catch {
        // Fall through to plain-text fallback.
      }
    }
  }
  return { reply: direct, gift: null };
}

function clampReply(text) {
  const singleSpaced = String(text || '').replace(/\s+/g, ' ').trim();
  if (!singleSpaced) return '...';
  return singleSpaced.slice(0, 420);
}

function cleanSpeakerPrefix(text, speaker) {
  const reply = clampReply(text);
  const escaped = speaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return reply.replace(new RegExp(`^${escaped}\\s*:\\s*`, 'i'), '').trim() || reply;
}

function serializeList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function buildBaseInstructions(profile, gifts) {
  const gift = profile.gift ? gifts[profile.gift.id] : null;
  const giftLines = gift
    ? [
        `Allowed gift id: ${gift.id}`,
        `Gift name: ${gift.displayName}`,
        `Gift trigger: ${profile.gift.trigger}`,
        `Gift once: ${profile.gift.once ? 'yes' : 'no'}`,
        `Gift reason to use if triggered: ${profile.gift.reason}`,
      ].join('\n')
    : 'This profile is not allowed to gift anything. Always set gift to null.';

  return [
    'You are an in-game character inside a retro creature-collecting RPG.',
    'Stay fully in character and keep the illusion of a living NPC or terminal.',
    'Do not call tools, inspect files, run commands, or mention being a subprocess.',
    'Keep replies short enough for a tiny game terminal: 1 to 3 compact sentences.',
    'Do not prefix reply text with your own name; the game UI already shows the speaker.',
    'You must respond with JSON only, matching this exact shape: {"reply":"...","gift":null} or {"reply":"...","gift":{"id":"...","reason":"..."}}.',
    'Never say you gifted something unless the gift field is non-null.',
    'Never invent a gift id. Use only the allowed gift id below, and only when the player clearly satisfies the trigger.',
    '',
    `Name: ${profile.displayName}`,
    `Persona: ${profile.persona}`,
    '',
    'Capabilities:',
    serializeList(profile.capabilities),
    '',
    'Gift rules:',
    giftLines,
  ].join('\n');
}

function buildTurnPrompt(payload, profile) {
  const context = {
    mode: payload.mode,
    npcId: payload.npcId ?? null,
    playerName: payload.playerName ?? 'Red',
    map: payload.map ?? null,
    party: payload.party ?? [],
    inventory: payload.inventory ?? {},
    flags: payload.flags ?? {},
    profileCapabilities: profile.capabilities,
  };

  return [
    `GAME_CONTEXT_JSON: ${JSON.stringify(context)}`,
    `PLAYER_MESSAGE: ${String(payload.message ?? '').slice(0, 600)}`,
  ].join('\n');
}

function fallbackReply(profile, message) {
  const replies = profile.fallbackReplies ?? ['The terminal flickers. Try me again in a moment.'];
  const seed = String(message ?? '').length % replies.length;
  return replies[seed];
}

function normalizedMessage(message) {
  return String(message ?? '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

function isTinyGreeting(message) {
  return /^(hey|hi|hello|yo|hiya|sup|howdy|morning|afternoon|evening|hey there|hello there)$/.test(normalizedMessage(message));
}

function includesAny(message, keywords) {
  const text = normalizedMessage(message);
  return keywords.some((keyword) => text.includes(keyword));
}

function quickGreeting(profile) {
  const greetings = {
    mom: 'Hi, honey. Deep breath. I am right here.',
    oak: 'Ah, hello! A fine day for careful observation.',
    rival: 'Hey, Red. Try to keep up.',
    rival_sibling: 'Hi, Red. Blue dashed out looking very not-calm.',
    townie_1: 'Hey! Technology is incredible today too.',
    townie_2: 'Hiya! Are you starting your adventure?',
    route_tips: 'Hey there. Check your partner before the grass.',
    bedroom_computer: 'READY. CODEX-86 ONLINE.',
  };
  return greetings[profile.npcId] ?? `Hi, ${profile.displayName} is listening.`;
}

function quickGiftKeywords(profile) {
  const byNpc = {
    mom: ['hungry', 'nervous', 'homesick', 'tired', 'scared', 'home', 'help'],
    oak: ['research', 'habitat', 'starter', 'route 1', 'creature', 'behavior', 'field'],
    rival: ['stronger', 'challenge', 'battle', 'train', 'win', 'cool', 'best'],
    rival_sibling: ['where', 'directions', 'lab', 'blue', 'town', 'map'],
    townie_1: ['save', 'computer', 'codex', 'debug', 'technology', 'localstorage'],
    townie_2: ['tip', 'where', 'next', 'start', 'training', 'trainer', 'advice'],
    route_tips: ['grass', 'wild', 'route', 'safe', 'safety', 'heal', 'supplies', 'berry'],
  };
  return byNpc[profile.npcId] ?? [];
}

function quickGiftReply(profile) {
  const replies = {
    mom: 'I tucked something extra in your bag. Adventures are easier when you have had a snack.',
    oak: 'Take this field note. Real trainers observe first and panic later.',
    rival: 'Fine, take this. It is not sentimental. It is motivation.',
    rival_sibling: 'Here, I wrote it neatly. Blue would have drawn arrows everywhere.',
    townie_1: 'That is the right kind of question. Take this little debug token.',
    townie_2: 'You need a trainer tip card! I saved my favorite one for this exact moment.',
    route_tips: 'Good thinking. Take a berry before the tall grass gets ideas.',
  };
  return replies[profile.npcId] ?? fallbackReply(profile, '');
}

function instantChat(payload, profile, gifts) {
  if (isTinyGreeting(payload.message)) {
    return { reply: quickGreeting(profile), gift: null };
  }

  if (!profile.gift) return null;
  const owned = Number(payload.inventory?.[profile.gift.id] ?? 0);
  if (profile.gift.once && owned > 0) return null;
  if (!includesAny(payload.message, quickGiftKeywords(profile))) return null;

  const gift = gifts[profile.gift.id];
  if (!gift) return null;
  return {
    reply: quickGiftReply(profile),
    gift: {
      id: gift.id,
      displayName: gift.displayName,
      description: gift.description,
      reason: profile.gift.reason,
    },
  };
}

class CodexAppServerClient {
  constructor(root) {
    this.root = root;
    this.proc = null;
    this.buffer = '';
    this.requestId = 1;
    this.pending = new Map();
    this.turns = new Map();
    this.threadByConversation = new Map();
    this.initializePromise = null;
    this.idleTimer = null;
    this.closing = false;
  }

  async chat(payload, profiles, gifts) {
    const profile = this.resolveProfile(payload, profiles);
    const conversationId = this.conversationId(payload, profile);
    const startedAt = Date.now();

    const instant = instantChat(payload, profile, gifts);
    if (instant) {
      return {
        ok: true,
        fallback: false,
        source: 'instant',
        latencyMs: Date.now() - startedAt,
        conversationId,
        speaker: profile.displayName,
        reply: cleanSpeakerPrefix(instant.reply, profile.displayName),
        gift: instant.gift,
      };
    }

    try {
      await this.ensureInitialized();
      const threadId = await this.ensureThread(conversationId, profile, gifts);
      const text = await this.runTurn(threadId, buildTurnPrompt(payload, profile));
      const parsed = parseChatOutput(text);
      const gift = this.sanitizeGift(parsed.gift, profile, gifts, payload.inventory ?? {});
      return {
        ok: true,
        fallback: false,
        source: 'codex',
        latencyMs: Date.now() - startedAt,
        conversationId,
        threadId,
        speaker: profile.displayName,
        reply: cleanSpeakerPrefix(parsed.reply, profile.displayName),
        gift,
      };
    } catch (error) {
      return {
        ok: true,
        fallback: true,
        source: 'fallback',
        latencyMs: Date.now() - startedAt,
        conversationId,
        speaker: profile.displayName,
        reply: fallbackReply(profile, payload.message),
        gift: null,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.scheduleIdleShutdown();
    }
  }

  resolveProfile(payload, profiles) {
    if (payload.mode === 'computer') return profiles.COMPUTER_CHAT_PROFILE;
    const npcId = String(payload.npcId ?? '');
    return profiles.NPC_CHAT_PROFILES[npcId] ?? profiles.DEFAULT_NPC_CHAT_PROFILE;
  }

  conversationId(payload, profile) {
    const requested = String(payload.conversationId ?? '').trim();
    if (requested) return requested.slice(0, 120);
    return payload.mode === 'computer' ? 'computer:bedroom' : `npc:${profile.npcId}`;
  }

  sanitizeGift(gift, profile, gifts, inventory) {
    if (!gift || !profile.gift) return null;
    if (gift.id !== profile.gift.id) return null;
    const definition = gifts[gift.id];
    if (!definition) return null;
    const owned = Number(inventory[gift.id] ?? 0);
    if (profile.gift.once && owned > 0) return null;
    return {
      id: definition.id,
      displayName: definition.displayName,
      description: definition.description,
      reason: clampReply(gift.reason || profile.gift.reason),
    };
  }

  ensureInitialized() {
    this.cancelIdleShutdown();
    if (this.initializePromise) return this.initializePromise;
    this.initializePromise = this.initialize().catch((error) => {
      this.initializePromise = null;
      throw error;
    });
    return this.initializePromise;
  }

  async initialize() {
    this.startProcess();
    await this.request('initialize', {
      clientInfo: {
        name: 'creaturemon-codex-npcs',
        title: 'Creaturemon Dynamic NPCs',
        version: '0.1.0',
      },
      capabilities: { experimentalApi: true },
    });
    this.notify('initialized');
  }

  startProcess() {
    if (this.proc) return;
    this.closing = false;
    this.proc = spawn('codex', ['app-server', '--listen', 'stdio://'], {
      cwd: this.root,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk) => this.handleStdout(chunk));
    this.proc.stderr.setEncoding('utf8');
    this.proc.stderr.on('data', (chunk) => {
      if (process.env.CREATUREMON_CODEX_DEBUG === '1') process.stderr.write(chunk);
    });
    this.proc.on('error', (error) => {
      this.rejectAll(error);
      this.proc = null;
      this.initializePromise = null;
    });
    this.proc.on('exit', () => {
      this.cancelIdleShutdown();
      this.proc = null;
      this.initializePromise = null;
      this.rejectAll(new Error('Codex app-server exited.'));
      this.threadByConversation.clear();
      this.closing = false;
    });
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    for (const turn of this.turns.values()) {
      clearTimeout(turn.timer);
      turn.reject(error);
    }
    this.pending.clear();
    this.turns.clear();
  }

  handleStdout(chunk) {
    this.buffer += chunk;
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line) this.handleMessage(JSON.parse(line));
      newline = this.buffer.indexOf('\n');
    }
  }

  handleMessage(message) {
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message ?? 'Codex request failed.'));
      else pending.resolve(message.result);
      return;
    }

    if (message.method === 'item/agentMessage/delta') {
      const turn = this.turns.get(message.params.turnId);
      if (turn) turn.text += message.params.delta;
      return;
    }

    if (message.method === 'item/completed' && message.params.item?.type === 'agentMessage') {
      const turn = this.turns.get(message.params.turnId);
      if (turn && !turn.text) turn.text = message.params.item.text ?? '';
      return;
    }

    if (message.method === 'turn/completed') {
      const turn = this.turns.get(message.params.turn.id);
      if (!turn) return;
      this.turns.delete(message.params.turn.id);
      clearTimeout(turn.timer);
      if (message.params.turn.status === 'completed') turn.resolve(turn.text);
      else turn.reject(new Error(message.params.turn.error?.message ?? 'Codex turn failed.'));
    }
  }

  request(method, params, timeoutMs = REQUEST_TIMEOUT_MS) {
    this.startProcess();
    const id = this.requestId++;
    this.proc.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  notify(method, params) {
    this.proc?.stdin.write(`${JSON.stringify(params === undefined ? { method } : { method, params })}\n`);
  }

  scheduleIdleShutdown() {
    if (!this.proc || this.closing || IDLE_SHUTDOWN_MS <= 0) return;
    this.cancelIdleShutdown();
    this.idleTimer = setTimeout(() => this.close(), IDLE_SHUTDOWN_MS);
    this.idleTimer.unref?.();
  }

  cancelIdleShutdown() {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  async ensureThread(conversationId, profile, gifts) {
    const existing = this.threadByConversation.get(conversationId);
    if (existing) return existing;
    const result = await this.request('thread/start', {
      model: CODEX_CHAT_MODEL,
      cwd: this.root,
      approvalPolicy: 'never',
      sandbox: 'read-only',
      baseInstructions: buildBaseInstructions(profile, gifts),
      ephemeral: true,
      environments: [],
      dynamicTools: [],
      experimentalRawEvents: false,
      persistExtendedHistory: false,
    });
    const threadId = result.thread.id;
    this.threadByConversation.set(conversationId, threadId);
    return threadId;
  }

  async runTurn(threadId, prompt) {
    const result = await this.request('turn/start', {
      threadId,
      input: [textInput(prompt)],
      cwd: this.root,
      approvalPolicy: 'never',
      model: CODEX_CHAT_MODEL,
      effort: 'low',
      summary: 'none',
      outputSchema: CHAT_OUTPUT_SCHEMA,
      environments: [],
    });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.turns.delete(result.turn.id);
        void this.interruptTurn(threadId, result.turn.id);
        reject(new Error('Codex turn timed out.'));
      }, TURN_TIMEOUT_MS);
      this.turns.set(result.turn.id, { resolve, reject, timer, text: '' });
    });
  }

  async interruptTurn(threadId, turnId) {
    try {
      await this.request('turn/interrupt', { threadId, turnId }, 2_000);
    } catch {
      // The fallback already unblocked the game; interruption is best-effort.
    }
  }

  warm(profiles, gifts) {
    void (async () => {
      try {
        await this.ensureInitialized();
        const warmProfiles = [
          profiles.COMPUTER_CHAT_PROFILE,
          ...Object.values(profiles.NPC_CHAT_PROFILES).filter((profile) => WARM_PROFILE_IDS.includes(profile.npcId)),
        ];
        for (const profile of warmProfiles) {
          const id = profile.npcId === 'bedroom_computer' ? 'computer:bedroom' : `npc:${profile.npcId}`;
          await this.ensureThread(id, profile, gifts);
        }
      } catch {
        // First real request still has the normal fallback path.
      } finally {
        this.scheduleIdleShutdown();
      }
    })();
  }

  close() {
    if (!this.proc || this.closing) return;
    this.closing = true;
    this.cancelIdleShutdown();

    for (const threadId of new Set(this.threadByConversation.values())) {
      this.notify('thread/unsubscribe', { threadId });
    }
    this.threadByConversation.clear();

    this.rejectAll(new Error('Codex app-server closed.'));
    this.proc.stdin.end();

    const proc = this.proc;
    const killTimer = setTimeout(() => proc.kill('SIGKILL'), 2_000);
    killTimer.unref?.();
    proc.once('exit', () => clearTimeout(killTimer));
    proc.kill('SIGTERM');
  }
}

export function createCodexNpcChatPlugin() {
  let client;
  let installedShutdownHooks = false;

  const closeClient = () => client?.close();

  return {
    name: 'creaturemon-codex-npc-chat',
    configureServer(server) {
      client = new CodexAppServerClient(server.config.root);
      if (!installedShutdownHooks) {
        installedShutdownHooks = true;
        process.once('beforeExit', closeClient);
        for (const signal of ['SIGINT', 'SIGTERM']) {
          process.once(signal, () => {
            closeClient();
            process.exit(signal === 'SIGINT' ? 130 : 143);
          });
        }
      }
      server.httpServer?.once('listening', async () => {
        try {
          const profiles = await server.ssrLoadModule('/src/data/codexChat.ts');
          client.warm(profiles, profiles.CODEX_GIFTS);
        } catch {
          // Warming is opportunistic and must not block Vite startup.
        }
      });
      server.middlewares.use('/api/codex-chat', async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const payload = await readJsonBody(req);
          const profiles = await server.ssrLoadModule('/src/data/codexChat.ts');
          const result = await client.chat(payload, profiles, profiles.CODEX_GIFTS);
          sendJson(res, 200, result);
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            reply: 'The terminal crackles and drops the signal.',
            gift: null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      server.httpServer?.once('close', () => client?.close());
    },
  };
}
