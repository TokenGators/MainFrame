import Phaser from 'phaser';

class FroggerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FroggerScene' });
  }

  preload() {
    // Load sprite assets from public/assets/ folder
    // Paths are relative to the devServer's static directory (public/)
    this.load.image('frog', 'assets/frog.png');
    this.load.image('gator', 'assets/gator.png');
    this.load.image('lily_pad', 'assets/lily_pad.png');
    // Note: logs remain as rectangles (no sprite needed)
  }

  create() {
    // Game state
    this.gameState = {
      hp: 3,
      frogsEaten: 0,
      padsFilled: 0,
      gameOver: false,
      gameWon: false,
      reason: '',
    };

    this.gridSize = 32;
    this.screenWidth = 800;
    this.screenHeight = 600;
    this.collisionCooldown = 0;
    this.collisionCooldownDuration = 500; // 0.5 seconds in ms

    // Game objects
    this.gator = null;
    this.logs = [];
    this.frogs = [];
    this.lilyPads = [];
    this.frogSpawnTimer = 0;
    this.frogSpawnInterval = Phaser.Math.Between(1500, 2250); // 1.5-2.25 seconds (25% increase)

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Setup restart key listener
    this.input.keyboard.on('keydown-R', () => {
      if (this.gameState.gameOver) {
        this.scene.restart();
      }
    });

    // Create game elements
    this.createBackground();
    this.createLilyPads();
    this.createLogs();
    this.createGator();
    this.createUI();
  }

  createBackground() {
    // LEFT 10% (0-80): Green left bank
    this.add.rectangle(40, 300, 80, 600, 0x228b22);
    // MIDDLE 60% (80-560): Blue river (15 columns × 32px = 480px)
    this.add.rectangle(320, 300, 480, 600, 0x1a1a3e);
    // RIGHT 10% (560-800): Green right bank
    this.add.rectangle(680, 300, 240, 600, 0x228b22);
  }

  createLilyPads() {
    // 5 lily pads in LEFT-EDGE KNOCKOUTS (x=48, just left of water at x=80)
    // Positioned in rows 8-12 (rows 9-13 in 0-indexed grid)
    const padPositions = [
      { x: 48, y: 32 * 8 + 16 },  // Row 8
      { x: 48, y: 32 * 9 + 16 },  // Row 9
      { x: 48, y: 32 * 10 + 16 }, // Row 10
      { x: 48, y: 32 * 11 + 16 }, // Row 11
      { x: 48, y: 32 * 12 + 16 }, // Row 12
    ];

    padPositions.forEach((pos) => {
      let graphic;
      if (this.textures.exists('lily_pad')) {
        graphic = this.add.sprite(pos.x, pos.y, 'lily_pad');
        graphic.setDisplaySize(32, 32);
      } else {
        graphic = this.add.circle(pos.x, pos.y, 16, 0xffcc00); // Yellow/gold fallback
      }
      
      const pad = {
        x: pos.x,
        y: pos.y,
        radius: 16,
        filled: false,
        graphics: graphic,
      };
      this.lilyPads.push(pad);
    });
  }

  createLogs() {
    // 15 VERTICAL COLUMNS of logs (moving UP/DOWN)
    // Each log is VERTICAL: 20w x height(random 2-6 units = 64-192px)
    // Tightly packed across 480px river width (80-560)
    // Column spacing: 32px (15 columns × 32px = 480px)
    // Each column: logs with random heights and variable gaps, alternating direction
    const numColumns = 15;
    const riverStartX = 80;
    const columnWidth = 32;
    const logWidth = 20;
    const heightOptions = [2, 3, 4]; // Log height in units (reduced from 5-6)
    const gapOptions = [96, 128, 160, 192, 224, 256]; // Gaps between logs (increased from 0-64)
    let logIdCounter = 0;

    const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

    for (let col = 0; col < numColumns; col++) {
      const logX = riverStartX + (col * columnWidth) + columnWidth / 2;
      const direction = col % 2 === 0 ? 1 : -1; // Alternating UP/DOWN
      const speed = (16 + Math.random() * 14) * direction; // 16-30 px/sec with direction

      // Fill column with logs and gaps
      let logY = 50;
      while (logY < this.screenHeight + 50) {
        const heightUnits = randomChoice(heightOptions);
        const logHeight = heightUnits * 32;
        
        // Create log graphic (using rectangle; sprites optional for future enhancement)
        const logGraphic = this.add.rectangle(logX, logY, logWidth, logHeight, 0x8b4513); // Brown
        
        const log = {
          id: logIdCounter++,
          x: logX,
          y: logY,
          width: logWidth,
          height: logHeight,
          speed: speed,
          graphics: logGraphic,
        };
        this.logs.push(log);

        // Add random gap and move to next position
        const gap = randomChoice(gapOptions);
        logY += logHeight + gap;
      }
    }
  }

  createGator() {
    // Gator spawns in river area (center-ish of river + bottom zone)
    const startX = 320; // Middle of river (80 + 240)
    const startY = this.screenHeight - this.gridSize - this.gridSize / 2;

    this.riverBounds = {
      left: 80,
      right: 560,
      top: 0,
      bottom: this.screenHeight,
    };

    // Create gator graphic (sprite if available, fallback to rectangle)
    let graphic;
    if (this.textures.exists('gator')) {
      graphic = this.add.sprite(startX, startY, 'gator');
      graphic.setDisplaySize(32, 32);
      graphic.setOrigin(0.5, 0.5); // Center origin for proper rotation
      graphic.rotation = Phaser.Math.DegToRad(90); // Start facing down
    } else {
      graphic = this.add.rectangle(startX, startY, 32, 32, 0x22dd22); // Green fallback
    }

    this.gator = {
      x: startX,
      y: startY,
      width: 32,
      height: 32,
      graphics: graphic,
      direction: 'down', // Track direction: 'up', 'down', 'left', 'right'
    };

    // Track which keys were pressed last frame to detect new presses
    this.keyPressedLastFrame = {
      up: false,
      down: false,
      left: false,
      right: false,
    };
  }

  createUI() {
    // HP display (top-left)
    this.hpText = this.add.text(20, 20, `HP: ${this.gameState.hp}/3`, {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
    });

    // Frogs eaten display (top-center)
    this.frogsText = this.add.text(300, 20, `Frogs: ${this.gameState.frogsEaten}/10`, {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
    });

    // Pads filled display (top-right)
    this.padsText = this.add.text(550, 20, `Pads: ${this.gameState.padsFilled}/5`, {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial',
    });

    // Game over/win text
    this.gameOverText = this.add.text(400, 250, '', {
      fontSize: '40px',
      fill: '#ffffff',
      align: 'center',
      fontFamily: 'Arial',
      wordWrap: { width: 600 },
    }).setOrigin(0.5);

    // Restart hint
    this.restartText = this.add.text(400, 350, '', {
      fontSize: '20px',
      fill: '#cccccc',
      align: 'center',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
  }

  update(time, delta) {
    // Skip update if game is over
    if (this.gameState.gameOver) {
      return;
    }

    // Update collision cooldown
    if (this.collisionCooldown > 0) {
      this.collisionCooldown -= delta;
    }

    // Handle gator movement
    this.handleGatorMovement();

    // Update logs
    this.updateLogs();

    // Update frogs
    this.updateFrogs();

    // Spawn new frogs
    this.frogSpawnTimer += delta;
    if (this.frogSpawnTimer >= this.frogSpawnInterval) {
      this.spawnFrog();
      this.frogSpawnTimer = 0;
      this.frogSpawnInterval = Phaser.Math.Between(1500, 2250); // New random interval (25% increase)
    }

    // Check collisions
    this.checkCollisions();

    // Update UI
    this.updateUI();

    // Check win/lose conditions
    this.checkGameConditions();
  }

  handleGatorMovement() {
    let moved = false;

    // Detect key press (transition from not down to down)
    const upPressed = this.cursors.up.isDown && !this.keyPressedLastFrame.up;
    const downPressed = this.cursors.down.isDown && !this.keyPressedLastFrame.down;
    const leftPressed = this.cursors.left.isDown && !this.keyPressedLastFrame.left;
    const rightPressed = this.cursors.right.isDown && !this.keyPressedLastFrame.right;

    if (upPressed) {
      const newY = Math.max(this.riverBounds.top + this.gridSize / 2, this.gator.y - this.gridSize);
      this.gator.y = newY;
      this.gator.direction = 'up';
      moved = true;
    }
    if (downPressed) {
      const newY = Math.min(this.riverBounds.bottom - this.gridSize / 2, this.gator.y + this.gridSize);
      this.gator.y = newY;
      this.gator.direction = 'down';
      moved = true;
    }
    if (leftPressed) {
      const newX = Math.max(this.riverBounds.left + this.gridSize / 2, this.gator.x - this.gridSize);
      this.gator.x = newX;
      this.gator.direction = 'left';
      moved = true;
    }
    if (rightPressed) {
      const newX = Math.min(this.riverBounds.right - this.gridSize / 2, this.gator.x + this.gridSize);
      this.gator.x = newX;
      this.gator.direction = 'right';
      moved = true;
    }

    // Update last frame state
    this.keyPressedLastFrame.up = this.cursors.up.isDown;
    this.keyPressedLastFrame.down = this.cursors.down.isDown;
    this.keyPressedLastFrame.left = this.cursors.left.isDown;
    this.keyPressedLastFrame.right = this.cursors.right.isDown;

    if (moved) {
      this.gator.graphics.x = this.gator.x;
      this.gator.graphics.y = this.gator.y;
      
      // Apply rotation based on direction (sprite rotates to face movement direction)
      const rotations = {
        'right': 0,      // 0°
        'down': 90,      // 90°
        'left': 180,     // 180°
        'up': 270,       // 270° (or -90°)
      };
      this.gator.graphics.rotation = Phaser.Math.DegToRad(rotations[this.gator.direction]);
    }
  }

  updateLogs() {
    this.logs.forEach((log) => {
      // Move UP or DOWN based on direction
      log.y += log.speed * 0.016; // ~60 FPS delta

      // Wrap around vertically
      if (log.speed > 0 && log.y > this.screenHeight + 50) {
        log.y = -50; // Respawn at top
      } else if (log.speed < 0 && log.y < -50) {
        log.y = this.screenHeight + 50; // Respawn at bottom
      }

      log.graphics.y = log.y;
    });
  }

  spawnFrog() {
    // Only spawn if we don't have too many frogs (6-10 max)
    const maxFrogs = Phaser.Math.Between(6, 10);
    if (this.frogs.length >= maxFrogs) return;

    // Spawn from RIGHT BANK (green right bank at x=680), grid-aligned
    const frogX = 560 + this.gridSize / 2; // Right edge of river, grid-aligned
    const gridY = Math.floor(Phaser.Math.Between(this.gridSize, this.screenHeight - this.gridSize) / this.gridSize) * this.gridSize;
    const frogY = gridY + this.gridSize / 2; // Center on grid

    const frog = {
      x: frogX,
      y: frogY,
      width: 24,
      height: 24,
      gridX: Math.round(frogX / this.gridSize),
      gridY: Math.round(frogY / this.gridSize),
      // Grid-based movement
      decisionTimer: 0,
      decisionInterval: 500, // 0.5 seconds in ms
      // AI state machine
      state: 'SWIMMING', // SWIMMING, ON_LOG
      onLogId: null, // Track which log it's riding
      timeOnLog: 0, // Time spent on current log
      logRideMaxTime: Phaser.Math.Between(1000, 2000), // 1-2 seconds
      graphics: this.textures.exists('frog') 
        ? this.add.sprite(frogX, frogY, 'frog').setDisplaySize(24, 24)
        : this.add.rectangle(frogX, frogY, 24, 24, 0xff0000), // Red: normal (fallback)
    };

    this.frogs.push(frog);
  }

  updateFrogs() {
    this.frogs = this.frogs.filter((frog) => {
      // Update decision timer
      frog.decisionTimer += 16; // ~60 FPS delta

      // Grid-based decision point every 0.5 seconds
      if (frog.decisionTimer >= frog.decisionInterval) {
        this.makeFrogDecision(frog);
        frog.decisionTimer = 0;
      }

      // Move based on state
      if (frog.state === 'ON_LOG') {
        // Find the log and move with it
        const log = this.logs.find(l => l.id === frog.onLogId);
        if (log) {
          // Move vertically with the log (ride it)
          frog.y = log.y;
          frog.gridY = Math.round(frog.y / this.gridSize);
        } else {
          // Log despawned, go back to swimming
          frog.state = 'SWIMMING';
          frog.onLogId = null;
          frog.timeOnLog = 0;
        }
      }
      // For SWIMMING state, movement happens via makeFrogDecision (discrete jumps)

      // Update time on log
      if (frog.state === 'ON_LOG') {
        frog.timeOnLog += 16;
        if (frog.timeOnLog >= frog.logRideMaxTime) {
          frog.state = 'SWIMMING';
          frog.onLogId = null;
          frog.timeOnLog = 0;
        }
      }

      // Snap to grid for visual alignment
      frog.x = frog.gridX * this.gridSize;
      frog.y = frog.gridY * this.gridSize;

      // Update graphics
      frog.graphics.x = frog.x;
      frog.graphics.y = frog.y;

      // Update color based on state
      this.updateFrogVisuals(frog);

      // Despawn if reached left bank (x < 100) or off-screen
      return frog.x > -50 && frog.x < this.screenWidth + 50;
    });
  }

  makeFrogDecision(frog) {
    // Grid-based decision logic: 60% jump, 40% wait
    const willJump = Math.random() < 0.6;

    if (!willJump) {
      // 40% chance: Stay in place
      return;
    }

    // 60% chance: Make a jump in one of UP, DOWN, or LEFT directions
    // Never jump RIGHT (always progressing toward lily pads on left)
    const directions = ['UP', 'DOWN', 'LEFT'];
    const chosenDirection = directions[Math.floor(Math.random() * directions.length)];

    let newGridX = frog.gridX;
    let newGridY = frog.gridY;

    // Calculate new position based on direction
    if (chosenDirection === 'UP') {
      newGridY -= 1; // y -= 32 (up in pixel space)
    } else if (chosenDirection === 'DOWN') {
      newGridY += 1; // y += 32 (down in pixel space)
    } else if (chosenDirection === 'LEFT') {
      newGridX -= 1; // x -= 32 (left toward lily pads)
    }

    // Clamp to game bounds (river area: x=80-560, full height)
    newGridX = Math.max(Math.ceil(80 / this.gridSize), Math.min(Math.floor(560 / this.gridSize), newGridX));
    newGridY = Math.max(0, Math.min(Math.floor(this.screenHeight / this.gridSize), newGridY));

    // Update frog position
    frog.gridX = newGridX;
    frog.gridY = newGridY;

    // Check for nearby logs to jump onto
    const frogPixelX = frog.gridX * this.gridSize;
    const frogPixelY = frog.gridY * this.gridSize;

    // Detect if landing on a log
    let landedOnLog = false;
    this.logs.forEach((log) => {
      const dx = Math.abs(log.x - frogPixelX);
      const dy = Math.abs(log.y - frogPixelY);
      if (dx < 32 && dy < log.height / 2 + 20) {
        if (frog.state === 'SWIMMING') {
          frog.state = 'ON_LOG';
          frog.onLogId = log.id;
          frog.timeOnLog = 0;
          landedOnLog = true;
        }
      }
    });
  }

  updateFrogVisuals(frog) {
    // Handle both sprite (tint) and rectangle (setFillStyle) visuals
    if (frog.graphics.setFillStyle) {
      // Rectangle fallback
      if (frog.state === 'SWIMMING') {
        frog.graphics.setFillStyle(0xff0000); // Red - swimming
      } else if (frog.state === 'ON_LOG') {
        frog.graphics.setFillStyle(0xff6666); // Lighter red - on log
      }
    } else if (frog.graphics.setTint) {
      // Sprite with tint
      if (frog.state === 'SWIMMING') {
        frog.graphics.setTint(0xffffff); // White tint - normal swimming
      } else if (frog.state === 'ON_LOG') {
        frog.graphics.setTint(0xdddddd); // Slightly dimmed - on log
      }
    }
  }

  checkCollisions() {
    // Check gator vs logs (only if cooldown expired)
    if (this.collisionCooldown <= 0) {
      this.logs.forEach((log) => {
        if (this.rectsOverlap(
          this.gator.x, this.gator.y, this.gator.width, this.gator.height,
          log.x, log.y, log.width, log.height
        )) {
          this.gameState.hp -= 1;
          this.collisionCooldown = this.collisionCooldownDuration;
          // Gator stays in place, no reset
        }
      });
    }

    // Check gator vs frogs (eating)
    this.frogs = this.frogs.filter((frog) => {
      if (this.rectsOverlap(
        this.gator.x, this.gator.y, this.gator.width, this.gator.height,
        frog.x, frog.y, frog.width, frog.height
      )) {
        this.gameState.frogsEaten += 1;
        frog.graphics.destroy();
        return false; // Remove frog
      }
      return true;
    });

    // Check frogs vs lily pads
    this.lilyPads.forEach((pad) => {
      if (!pad.filled) {
        this.frogs = this.frogs.filter((frog) => {
          const distance = Phaser.Math.Distance.Between(frog.x, frog.y, pad.x, pad.y);
          if (distance < pad.radius + 12) { // Collision distance
            pad.filled = true;
            pad.graphics.setFillStyle(0xdd0000); // Dark red when filled
            this.gameState.padsFilled += 1;
            frog.graphics.destroy();
            return false; // Remove frog
          }
          return true;
        });
      }
    });
  }

  rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x1 + w1 / 2 < x2 - w2 / 2 ||
             x1 - w1 / 2 > x2 + w2 / 2 ||
             y1 + h1 / 2 < y2 - h2 / 2 ||
             y1 - h1 / 2 > y2 + h2 / 2);
  }

  checkGameConditions() {
    if (this.gameState.hp <= 0) {
      this.gameState.gameOver = true;
      this.gameState.gameWon = false;
      this.gameState.reason = 'Lost all HP';
      this.gameOverText.setText('GAME OVER\nLost all HP');
      this.restartText.setText('Press R to restart');
    } else if (this.gameState.padsFilled >= 5) {
      this.gameState.gameOver = true;
      this.gameState.gameWon = false;
      this.gameState.reason = 'Frogs filled pads';
      this.gameOverText.setText('GAME OVER\nFrogs filled all pads');
      this.restartText.setText('Press R to restart');
    } else if (this.gameState.frogsEaten >= 10) {
      this.gameState.gameOver = true;
      this.gameState.gameWon = true;
      this.gameState.reason = 'Win';
      this.gameOverText.setText('YOU WIN!\nYou ate 10 frogs!');
      this.restartText.setText('Press R to restart');
    }
  }

  updateUI() {
    this.hpText.setText(`HP: ${this.gameState.hp}/3`);
    this.frogsText.setText(`Frogs: ${this.gameState.frogsEaten}/10`);
    this.padsText.setText(`Pads: ${this.gameState.padsFilled}/5`);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  render: {
    pixelArt: true,
    antialias: false,
  },
  scene: FroggerScene,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};

const game = new Phaser.Game(config);
