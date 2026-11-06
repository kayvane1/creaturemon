import { MOVES } from '../../data/moves';
import { SPECIES, expForLevel, statsFor } from '../../data/species';
import type { Move, Species, Stats } from '../../types';

export interface BattleCatalog {
  moves: Record<string, Move>;
  species: Record<string, Species>;
  expForLevel(species: Species, level: number): number;
  statsFor(species: Species, level: number, ivs: Stats): Stats;
}

export const DATA_BATTLE_CATALOG: BattleCatalog = {
  moves: MOVES,
  species: SPECIES,
  expForLevel,
  statsFor,
};
