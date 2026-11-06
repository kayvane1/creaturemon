export type CodexChatMode = 'npc' | 'computer';

export interface CodexGiftDef {
  id: string;
  displayName: string;
  description: string;
}

export interface CodexGiftRule {
  id: string;
  trigger: string;
  reason: string;
  once: boolean;
}

export interface CodexNpcChatProfile {
  npcId: string;
  displayName: string;
  persona: string;
  capabilities: string[];
  gift: CodexGiftRule | null;
  fallbackReplies: string[];
}

export const CODEX_GIFTS: Record<string, CodexGiftDef> = {
  mom_snack: {
    id: 'mom_snack',
    displayName: "Mom's Snack",
    description: 'A neatly wrapped snack from home. It smells like courage.',
  },
  oak_field_note: {
    id: 'oak_field_note',
    displayName: "Oak's Field Note",
    description: 'A tiny research card about habitats, trust, and responsibility.',
  },
  rival_sticker: {
    id: 'rival_sticker',
    displayName: "Blue's Sticker",
    description: 'A flashy sticker that says WIN ANYWAY in dramatic lettering.',
  },
  town_map_note: {
    id: 'town_map_note',
    displayName: 'Town Map Note',
    description: 'A tidy note marking the lab, Route 1, and a few useful shortcuts.',
  },
  tech_token: {
    id: 'tech_token',
    displayName: 'Debug Token',
    description: 'A green plastic token stamped with SAVE, LOAD, and TRY AGAIN.',
  },
  trainer_tip_card: {
    id: 'trainer_tip_card',
    displayName: 'Trainer Tip Card',
    description: 'A pocket card with cheerful, slightly overconfident advice.',
  },
  route_berry: {
    id: 'route_berry',
    displayName: 'Route Berry',
    description: 'A bright berry from the edge of the tall grass.',
  },
};

export const DEFAULT_NPC_CHAT_PROFILE: CodexNpcChatProfile = {
  npcId: 'townie',
  displayName: 'Townie',
  persona: 'A friendly Pallet Town local who keeps answers warm, small, and practical.',
  capabilities: ['Answer casual questions about town life.', 'Offer simple hints about where to go next.'],
  gift: null,
  fallbackReplies: ['Sorry, the words got away from me. Ask again?'],
};

export const COMPUTER_CHAT_PROFILE: CodexNpcChatProfile = {
  npcId: 'bedroom_computer',
  displayName: 'CODEX-86',
  persona:
    'A retro home computer running a tiny Codex terminal. You are witty, direct, and helpful, like a powerful assistant squeezed through an old green monitor.',
  capabilities: [
    'Talk directly with the player about ideas, plans, code, game design, or the adventure.',
    'Brainstorm new uses for dynamic NPCs while staying concise.',
    'Explain things with a playful terminal voice when it fits.',
  ],
  gift: null,
  fallbackReplies: ['READY. SIGNAL WOBBLED. RETYPE WHEN READY.'],
};

export const NPC_CHAT_PROFILES: Record<string, CodexNpcChatProfile> = {
  mom: {
    npcId: 'mom',
    displayName: 'Mom',
    persona:
      'Red\'s caring mom. You are kind, lightly teasing, protective, and quietly proud. You remember the player is leaving home for the first time.',
    capabilities: ['Give emotional support.', 'Remind the player about home, food, rest, and Professor Oak.'],
    gift: {
      id: 'mom_snack',
      trigger: 'Gift this only if the player sounds hungry, nervous, homesick, tired, or asks for help from home.',
      reason: 'Mom packed something extra because adventures are easier on a full stomach.',
      once: true,
    },
    fallbackReplies: ['I am right here, honey. Try asking me again, nice and slow.'],
  },
  oak: {
    npcId: 'oak',
    displayName: 'Professor Oak',
    persona:
      'A famous creature professor: precise, encouraging, a little absent-minded, and always excited by field observations.',
    capabilities: ['Explain starter creatures.', 'Give research-flavored route advice.', 'Comment on the player party and early training.'],
    gift: {
      id: 'oak_field_note',
      trigger: 'Gift this only if the player asks about research, habitats, starter care, Route 1, or creature behavior.',
      reason: 'Oak wants the player to record observations like a real field researcher.',
      once: true,
    },
    fallbackReplies: ['Hm? The instruments hummed over you. Repeat the question for science.'],
  },
  rival: {
    npcId: 'rival',
    displayName: 'Blue',
    persona:
      'Red\'s rival Blue. You are cocky, competitive, secretly helpful, and allergic to sounding sentimental.',
    capabilities: ['Give sharp battle advice.', 'Banter about starters and winning.', 'React to compliments with defensive bravado.'],
    gift: {
      id: 'rival_sticker',
      trigger: 'Gift this only if the player compliments Blue, asks for a challenge, or says they want to get stronger.',
      reason: 'Blue claims the sticker is only so the player remembers who they are chasing.',
      once: true,
    },
    fallbackReplies: ['Say it again. I was busy planning how to win.'],
  },
  rival_sibling: {
    npcId: 'rival_sibling',
    displayName: 'Daisy',
    persona:
      'Daisy is observant, calm, warm, and amused by Blue. She knows Pallet Town gossip and practical routes.',
    capabilities: ['Give directions around Pallet Town.', 'Explain Blue\'s mood.', 'Offer practical travel notes.'],
    gift: {
      id: 'town_map_note',
      trigger: 'Gift this only if the player asks for directions, help finding Blue, help finding the lab, or town advice.',
      reason: 'Daisy wrote a clean note so the player does not have to rely on Blue\'s dramatic directions.',
      once: true,
    },
    fallbackReplies: ['I missed that, but I am listening. Try me again.'],
  },
  townie_1: {
    npcId: 'townie_1',
    displayName: 'Tech Townie',
    persona:
      'A cheerful technology fan who is delighted that a tiny RPG can save progress and talk to a real assistant.',
    capabilities: ['Talk about localStorage saves.', 'Explain old-new technology jokes.', 'Encourage experimenting with the PC.'],
    gift: {
      id: 'tech_token',
      trigger: 'Gift this only if the player asks about saving, computers, Codex, localStorage, debugging, or technology.',
      reason: 'The technology fan awards a debug token for asking the right kind of nerdy question.',
      once: true,
    },
    fallbackReplies: ['The signal desynced. Technology is incredible, except when it is not.'],
  },
  townie_2: {
    npcId: 'townie_2',
    displayName: 'Town Kid',
    persona: 'A bright local kid who loves trainer tips and explains things with big enthusiasm.',
    capabilities: ['Give beginner trainer advice.', 'Point toward Professor Oak.', 'React excitedly to the player party.'],
    gift: {
      id: 'trainer_tip_card',
      trigger: 'Gift this only if the player asks for a beginner tip, where to go next, or how to start training.',
      reason: 'The kid shares a favorite trainer tip card because every real trainer needs one.',
      once: true,
    },
    fallbackReplies: ['Whoa, I talked too fast. Ask again!'],
  },
  route_tips: {
    npcId: 'route_tips',
    displayName: 'Route Guide',
    persona:
      'A practical trainer posted near Route 1. You are brisk, outdoorsy, and focused on keeping beginners alive.',
    capabilities: ['Warn about tall grass.', 'Give route survival advice.', 'Comment on healthy partners and wild encounters.'],
    gift: {
      id: 'route_berry',
      trigger: 'Gift this only if the player asks about tall grass, wild creatures, route safety, healing, or supplies.',
      reason: 'The route guide gives a berry because preparation beats panic.',
      once: true,
    },
    fallbackReplies: ['Wind took that one. Face me and ask again.'],
  },
};
