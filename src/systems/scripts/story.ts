import { DIALOGUE } from '../../data/dialogue';
import { FLAGS, type FlagId } from '../../data/flags';
import type { MapDef, WarpDef } from '../../data/maps';
import { createPokemon } from '../../data/species';
import type { BattleRequest, BattleResult, Direction } from '../../types';

export const STORY_SCRIPTS = {
  intro_mom: {
    flags: [FLAGS.MET_MOM],
    dialogue: 'intro_mom',
  },
  oak_intercept: {
    flags: [FLAGS.OAK_INTERCEPTED],
    dialogue: 'oak_intercept',
  },
  starter_confirmed: {
    flags: [FLAGS.GOT_STARTER],
    dialogue: 'post_starter',
  },
  rival_battle_1: {
    flags: [FLAGS.BEAT_RIVAL_1, FLAGS.LAB_POST_BATTLE, FLAGS.ROUTE_1_CLEAR],
    dialogue: 'lab_post_battle',
  },
  viridian_to_be_continued: {
    flags: [FLAGS.REACHED_VIRIDIAN],
    dialogue: 'viridian_to_be_continued',
  },
} as const;

export type StoryScriptId = keyof typeof STORY_SCRIPTS;

export interface StorySnapshot {
  map: string;
  flags: Record<string, boolean>;
  rivalName: string;
  rivalStarter: string | null;
}

export type StoryEvent =
  | { type: 'mapEntered'; map: string }
  | { type: 'stepTriggerEntered'; triggerId: string }
  | { type: 'starterConfirmed'; speciesId: string }
  | { type: 'battleFinished'; outcome: BattleResult['outcome']; request: BattleRequest }
  | { type: 'warpAttempted'; warp: Pick<WarpDef, 'blockedUntilFlag' | 'blockedText'> };

export interface StoryFlagMutation {
  flag: FlagId;
  value?: boolean;
}

export interface StoryDialogueOutcome {
  dialogueId: string;
}

export interface StoryTeleportOutcome {
  map: string;
  x: number;
  y: number;
  facing: Direction;
}

export interface StoryOutcome {
  setFlags: StoryFlagMutation[];
  showDialogue?: StoryDialogueOutcome;
  teleport?: StoryTeleportOutcome;
  startBattle?: BattleRequest;
  blockWarp?: string;
  save: boolean;
  giveStarter?: string;
}

const STARTER_COUNTERS: Record<string, string> = {
  bulb_eq: 'char_eq',
  char_eq: 'squirt_eq',
  squirt_eq: 'bulb_eq',
};

export function handleStoryEvent(event: StoryEvent, snapshot: StorySnapshot): StoryOutcome {
  if (event.type === 'mapEntered') {
    if (event.map === 'house_downstairs') return storyTriggerOutcome('intro_mom', snapshot);
    return emptyOutcome();
  }

  if (event.type === 'stepTriggerEntered') {
    if (!isStoryScriptId(event.triggerId)) return emptyOutcome();
    return storyTriggerOutcome(event.triggerId, snapshot);
  }

  if (event.type === 'starterConfirmed') {
    if (hasFlag(snapshot, FLAGS.GOT_STARTER)) {
      return { ...emptyOutcome(), showDialogue: { dialogueId: 'no_starter_ball' } };
    }
    const rivalSpecies = STARTER_COUNTERS[event.speciesId] ?? 'bulb_eq';
    return {
      setFlags: [{ flag: FLAGS.GOT_STARTER }],
      giveStarter: event.speciesId,
      showDialogue: { dialogueId: 'post_starter' },
      startBattle: {
        kind: 'trainer',
        opponentName: snapshot.rivalName,
        roster: [createPokemon(rivalSpecies, 5)],
        canRun: false,
        returnMap: 'oaks_lab',
        returnX: 8,
        returnY: 10,
        returnFacing: 'up',
        postBattleEvent: 'rival_battle_1',
      },
      save: true,
    };
  }

  if (event.type === 'battleFinished') {
    if (event.request.postBattleEvent !== 'rival_battle_1') return emptyOutcome();
    const setFlags: StoryFlagMutation[] = [];
    if (event.outcome === 'win') setFlags.push({ flag: FLAGS.BEAT_RIVAL_1 });
    if (!hasFlag(snapshot, FLAGS.LAB_POST_BATTLE)) {
      setFlags.push({ flag: FLAGS.LAB_POST_BATTLE }, { flag: FLAGS.ROUTE_1_CLEAR });
    }
    return {
      setFlags,
      showDialogue: hasFlag(snapshot, FLAGS.LAB_POST_BATTLE) ? undefined : { dialogueId: 'lab_post_battle' },
      save: true,
    };
  }

  if (event.type === 'warpAttempted') {
    const flag = event.warp.blockedUntilFlag;
    if (flag && !hasFlag(snapshot, flag)) {
      return { ...emptyOutcome(), blockWarp: event.warp.blockedText ?? 'The way is blocked.' };
    }
  }

  return emptyOutcome();
}

