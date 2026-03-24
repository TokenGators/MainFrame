# GATORRR — Cycle D Product Requirements
**Cycle:** D — Level System & Difficulty Ramp  
**Status:** Awaiting approval  
**Owner:** Kthings  
**Last updated:** 2026-03-23

---

## Goal

Give the game replay structure. Beating a level feels like an achievement, and the next level is noticeably harder. The game gets progressively more challenging with each level while keeping the same core loop.

---

## D1 — Level System

### Player Experience
When the player eats 10 frogs, they've cleared the level. Instead of just seeing a win screen and starting over, they see a brief level clear screen that acknowledges their win and then loads the next level with the game harder than before.

The score carries over between levels — a player going deep into the game accumulates a much higher score than one who only clears level 1.

Each level is still 60 seconds. The win condition is still eating 10 frogs. The lose conditions are unchanged. What changes is how fast and how many.

### What the Player Sees
- Level number shown in the HUD during play
- On level clear: a brief "LEVEL X CLEARED" screen (approximately 2 seconds) with the score so far, then automatically loads the next level
- Each successive level has more logs on screen and/or faster logs and frogs
- The game gets noticeably harder as levels progress — a player who reaches level 3 is dealing with a meaningfully more intense experience than level 1

### Level Progression
- Levels 1 through 4 have distinct parameter sets
- Level 4 parameters are the maximum — level 5 and beyond repeat level 4's settings
- No level cap — the game runs indefinitely at max difficulty until the player loses

### What Carries Between Levels
- Score (accumulates)
- Nothing else — HP resets to maximum, pads reset, frogs reset, timer resets

### Out of Scope
- Animated level transition
- Unique level themes or visual changes per level
- Boss encounters

---

## D2 — Difficulty Parameters Per Level

### Player Experience
The difference between levels should be felt, not just measured. Level 1 is approachable. By level 3 the logs are moving faster and there are more of them. By level 4 it's intense.

### What Changes Per Level
- Number of logs per river column
- Log speed range (min and max)
- Frog spawn rate (how often frogs appear)

### Level 1 vs Level 4 Feel
- Level 1: Learnable. A new player can survive long enough to understand the game.
- Level 4: Requires skill. Logs are dense and fast. Frogs come frequently. Score pressure is constant.

---

## Success Criteria (Player-Facing)

1. HUD shows current level number during gameplay
2. Eating 10 frogs on any level triggers a level clear screen
3. Level clear screen shows level number and current score
4. After approximately 2 seconds, next level begins automatically
5. HP resets to maximum at the start of each new level
6. Lily pads reset at the start of each new level
7. Timer resets to 60 seconds at the start of each new level
8. Score does NOT reset between levels — it accumulates
9. Level 2 is visibly harder than level 1 (more or faster logs, faster frog spawns)
10. Level 4 is significantly harder than level 1
11. Level 5 and beyond use the same parameters as level 4
12. Leaderboard entries (from Cycle B) now correctly record the level reached
13. No crashes during level transitions
14. Restarting from game over returns to level 1 (score resets)
