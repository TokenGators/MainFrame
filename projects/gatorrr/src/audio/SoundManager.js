export default class SoundManager {
  constructor() {
    // Create AudioContext (handle browser prefixes)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
  }

  play(type) {
    // Resume context if suspended (requires user gesture)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    switch (type) {
      case 'eat':       this._playEat(); break;
      case 'damage':    this._playDamage(); break;
      case 'padFill':   this._playPadFill(); break;
      case 'levelClear': this._playLevelClear(); break;
      case 'gameOver':  this._playGameOver(); break;
    }
  }

  _playEat() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  _playDamage() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  _playPadFill() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  _playLevelClear() {
    const now = this.ctx.currentTime;

    [523, 659, 784].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);

      gain.gain.setValueAtTime(0.3, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.15);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.15);
    });
  }

  _playGameOver() {
    const now = this.ctx.currentTime;

    [440, 329, 294, 220, 110].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.3);

      gain.gain.setValueAtTime(0.4, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.3);

      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.3);
    });
  }
}
