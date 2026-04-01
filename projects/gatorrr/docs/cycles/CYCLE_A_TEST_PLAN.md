# GATORRR — Cycle A Test Plan
**Cycle:** A — Foundation Stability  
**Reference:** CYCLE_A_PRD.md  
**Audience:** QA Agent  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## Instructions for QA

Read the current source code in `src/` and verify each test case below. For each test:
- Mark **PASS** if the behavior matches the expected outcome
- Mark **FAIL** with a description of what actually happens and which file/method is likely responsible

Do not assume intent — evaluate only what the code does. Report all failures to Operator before any fixes begin.

---

## Section 1 — Title Screen

**TC-A-01**  
Given: Game is loaded fresh in the browser  
When: The page finishes loading  
Then: The title screen is displayed — not the game, not a black screen  
Expected: TitleScene is the first interactive scene shown  

**TC-A-02**  
Given: Title screen is displayed  
When: Player presses any key  
Then: Game transitions to GameScene and gameplay begins  
Expected: Gator, logs, and frogs are visible. Timer starts counting.  

**TC-A-03**  
Given: Title screen is displayed  
When: Player reads the screen  
Then: Controls, win condition, and both lose conditions are clearly explained  
Expected: Arrow keys, "eat 10 frogs to win", "avoid logs", "don't let 5 frogs reach lily pads" — all present  

**TC-A-04**  
Given: Title screen is displayed  
When: Player waits 5 seconds without pressing anything  
Then: The start prompt is blinking or pulsing visibly  
Expected: "Press any key to start" text visibly pulses — not static  

---

## Section 2 — Gator Movement

**TC-A-05**  
Given: Game is in progress  
When: Player taps the right arrow key once  
Then: Gator slides smoothly one tile to the right — no teleport  
Expected: Visible slide animation approximately 80ms duration  

**TC-A-06**  
Given: Game is in progress  
When: Player holds the right arrow key  
Then: Gator slides continuously to the right, one tile at a time  
Expected: Continuous movement with brief slide animation per tile. Stops at right boundary (col 19).  

**TC-A-07**  
Given: Game is in progress  
When: Player moves the gator left  
Then: Gator sprite faces left (flipped horizontally)  
Expected: Sprite orientation changes to face left  

**TC-A-08**  
Given: Gator is facing left  
When: Player moves the gator right  
Then: Gator sprite faces right (default orientation)  
Expected: Sprite flips back to face right  

**TC-A-09**  
Given: Game is in progress  
When: Player moves the gator up or down  
Then: Gator moves one tile in that direction. Sprite orientation does not change.  
Expected: No horizontal flip on up/down movement  

**TC-A-10**  
Given: Gator is at the left boundary (col 0)  
When: Player presses left arrow  
Then: Gator does not move  
Expected: Gator stays at col 0. No error.  

**TC-A-11**  
Given: Gator slide animation is in progress  
When: Player rapidly presses multiple different arrow keys  
Then: Gator completes the current slide, then responds to input — no skipped tiles, no diagonal movement  
Expected: One move at a time. No stacking or queuing of multiple moves.  

---

## Section 3 — Log Balance

**TC-A-12**  
Given: Game is in progress  
When: Player observes the river  
Then: All 15 river columns (cols 2–16) have logs moving through them  
Expected: No empty river columns visible at any time  

**TC-A-13**  
Given: Game is in progress  
When: Player observes any single river column  
Then: There are at most 2 logs in that column at any given time  
Expected: No column has 3 or more logs visible simultaneously  

**TC-A-14**  
Given: Game is in progress  
When: Player observes the gaps between logs in a column  
Then: There is a gap large enough for the gator to fit through  
Expected: Minimum visible gap between logs in any column is approximately 48px (2 tiles)  

**TC-A-15**  
Given: Game is in progress  
When: Player observes a log reaching the edge of the screen  
Then: Log reappears on the opposite edge without visual gap or jump  
Expected: Seamless wrapping — no log disappears and leaves an empty column  

---

## Section 4 — Game Over Screen

**TC-A-16**  
Given: Game is in progress  
When: Gator HP reaches 0  
Then: Game over screen appears immediately, indicating loss due to HP  
Expected: Screen shows loss state. Frogs eaten, pads filled, time survived, and score are displayed and accurate.  

**TC-A-17**  
Given: Game is in progress  
When: 5 lily pads are filled by frogs  
Then: Game over screen appears immediately, indicating loss due to pads  
Expected: Screen shows loss state. Frogs eaten, pads filled, time survived, and score are displayed and accurate.  

**TC-A-18**  
Given: Game is in progress  
When: Player eats the 10th frog  
Then: Win screen appears immediately  
Expected: Screen shows win state. Frogs eaten (10), pads filled, time remaining, and score are displayed and accurate.  

**TC-A-19**  
Given: Win or lose screen is displayed  
When: Player presses R  
Then: Game restarts cleanly from the beginning  
Expected: Gator resets to start position, logs reset, frogs reset, timer resets to 60s, HP resets to 3, score resets to 0. Title screen is NOT shown — goes straight to GameScene.  

**TC-A-20**  
Given: Game over screen is displayed  
When: Player presses R rapidly multiple times  
Then: Game restarts once and runs normally — no crash  
Expected: No crash, no duplicate scene instances, no lingering state from previous run  

**TC-A-21**  
Given: Win screen is displayed  
When: Player reads the score  
Then: Score equals frogsEaten × 200  
Expected: 10 frogs eaten = 2000 score. Verify the arithmetic is correct.  

---

## Section 5 — Stability

**TC-A-22**  
Given: Game is in progress  
When: Player plays for a full 60 seconds without winning  
Then: Game ends (time expires) with game over screen — no crash  
Expected: Timer reaches 0, game over screen shown, restart works  

**TC-A-23**  
Given: A complete game session (win or lose)  
When: Player reviews the game over screen stats  
Then: All stats shown (frogs eaten, pads filled, time, score) match actual gameplay  
Expected: No stale data, no zeros where values should be, no NaN  

---

## Reporting

QA report must include:
- PASS or FAIL for every test case above (TC-A-01 through TC-A-23)
- For each FAIL: describe observed behavior, expected behavior, and the file/method most likely responsible
- Any additional issues observed that fall outside these test cases — flag separately

Send report to Operator. Do not send fixes directly to Murphy until Operator reviews.
