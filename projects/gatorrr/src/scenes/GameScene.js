import Phaser from 'phaser';
import { C, GATOR_START, MAX_HP, TILE, CANVAS_WIDTH, CANVAS_HEIGHT, LOG_SPEED_RAMP, FROG_SPAWN_RAMP, SCORE_WIN_BONUS, SCORE_TIME_BONUS_PER_SEC, POWERUP_SPAWN_INTERVAL, POWERUP_DURATION, POWERUP_HP_RESTORE, LEVEL_CONFIGS, DEV_MODE } from '../constants.js';
import Gator from '../entities/Gator.js';
import FrogSpawner from '../managers/FrogSpawner.js';
import LogColumnManager from '../managers/LogColumnManager.js';
import CollisionSystem from '../managers/CollisionSystem.js';
import LilyPad from '../entities/LilyPad.js';
import PowerUp from '../entities/PowerUp.js';
import DevPanel from '../ui/DevPanel.js';
import SoundManager from '../audio/SoundManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    // Initialize level and score from passed data
    const level = data?.level || 1;
    this.currentLevel = level;
    
    // Get level config (use last config for levels beyond the defined range)
    const configIndex = Math.min(level - 1, LEVEL_CONFIGS.length - 1);
    this.levelConfig = LEVEL_CONFIGS[configIndex];
    
    this.gameState = {
      currentLevel: level,
      hp: MAX_HP,
      frogsEaten: 0,
      padsFilled: 0,
      gameOver: false,
      win: false,
      timeLeft: 60000,
      score: data?.score !== undefined ? data.score : 0,
      winBonus: 0,
      timeBonus: 0,
      padPenaltyTotal: 0,
      frogPointsTotal: 0
    };

    this.rampStep = 0;
    this.cursors = null;
    this.gator = null;
    this.frogSpawner = null;
    this.logManager = null;
    this.collisionSystem = null;
    this.lilyPads = [];
    this.hud = null;
    this.powerUp = null;
    this.powerUpTimer = null;
    this.sound = null;
    this.padFlash = null;
    this.devPanelOpen = false;
  }

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();

    this.gator = new Gator(this, GATOR_START.col, GATOR_START.row);

    // Pass level config to managers
    this.frogSpawner = new FrogSpawner(this, this.levelConfig);
    this.logManager = new LogColumnManager(this, this.levelConfig);
    this.collisionSystem = new CollisionSystem(this);

    this.createBackground();
    this.createLilyPads();
    this.createHUD();

    // Initialize sound manager
    this.sound = new SoundManager();

    // Initialize pad flash overlay
    this.padFlash = this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      0xFF004D, 0
    ).setDepth(100).setOrigin(0.5);

    // Resume audio context on first keypress
    this.input.keyboard.once('keydown', () => {
      if (this.sound.ctx.state === 'suspended') {
        this.sound.ctx.resume();
      }
    });

    // Countdown timer — fires every second
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });

    // Start power-up spawn timer
    this.startPowerUpTimer();
    
    // Initialize dev panel if in dev mode
    if (DEV_MODE) {
      this.devPanel = new DevPanel(this);
      // Panel starts hidden — player opens it with backtick key
    }
    
    // Keyboard listener for dev panel toggle
    this.input.keyboard.on('keydown', (event) => {
      if (event.key === '`' && DEV_MODE) {
        this.devPanel?.toggle();
      }
    });
  }

  startPowerUpTimer() {
    this.powerUpTimer = this.time.delayedCall(POWERUP_SPAWN_INTERVAL, () => {
      this.spawnPowerUp();
    });
  }

  spawnPowerUp() {
    // Only spawn if no power-up exists
    if (this.powerUp) return;

    // Try up to 5 times to find a valid spawn position
    const validCols = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]; // cols 2-16
    const validRows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // rows 1-10

    let attempts = 0;
    let spawned = false;

    while (attempts < 5 && !spawned) {
      const col = validCols[Math.floor(Math.random() * validCols.length)];
      const row = validRows[Math.floor(Math.random() * validRows.length)];

      // Check if this position is occupied by a log
      const logs = this.logManager ? this.logManager.getAllLogs() : [];
      let logOccupied = false;
      for (const log of logs) {
        if (log.gridCol === col) {
          // Check vertical overlap
          const logY = log.y;
          const frogY = row * TILE;
          if (logY <= frogY + TILE && logY + log.height >= frogY - TILE) {
            logOccupied = true;
            break;
          }
        }
      }

      if (!logOccupied) {
        // Spawn the power-up
        this.powerUp = new PowerUp(this, col, row);
        spawned = true;
      }

      attempts++;
    }

    // Schedule next spawn
    this.powerUpTimer = this.time.delayedCall(POWERUP_SPAWN_INTERVAL, () => {
      this.spawnPowerUp();
    });
  }

  createBackground() {
    // Left bank (col 0): rectangle(0,0,TILE,CANVAS_HEIGHT, 0x008751) depth -1
    this.add.rectangle(0, 0, TILE, CANVAS_HEIGHT, 0x008751).setOrigin(0).setDepth(-1);
    
    // Lily zone (col 1): rectangle(TILE,0,TILE,CANVAS_HEIGHT, 0x00A860) depth -1
    this.add.rectangle(TILE, 0, TILE, CANVAS_HEIGHT, 0x00A860).setOrigin(0).setDepth(-1);
    
    // River (cols 2-16): rectangle(TILE*2,0,TILE*15,CANVAS_HEIGHT, 0x1D2B53) depth -1
    this.add.rectangle(TILE*2, 0, TILE*15, CANVAS_HEIGHT, 0x1D2B53).setOrigin(0).setDepth(-1);
    
    // Right bank (cols 17-19): rectangle(TILE*17,0,TILE*3,CANVAS_HEIGHT, 0x008751) depth -1
    this.add.rectangle(TILE*17, 0, TILE*3, CANVAS_HEIGHT, 0x008751).setOrigin(0).setDepth(-1);
    
    // HUD bar: rectangle(0,0,CANVAS_WIDTH,16, 0x000000) depth 9
    this.add.rectangle(0, 0, CANVAS_WIDTH, 16, 0x000000).setOrigin(0).setDepth(9);
  }

  createLilyPads() {
    for (const pos of this.getLilyPadPositions()) {
      const lilyPad = new LilyPad(this, pos.col, pos.row);
      this.lilyPads.push(lilyPad);
    }
  }

  getLilyPadPositions() {
    return [
      { col: 1, row: 2 },
      { col: 1, row: 4 },
      { col: 1, row: 5 },
      { col: 1, row: 7 },
      { col: 1, row: 9 },
    ];
  }

  createHUD() {
    const style = { fontSize: '8px', fill: '#ffffff', fontFamily: 'monospace' };
    this.hud = {
      levelText:  this.add.text(4,  2, 'LVL:1',     style).setDepth(10),
      hpText:     this.add.text(50, 2, 'HP:',       style).setDepth(10),
      scoreText:  this.add.text(100, 2, 'SCORE:0',  style).setDepth(10),
      frogsText:  this.add.text(160, 2, 'FROGS:X/10', style).setDepth(10),
      padsText:   this.add.text(230, 2, 'PADS:X/5',   style).setDepth(10),
      timeText:   this.add.text(300, 2, 'T:XX',     style).setDepth(10),
    };
  }

  update(time, delta) {
    if (this.gameState.gameOver) return;

    // Update gator (input + cooldowns)
    if (this.gator && this.cursors && !this.devPanelOpen) {
      this.gator.handleInput(this.cursors, delta);
      this.gator.update(delta);
    } else if (this.gator) {
      this.gator.update(delta); // still update cooldowns etc, just no input
    }

    if (this.frogSpawner) {
      this.frogSpawner.update(delta);
    }

    if (this.logManager) {
      this.logManager.update(delta);
    }

    if (this.collisionSystem && this.gator) {
      this.collisionSystem.checkAll(
        this.gator,
        this.frogSpawner ? this.frogSpawner.frogs : [],
        this.logManager ? this.logManager.getAllLogs() : [],
        this.lilyPads,
        this.gameState,
        this.powerUp
      );
        }

        // Null powerUp reference after it's been collected/destroyed
    if (this.powerUp && !this.powerUp.active) {
      this.powerUp = null;
        }

        // Keep gator hp in sync
    this.gameState.hp = this.gator ? this.gator.hp : 0;

    // Update HUD
    if (this.hud) {
      this.hud.levelText.setText(`LVL:${this.currentLevel}`);
      this.hud.hpText.setText(`HP: ${this.gameState.hp}/${MAX_HP}`);
      this.hud.scoreText.setText(`SCORE:${this.gameState.score}`);
      this.hud.frogsText.setText(`Frogs: ${this.gameState.frogsEaten}/10`);
      this.hud.padsText.setText(`Pads: ${this.gameState.padsFilled}/5`);
      this.hud.timeText.setText(`Time: ${Math.ceil(this.gameState.timeLeft / 1000)}`);
    }

    // Win / lose
    if (this.gameState.win || this.gameState.hp <= 0 || this.gameState.gameOver) {
      this.gameState.gameOver = true;
      
      // Calculate bonuses if won
      if (this.gameState.win) {
        this.gameState.winBonus = SCORE_WIN_BONUS;
        // Time bonus: seconds remaining * 10 points per second
        const timeSeconds = Math.floor(this.gameState.timeLeft / 1000);
        this.gameState.timeBonus = timeSeconds * SCORE_TIME_BONUS_PER_SEC;
        this.gameState.score += this.gameState.winBonus + this.gameState.timeBonus;
      }
      
      // If win (10 frogs eaten), go to LevelClearScene
      if (this.gameState.win) {
        this.scene.start('LevelClearScene', { level: this.currentLevel, score: this.gameState.score });
        return;
      }
      
      // Save to leaderboard before transitioning
      this.saveToLeaderboard();
      
      this.scene.start('GameOverScene', { gameState: this.gameState });
    }
  }

  saveToLeaderboard() {
    try {
      const leaderboard = JSON.parse(localStorage.getItem('gatorrr_leaderboard') || '[]');
      const newEntry = {
        score: this.gameState.score,
        level: this.gameState.currentLevel || 1,
        date: new Date().toISOString()
      };
      
      const combined = [...leaderboard, newEntry];
      combined.sort((a, b) => b.score - a.score);
      
      // Trim to top 5
      if (combined.length > 5) {
        combined.length = 5;
      }
      
      localStorage.setItem('gatorrr_leaderboard', JSON.stringify(combined));
    } catch (e) {
      // localStorage not available - silently skip
    }
  }

  updateTimer() {
    if (!this.gameState.gameOver) {
      this.gameState.timeLeft -= 1000;
      // Score increases by 1 per second as time passes (time bonus tracking)
      this.gameState.timeBonus += 1;

      if (this.gameState.timeLeft <= 0) {
        this.gameState.timeLeft = 0;
        this.gameState.gameOver = true;
        this.scene.start('GameOverScene', { gameState: this.gameState });
      }
    }
  }

  triggerPadFlash() {
    // Screen edge red flash on pad fill
    this.tweens.add({
      targets: this.padFlash,
      alpha: 0.4,
      duration: 50,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.padFlash,
          alpha: 0,
          duration: 250,
          ease: 'Power2'
        });
      }
    });
  }

  shutdown() {
    // Clean up timers and listeners to prevent leaks on restart
    this.time.removeAllEvents();
    this.input.keyboard.removeAllListeners();
    
    // Clean up dev panel
    if (this.devPanel) {
      this.devPanel.destroy();
      this.devPanel = null;
    }
    
    // Clean up power-up timer
    if (this.powerUpTimer) {
      this.powerUpTimer.remove();
      this.powerUpTimer = null;
    }
    
    // Clean up active power-up
    if (this.powerUp) {
      this.powerUp.destroy();
      this.powerUp = null;
    }
  }

  // Entity management helpers
  removeFrog(frog) {
    if (this.frogSpawner) {
      this.frogSpawner.removeFrog(frog);
    }
  }

  getFrogs() {
    return this.frogSpawner ? this.frogSpawner.frogs : [];
  }

  getLogs() {
    return this.logManager ? this.logManager.getAllLogs() : [];
  }

  getLilyPads() {
    return this.lilyPads;
  }

  applyDifficultyRamp() {
    this.rampStep++;
    // Speed up logs
    if (this.logManager) {
      for (const log of this.logManager.getAllLogs()) {
        const sign = log.speed > 0 ? 1 : -1;
        log.speed += sign * LOG_SPEED_RAMP;
      }
    }
    // Speed up frog spawns
    if (this.frogSpawner) {
      this.frogSpawner.spawnInterval = Math.max(500, this.frogSpawner.spawnInterval - FROG_SPAWN_RAMP);
    }
  }
}
