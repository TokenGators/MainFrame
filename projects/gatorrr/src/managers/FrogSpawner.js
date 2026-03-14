import { FROG_SPAWN_MIN, FROG_SPAWN_MAX, MAX_FROGS_MIN, MAX_FROGS_MAX } from '../constants.js';
import Frog from '../entities/Frog.js';

export default class FrogSpawner {
  constructor(scene) {
    this.scene = scene;
    this.spawnTimer = 0;
    this.spawnInterval = 0;
    this.frogs = [];
    this.maxFrogs = 0;
    
    // Initialize spawn interval and max frogs
    this.reset();
  }
  
  reset() {
    this.spawnInterval = Math.random() * (FROG_SPAWN_MAX - FROG_SPAWN_MIN) + FROG_SPAWN_MIN;
    this.maxFrogs = Math.floor(Math.random() * (MAX_FROGS_MAX - MAX_FROGS_MIN) + MAX_FROGS_MIN);
  }
  
  update(delta) {
    this.spawnTimer += delta;
    
    // Spawn frogs if we haven't reached the max and timer is up
    if (this.frogs.length < this.maxFrogs && this.spawnTimer >= this.spawnInterval) {
      this.spawnFrog();
      this.spawnTimer = 0;
      this.spawnInterval = Math.random() * (FROG_SPAWN_MAX - FROG_SPAWN_MIN) + FROG_SPAWN_MIN;
    }
    
    // Update existing frogs
    for (const frog of this.frogs) {
      frog.update(delta, this.scene.logManager ? this.scene.logManager.getAllLogs() : []);
    }
  }
  
  spawnFrog() {
    // Spawn at col 17 (right bank), random row (1-10)
    const row = Math.floor(Math.random() * 9) + 1; // 1 to 10
    
    const frog = new Frog(this.scene, 17, row);
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