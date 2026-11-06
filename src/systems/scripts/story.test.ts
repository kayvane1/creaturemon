import { describe, expect, it } from 'vitest';
import { FLAGS } from '../../data/flags';
import { createPokemon } from '../../data/species';
import type { MapDef } from '../../data/maps';
import { MAPS } from '../../data/maps';
import { handleStoryEvent, validateStoryCatalog, validateStoryReferencesForMap, type StorySnapshot } from './story';

const baseSnapshot: StorySnapshot = {
  map: 'pallet_town',
  flags: {},
  rivalName: 'Blue',
  rivalStarter: null,
};

describe('Story Runtime', () => {
  it('shows Mom once on downstairs map entry', () => {
    expect(handleStoryEvent({ type: 'mapEntered', map: 'house_downstairs' }, baseSnapshot)).toMatchObject({
      setFlags: [{ flag: FLAGS.MET_MOM }],
      showDialogue: { dialogueId: 'intro_mom' },
    });

    expect(
      handleStoryEvent({ type: 'mapEntered', map: 'house_downstairs' }, { ...baseSnapshot, flags: { [FLAGS.MET_MOM]: true } }),
    ).toMatchObject({ setFlags: [], save: false });
  });

  it('intercepts the player for Oak once before a starter', () => {
    const outcome = handleStoryEvent({ type: 'stepTriggerEntered', triggerId: 'oak_intercept' }, baseSnapshot);

    expect(outcome.setFlags).toEqual([{ flag: FLAGS.OAK_INTERCEPTED }]);
    expect(outcome.showDialogue).toEqual({ dialogueId: 'oak_intercept' });
    expect(outcome.teleport).toEqual({ map: 'oaks_lab', x: 8, y: 10, facing: 'up' });

    expect(
      handleStoryEvent(
        { type: 'stepTriggerEntered', triggerId: 'oak_intercept' },
        { ...baseSnapshot, flags: { [FLAGS.OAK_INTERCEPTED]: true } },
      ).setFlags,
    ).toEqual([]);
  });

  it('turns a confirmed starter into flags, save, dialogue, and rival battle request', () => {
    const outcome = handleStoryEvent({ type: 'starterConfirmed', speciesId: 'char_eq' }, baseSnapshot);

    expect(outcome.giveStarter).toBe('char_eq');
    expect(outcome.setFlags).toEqual([{ flag: FLAGS.GOT_STARTER }]);
    expect(outcome.save).toBe(true);
    expect(outcome.showDialogue).toEqual({ dialogueId: 'post_starter' });
    expect(outcome.startBattle).toMatchObject({
      kind: 'trainer',
      opponentName: 'Blue',
      canRun: false,
      postBattleEvent: 'rival_battle_1',
      roster: [{ species_id: 'squirt_eq' }],
    });
  });

  it('finishes the rival battle through story flags and lab dialogue', () => {
    const outcome = handleStoryEvent(
      {
        type: 'battleFinished',
        outcome: 'win',
        request: {
          kind: 'trainer',
          opponentName: 'Blue',
          roster: [createPokemon('char_eq', 5)],
          canRun: false,
          returnMap: 'oaks_lab',
          returnX: 8,
          returnY: 10,
          returnFacing: 'up',
          postBattleEvent: 'rival_battle_1',
        },
      },
      baseSnapshot,
    );

    expect(outcome.setFlags).toEqual([
      { flag: FLAGS.BEAT_RIVAL_1 },
      { flag: FLAGS.LAB_POST_BATTLE },
      { flag: FLAGS.ROUTE_1_CLEAR },
    ]);
    expect(outcome.showDialogue).toEqual({ dialogueId: 'lab_post_battle' });
    expect(outcome.save).toBe(true);
  });

  it('marks Viridian once and requests a save', () => {
    const outcome = handleStoryEvent({ type: 'stepTriggerEntered', triggerId: 'viridian_to_be_continued' }, baseSnapshot);

    expect(outcome.setFlags).toEqual([{ flag: FLAGS.REACHED_VIRIDIAN }]);
    expect(outcome.showDialogue).toEqual({ dialogueId: 'viridian_to_be_continued' });
    expect(outcome.save).toBe(true);
  });

  it('validates story, dialogue, and flag references', () => {
    expect(() => validateStoryCatalog()).not.toThrow();
    expect(() => validateStoryReferencesForMap(MAPS.oaks_lab)).not.toThrow();

    const badTrigger: MapDef = { ...MAPS.oaks_lab, scriptTriggers: [{ id: 'missing_story', x: 0, y: 0, width: 1, height: 1 }] };
    expect(() => validateStoryReferencesForMap(badTrigger)).toThrow(/unknown story trigger/);

    const badDialogue: MapDef = { ...MAPS.oaks_lab, props: [{ ...MAPS.oaks_lab.props[0], dialogue_id: 'missing_dialogue' }] };
    expect(() => validateStoryReferencesForMap(badDialogue)).toThrow(/unknown dialogue/);

    const badFlag: MapDef = { ...MAPS.oaks_lab, warps: [{ ...MAPS.oaks_lab.warps[0], blockedUntilFlag: 'missing_flag' }] };
    expect(() => validateStoryReferencesForMap(badFlag)).toThrow(/unknown flag/);
  });
});
