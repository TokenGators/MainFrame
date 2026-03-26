# GATORRR — Cycle F Test Plan
**Cycle:** F — Polish & Feel
**Reference:** CYCLE_F_PRD.md
**Audience:** QA Agent
**Status:** Draft
**Last updated:** 2026-03-26

---

## Instructions for QA

Review source code and verify each test case. Mark PASS or FAIL with details on failures. Report all findings to Operator before any fixes proceed. Do NOT use git log or git diff — read source files directly.

Files to read:
- `src/ui/ScorePopup.js`
- `src/scenes/LeaderboardScene.js`
- `src/audio/SoundManager.js`
- `src/scenes/GameOverScene.js`
- `src/scenes/GameScene.js`
- `src/entities/LilyPad.js`
- `src/managers/CollisionSystem.js`
- `src/entities/Gator.js`
- `src/constants.js`
- `src/main.js`

---

## Section 1 — Score Popups

**TC-F-01**
Given: Game is in progress
When: Gator eats a green frog
Then: A "+200" text appears at the frog's position and floats upward, fading out
Expected: Popup visible at eat location, floats up ~40px, fades to invisible over ~900ms

**TC-F-02**
Given: Game is in progress
When: Gator eats a gold frog
Then: "+2000" popup appears in a gold/yellow color
Expected: Popup color matches the gold frog's tint color

**TC-F-03**
Given: Multiple frogs are eaten in quick succession
When: Two frogs are eaten within 1 second
Then: Two separate popups appear simultaneously
Expected: Popups don't interfere with each other — both visible at the same time

**TC-F-04**
Given: A popup is animating
When: The animation completes
Then: The popup text object is destroyed — no memory leak
Expected: No accumulation of invisible text objects over time

---

## Section 2 — Leaderboard Screen & Name Input

**TC-F-05**
Given: Game ends (any end state)
When: Game over screen appears and 2 seconds pass
Then: Leaderboard screen appears automatically — no player input needed
Expected: Transition from GameOverScene to LeaderboardScene is automatic after 2s

**TC-F-06**
Given: Player's score ranks in the top 5
When: Leaderboard screen appears
Then: Name entry is active — 3 character slots visible, first slot has blinking cursor
Expected: [ A ] [ A ] [ A ] display with cursor on first character

**TC-F-07**
Given: Name entry is active on first character
When: Player presses up arrow key
Then: Character increments (A → B → C...)
Expected: Letter changes on each up press, wraps Z → A

**TC-F-08**
Given: Name entry is active on first character
When: Player presses down arrow key
Then: Character decrements (A → Z)
Expected: Letter changes on each down press, wraps A → Z

**TC-F-09**
Given: Name entry is on first character, character is set to "K"
When: Player presses right arrow or Enter
Then: Cursor moves to second character slot
Expected: Second slot is now active, first slot shows "K" locked in

**TC-F-10**
Given: Name entry is on last (third) character
When: Player presses Enter
Then: Name is submitted, entry saved to leaderboard, leaderboard shown with new entry highlighted
Expected: Entry appears in correct rank position, highlighted differently from other entries

**TC-F-11**
Given: Player's score does NOT rank in top 5
When: Leaderboard screen appears
Then: Name entry is NOT shown — leaderboard displays with player's score noted separately
Expected: No input prompt, player's score shown as "YOUR SCORE: X" or similar

**TC-F-12**
Given: Leaderboard is displayed (name entry done or not top 5)
When: Player presses any key
Then: Returns to TitleScene
Expected: Title screen appears, game is ready for a new run

**TC-F-13**
Given: A leaderboard entry exists from a previous session
When: Player opens the game and plays to the leaderboard screen
Then: Previous entry still appears on the leaderboard
Expected: localStorage persists entries between page reloads

---

## Section 3 — Sound Effects

**TC-F-14**
Given: Game is in progress
When: Gator eats a frog
Then: A short ascending blip sound plays
Expected: Sound audible, not silent, not an error in console

**TC-F-15**
Given: Game is in progress
When: Gator takes damage from a log
Then: A low thud/buzz sound plays
Expected: Sound audible and distinct from eat sound

**TC-F-16**
Given: Game is in progress
When: A frog fills a lily pad
Then: A descending sting sound plays
Expected: Sound audible, feels "bad" — minor/descending

**TC-F-17**
Given: Player clears a level (eats 10 frogs)
When: LevelClearScene appears
Then: A short ascending jingle plays
Expected: Celebratory, ascending tone sequence

**TC-F-18**
Given: Game ends in defeat
When: GameOverScene appears
Then: A descending defeat sequence plays
Expected: Sounds like defeat — descending tones

**TC-F-19**
Given: Page was just loaded (no user interaction yet)
When: Player presses any key to start the game
Then: Sounds work correctly from the first event
Expected: AudioContext is resumed on first keydown — no silent first sounds

---

## Section 4 — Pad Fill Visual Feedback

**TC-F-20**
Given: Game is in progress
When: A frog fills a lily pad
Then: The screen edges briefly flash red (~300ms)
Expected: Red vignette visible, fades quickly, not distracting during play

**TC-F-21**
Given: Game is in progress
When: A frog fills a lily pad
Then: The filled pad briefly scales up and returns to normal size
Expected: Brief pulse visible on the pad itself — scale up then back down

**TC-F-22**
Given: Two pads fill in quick succession
When: Two pad-fill events fire within 500ms
Then: Both flashes trigger — no crash or visual glitch
Expected: Overlapping flashes handled gracefully

---

## Section 5 — Stability

**TC-F-23**
Given: Full game session played to completion
When: Game over → leaderboard → title → new game
Then: No crashes at any transition point
Expected: Clean flow through entire end-game sequence

**TC-F-24**
Given: Score popup is animating when game ends
When: Scene transition occurs mid-animation
Then: No crash from destroyed scene objects
Expected: Popup handles scene destruction gracefully (tween completes or is cancelled)

---

## Reporting

QA report must include:
- PASS or FAIL for every test case (TC-F-01 through TC-F-24)
- For each FAIL: observed behavior, expected behavior, responsible file/method
- Any additional anomalies observed

Post report to tracker channel:
`openclaw message send --channel discord --target channel:1485821656784961657 --message "🔍 QA Report: Gatorrr Cycle F\n\n<full report>"`

Then run: `openclaw system event --text "Done: Gatorrr Cycle F QA report ready" --mode now`
