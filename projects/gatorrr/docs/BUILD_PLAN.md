# GATORRR — Build Plan
**Version:** v3.0  
**Branch:** agent/gatorrr/fix-crash-and-phase2  
**Owner:** Kthings  
**Last updated:** 2026-03-23  
**Status:** Awaiting pipeline approval

---

## What We Are Building

A complete, shippable v1 of GATORRR — a TokenGators-themed Frogger remake. The game is playable in browser, deployable via Netlify, and QA-able on mobile. This document is the build plan, not a feature list. Everything in here gets built.

---

## Current State (as of this plan)

- ✅ Game loads without crash
- ✅ Canvas 480×270, TILE=24, ZOOM=2
- ✅ Gator and Frog sprite assets wired
- ✅ Background zones (bank/river/lily zone)
- ✅ Basic HUD (HP, Frogs, Pads, Time)
- ✅ Collision system (eat frogs, lily pad fill, gator damage)
- ✅ Frog directional bias (70% left)
- 🔧 In-flight: log coverage fix, gator flip, crash fix (double-destroy)

---

## Build Cycles

### CYCLE A — Foundation Stability
*Goal: crash-free full playthrough, correct game loop*

**A1. Gator smooth movement**
- Replace grid-snap teleport with 80ms tween slide
- Hold key to move continuously (isDown)
- `this.moving` flag blocks new input mid-tween
- Sprite flips horizontally on left/right movement
- Physics body syncs during tween via `onUpdate`
- All grid-based collision logic unchanged

**A2. Log balance**
- Reduce to 2 logs per column (was 3)
- Logs cover full river width: cols 2–16 (15 columns)
- Gap options: [48, 64, 80, 96, 112]px — breathing room guaranteed
- Even stagger distribution across screen height per column

**A3. Game Over screen (both states)**
- HP = 0 → "GAME OVER — Lost all HP"
- 5 pads filled → "GAME OVER — All lily pads filled!"
- Win (10 frogs eaten) → "YOU WIN 🐊"
- All states show: frogs eaten, pads filled, time survived, final score
- Restart: R key or on-screen button
- Score breakdown visible (not just total)

**A4. Title / Start screen**
- Game title
- Controls: arrow keys to move, eat frogs, defend pads
- Win condition explained: eat 10 frogs before pads fill
- "Press any key to start"
- Shows local high score if one exists

**QA gate:** Full playthrough — win condition, both lose conditions, restart. No crashes. All screens readable.

---

### CYCLE B — Score & Frog Type System
*Goal: meaningful point economy, visual frog variety*

**B1. Score system**

Point events:
- Eat green frog: +200
- Eat blue frog: +500
- Eat purple frog: +1,000
- Eat red frog: +1,500
- Eat gold frog: +2,000
- Frog reaches lily pad: -300
- Win bonus: +1,000
- Time remaining: +10 pts per second left

Constants (all tunable):
```js
export const SCORE_WIN_BONUS = 1000;
export const SCORE_TIME_BONUS_PER_SEC = 10;
export const SCORE_PAD_PENALTY = 300;
```

HUD: live score display, replaces placeholder score field.

**B2. Frog type system**

5 types, distinguished by color tint on the frog sprite. No new assets needed.

| Type | Tint | Points | Spawn weight |
|------|------|--------|--------------|
| Green (basic) | 0x00E436 | 200 | 60% |
| Blue | 0x29ADFF | 500 | 25% |
| Purple | 0x83769C | 1,000 | 10% |
| Red | 0xFF004D | 1,500 | 4% |
| Gold | 0xFFEC27 | 2,000 | 1% |

Spawn logic: weighted random roll on each frog spawn determines type. Apply tint to sprite.

Tuning constant:
```js
export const FROG_SPAWN_WEIGHTS = { green: 60, blue: 25, purple: 10, red: 4, gold: 1 };
```

**B3. Local leaderboard**
- Top 5 scores in localStorage
- Fields: score, level reached, date
- Shown on title screen and game over screen

**QA gate:** All 5 frog types spawn and award correct points. Score updates live in HUD. Game over shows accurate breakdown. Leaderboard persists across page reloads.

---

### CYCLE C — Health Power-Ups & Frog AI
*Goal: survival mechanic, believable river crossing*

**C1. Health power-ups**

- Spawn at random valid grid position (not on a log, not on bank col 0)
- Visual: white rectangle + red cross drawn on top (no external asset)
- Visible for 8 seconds, then despawn
- Gator collision → +1 HP (capped at MAX_HP), brief flash feedback
- Target: ~3 per 60s game

