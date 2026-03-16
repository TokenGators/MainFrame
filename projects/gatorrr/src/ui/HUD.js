import { C } from '../constants.js';

export default class HUD {
  constructor(scene) {
    this.scene = scene;
    
    // Create HUD elements
    this.hpText = this.scene.add.text(8, 4, 'HP: 3', {
      fontSize: '16px',
      color: C.WHITE,
      fontFamily: 'Courier New'
    });
    
    this.frogsEatenText = this.scene.add.text(80, 4, 'Frogs: 0', {
      fontSize: '16px',
      color: C.WHITE,
      fontFamily: 'Courier New'
    });
    
    this.padsFilledText = this.scene.add.text(160, 4, 'Pads: 0/5', {
      fontSize: '16px',
      color: C.WHITE,
      fontFamily: 'Courier New'
    });
    
    // Position the HUD at the top of the screen (row 0)
    this.hpText.setOrigin(0);
    this.frogsEatenText.setOrigin(0);
    this.padsFilledText.setOrigin(0);
  }
  
  update(gameState) {
    // Update HUD text with current game state
    this.hpText.setText(`HP: ${gameState.hp}`);
    this.frogsEatenText.setText(`Frogs: ${gameState.frogsEaten}`);
    this.padsFilledText.setText(`Pads: ${gameState.padsFilled}/5`);
    
    // Change color if warning conditions
    if (gameState.hp <= 1) {
      this.hpText.setColor(C.RED);
    } else {
      this.hpText.setColor(C.WHITE);
    }
    
    if (gameState.padsFilled >= 4) {
      this.padsFilledText.setColor(C.RED);
    } else {
      this.padsFilledText.setColor(C.WHITE);
    }
  }
}