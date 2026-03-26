import { LOG_HEIGHT_OPTIONS, LOG_GAP_OPTIONS, NUM_LOG_COLUMNS, CANVAS_HEIGHT, TILE } from '../constants.js';
import Log from '../entities/Log.js';

export default class LogColumnManager {
  constructor(scene, levelConfig) {
    this.scene = scene;
    this.logs = [];
    this.columns = [];
    this.levelConfig = levelConfig || { logsPerCol: 2 };

    // Create columns of logs based on level config
    const logsPerCol = this.levelConfig.logsPerCol;
    
    for (let i = 0; i < NUM_LOG_COLUMNS; i++) {
      const colIndex = i + 2; // Start from column 2 to cover full river (cols 2-16)
      const direction = Math.random() < 0.5 ? 1 : -1; // randomized direction per column
      const speedMin = this.levelConfig.speedMin || 20;
      const speedMax = this.levelConfig.speedMax || 50;
      const speed = (Math.random() * (speedMax - speedMin) + speedMin) * direction;

      this.columns.push({
        colIndex,
        direction,
        speed,
        logs: []
      });
    }

    this.initializeColumns(logsPerCol);
  }

  initializeColumns(logsPerCol) {
    for (const column of this.columns) {
      // Place logs per column based on level config
      for (let i = 0; i < logsPerCol; i++) {
        const heightTiles = LOG_HEIGHT_OPTIONS[Math.floor(Math.random() * LOG_HEIGHT_OPTIONS.length)];
        // Stagger: log 0 at 0, log 1 at CANVAS_HEIGHT/2, etc.
        const segmentHeight = CANVAS_HEIGHT / logsPerCol;
        const startY = i * segmentHeight;

        const log = new Log(this.scene, column.colIndex, startY, heightTiles, column.speed);
        log.gridCol = column.colIndex;
        log.id = `${column.colIndex}-${this.logs.length}`;
        this.logs.push(log);
        column.logs.push(log);
      }
    }
  }

  update(delta) {
    for (const log of this.logs) {
      log.update(delta);
    }
  }

  getAllLogs() {
    return this.logs;
  }

  reinitialize(logsPerCol) {
    // Destroy all existing log objects
    for (const log of this.logs) {
      log.destroy();
    }
    
    // Clear arrays
    this.logs = [];
    this.columns = [];
    
    // Re-initialize columns with new log count
    this.levelConfig.logsPerCol = logsPerCol;
    this.initializeColumns(logsPerCol);
  }
}
