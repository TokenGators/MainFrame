# GATORRR — Cycle E Product Requirements
**Cycle:** E — Core Mechanics Overhaul (Entry, Dive, Bite)
**Status:** Awaiting approval
**Owner:** Kthings
**Last updated:** 2026-03-30

---

## Goal

Transform Gatorrr from a game where you dodge logs while eating frogs into a game where the river itself is the arena and you are the apex predator navigating it on your own terms. Three new systems — Entry, Dive, and Bite — give the player agency, risk management, and offensive tools. Every level reset is a clean slate.

---

## E1 — Gator Entry & Confinement

### Player Experience
The game starts with the gator on the bank (col 0), watching the river. The player can see frogs beginning to cross, read the log patterns, and choose their moment to enter. Waiting is a valid strategy — more frogs will be in the water — but every second spent on the bank is a second frogs move closer to lily pads.

The moment the gator enters the river, it is committed. There is no returning to the bank. The river is the arena for the entire round.

### What the Player Sees
- Gator visible on the bank at the start, logs and frogs moving in the river
- Player presses a directional key to jump into the river
- A splash animation/sprite plays on entry
- Gator is now in the river — movement is constrained to cols 1–16 (river only)
- No path back to col 0

### Boundaries Once Entered
- Gator cannot move to col 0 (left bank) — blocked
- Gator cannot move to col 1 (lily pad zone) — blocked
- Gator can move freely within the river (cols 2–16), all rows 1–10
- Right bank (cols 17–19) is also off-limits — frog spawn territory

### Level Reset
- On each new level: gator returns to col 0 bank, full HP, fresh entry choice
- Everything resets: frogs, lily pads, timer, score carries forward

---

## E2 — Dive Mode

### Player Experience
The gator can dive underwater at any time. Submerged, it is invisible to frogs and cannot be hit by logs. The player can navigate freely while underwater to reposition or escape danger. But breath is limited — dive too long and the gator surfaces automatically, wherever it is, whether that's safe or not.

Surfacing on purpose is the skill expression. The player positions the gator underwater, reads the log pattern above, and surfaces in a gap. Surface on top of a swimming frog and the gator eats it — but now the gator is exposed on the surface and must dodge logs.

Breath refills over time while on the surface. Players who dive frequently need to wait between dives.

### What the Player Sees
- Hold Space: gator dives — brief transition pause, then everything on the surface (logs, frogs) becomes translucent/faded while the gator remains full color, indicating underwater state
- Gator can move while submerged
- A breath meter (HUD element) depletes while diving
- When breath runs out: automatic surface at current position
- Release Space: surface at current position
- Surface on a swimming frog's tile: frog is eaten, gator is now exposed
- Surface on a log's tile: gator takes damage
- Breath meter refills slowly while on surface (not instant)

### Visual Approach
Try: surface objects (logs, frogs) render at reduced alpha (~40%) while gator remains at full opacity. If this looks jarring in testing, fall back to: brief pause/flash transition on dive, subtle tint shift on the water background.

### Rules
- Cannot eat frogs while submerged
- Frogs do not react to or detect a diving gator
- Logs cannot damage the gator while submerged
- Gator CAN move while diving
- Surfacing on a log tile = damage (same as normal log collision)
- Surfacing on a frog tile = eat (collision resolves on surface)

---

## E3 — Bite Mode

### Player Experience
The gator starts each level with 3 bites. A bite is a powerful targeted attack: the player holds Shift and presses a direction to bite the adjacent tile in that direction. Bites work on logs and frogs alike.

Biting a log destroys that segment permanently — it is removed from the field. Log spawning continues normally so new logs will appear, but the immediate obstacle is gone. This creates a tactical gap the player can exploit.

Biting a frog on a log eats the frog AND removes the log segment. The score is: frog points (by type) plus a log break bonus. This is the highest-value play in the game — risky to get close enough to execute, but worth more than a standard eat.

Bites are displayed in the HUD. Starting count is 3 with no additional bites in Cycle E (future power-ups will add more).

### What the Player Sees
- Shift held: visual indicator that bite mode is armed (gator sprite change or HUD highlight)
- Shift + direction: bite fires in that direction, one tile range
- Hit a log: log segment disappears, bite count decrements
- Hit a frog on a log: frog eaten, log removed, score updates with frog + log bonus, bite count decrements
- Hit a swimming frog: frog eaten, bite count decrements (same as normal collision eat — no log bonus)
- Hit empty water: bite wasted, count decrements
- Bite count reaches 0: shift key does nothing

### Rules
- Cannot bite while diving
- Log destruction is permanent for that segment — spawning is unaffected
- No additional bites earned in Cycle E (placeholder for future power-up system)
- Biting a swimming frog is valid but wasteful (normal collision is free, bite costs a charge)

---

## E4 — Scoring Updates

### Log Break Bonus
When a log segment is destroyed by bite (with or without a frog):
- Log break: +100 points (placeholder — tune in QA)

### Bite + Frog Score
Eating a frog on a log via bite:
- Frog points (by type: 200–2000)
- Log break bonus: +100
- Total = frog type value + 100

### Entry Timing Bonus (optional — hold for later)
Could add bonus points for entering the river before X seconds elapsed — rewards aggressive entry. Mark as future consideration, not in Cycle E scope.

---

## Success Criteria (Player-Facing)

1. Gator starts on bank (col 0) and stays there until player inputs a direction into the river
2. Splash visual/sprite plays on river entry
3. Once in river, gator cannot move back to col 0 or col 1
4. Hold Space dives the gator — surface objects fade, gator remains full color
5. Gator moves freely while diving
6. Logs do not damage gator while diving
7. Frogs do not react to diving gator
8. Breath meter depletes while diving, refills on surface (not instant)
9. Breath runs out → automatic surface at current position
10. Surfacing on a frog tile eats the frog; gator is now exposed to logs
11. Surfacing on a log tile deals damage
12. HUD shows bite count (starts at 3)
13. Shift + direction fires a bite at the adjacent tile
14. Biting a log removes it permanently; log spawning continues normally
15. Biting a frog on a log: frog eaten, log removed, score = frog value + 100
16. Cannot bite while diving
17. Bite count at 0: biting does nothing
18. Each level: gator resets to bank, full HP, 3 bites, fresh timer, score carries
19. No crashes from any new state transitions
