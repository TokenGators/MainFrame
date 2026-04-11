# GATORRR — Cycle B Technical Specification
**Cycle:** B — Score & Frog Type System  
**Reference:** CYCLE_B_PRD.md  
**Audience:** Murphy (coder)  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## B1 — Score System

### Constants (all in src/constants.js)
Define the following tunable constants:
```
SCORE_FROG_GREEN    = 200
SCORE_FROG_BLUE     = 500
SCORE_FROG_PURPLE   = 1000
SCORE_FROG_RED      = 1500
SCORE_FROG_GOLD     = 2000
SCORE_PAD_PENALTY   = 300
SCORE_WIN_BONUS     = 1000
SCORE_TIME_BONUS_PER_SEC = 10
```

### Score State
- Score lives in `gameState.score` (already initialized to 0 in GameScene)
- Score can go negative (no floor)
- Score updates must be immediate — no batching or delay

### Score Events and Triggers
- **Eat frog:** When CollisionSystem detects gator-frog collision, look up the frog's type, add the corresponding point value to `gameState.score`
- **Pad filled:** When CollisionSystem detects frog-lilypad collision and a pad is filled, subtract `SCORE_PAD_PENALTY` from `gameState.score`
- **Win bonus + time bonus:** Calculated at the moment the win condition triggers (frogsEaten = 10), before transitioning to GameOverScene. Add `SCORE_WIN_BONUS` + `(timeLeft / 1000) * SCORE_TIME_BONUS_PER_SEC`
- **Loss:** No bonus. Score is whatever it is at game end.

### HUD
- The score field in the HUD must update every frame (already in update loop — just needs to read gameState.score)
- Replace the Cycle A placeholder text with the live score

### Game Over Screen
The score breakdown must show each component separately:
- Points from frogs eaten (total, not per frog)
- Total pad penalties
- Win bonus (0 if loss)
- Time bonus (0 if loss)
- Grand total

The GameScene must track enough state to compute this breakdown:
- `gameState.score` (running total)
- `gameState.winBonus` (set at win time)
- `gameState.timeBonus` (set at win time)
- `gameState.padPenaltyTotal` (running total of all pad penalties)

---

## B2 — Frog Type System

### Constants (src/constants.js)
Define frog type identifiers and their properties:

```
FROG_TYPES = {
  green:  { points: 200,  tint: [green hex],  weight: 60 },
  blue:   { points: 500,  tint: [blue hex],   weight: 25 },
  purple: { points: 1000, tint: [purple hex], weight: 10 },
  red:    { points: 1500, tint: [red hex],    weight: 4  },
  gold:   { points: 2000, tint: [gold hex],   weight: 1  },
}
```

Use hex values from the existing PICO-8 palette in constants.js (C.GREEN, C.BLUE, etc.).

Define a separate tuning constant:
```
FROG_SPAWN_WEIGHTS = { green: 60, blue: 25, purple: 10, red: 4, gold: 1 }
```
Weights must sum to 100 for straightforward percentage interpretation. Murphy may implement as weighted random selection — the sum just needs to be consistent.

### Frog Spawn Logic
- On each frog spawn, perform a weighted random selection to determine frog type
- The selected type is stored on the frog instance (e.g., `frog.type = 'blue'`)
- Apply the corresponding color tint to the frog sprite immediately on spawn
- The frog's point value is looked up from `FROG_TYPES` by type when eaten

### Frog Entity Changes
- Add `type` property to Frog entity
- Add `points` getter or property derived from type
- Tint is applied via Phaser's `setTint()` — no new assets required
- All other frog behavior (movement, AI, states) is unchanged

### CollisionSystem Changes
- When gator eats a frog, read `frog.type` to look up point value from `FROG_TYPES`
- Add the correct point value to `gameState.score`
- No other changes to collision logic

---

## B3 — Local Leaderboard

### Storage
- Use browser localStorage
- Key: `gatorrr_leaderboard`
- Value: JSON array of up to 5 entries, sorted descending by score
- Each entry: `{ score, level, date }` where date is ISO string

### Save Logic
- Triggered on game end (any end state), before GameOverScene renders
- Read current leaderboard from localStorage (empty array if not present)
- Insert new entry
- Sort descending by score
- Trim to top 5
- Write back to localStorage

### Display — Title Screen
- TitleScene reads leaderboard from localStorage on create
- If leaderboard is empty: show "No scores yet"
- If leaderboard has entries: show top 5 in a table — rank, score, level, date (MM/DD format)

### Display — Game Over Screen
- After showing stats, indicate if the current score made the leaderboard
- Text such as "New High Score!" or "Rank #3" if applicable

### Integration Notes
- Leaderboard read/write must be wrapped in try/catch — localStorage can be unavailable in some browser contexts
- Level field: for Cycle B this is always level 1 (level system ships in Cycle D)

---

## Deliverables

Murphy delivers:
1. All source changes for B1, B2, B3
2. Clean build (npm run build, no errors)
3. Summary of implementation decisions
4. Commit on `agent/gatorrr/fix-crash-and-phase2`: `feat[gatorrr] cycle B - score system, frog types, leaderboard`
5. Pushed to remote

Do not proceed to Cycle C until QA approves and Operator signs off.
