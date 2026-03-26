# GATORRR — Cycle E Technical Specification
**Cycle:** E — Dev Tuning Panel
**Reference:** CYCLE_E_PRD.md
**Audience:** Murphy (coder)
**Status:** Approved
**Last updated:** 2026-03-25

---

## Overview

A dev-only HTML overlay that lets the developer adjust five gameplay parameters in real time during a play session. Gated by `DEV_MODE`. Uses a plain DOM overlay (not Phaser UI) positioned over the canvas.

---

## Constants (src/constants.js)

Add:
```js
export const DEV_MODE = true; // Set to false before any public build
```

---

## E1 — DevPanel Class

### New file: `src/ui/DevPanel.js`

```
DevPanel
  - constructor(scene)         — creates DOM overlay, binds keyboard toggle
  - show()                     — makes panel visible, pauses game
  - hide()                     — removes panel, resumes game
  - destroy()                  — cleans up DOM element and listeners
  - applyValues()              — reads all sliders and applies to scene
```

### DOM Structure

Create a `<div>` element via `document.createElement('div')`. Style it:
- Position: `fixed`, top-right corner (top: 10px, right: 10px)
- Background: `rgba(0,0,0,0.85)`
- Color: white, font: monospace 12px
- Padding: 12px, border-radius: 6px
- Width: 260px
- z-index: 9999

Append to `document.body`.

### The 5 Sliders

Render each as: `<label>Name</label><input type="range" ...><span>value</span>`

| Label | id | min | max | step | default |
|---|---|---|---|---|---|
| Logs/column | `dev-logs` | 1 | 5 | 1 | current `logsPerCol` from level config |
| Log speed | `dev-logspeed` | 0.25 | 3 | 0.25 | 1.0 |
| Max frogs | `dev-frogs` | 1 | 15 | 1 | current `maxFrogs` from FrogSpawner |
| Frog interval (ms) | `dev-froginterval` | 200 | 2000 | 50 | 500 |
| Frog smartness | `dev-smartness` | 0 | 1 | 0.05 | 0.75 |

Each slider should display its current value next to it and update the display live as the user drags.

### Keyboard Toggle

In GameScene, add a keyboard listener for the backtick key (keyCode 192, or key `\``):
```js
this.input.keyboard.on('keydown', (event) => {
  if (event.key === '`' && DEV_MODE) {
    this.devPanel.toggle();
  }
});
```

### Pause/Resume

- `show()`: call `this.scene.scene.pause()` (pauses the Phaser scene)
- `hide()`: call `this.scene.scene.resume()`

---

## E2 — Applying Slider Values

### Log speed multiplier
On change: iterate `scene.logManager.getAllLogs()`, multiply each log's `speed` by the new multiplier divided by the old multiplier. Store the previous multiplier value to calculate the delta.

### Logs per column
On change: call `scene.logManager.reinitialize(newLogsPerCol)`. Add a `reinitialize(count)` method to `LogColumnManager` that:
- Destroys all existing log objects (`log.destroy()`)
- Clears `this.logs` and `this.columns`
- Re-runs the constructor initialization with the new `logsPerCol` value

### Max frogs
On change: write directly to `scene.frogSpawner.maxFrogs`.

### Frog decision interval
On change: write to a `scene.frogDecisionInterval` property (add this to GameScene). FrogSpawner should read from `scene.frogDecisionInterval` (if set) instead of the constant when updating frogs. Alternatively, write to a module-level override variable in constants — Murphy's choice, but document it clearly.

### Frog smartness
On change: write to a `scene.frogSmartness` property. Frog's `decideOnLog()` should read from `this.scene.frogSmartness` if it exists, else fall back to the `FROG_SMARTNESS` constant.

---

## E3 — GameScene Integration

- In `create()`: if `DEV_MODE`, instantiate `this.devPanel = new DevPanel(this)`
- In `shutdown()`: if `this.devPanel`, call `this.devPanel.destroy()`
- On level transition or restart: `devPanel.destroy()` then re-create fresh (values reset to level defaults)

---

## Deliverables

1. `src/ui/DevPanel.js` — new file
2. `src/constants.js` — `DEV_MODE` constant added
3. `src/scenes/GameScene.js` — panel instantiation, keyboard toggle, frogDecisionInterval/frogSmartness overrides
4. `src/managers/LogColumnManager.js` — `reinitialize(count)` method
5. `src/managers/FrogSpawner.js` — reads `scene.frogDecisionInterval` override if present
6. `src/entities/Frog.js` — reads `scene.frogSmartness` override if present
7. Clean build, commit: `feat[gatorrr] cycle E - dev tuning panel`
8. Push to remote

When complete:
`openclaw message send --channel discord --target channel:1485821656784961657 --message "✅ Murphy done: Gatorrr Cycle E — dev tuning panel committed and pushed"`
Then: `openclaw system event --text "Done: Gatorrr Cycle E complete, ready for QA" --mode now`
