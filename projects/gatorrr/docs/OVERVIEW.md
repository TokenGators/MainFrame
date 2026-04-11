# GATORRR Project Overview

## Game Description

GATORRR is a TokenGators-themed Frogger remake where players control a gator navigating across a river to reach safety. The game features classic Frogger mechanics with modern enhancements including sprite assets, improved gameplay balance, and strategic elements.

Players must guide their gator from the bottom of the screen to the HOME lily pads at the top, crossing 12+ rows of moving platforms (logs and turtles) while avoiding water hazards and obstacles. The objective is to eat 10 frogs before they overwhelm your lily pads.

## Tech Stack & Architecture

- **Engine:** Phaser 3.90.0
- **Build Tools:** Webpack 5, Babel
- **Language:** Vanilla JavaScript (ES6)
- **Architecture:** Multi-scene approach separating concerns (main game vs config)
- **Rendering:** Canvas 2D
- **Physics:** None - discrete grid-based movement model

## Key Systems

### Movement System
- Grid-based movement with discrete tile transitions
- Controls: Arrow keys or WASD for 4-directional movement
- Gator moves one tile per keypress with no continuous sliding
- Platform riding mechanics where gator moves with platforms horizontally

### Collision Detection
- Platform riding detection (gator moves with platform)
- Hazard detection (water, logs, crocodiles)
- Safe zone detection (top, bottom, and middle rows are safe)
- Lily pad occupation logic for strategic gameplay

### Scenes System
- Multi-scene architecture for separation of concerns
- Main game scene handling core mechanics
- Configuration scene for constants and level layouts

### Scoring System
- Points awarded for row advancement (+10 per row)
- Bonus points for reaching HOME (+500)
- Time bonus (1 point per second remaining)
- Extra life at 500 points (TBD)

## MVP-Complete Features

✅ Gator movement (arrow keys + WASD)  
✅ 12+ row river configuration  
✅ Moving platforms (logs & turtles)  
✅ Collision detection (platform riding)  
✅ Hazard detection (water, edges)  
✅ Lives system (3 lives, respawn)  
✅ Score tracking (row + time bonuses)  
✅ 60-second countdown timer  
✅ Level progression  
✅ Game over / level complete screens  
✅ Asset integration (sprites, visual design)  
✅ Lily pad repositioning to knockouts on left edge  
✅ Increased frog spawn rate (+25%)  

## TODO List

### Phase 3 Enhancements
- [ ] Audio effects (hop, die, win)
- [ ] Sprite animations (gator hopping, turtles diving)
- [ ] Mobile touch controls
- [ ] Difficulty scaling algorithm
- [ ] Leaderboard system

### Gameplay Improvements
- [ ] Boss levels with unique patterns
- [ ] Power-ups (invincibility, slow-time)
- [ ] Random platform configurations
- [ ] Reverse-direction lanes

### Visual Polish
- [ ] Particle effects (splash on death)
- [ ] Screen transitions
- [ ] Background art and depth layers

## How to Run/Build Locally

### Prerequisites
- Node.js (v14+ recommended)
- npm or yarn package manager

### Setup
```bash
cd /Users/operator/repos/MainFrame/projects/gatorrr/
npm install
```

### Development Server
```bash
npm run dev
# Or
npm start
```
This will start a local development server and open the game in your browser.

### Build for Production
```bash
npm run build
```
This creates an optimized build in the `dist/` directory.

## File Structure Overview

```
gatorrr/
├── index.html           # Entry point (HTML)
├── main.js              # Game initialization & Phaser config
├── config.js            # Game constants & level layouts
├── src/
│   ├── scenes/
│   │   └── GameScene.js     # Main game logic & mechanics
│   ├── entities/            # Game entities (gator, frogs, logs)
│   ├── systems/             # Core gameplay systems
│   └── utils/               # Utility functions
├── public/                # Static assets and media
│   └── assets/
│       ├── sprites/         # Sprite images
│       ├── audio/           # Audio files (future)
│       └── fonts/           # Font files (future)
├── docs/                  # Documentation
│   └── OVERVIEW.md        # This file
├── package.json           # Project dependencies and scripts
├── webpack.config.js      # Build configuration
└── README.md              # Game instructions and details
```