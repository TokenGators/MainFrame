# GATORRR — Cycle A Feature Spec
**Cycle:** A — Foundation Stability  
**Version:** v3.0  
**Status:** Awaiting approval  
**Owner:** Kthings  
**Last updated:** 2026-03-23

---

## Purpose

Cycle A delivers a complete, crash-free gameplay loop. After this cycle the game must be fully playable from title screen through win or loss, with smooth gator movement, balanced log density, and all game state screens functional.

---

## Feature A1 — Smooth Gator Movement

### What We Want
The gator currently teleports between grid tiles when moving. This creates an unfair gameplay experience — the player cannot judge whether they'll land in a gap or on a log because the position change is instant. The gator should slide smoothly from tile to tile, giving the player visual feedback on exactly where they're going before they arrive.

### Behavior
- Player holds an arrow key → gator begins sliding to the adjacent tile in that direction
- Slide takes 80 milliseconds (one tile width)
- While the gator is sliding, no new movement input is accepted
- When the slide completes, if the key is still held, the gator immediately begins the next slide
- Gator sprite flips horizontally when moving left, faces default (right) when moving right
- Up/down movement does not change sprite flip

### Feel
- Responsive but not instant
- Continuous movement when key is held
- No queuing — one move at a time, new input only after current slide completes
- Movement feels deliberate, not floaty

### Boundaries
- Gator cannot move left of col 0
- Gator cannot move right of col 19
- Gator cannot move above row 0
- Gator cannot move below row 10

### Collision
- Collision detection continues to use grid position (gridCol, gridRow), not pixel position
- Physics body must stay in sync with pixel position during the slide

---

## Feature A2 — Log Balance

### What We Want
The river currently has too many logs, making level 1 extremely difficult. The density needs to be reduced to a navigable starting point. The full width of the river must have logs — currently the leftmost 2 and rightmost 3 river columns are empty.

### Log Coverage
- Logs must span the full river: columns 2 through 16 (15 columns total)
- 2 logs per column at level 1 (down from 3)
- Logs in each column travel the same direction and speed (alternating per column)

### Log Spacing
- Gaps between logs in the same column must allow the gator to pass through
- Minimum gap: 48px
- Maximum gap: 112px
- Logs must be evenly distributed across the screen height at spawn — no clustering at top or bottom

### Visual
- Each log fills most of its column width (20px wide within a 24px tile)
- Logs are 2 or 3 tiles tall (randomly assigned per log)

---

## Feature A3 — Game Over Screen

### What We Want
When the game ends (any condition), the player must see a clear, informative screen that tells them what happened and shows their results before offering a restart.

### Three End States

**Win — Ate 10 Frogs**
```
YOU WIN! 🐊
Ate all 10 frogs!

Frogs Eaten:    10
Pads Filled:    X
Time Remaining: Xs
Score:          XXXXX

[R] Play Again
```

**Lose — HP Reached Zero**
```
GAME OVER
The logs got you.

Frogs Eaten:    X / 10
Pads Filled:    X / 5
Time Survived:  Xs
Score:          XXXXX

[R] Try Again
```

**Lose — All Pads Filled**
```
GAME OVER
All lily pads are filled!

Frogs Eaten:    X / 10
Pads Filled:    5 / 5
Time Survived:  Xs
Score:          XXXXX

[R] Try Again
```

### Behavior
- Screen appears immediately on game end (no delay)
- R key triggers a clean restart (re-initializes all game state)
- Score shown is final (includes all bonuses and penalties — see Cycle B for score system; for Cycle A, show raw frogs-eaten count × 200 as placeholder)
- Screen must not crash if player presses R rapidly

---

## Feature A4 — Title / Start Screen

### What We Want
The game currently drops the player directly into gameplay with no context. A title screen is required before the game begins.

### Content
```
GATORRR 🐊

You are a gator defending your lily pads.
Eat the frogs before they reach home.

Controls:
  Arrow Keys — Move
  Eat frogs by touching them
  Avoid the logs

Survive 60 seconds. Eat 10 frogs to win.

Press any key to start
```

### Behavior
- Title screen shows on initial load
- Any key press starts the game
- If a leaderboard exists (Cycle B), show top score here
- For Cycle A, leaderboard section is omitted or shows placeholder

---

## Success Criteria

The following must all be true for Cycle A to be considered complete:

1. Gator moves smoothly (slides between tiles) — no teleporting
2. Held arrow key produces continuous movement
3. Gator sprite flips correctly on left/right movement
4. Logs appear in all 15 river columns (cols 2–16)
5. Only 2 logs per column
6. Gaps between logs are navigable (never less than 48px)
7. Title screen appears on load, any key starts game
8. Win screen appears when 10 frogs are eaten, shows correct stats
9. Lose screen (HP=0) appears when HP hits zero, shows correct stats
10. Lose screen (pads full) appears when 5 pads are filled, shows correct stats
11. R key restarts cleanly from any game over state
12. No crashes during a full 60-second session
13. Build compiles without errors
