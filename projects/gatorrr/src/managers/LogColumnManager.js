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
      const numLogs = 3;
      const spacing = Math.floor(CANVAS_HEIGHT / numLogs); // ~90px
      for (let i = 0; i < numLogs; i++) {
        const heightTiles = LOG_HEIGHT_OPTIONS[Math.floor(Math.random() * LOG_HEIGHT_OPTIONS.length)];
        // Stagger start positions evenly across the screen height, with random offset
        const startY = (i * spacing) + Math.floor(Math.random() * (spacing / 2)) - (heightTiles * TILE);
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
}
