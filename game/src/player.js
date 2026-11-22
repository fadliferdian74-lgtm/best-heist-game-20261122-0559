// The Gilded Hour — the thief: one body, a bag, and whatever the plan
// bought. Movement is slower the more the bag holds and slower still in a
// vent duct; sneaking trades speed for silence; smoke makes him, briefly,
// nobody at all.

import { PLAYER } from './config.js';

export class Player {
  constructor(x, y, gear) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER.radius;
    this.angle = -Math.PI / 2;
    this.gear = gear;            // {lockpick, soles, cutter, decoy, emp, smoke}
    this.hasKeycard = false;
    this.carriedKg = 0;
    this.carriedValue = 0;
    this.takenNames = [];
    this.sneaking = false;
    this.still = true;
    this.moving = false;
    this.noiseRadius = 0;        // what the guards can hear this frame
    this.smokeLeft = 0;          // seconds of smoke cover left
    this.stepPhase = 0;          // footstep animation / sound timing
  }

  get hidden() {
    return this.smokeLeft > 0;
  }

  speed(world) {
    let base = this.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const load = Math.min(PLAYER.carrySlowMax, this.carriedKg * PLAYER.carrySlowPerKg);
    base *= 1 - load;
    if (world.inVent(this.x, this.y)) base *= 0.5;
    return base;
  }

  // Move for one frame. Returns a footstep event ('step') on each stride.
  update(dt, input, world) {
    if (this.smokeLeft > 0) this.smokeLeft -= dt;
    this.sneaking = input.sneaking();
    const move = input.moveVector();
    this.moving = move.x !== 0 || move.y !== 0;
    this.still = !this.moving;
    this.noiseRadius = 0;
    if (!this.moving) return null;

    const speed = this.speed(world);
    world.moveBody(this, move.x * speed * dt, move.y * speed * dt, 'thief');
    this.angle = Math.atan2(move.y, move.x);
    if (!this.sneaking && !this.gear.soles) this.noiseRadius = PLAYER.walkNoise;
    else if (!this.sneaking && this.gear.soles) this.noiseRadius = 0;

    const stride = this.sneaking ? 1.4 : 2.6;
    this.stepPhase += dt * stride * (speed / PLAYER.walkSpeed);
    if (this.stepPhase >= Math.PI) {
      this.stepPhase -= Math.PI;
      return 'step';
    }
    return null;
  }

  take(item) {
    item.taken = true;
    if (item.kind === 'keycard') {
      this.hasKeycard = true;
      return;
    }
    if (item.isLoot) {
      this.carriedKg += item.kg;
      this.carriedValue += item.value;
      this.takenNames.push(item.name);
    }
  }
}
