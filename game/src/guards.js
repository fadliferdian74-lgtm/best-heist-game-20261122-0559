// The Gilded Hour — the guards: five patrols with eyes, ears and tempers.
// Each guard walks a loop of waypoints, fills a private suspicion meter when
// the thief crosses his vision cone, comes to look when he hears something,
// and hunts when he is sure. Lose his sight line long enough and he gives
// up back to his loop — that fairness is the game's whole tension.

import { TILE, GUARD, ALARM } from './config.js';
import { PATROLS } from './levels.js';
import { tileCenter, angleTo, angleDiff, turnToward } from './world.js';

export class Guard {
  constructor(patrol, startIndex = 0) {
    this.name = patrol.name;
    this.loop = patrol.loop.map(([x, y]) => tileCenter(x, y));
    this.waypoint = startIndex % this.loop.length;
    const start = this.loop[this.waypoint];
    this.x = start.x;
    this.y = start.y;
    this.radius = GUARD.radius;
    this.angle = angleTo(start.x, start.y, this.loop[(this.waypoint + 1) % this.loop.length].x, this.loop[(this.waypoint + 1) % this.loop.length].y);
    this.state = 'patrol';       // patrol | investigate | chase | search
    this.suspicion = 0;          // 0..1
    this.path = [];
    this.pathPoint = 0;
    this.repathLeft = 0;
    this.waitLeft = 0;
    this.lookPhase = Math.random() * Math.PI * 2;
    this.lastSeen = null;
    this.memoryLeft = 0;
    this.seesPlayer = false;
    this.shouted = false;
  }

  tileX() { return Math.floor(this.x / TILE); }
  tileY() { return Math.floor(this.y / TILE); }

  setDestination(world, px, py) {
    const path = world.findPath(this.tileX(), this.tileY(), Math.floor(px / TILE), Math.floor(py / TILE));
    if (path === null) { this.path = []; return; }
    this.path = path.map(([x, y]) => tileCenter(x, y));
    this.path.push({ x: px, y: py });
    this.pathPoint = 0;
  }

