# GATORRR - Product Requirements Document v3.1

**Game Title:** TokenGators Gator Frogger ("GATORRR")
**Platform:** Web (Phaser.js)
**Genre:** Tower Defense + Frogger Hybrid
**Status:** Cycles A–F Complete (QA errors unresolved — see Section 17)
**Target Release:** Post QA remediation

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | 2026-03-11 | Retro rendering overhaul, 320x180 canvas, PICO-8 palette, 4 critical bug fixes |
| 3.1 | 2026-04-11 | Incorporates all Cycle A–F features: smooth movement, title screen, game over screens, score system, frog types, local leaderboard, health power-ups, frog AI, level system, gator entry, dive mode, bite attacks, score popups, sound effects, pad fill feedback, arcade leaderboard with name entry |

---

## 1. Game Overview

**Core Concept:**
You are a gator defending your home lily pads from an invasion of frogs. The frogs hop across logs floating in the river trying to reach your side. Your job: **eat the frogs before they overwhelm your lily pads**.

The gator starts each level on the bank, watching the river. You choose when to enter. Once in the water you are the apex predator — you can dive to evade, bite to clear obstacles, and hunt frogs on logs or in the open water.

**Win Condition:** Eat 10 frogs to clear a level. Levels continue indefinitely; the goal is maximizing score.
**Lose Conditions:**
- All 3 HP depleted (log collision while surfaced)
- All 5 lily pads filled by frogs

**Score Goal:** Accumulate the highest possible score across multiple levels.

---

## 2. Retro Rendering Philosophy (FOUNDATIONAL)

> "Retro style is not just about visible pixels. It is also about reduced visual information."

GATORRR follows authentic retro rendering constraints. The retro look comes from choosing a limited technical language and sticking to it throughout — not from sprinkling effects on top of high-resolution art.

### The Golden Rule
**Low-res first. Clean whole-number nearest-neighbor upscale after.**

### Rendering Pipeline

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Internal resolution | **320x180** | True low-res 16:9 canvas |
| Tile size | **16x16 px** | Power of two, every pixel matters |
| Grid dimensions | **20x11.25** (20 cols x 11 rows usable) | Clean tile coverage |
| Upscale method | **Nearest-neighbor only** | Hard pixel edges, no blur |
| Upscale factor | **4x** | Whole-number only (NON-NEGOTIABLE) |
| Display resolution | **1280x720** | 320x180 x 4 |
| Color palette | **16 colors (PICO-8)** | Reduced palette sells the era |
| Font | **Bitmap pixel font** | No system fonts (Arial, etc.) |
| Sprite sizes | **16x16 px** (powers of two) | Grid-aligned, consistent |

### Phaser Configuration
```javascript
const config = {
  type: Phaser.AUTO,
  width: 320,          // TRUE internal resolution
  height: 180,         // TRUE internal resolution
  render: {
    pixelArt: true,
    antialias: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 4,           // Whole-number upscale (4x)
  },
  scene: [BootScene, TitleScene, GameScene, LevelClearScene, GameOverScene, LeaderboardScene],
};
```

### PICO-8 Color Palette (16 Colors)
All game visuals MUST use only these colors:

| Index | Hex | Name | Usage |
|-------|-----|------|-------|
| 0 | `0x000000` | Black | Background accents, outlines |
| 1 | `0x1D2B53` | Dark Blue | Deep water |
| 2 | `0x7E2553` | Dark Red | Filled lily pad, damage flash |
| 3 | `0x008751` | Dark Green | Banks, lily pads (empty) |
| 4 | `0xAB5236` | Brown | Logs |
| 5 | `0x5F574F` | Dark Gray | UI background bar |
| 6 | `0xC2C3C7` | Light Gray | UI text (secondary) |
| 7 | `0xFFF1E8` | White | UI text (primary), highlights, health power-up |
| 8 | `0xFF004D` | Red | Frogs (swimming state), damage flash, pad fill vignette |
| 9 | `0xFFA300` | Orange | Frogs (on log), warnings |
| 10 | `0xFFEC27` | Yellow | Lily pads (empty glow), gold frog |
| 11 | `0x00E436` | Green | Gator, green frog |
| 12 | `0x29ADFF` | Blue | Water surface, blue frog |
| 13 | `0x83769C` | Lavender | Purple frog |
| 14 | `0xFF77A8` | Pink | HP low warning |
| 15 | `0xFFCCAA` | Peach | Reserved |

