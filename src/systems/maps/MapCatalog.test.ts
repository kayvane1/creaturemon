import { describe, expect, it } from 'vitest';
import { MAP_IDS, getMap, normalizeMapCatalog, resolveWarp, sourceMapCatalog, validateMapCatalog, type MapCatalogRecord } from './MapCatalog';

describe('MapCatalog', () => {
  it('validates the source catalog identity, references, and geometry', () => {
    expect(new Set(MAP_IDS).size).toBe(MAP_IDS.length);
    expect(() => validateMapCatalog()).not.toThrow();
  });

  it('normalizes Tiled JSON with the runtime parser', () => {
    const cells = sourceMapCatalog().bedroom.width * sourceMapCatalog().bedroom.height;
    const rawBedroom = {
      width: sourceMapCatalog().bedroom.width,
      height: sourceMapCatalog().bedroom.height,
      layers: [
        { name: 'ground', data: Array.from({ length: cells }, () => 1) },
        { name: 'decoration', data: Array.from({ length: cells }, () => 0) },
        { name: 'above_player', data: Array.from({ length: cells }, () => 0) },
        { name: 'collision', objects: [] },
        {
          name: 'warps',
          objects: [
            {
              name: 'warp_0',
              x: 5 * 16,
              y: 7 * 16,
              width: 16,
              height: 16,
              properties: [
                { name: 'target_map', value: 'house_downstairs' },
                { name: 'target_spawn', value: 'stairs' },
                { name: 'facing', value: 'down' },
              ],
            },
          ],
        },
        { name: 'npcs', objects: [] },
        { name: 'props', objects: [] },
        { name: 'encounter_zones', objects: [] },
        {
          name: 'spawn_points',
          objects: [
            {
              name: 'start',
              x: 5 * 16,
              y: 6 * 16,
              width: 16,
              height: 16,
              properties: [
                { name: 'name', value: 'start' },
                { name: 'facing', value: 'down' },
              ],
            },
          ],
        },
        { name: 'script_triggers', objects: [] },
      ],
    };
    const catalog = normalizeMapCatalog({ bedroom: rawBedroom });

    expect(catalog.bedroom.key).toBe('bedroom');
    expect(catalog.bedroom.warps[0]).toMatchObject({ target_map: 'house_downstairs', target_spawn: 'stairs' });
  });

  it('resolves warps through the catalog instead of direct map table lookups', () => {
    const bedroom = getMap('bedroom');
    const warp = bedroom.warps[0];

    expect(resolveWarp(bedroom, warp)).toMatchObject({
      map: { key: 'house_downstairs' },
      spawn: { name: 'stairs' },
      facing: 'down',
    });
  });

  it('rejects unknown map ids, missing spawn targets, and out-of-bounds objects', () => {
    expect(() => getMap('missing_map')).toThrow(/Unknown map/);

    const missingSpawn: MapCatalogRecord = {
      ...sourceMapCatalog(),
      bedroom: {
        ...sourceMapCatalog().bedroom,
        warps: [{ ...sourceMapCatalog().bedroom.warps[0], target_spawn: 'missing_spawn' }],
      },
    };
    expect(() => validateMapCatalog(missingSpawn)).toThrow(/missing spawn/);

    const badProp: MapCatalogRecord = {
      ...sourceMapCatalog(),
      bedroom: {
        ...sourceMapCatalog().bedroom,
        props: [{ ...sourceMapCatalog().bedroom.props[0], x: 99 }],
      },
    };
    expect(() => validateMapCatalog(badProp)).toThrow(/out of bounds/);
  });

  it('rejects encounter zones that reference unknown encounter tables', () => {
    const badEncounterTable: MapCatalogRecord = {
      ...sourceMapCatalog(),
      route_1: {
        ...sourceMapCatalog().route_1,
        encounterZones: [{ ...sourceMapCatalog().route_1.encounterZones[0], table: 'missing_table' }],
      },
    };

    expect(() => validateMapCatalog(badEncounterTable)).toThrow(/unknown encounter table/);
  });

  it('rejects encounter zones with missing tables or unknown activation flags', () => {
    const missingEncounterTable: MapCatalogRecord = {
      ...sourceMapCatalog(),
      route_1: {
        ...sourceMapCatalog().route_1,
        encounterZones: [{ ...sourceMapCatalog().route_1.encounterZones[0], table: '' }],
      },
    };
    expect(() => validateMapCatalog(missingEncounterTable)).toThrow(/missing encounter table/);

    const badActivationFlag: MapCatalogRecord = {
      ...sourceMapCatalog(),
      route_1: {
        ...sourceMapCatalog().route_1,
        encounterZones: [{ ...sourceMapCatalog().route_1.encounterZones[0], requiredFlag: 'missing_flag' as never }],
      },
    };
    expect(() => validateMapCatalog(badActivationFlag)).toThrow(/unknown flag/);
  });
});
