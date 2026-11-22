// The Gilded Hour — sound made from nothing: every effect is synthesised
// with the Web Audio API, so the game ships no audio files at all. A soft
// casino-night hum sits under everything once the player makes a sound
// (browsers only allow audio after a gesture).

export class SoundKit {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.humNodes = null;
  }

  // Create the context on the first user gesture.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.startHum();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // A low, warm room tone: two detuned sines through a slow filter.
  startHum() {
    if (!this.ctx || this.humNodes) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.015;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 55;
    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = 110.5;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    oscA.start();
    oscB.start();
    this.humNodes = { gain, oscA, oscB };
  }

  // One short enveloped tone. kind picks the wave shape's character.
  blip(freq, seconds, volume, type = 'sine', slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  // Filtered noise burst: cloth, glass, a drill's grit.
  noise(seconds, volume, filterFreq, delay = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t0);
  }

  pickup() { this.blip(880, 0.12, 0.08, 'triangle', 1320); this.blip(1320, 0.16, 0.05, 'sine', null, 0.05); }
  coinPing() { this.blip(2093, 0.3, 0.07, 'sine', 1568); }
  doorCreak() { this.noise(0.18, 0.05, 400); }
  lockDone() { this.blip(660, 0.07, 0.07, 'square'); this.blip(990, 0.1, 0.07, 'square', null, 0.07); }
  glassCut() { this.noise(0.4, 0.03, 3200); }
  glassSmash() { this.noise(0.35, 0.16, 2400); this.noise(0.2, 0.1, 3600, 0.04); }
  drillLoop() { this.noise(0.22, 0.05, 900); this.blip(140, 0.2, 0.03, 'sawtooth', 120); }
  empZap() { this.blip(1200, 0.35, 0.1, 'sawtooth', 60); this.noise(0.25, 0.06, 1800); }
  smokePop() { this.noise(0.3, 0.08, 700); }
  spotted() { this.blip(520, 0.14, 0.09, 'square', 392); }
  alarmSting() { this.blip(392, 0.2, 0.1, 'square'); this.blip(392, 0.2, 0.1, 'square', null, 0.24); }
  busted() { this.blip(330, 0.5, 0.12, 'sawtooth', 110); this.blip(220, 0.7, 0.1, 'sawtooth', 73, 0.15); }
  getaway() { [523, 659, 784, 1047].forEach((f, i) => this.blip(f, 0.22, 0.08, 'triangle', null, i * 0.11)); }
  tick() { this.blip(1568, 0.04, 0.03, 'sine'); }
}