### Retro Consistency Rules
1. **ALL entities render on the 320x180 canvas** — no mixing resolutions
2. **No system fonts** — bitmap pixel fonts only (e.g., 5x7 or Press Start 2P)
3. **No smooth gradients** — banding/posterization is a feature, not a bug
4. **No fractional scaling** — sprites are 16x16, never 24x24 or arbitrary sizes
5. **Rotation is dangerous** — avoid rotating pixel art (breaks grid alignment)
6. **16 colors max** — the palette above, no exceptions

---

## 3. Game World & Layout (320x180, 16px Grid)

### Screen Layout
```
Col:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19
      |LB|LP|     RIVER (15 columns of logs)              |RB|RB|
Row 0 [==][==][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][==][==][==]  <- HUD row
Row 1 [GB][ P][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][RB][RB][RB]
Row 2 [GB][ P][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][RB][RB][RB]
...
Row 10[GB][ P][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][RB][RB][RB]

LB = Left Bank (col 0)
LP = Lily Pad knockout zone (col 1)
L  = Log columns (cols 2-16, 15 columns)
RB = Right Bank / Frog Spawn (cols 17-19)
```

### Zone Definitions
| Zone | X Range (tiles) | X Range (px) | Width |
|------|----------------|--------------|-------|
| Left Bank | col 0 | 0-16 | 16px (1 tile) |
| Lily Pad Knockouts | col 1 | 16-32 | 16px (1 tile) |
| River (logs) | cols 2-16 | 32-272 | 240px (15 tiles) |
| Right Bank (spawn) | cols 17-19 | 272-320 | 48px (3 tiles) |

### Vertical Layout
| Zone | Row Range | Y Range (px) | Purpose |
|------|-----------|--------------|---------|
| HUD | row 0 | 0-16 | HP, Score, Level, Bites display |
| Play Area | rows 1-10 | 16-176 | Active gameplay |
| Bottom | row 10 | 160-176 | Gator start zone |

---

## 4. Lily Pads

### Location & Layout
Lily pads are positioned in **knockouts** at **col 1** (x=16-32), creating safe landing spots adjacent to the leftmost log column.

### Positions (5 pads)
| Pad | Grid Position | Pixel Position (center) |
|-----|--------------|------------------------|
| Pad 1 | (1, 2) | x=24, y=40 |
| Pad 2 | (1, 4) | x=24, y=72 |
| Pad 3 | (1, 5) | x=24, y=88 |
| Pad 4 | (1, 7) | x=24, y=120 |
| Pad 5 | (1, 9) | x=24, y=152 |

*Note: Pads are spaced with gaps so gator can navigate between them.*

### Gameplay
- Frogs hop from leftmost log (col 2) to lily pad (col 1)
- Each pad: 16x16 sprite, states: Empty (dark green) / Filled (dark red)
- Each pad fill triggers: -300 score penalty, pad fill sound, red screen edge vignette flash (~300ms), brief pad pulse
- **Gator access to col 1 is blocked** once in river (see Section 6 — Entry Confinement). Gator must intercept frogs in the river before they reach col 1.

### Lose Condition
All 5 pads filled → game over ("Pads Overrun").

### Level Reset
All pads reset to empty at the start of each new level.

---

## 5. Frogs

### Spawn Behavior
- **Spawn location:** Right bank, col 17 (x=280), random row
- **Frequency:** Level-dependent (see Section 12)
- **Max active:** 6-8 frogs at once
- **Grid alignment:** Always snapped to 16px grid

### Frog Types & Spawn Weights
| Type | Color | Hex | Points | Spawn Weight | Approx. per game |
|------|-------|-----|--------|--------------|-----------------|
| Green (basic) | Green | `0x00E436` | 200 | 60% | Most frogs |
| Blue | Blue | `0x29ADFF` | 500 | 25% | ~10 per game |
| Purple | Lavender | `0x83769C` | 1,000 | 10% | ~5 per game |
| Red | Red | `0xFF004D` | 1,500 | 4% | ~2 per game |
| Gold | Yellow | `0xFFEC27` | 2,000 | 1% | ~1 per game |

Frog type is assigned at spawn. All types behave identically except for point value.

### Frog AI — Smart River Crossing (Cycle C)
Frogs are not mindless — they prefer logs as stepping stones. The behavior is governed by `FROG_SMARTNESS` (0.0–1.0, default 0.75).

