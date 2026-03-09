class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // Game state
        this.score = 0;
        this.lives = GAME_CONFIG.INITIAL_LIVES;
        this.currentLevel = GAME_CONFIG.INITIAL_LEVEL;
        this.timeRemaining = GAME_CONFIG.STARTING_TIME;
        this.levelComplete = false;
        this.gameOver = false;
        this.gatorOnPlatform = null;
        this.platformVelocity = 0;

        // Set up background
        this.cameras.main.setBackgroundColor(GAME_CONFIG.COLORS.BACKGROUND);

        // Create groups for game objects
        this.platforms = this.add.group();
        this.hazards = this.add.group();

        // Create the gator (player)
        this.createGator();

        // Create level based on layout
        this.createLevel();

        // Set up input
        this.setupInput();

        // Set up timer
        this.setupTimer();

        // UI event emitter for updates
        this.events.emit('updateUI', {
            score: this.score,
            lives: this.lives,
            time: this.timeRemaining,
        });
    }

    createGator() {
        const startX = GAME_CONFIG.GATOR.START_COL * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
        const startY = GAME_CONFIG.GATOR.START_ROW * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

        // Create a simple rectangle for the gator
        this.gator = this.add.rectangle(startX, startY, 24, 24, Phaser.Display.Color.HexStringToColor(GAME_CONFIG.COLORS.GATOR).color);
        this.gator.setStrokeStyle(2, 0xFFFF00);

        // Store grid position
        this.gator.gridCol = GAME_CONFIG.GATOR.START_COL;
        this.gator.gridRow = GAME_CONFIG.GATOR.START_ROW;
        this.gator.isMoving = false;

        // Store initial position for reset
        this.gatorStartX = startX;
        this.gatorStartY = startY;
    }

    createLevel() {
        // Clear existing platforms and hazards
        this.platforms.clear(true, true);
        this.hazards.clear(true, true);

        const layout = GAME_CONFIG.LEVEL_LAYOUTS[this.currentLevel];

        layout.forEach((rowConfig, rowIndex) => {
            const rowY = rowIndex * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
            const actualRow = 14 - rowIndex; // Convert to actual row number

            if (rowConfig.type === 'safe' || rowConfig.type === 'home') {
                // Safe zones - create visual indicator
                const color = rowConfig.type === 'home' ? GAME_CONFIG.COLORS.HOME : GAME_CONFIG.COLORS.SAFE;
                const tint = rowConfig.type === 'home' ? 0xFFD700 : 0x4CAF50;
                
                for (let col = 0; col < GAME_CONFIG.GRID_WIDTH; col++) {
                    const x = col * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
                    const rect = this.add.rectangle(x, rowY, GAME_CONFIG.TILE_SIZE - 2, GAME_CONFIG.TILE_SIZE - 2, tint);
                    rect.setAlpha(0.3);
                    rect.isHome = rowConfig.type === 'home';
                    rect.isSafe = true;
                    this.platforms.add(rect);
                }
            } else if (rowConfig.type === 'logs') {
                this.createPlatforms('logs', rowY, actualRow, rowConfig);
            } else if (rowConfig.type === 'turtles') {
                this.createPlatforms('turtles', rowY, actualRow, rowConfig);
            } else if (rowConfig.type === 'crocodiles') {
                this.createHazards('crocodiles', rowY, actualRow, rowConfig);
            }
        });
    }

    createPlatforms(type, rowY, rowIndex, config) {
        const platformConfig = GAME_CONFIG.PLATFORMS[type.toUpperCase()];
        const speed = config.speed;
        const direction = config.direction;
        const platformCount = 3 + Math.floor(this.currentLevel * 0.5);

        // Determine spacing
        const spacing = GAME_CONFIG.WIDTH / platformCount;

        for (let i = 0; i < platformCount; i++) {
            const x = (i * spacing) + platformConfig.WIDTH / 2;
            const color = platformConfig.COLORS[i % platformConfig.COLORS.length];
            
            const platform = this.add.rectangle(
                x, rowY,
                platformConfig.WIDTH, platformConfig.HEIGHT,
                Phaser.Display.Color.HexStringToColor(color).color
            );

            platform.setStrokeStyle(1, 0xFFFFFF);
            platform.setOrigin(0.5, 0.5);

            // Platform properties
            platform.isPlatform = true;
            platform.platformType = type;
            platform.speed = speed * direction;
            platform.rowIndex = rowIndex;
            platform.minX = -platformConfig.WIDTH;
            platform.maxX = GAME_CONFIG.WIDTH + platformConfig.WIDTH;
            platform.originalX = x;

            this.platforms.add(platform);
        }
    }

    createHazards(type, rowY, rowIndex, config) {
        const hazardConfig = GAME_CONFIG.PLATFORMS[type.toUpperCase()];
        const speed = config.speed;
        const direction = config.direction;
        const hazardCount = 2 + Math.floor(this.currentLevel * 0.3);
        const spacing = GAME_CONFIG.WIDTH / hazardCount;

        for (let i = 0; i < hazardCount; i++) {
            const x = (i * spacing) + hazardConfig.WIDTH / 2;
            const color = hazardConfig.COLORS[i % hazardConfig.COLORS.length];
            
            const hazard = this.add.rectangle(
                x, rowY,
                hazardConfig.WIDTH, hazardConfig.HEIGHT,
                Phaser.Display.Color.HexStringToColor(color).color
            );

            hazard.setStrokeStyle(2, 0xFF0000);
            hazard.setOrigin(0.5, 0.5);

            // Hazard properties
            hazard.isHazard = true;
            hazard.hazardType = type;
            hazard.speed = speed * direction;
            hazard.rowIndex = rowIndex;
            hazard.minX = -hazardConfig.WIDTH;
            hazard.maxX = GAME_CONFIG.WIDTH + hazardConfig.WIDTH;

            this.hazards.add(hazard);
        }
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');

        // Prevent key repeat
        this.lastMoveTime = 0;
        this.moveCooldown = 100; // ms between moves
    }

    setupTimer() {
        this.timerEvent = this.time.addTimer({
            delay: 1000,
            callback: () => {
                if (!this.gameOver && !this.levelComplete) {
                    this.timeRemaining--;
                    this.events.emit('updateUI', {
                        score: this.score,
                        lives: this.lives,
                        time: this.timeRemaining,
                    });

                    if (this.timeRemaining <= 0) {
                        this.loseLife();
                    }
                }
            },
            loop: true,
        });
    }

    update(time, delta) {
        if (this.gameOver || this.levelComplete) return;

        // Handle player input
        this.handleInput(time);

        // Update platform positions
        this.platforms.children.entries.forEach(platform => {
            if (platform.isPlatform && !platform.isSafe) {
                this.movePlatform(platform);

                // If gator is on this platform, move gator with it
                if (this.gatorOnPlatform === platform) {
                    this.gator.x += platform.speed * delta / 1000;
                }
            }
        });

        // Update hazard positions
        this.hazards.children.entries.forEach(hazard => {
            this.movePlatform(hazard);
        });

        // Check collisions with platforms (for riding)
        this.checkPlatformCollisions();

        // Check collisions with hazards
        this.checkHazardCollisions();

        // Check if gator fell in water
        this.checkWaterCollision();

        // Check if gator reached home
        this.checkHomeReached();

        // Boundary check (gator fell off sides)
        if (this.gator.x < 0 || this.gator.x >= GAME_CONFIG.WIDTH) {
            this.loseLife();
        }
    }

    handleInput(time) {
        // Debounce movement
        if (time - this.lastMoveTime < this.moveCooldown) return;

        let moved = false;
        const newCol = this.gator.gridCol;
        const newRow = this.gator.gridRow;

        if (this.cursors.up.isDown || this.keys.W.isDown) {
            if (newRow > 0) {
                this.gator.gridRow--;
                moved = true;
            }
        } else if (this.cursors.down.isDown || this.keys.S.isDown) {
            if (newRow < GAME_CONFIG.GRID_HEIGHT - 1) {
                this.gator.gridRow++;
                moved = true;
            }
        } else if (this.cursors.left.isDown || this.keys.A.isDown) {
            if (newCol > 0) {
                this.gator.gridCol--;
                moved = true;
            }
        } else if (this.cursors.right.isDown || this.keys.D.isDown) {
            if (newCol < GAME_CONFIG.GRID_WIDTH - 1) {
                this.gator.gridCol++;
                moved = true;
            }
        }

        if (moved) {
            this.lastMoveTime = time;
            this.gator.x = this.gator.gridCol * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
            this.gator.y = this.gator.gridRow * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

            // Award points for moving forward
            if (this.gator.gridRow < GAME_CONFIG.GATOR.START_ROW) {
                this.score += GAME_CONFIG.POINTS_PER_ROW;
                this.events.emit('updateUI', {
                    score: this.score,
                    lives: this.lives,
                    time: this.timeRemaining,
                });
            }
        }
    }

    movePlatform(platform) {
        platform.x += platform.speed * (1 / 60); // Assuming ~60 FPS

        // Wrap around screen
        if (platform.x > platform.maxX) {
            platform.x = platform.minX;
        } else if (platform.x < platform.minX) {
            platform.x = platform.maxX;
        }
    }

    checkPlatformCollisions() {
        this.gatorOnPlatform = null;

        this.platforms.children.entries.forEach(platform => {
            if (!platform.isPlatform || platform.isSafe) return;

            // Check if gator is on this platform
            const distance = Phaser.Math.Distance.Between(
                this.gator.x, this.gator.y,
                platform.x, platform.y
            );

            const collision = Phaser.Geom.Rectangle.Overlaps(
                this.gator.getBounds(),
                platform.getBounds()
            );

            if (collision) {
                // Gator is riding this platform
                this.gatorOnPlatform = platform;
            }
        });

        // If gator is not on a platform and not in safe area, check if in water
        if (!this.gatorOnPlatform) {
            const currentRow = this.gator.gridRow;
            if (currentRow >= 2 && currentRow <= 13) {
                // In water area without platform - will be caught by water collision
            }
        }
    }

    checkHazardCollisions() {
        this.hazards.children.entries.forEach(hazard => {
            const collision = Phaser.Geom.Rectangle.Overlaps(
                this.gator.getBounds(),
                hazard.getBounds()
            );

            if (collision) {
                this.loseLife();
            }
        });
    }

    checkWaterCollision() {
        const currentRow = this.gator.gridRow;
        const inWater = currentRow >= 2 && currentRow <= 13;

        if (inWater && !this.gatorOnPlatform) {
            this.loseLife();
        }
    }

    checkHomeReached() {
        const currentRow = this.gator.gridRow;
        
        if (currentRow === 0) {
            // Gator reached HOME!
            this.levelComplete = true;
            const bonus = this.timeRemaining * GAME_CONFIG.POINTS_TIME_BONUS;
            this.score += GAME_CONFIG.POINTS_LEVEL_COMPLETE + bonus;

            this.events.emit('updateUI', {
                score: this.score,
                lives: this.lives,
                time: this.timeRemaining,
            });

            // Show "Level Complete" message
            const text = this.add.text(
                GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2,
                `LEVEL ${this.currentLevel} COMPLETE!\n+${GAME_CONFIG.POINTS_LEVEL_COMPLETE + bonus} Points`,
                { font: '24px Arial', fill: '#FFD700', align: 'center' }
            ).setOrigin(0.5);

            // Next level after 2 seconds
            this.time.delayedCall(2000, () => {
                this.currentLevel++;
                this.scene.restart();
            });
        }
    }

    loseLife() {
        this.lives--;

        if (this.lives <= 0) {
            this.gameOver = true;
            this.endGame();
        } else {
            // Reset gator position
            this.gator.x = this.gatorStartX;
            this.gator.y = this.gatorStartY;
            this.gator.gridCol = GAME_CONFIG.GATOR.START_COL;
            this.gator.gridRow = GAME_CONFIG.GATOR.START_ROW;
            this.gatorOnPlatform = null;

            this.events.emit('updateUI', {
                score: this.score,
                lives: this.lives,
                time: this.timeRemaining,
            });
        }
    }

    endGame() {
        const text = this.add.text(
            GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2,
            `GAME OVER\nFinal Score: ${this.score}`,
            { font: '28px Arial', fill: '#FF0000', align: 'center' }
        ).setOrigin(0.5);

        // Restart after 3 seconds
        this.time.delayedCall(3000, () => {
            this.scene.restart();
        });
    }
}
