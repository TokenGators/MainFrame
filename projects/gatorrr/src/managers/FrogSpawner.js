import { FROG_SPAWN_WEIGHTS, FROG_TYPES } from '../constants.js';
import Frog from '../entities/Frog.js';

export default class FrogSpawner {
  constructor(scene, levelConfig) {
    this.scene = scene;
    this.spawnTimer = 0;
    this.spawnInterval = 0;
    this.frogs = [];
    this.maxFrogs = 0;
    this.levelConfig = levelConfig || {};
    
    // Initialize spawn interval and max frogs from level config
    this.reset();
  }
  
  reset() {
    const spawnMin = this.levelConfig.spawnMin || 1500;
    const spawnMax = this.levelConfig.spawnMax || 2250;
    this.spawnInterval = Math.random() * (spawnMax - spawnMin) + spawnMin;
    this.maxFrogs = this.levelConfig.maxFrogs || 6;
  }
  
  // Weighted random selection for frog type
  getRandomFrogType() {
    const weights = Object.values(FROG_SPAWN_WEIGHTS);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (const [type, weight] of Object.entries(FROG_SPAWN_WEIGHTS)) {
      if (random < weight) {
        return type;
      }
      random -= weight;
    }
    return 'green'; // fallback
  }
  
  update(delta) {
    this.spawnTimer += delta;
    
    // Spawn frogs if we haven't reached the max and timer is up
    if (this.frogs.length < this.maxFrogs && this.spawnTimer >= this.spawnInterval) {
      this.spawnFrog();
      this.spawnTimer = 0;
      const spawnMin = this.levelConfig.spawnMin || 1500;
      const spawnMax = this.levelConfig.spawnMax || 2250;
      this.spawnInterval = Math.random() * (spawnMax - spawnMin) + spawnMin;
    }
    
    // Update existing frogs
    for (const frog of this.frogs) {
      frog.update(delta, this.scene.logManager ? this.scene.logManager.getAllLogs() : []);
    }
  }
  
  spawnFrog() {
    // Spawn at col 17-19 (right bank), random row (1-10)
    const row = Math.floor(Math.random() * 9) + 1; // 1 to 10
    const col = Math.floor(Math.random() * 3) + 17; // 17, 18, or 19
    const type = this.getRandomFrogType();
    
    const frog = new Frog(this.scene, col, row, type);
    this.frogs.push(frog);
    
    return frog;
  }
  
  removeFrog(frog) {
    const index = this.frogs.indexOf(frog);
    if (index > -1) {
      this.frogs.splice(index, 1);
      frog.destroy();
    }
  }
}