**State Machine:**
```
ON_BANK -> [enters river] -> SWIMMING
SWIMMING -> [detects log nearby] -> ON_LOG
ON_LOG -> [rides log for 1-2s] -> [looks for next log]
         -> [log available] -> SWIMMING (hop to next log)
         -> [no log / smartness check fails] -> SWIMMING (falls in)
SWIMMING -> [reaches col 1] -> ON_PAD (pad filled, frog despawns)
SWIMMING -> [gator eats] -> DESPAWN
ON_LOG -> [gator eats] -> DESPAWN
```

**Smartness Dial:**
- At 1.0: Frogs never fall into the water — they wait indefinitely for a safe log
- At 0.0: Frogs jump regardless of what's in front of them
- At 0.75 (default): Frogs make the right call most of the time but create hunting opportunities through occasional mistakes

**Movement Rules:**
- **Decision interval:** 500ms
- **Directions:** UP, DOWN, LEFT only (never RIGHT)
- **Movement unit:** 1 tile = 16px per hop
- **Grid clamped:** Frogs stay within cols 1-17, rows 1-10
- Frogs on logs ride the log's vertical position each frame

### Sprite
- **Size:** 16x16 px
- **Color:** Determined by frog type (see table above)
- **State tint:**
  - ON_LOG: Orange tint (`0xFFA300`)
  - SWIMMING: Base frog type color
  - VULNERABLE (in water > 2s): Pink flash (`0xFF77A8`)

---

## 6. Gator (Player)

### Starting State — Bank Entry (Cycle E)
The gator starts each level on the **left bank (col 0)**, not in the river. The player can see frogs beginning to cross and choose their moment to enter.

- Gator is visible on the bank at game start
- Player presses any directional key toward the river to enter
- A splash visual plays on entry
- **Once the gator enters the river, it cannot return to col 0 or access col 1 (lily pad zone)**
- Confinement zone once entered: cols 2–16, rows 1–10

Waiting on the bank is a valid strategy — more frogs will accumulate in the water — but every second is a second frogs move closer to lily pads.

### Level Reset
On each new level: gator returns to col 0 (bank), full HP, fresh entry choice, 3 bites restored.

### Controls
| Input | Action |
|-------|--------|
| Arrow keys | Move 1 tile (16px) in that direction |
| Hold arrow key | Move continuously in that direction |
| Space (hold) | Dive underwater |
| Space (release) | Surface at current position |
| Shift + direction | Bite the adjacent tile in that direction |

### Movement
- **Tile size:** 16px per keypress
- **Smooth tween:** Each tile-to-tile move is a 80ms tween — no teleporting
- **Hold to move continuously:** Holding a key triggers repeated moves
- **Sprite flip:** Faces left when moving left, right when moving right
- **Bounds (surfaced):** cols 2-16, rows 1-10 (river only, after entry)
- **Bounds (bank):** col 0 only (before entry)

### Health System
- **HP:** 3 (start with 3/3, reset to 3 on each level)
- **Damage:** -1 HP per log collision **while surfaced**
- **Cooldown:** 500ms between damage hits
- **Death:** HP = 0 → Game Over
- **HP display:** Turns red in HUD at 1 HP remaining

### Eating Frogs
- Gator + Frog overlap (while surfaced) = eat frog
- Surfacing on a frog tile = eat frog (Dive mode resolution)
- +1 to "Frogs Eaten" counter; frog-type score added
- Frog despawns, score popup appears

### Sprite
- **Size:** 16x16 px
- **Color:** Green (`0x00E436`)
- **Damaged state:** Flash red (`0xFF004D`) on hit
- **Dive state:** Visual — surface objects (logs, frogs) render at ~40% alpha; gator remains full opacity

---

## 7. Dive Mode (Cycle E)

The gator can dive at any time while in the river. Submerged, it is invisible to frogs and immune to log damage.

### Rules
- **Activate:** Hold Space
- **Deactivate:** Release Space (surfaces at current position)
- **Movement:** Gator can move normally while diving
- **Frog detection:** Frogs do not react to a diving gator
- **Log damage:** Logs cannot damage gator while diving
- **Eating:** Cannot eat frogs while submerged
- **Bite:** Cannot bite while diving

### Breath Meter
- Breath depletes while diving (displayed in HUD)
- When breath reaches 0: automatic surface at current position (regardless of log/frog position)
- Breath refills **slowly** while surfaced (not instant — players must pace their dives)

### Surfacing Outcomes
| Surface on... | Result |
|---------------|--------|
| Empty water | Safe |
| Log tile | -1 HP (same as normal log collision) |
| Frog tile | Frog eaten, gator now exposed to logs |

