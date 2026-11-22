// The Gilded Hour — the alarm: one heat meter the whole building shares.
// Being seen feeds it, hiding starves it, and its level decides how the
// night behaves: at level 1 the guards come and look, at level 2 they hunt,
// at level 3 the hotel locks down and the van will not wait long.

import { ALARM } from './config.js';

export class Alarm {
  constructor(sound) {
    this.sound = sound;
    this.heat = 0;            // 0..100
    this.level = 0;           // 0 calm, 1 raised, 2 hunting, 3 lockdown
    this.seenNow = false;     // set each frame by whoever is watching
    this.lockdownLeft = 0;    // seconds of grace once level 3 trips
    this.everRaised = false;  // for the ghost bonus
    this.everHunting = false;
    this.flash = 0;           // HUD pulse timer after a level change
  }

  // Something is looking at the thief right now: feed the meter.
  feed(ratePerSecond, dt) {
    this.heat = Math.min(100, this.heat + ratePerSecond * dt);
    this.seenNow = true;
  }

  // A discrete scare: smashing glass, a guard's shout.
  spike(amount) {
    this.heat = Math.min(100, this.heat + amount);
  }

  update(dt) {
    if (!this.seenNow && this.level < 3) {
      this.heat = Math.max(0, this.heat - ALARM.decayPerSecond * dt);
    }
    this.seenNow = false;

    const next = this.heat >= ALARM.levelThreeAt ? 3
      : this.heat >= ALARM.levelTwoAt ? 2
      : this.heat >= 18 ? 1
      : 0;
    // Levels fall slowly: heat must drain well below the trip point.
    const settled = next > this.level ? next
      : this.heat < 8 ? 0
      : this.heat < 30 && this.level <= 2 ? Math.min(this.level, 1)
      : this.level;

    if (settled !== this.level) {
      const rising = settled > this.level;
      this.level = settled;
      this.flash = 1.2;
      if (rising) {
        this.sound.alarmSting();
        if (this.level === 3) this.lockdownLeft = ALARM.lockdownSeconds;
      }
    }
    if (this.level >= 1) this.everRaised = true;
    if (this.level >= 2) this.everHunting = true;
    if (this.level === 3 && this.lockdownLeft > 0) this.lockdownLeft -= dt;
    if (this.flash > 0) this.flash -= dt;
  }

  get lockdownExpired() {
    return this.level === 3 && this.lockdownLeft <= 0;
  }
}
