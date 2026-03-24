// Rendering
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 270;
export const TILE = 24;
export const ZOOM = 2;

// Grid
export const GRID_COLS = CANVAS_WIDTH / TILE;   // 20
export const GRID_ROWS = CANVAS_HEIGHT / TILE;  // 11 (row 0 = HUD, rows 1-10 = play)

// Zones (in tile columns)
export const ZONE = {
  LEFT_BANK: 0,       // col 0
  LILY_PADS: 1,       // col 1
  RIVER_START: 2,     // col 2
  RIVER_END: 16,      // col 16
  RIGHT_BANK_START: 17, // cols 17-19
};

// PICO-8 Palette
export const C = {
  BLACK:      0x000000,
  DARK_BLUE:  0x1D2B53,
  DARK_RED:   0x7E2553,
  DARK_GREEN: 0x008751,
  BROWN:      0xAB5236,
  DARK_GRAY:  0x5F574F,
  LIGHT_GRAY: 0xC2C3C7,
  WHITE:      0xFFF1E8,
  RED:        0xFF004D,
  ORANGE:     0xFFA300,
  YELLOW:     0xFFEC27,
  GREEN:      0x00E436,
  BLUE:       0x29ADFF,
  LAVENDER:   0x83769C,
  PINK:       0xFF77A8,
  PEACH:      0xFFCCAA,
};

// Gameplay
export const GATOR_START = { col: 0, row: 5 };
export const MAX_HP = 3;
export const FROGS_TO_WIN = 10;
export const TOTAL_PADS = 5;
export const DAMAGE_COOLDOWN = 500; // ms
export const FROG_DECISION_INTERVAL = 500; // ms
export const FROG_JUMP_CHANCE = 0.6;
export const FROG_SPAWN_MIN = 1500; // ms
export const FROG_SPAWN_MAX = 2250; // ms
export const MAX_FROGS_MIN = 6;
export const MAX_FROGS_MAX = 8;
export const LOG_SPEED_MIN = 20;
export const LOG_SPEED_MAX = 50;
export const LOG_HEIGHT_OPTIONS = [2, 3];
export const LOG_GAP_OPTIONS = [48, 64, 80, 96, 112]; // more breathing room
export const LOG_WIDTH = 20; // scaled to 24px tile
export const LOG_SPEED_RAMP = 10;   // +10 px/sec per interval
export const FROG_SPAWN_RAMP = 200; // -200ms spawn interval per ramp step
export const LOG_COUNT_RAMP = 1;    // +1 log per column per ramp step (max 4)

// Lily pad positions (grid coords)
export const LILY_PAD_POSITIONS = [
  { col: 1, row: 2 },
  { col: 1, row: 4 },
  { col: 1, row: 5 },
  { col: 1, row: 7 },
  { col: 1, row: 9 },
];