# GATORRR v3 — Shipping Spec

**Status:** In progress  
**Branch:** agent/gatorrr/fix-crash-and-phase2  
**Owner:** Kthings  
**Last updated:** 2026-03-23

---

## 🔴 Must-Haves (Blockers)

### 1. Crash-free full playthrough
- No crashes at any point during a full 60s session
- Win and lose conditions both trigger cleanly
- Restart works without reload

### 2. Game Over screen
- Clear win screen: "YOU WIN 🐊 — Ate X frogs in Xs"
- Clear lose screens: one for HP=0, one for all pads filled
- Show score and time survived
- "Press R to restart" or on-screen button

### 3. Frog→lily pad logic end-to-end
- Frogs crossing river on logs (see Frog AI section below)
- Lily pad fill triggers correctly
- Lose condition (5 pads filled) fires cleanly
- Pad fill has visible feedback

---

## 🟡 Should-Haves

### 1. Sound effects
- Hop (frog jumps)
- Eat (gator eats frog)
- Die (gator loses HP)
- Even placeholder bleeps are fine for v1

### 2. Start / title screen
- Show game title, controls, and a "Press any key to start"
- Don't drop players cold into gameplay

### 3. Score on game over
- Show frogs eaten, pads filled, time survived
- Even a basic score screen beats a blank restart

### 5. Log sprites
- Logs are the dominant visual — still plain brown rectangles
- Replace with pixel art log sprites (brown cylindrical)

### 6. Visual feedback on lily pad fill
- Flash or color change when a frog occupies a pad
- Player needs to know a pad was just taken

---

## 🟢 Nice-to-Haves (Polish)

### 1. Difficulty ramp
- Speed and spawn rate increase as timer counts down
- Last 20 seconds should feel intense

### 4. Local high score
- Store best score in localStorage
- Show on game over and title screens

### 5. Background art
- Replace flat color blocks with textured bank/river/grass
- Forest silhouette on banks

---

## 🐸 Frog AI — Smart River Crossing

**This is a core gameplay mechanic, not just polish.**

### Behavior Model

Frogs are trying to cross the river using logs as stepping stones. They're not suicidal — they prefer to hop log-to-log. But they're not perfect, and sometimes end up in the water. That's when the gator can eat them.

**States:**
- `WAITING` — on a log, scanning for the next log to jump to
- `JUMPING` — mid-jump to next log or lily pad
- `SWIMMING` — in the water (vulnerable, moving slowly left)
- `ON_LOG` — riding a log, moving with it vertically

**Decision logic (per tick):**

1. If ON_LOG:
   - Scan the adjacent column to the left for a log that overlaps my current Y position
   - If a log is within jump range (within ~1 tile vertically): jump to it (smart move)
   - If no log available: wait (stay on current log)
   - With `(1 - FROG_SMARTNESS)` probability: jump anyway even if no log (mistake → lands in water)

2. If SWIMMING:
   - Move left slowly (half speed of normal)
   - Scan for nearby logs to grab onto
   - Vulnerable to gator

3. If on right bank (col 17-19):
   - Start in WAITING state, look for first log

### Tuning Constant

Add to `src/constants.js`:
```js
// 0.0 = dumb (always jumps regardless of water)
// 1.0 = perfect (never jumps into water)
// Start at 0.75 — mostly smart, occasionally makes mistakes
export const FROG_SMARTNESS = 0.75;
```

### What this changes in gameplay
- Frogs now ride logs across — you see them moving with logs, hopping between them
- Occasionally a frog misjudges and falls in the river
- River is now the hunting ground — gator wants to patrol water
- Adds strategy: do you chase frogs in the water, or defend lily pads?

---

## Deployment

- Netlify deploy (one-time setup, then auto from `dist/`)
- URL shareable for mobile QA
- Must be done before calling v1 shipped

---

## Pipeline

**Murphy** (`qwen3-coder:30b`) — implementation  
**QA** (`qwen3.5:27b`) — review each cycle  
**Operator** — specs, prioritization, final call  
