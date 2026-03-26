# GATORRR — Cycle F Product Requirements
**Cycle:** F — Polish & Feel
**Status:** Draft
**Owner:** Kthings
**Last updated:** 2026-03-26

---

## Goal

Make the game *feel* like a real arcade game. The mechanics are in place — this cycle is about the layer of juice that turns a functional prototype into something satisfying to play. Sound, visual feedback, and the full arcade leaderboard flow.

---

## F1 — Score Popups

### Player Experience
When the gator eats a frog, the point value floats up from where the frog was and fades out. This is how the player learns the value of each frog type without looking at the HUD, and it makes every eat feel satisfying.

### What the Player Sees
- A number appears at the frog's position the moment it's eaten
- The number floats upward and fades out over approximately 1 second
- The number reflects the actual points scored for that frog type (200, 500, 1000, 1500, or 2000)
- Each frog type's popup matches its color (green popup for green frog, gold for gold, etc.)
- Popups don't block gameplay or obscure the gator

### Out of Scope
- Combo multiplier display
- Popup for pad penalty (only frog eats get popups)

---

## F2 — Leaderboard Screen with Name Input

### Player Experience
When the game ends, after the stats screen, the game transitions to a dedicated leaderboard screen. If the player's score ranks in the top 5, a name entry prompt appears — 3 characters, arcade style (AAA, like Galaga or Dig Dug). The leaderboard persists between sessions.

The leaderboard looks like the Dig Dug reference: bold arcade font, rank numbers, names, scores. Clean and retro.

### What the Player Sees

**Game over → Stats (2s) → Leaderboard screen**

On the leaderboard screen:
- Title: "BEST 5" or "HIGH SCORES"
- Top 5 entries: rank, name (3 chars), score, level reached
- If the player made the top 5: name input is active — cursor blinks on one letter, up/down arrow to change it, right arrow or Enter to advance to next character, Enter on last character to confirm
- If the player didn't make the top 5: leaderboard shows as-is with their score highlighted below (or just shown as "YOUR SCORE: X")
- Press any key to return to title screen after name entry (or after viewing if not top 5)

### Name Entry Rules
- Exactly 3 characters
- Letters A–Z only (no numbers or symbols)
- Default value: "AAA"
- Arrow keys: up/down changes current letter, right confirms and moves to next, Enter on last letter submits

### Out of Scope
- Online leaderboard
- More than 3 characters
- Deleting/backspacing individual characters

---

## F3 — Sound Effects

### Player Experience
Five key sounds make the game feel alive. Generated tones — no audio files required. Short, punchy, arcade-appropriate.

### The 5 Sounds

1. **Frog eat** — short ascending blip (positive, satisfying)
2. **Log hit / damage taken** — low thud or buzz (negative, alarming)
3. **Pad filled** — descending minor chord sting (bad news)
4. **Level clear** — short ascending jingle (celebratory)
5. **Game over** — descending tone sequence (defeat)

### What the Player Hears
- Sound plays exactly when the event occurs — no delay
- Volume is appropriate — not jarring, not buried
- Sounds work without any audio files (Web Audio API synthesis)

### Out of Scope
- Background music
- Sound settings/mute toggle (can be added later)
- More than 5 sounds

---

## F4 — Pad Fill Visual Feedback

### Player Experience
When a frog fills a lily pad, it should *hurt* visually. Right now the pad changes color quietly. The player needs to feel the sting — something that says "that was bad."

### What the Player Sees
- When a pad fills: the screen edge flashes red briefly (a vignette-style flash, ~300ms)
- The filled pad pulses or enlarges briefly before settling
- The visual is distinct enough to notice in peripheral vision while focused on the gator

### Out of Scope
- Screen shake
- Animated frog "landing" on the pad

---

## Success Criteria (Player-Facing)

1. Eating any frog shows a floating score popup at the eat location
2. Popup color matches the frog type color
3. Popup floats up and fades out in approximately 1 second
4. Game over → stats → leaderboard is the full end-game flow
5. If player makes top 5, name input is active and functional
6. Name entry is 3 characters, A–Z, navigated with arrow keys
7. Leaderboard persists after page reload
8. Frog eat sound plays on every eat
9. Damage sound plays every time the gator takes a hit
10. Pad fill sound plays every time a frog reaches a lily pad
11. Level clear sound plays on level transition
12. Game over sound plays on game over screen
13. Screen edge flashes red when a pad is filled
14. Filled pad has a brief visual pop before settling
