export const TILE_SIZE = 16;
export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 192;
export const STEP_MS = 150;
export const SAVE_KEY = 'pkmn_l1_save';
export const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