### Visual Approach
While diving: surface objects (logs, frogs) render at ~40% alpha; gator remains full opacity. Fallback if jarring: brief flash on dive/surface with subtle water tint shift.

---

## 8. Bite Attacks (Cycle E)

The gator starts each level with **3 bites**. A bite is a targeted attack on the adjacent tile in any direction.

### Rules
- **Activate:** Shift held (arms bite mode — visual indicator on gator/HUD)
- **Fire:** Shift + direction key (one tile range)
- Cannot bite while diving
- Bite count at 0: Shift key does nothing

### Bite Outcomes
| Target | Result |
|--------|--------|
| Log segment | Log destroyed permanently; log spawning continues normally; -1 bite; +100 pts |
| Frog on a log | Frog eaten + log destroyed; -1 bite; +frog value + 100 pts |
| Swimming frog | Frog eaten; -1 bite; +frog value (no log bonus — wasteful, normal collision is free) |
| Empty water | Bite wasted; -1 bite; 0 pts |

### HUD
Bite count shown in HUD. Starts at 3. No additional bites in base game (placeholder for future power-up system).

### Level Reset
3 bites restored at the start of each new level.

---

## 9. Logs (Obstacles)

### Specification
| Parameter | Value |
|-----------|-------|
| Column count | **15** (cols 2-16 on grid) |
| Column width | **16px** (1 tile) |
| Log width | **10px** (narrow within 16px column) |
| Log height | **2-4 tiles** (32-64px) |
| Direction | Alternating UP/DOWN per column (odd cols up, even cols down) |
| Speed | Level-dependent — see Section 12 |
| Vertical gaps | **16, 32, 48, 64px** (1-4 tiles), randomized per log |
| Logs per column | Level-dependent — see Section 12 |
| Log color | Brown (`0xAB5236`) |

### Collision with Gator (Surfaced Only)
- Rectangle overlap detection
- Gator touching log while surfaced = -1 HP (500ms cooldown)
- Gator stays in place (no position reset)
- Log damage does NOT apply while gator is diving

### Log Destruction (Bite)
- Biting a log segment removes that segment permanently
- Log column continues spawning normally (gap is eventually filled by new spawn)

---

## 10. Health Power-Ups (Cycle C)

### Appearance
- Visual: white box with red cross symbol (16x16, palette colors)
- Spawns at a random position in the play area (not on a log or lily pad)
- Approximately **3 power-ups** appear per 60-second level
- Visible for **~8 seconds** before disappearing if uncollected
- Spawn interval: ~20 seconds

### Collection
- Gator overlap = collect
- +1 HP, capped at max HP (3)
- Brief visual flash on collect

### Strategy Note
Creates a secondary movement decision: chase health vs. stay in position to eat frogs. Low-HP players will take risks to reach it.

---

## 11. Score System (Cycle B)

### Point Values
| Event | Points |
|-------|--------|
| Eat green frog | +200 |
| Eat blue frog | +500 |
| Eat purple frog | +1,000 |
| Eat red frog | +1,500 |
| Eat gold frog | +2,000 |
| Bite + eat frog on log | +frog value +100 (log break bonus) |
| Bite + destroy log only | +100 |
| Frog reaches lily pad | −300 |
| Win bonus (per level clear) | +1,000 |
| Time remaining bonus | +10 pts per second left on clock |

### Score Accumulation
- Score carries forward across levels (does NOT reset on level clear)
- Score resets to 0 only when restarting from a game over

### Live Display
- Score visible in HUD at all times, updates immediately on each event

### Score Popups (Cycle F)
When the gator eats a frog:
- Point value floats up from the frog's position and fades out over ~1 second
- Popup color matches the frog type (green text for green frog, yellow for gold, etc.)
- Popups do not block gameplay or obscure the gator

---

## 12. Level System (Cycle D)

### Win Condition Per Level
Eat 10 frogs → Level Clear.

### Level Progression
| Level | Logs/Column | Log Speed Range | Frog Spawn Interval |
|-------|-------------|-----------------|---------------------|
| 1 | 3 | 8-12 px/sec | 2.0-2.5s |
| 2 | 3-4 | 10-15 px/sec | 1.75-2.25s |
| 3 | 4 | 12-18 px/sec | 1.5-2.0s |
| 4+ | 4-5 | 15-20 px/sec | 1.5-2.0s |

*Level 4 parameters are the maximum — level 5 and beyond repeat level 4's settings. No level cap.*

### What Carries Between Levels
- Score (accumulates)

