'use strict';

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.registry = new Map();
    this.register('attackHit', ({ src, tgt, type, amt }) => this.playAttackHit(src, tgt, type, amt));
    this.register('kill', ({ unit, src }) => this.playKill(unit, src));
  }

  init() {
    if (!this.enabled) return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      this.enabled = false;
      return null;
    }
    if (!this.ctx) this.ctx = new Ctor();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  ensureContext() {
    return this.init();
  }

  setEnabled(value) {
    this.enabled = !!value;
    if (!this.enabled) return;
    this.init();
  }

  register(name, fn) {
    this.registry.set(name, fn);
    return this;
  }

  play(name, payload = {}) {
    const fn = this.registry.get(name);
    if (typeof fn === 'function') fn(payload);
    return this;
  }

  playTone({ freq = 220, duration = 0.08, gain = 0.05, type = 'square', slide = 0, pan = 0 }) {
    const audio = this.ensureContext();
    if (!audio) return;

    const osc = audio.createOscillator();
    const gainNode = audio.createGain();
    const panner = audio.createStereoPanner ? audio.createStereoPanner() : null;
    const now = audio.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), now + duration);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (panner) {
      panner.pan.value = clamp(pan, -1, 1);
      osc.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(audio.destination);
    } else {
      osc.connect(gainNode);
      gainNode.connect(audio.destination);
    }

    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  playNoise({ duration = 0.08, gain = 0.03, color = 'white', pan = 0 }) {
    const audio = this.ensureContext();
    if (!audio) return;

    const buffer = audio.createBuffer(1, Math.max(1, Math.ceil(audio.sampleRate * duration)), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      let v = Math.random() * 2 - 1;
      if (color === 'brown') v = (v + (i / data.length) * 0.8) * 0.6;
      data[i] = v;
    }

    const source = audio.createBufferSource();
    const gainNode = audio.createGain();
    const panner = audio.createStereoPanner ? audio.createStereoPanner() : null;
    const now = audio.currentTime;

    source.buffer = buffer;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (panner) {
      panner.pan.value = clamp(pan, -1, 1);
      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(audio.destination);
    } else {
      source.connect(gainNode);
      gainNode.connect(audio.destination);
    }

    source.start(now);
    source.stop(now + duration + 0.02);
  }

  pickPan(src, dst) {
    if (!src || !dst) return 0;
    return clamp((src.x - dst.x) * 0.18, -1, 1);
  }

  playAttackHit(src, tgt, type = 'physical', amt = 8) {
    const audio = this.ensureContext();
    if (!audio || !src || !tgt) return;

    const pan = this.pickPan(src, tgt);
    const theme = type === 'magic' ? 'triangle' : type === 'true' ? 'sawtooth' : 'square';
    const freq = type === 'magic' ? 220 + amt * 2.5 : type === 'true' ? 360 + amt * 2.1 : 160 + amt * 1.8;
    const gain = 0.032 + Math.min(0.04, amt / 200);
    const duration = 0.05 + Math.min(0.08, amt / 120);

    this.playTone({ freq, duration, gain, type: theme, slide: type === 'magic' ? -60 : -120, pan });
    this.playNoise({ duration: duration * 0.8, gain: gain * 0.6, color: type === 'magic' ? 'white' : 'brown', pan });
  }

  playKill(unit, src) {
    const audio = this.ensureContext();
    if (!audio || !unit) return;

    const pan = this.pickPan(src, unit);
    const boss = !!unit.boss;
    const elite = !!unit.elite;
    const freq = boss ? 80 : elite ? 120 : 180;
    const duration = boss ? 0.25 : elite ? 0.2 : 0.15;

    this.playTone({ freq, duration, gain: boss ? 0.1 : 0.08, type: 'sawtooth', slide: boss ? -45 : -135, pan });
    this.playNoise({ duration: duration + 0.04, gain: boss ? 0.08 : 0.06, color: 'brown', pan });

    if (boss) {
      this.playTone({ freq: 58, duration: 0.42, gain: 0.08, type: 'triangle', slide: -25, pan });
    }
  }
}

const SFX = new SoundSystem();
