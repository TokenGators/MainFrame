import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.audioContext = null;
  }

  preload() {
    // Load sprite assets from public folder
    this.load.image('cannon', 'player-cannon-reference.png');
    this.load.image('frog', 'enemy-gator-reference.png');
  }

  create() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    this.gameActive = true;
    this.score = 0;
    this.wave = 1;
    this.cannonLives = 3;
    this.cannonHP = 3;
    this.lastLaunchTime = 0;
    this.launchCooldown = 300;
    this.balls = [];
    this.particles = [];
    this.frogLasers = [];
    this.lastFrogLaserTime = 0;
    this.frogLaserCooldown = 1000;
    this.rainbowColors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0000ff, 0x7700ff]; // R|O|Y|G|B|P
    this.laserColorIdx = 0;

    this.createBricks();
    this.createFormation();
    this.createCannon();
    this.createWater();
    this.createUI();

    this.keys = this.input.keyboard.addKeys({
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      R: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.input.keyboard.on('keydown-SPACE', () => this.launchBall());
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  createBricks() {
    this.bricks = [];
    this.brickHealth = [];
    const BRICK_W = 15;
    const BRICK_H = 10;

    // Top wall: 2 layers of bricks (matching chunk size)
    // Grid: 0-15, 15-30, 30-45, ... across 800px width
    for (let layer = 0; layer < 2; layer++) {
      for (let col = 0; col * BRICK_W < 800; col++) {
        const x = col * BRICK_W + BRICK_W / 2;
        const y = 10 + layer * BRICK_H;
        const brick = this.add.rectangle(x, y, BRICK_W, BRICK_H, 0xff6600);
        brick.setStrokeStyle(0.5, 0xcc5500);
        brick.setDepth(9);
        brick.setActive(true);
        brick.brickIdx = this.bricks.length;
        this.bricks.push(brick);
        this.brickHealth.push(1);
      }
    }

    // Left wall: 2 layers of bricks (matching chunk size)
    for (let layer = 0; layer < 2; layer++) {
      for (let row = 0; row * BRICK_H < 600; row++) {
        const x = BRICK_W / 2 + layer * BRICK_W;
        const y = row * BRICK_H + BRICK_H / 2;
        const brick = this.add.rectangle(x, y, BRICK_W, BRICK_H, 0xff6600);
        brick.setStrokeStyle(0.5, 0xcc5500);
        brick.setDepth(9);
        brick.setActive(true);
        brick.brickIdx = this.bricks.length;
        this.bricks.push(brick);
        this.brickHealth.push(1);
      }
    }

    // Right wall: 2 layers of bricks (matching chunk size)
    for (let layer = 0; layer < 2; layer++) {
      for (let row = 0; row * BRICK_H < 600; row++) {
        const x = 800 - BRICK_W / 2 - layer * BRICK_W;
        const y = row * BRICK_H + BRICK_H / 2;
        const brick = this.add.rectangle(x, y, BRICK_W, BRICK_H, 0xff6600);
        brick.setStrokeStyle(0.5, 0xcc5500);
        brick.setDepth(9);
        brick.setActive(true);
        brick.brickIdx = this.bricks.length;
        this.bricks.push(brick);
        this.brickHealth.push(1);
      }
    }
  }

  createFormation() {
    this.frogs = [];
    this.frogPixels = [];
    this.frogChunks = []; // Track 2×3 chunks per frog (6 total)
    
    for (let i = 0; i < 24 * 6; i++) {
      this.frogPixels[i] = true; // 144 total chunks
    }

    this.formationX = 30;
    this.formationY = 120; // Start below inner brick border (brick ends at ~40px)
    this.formationDir = 1;
    this.formationSpeed = 60 + (this.wave - 1) * 15;

    for (let frogRow = 0; frogRow < 3; frogRow++) {
      for (let frogCol = 0; frogCol < 8; frogCol++) {
        const frogX = this.formationX + frogCol * 80;
        const frogY = this.formationY + frogRow * 50;
        const frogIdx = frogRow * 8 + frogCol;

        let frogSprite;
        if (this.textures.exists('frog')) {
          frogSprite = this.add.sprite(frogX, frogY, 'frog');
          frogSprite.setScale(3.33); // 9×6 → 30×20 (9*3.33 ≈ 30, 6*3.33 ≈ 20)
          frogSprite.setOrigin(0.5, 0.5);
        } else {
          frogSprite = this.add.rectangle(frogX, frogY, 30, 20, 0x22c922);
          frogSprite.setStrokeStyle(1, 0x1a7d1a);
        }
        frogSprite.setDepth(10);

        const frog = {
          idx: frogIdx,
          gridRow: frogRow,
          gridCol: frogCol,
          x: frogX,
          y: frogY,
          sprite: frogSprite,
          chunks: [], // 2×3 grid of chunks
          destroyedChunks: 0, // Track destroyed chunks
        };

        // Create 2×3 chunk grid (6 chunks per frog)
        // Each chunk is 15px wide × 10px tall (within 30×20 frog sprite)
        for (let chunkRow = 0; chunkRow < 2; chunkRow++) {
          for (let chunkCol = 0; chunkCol < 3; chunkCol++) {
            const chunkX = frogX - 15 + chunkCol * 10;
            const chunkY = frogY - 10 + chunkRow * 10;
            const chunkIdx = chunkRow * 3 + chunkCol;

            // Create invisible collision rectangle for this chunk
            const chunk = this.add.rectangle(chunkX, chunkY, 15, 10, 0x000000);
            chunk.setVisible(false); // Invisible for collision detection
            chunk.setDepth(12);
            chunk.frogIdx = frogIdx;
            chunk.chunkIdx = chunkIdx;
            chunk.globalChunkIdx = frogIdx * 6 + chunkIdx;
            chunk.destroyed = false;
            
            // Create a black overlay rectangle that will be shown when chunk is destroyed
            const damageOverlay = this.add.rectangle(chunkX, chunkY, 15, 10, 0x000000);
            damageOverlay.setVisible(false); // Hidden until chunk is destroyed
            damageOverlay.setDepth(11); // Just in front of sprite
            chunk.damageOverlay = damageOverlay;

            frog.chunks.push(chunk);
            this.frogChunks.push(chunk);
          }
        }

        this.frogs.push(frog);
      }
    }
  }

  createCannon() {
    if (this.textures.exists('cannon')) {
      this.cannon = this.add.sprite(400, 560, 'cannon');
      // Scale to ~30px width (width of 1 frog)
      this.cannon.setScale(0.015); // Very small scale for proper paddle size
      this.cannon.setOrigin(0.5, 0.5);
    } else {
      this.cannon = this.add.rectangle(400, 560, 30, 20, 0x22c922);
      this.cannon.setStrokeStyle(1, 0x1a7d1a);
    }
    this.cannonVel = 0;
  }

  createWater() {
    // Blue water layer at bottom (just below cannon, halfway up the gator)
    const waterStart = 570; // Below cannon (y=560, height~20)
    const waterHeight = 600 - waterStart; // To bottom of screen
    
    const water = this.add.rectangle(400, waterStart + waterHeight / 2, 800, waterHeight, 0x1e90ff);
    water.setDepth(1); // Behind everything except background
    water.setAlpha(0.6); // Slightly transparent for visual appeal
  }

  createUI() {
    // Position above the brick walls (which are at y=20-40)
    this.scoreText = this.add.text(10, 5, 'Score: 0/144', { font: '14px Arial', fill: '#fff' });
    this.waveText = this.add.text(650, 5, 'Wave: 1', { font: '14px Arial', fill: '#fff' });
    this.livesText = this.add.text(10, 22, 'Lives: 3 HP: 3', { font: '14px Arial', fill: '#fff' });
    this.messageText = this.add.text(400, 300, 'Press SPACE to launch', {
      font: '24px Arial',
      fill: '#fff',
      align: 'center',
    });
    this.messageText.setOrigin(0.5);
    
    // Set depth to render above bricks
    this.scoreText.setDepth(50);
    this.waveText.setDepth(50);
    this.livesText.setDepth(50);
    this.messageText.setDepth(50);
  }

  launchBall() {
    if (!this.gameActive) return;
    
    const now = Date.now();
    if (now - this.lastLaunchTime < this.launchCooldown) return;
    
    this.lastLaunchTime = now;
    this.messageText.setText('');
    this.playLaunchSound();

    let angle = 0;
    if (this.keys.LEFT.isDown) {
      angle = -45;
    } else if (this.keys.RIGHT.isDown) {
      angle = 45;
    }

    const rad = Phaser.Math.DegToRad(angle);
    const speed = 300;
    const vx = Math.sin(rad) * speed;
    const vy = -Math.cos(rad) * speed;

    const ball = this.add.circle(this.cannon.x, this.cannon.y - 30, 2, 0xffffff);
    ball.setStrokeStyle(1, 0x00ff00);
    this.physics.world.enable(ball);
    ball.body.setVelocity(vx, vy);
    this.balls.push(ball);
  }

  // Create particle effects when blocks break
  createBreakParticles(x, y) {
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 150 + Math.random() * 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      const particle = this.add.rectangle(x, y, 3, 3, 0x22c922);
      particle.setDepth(8);
      this.physics.world.enable(particle);
      particle.body.setVelocity(vx, vy);
      particle.lifespan = 600; // ms
      particle.createdAt = Date.now();
      this.particles.push(particle);
    }
  }

  // Rainbow laser with color columns
  shootFrogLaser() {
    const now = Date.now();
    if (now - this.lastFrogLaserTime < this.frogLaserCooldown) return;
    
    this.lastFrogLaserTime = now;

    const randomFrog = this.frogs[Math.floor(Math.random() * this.frogs.length)];
    
    const dx = this.cannon.x - randomFrog.x;
    const dy = this.cannon.y - randomFrog.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const speed = 200;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    // Create rainbow laser (graphics object with multiple colors)
    const laserGraphics = this.make.graphics({ x: randomFrog.x, y: randomFrog.y, add: true });
    laserGraphics.setDepth(5);
    
    // Draw 6 vertical color columns (1px wide each, 24px tall total)
    for (let i = 0; i < 6; i++) {
      laserGraphics.fillStyle(this.rainbowColors[i], 1);
      laserGraphics.fillRect(i * 2 - 6, -12, 2, 24); // 2px wide per color, 24px tall
    }

    // Wrap graphics in physics body
    this.physics.world.enable(laserGraphics);
    laserGraphics.body.setVelocity(vx, vy);
    laserGraphics.body.setSize(12, 24); // 6 colors × 2px = 12px wide
    this.frogLasers.push(laserGraphics);
  }

  update() {
    if (!this.gameActive) return;

    // Cannon movement
    this.cannonVel = 0;
    if (this.keys.LEFT.isDown) {
      this.cannonVel = -250;
    }
    if (this.keys.RIGHT.isDown) {
      this.cannonVel = 250;
    }

    this.cannon.x += (this.cannonVel * this.game.loop.delta) / 1000;
    this.cannon.x = Phaser.Math.Clamp(this.cannon.x, 20, 780);

    // Update particles (fade and destroy)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const age = Date.now() - p.createdAt;
      if (age >= p.lifespan) {
        p.destroy();
        this.particles.splice(i, 1);
      } else {
        // Fade out as it ages
        p.setAlpha(1 - (age / p.lifespan));
      }
    }

    // Formation marching
    this.formationX += (this.formationSpeed * this.formationDir * this.game.loop.delta) / 1000;

    // Frog shooting
    this.shootFrogLaser();

    // Update frog positions
    for (let frog of this.frogs) {
      frog.x = this.formationX + frog.gridCol * 80;
      frog.y = this.formationY + frog.gridRow * 50;

      // Update sprite position
      if (frog.sprite && frog.sprite.x !== undefined) {
        frog.sprite.x = frog.x;
        frog.sprite.y = frog.y;
      }

      // Update chunk positions (and damage overlays)
      for (let chunkRow = 0; chunkRow < 2; chunkRow++) {
        for (let chunkCol = 0; chunkCol < 3; chunkCol++) {
          const chunkIdx = chunkRow * 3 + chunkCol;
          const chunk = frog.chunks[chunkIdx];
          const chunkX = frog.x - 15 + chunkCol * 10;
          const chunkY = frog.y - 10 + chunkRow * 10;

          chunk.x = chunkX;
          chunk.y = chunkY;
          chunk.damageOverlay.x = chunkX;
          chunk.damageOverlay.y = chunkY;
        }
      }
    }

    // Check formation bounds
    const leftBound = this.formationX;
    const rightBound = this.formationX + 7 * 80 + 32;

    if (leftBound < 0 || rightBound > 800) {
      this.formationY += 30;
      this.formationDir *= -1;
      this.formationX = Phaser.Math.Clamp(this.formationX, 0, 800 - 7 * 80 - 32);
    }
    
    // Keep formation below inner brick border (bricks end at y=40, frogs start at y=120)
    if (this.formationY < 100) {
      this.formationY = 100;

      for (let frog of this.frogs) {
        if (frog.y > 500) {
          this.messageText.setText('GAME OVER\nFrogs Invaded!');
          this.playGameOverSound();
          this.gameActive = false;
          return;
        }
      }
    }

    // Check if frogs hit cannon
    for (let frog of this.frogs) {
      const distToCannon = Phaser.Math.Distance.Between(frog.x, frog.y, this.cannon.x, this.cannon.y);
      if (distToCannon < 40) {
        this.cannonLives--;
        this.livesText.setText(`Lives: ${this.cannonLives} HP: ${this.cannonHP}`);
        if (this.cannonLives <= 0) {
          this.messageText.setText('GAME OVER\nGator Destroyed!');
          this.playGameOverSound();
          this.gameActive = false;
          return;
        }
      }
    }

    // Process frog lasers
    for (let i = this.frogLasers.length - 1; i >= 0; i--) {
      const laser = this.frogLasers[i];
      if (!laser) continue;

      if (laser.x < 0 || laser.x > 800 || laser.y < 0 || laser.y > 600) {
        laser.destroy();
        this.frogLasers.splice(i, 1);
        continue;
      }

      const distToCannon = Phaser.Math.Distance.Between(laser.x, laser.y, this.cannon.x, this.cannon.y);
      if (distToCannon < 25) {
        laser.destroy();
        this.frogLasers.splice(i, 1);
        
        this.cannonHP--;
        if (this.cannonHP <= 0) {
          this.cannonLives--;
          this.cannonHP = 3;
          this.livesText.setText(`Lives: ${this.cannonLives} HP: ${this.cannonHP}`);
          
          if (this.cannonLives <= 0) {
            this.messageText.setText('GAME OVER\nGator Destroyed!');
            this.playGameOverSound();
            this.gameActive = false;
          }
        } else {
          this.livesText.setText(`Lives: ${this.cannonLives} HP: ${this.cannonHP}`);
        }
        continue;
      }
    }

    // Process all balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (!ball) continue;

      // Ball vs bricks (15×10 bricks)
      for (let j = this.bricks.length - 1; j >= 0; j--) {
        const brick = this.bricks[j];
        if (!brick.active) continue;

        const BRICK_W = 15;
        const BRICK_H = 10;
        const closestX = Math.max(brick.x - BRICK_W/2, Math.min(ball.x, brick.x + BRICK_W/2));
        const closestY = Math.max(brick.y - BRICK_H/2, Math.min(ball.y, brick.y + BRICK_H/2));
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const distToBall = Math.sqrt(distX * distX + distY * distY);

        if (distToBall < 2 + 20) { // ball radius 2 + brick "radius" 20px - VERY aggressive collision for side walls
          brick.setActive(false);
          brick.setVisible(false);
          this.createBreakParticles(brick.x, brick.y);
          this.playBounceSound();

          if (Math.abs(distX) > Math.abs(distY)) {
            ball.body.velocity.x *= -1;
          } else {
            ball.body.velocity.y *= -1;
          }
          
          break;
        }
      }

      // Wall bounces
      if (ball.x < 50) {
        let leftBrickActive = false;
        for (let brick of this.bricks) {
          if (brick.x < 50 && brick.active) {
            leftBrickActive = true;
            break;
          }
        }
        if (leftBrickActive && ball.body.velocity.x < 0) {
          ball.body.velocity.x = Math.abs(ball.body.velocity.x);
          this.playBounceSound();
        }
      }

      if (ball.x > 750) {
        let rightBrickActive = false;
        for (let brick of this.bricks) {
          if (brick.x > 750 && brick.active) {
            rightBrickActive = true;
            break;
          }
        }
        if (rightBrickActive && ball.body.velocity.x > 0) {
          ball.body.velocity.x = -Math.abs(ball.body.velocity.x);
          this.playBounceSound();
        }
      }

      if (ball.y < 60) {
        let topBrickActive = false;
        for (let brick of this.bricks) {
          if (brick.y < 60 && brick.active) {
            topBrickActive = true;
            break;
          }
        }
        if (topBrickActive && ball.body.velocity.y < 0) {
          ball.body.velocity.y = Math.abs(ball.body.velocity.y);
          this.playBounceSound();
        }
      }

      // Out of bounds
      if (ball.y < 0 || ball.y > 600 || ball.x < 0 || ball.x > 800) {
        ball.destroy();
        this.balls.splice(i, 1);
        continue;
      }

      // Ball vs cannon
      const distToCannon = Phaser.Math.Distance.Between(ball.x, ball.y, this.cannon.x, this.cannon.y);
      if (distToCannon < 30) {
        ball.body.velocity.y = -Math.abs(ball.body.velocity.y);
        this.playBounceSound();
      }

      // Ball vs frog chunks (2×3 grid)
      for (let frog of this.frogs) {
        for (let chunkRow = 0; chunkRow < 2; chunkRow++) {
          for (let chunkCol = 0; chunkCol < 3; chunkCol++) {
            const chunkIdx = chunkRow * 3 + chunkCol;
            const globalChunkIdx = frog.idx * 6 + chunkIdx;

            if (!this.frogPixels[globalChunkIdx]) continue;

            const chunk = frog.chunks[chunkIdx];
            const distToBall = Phaser.Math.Distance.Between(ball.x, ball.y, chunk.x, chunk.y);

            if (distToBall < 20) { // Chunk is 15×10 - VERY aggressive collision detection for all positions
              this.frogPixels[globalChunkIdx] = false;
              
              // Show black damage overlay (hides that part of frog sprite)
              chunk.damageOverlay.setVisible(true);
              
              // Create particle effect at chunk location
              this.createBreakParticles(chunk.x, chunk.y);

              this.score++;
              this.scoreText.setText(`Score: ${this.score}/144`);
              this.playBreakSound();

              if (ball.x < chunk.x) {
                ball.body.velocity.x = -Math.abs(ball.body.velocity.x);
              } else {
                ball.body.velocity.x = Math.abs(ball.body.velocity.x);
              }

              let allDead = true;
              for (let i = 0; i < 24 * 6; i++) {
                if (this.frogPixels[i]) {
                  allDead = false;
                  break;
                }
              }

              if (allDead) {
                this.wave++;
                this.waveText.setText(`Wave: ${this.wave}`);
                this.playWaveCompleteSound();
                this.resetWave();
              }

              return;
            }
          }
        }
      }
    }
  }

  resetWave() {
    for (let i = 0; i < 24 * 6; i++) {
      this.frogPixels[i] = true;
    }

    for (let brick of this.bricks) {
      brick.setVisible(true);
      brick.setActive(true);
    }

    for (let ball of this.balls) {
      ball.destroy();
    }
    this.balls = [];

    for (let particle of this.particles) {
      particle.destroy();
    }
    this.particles = [];

    for (let laser of this.frogLasers) {
      laser.destroy();
    }
    this.frogLasers = [];
    
    // Reset all frog chunks visibility and damage overlays
    for (let frog of this.frogs) {
      for (let chunk of frog.chunks) {
        chunk.setVisible(false);
        chunk.damageOverlay.setVisible(false); // Hide damage overlay for new wave
      }
    }

    this.cannonHP = 3;
    this.livesText.setText(`Lives: ${this.cannonLives} HP: ${this.cannonHP}`);

    this.formationSpeed = 60 + (this.wave - 1) * 15;
    this.frogLaserCooldown = Math.max(500, 1000 - this.wave * 100);

    this.messageText.setText(`Wave ${this.wave} - Press SPACE`);
    this.formationY = 120 + this.wave * 10; // Keep below inner brick border
  }

  playSound(frequency, duration, type = 'sine') {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
  }

  playLaunchSound() { this.playSound(200, 0.1, 'sine'); }
  playBounceSound() { this.playSound(400, 0.05, 'square'); }
  playBreakSound() { this.playSound(600, 0.07, 'sine'); }
  playWaveCompleteSound() {
    this.playSound(400, 0.15, 'sine');
    setTimeout(() => this.playSound(500, 0.15, 'sine'), 100);
    setTimeout(() => this.playSound(600, 0.2, 'sine'), 200);
  }
  playGameOverSound() {
    this.playSound(800, 0.2, 'sine');
    setTimeout(() => this.playSound(600, 0.2, 'sine'), 100);
    setTimeout(() => this.playSound(400, 0.3, 'sine'), 200);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  parent: 'phaser-game',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: GameScene,
};

const game = new Phaser.Game(config);
