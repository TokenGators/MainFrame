import { LOG_SPEED_MIN, LOG_SPEED_MAX, LOG_HEIGHT_OPTIONS, LOG_GAP_OPTIONS, NUM_LOG_COLUMNS, CANVAS_HEIGHT, TILE } from '../constants.js';
import Log from '../entities/Log.js';

export default class LogColumnManager {
  constructor(scene) {
    this.scene = scene;
    this.logs = [];
    this.columns = [];

    // Create columns of logs
    for (let i = 0; i < NUM_LOG_COLUMNS; i++) {
      const colIndex = i + 2; // Start from column 2 to cover full river (cols 2-16)
      const direction = (colIndex % 2 === 0) ? 1 : -1; // alternating direction
      const speed = (Math.random() * (LOG_SPEED_MAX - LOG_SPEED_MIN) + LOG_SPEED_MIN) * direction;

      this.columns.push({
        colIndex,
        direction,
        speed,
        logs: []
      });
    }

    this.initializeColumns();
  }

  initializeColumns() {
    for (const column of this.columns) {
      const numLogs = 2;
      // Distribute logs evenly with randomized gaps from LOG_GAP_OPTIONS
      let currentY = CANVAS_HEIGHT - (LOG_HEIGHT_OPTIONS[1] * TILE); // Start near bottom

      for (let i = 0; i < numLogs; i++) {
        const heightTiles = LOG_HEIGHT_OPTIONS[Math.floor(Math.random() * LOG_HEIGHT_OPTIONS.length)];
        const logHeight = heightTiles * TILE;

        // Place logs starting from bottom, with randomized gap above each
        if (i === numLogs - 1) {
          // Bottom-most log: place at bottom of screen
          currentY = CANVAS_HEIGHT - logHeight;
        } else {
          // Upper logs: leave a random gap above the next log
          const gap = LOG_GAP_OPTIONS[Math.floor(Math.random() * LOG_GAP_OPTIONS.length)];
          currentY = currentY - logHeight - gap;
        }

        const log = new Log(this.scene, column.colIndex, currentY, heightTiles, column.speed);
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
}
