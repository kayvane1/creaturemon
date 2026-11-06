import { describe, expect, it } from 'vitest';
import type { TileId } from '../../data/maps';
import { sourceMapCatalog } from '../maps/MapCatalog';
import { battleBackground, battleEffectFrame, battleSprite, characterScale, validateAssetCatalog, validateMapAssetKeys } from './AssetCatalog';

describe('AssetCatalog', () => {
  it('validates map, species, UI, and battle asset keys', () => {
    expect(() => validateAssetCatalog(Object.values(sourceMapCatalog()))).not.toThrow();
  });

  it('provides runtime lookups for character scales, battle sprites, backgrounds, and effects', () => {
    expect(characterScale('npc_oak_overworld')).toBe(0.52);
    expect(battleSprite('char_eq', 'player')).toEqual({ key: 'tuxemon_knindling', frame: 1 });
    expect(battleSprite('char_eq', 'opponent')).toEqual({ key: 'tuxemon_knindling', frame: 0 });
    expect(battleBackground('oaks_lab')).toBe('battle_bg_lab');
    expect(battleBackground('route_1')).toBe('battle_bg_route');
    expect(battleEffectFrame('cinder_snap')).toBe(3);
    expect(battleEffectFrame('water_gun')).toBe(4);
  });

  it('rejects unknown sprite keys and uncataloged tile ids', () => {
    const bedroom = sourceMapCatalog().bedroom;
    expect(() =>
      validateMapAssetKeys({
        ...bedroom,
        props: [{ ...bedroom.props[0], sprite_key: 'missing_prop' }],
      }),
    ).toThrow(/unknown asset key/);

    expect(() =>
      validateMapAssetKeys({
        ...bedroom,
        ground: [4 as TileId, ...bedroom.ground.slice(1)],
      }),
    ).toThrow(/without a catalog asset/);
  });
});
