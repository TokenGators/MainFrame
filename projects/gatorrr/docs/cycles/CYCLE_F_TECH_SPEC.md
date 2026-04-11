# GATORRR — Cycle F Technical Specification
**Cycle:** F — Polish & Feel
**Reference:** CYCLE_F_PRD.md
**Audience:** Murphy (coder)
**Status:** Draft
**Last updated:** 2026-03-26

---

## F1 — Score Popups

### New file: `src/ui/ScorePopup.js`

A Phaser `Text` object that spawns at a given position, floats upward, and fades out.

```js
export default class ScorePopup {
  constructor(scene, x, y, points, color) {
    // Create text at (x, y)
    // Color: use hex string derived from FROG_TYPES[type].tint
    // Float up (tween y -= 40) and fade out (alpha 1 → 0) over 900ms
    // Destroy on tween complete
  }
}
```

### Constants (src/constants.js)
```
POPUP_FLOAT_DISTANCE = 40   // px upward
POPUP_DURATION = 900         // ms
```

### Integration
In `CollisionSystem.checkGatorFrogCollision()`:
- After confirming the eat and adding to score, instantiate:
  ```js
  new ScorePopup(this.scene, frog.x + TILE/2, frog.y, points, FROG_TYPES[frog.type].tint)
  ```
- Points value comes from `FROG_TYPES[frog.type].points`
- Color comes from `FROG_TYPES[frog.type].tint` (convert hex int to CSS color string: `'#' + tint.toString(16).padStart(6, '0')`)

---

## F2 — Leaderboard Screen with Name Input

### New file: `src/scenes/LeaderboardScene.js`

**Scene flow:** GameOverScene → (after 2s) → LeaderboardScene

### LeaderboardScene behavior
1. On `init(data)`: receive `{ score, level }` from GameOverScene
2. Read leaderboard from localStorage (`gatorrr_leaderboard`)
3. Determine if score ranks in top 5 (compare against existing entries)
4. If top 5: show name entry UI, then save entry on confirm
5. If not top 5: show leaderboard, highlight "YOUR SCORE: X" below, any key returns to TitleScene

### Name Entry UI
- Display 3 character slots (e.g., `[ A ] [ A ] [ A ]`)
- Active slot has a blinking cursor (Phaser tween alpha)
- Input:
  - Up arrow: increment letter (A→B→...→Z→A)
  - Down arrow: decrement letter (A→Z)
  - Right arrow OR Enter (not last char): advance to next slot
  - Enter on last slot: submit name
- On submit: save `{ name, score, level, date: new Date().toISOString() }` to leaderboard
- After save: show leaderboard with new entry highlighted, "Press any key to continue"

### Leaderboard Display
```
HIGH SCORES

  #1   AAA   999999   LVL 4
  #2   BBB   888888   LVL 3
  ...
```
- Top 5 entries
- If fewer than 5: show "---" placeholders
- New entry highlighted (different color or flashing)

### GameOverScene Update
- Remove the existing "press R to restart" direct-to-GameScene behavior
- After 2 seconds, transition to LeaderboardScene: `this.scene.start('LeaderboardScene', { score: gameState.score, level: gameState.currentLevel })`

### main.js Update
- Import and register LeaderboardScene in the scene array

---

## F3 — Sound Effects

### No audio files — Web Audio API synthesis only

### New file: `src/audio/SoundManager.js`

```js
export default class SoundManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  play(type) {
    switch(type) {
      case 'eat':       this._playEat(); break;
      case 'damage':    this._playDamage(); break;
      case 'padFill':   this._playPadFill(); break;
      case 'levelClear': this._playLevelClear(); break;
      case 'gameOver':  this._playGameOver(); break;
    }
  }

  // Each _play method creates an OscillatorNode, sets frequency/type,
  // connects to destination, starts, and stops after short duration
}
```

### Sound Designs

