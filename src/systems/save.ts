import { SAVE_KEY } from '../config';
import { GameState } from '../state/GameState';
import type { SaveData } from '../types';

export function saveGame(): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(GameState.toSaveData()));
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function loadGame(): boolean {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return false;
    GameState.fromSaveData(data);
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

