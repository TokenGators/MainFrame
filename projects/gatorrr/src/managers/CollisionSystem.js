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

            if (distance < 16) {
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
  }

  checkRectangleCollision(obj1, obj2) {
    // Both objects use setOrigin(0.5) so x/y is center
    const hw1 = obj1.width / 2;
    const hh1 = obj1.height / 2;
    const hw2 = obj2.width / 2;
    const hh2 = obj2.height / 2;

    return obj1.x - hw1 < obj2.x + hw2 &&
           obj1.x + hw1 > obj2.x - hw2 &&
           obj1.y - hh1 < obj2.y + hh2 &&
           obj1.y + hh1 > obj2.y - hh2;
  }
}