### What Resets Each Level
- HP → full (3)
- Lily pads → all empty
- Active frogs → cleared
- Timer → 60 seconds
- Gator → returns to left bank (col 0)
- Bites → 3

### Level Clear Screen
- On level clear: brief "LEVEL X CLEARED" screen (~2 seconds) showing current cumulative score
- Auto-proceeds to next level after 2 seconds (no key press required)

### HUD
Current level number shown in HUD during gameplay.

---

## 13. HUD (Heads-Up Display)

### Layout (Row 0, 16px tall)
```
HP:3/3   LV:1   SCORE:00000   BITES:3   [BREATH BAR]
```

### Requirements
- **Font:** Bitmap pixel font (NOT Arial, NOT system font)
- **Colors:** White (`0xFFF1E8`) default, Red (`0xFF004D`) for warnings
- **Position:** Row 0 (y=0 to y=16)
- **HP turns red at 1 HP remaining**
- **Pads-filled warning** when 4+ pads are filled

### HUD Elements
| Element | Display | Warning |
|---------|---------|---------|
| HP | `HP:X/3` | Red at 1 HP |
| Level | `LV:X` | — |
| Score | Live point total | — |
| Bites | `BITES:X` | Dims at 0 |
| Breath | Bar (depletes while diving) | Red near empty |

---

## 14. Game States & Flow

### Complete Flow
```
Boot → Title Screen → [Any key] → GameScene
GameScene → [Eat 10 frogs] → LevelClearScene (~2s) → GameScene (next level)
GameScene → [HP=0 or 5 pads filled] → GameOverScene (stats) → LeaderboardScene
LeaderboardScene → [Any key] → TitleScene
```

### Title Screen (Cycle A)
- Game title ("GATORRR")
- One-sentence description
- Controls listed clearly (arrow keys, space to dive, shift to bite)
- Win and lose conditions explained simply
- Blinking "PRESS ANY KEY TO START" prompt
- High scores section: top 5 entries (rank, name, score, level reached)

### Playing
- All entities moving/spawning
- Collision detection active
- HUD updates in real-time
- Delta time from Phaser's `update(time, delta)` used for ALL timing

### Level Clear Screen
```
LEVEL [X] CLEARED!
Score: [cumulative score]
[auto-proceeds in ~2s]
```

### Game Over Screen (HP Lost)
```
GAME OVER
The logs got you.
Frogs Eaten: X
Pads Filled: X/5
Time: Xs
Score: XXXXX
[Press any key]
```

### Game Over Screen (Pads Full)
```
GAME OVER
The frogs overran your pads!
Frogs Eaten: X
Pads Filled: 5/5
Time: Xs
Score: XXXXX
[Press any key]
```

### Leaderboard Screen (Cycle F)
After game over stats screen, transitions to leaderboard:
- Title: "HIGH SCORES" or "BEST 5"
- Top 5 entries: rank, name (3 chars), score, level reached
- If player made top 5: **name input is active** (3-char arcade entry)
- If player did not make top 5: leaderboard shown as-is, player score highlighted below

**Name Entry Rules:**
- Exactly 3 characters, letters A–Z only, default "AAA"
- Up/Down arrow: change current character
- Right arrow / Enter: advance to next character
- Enter on last character: submit
- Leaderboard persists via localStorage across sessions

---

## 15. Sound Effects (Cycle F)

Five sounds, synthesized via Web Audio API — no audio files required.

| Event | Sound |
|-------|-------|
| Frog eaten | Short ascending blip (positive) |
| Log hit / damage taken | Low thud or buzz (negative) |
| Pad filled | Descending minor chord sting (bad news) |
| Level clear | Short ascending jingle (celebratory) |
| Game over | Descending tone sequence (defeat) |

**Rules:**
- Sound plays exactly when the event occurs — no delay
- Web Audio API synthesis (no external audio files)
- No background music in this phase
- No mute toggle in this phase

---

## 16. Code Architecture

