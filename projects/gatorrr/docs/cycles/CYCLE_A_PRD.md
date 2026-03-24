# GATORRR — Cycle A Product Requirements
**Cycle:** A — Foundation Stability  
**Status:** Awaiting approval  
**Owner:** Kthings  
**Last updated:** 2026-03-23

---

## Goal

Make the game feel like a real game. A player who opens GATORRR for the first time should see a title screen that explains the game, be able to play a full session without crashing, and land on a clear end screen that tells them how they did. The gator should feel good to control.

---

## A1 — Smooth Gator Movement

### Player Experience
Right now the gator teleports from tile to tile. It feels janky and makes it nearly impossible to judge whether you'll land safely — the position change happens before you can see it coming. The gator needs to slide smoothly from where it is to where it's going, so the player always knows exactly what's happening.

Holding an arrow key should move the gator continuously in that direction. The gator should face the way it's moving — when going left, the sprite faces left. When going right, it faces right.

### What the Player Sees
- Gator slides fluidly between tiles — no snapping or teleporting
- Hold a key: gator keeps moving in that direction
- Tap a key: gator moves one tile
- Sprite flips to face left when moving left, faces right when moving right
- Movement feels responsive — no noticeable lag between input and gator starting to move

### Out of Scope
- Diagonal movement
- Variable movement speed
- Any animation frames beyond the static sprite

---

## A2 — Log Balance

### Player Experience
Level 1 is currently too hard to survive for more than a few seconds. The river is also visually broken — entire sections have no logs at all, which looks like a bug. The logs need to cover the full width of the river and be sparse enough that a new player has room to learn.

### What the Player Sees
- Logs moving up and down across the entire width of the river — no empty columns
- Enough open water between logs to navigate without perfect timing
- The game feels challenging but fair on a first attempt

### Out of Scope
- Log sprites (scheduled for Cycle B)
- Multiple log speeds within a column

---

## A3 — Game Over Screen

### Player Experience
When the game ends — for any reason — the player needs to know what happened and how they did. There are three ways the game ends: the gator runs out of HP, all five lily pads get filled, or the player eats 10 frogs and wins. Each should feel distinct.

After seeing their results, the player should be able to restart immediately without reloading the page.

### What the Player Sees

**Win:**
A celebratory screen. Tells the player they won, shows how many frogs they ate, how much time was left, and their score. Offers a restart.

**Lost all HP:**
A lose screen. Tells the player the logs got them. Shows stats. Offers a restart.

**All pads filled:**
A lose screen. Tells the player the frogs won. Shows stats. Offers a restart.

All three screens show: frogs eaten, pads filled, time, and score. A single key press restarts cleanly.

### Out of Scope
- Animations or transitions on the game over screen
- Online score submission

---

## A4 — Title Screen

### Player Experience
New players have no idea what GATORRR is or how to play it. The first thing they see when they open the game should tell them what it is, what they're trying to do, and how the controls work. Then they press a key and play.

### What the Player Sees
- Game title
- One-sentence description of the game
- Controls listed clearly
- Win and lose conditions explained simply
- A prompt to press any key to start — the prompt blinks so it's clearly interactive

### Out of Scope
- Animated intro sequences
- Character select or settings
- High score display (coming in Cycle B)

---

## Success Criteria (Player-Facing)

1. Title screen appears when the game loads — player is not dropped into gameplay
2. Title screen explains controls and win condition clearly
3. Any key press starts the game
4. Gator slides smoothly between tiles — no teleporting visible
5. Holding an arrow key moves the gator continuously
6. Gator sprite faces left when moving left, right when moving right
7. Logs appear across the full width of the river — no empty columns
8. Log spacing feels navigable for a new player on level 1
9. Win screen appears when 10 frogs are eaten and shows accurate stats
10. Lose screen (HP=0) appears when the gator dies and shows accurate stats
11. Lose screen (pads full) appears when all 5 pads are filled and shows accurate stats
12. A single key press restarts the game cleanly from any end screen
13. No crashes occur during a full 60-second session