  // Walk the current path; returns true on arrival.
  followPath(dt, speed, world) {
    if (this.pathPoint >= this.path.length) return true;
    const target = this.path[this.pathPoint];
    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) { this.pathPoint++; return this.pathPoint >= this.path.length; }
    const turnRate = this.state === 'chase' ? GUARD.chaseTurnRate : GUARD.turnRate;
    this.angle = turnToward(this.angle, Math.atan2(dy, dx), turnRate * dt);
    // A guard mostly walks where he looks.
    const step = Math.min(dist, speed * dt);
    world.moveBody(this, Math.cos(this.angle) * step, Math.sin(this.angle) * step, 'guard');
    // Guards carry keys: a shut door in the way simply opens.
    const aheadX = Math.floor((this.x + Math.cos(this.angle) * (this.radius + 8)) / TILE);
    const aheadY = Math.floor((this.y + Math.sin(this.angle) * (this.radius + 8)) / TILE);
    if (world.doorAt(aheadX, aheadY) && !world.isDoorOpen(aheadX, aheadY)) {
      world.openDoor(aheadX, aheadY, 3);
    }
    return false;
  }

  canSee(player, world) {
    if (player.hidden) return false;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD.coneRange) return false;
    const facing = Math.atan2(dy, dx);
    const inCone = Math.abs(angleDiff(facing, this.angle)) < GUARD.coneHalfAngle;
    const atElbow = dist < 38; // nobody is invisible at arm's length
    if (!inCone && !atElbow) return false;
    if (world.inVent(player.x, player.y)) return false;
    return world.hasLineOfSight(this.x, this.y, player.x, player.y);
  }

  hearNoise(noise, world) {
    const dist = Math.hypot(noise.x - this.x, noise.y - this.y);
    if (dist > noise.radius + GUARD.hearRadiusBonus) return;
    if (this.state === 'chase') return;
    this.state = 'investigate';
    this.suspicion = Math.max(this.suspicion, 0.5);
    this.setDestination(world, noise.x, noise.y);
    this.waitLeft = 0;
  }

  update(dt, world, player, alarm, sound) {
    this.seesPlayer = this.canSee(player, world);

    // --- perception: suspicion fills in the cone, drains out of it -------
    if (this.seesPlayer) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const closeness = 1 - dist / GUARD.coneRange;
      let rate = 0.55 + closeness * 1.5;
      if (player.sneaking) rate *= 0.55;
      if (player.still) rate *= 0.7;
      this.suspicion = Math.min(1, this.suspicion + rate * dt);
      alarm.feed(ALARM.guardSpotRate * (0.35 + 0.65 * closeness) * (player.sneaking ? 0.6 : 1), dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.memoryLeft = GUARD.memorySeconds;
      if (this.suspicion >= 1 && this.state !== 'chase') {
        this.state = 'chase';
        if (!this.shouted) { sound.spotted(); this.shouted = true; }
        alarm.spike(12);
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * (this.state === 'patrol' ? 0.3 : 0.16));
      if (this.memoryLeft > 0) this.memoryLeft -= dt;
    }

    // --- the catch: a touch from a guard who knows what he is seeing -----
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    if (distToPlayer < GUARD.catchDistance && this.suspicion > 0.45 && !player.hidden) {
      return 'caught';
    }

    // --- behaviour --------------------------------------------------------
    const speedScale = alarm.level >= 2 ? 1.16 : 1;
    if (this.state === 'chase') {
      this.repathLeft -= dt;
      if (this.seesPlayer || this.repathLeft <= 0) {
        this.setDestination(world, player.x, player.y);
        this.repathLeft = 0.4;
      }
      this.followPath(dt, GUARD.chaseSpeed * speedScale, world);
      if (!this.seesPlayer && this.memoryLeft <= 0) {
        this.state = 'search';
        this.suspicion = 0.55;
        if (this.lastSeen) this.setDestination(world, this.lastSeen.x, this.lastSeen.y);
        this.waitLeft = 0;
      }
    } else if (this.state === 'search' || this.state === 'investigate') {
      const arrived = this.followPath(dt, GUARD.investigateSpeed * speedScale, world);
      if (arrived) {
        this.waitLeft += dt;
        // Stand and sweep the room: the cone swings while he thinks.
        this.angle += Math.sin(this.waitLeft * 2.1 + this.lookPhase) * dt * 1.4;
        if (this.waitLeft > 1.6) {
          this.state = 'patrol';
          this.waitLeft = 0;
          this.suspicion = Math.min(this.suspicion, 0.3);
          this.shouted = false;
          const next = this.loop[this.waypoint];
          this.setDestination(world, next.x, next.y);
        }
      }
    } else {
      // patrol
      if (this.path.length === 0) {
        const next = this.loop[this.waypoint];
        this.setDestination(world, next.x, next.y);
      }
      const arrived = this.followPath(dt, GUARD.patrolSpeed * speedScale, world);
      if (arrived) {
        this.waitLeft += dt;
        this.angle += Math.sin(this.waitLeft * 1.3 + this.lookPhase) * dt * 0.7;
        if (this.waitLeft > 0.8) {
          this.waitLeft = 0;
          this.waypoint = (this.waypoint + 1) % this.loop.length;
          const next = this.loop[this.waypoint];
          this.setDestination(world, next.x, next.y);
        }
      }
      // A half-seen shape is worth a walk over, even on patrol.
      if (this.suspicion > 0.55 && this.lastSeen) {
        this.state = 'investigate';
        this.setDestination(world, this.lastSeen.x, this.lastSeen.y);
      }
    }
    return null;
  }

  // The vision cone as a polygon of pixel points, clipped by the walls.
  conePolygon(world) {
    const rays = 16;
    const points = [[this.x, this.y]];
    for (let i = 0; i <= rays; i++) {
      const a = this.angle - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / rays;
      points.push(this.castRay(a, world));
    }
    return points;
  }

  castRay(angle, world) {
    const step = TILE * 0.25;
    let d = step;
    while (d < GUARD.coneRange) {
      const x = this.x + Math.cos(angle) * d;
      const y = this.y + Math.sin(angle) * d;
      if (world.blocksSight(Math.floor(x / TILE), Math.floor(y / TILE))) {
        return [this.x + Math.cos(angle) * (d - step * 0.5), this.y + Math.sin(angle) * (d - step * 0.5)];
      }
      d += step;
    }
    return [this.x + Math.cos(angle) * GUARD.coneRange, this.y + Math.sin(angle) * GUARD.coneRange];
  }
}

export function makeGuards() {
  return PATROLS.map((p, i) => new Guard(p, i));
}