export function validateStoryReferencesForMap(map: MapDef): void {
  const flags = new Set<string>(Object.values(FLAGS));
  for (const trigger of map.scriptTriggers) {
    if (!isStoryScriptId(trigger.id)) throw new Error(`Map "${map.key}" has unknown story trigger "${trigger.id}"`);
  }
  for (const warp of map.warps) {
    if (warp.blockedUntilFlag && !flags.has(warp.blockedUntilFlag)) {
      throw new Error(`Map "${map.key}" has warp with unknown flag "${warp.blockedUntilFlag}"`);
    }
  }
  for (const npc of map.npcs) {
    if (!DIALOGUE[npc.dialogue_id]) throw new Error(`Map "${map.key}" NPC "${npc.id}" has unknown dialogue "${npc.dialogue_id}"`);
  }
  for (const prop of map.props) {
    if (prop.dialogue_id && !DIALOGUE[prop.dialogue_id]) throw new Error(`Map "${map.key}" prop "${prop.id}" has unknown dialogue "${prop.dialogue_id}"`);
  }
}

export function validateStoryCatalog(): void {
  const flags = new Set<string>(Object.values(FLAGS));
  for (const [id, script] of Object.entries(STORY_SCRIPTS)) {
    for (const flag of script.flags) {
      if (!flags.has(flag)) throw new Error(`Story script "${id}" references unknown flag "${flag}"`);
    }
    if (!DIALOGUE[script.dialogue]) throw new Error(`Story script "${id}" references unknown dialogue "${script.dialogue}"`);
  }
}

function storyTriggerOutcome(scriptId: StoryScriptId, snapshot: StorySnapshot): StoryOutcome {
  if (scriptId === 'intro_mom') {
    if (hasFlag(snapshot, FLAGS.MET_MOM)) return emptyOutcome();
    return { setFlags: [{ flag: FLAGS.MET_MOM }], showDialogue: { dialogueId: 'intro_mom' }, save: false };
  }
  if (scriptId === 'oak_intercept') {
    if (hasFlag(snapshot, FLAGS.GOT_STARTER) || hasFlag(snapshot, FLAGS.OAK_INTERCEPTED)) return emptyOutcome();
    return {
      setFlags: [{ flag: FLAGS.OAK_INTERCEPTED }],
      showDialogue: { dialogueId: 'oak_intercept' },
      teleport: { map: 'oaks_lab', x: 8, y: 10, facing: 'up' },
      save: false,
    };
  }
  if (scriptId === 'viridian_to_be_continued') {
    if (hasFlag(snapshot, FLAGS.REACHED_VIRIDIAN)) return emptyOutcome();
    return {
      setFlags: [{ flag: FLAGS.REACHED_VIRIDIAN }],
      showDialogue: { dialogueId: 'viridian_to_be_continued' },
      save: true,
    };
  }
  return emptyOutcome();
}

function emptyOutcome(): StoryOutcome {
  return { setFlags: [], save: false };
}

function hasFlag(snapshot: StorySnapshot, flag: string): boolean {
  return snapshot.flags[flag] === true;
}

function isStoryScriptId(id: string): id is StoryScriptId {
  return Object.prototype.hasOwnProperty.call(STORY_SCRIPTS, id);
}
