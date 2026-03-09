/**
 * Game Configuration
 * Constants and settings for Frogger
 */

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const TILE_SIZE = 32;
export const GRID_WIDTH = GAME_WIDTH / TILE_SIZE;  // 25 tiles
export const GRID_HEIGHT = GAME_HEIGHT / TILE_SIZE; // 18 tiles

// Player config
export const PLAYER_CONFIG = {
  startX: 12, // middle of screen in grid coords
  startY: 17, // bottom of screen
  speed: 0,   // tile-based movement, no speed stat
  tileSize: TILE_SIZE
};

// Car config
export const CAR_CONFIG = {
  speed: 150,        // pixels per second
  width: TILE_SIZE,
  height: TILE_SIZE,
  colors: ['#FF4444', '#4444FF', '#44FF44'] // Red, Blue, Green
};

// Log config
export const LOG_CONFIG = {
  speed: 100,
  width: TILE_SIZE * 2,
  height: TILE_SIZE,
  color: '#8B4513'
};

// Game zones
export const ZONES = {
  SAFE_START: { y: 17, height: 2 }, // Bottom safe zone
  TRAFFIC: { y: 3, height: 10 },     // Car/Log zones
  SAFE_END: { y: 0, height: 2 }      // Top safe zone (lily pads)
};

// Game states
export const GAME_STATES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  LEVELUP: 'levelup',
  GAMEOVER: 'gameover'
};
