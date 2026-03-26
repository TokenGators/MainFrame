# GATORRR — Cycle E Product Requirements
**Cycle:** E — Dev Tuning Panel
**Status:** Approved
**Owner:** Kthings
**Last updated:** 2026-03-25

---

## Goal

Give the development team a live tuning panel to adjust gameplay parameters in real time without restarting the game. This is a dev-only tool — invisible to players — used to dial in the gameplay feel before locking in level config values.

---

## E1 — Dev Tuning Panel

### Who Uses It
Developers only. Not visible to players. Gated by a `DEV_MODE` constant that can be set to `false` before any public build.

### How to Open It
Press the backtick key (`` ` ``) during gameplay. The panel toggles open/closed. While open, the game is paused. Closing the panel resumes play with the current slider values active.

### What It Shows
Five sliders, each labeled clearly:

1. **Logs per column** — how many logs are in each river column
2. **Log speed multiplier** — scales all log speeds up or down relative to their current values
3. **Max frogs** — maximum number of frogs on screen at once
4. **Frog decision interval** — how often frogs make a move (in milliseconds)
5. **Frog smartness** — probability a frog makes a smart jump vs. a dumb one

### Behavior
- Changes apply immediately — no restart required
- Adjusting log count respawns logs in all columns with the new count
- Closing the panel resumes the game
- Values reset to level config defaults on game restart or level transition
- Panel does not affect leaderboard entries

### Out of Scope
- Player-facing difficulty settings
- Saving slider values between sessions
- Any visual polish — functional is fine
