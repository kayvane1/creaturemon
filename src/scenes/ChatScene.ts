import Phaser from 'phaser';
import { COMPUTER_CHAT_PROFILE, CODEX_GIFTS, NPC_CHAT_PROFILES, type CodexChatMode } from '../data/codexChat';
import { GameState } from '../state/GameState';
import { sendCodexChat, type CodexChatGift } from '../systems/codexChat';
import { GameSession } from '../systems/session/GameSession';

interface ChatScenePayload {
  mode: CodexChatMode;
  conversationId: string;
  npcId?: string;
  onClose?: () => void;
}

type ChatRole = 'player' | 'assistant' | 'system';

export class ChatScene extends Phaser.Scene {
  private payload!: ChatScenePayload;
  private root?: HTMLDivElement;
  private log?: HTMLDivElement;
  private textInputEl?: HTMLInputElement;
  private form?: HTMLFormElement;
  private closeButton?: HTMLButtonElement;
  private closed = false;

  constructor() {
    super('ChatScene');
  }

  create(payload: ChatScenePayload): void {
    this.payload = payload;
    this.closed = false;
    this.createOverlay();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private createOverlay(): void {
    const profile = this.profile();
    const root = document.createElement('div');
    root.className = `codex-chat codex-chat--${this.payload.mode}`;
    root.tabIndex = -1;

    const panel = document.createElement('section');
    panel.className = 'codex-chat__panel';
    panel.setAttribute('aria-label', `${profile.displayName} chat`);

    const header = document.createElement('header');
    header.className = 'codex-chat__header';

    const title = document.createElement('div');
    title.className = 'codex-chat__title';
    title.textContent = this.payload.mode === 'computer' ? 'CODEX-86' : `LINK // ${profile.displayName.toUpperCase()}`;

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'codex-chat__close';
    this.closeButton.textContent = 'X';
    this.closeButton.addEventListener('click', () => this.close());

    header.append(title, this.closeButton);

    this.log = document.createElement('div');
    this.log.className = 'codex-chat__log';
    this.log.setAttribute('role', 'log');

    this.form = document.createElement('form');
    this.form.className = 'codex-chat__form';
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.submit();
    });

    const prompt = document.createElement('span');
    prompt.className = 'codex-chat__prompt';
    prompt.textContent = '>';

    this.textInputEl = document.createElement('input');
    this.textInputEl.className = 'codex-chat__input';
    this.textInputEl.autocomplete = 'off';
    this.textInputEl.spellcheck = false;
    this.textInputEl.maxLength = 220;
    this.textInputEl.placeholder = this.payload.mode === 'computer' ? 'ASK CODEX' : 'SAY SOMETHING';

    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'codex-chat__send';
    send.textContent = 'SEND';

    this.form.append(prompt, this.textInputEl, send);
    panel.append(header, this.log, this.form);
    root.append(panel);

    const stop = (event: Event) => event.stopPropagation();
    root.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if ((event as KeyboardEvent).key === 'Escape') this.close();
    });
    root.addEventListener('keyup', stop);
    root.addEventListener('keypress', stop);
    root.addEventListener('pointerdown', stop);

    document.body.append(root);
    this.root = root;
    this.appendMessage('system', profile.displayName, this.payload.mode === 'computer' ? 'READY.' : `${profile.displayName} is listening.`);
    this.textInputEl.focus();
  }

  private profile() {
    if (this.payload.mode === 'computer') return COMPUTER_CHAT_PROFILE;
    return NPC_CHAT_PROFILES[this.payload.npcId ?? ''] ?? {
      displayName: 'Townie',
      npcId: 'townie',
      persona: '',
      capabilities: [],
      gift: null,
      fallbackReplies: [],
    };
  }

  private async submit(): Promise<void> {
    if (!this.textInputEl || !this.form) return;
    const message = this.textInputEl.value.trim();
    if (!message) return;

    this.textInputEl.value = '';
    this.textInputEl.disabled = true;
    this.form.classList.add('codex-chat__form--busy');
    this.appendMessage('player', GameState.playerName, message);
    const thinking = this.appendMessage('system', 'SIGNAL', '...');

    try {
      const response = await sendCodexChat({
        mode: this.payload.mode,
        conversationId: this.payload.conversationId,
        npcId: this.payload.npcId,
        message,
      });
      thinking.remove();
      this.appendMessage('assistant', response.speaker, response.reply);
      this.acceptGift(response.gift);
    } catch (error) {
      thinking.remove();
      this.appendMessage('system', 'SIGNAL', error instanceof Error ? error.message : 'The signal dropped.');
    } finally {
      this.textInputEl.disabled = false;
      this.form.classList.remove('codex-chat__form--busy');
      this.textInputEl.focus();
    }
  }

  private acceptGift(gift: CodexChatGift | null): void {
    if (!gift || !CODEX_GIFTS[gift.id]) return;
    if (!GameSession.acceptCodexGift(gift)) return;
    this.appendMessage('system', 'GIFT', `Received ${gift.displayName}.`);
  }

  private appendMessage(role: ChatRole, speaker: string, text: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = `codex-chat__message codex-chat__message--${role}`;

    const name = document.createElement('span');
    name.className = 'codex-chat__speaker';
    name.textContent = speaker;

    const body = document.createElement('span');
    body.className = 'codex-chat__body';
    body.textContent = text;

    row.append(name, body);
    this.log?.append(row);
    this.log?.scrollTo({ top: this.log.scrollHeight });
    return row;
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    const onClose = this.payload.onClose;
    this.cleanup();
    this.scene.stop();
    onClose?.();
  }

  private cleanup(): void {
    this.root?.remove();
    this.root = undefined;
    this.log = undefined;
    this.textInputEl = undefined;
    this.form = undefined;
    this.closeButton = undefined;
  }
}
