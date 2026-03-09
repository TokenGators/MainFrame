// Main Game Initialization

const phaserConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    parent: 'phaser-game',
    backgroundColor: GAME_CONFIG.COLORS.BACKGROUND,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: GameScene,
    render: {
        pixelArt: true,
        antialias: false,
    },
};

// Create the game
const game = new Phaser.Game(phaserConfig);

// UI Update Handler
const gameScene = game.scene.getScene('GameScene');

// Listen for UI updates from the game scene
game.scene.scenes[0].events.on('updateUI', (data) => {
    document.getElementById('score').textContent = `Score: ${data.score}`;
    document.getElementById('lives').textContent = `Lives: ${data.lives}`;
    document.getElementById('timer').textContent = `Time: ${data.time}s`;
});

// Optional: Pause/Resume on window blur/focus
window.addEventListener('blur', () => {
    if (game.scene.scenes[0] && !game.scene.scenes[0].gameOver) {
        game.scene.pause('GameScene');
    }
});

window.addEventListener('focus', () => {
    if (game.scene.scenes[0] && !game.scene.scenes[0].gameOver) {
        game.scene.resume('GameScene');
    }
});
