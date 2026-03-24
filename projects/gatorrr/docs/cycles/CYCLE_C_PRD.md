# GATORRR — Cycle C Product Requirements
**Cycle:** C — Health Power-Ups & Frog AI  
**Status:** Awaiting approval  
**Owner:** Kthings  
**Last updated:** 2026-03-23

---

## Goal

Make the river feel alive and strategic. Frogs cross the river the way a real creature would — using logs as stepping stones, waiting for the right moment, occasionally making a mistake that lands them in the water. Health power-ups give the player a fighting chance and a reason to move around the board.

---

## C1 — Health Power-Ups

### Player Experience
A white box with a red cross randomly appears somewhere in the play area during the game. If the gator reaches it, the gator gains 1 HP. The power-up doesn't last forever — if the player doesn't collect it quickly enough, it disappears. About three show up per full 60-second game.

Power-ups create a secondary movement decision: do I chase the health pickup, or stay in position to eat frogs and defend pads? A player with full HP might ignore it. A player at 1 HP will make risky moves to reach it.

### What the Player Sees
- A white box with a red cross symbol appearing on the board
- The power-up disappears after a few seconds if not collected
- Collecting it gives +1 HP, capped at the maximum
- Visual feedback on collect (brief flash or similar)
- Approximately 3 power-ups appear during a standard 60-second game

### Out of Scope
- Multiple HP restore per pickup
- Different types of power-ups
- Power-up that appears on a log

---

## C2 — Frog AI — Smart River Crossing

### Player Experience
Right now frogs walk in a straight line left through the water without caring whether they're on a log or not. This doesn't feel right — frogs are clever creatures that would hop across river logs to stay dry.

Frogs should visibly prefer logs. When a frog is on a log, it rides it. It waits and looks for the next log before jumping forward. When a log lines up, it hops across. Sometimes it misjudges — the timing is off, the gap is too wide, or the frog gets impatient — and it falls into the river. That's when it's vulnerable and the gator can hunt it.

The river becomes a hunting ground. The gator doesn't just stand and wait — it actively hunts frogs that fell in the water and patrols between the logs.

### What the Player Sees
- Frogs on logs ride the log's movement (moving with it vertically)
- A frog on a log pauses and looks for the next log before jumping
- When a nearby log lines up, the frog hops onto it
- Occasionally a frog jumps into the water by mistake
- Frogs in the water move slowly and visually differently from frogs on logs
- The gator can eat frogs in the water as well as frogs on logs

### Smartness Dial
Frog intelligence is tunable. At 100% smart, frogs never fall into the water — they wait indefinitely for a safe log. At 0%, frogs jump regardless of what's in front of them. At 75% (starting value), frogs make the right call most of the time but make mistakes that create hunting opportunities.

### Out of Scope
- Frogs that swim upstream or reverse direction
- Frog pathfinding across multiple columns simultaneously
- Different AI behavior per frog type

---

## Success Criteria (Player-Facing)

1. Health power-ups appear visually as a white box with a red cross
2. Approximately 3 power-ups appear per 60-second game
3. Each power-up is visible for approximately 8 seconds before disappearing
4. Gator collecting a power-up restores 1 HP, capped at maximum HP
5. Visual feedback occurs on collect
6. Power-up does not appear on a log or lily pad
7. Frogs on logs visibly move with the log (vertically)
8. Frogs wait on logs before jumping — they don't move instantly across
9. Most of the time, frogs hop log-to-log without entering the water
10. Some frogs fall into the water and can be eaten there
11. Frogs in the water move more slowly than frogs on logs
12. FROG_SMARTNESS constant controls the likelihood of smart vs. dumb jumps
13. No crashes caused by frog state transitions or power-up spawn/despawn