Tuning constants:
```js
export const POWERUP_SPAWN_INTERVAL = 20000; // ms
export const POWERUP_DURATION = 8000;        // ms
export const POWERUP_HP_RESTORE = 1;
```

**C2. Frog AI — smart river crossing**

Frogs navigate across the river using logs as stepping stones. They don't walk straight through water — they wait for logs, ride them, and jump to the next one. They occasionally misjudge (landing in water), which is when the gator hunts them.

Frog states:
- `ON_BANK` — on right bank, waiting to enter river
- `ON_LOG` — riding a log, scanning for next log
- `SWIMMING` — in water (slow, vulnerable)
- `ON_PAD` — reached lily pad (scores against player)

Decision logic (per tick):
1. If `ON_LOG`: scan left-adjacent column for a log within ±1 tile vertically
   - Log found → jump to it (smart move)
   - No log → stay and ride current log
   - With `(1 - FROG_SMARTNESS)` chance → jump anyway (mistake, lands in water)
2. If `SWIMMING`: move left at half speed, scan for logs to grab

Tuning constant:
```js
export const FROG_SMARTNESS = 0.75; // 0.0 dumb → 1.0 perfect
```

**QA gate:** Frogs visibly ride logs across the river. Some fall into water. Gator can eat swimming frogs. Power-ups appear, collect correctly, restore HP. All logic handles edge cases (frog destroyed mid-swim, power-up despawn while scene active).

---

### CYCLE D — Level System & Difficulty Ramp
*Goal: progressive difficulty, replayability*

**D1. Level structure**

- Each level = 60 seconds, win by eating 10 frogs
- Completing a level triggers a brief "LEVEL X CLEAR" transition screen (2 seconds)
- Next level loads with bumped parameters
- Score carries forward between levels

Level parameters:
| Level | Logs/col | Log speed range | Frog spawn interval |
|-------|----------|-----------------|---------------------|
| 1 | 2 | 20–50 px/s | 1.5–2.25s |
| 2 | 2 | 30–65 px/s | 1.25–2.0s |
| 3 | 3 | 40–80 px/s | 1.0–1.75s |
| 4+ | 3 | 50–95 px/s | 0.8–1.5s |

Parameters defined in a level config array, not hardcoded per-level — easy to tune.

**D2. Difficulty constants**
```js
export const LEVEL_CONFIGS = [
  { logsPerCol: 2, speedMin: 20, speedMax: 50,  spawnMin: 1500, spawnMax: 2250 },
  { logsPerCol: 2, speedMin: 30, speedMax: 65,  spawnMin: 1250, spawnMax: 2000 },
  { logsPerCol: 3, speedMin: 40, speedMax: 80,  spawnMin: 1000, spawnMax: 1750 },
  { logsPerCol: 3, speedMin: 50, speedMax: 95,  spawnMin: 800,  spawnMax: 1500 },
];
// Level 4+ repeats the last config
```

**QA gate:** Completing level 1 transitions to level 2 with correct parameters. Score carries forward. Level 4+ holds at max difficulty. Level transition screen displays correctly.

---

### CYCLE E — Deploy
*Goal: publicly accessible URL for mobile QA and sharing*

**E1. Netlify deployment**
- Configure `netlify.toml` with build command (`npm run build`) and publish dir (`dist/`)
- One-time Netlify site creation
- Push to branch triggers deploy preview
- Merge to main triggers production deploy

**E2. Mobile QA pass**
- Load on iOS Safari and Android Chrome
- Verify canvas scales correctly at ZOOM=2
- Verify keyboard/touch controls work (touch controls may need basic implementation)
- Verify all game states reachable

**QA gate:** Shared URL loads and plays on mobile. All game states work. No console errors.

---

## Not In This Build (Phase 3)

These are documented but not scheduled:
- Boats as obstacles
- Coin collectibles
- Sprite animations
- Background art
- Touch controls (mobile)
- Sound effects

Sound effects are the exception — if placeholder bleeps can be added in Cycle A or B without blocking, do it. Otherwise Phase 3.

---

## Testing Protocol (Each Cycle)

1. Murphy implements, runs `npm run build` — must pass clean
2. Murphy commits and pushes
3. QA agent reads the diff and current source, validates against cycle goals
4. QA sends findings to Operator
5. Operator reviews QA report and approves merge OR sends Murphy back for fixes
6. No next cycle begins without Operator approval
