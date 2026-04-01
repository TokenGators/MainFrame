# GATORRR — Cycle E Test Plan
**Cycle:** E — Core Mechanics Overhaul (Entry, Dive, Bite)
**Reference:** CYCLE_E_PRD.md
**Audience:** QA Agent
**Status:** Awaiting approval
**Last updated:** 2026-03-30

---

## Instructions for QA

Review source code and verify each test case. Mark PASS or FAIL. For failures, describe observed vs expected behavior and the responsible file/method. Report all findings to Operator before any fixes proceed.

---

## Section 1 — Gator Entry

**TC-E-01**
Given: Game starts a new level
When: Player observes the gator
Then: Gator is on the bank (col 0), river is active with logs and frogs
Expected: Gator positioned at col 0, not in the river

**TC-E-02**
Given: Gator is on the bank
When: Player presses left, up, or down arrow
Then: Gator does not move
Expected: Bank-phase blocks all movement except rightward into the river

**TC-E-03**
Given: Gator is on the bank
When: Player presses right arrow
Then: Gator enters the river (col 2), splash visual plays
Expected: Entry triggers, splash effect visible, gator now in river

**TC-E-04**
Given: Gator has entered the river
When: Player attempts to move left toward col 1 or col 0
Then: Gator cannot move past col 2
Expected: Movement blocked at river boundary — no bank or lily pad access

**TC-E-05**
Given: Gator is in the river
When: Player attempts to move right past col 16
Then: Gator cannot move past col 16
Expected: Right boundary enforced

**TC-E-06**
Given: Level completes (win or lose)
When: New level begins
Then: Gator is back on the bank at col 0, entry state reset
Expected: Full reset — gator on bank, must enter river again

---

## Section 2 — Dive Mode

**TC-E-07**
Given: Gator is on the bank (not entered)
When: Player holds Space
Then: Nothing happens — dive does not activate
Expected: Dive locked until gator enters river

**TC-E-08**
Given: Gator is in the river with full breath
When: Player holds Space
Then: Gator dives — logs and frogs fade to ~40% alpha, gator remains full color
Expected: Visual dive state active, surface objects visually faded

**TC-E-09**
Given: Gator is diving
When: A log moves into gator's tile
Then: Gator takes no damage
Expected: Log collision disabled while diving

**TC-E-10**
Given: Gator is diving
When: A swimming frog moves into gator's tile
Then: Gator does not eat the frog
Expected: Frog collision disabled while diving

**TC-E-11**
Given: Gator is diving
When: Player presses arrow keys
Then: Gator moves normally (underwater navigation works)
Expected: Movement unrestricted while diving

**TC-E-12**
Given: Gator is diving
When: Player releases Space
Then: Gator surfaces at current position, surface objects restore to full alpha
Expected: Clean surface transition

**TC-E-13**
Given: Gator surfaces on a tile occupied by a swimming frog
When: Surface collision resolves
Then: Frog is eaten, gator is now exposed to logs
Expected: Eat triggers on surface, gator is in danger from logs

**TC-E-14**
Given: Gator surfaces on a tile occupied by a log
When: Surface collision resolves
Then: Gator takes damage
Expected: Log damage triggers on surface

**TC-E-15**
Given: Gator has been diving until breath runs out
When: Breath meter reaches 0
Then: Gator automatically surfaces at current position
Expected: Forced surface, no crash, collision resolves at new position

**TC-E-16**
Given: Gator surfaces after a dive
When: Player observes the breath meter
Then: Breath meter begins refilling — not instant, takes several seconds
Expected: Gradual regen, not instant refill

**TC-E-17**
Given: Gator has partial breath
When: Player dives and surfaces repeatedly
Then: Breath depletes faster than it refills at partial dive lengths
Expected: Breath is a limited resource — spamming dive is punished

**TC-E-18**
Given: A new frog spawns while gator is diving
When: Player observes the frog
Then: New frog appears at faded alpha, consistent with other surface objects
Expected: Dive alpha applies to frogs spawned mid-dive

---

## Section 3 — Bite Mode

**TC-E-19**
Given: Level starts
When: Player observes the HUD
Then: Bite counter shows 3
Expected: BITE_START_COUNT = 3 displayed in HUD

**TC-E-20**
Given: Gator is in river with bites remaining
When: Player holds Shift + presses right arrow
Then: Bite fires to the right of gator's current position
Expected: Target tile one step right is affected

**TC-E-21**
Given: A log is in the bite target tile
When: Bite fires
Then: Log segment disappears, bite count decrements by 1, score increases by 100
Expected: Log removed, score += SCORE_LOG_BREAK

**TC-E-22**
Given: A swimming frog is in the bite target tile
When: Bite fires
Then: Frog is eaten (points by type), bite count decrements, no log bonus
Expected: Frog removed, frog type points added, bite count -1

**TC-E-23**
Given: A frog on a log is in the bite target tile
When: Bite fires
Then: Frog eaten (points by type), log removed, bite count decrements, score = frog value + 100
Expected: Both frog and log removed, combined score, bite count -1

**TC-E-24**
Given: Bite target tile is empty water
When: Bite fires
Then: Bite count decrements, nothing else happens
Expected: Wasted bite — count -1, no score change, no crash

**TC-E-25**
Given: Bite count is 0
When: Player holds Shift + presses direction
Then: Nothing happens — no bite fires, count stays at 0
Expected: Depleted bite state correctly locked

**TC-E-26**
Given: Gator is diving
When: Player holds Shift + presses direction
Then: Bite does not fire
Expected: Bite locked during dive

**TC-E-27**
Given: A log is destroyed by bite
When: New logs spawn in that column later
Then: Spawning is unaffected — new logs appear normally
Expected: Log destruction is local, not systemic

**TC-E-28**
Given: Level resets
When: New level begins
Then: Bite count resets to 3
Expected: Bites restored per level

---

## Section 4 — Stability

**TC-E-29**
Given: Player uses all three systems (entry, dive, bite) in a single session
When: Full 60-second session completes
Then: No crashes, no undefined references, all state transitions clean
Expected: Stable session with all new mechanics active

**TC-E-30**
Given: Gator dives and bites are attempted in rapid succession
When: Edge-case inputs are applied
Then: No state corruption — gator correctly ignores bites while diving
Expected: State guards work under rapid input

---

## Reporting

QA report must include:
- PASS or FAIL for every test case (TC-E-01 through TC-E-30)
- For each FAIL: observed behavior, expected behavior, file/method responsible
- Any additional anomalies observed

Send full report to Operator before any further development.
