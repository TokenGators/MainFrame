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
        frog.destroy();
      }
    }
  }

  checkFrogLilyPadCollision(frogs, lilyPads, gameState) {
    const toRemove = [];

    for (const frog of frogs) {
      if (frog.gridCol <= 1) { // Near lily pads
        for (const pad of lilyPads) {
          if (!pad.filled) {
            const distance = Math.sqrt(
              Math.pow(frog.x - pad.x, 2) +
              Math.pow(frog.y - pad.y, 2)
            );

            if (distance < TILE) {
              pad.fill();
              gameState.padsFilled++;

              // Check lose condition
              if (gameState.padsFilled >= 5) {
                gameState.gameOver = true;
              }

              toRemove.push(frog);
              break; // Only fill one pad per frog
            }
          }
        }
      }
    }

    // Remove frogs after iteration to avoid splice-during-iteration bug
    for (const frog of toRemove) {
      const index = frogs.indexOf(frog);
      if (index > -1) {
        frogs.splice(index, 1);
        frog.destroy();
      }
    }

    // Check for frogs that somehow reached col 0 and despawn them without scoring
    for (const frog of frogs) {
      if (frog.gridCol <= 0 && !toRemove.includes(frog)) {
        toRemove.push(frog); // despawn — landed on bank, no score
      }
    }

    // Remove any additional frogs that were marked for removal
    for (const frog of toRemove) {
      const index = frogs.indexOf(frog);
      if (index > -1 && !frog.destroyed) {
        frogs.splice(index, 1);
        frog.destroy();
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
