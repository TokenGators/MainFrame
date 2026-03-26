import { FROG_SMARTNESS, FROG_DECISION_INTERVAL, LEVEL_CONFIGS } from '../constants.js';

export default class DevPanel {
  constructor(scene) {
    this.scene = scene;
    this.panel = null;
    this.sliderValues = {
      logsPerCol: 2,
      logSpeedMultiplier: 1.0,
      maxFrogs: 6,
      frogDecisionInterval: 500,
      frogSmartness: 0.75
    };
    this.previousLogSpeedMultiplier = 1.0;
    this.createPanel();
    this.bindEvents();
  }

  createPanel() {
    // Create panel container
    this.panel = document.createElement('div');
    this.panel.id = 'dev-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 12px;
      border-radius: 6px;
      width: 260px;
      z-index: 9999;
      display: none;
    `;

    // Generate sliders
    const sliders = `
      <div style="margin-bottom: 8px;">
        <label>Logs/column</label><br/>
        <input type="range" id="dev-logs" min="1" max="5" step="1" value="2">
        <span id="val-logs" style="float: right;">2</span>
      </div>
      
      <div style="margin-bottom: 8px;">
        <label>Log speed multiplier</label><br/>
        <input type="range" id="dev-logspeed" min="0.25" max="3" step="0.25" value="1">
        <span id="val-logspeed" style="float: right;">1.0</span>
      </div>
      
      <div style="margin-bottom: 8px;">
        <label>Max frogs</label><br/>
        <input type="range" id="dev-frogs" min="1" max="15" step="1" value="6">
        <span id="val-frogs" style="float: right;">6</span>
      </div>
      
      <div style="margin-bottom: 8px;">
        <label>Frog interval (ms)</label><br/>
        <input type="range" id="dev-froginterval" min="200" max="2000" step="50" value="500">
        <span id="val-froginterval" style="float: right;">500</span>
      </div>
      
      <div style="margin-bottom: 8px;">
        <label>Frog smartness</label><br/>
        <input type="range" id="dev-smartness" min="0" max="1" step="0.05" value="0.75">
        <span id="val-smartness" style="float: right;">0.75</span>
      </div>
    `;

    this.panel.innerHTML = `<div style="margin-bottom: 10px; font-weight: bold;">Dev Tuning Panel</div>` + sliders;
    document.body.appendChild(this.panel);

    // Initialize slider values from current state
    this.updateSlidersFromState();
  }

  bindEvents() {
    // Slider event handlers
    const sliderIds = ['dev-logs', 'dev-logspeed', 'dev-frogs', 'dev-froginterval', 'dev-smartness'];
    
    sliderIds.forEach(id => {
      const slider = document.getElementById(id);
      const valueSpan = document.getElementById('val-' + id.split('-')[1]);
      
      slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        valueSpan.textContent = value.toFixed(id === 'dev-logspeed' || id === 'dev-smartness' ? 2 : 0);
        
        // Store value
        const key = id.split('-')[1];
        if (key === 'smartness') {
          this.sliderValues.frogSmartness = value;
        } else if (key === 'interval') {
          this.sliderValues.frogDecisionInterval = value;
        } else {
          this.sliderValues[key] = value;
        }
        
        // Apply immediately
        this.applyValues();
      });
    });
  }

  updateSlidersFromState() {
    // Get initial values from current state
    const logsPerCol = this.scene.levelConfig?.logsPerCol || 2;
    const maxFrogs = this.scene.frogSpawner?.maxFrogs || 6;
    
    // Set initial slider values
    document.getElementById('dev-logs').value = logsPerCol;
    document.getElementById('val-logs').textContent = logsPerCol;
    
    document.getElementById('dev-logspeed').value = 1.0;
    document.getElementById('val-logspeed').textContent = '1.0';
    
    document.getElementById('dev-frogs').value = maxFrogs;
    document.getElementById('val-frogs').textContent = maxFrogs;
    
    document.getElementById('dev-froginterval').value = 500;
    document.getElementById('val-froginterval').textContent = '500';
    
    document.getElementById('dev-smartness').value = 0.75;
    document.getElementById('val-smartness').textContent = '0.75';
  }

  show() {
    this.panel.style.display = 'block';
    this.scene.scene.pause();
  }

  hide() {
    this.panel.style.display = 'none';
    this.scene.scene.resume();
  }

  toggle() {
    if (this.panel.style.display === 'block') {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  applyValues() {
    // Log speed multiplier
    const newMultiplier = this.sliderValues.logSpeedMultiplier;
    const oldMultiplier = this.previousLogSpeedMultiplier || 1.0;
    const logs = this.scene.logManager?.getAllLogs() || [];
    
    if (oldMultiplier !== 0) {
      const speedChange = newMultiplier / oldMultiplier;
      for (const log of logs) {
        log.speed *= speedChange;
      }
    }
    this.previousLogSpeedMultiplier = newMultiplier;

    // Logs per column - reinitialize logs
    if (this.sliderValues.logsPerCol) {
      if (this.scene.logManager) {
        this.scene.logManager.reinitialize(this.sliderValues.logsPerCol);
      }
    }

    // Max frogs
    if (this.scene.frogSpawner) {
      this.scene.frogSpawner.maxFrogs = this.sliderValues.maxFrogs;
    }

    // Frog decision interval
    this.scene.frogDecisionInterval = this.sliderValues.frogDecisionInterval;

    // Frog smartness
    this.scene.frogSmartness = this.sliderValues.frogSmartness;
  }
}