### File Structure
```
projects/gatorrr/
├── src/
│   ├── main.js                -> Phaser config (320x180, 4x zoom, scene list)
│   ├── constants.js           -> PICO-8 palette, tile size, grid dims, speeds, level params
│   ├── scenes/
│   │   ├── BootScene.js       -> Load sprite sheets, bitmap fonts
│   │   ├── TitleScene.js      -> Title card, controls, leaderboard display
│   │   ├── GameScene.js       -> Main gameplay (delegates to managers)
│   │   ├── LevelClearScene.js -> 2s level clear screen, auto-advance
│   │   ├── GameOverScene.js   -> End screen (stats, transitions to leaderboard)
│   │   └── LeaderboardScene.js -> Top 5, name entry if qualified
│   ├── entities/
│   │   ├── Gator.js           -> 16x16 sprite, grid movement, HP, dive, bite, entry state
│   │   ├── Frog.js            -> 16x16 sprite, AI state machine, frog type, grid movement
│   │   ├── Log.js             -> 10px wide rect, variable height, vertical movement
│   │   ├── LilyPad.js         -> 16x16 sprite, filled/empty state
│   │   └── HealthPickup.js    -> White+red cross, timed despawn
│   ├── managers/
│   │   ├── LogColumnManager.js -> 15 log columns, speed/count by level, bite destruction
│   │   ├── FrogSpawner.js      -> Spawn timing, type weights, max count, frog lifecycle
│   │   ├── CollisionSystem.js  -> All overlap checks
│   │   └── ScoreManager.js     -> Points, popups, leaderboard localStorage
│   ├── audio/
│   │   └── SoundSynth.js      -> Web Audio API synthesis (5 sounds)
│   └── ui/
│       ├── HUD.js             -> HP, level, score, bites, breath bar
│       └── ScorePopup.js      -> Floating point popup on frog eat
├── public/
│   ├── index.html
│   └── assets/
│       ├── sprites/           -> 16x16 sprite sheets
│       │   ├── gator.png
│       │   ├── frog.png
│       │   └── lily_pad.png
│       └── fonts/             -> Bitmap font files
├── webpack.config.js
└── package.json
```

### Dead Code to Remove
- `src/entities/player.js` - Classic Frogger player
- `src/entities/car.js` - Car obstacles (not in GATORRR)
- `src/entities/log.js` - Horizontal log manager
- `src/scenes/game.js` - Classic GameScene
- `src/config.js` - Old 800x600 config
- `scenes/GameScene.js` - Root-level CDN version
- `config.js` - Root-level 480x480 config
- `index.html` - Root-level CDN entry point
- `main.js` - Root-level CDN init script

---

## 17. Critical Bug Fixes (MUST FIX — from v3.0)

These bugs were identified in v3.0 and must be resolved:

### Bug 1: Frogs Can't Reach Lily Pads
**File:** `src/main.js:452`
**Problem:** `makeFrogDecision()` clamps `gridX` to minimum col 3. Lily pads are at col 1. Frogs can never trigger the lose condition.
**Fix:** Frog movement must allow cols 1-17.

### Bug 2: Gator Can't Reach Lily Pads
**File:** `src/main.js:289`
**Problem:** `riverBounds.left = 80` clamps gator to x=96. Lily pads at x=48 are unreachable.
**Fix:** With Cycle E entry confinement, gator in river is clamped to cols 2-16 (not cols 0-1). Pre-entry (bank), gator is at col 0. This replaces the old river-only bounds bug.

### Bug 3: Hardcoded Delta Time
**Files:** `src/main.js:325`, `src/main.js:374`
**Problem:** `log.speed * 0.016` and `frog.decisionTimer += 16` assume 60 FPS.
**Fix:** Use `delta` parameter from `update(time, delta)`.

### Bug 4: Grid-Snap Overwrites Log Riding
**File:** `src/main.js:410-411`
**Problem:** Grid-snap executes after `ON_LOG` sets frog.y = log.y, destroying the riding state.
**Fix:** Skip grid-snap for frogs in ON_LOG state, or update `gridY` from log position.

---

## 18. QA Status (Cycle F — Final Cycle)

Cycle F was the last development cycle. QA returned errors at the end of Cycle F. Specific failures should be documented here once reviewed. Known QA categories from test plans:

- [ ] Smoke suite (TC-SMOKE-01 through TC-SMOKE-10) — status unknown post-Cycle F
- [ ] Asset loading failures (missing sprites, missing FROG_TYPES entries)
- [ ] Missing gameState fields (frogsEaten, padsFilled, timeLeft, score, hp, win, currentLevel)
- [ ] Leaderboard name entry flow — input handling regressions
- [ ] Sound synthesis — Web Audio API context state on first interaction
- [ ] Dive/bite state machine edge cases (dive while biting, level transition mid-dive)
- [ ] Score popup — lifecycle/destroy on rapid eat sequences

**Next step:** Run the game, capture all console errors and failing test cases, document here before any new development.

---

## 19. Development Phases

### Phase 1 (COMPLETE)
Basic gameplay loop with placeholder colored shapes at 800x600.

