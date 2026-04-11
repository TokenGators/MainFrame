# GATORRR — Cycle B Product Requirements
**Cycle:** B — Score & Frog Type System  
**Status:** Awaiting approval  
**Owner:** Kthings  
**Last updated:** 2026-03-23

---

## Goal

Give the player something to chase beyond just surviving. Cycle B introduces a point economy, visual variety in the frogs, and a leaderboard so players have a reason to replay and improve.

---

## B1 — Score System

### Player Experience
Every action in the game now has a point value. Eating a frog is worth points — more for rarer frogs. Letting a frog reach a lily pad costs you points. Winning gives a bonus. Having time left on the clock gives a bonus. The score is visible in the HUD at all times and shows a full breakdown at the end of the game.

The player can see their score climb as they eat frogs and feel the sting when a frog slips through to a pad.

### Point Values
- Eat a green frog: +200
- Eat a blue frog: +500
- Eat a purple frog: +1,000
- Eat a red frog: +1,500
- Eat a gold frog: +2,000
- Frog reaches lily pad: -300
- Win bonus: +1,000
- Time remaining bonus: +10 points per second left on the clock

### What the Player Sees
- Live score in the HUD, updates immediately on each event
- Game over screen shows full breakdown: points from frogs eaten (by type if applicable), pad penalties, time bonus, win bonus, total
- Score from Cycle A (frogsEaten × 200 placeholder) is replaced by this system

### Out of Scope
- Online leaderboard
- Score multipliers

---

## B2 — Frog Type System

### Player Experience
Not all frogs are the same. Rarer frogs are worth more points and appear less frequently. The player quickly learns to prioritize rare frogs while not ignoring the common ones. Visual differentiation is simple — each frog type is a different color.

### Frog Types
| Type | Color | Points | Approx. per game |
|------|-------|--------|-----------------|
| Green (basic) | Green | 200 | Most frogs |
| Blue | Blue | 500 | ~10 per game |
| Purple | Purple | 1,000 | ~5 per game |
| Red | Red | 1,500 | ~2 per game |
| Gold | Yellow/Gold | 2,000 | ~1 per game |

Rarer frogs are worth more. Gold is the rarest — roughly one per full game.

### What the Player Sees
- Frogs appear in different colors during gameplay
- Rarer colored frogs show up less often but are visually distinct when they do
- Eating a rare frog feels rewarding — the score jump is noticeable
- No text labels needed — color alone is the signal

### Out of Scope
- Different frog behaviors per type (all frogs behave identically in Cycle B)
- Frog type displayed on the game over screen (just total score matters for now)

---

## B3 — Local Leaderboard

### Player Experience
After a good run, the player's score is saved. The title screen shows the top 5 scores so there's always something to beat. The leaderboard persists between sessions — closing and reopening the tab doesn't lose it.

### What the Player Sees
- Title screen shows "High Scores" section with top 5 entries
- Each entry shows: rank, score, level reached, date
- After a game ends, if the player's score makes the top 5, it's recorded automatically
- No input required from the player to save a score

### Out of Scope
- Named entries (no player name input)
- Online/cloud leaderboard
- More than 5 entries

---

## Success Criteria (Player-Facing)

1. HUD displays a live score that updates immediately when frogs are eaten or pads are filled
2. Eating a green frog adds 200 points
3. Eating a blue frog adds 500 points
4. Eating a purple frog adds 1,000 points
5. Eating a red frog adds 1,500 points
6. Eating a gold frog adds 2,000 points
7. A frog reaching a lily pad subtracts 300 points (score can go negative)
8. Win bonus of 1,000 points is added on victory
9. Time remaining bonus of 10pts/sec is added on victory
10. Game over screen shows full score breakdown (frogs, penalties, bonuses, total)
11. All 5 frog types appear during gameplay with visually distinct colors
12. Gold frogs are rare — roughly 1 per game
13. Green frogs are common — the majority of frogs seen are green
14. Leaderboard shows top 5 scores on the title screen
15. Player score is automatically saved if it ranks in the top 5
16. Leaderboard persists after page reload
