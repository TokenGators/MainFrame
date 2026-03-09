# Gatorrr (Frogger)

**Type:** game-2d
**Stack:** Phaser 3.90.0, Webpack 5, Babel, Vanilla JavaScript
**Status:** active
**Deploy:** Not yet deployed
**Deploy trigger:** manual (Netlify ready)

## Overview
A TokenGators-themed Frogger remake. Navigate a gator across a river using platforms (logs and turtles) while avoiding water and hazards.

## Stack decisions & rationale
- **Phaser 3.90.0:** Latest stable version with improved features
- **Babel:** Ensures ES5 compatibility for broader browser support
- **Multi-scene architecture:** Separates concerns (main game vs config)
- **Grid-based movement:** Discrete movement model suits classic Frogger gameplay

## Known issues / constraints
- TODO: Audio effects (hop, die, win)
- TODO: Sprite animations
- TODO: Mobile touch controls
- TODO: Difficulty scaling algorithm
- TODO: Leaderboard
- MVP scope is complete and playable

## Features (MVP Complete)
- Gator movement (arrow keys + WASD)
- 12+ row river configuration
- Moving platforms (logs & turtles)
- Collision detection (platform riding)
- Hazard detection (water, edges)
- Lives system (3 lives, respawn)
- Score tracking (row + time bonuses)
- 60-second countdown timer
- Level progression
- Game over / level complete screens

## Agent instructions
- Follow monorepo commit conventions: `[type][project] description`
- Work on branches: `agent/gatorrr/[task]`
- Update WORKSPACE.md when starting/finishing work
- Open PR when ready for review
- Do not modify files outside `/projects/gatorrr/`
- See GATORRR_PRD_v2.md and LOG_LAYOUT_SPEC.md for design details
