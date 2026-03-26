# GATORRR — Cycle E Test Plan
**Cycle:** E — Dev Tuning Panel
**Reference:** CYCLE_E_PRD.md
**Audience:** QA Agent
**Status:** Approved
**Last updated:** 2026-03-25

---

## Instructions for QA

Review source code and verify each test case. Mark PASS or FAIL with details on failures. Report all findings to Operator before any fixes proceed. Do NOT use git log or git diff — read source files directly.

Files to read:
- `src/ui/DevPanel.js`
- `src/scenes/GameScene.js`
- `src/managers/LogColumnManager.js`
- `src/managers/FrogSpawner.js`
- `src/entities/Frog.js`
- `src/constants.js`

---

## Section 1 — Panel Visibility & Toggle

**TC-E-01**
Given: `DEV_MODE = true` and game is in progress
When: Player presses the backtick key (`)
Then: Dev panel appears as an overlay in the top-right corner
Expected: Panel visible, semi-transparent dark background, 5 sliders with labels

**TC-E-02**
Given: Dev panel is open
When: Player presses backtick again
Then: Panel closes and game resumes
Expected: Panel hidden, Phaser scene unpaused

**TC-E-03**
Given: `DEV_MODE = false`
When: Player presses backtick
Then: Nothing happens
Expected: No panel appears, game continues normally

**TC-E-04**
Given: Dev panel is open
When: Panel is open
Then: Game is paused (logs not moving, frogs not moving)
Expected: Phaser scene is paused while panel is visible

---

## Section 2 — Slider Functionality

**TC-E-05**
Given: Dev panel is open
When: Developer moves the "Logs/column" slider
Then: The value display next to the slider updates in real time
Expected: Live value feedback on all sliders as they are dragged

**TC-E-06**
Given: Dev panel is open, logs/column slider set to 4
When: Panel is closed
Then: River columns now have 4 logs each (more logs visible than before)
Expected: Log count in each column reflects the slider value

**TC-E-07**
Given: Dev panel is open, log speed slider set to 2.0x
When: Panel is closed
Then: All logs move approximately twice as fast as before
Expected: Noticeable speed increase on all logs

**TC-E-08**
Given: Dev panel is open, log speed slider set to 0.25x
When: Panel is closed
Then: Logs move very slowly
Expected: Logs visibly slower — approximately quarter normal speed

**TC-E-09**
Given: Dev panel is open, max frogs slider set to 1
When: Panel is closed and game runs for 30 seconds
Then: Never more than 1 frog on screen at a time
Expected: FrogSpawner respects the new maxFrogs value immediately

**TC-E-10**
Given: Dev panel is open, frog interval slider set to 200ms
When: Panel is closed
Then: Frogs make decisions (move) very rapidly
Expected: Frogs move much more frequently than normal

**TC-E-11**
Given: Dev panel is open, frog interval slider set to 2000ms
When: Panel is closed
Then: Frogs move slowly and infrequently
Expected: Noticeable slowdown in frog decision rate

**TC-E-12**
Given: Dev panel is open, frog smartness set to 0
When: Panel is closed and frogs are observed crossing the river
Then: Frogs jump regardless of whether a log is in the landing zone
Expected: Most frogs fall into the water (dumb behavior)

**TC-E-13**
Given: Dev panel is open, frog smartness set to 1.0
When: Panel is closed and frogs are observed crossing the river
Then: Frogs only jump when a log is in the landing zone — never jump into open water
Expected: No frogs fall into the water (fully smart behavior)

---

## Section 3 — Reset Behavior

**TC-E-14**
Given: Dev panel sliders have been adjusted (e.g., logs=4, speed=2x)
When: Player dies and presses R to restart
Then: Logs and frogs reset to level 1 defaults — slider overrides are gone
Expected: Values return to level config defaults on restart

**TC-E-15**
Given: Dev panel sliders have been adjusted
When: Player clears a level and advances to level 2
Then: New level starts with level 2 config defaults, not the slider values
Expected: Slider overrides do not persist across level transitions

---

## Section 4 — Stability

**TC-E-16**
Given: Dev panel is open
When: Panel is opened and closed rapidly multiple times
Then: No crash, no duplicate panels, game resumes correctly each time
Expected: Toggle is stable under rapid use

**TC-E-17**
Given: Game ends (win or lose) while dev panel is open
When: Transition to GameOverScene occurs
Then: Panel is cleaned up — not visible on game over screen
Expected: No panel leaking into GameOverScene or subsequent scenes

**TC-E-18**
Given: Logs/column slider is changed to a new value
When: The reinitialize is triggered
Then: No crash — old log objects are destroyed, new ones are created
Expected: Clean reinitialize with no lingering log objects or physics bodies

---

## Reporting

QA report must include:
- PASS or FAIL for every test case (TC-E-01 through TC-E-18)
- For each FAIL: observed behavior, expected behavior, responsible file/method
- Any additional anomalies observed

Post report to tracker channel, then fire system event.
