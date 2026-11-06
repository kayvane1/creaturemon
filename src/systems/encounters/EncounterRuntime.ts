import { ENCOUNTERS, type EncounterSlot } from '../../data/encounters';
import { FLAGS, type FlagId } from '../../data/flags';
import type { EncounterZoneDef } from '../../data/maps';
import { SPECIES, createPokemon } from '../../data/species';
import type { BattleRequest, Direction, PokemonInstance, Species } from '../../types';
import type { BattleRng } from '../battle/rng';

export interface EncounterTile {
  x: number;
  y: number;
}

export interface EncounterReturnPosition extends EncounterTile {
  map: string;
  facing: Direction;
}

export interface WildEncounterInput {
  mapId: string;
  tile: EncounterTile;
  facing: Direction;
  encounterZones: EncounterZoneDef[];
  flags: Record<string, boolean>;
  returnPosition: EncounterReturnPosition;
  rng: Pick<BattleRng, 'float' | 'intInclusive'>;
  encounterRate?: number;
  tables?: Record<string, EncounterSlot[]>;
  speciesCatalog?: Record<string, Species>;
  createPokemonForEncounter?: (speciesId: string, level: number) => PokemonInstance;
}

export interface EncounterDecision {
  battleRequest: BattleRequest;
  zoneId: string;
  tableId: string;
  selectedSlot: EncounterSlot;
  level: number;
}

const DEFAULT_ENCOUNTER_RATE = 0.1;

export function tryWildEncounter(input: WildEncounterInput): EncounterDecision | null {
  const zone = input.encounterZones.find((entry) => containsTile(entry, input.tile) && zoneActive(entry, input.flags));
  if (!zone) return null;

  const tables = input.tables ?? ENCOUNTERS;
  const speciesCatalog = input.speciesCatalog ?? SPECIES;
  const table = encounterTable(zone.table, tables, speciesCatalog);
  if (input.rng.float() >= (input.encounterRate ?? DEFAULT_ENCOUNTER_RATE)) return null;

  const selectedSlot = chooseWeightedSlot(table, input.rng);
  const species = speciesCatalog[selectedSlot.species_id];
  const level = input.rng.intInclusive(selectedSlot.min_level, selectedSlot.max_level);
  const createEncounterPokemon = input.createPokemonForEncounter ?? createPokemon;
  const opponent = createEncounterPokemon(selectedSlot.species_id, level);

  return {
    battleRequest: {
      kind: 'wild',
      opponentName: `Wild ${species.display_name}`,
      roster: [opponent],
      canRun: true,
      returnMap: input.returnPosition.map,
      returnX: input.returnPosition.x,
      returnY: input.returnPosition.y,
      returnFacing: input.returnPosition.facing,
    },
    zoneId: zone.id,
    tableId: zone.table,
    selectedSlot,
    level,
  };
}

export function validateEncounterReferencesForMap(
  map: { key: string; encounterZones: EncounterZoneDef[] },
  tables: Record<string, EncounterSlot[]> = ENCOUNTERS,
  speciesCatalog: Record<string, Species> = SPECIES,
): void {
  validateEncounterTables(tables, speciesCatalog);
  for (const zone of map.encounterZones) {
    if (!zone.table) throw new Error(`Map "${map.key}" encounter zone "${zone.id}" is missing encounter table`);
    if (!tables[zone.table]) throw new Error(`Map "${map.key}" encounter zone "${zone.id}" references unknown encounter table "${zone.table}"`);
    if (zone.requiredFlag && !isFlagId(zone.requiredFlag)) {
      throw new Error(`Map "${map.key}" encounter zone "${zone.id}" references unknown flag "${zone.requiredFlag}"`);
    }
  }
}

export function validateEncounterTables(tables: Record<string, EncounterSlot[]> = ENCOUNTERS, speciesCatalog: Record<string, Species> = SPECIES): void {
  for (const [tableId, table] of Object.entries(tables)) {
    if (!Array.isArray(table)) throw new Error(`Encounter table "${tableId}" is invalid`);
    if (table.length === 0) throw new Error(`Encounter table "${tableId}" is empty`);
    table.forEach((slot, index) => validateEncounterSlot(tableId, slot, index, speciesCatalog));
  }
}

function encounterTable(tableId: string, tables: Record<string, EncounterSlot[]>, speciesCatalog: Record<string, Species>): EncounterSlot[] {
  const table = tables[tableId];
  if (!table) throw new Error(`Unknown encounter table "${tableId}"`);
  table.forEach((slot, index) => validateEncounterSlot(tableId, slot, index, speciesCatalog));
  return table;
}

function validateEncounterSlot(tableId: string, slot: EncounterSlot, index: number, speciesCatalog: Record<string, Species>): void {
  if (!speciesCatalog[slot.species_id]) throw new Error(`Encounter table "${tableId}" slot ${index} references unknown species "${slot.species_id}"`);
  if (!Number.isInteger(slot.weight) || slot.weight <= 0) throw new Error(`Encounter table "${tableId}" slot ${index} has invalid weight`);
  if (!Number.isInteger(slot.min_level) || !Number.isInteger(slot.max_level) || slot.min_level < 1 || slot.max_level < slot.min_level) {
    throw new Error(`Encounter table "${tableId}" slot ${index} has invalid level range`);
  }
}

function chooseWeightedSlot(table: EncounterSlot[], rng: Pick<BattleRng, 'intInclusive'>): EncounterSlot {
  const totalWeight = table.reduce((sum, slot) => sum + slot.weight, 0);
  let roll = rng.intInclusive(1, totalWeight);
  return (
    table.find((slot) => {
      roll -= slot.weight;
      return roll <= 0;
    }) ?? table[0]
  );
}

function containsTile(zone: EncounterZoneDef, tile: EncounterTile): boolean {
  return tile.x >= zone.x && tile.y >= zone.y && tile.x < zone.x + zone.width && tile.y < zone.y + zone.height;
}

function zoneActive(zone: EncounterZoneDef, flags: Record<string, boolean>): boolean {
  return zone.requiredFlag ? Boolean(flags[zone.requiredFlag]) : true;
}

function isFlagId(value: string): value is FlagId {
  return (Object.values(FLAGS) as string[]).includes(value);
}
