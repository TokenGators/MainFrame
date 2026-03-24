# GATORRR — Cycle D Test Plan
**Cycle:** D — Level System & Difficulty Ramp  
**Reference:** CYCLE_D_PRD.md  
**Audience:** QA Agent  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## Instructions for QA

Review source code and verify each test case. Mark PASS or FAIL. For failures, describe observed vs expected behavior and the responsible file/method. Report all findings to Operator.

---

## Section 1 — HUD Level Display

**TC-D-01**  
Given: Game starts on level 1  
When: Player observes the HUD  
Then: Level indicator shows "LVL: 1" or equivalent  
Expected: Level number visible in HUD from game start  

**TC-D-02**  
Given: Player clears level 1 and level 2 begins  
When: Player observes the HUD  
Then: Level indicator shows "LVL: 2"  
Expected: HUD updates correctly on new level  

---

## Section 2 — Level Clear Flow

**TC-D-03**  
Given: Player has eaten 9 frogs  
When: Player eats the 10th frog  
Then: Level clear screen appears — NOT the win/game over screen  
Expected: LevelClearScene shown, not GameOverScene  

**TC-D-04**  
Given: Level clear screen is displayed  
When: Player reads the screen  
Then: Level number and current score are clearly shown  
Expected: "LEVEL 1 CLEARED" (or equivalent), score visible  

**TC-D-05**  
Given: Level clear screen is displayed  
When: 2 seconds pass  
Then: Next level begins automatically — no input required  
Expected: GameScene reloads with level 2 parameters. Player did not press any key.  

**TC-D-06**  
Given: Level 2 begins after clearing level 1  
When: Player observes game state  
Then: HP is restored to maximum, lily pads are all empty, timer is reset to 60 seconds  
Expected: Full reset of all per-level state  

---

## Section 3 — Score Carry

**TC-D-07**  
Given: Player finished level 1 with a score of 2,400  
When: Level 2 begins  
Then: HUD shows score starting from 2,400 (not 0)  
Expected: Score carries over — does not reset between levels  

**TC-D-08**  
Given: Player clears level 1 (score 2,400) and eats 3 frogs on level 2  
When: Player observes score  
Then: Score is 2,400 + (3 frogs × their point values) — cumulative  
Expected: Score accumulates correctly across levels  

**TC-D-09**  
Given: Player loses on level 2  
When: Game over screen shows  
Then: Score shown is the total accumulated score (level 1 + level 2 earnings)  
Expected: Final score reflects full playthrough, not just last level  

---

## Section 4 — Difficulty Ramp

**TC-D-10**  
Given: Player observes the river on level 1  
When: Compared visually to level 3  
Then: Level 3 has more logs in the river than level 1  
Expected: Level 3 logsPerCol = 3 vs level 1 logsPerCol = 2. Visibly denser.  

**TC-D-11**  
Given: Player reaches level 4  
When: Player observes log movement  
Then: Logs are moving noticeably faster than level 1  
Expected: Speed range for level 4 (50–95 px/s) is visibly faster than level 1 (20–50 px/s)  

**TC-D-12**  
Given: Player is on level 1  
When: Player counts time between frog spawns  
Then: Frogs appear approximately every 1.5–2.25 seconds  
Expected: Consistent with level 1 spawn config  

**TC-D-13**  
Given: Player is on level 4  
When: Player counts time between frog spawns  
Then: Frogs appear noticeably more frequently than level 1  
Expected: Consistent with level 4 spawn config (0.8–1.5s)  

**TC-D-14**  
Given: Player reaches level 5 (cleared level 4)  
When: Player observes difficulty  
Then: Level 5 is identical in difficulty to level 4  
Expected: No increase beyond level 4 parameters — difficulty is capped  

---

## Section 5 — Leaderboard Integration

**TC-D-15**  
Given: Player loses on level 3  
When: Leaderboard entry is saved  
Then: Entry records level = 3  
Expected: Level field in localStorage entry is correct  

**TC-D-16**  
Given: Title screen is displayed after a multi-level game  
When: Player reads the leaderboard  
Then: Level reached is shown next to the score  
Expected: Leaderboard entry shows level column correctly  

---

## Section 6 — Restart Behavior

**TC-D-17**  
Given: Player loses on level 3  
When: Player presses R on the game over screen  
Then: Game restarts at level 1 with score 0  
Expected: Full reset — no carryover of level or score from the failed run  

**TC-D-18**  
Given: Multiple level transitions in a single session  
When: Player plays through levels 1, 2, and 3  
Then: No crashes during any transition  
Expected: Clean scene transitions throughout — no undefined references, no ghost objects  

---

## Reporting

QA report must include:
- PASS or FAIL for every test case (TC-D-01 through TC-D-18)
- For each FAIL: observed behavior, expected behavior, file/method responsible
- Any additional anomalies observed

Send full report to Operator before further development.
