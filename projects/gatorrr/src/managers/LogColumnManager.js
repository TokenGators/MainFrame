import { LOG_SPEED_MIN, LOG_SPEED_MAX, LOG_HEIGHT_OPTIONS, LOG_GAP_OPTIONS, NUM_LOG_COLUMNS } from '../constants.js';
import Log from '../entities/Log.js';

export default class LogColumnManager {
  constructor(scene) {
    this.scene = scene;
    this.logs = [];
    this.columns = [];

    // Create columns of logs
    for (let i = 0; i < NUM_LOG_COLUMNS; i++) {
      const colIndex = i + 4; // Start from column 4
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
      // Place 3 logs per column, evenly spaced
      const spacing = Math.floor(180 / 3); // 60px spacing
      const startY = column.colIndex * spacing - 16 * 10; // Start Y position
      
      for (let i = 0; i < 3; i++) {
        const heightTiles = LOG_HEIGHT_OPTIONS[Math.floor(Math.random() * LOG_HEIGHT_OPTIONS.length)];
        const gapPx = LOG_GAP_OPTIONS[Math.floor(Math.random() * LOG_GAP_OPTIONS.length)];
        
        const currentY = startY + i * spacing;
        
        const log = new Log(
          this.scene,
          column.colIndex,
          currentY,
          heightTiles,
          column.speed
        );

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