### Phase 2 (COMPLETE — Cycles A–F)
Retro rendering pipeline, all gameplay systems, polish.

| Cycle | Status | Key Deliverables |
|-------|--------|-----------------|
| A — Foundation Stability | Complete | Smooth movement, title screen, game over screens |
| B — Score & Frog Types | Complete | Point economy, 5 frog types, basic leaderboard |
| C — Health Power-Ups & Frog AI | Complete | HP pickups, smart frog crossing, log riding |
| D — Level System | Complete | Levels 1-4+, difficulty ramp, score accumulation |
| E — Core Mechanics Overhaul | Complete | Bank entry, dive mode, bite attacks |
| F — Polish & Feel | Complete (QA errors) | Score popups, arcade leaderboard, sounds, pad feedback |

### Phase 3 (FUTURE)
- CRT shader (scanlines, curvature, bloom)
- Sprite animations (2-3 frames per entity)
- Mobile touch controls
- Difficulty power-ups (extra bites from pickups)
- Entry timing bonus (score reward for aggressive entry)

---

## 20. Testing Checklist

### Retro Rendering
- [ ] Game renders at 320x180 internal resolution
- [ ] Upscaled 4x to 1280x720 via nearest-neighbor
- [ ] All pixels are crisp, hard-edged (no blur/smoothing)
- [ ] All entities use 16x16 tile grid
- [ ] Only PICO-8 palette colors visible in game
- [ ] No system fonts rendered (bitmap font only)

### Core Gameplay
- [ ] Gator slides smoothly between tiles (80ms tween, no teleporting)
- [ ] Holding arrow key moves gator continuously
- [ ] Gator sprite faces left when moving left, right when moving right
- [ ] Gator starts on bank (col 0) each level
- [ ] Gator enters river on directional input toward river
- [ ] Splash visual plays on entry
- [ ] Gator cannot return to col 0 or reach col 1 after entry
- [ ] Gator takes -1 HP from log collision (500ms cooldown, surfaced only)
- [ ] Gator eats frogs on overlap (surfaced)
- [ ] Frogs can reach lily pad zone (col 1) — Bug 1 fixed
- [ ] All 5 pads can fill — lose condition can trigger

### Dive Mode
- [ ] Hold Space → gator dives (surface objects fade to ~40% alpha)
- [ ] Gator moves freely while diving
- [ ] Logs do not damage diving gator
- [ ] Frogs do not react to diving gator
- [ ] Breath meter depletes while diving
- [ ] Breath runs out → automatic surface
- [ ] Breath refills slowly on surface (not instant)
- [ ] Surface on frog → frog eaten, gator exposed
- [ ] Surface on log → -1 HP
- [ ] Cannot bite while diving

### Bite System
- [ ] Shift held shows bite-armed visual indicator
- [ ] Shift + direction bites adjacent tile
- [ ] Bite on log: log destroyed, -1 bite, +100 pts
- [ ] Bite on frog-on-log: frog eaten, log destroyed, -1 bite, +frog pts + 100
- [ ] Bite on swimming frog: frog eaten, -1 bite, +frog pts
- [ ] Bite on empty: -1 bite, 0 pts
- [ ] Bite count at 0: nothing happens
- [ ] Bites reset to 3 on level clear

### Frog System
- [ ] 5 frog types spawn with correct color and spawn weight
- [ ] Frogs prefer logs (wait for log before jumping)
- [ ] Frogs ride logs vertically (y tracks log y)
- [ ] Some frogs fall into water (smartness < 1.0)
- [ ] Frogs in water can be eaten by gator
- [ ] Frogs reach col 1 → pad filled, frog despawns

### Score System
- [ ] Live score in HUD updates on each event
- [ ] Each frog type awards correct points on eat
- [ ] Frog reaching pad subtracts 300
- [ ] Win bonus +1000 added on level clear
- [ ] Time remaining bonus +10/sec added on level clear
- [ ] Score accumulates across levels (does NOT reset)
- [ ] Restart resets score to 0
- [ ] Score popup appears and fades on frog eat
- [ ] Popup color matches frog type

### Level System
- [ ] HUD shows current level number
- [ ] Eating 10 frogs triggers level clear screen
- [ ] Level clear shows score, auto-proceeds in ~2s
- [ ] Level 2+ is harder than level 1 (more/faster logs)
- [ ] Level 4+ parameters stay at max difficulty
- [ ] HP/pads/frogs/timer/gator reset on level start
- [ ] Score does not reset on level start

