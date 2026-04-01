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

// Movement
export const MOVE_DURATION = 80; // ms to slide one tile
export const MOVE_HOLD_DELAY = 250; // ms before hold-to-move kicks in after first move

// Log columns (river spans cols 2-16 = 15 columns)
export const NUM_LOG_COLUMNS = 15;

// Gameplay
export const GATOR_START = { col: 0, row: 5 };
export const GATOR_START_COL = 0;
export const RIVER_MIN_COL = 2;
export const RIVER_MAX_COL = 16;
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
export const LOG_WIDTH = TILE; // fill full column width
export const LOG_SPEED_RAMP = 10;   // +10 px/sec per interval
export const FROG_SPAWN_RAMP = 200; // -200ms spawn interval per ramp step
export const LOG_COUNT_RAMP = 1;    // +1 log per column per ramp step (max 4)

// Difficulty ramp interval (milliseconds)
export const RAMP_INTERVAL = 30000; // ramp difficulty every 30 seconds

// Power-Up System (C1)
export const POWERUP_SPAWN_INTERVAL = 20000; // ms between spawns
export const POWERUP_DURATION = 8000; // ms visible before despawn
export const POWERUP_HP_RESTORE = 1; // HP restored on collect

// Dive Mode (E2)
export const DIVE_BREATH_MAX = 3000; // ms of dive time
export const DIVE_BREATH_REGEN_RATE = 1; // breath per ms while surfaced
export const DIVE_SURFACE_ALPHA = 0.4; // alpha for surface objects while diving

// Bite Mode (E3)
export const BITE_START_COUNT = 3; // bites per level
export const BITE_LOG_BONUS = 100; // points for destroying a log

// Lily pad positions (grid coords)
export const LILY_PAD_POSITIONS = [
  { col: 1, row: 2 },
  { col: 1, row: 4 },
  { col: 1, row: 5 },
  { col: 1, row: 7 },
  { col: 1, row: 9 },
];

// Score System Constants (B1)
export const SCORE_FROG_GREEN = 200;
export const SCORE_FROG_BLUE = 500;
export const SCORE_FROG_PURPLE = 1000;
export const SCORE_FROG_RED = 1500;
export const SCORE_FROG_GOLD = 2000;
export const SCORE_PAD_PENALTY = 300;
export const SCORE_WIN_BONUS = 1000;
export const SCORE_TIME_BONUS_PER_SEC = 10;
export const SCORE_LOG_BREAK = 100; // per log segment destroyed by bite

// Frog Type System Constants (B2)
// Purple frog removed in Cycle F - all frog types now have dedicated sprites
export const FROG_TYPES = {
  green:  { points: 200,  sprite: 'frog',      color: 0x00E436, weight: 65 },
  blue:   { points: 500,  sprite: 'frog_blue', color: 0x29ADFF, weight: 25 },
  red:    { points: 1500, sprite: 'frog_red',  color: 0xFF004D, weight: 8  },
  gold:   { points: 2000, sprite: 'frog_gold', color: 0xFFEC27, weight: 2  },
};

export const FROG_SPAWN_WEIGHTS = { green: 65, blue: 25, red: 8, gold: 2 };

// Frog AI Constants (C2)
export const FROG_SMARTNESS = 0.75; // 0.0 = always jumps blindly, 1.0 = never jumps into water

// Level System (D1)
export const LEVEL_CONFIGS = [
  { logsPerCol: 1, speedMin: 20, speedMax: 45,  spawnMin: 1500, spawnMax: 2250 },
  { logsPerCol: 1, speedMin: 30, speedMax: 60,  spawnMin: 1250, spawnMax: 2000 },
  { logsPerCol: 2, speedMin: 40, speedMax: 75,  spawnMin: 1000, spawnMax: 1750 },
  { logsPerCol: 2, speedMin: 55, speedMax: 90,  spawnMin: 800,  spawnMax: 1500 },
];

// Dev Mode (E1)
export const DEV_MODE = true; // Set to false before any public build

// Polish & Feel Constants (F1-F4)
export const POPUP_FLOAT_DISTANCE = 40; // px upward
export const POPUP_DURATION = 900; // ms