# GATORRR — Cycle B Test Plan
**Cycle:** B — Score & Frog Type System  
**Reference:** CYCLE_B_PRD.md  
**Audience:** QA Agent  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## Instructions for QA

Review the source code and verify each test case. Mark PASS or FAIL. For failures, describe observed vs expected behavior and identify the responsible file/method. Report all findings to Operator before any fixes proceed.

---

## Section 1 — Score System

**TC-B-01**  
Given: Game is in progress  
When: Player observes the HUD  
Then: A score field is visible and starts at 0  
Expected: Score displayed in HUD, initialized to 0 at game start  

**TC-B-02**  
Given: Gator eats a green frog  
When: Collision is detected  
Then: Score increases by exactly 200  
Expected: Score before + 200 = score after  

**TC-B-03**  
Given: Gator eats a blue frog  
When: Collision is detected  
Then: Score increases by exactly 500  

**TC-B-04**  
Given: Gator eats a purple frog  
When: Collision is detected  
Then: Score increases by exactly 1,000  

**TC-B-05**  
Given: Gator eats a red frog  
When: Collision is detected  
Then: Score increases by exactly 1,500  

**TC-B-06**  
Given: Gator eats a gold frog  
When: Collision is detected  
Then: Score increases by exactly 2,000  

**TC-B-07**  
Given: A frog reaches and fills a lily pad  
When: Pad collision is detected  
Then: Score decreases by exactly 300  
Expected: Score before - 300 = score after. Score can go negative.  

**TC-B-08**  
Given: Player wins (10 frogs eaten) with 15 seconds remaining  
When: Win condition triggers  
Then: Score includes +1,000 win bonus AND +150 time bonus (15 × 10)  
Expected: Final score = frogs points + (-pad penalties) + 1000 + 150  

**TC-B-09**  
Given: Player loses (HP=0 or pads full)  
When: Loss condition triggers  
Then: No win bonus or time bonus is added  
Expected: Final score = frogs points + (-pad penalties) only  

**TC-B-10**  
Given: Game over screen is displayed  
When: Player reads the score breakdown  
Then: Points from frogs, pad penalties, win bonus, time bonus, and total are shown separately  
Expected: All components visible, math adds up to total displayed  

---

## Section 2 — Frog Type System

**TC-B-11**  
Given: Game is in progress for a full 60-second session  
When: Player counts frog colors  
Then: Green frogs are the majority — more than half of all frogs seen  
Expected: Roughly 60% of frogs are green  

**TC-B-12**  
Given: Game is in progress for a full 60-second session  
When: Player observes frog colors  
Then: Blue frogs appear — noticeably less common than green  
Expected: Approximately 25% of frogs are blue  

**TC-B-13**  
Given: Multiple full games played  
When: Player tracks frog colors across sessions  
Then: Gold frogs appear approximately once per full game  
Expected: Gold is visually rare — player may go full games without seeing one  

**TC-B-14**  
Given: Game is in progress  
When: A frog spawns  
Then: Frog sprite has a distinct color matching its type (green, blue, purple, red, or gold/yellow)  
Expected: All 5 colors are visually distinguishable from one another  

**TC-B-15**  
Given: Gator eats a purple frog  
When: Score updates  
Then: Score increases by 1,000 (not 200 — verifying type lookup is correct)  
Expected: Point value matches frog color/type, not a flat value  

---

## Section 3 — Leaderboard

**TC-B-16**  
Given: Game is played for the first time (no localStorage data)  
When: Player opens the title screen  
Then: Title screen shows "No scores yet" or equivalent placeholder in the leaderboard section  
Expected: No crash, no blank space, graceful empty state  

**TC-B-17**  
Given: Player completes a game with a score of 3,400  
When: Game over screen appears  
Then: Score of 3,400 is saved to localStorage  
Expected: Opening localStorage key `gatorrr_leaderboard` shows an entry with score 3400  

**TC-B-18**  
Given: Player has a saved score  
When: Player closes and reopens the browser tab  
Then: Title screen still shows the saved score  
Expected: Leaderboard persists across sessions — localStorage survives page reload  

**TC-B-19**  
Given: Player has 5 saved scores and plays a new game with a higher score  
When: Game ends  
Then: New score replaces the lowest of the 5 — leaderboard still shows exactly 5 entries  
Expected: Top 5 maintained, no duplicates, sorted highest to lowest  

**TC-B-20**  
Given: Player achieves a score that ranks in the top 5  
When: Game over screen is displayed  
Then: Screen indicates the player made the leaderboard (e.g., "New High Score!" or rank shown)  
Expected: Player gets feedback that their score was recorded  

**TC-B-21**  
Given: Player achieves a score that does NOT rank in the top 5  
When: Game over screen is displayed  
Then: Screen does not indicate a leaderboard ranking — no false positive  
Expected: No "New High Score" message when score doesn't qualify  

---

## Reporting

QA report must include:
- PASS or FAIL for every test case (TC-B-01 through TC-B-21)
- For each FAIL: observed behavior, expected behavior, file/method responsible
- Any additional anomalies observed

Send full report to Operator before any further development.
