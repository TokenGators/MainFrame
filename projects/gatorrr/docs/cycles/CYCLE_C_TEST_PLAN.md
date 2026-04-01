# GATORRR — Cycle C Test Plan
**Cycle:** C — Health Power-Ups & Frog AI  
**Reference:** CYCLE_C_PRD.md  
**Audience:** QA Agent  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## Instructions for QA

Review source code and verify each test case. Mark PASS or FAIL with details on failures. Report all findings to Operator before any fixes proceed.

---

## Section 1 — Health Power-Ups

**TC-C-01**  
Given: Game has been running for 20 seconds  
When: Player observes the play area  
Then: A white box with a red cross has appeared somewhere on the board  
Expected: PowerUp entity visible, correct visual (white + red cross), not on a log or bank  

**TC-C-02**  
Given: A power-up is visible on the board  
When: 8 seconds pass without the player collecting it  
Then: Power-up disappears  
Expected: Entity removed cleanly — no crash, no ghost object, no lingering visual  

**TC-C-03**  
Given: Gator HP is 2 out of 3  
When: Gator moves onto a power-up  
Then: HP increases to 3, power-up disappears, brief visual feedback on gator  
Expected: HP restored by 1. HP does not exceed MAX_HP.  

**TC-C-04**  
Given: Gator HP is at maximum (3 out of 3)  
When: Gator moves onto a power-up  
Then: HP stays at 3, power-up disappears  
Expected: No HP overflow. Power-up is still consumed.  

**TC-C-05**  
Given: A full 60-second game session  
When: Player counts power-up appearances  
Then: Approximately 3 power-ups appeared during the session (2–4 is acceptable range)  
Expected: Consistent with POWERUP_SPAWN_INTERVAL of ~20 seconds  

**TC-C-06**  
Given: A power-up is currently active on the board  
When: The spawn interval fires again  
Then: A second power-up does NOT appear  
Expected: Maximum 1 power-up at a time  

**TC-C-07**  
Given: A power-up is active when the game ends  
When: Player presses R to restart  
Then: Power-up is gone — new game starts clean  
Expected: No leftover power-up from previous session  

---

## Section 2 — Frog AI

**TC-C-08**  
Given: Game is in progress  
When: Player observes a frog that just spawned on the right bank  
Then: Frog waits on the bank until a log is nearby before entering the river  
Expected: Frog does not immediately walk into open water — it waits for a log  

**TC-C-09**  
Given: A frog is ON_LOG  
When: Player observes the frog  
Then: Frog visibly moves up or down with the log's vertical movement  
Expected: Frog position tracks the log — frog rides the log  

**TC-C-10**  
Given: A frog is ON_LOG  
When: No log is present in the adjacent column to the left  
Then: Frog stays on its current log and waits  
Expected: Frog does not jump into open water (most of the time — see TC-C-12 for exception)  

**TC-C-11**  
Given: A frog is ON_LOG and a log is in the adjacent column to the left, aligned vertically  
When: Decision tick fires  
Then: Frog jumps to the aligned log  
Expected: Frog transitions to the next log — visible hop across  

**TC-C-12**  
Given: FROG_SMARTNESS = 0.75 and no log in landing zone  
When: Multiple decision ticks observed across many frogs  
Then: Approximately 25% of the time frogs jump into open water despite no log being present  
Expected: Frogs occasionally fall in the river — this is intentional and tunable  

**TC-C-13**  
Given: A frog is SWIMMING in open water  
When: Player observes the frog  
Then: Frog moves more slowly than a frog on a log  
Expected: Visibly slower movement speed. Distinct visual state (alpha or tint).  

**TC-C-14**  
Given: A frog is SWIMMING and a log passes over/near it  
When: Decision tick fires  
Then: Frog jumps onto the log (transitions to ON_LOG)  
Expected: Swimming frogs can escape the water by catching a log  

**TC-C-15**  
Given: Gator is in the same tile as a SWIMMING frog  
When: Collision is detected  
Then: Frog is eaten — score increases, frog is removed  
Expected: Gator eats swimming frogs the same as frogs on logs  

**TC-C-16**  
Given: A frog is ON_LOG and the log wraps off the screen edge  
When: Log reappears on the opposite edge  
Then: Frog transitions to SWIMMING at its current position rather than teleporting with the log  
Expected: No frog teleportation. Frog detaches and swims from where it was.  

**TC-C-17**  
Given: Multiple frogs in various states (ON_LOG, SWIMMING, ON_BANK)  
When: Player plays for a full 60-second session  
Then: No crashes related to frog state transitions  
Expected: Clean session — no undefined references, no double-destroy errors  

---

## Reporting

QA report must include:
- PASS or FAIL for every test case (TC-C-01 through TC-C-17)
- For each FAIL: observed behavior, expected behavior, responsible file/method
- Any additional anomalies

Send full report to Operator before further development.