### Health Power-Ups
- [ ] ~3 power-ups appear per 60s level
- [ ] Power-up visible ~8s before despawn
- [ ] Collecting power-up: +1 HP, capped at 3
- [ ] Power-up does not spawn on log or lily pad
- [ ] Visual feedback on collect

### Polish (Cycle F)
- [ ] Pad fill triggers: -300 score, pad fill sound, red edge flash (~300ms), pad pulse
- [ ] Frog eat sound plays on every eat
- [ ] Log damage sound plays on every hit
- [ ] Level clear sound plays on level transition
- [ ] Game over sound plays on game over screen
- [ ] All 5 sounds synthesized via Web Audio API (no audio files)

### End Game Flow
- [ ] Game over → stats screen → leaderboard screen
- [ ] Leaderboard shows top 5 (rank, name, score, level)
- [ ] If player makes top 5: name input is active
- [ ] Name entry: 3 chars, A-Z, navigated with arrow keys
- [ ] Leaderboard persists after page reload (localStorage)
- [ ] Press any key from leaderboard → title screen

### Stability
- [ ] No crashes during full session
- [ ] No crashes during level transitions
- [ ] No crashes during state transitions (dive/bite/surface edge cases)
- [ ] No console errors
- [ ] 60 FPS on standard devices
- [ ] No memory leaks (frogs, popups, pickups properly destroyed)

---

## 21. Technical Notes

### Delta Time (CRITICAL)
```javascript
// WRONG (assumes 60 FPS):
log.y += log.speed * 0.016;
frog.decisionTimer += 16;

// CORRECT (frame-rate independent):
log.y += log.speed * (delta / 1000);
frog.decisionTimer += delta;
```

### Coordinate System (320x180, 16px tiles)
```javascript
// Grid to pixel (center of tile):
pixelX = gridCol * 16 + 8;
pixelY = gridRow * 16 + 8;

// Pixel to grid:
gridCol = Math.floor(pixelX / 16);
gridRow = Math.floor(pixelY / 16);
```

### Lily Pad Collision (Fixed)
```javascript
// Frog reaches lily pad when gridCol <= 1 (lily pad zone)
if (frog.gridCol <= 1) {
  const pad = this.lilyPads.find(p => !p.filled && Math.abs(p.gridRow - frog.gridRow) <= 1);
  if (pad) {
    pad.filled = true;
    this.gameState.padsFilled++;
    this.score -= 300;
    this.triggerPadFillFeedback();
    frog.destroy();
  }
}
```

### Gator Entry Confinement
```javascript
// Before entry (bank state):
gator.bounds = { minCol: 0, maxCol: 0, minRow: 1, maxRow: 10 };

// After entry (river state):
gator.bounds = { minCol: 2, maxCol: 16, minRow: 1, maxRow: 10 };
// col 0 (bank) and col 1 (lily pad zone) are off-limits once entered
```

### Breath Meter
```javascript
// Breath is a value 0.0–1.0
// Depletes at BREATH_DRAIN_RATE per second while diving
// Refills at BREATH_REFILL_RATE per second while surfaced
// Auto-surface when breath <= 0
```

---

## 22. Reconciliation Notes

| Parameter | PRD v2 | PRD v3.0 | **v3.1 (Final)** |
|-----------|--------|----------|-----------------|
| Canvas size | 800x600 | 320x180 | **320x180** |
| Tile size | 32px | 16px | **16px** |
| Log columns | 12 | 15 | **15** |
| Win condition | Eat 10 frogs (single game) | Eat 10 frogs | **Eat 10 frogs per level (infinite levels)** |
| Gator start | Col 10, row 9 (river) | Col 10, row 9 (river) | **Col 0 (bank) — enters river by choice** |
| Gator bounds | River only | Full play area | **Bank (pre-entry) or river cols 2-16 (post-entry)** |
| Frogs | Single type | Single type | **5 types with spawn weights** |
| Score | Placeholder (200/frog) | None defined | **Full point economy (200-2000 per type)** |
| Levels | None | None | **Infinite levels, params cap at level 4** |
| Dive | None | None | **Space key, breath meter, frog/log immunity** |
| Bite | None | None | **Shift+direction, 3/level, +100 log break** |
| Game end flow | Win/Lose screens | Win/Lose screens | **Stats → Arcade leaderboard with name entry** |
| Sound | None | None | **5 Web Audio API synthesized sounds** |

---

**Document Version:** 3.1
**Last Updated:** 2026-04-11
**Status:** Cycles A–F complete, QA errors unresolved — see Section 18
