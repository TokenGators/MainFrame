// Game Configuration & Constants

const GAME_CONFIG = {
    // Canvas & Display
    WIDTH: 480,
    HEIGHT: 480,
    TILE_SIZE: 32,
    GRID_WIDTH: 15,
    GRID_HEIGHT: 15,

    // Gameplay
    INITIAL_LIVES: 3,
    STARTING_TIME: 60,
    TIME_BONUS_MULTIPLIER: 2,
    INITIAL_LEVEL: 1,

    // Scoring
    POINTS_PER_ROW: 10,
    POINTS_LEVEL_COMPLETE: 500,
    POINTS_TIME_BONUS: 1,
    POINTS_EXTRA_LIFE: 500,

    // Gator (Player)
    GATOR: {
        START_ROW: 14,
        START_COL: 7,
        MOVE_SPEED: 200,
    },

    // Obstacles
    ROWS: {
        SAFE_START: { row: 14, type: 'safe' },      // Starting area (safe)
        RIVER_START: { row: 13, type: 'river' },    // Water rows start
        RIVER_END: { row: 2, type: 'river' },       // Water rows end
        SAFE_END: { row: 1, type: 'safe' },         // Home area (safe)
        BANK: { row: 0, type: 'safe' },             // Goal lily pads
    },

    // Platform configurations by difficulty
    PLATFORMS: {
        LOGS: {
            WIDTH: 96,
            HEIGHT: 16,
            SPEED: 150,
            COLORS: ['#8B4513', '#A0522D', '#654321'],
        },
        TURTLES: {
            WIDTH: 64,
            HEIGHT: 16,
            SPEED: 120,
            COLORS: ['#2F4F2F', '#3CB371', '#228B22'],
        },
        CROCODILES: {
            WIDTH: 80,
            HEIGHT: 16,
            SPEED: 100,
            DANGEROUS: true,
            COLORS: ['#2F4F4F', '#556B2F'],
        },
    },

    // Row configurations for levels
    LEVEL_LAYOUTS: {
        1: [
            { type: 'safe', passthrough: true },      // Row 14 - Starting safe zone
            { type: 'logs', speed: 150, direction: 1 },
            { type: 'turtles', speed: 120, direction: -1 },
            { type: 'logs', speed: 130, direction: 1 },
            { type: 'turtles', speed: 140, direction: -1 },
            { type: 'logs', speed: 125, direction: 1 },
            { type: 'turtles', speed: 135, direction: -1 },
            { type: 'logs', speed: 150, direction: 1 },
            { type: 'turtles', speed: 120, direction: -1 },
            { type: 'logs', speed: 140, direction: 1 },
            { type: 'turtles', speed: 130, direction: -1 },
            { type: 'logs', speed: 135, direction: 1 },
            { type: 'turtles', speed: 125, direction: -1 },
            { type: 'safe', passthrough: true },      // Row 2 - Bank
            { type: 'safe', passthrough: true },      // Row 1 - Safe
            { type: 'home', passthrough: true },      // Row 0 - HOME (Goal)
        ],
    },

    // Colors
    COLORS: {
        BACKGROUND: '#1a5c3a',
        WATER: '#2E8B9E',
        SAFE: '#4CAF50',
        HOME: '#FFD700',
        GATOR: '#2F4F4F',
        TEXT: '#FFFFFF',
    },
};

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_CONFIG;
}
