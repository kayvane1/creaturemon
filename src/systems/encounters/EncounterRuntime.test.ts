import { describe, expect, it } from 'vitest';
import type { EncounterSlot } from '../../data/encounters';
import { FLAGS } from '../../data/flags';
import type { EncounterZoneDef } from '../../data/maps';
import { SPECIES } from '../../data/species';
import type { PokemonInstance } from '../../types';
import { ScriptedBattleRng } from '../battle/rng';
import { tryWildEncounter, validateEncounterReferencesForMap, validateEncounterTables } from './EncounterRuntime';

const routeZone: EncounterZoneDef = { id: 'route_1_grass', x: 2, y: 2, width: 4, height: 4, table: 'route_1', requiredFlag: FLAGS.ROUTE_1_CLEAR };

function request(overrides: Partial<Parameters<typeof tryWildEncounter>[0]> = {}) {
  return {
    mapId: 'route_1',
    tile: { x: 3, y: 3 },
    facing: 'up' as const,
    encounterZones: [routeZone],
    flags: { [FLAGS.ROUTE_1_CLEAR]: true },
    returnPosition: { map: 'route_1', x: 3, y: 3, facing: 'up' as const },
    rng: new ScriptedBattleRng({ floats: [0], ints: [1, 2] }),
    ...overrides,
  };
}

describe('EncounterRuntime', () => {
  it('does not activate Route 1 encounters before the story flag is set', () => {
    const rng = new ScriptedBattleRng({ floats: [0], ints: [1, 2] });

    expect(tryWildEncounter(request({ flags: {}, rng }))).toBeNull();
    expect(rng.calls).toEqual([]);
  });

  it('does not roll outside encounter zones', () => {
    const rng = new ScriptedBattleRng({ floats: [0], ints: [1, 2] });

    expect(tryWildEncounter(request({ tile: { x: 1, y: 1 }, rng }))).toBeNull();
    expect(rng.calls).toEqual([]);
  });

  it('uses the rate roll to miss or start a wild battle', () => {
    expect(tryWildEncounter(request({ rng: new ScriptedBattleRng({ floats: [0.1], ints: [1, 2] }) }))).toBeNull();

    const decision = tryWildEncounter(request({ rng: new ScriptedBattleRng({ floats: [0.09], ints: [1, 2] }) }));

    expect(decision).toMatchObject({
      zoneId: 'route_1_grass',
      tableId: 'route_1',
      level: 2,
      battleRequest: {
        kind: 'wild',
        opponentName: 'Wild Nibwing',
        canRun: true,
        returnMap: 'route_1',
        returnX: 3,
        returnY: 3,
        returnFacing: 'up',
      },
    });
  });

  it('honors weighted slot boundaries', () => {
    const first = tryWildEncounter(request({ rng: new ScriptedBattleRng({ floats: [0], ints: [50, 2] }) }));
    const second = tryWildEncounter(request({ rng: new ScriptedBattleRng({ floats: [0], ints: [51, 2] }) }));

    expect(first?.selectedSlot.species_id).toBe('bird_eq');
    expect(second?.selectedSlot.species_id).toBe('rodent_eq');
  });

  it('rolls within configured level boundaries', () => {
    const min = tryWildEncounter(request({ rng: new ScriptedBattleRng({ floats: [0], ints: [1, 2] }) }));
    const max = tryWildEncounter(request({ rng: new ScriptedBattleRng({ floats: [0], ints: [1, 5] }) }));

    expect(min?.level).toBe(2);
    expect(max?.level).toBe(5);
  });

  it('throws clear validation errors for invalid tables and species', () => {
    const missingTableZone: EncounterZoneDef = { ...routeZone, table: 'missing_table' };
    expect(() => tryWildEncounter(request({ encounterZones: [missingTableZone] }))).toThrow(/Unknown encounter table/);

    const badTables: Record<string, EncounterSlot[]> = {
      route_1: [{ species_id: 'missing_species', min_level: 2, max_level: 3, weight: 1 }],
    };
    expect(() => tryWildEncounter(request({ tables: badTables }))).toThrow(/unknown species/);
  });

  it('validates map encounter references against tables and species data', () => {
    expect(() => validateEncounterReferencesForMap({ key: 'route_1', encounterZones: [routeZone] })).not.toThrow();
    expect(() =>
      validateEncounterReferencesForMap({
        key: 'route_1',
        encounterZones: [{ ...routeZone, table: 'missing_table' }],
      }),
    ).toThrow(/unknown encounter table/);
    expect(() =>
      validateEncounterReferencesForMap({
        key: 'route_1',
        encounterZones: [{ ...routeZone, table: '' }],
      }),
    ).toThrow(/missing encounter table/);
    expect(() =>
      validateEncounterReferencesForMap(
        { key: 'route_1', encounterZones: [routeZone] },
        { route_1: [{ species_id: 'missing_species', min_level: 2, max_level: 3, weight: 1 }] },
        SPECIES,
      ),
    ).toThrow(/unknown species/);
  });

  it('rejects malformed encounter table shapes, weights, and level ranges', () => {
    expect(() => validateEncounterTables({ route_1: [] })).toThrow(/empty/);
    expect(() => validateEncounterTables({ route_1: 'bad' as unknown as EncounterSlot[] })).toThrow(/invalid/);
    expect(() => validateEncounterTables({ route_1: [{ species_id: 'bird_eq', min_level: 2, max_level: 3, weight: 0 }] })).toThrow(/invalid weight/);
    expect(() => validateEncounterTables({ route_1: [{ species_id: 'bird_eq', min_level: 2, max_level: 3, weight: 1.5 }] })).toThrow(/invalid weight/);
    expect(() => validateEncounterTables({ route_1: [{ species_id: 'bird_eq', min_level: 0, max_level: 3, weight: 1 }] })).toThrow(/invalid level range/);
    expect(() => validateEncounterTables({ route_1: [{ species_id: 'bird_eq', min_level: 4, max_level: 3, weight: 1 }] })).toThrow(/invalid level range/);
  });

  it('allows deterministic test creature factories', () => {
    const creature: PokemonInstance = { species_id: 'bird_eq', nickname: null, level: 2, exp: 0, current_hp: 10, ivs: { hp: 1, atk: 1, def: 1, spc: 1, spd: 1 }, moves: [], status: null };

    expect(
      tryWildEncounter(
        request({
          createPokemonForEncounter: () => creature,
        }),
      )?.battleRequest.roster[0],
    ).toBe(creature);
  });
});
