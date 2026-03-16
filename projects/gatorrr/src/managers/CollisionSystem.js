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
        // Only take damage if not in cooldown
        if (gator.damageCooldown <= 0) {
          gator.takeDamage();
          // Add cooldown to prevent spamming
          gator.damageCooldown = 500;
        }
      }
    }
  }
  
  checkGatorFrogCollision(gator, frogs, gameState) {
    for (const frog of frogs) {
      if (this.checkRectangleCollision(gator, frog)) {
        // Eat the frog
        gameState.frogsEaten++;
        
        // Remove the frog
        const index = frogs.indexOf(frog);
        if (index > -1) {
          frogs.splice(index, 1);
          frog.destroy();
        }
        
        // Check win condition
        if (gameState.frogsEaten >= 10) {
          gameState.win = true;
          gameState.gameOver = true;
        }
      }
    }
  }
  
  checkFrogLilyPadCollision(frogs, lilyPads, gameState) {
    for (const frog of frogs) {
      if (frog.gridCol <= 1) { // Near lily pads
        for (const pad of lilyPads) {
          if (!pad.filled) {
            const distance = Math.sqrt(
              Math.pow(frog.x - pad.x, 2) + 
              Math.pow(frog.y - pad.y, 2)
            );
            
            // If close enough to fill pad
            if (distance < 16) {
              pad.fill();
              gameState.padsFilled++;
              
              // Check lose condition
              if (gameState.padsFilled >= 5) {
                gameState.gameOver = true;
              }
              
              // Remove the frog after filling a pad
              const index = frogs.indexOf(frog);
              if (index > -1) {
                frogs.splice(index, 1);
                frog.destroy();
              }
              
              break; // Only fill one pad per frog
            }
          }
        }
      }
    }
  }
  
  checkRectangleCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
  }
}