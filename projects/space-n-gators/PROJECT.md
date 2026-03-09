# Space-N-Gators

**Type:** game-2d
**Stack:** Phaser 3.55.2, Webpack 5, Vanilla JavaScript
**Status:** active
**Deploy:** Not yet deployed
**Deploy trigger:** manual (Netlify ready)

## Overview
A hybrid breakout/space invaders game where the player controls a cannon defending against waves of alien gators.

## Stack decisions & rationale
- **Phaser 3.55.2:** Mature, stable 2D framework ideal for arcade games
- **Webpack 5:** Standard build tooling for modern web games
- **Canvas 2D:** Sufficient for this game's visual style

## Known issues / constraints
- None reported — fully playable

## Features
- 3×8 frog formation (24 frogs, 144 destructible chunks)
- Ball physics with 3 launch angles (-45°, 0°, +45°)
- Defensive brick walls (180 total)
- Enemy laser fire (6-color gradient)
- Multiple balls with cooldown system
- Lives/HP system (3 HP per life × 3 lives)
- Wave progression with difficulty scaling
- Audio effects (5 SFX)
- Score tracking per wave

## Agent instructions
- Follow monorepo commit conventions: `[type][project] description`
- Work on branches: `agent/space-n-gators/[task]`
- Update WORKSPACE.md when starting/finishing work
- Open PR when ready for review
- Do not modify files outside `/projects/space-n-gators/`
