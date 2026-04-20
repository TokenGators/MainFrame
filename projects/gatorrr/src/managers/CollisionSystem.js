import { TILE, SCORE_PAD_PENALTY, FROG_TYPES, POPUP_DURATION, DIVE_SURFACE_ALPHA } from '../constants.js';
import ScorePopup from '../ui/ScorePopup.js';

export default class CollisionSystem {
  constructor(scene) {
    this.scene = scene;
  }

  checkAll(gator, frogs, logs, lilyPads, gameState, powerUp = null) {
    // Check gator vs logs collision
    this.checkGatorLogCollision(gator, logs, gameState);

    // Check gator vs frog collision (eating)
    this.checkGatorFrogCollision(gator, frogs, gameState);

    // Check frog vs lily pad collision
    this.checkFrogLilyPadCollision(frogs, lilyPads, gameState);

    // Check gator vs powerUp collision
    this.checkGatorPowerUpCollision(gator, powerUp, gameState);
  }

  checkGatorLogCollision(gator, logs, gameState) {
    // Cycle E2: Skip collision if diving
    if (gator.isDiving) return;

    for (const log of logs) {
      if (this.checkRectangleCollision(gator, log)) {
        gator.takeDamage();
      }
    }
  }

  checkGatorFrogCollision(gator, frogs, gameState) {
    // Cycle E2: Skip collision if diving
    if (gator.isDiving) return;

    const toRemove = [];

    for (const frog of frogs) {
      if (this.checkRectangleCollision(gator, frog)) {
        // Add points based on frog type
        const points = FROG_TYPES[frog.type].points;
        gameState.score += points;
        gameState.frogsEaten++;
        toRemove.push(frog);

        // Spawn score popup
        const popup = new ScorePopup(
          this.scene,
          frog.x + TILE / 2,
          frog.y,
          points,
          FROG_TYPES[frog.type].color
        );

        // Play eat sound
        this.scene.soundMgr?.play?.('eat');

        // Check win condition
        if (gameState.frogsEaten >= 10) {
          gameState.win = true;
          gameState.gameOver = true;
        }
      }
    }

    // Remove frogs after iteration to avoid splice-during-iteration bug
    for (const frog of toRemove) {
      const index = frogs.indexOf(frog);
      if (index > -1) {
        frogs.splice(index, 1);
        if (frog.active) frog.destroy(); // guard against already-destroyed
      }
    }
  }

  checkFrogLilyPadCollision(frogs, lilyPads, gameState) {
    const toRemove = [];

    for (const frog of frogs) {
      if (toRemove.includes(frog)) continue; // already marked

      // Despawn frogs that reached left bank (col 0) without scoring
      if (frog.gridCol <= 0) {
        toRemove.push(frog);
        continue;
      }

      // Check lily pad collision at col 1
      if (frog.gridCol === 1) {
        for (const pad of lilyPads) {
          if (!pad.filled) {
            const distance = Math.sqrt(
              Math.pow(frog.x - pad.x, 2) +
              Math.pow(frog.y - pad.y, 2)
            );
            if (distance < TILE) {
              pad.fill();
              gameState.padsFilled++;
              // Apply pad penalty
              gameState.score -= SCORE_PAD_PENALTY;
              gameState.padPenaltyTotal += SCORE_PAD_PENALTY;

              // Play pad fill sound
              this.scene.soundMgr?.play?.('padFill');

              // Trigger pad flash effect (if available on scene)
              if (this.scene.triggerPadFlash) {
                this.scene.triggerPadFlash();
              }

              if (gameState.padsFilled >= 5) {
                gameState.gameOver = true;
              }
              toRemove.push(frog);
              break;
            }
          }
        }
      }
    }

    // Single removal pass — safe, no double-destroy
    for (const frog of toRemove) {
      const index = frogs.indexOf(frog);
      if (index > -1) {
        frogs.splice(index, 1);
        if (frog.active) frog.destroy(); // guard against already-destroyed
      }
    }
  }

  checkRectangleCollision(obj1, obj2) {
    // Normalize to top-left bounds regardless of origin
    // Works for any origin combination: gator (0.5), logs/frogs/pads (0), etc.
    const left1 = obj1.x - obj1.width * obj1.originX;
    const top1   = obj1.y - obj1.height * obj1.originY;
    const left2 = obj2.x - obj2.width * obj2.originX;
    const top2   = obj2.y - obj2.height * obj2.originY;

    return left1 < left2 + obj2.width &&
           left1 + obj1.width > left2 &&
           top1 < top2 + obj2.height &&
           top1 + obj1.height > top2;
  }

  checkGatorPowerUpCollision(gator, powerUp, gameState) {
    if (!powerUp || !powerUp.active) return;

    // Use physics body bounds for accurate collision (Container width is unreliable)
    const gb = gator.body;
    const pb = powerUp.body;
    if (!gb || !pb) return;

    if (gb.x < pb.x + pb.width &&
        gb.x + gb.width > pb.x &&
        gb.y < pb.y + pb.height &&
        gb.y + gb.height > pb.y) {
      powerUp.collect(gator);
    }
  }
}