| Sound | Oscillator type | Frequency | Duration | Notes |
|-------|----------------|-----------|----------|-------|
| eat | square | 880Hz → 1200Hz (ramp up) | 120ms | Ascending blip |
| damage | sawtooth | 200Hz → 80Hz (ramp down) | 200ms | Low thud/buzz |
| padFill | triangle | 440Hz → 220Hz (ramp down) | 400ms | Minor descending sting |
| levelClear | square | 523Hz, 659Hz, 784Hz (sequence) | 150ms each | Ascending 3-note jingle |
| gameOver | sine | 440Hz → 220Hz → 110Hz (sequence) | 300ms each | Descending defeat |

### Integration (GameScene)
Instantiate once in GameScene: `this.sound = new SoundManager()`

Fire sounds at:
- Eat: in `CollisionSystem.checkGatorFrogCollision` → `scene.sound.play('eat')`
- Damage: in `Gator.takeDamage()` → `this.scene.sound.play('damage')`
- Pad fill: in `CollisionSystem.checkFrogLilyPadCollision` → `scene.sound.play('padFill')`
- Level clear: in `LevelClearScene.create()` → `scene.sound.play('levelClear')`
- Game over: in `GameOverScene.create()` → `scene.sound.play('gameOver')`

Pass `scene.sound` reference to CollisionSystem at construction time (or access via `this.scene.sound`).

### Browser AudioContext Note
AudioContext requires a user gesture to start. Resume context on first user input:
```js
this.input.keyboard.once('keydown', () => {
  if (this.sound.ctx.state === 'suspended') this.sound.ctx.resume();
});
```
Add this to `GameScene.create()`.

---

## F4 — Pad Fill Visual Feedback

### Screen edge flash
In `GameScene`, create a full-screen red rectangle at depth 100, alpha 0, named `this.padFlash`:
```js
this.padFlash = this.add.rectangle(
  CANVAS_WIDTH/2, CANVAS_HEIGHT/2,
  CANVAS_WIDTH, CANVAS_HEIGHT,
  0xFF004D, 0
).setDepth(100).setOrigin(0.5);
```

When a pad fills, call `this.scene.triggerPadFlash()`:
```js
triggerPadFlash() {
  this.tweens.add({
    targets: this.padFlash,
    alpha: { from: 0.4, to: 0 },
    duration: 300,
    ease: 'Power2'
  });
}
```

### Pad pulse
In `LilyPad.fill()`, after changing color, add a brief scale pulse:
```js
this.scene.tweens.add({
  targets: this,
  scaleX: 1.4,
  scaleY: 1.4,
  duration: 100,
  yoyo: true,
  ease: 'Power2'
});
```

### Integration
CollisionSystem calls `scene.triggerPadFlash()` and `pad.fill()` when pad is filled — `fill()` handles its own pulse, scene handles the screen flash.

---

## Deliverables

1. `src/ui/ScorePopup.js` — new file
2. `src/scenes/LeaderboardScene.js` — new file
3. `src/audio/SoundManager.js` — new file
4. `src/scenes/GameOverScene.js` — updated transition to LeaderboardScene
5. `src/scenes/LevelClearScene.js` — add level clear sound
6. `src/scenes/GameScene.js` — SoundManager, padFlash, triggerPadFlash(), AudioContext resume
7. `src/entities/LilyPad.js` — pulse tween in fill()
8. `src/managers/CollisionSystem.js` — score popup, padFlash trigger, sound calls
9. `src/entities/Gator.js` — damage sound in takeDamage()
10. `src/constants.js` — POPUP_FLOAT_DISTANCE, POPUP_DURATION
11. `main.js` — register LeaderboardScene
12. Clean build, commit: `feat[gatorrr] cycle F - score popups, leaderboard, sounds, pad feedback`
13. Push to remote

When complete:
`openclaw message send --channel discord --target channel:1485821656784961657 --message "✅ Murphy done: Gatorrr Cycle F — polish and feel committed and pushed"`
Then: `openclaw system event --text "Done: Gatorrr Cycle F complete, ready for QA" --mode now`
