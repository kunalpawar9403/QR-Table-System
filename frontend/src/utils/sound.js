// Web Audio API Synthesizer for notifications and chimes
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('sg_sound_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('sg_sound_muted', this.muted);
    return this.muted;
  }

  // Dual brass service bell chime for new incoming orders
  playNewOrderChime() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this._playBellTone(1200, now, 0.9);
      this._playBellTone(1800, now + 0.15, 1.2);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Service call / waiter bell (two distinct alert tones)
  playServiceBell() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this._playBellTone(880, now, 0.7);
      this._playBellTone(1046.5, now + 0.2, 0.9);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Melodic order ready chime (ascending triad)
  playOrderReady() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this._playBellTone(659.25, now, 0.45); // E5
      this._playBellTone(880, now + 0.12, 0.45); // A5
      this._playBellTone(1318.5, now + 0.24, 0.8); // E6
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Quick pleasant click tone
  playClick() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this._playBellTone(950, now, 0.08);
    } catch (e) {}
  }

  _playBellTone(freq, startTime, duration) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundManager = new SoundManager();
