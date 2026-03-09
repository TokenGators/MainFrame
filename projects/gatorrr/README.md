# 🐊 GATOR FROGGER - Classic Frogger Gameplay

A classic Frogger-style game where you guide a gator from the bottom of the screen to the HOME lily pads at the top, navigating across moving platforms (logs and turtles) while avoiding hazards and water.

## 🎮 Game Mechanics

### Objective
Navigate your gator from the **BOTTOM** to the **TOP** (HOME) by crossing 12+ rows of moving obstacles.

### Controls
- **Arrow Keys** or **WASD** - Move up/down/left/right
- Grid-based movement (one tile per keypress)

### Gameplay Flow
1. **Start:** Gator begins at bottom-center in safe zone
2. **Cross Rows:** Navigate upward through moving platforms
   - 🪵 **Logs** - Brown platforms that move left/right (ride them!)
   - 🐢 **Turtles** - Green platforms that move left/right (ride them!)
3. **Avoid:** Don't touch hazards or fall in water
4. **Goal:** Reach the golden HOME area at the top
5. **Repeat:** Each level gets harder with more platforms

### Lives & Scoring
- **Lives:** Start with 3 (lose 1 per death)
- **Points:**
  - +10 per row advanced
  - +500 for reaching HOME
  - +1 bonus per second remaining
  - Extra life at 500 points (TBD)

### Timing
- 60-second countdown timer
- Time bonus awarded for fast completion
- Game over if time runs out

## 🎯 Difficulty Progression

### Level 1 (Easy)
- 12 river rows with mixed logs/turtles
- Moderate speed platforms
- 60-second timer

### Future Levels
- More platforms per row
- Faster movement speeds
- Random platform arrangements
- Reverse-direction lanes
- Hazard rows (crocodiles)

## 📁 File Structure

```
frogger/
├── index.html           # Entry point (HTML)
├── main.js              # Game initialization & Phaser config
├── config.js            # Game constants & level layouts
├── scenes/
│   └── GameScene.js     # Main game logic & mechanics
└── README.md            # This file
```

## 🚀 Running the Game

### Option 1: Local Development
```bash
cd /home/parkoperator/.openclaw/workspace-murphy/games/frogger/
# Open index.html in a web browser
open index.html
# Or: python -m http.server 8000
```

### Option 2: Deploy to Static Host
- Upload all files to GitHub Pages, Itch.io, or self-hosted server
- Index.html will load Phaser from CDN automatically

## 🎨 Visual Design

- **Retro pixel art style** (32x32 tiles, simple rectangles)
- **Color scheme:**
  - 🟢 Safe zones (green)
  - 🟦 Water (blue)
  - 🟨 HOME (gold)
  - 🟤 Logs (brown)
  - 🟩 Turtles (green)
  - 🐊 Gator (dark teal)

## 🔧 Technical Stack

- **Engine:** Phaser 3.55
- **Language:** Vanilla JavaScript (ES6)
- **Physics:** None (discrete grid-based movement)
- **Rendering:** Canvas 2D

## 📊 Game State

```javascript
GAME_STATE = {
  score: 0,
  lives: 3,
  timeRemaining: 60,
  currentLevel: 1,
  gatorGridPos: { col: 7, row: 14 },
  gatorOnPlatform: null,
  levelComplete: false,
  gameOver: false,
}
```

## ✅ Implementation Status

- ✅ Gator movement (arrow keys + WASD)
- ✅ 12-row river configuration
- ✅ Moving platforms (logs & turtles)
- ✅ Collision detection (platform riding)
- ✅ Hazard detection (water, crocodiles)
- ✅ Lives system (3 lives, respawn)
- ✅ Score tracking with per-row bonuses
- ✅ Timer system (60-second countdown)
- ✅ Level progression
- ✅ Game over / Level complete screens
- 🔲 Audio (hop, die, win sounds) - Future
- 🔲 Animations (sprites) - Future
- 🔲 Mobile touch controls - Future
- 🔲 Difficulty scaling algorithm - Future
- 🔲 Leaderboard - Future

## 🎓 Learning Notes

### Classic Frogger Mechanics
- **Discrete movement:** Player moves one tile per input (no continuous sliding)
- **Platform riding:** Player moves with platform horizontally while standing on it
- **Water death:** Instant death if not on a platform in water zones
- **Safe zones:** Top, bottom, and some middle rows are safe (no water/hazards)

### Implementation Challenges
1. **Platform riding:** Gator must move WITH the platform, not slide on top
2. **Wrapping:** Platforms teleport around screen edges for seamless scrolling
3. **Collision detection:** Must differentiate between "standing on" and "touching"
4. **Grid vs. Physics:** Pure grid-based movement is simpler than physics simulation

## 📝 Future Enhancements

1. **Audio:**
   - Hop sound effect
   - Death/splash sound
   - Win/level up jingle
   - Chiptune background music

2. **Visuals:**
   - Sprite animations (gator hopping, turtles diving)
   - Particle effects (splash on death)
   - Screen transitions

3. **Gameplay:**
   - Increasing difficulty per level
   - Random platform configurations
   - Boss levels with unique patterns
   - Power-ups (invincibility, slow-time)

4. **Polish:**
   - Leaderboard (local storage or cloud)
   - Mobile touch controls
   - Settings menu (volume, difficulty)
   - Pause/resume

---

**Last Updated:** 2026-03-06  
**Status:** MVP Complete - Playable and Ready for Testing  
**Lead:** Subagent (Claude Code)  
**Model:** Haiku
