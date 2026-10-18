// Audio synthesizer for Kitchen Display System and Order Alerts using Web Audio API
class KitchenSoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Authentic Brass Service Bell "Ding-Ding!"
  playNewOrderChime() {
    if (this.muted) return;
    this.init();

    const now = this.ctx.currentTime;
    
    // First chime (high clear ring)
    this._playBellTone(1200, now, 0.9);
    // Second chime (higher harmonic)
    this._playBellTone(1800, now + 0.15, 1.2);
  }

  // Service call / waiter bell (two distinct tones)
  playServiceBell() {
    if (this.muted) return;
    this.init();

    const now = this.ctx.currentTime;
    this._playBellTone(880, now, 0.7);
    this._playBellTone(1046.5, now + 0.2, 0.9);
  }

  // Order Ready Chime
  playOrderReady() {
    if (this.muted) return;
    this.init();

    const now = this.ctx.currentTime;
    this._playBellTone(659.25, now, 0.5); // E5
    this._playBellTone(880, now + 0.12, 0.5); // A5
    this._playBellTone(1318.5, now + 0.24, 0.9); // E6
  }

  _playBellTone(freq, startTime, duration) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Bell envelope: sharp attack, gentle exponential decay
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

window.soundManager = new KitchenSoundManager();
