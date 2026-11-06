export interface EncounterSlot {
  species_id: string;
  min_level: number;
  max_level: number;
  weight: number;
}

export const ENCOUNTERS: Record<string, EncounterSlot[]> = {
  route_1: [
    { species_id: 'bird_eq', min_level: 2, max_level: 5, weight: 50 },
    { species_id: 'rodent_eq', min_level: 2, max_level: 4, weight: 50 },
  ],
};

