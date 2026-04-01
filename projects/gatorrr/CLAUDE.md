# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (hot reload, port 8081)
npm start

# Production build (output to dist/)
npm run build

# Development watch build (no dev server)
npm run dev
```

No test runner is configured. Manual verification is done in-browser at `http://localhost:8081`.

## Monorepo Conventions

This project lives inside the MainFrame monorepo. Follow these rules:
- Commit format: `[type][gatorrr] description`
- Work branches: `agent/gatorrr/[task]`
- Do not modify files outside `/projects/gatorrr/`
- See `GATORRR_PRD_v2.md` for product requirements and `LOG_LAYOUT_SPEC.md` for river/log layout spec

## Architecture

**Entry point:** `src/main.js` — configures Phaser with canvas size 480×270 (displayed at 2× zoom), pixel art rendering, arcade physics, and registers all scenes.

**Scene flow:**
```
BootScene → TitleScene → GameScene → LevelClearScene → GameOverScene → LeaderboardScene
```
- `BootScene`: loads all image assets (`assets/frog.png`, `assets/gator.png`, etc.) from the `public/` directory, then starts `TitleScene`
- `GameScene`: the main game loop; receives `{ level, score }` from `LevelClearScene` to chain levels
- `LevelClearScene`: shown on win (10 frogs eaten), advances level and relaunches `GameScene`
- `GameOverScene`: shown on HP=0, pads=5, or timer=0; triggers leaderboard save

**Grid system:** The canvas is a 20×11 tile grid (TILE = 24px). Row 0 is the HUD bar.
- Col 0: left bank (gator home, safe)
- Col 1: lily pad zone
- Cols 2–16: river (15 log columns)
- Cols 17–19: right bank (frog spawn zone)

**Key constants** (`src/constants.js`): All tuning values live here — speeds, spawn rates, level configs, frog type weights, score values, power-up timings. `DEV_MODE = true` must be set to `false` before any public build.

**Entity classes** (extend `Phaser.GameObjects.Sprite`):
- `Gator`: player-controlled, grid-snapped movement with tween animation (80ms), hold-to-move after 250ms delay, 3 HP, 500ms damage cooldown
- `Frog`: AI-driven, moves right-to-left via state machine (`ON_BANK → ON_LOG → SWIMMING`); types `green/blue/red/gold` with weighted spawn rates; `FROG_SMARTNESS` (0.75) controls log-jumping intelligence
- `Log`: vertically scrolling obstacle, wraps at screen edges, belongs to one of 15 columns
- `LilyPad`: static targets at col 1; frogs reaching col 1 fill them (game over at 5 filled)
- `PowerUp`: spawns every 20s in river, restores 1 HP on collection

**Manager classes** (plain JS, owned by `GameScene`):
- `LogColumnManager`: initializes 15 columns (cols 2–16), each with 2–4 logs; log direction randomized per column; speed/count driven by `LEVEL_CONFIGS`
- `FrogSpawner`: spawns typed frogs on a random interval (1500–2250ms at level 1), max 6–8 active; maintains `frogs[]` array
- `CollisionSystem`: pure rectangle collision check (`checkRectangleCollision` normalizes for any origin); called each frame by `GameScene.update`

**Level progression:** `LEVEL_CONFIGS` array (4 entries) defines `logsPerCol`, `speedMin/Max`, `spawnMin/Max` per level. Level 4+ reuses the last config. `GameScene.init(data)` reads `data.level` to select the config.

**Scoring:** Frog points by type (200/500/1500/2000), −300 per pad filled, +1000 win bonus, +10 per remaining second. Score persists across levels via scene data. Top-5 leaderboard stored in `localStorage` under key `gatorrr_leaderboard`.

**Audio:** `SoundManager` (`src/audio/SoundManager.js`) wraps the Web Audio API directly (no Phaser audio). Audio context is resumed on first keypress to satisfy browser autoplay policy.

**Dev panel:** Toggle with backtick (`` ` ``) key in-game when `DEV_MODE = true`. Provides runtime tuning controls.

**Asset loading:** All sprites are loaded in `BootScene.preload()` from `public/assets/`. The webpack dev server serves `public/` as its static root, so asset paths in Phaser use `assets/filename.png` (not `public/assets/`).
