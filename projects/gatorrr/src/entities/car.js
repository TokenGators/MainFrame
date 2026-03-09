/**
 * Car Entity
 * Moving obstacles that kill the player on contact
 */

import { CAR_CONFIG, TILE_SIZE, GAME_WIDTH } from '../config.js';

export class Car {
  constructor(scene, startX, startY, speed, color) {
    this.scene = scene;
    this.x = startX;
    this.y = startY;
    this.speed = speed;
    this.width = CAR_CONFIG.width;
    this.height = CAR_CONFIG.height;
    
    // Create rectangle sprite (32x32)
    this.sprite = scene.add.rectangle(
      this.x,
      this.y,
      this.width,
      this.height,
      color
    );
    this.sprite.setOrigin(0, 0);
  }
  
  update(deltaTime) {
    this.x += (this.speed * deltaTime) / 1000;
    
    // Wrap around screen
    if (this.x > GAME_WIDTH) {
      this.x = -this.width;
    }
    
    this.sprite.setPosition(this.x, this.y);
  }
  
  getBounds() {
    return new Phaser.Geom.Rectangle(
      this.x,
      this.y,
      this.width,
      this.height
    );
  }
  
  getGridY() {
    return Math.floor(this.y / TILE_SIZE);
  }
}

export class CarManager {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.setupLanes();
  }
  
  setupLanes() {
    // Week 1 MVP: Just 1 lane of cars
    const laneY = 10 * TILE_SIZE; // Grid row 10
    
    // Create 3 cars in the lane, spaced out
    const colors = ['#FF4444', '#4444FF', '#44FF44'];
    for (let i = 0; i < 3; i++) {
      const startX = i * 300;
      const color = colors[i % colors.length];
      const car = new Car(this.scene, startX, laneY, CAR_CONFIG.speed, color);
      this.cars.push(car);
    }
  }
  
  update(deltaTime) {
    for (let car of this.cars) {
      car.update(deltaTime);
    }
  }
  
  checkCollision(playerBounds) {
    for (let car of this.cars) {
      const carBounds = car.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, carBounds)) {
        return true;
      }
    }
    return false;
  }
}
