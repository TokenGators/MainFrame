import { TILE, SCORE_PAD_PENALTY, FROG_TYPES } from '../constants.js';

export default class CollisionSystem {
  constructor(scene) {
    this.scene = scene;
  }

  checkAll(gator, frogs, logs, lilyPads, gameState) {
    // Check gator vs logs collision
    this.checkGatorLogCollision(gator, logs, gameState);

    // Check gator vs frog collision (eating)
    this.checkGatorFrogCollision(gator, frogs, gameState);

    // Check frog vs lily pad collision
    this.checkFrogLilyPadCollision(frogs, lilyPads, gameState);
  }

  checkGatorLogCollision(gator, logs, gameState) {
    for (const log of logs) {
      if (this.checkRectangleCollision(gator, log)) {
        gator.takeDamage();
      }
    }
  }

  checkGatorFrogCollision(gator, frogs, gameState) {
    const toRemove = [];

    for (const frog of frogs) {
      if (this.checkRectangleCollision(gator, frog)) {
        // Add points based on frog type
        const points = FROG_TYPES[frog.type].points;
        gameState.score += points;
        gameState.frogsEaten++;
        toRemove.push(frog);

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
    // All objects use setOrigin(0) so x/y is top-left
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
  }
}
