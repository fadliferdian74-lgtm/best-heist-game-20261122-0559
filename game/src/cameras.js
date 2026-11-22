// The Gilded Hour — the camera net: wall cameras that pan back and forth,
// each throwing a cone of cold blue light. Stand in one and the alarm meter
// climbs; an EMP charge or the security-office panel blinds them all for a
// while, and the cones go dark.

import { TILE, CAMERA } from './config.js';
import { CAMERAS } from './levels.js';
import { tileCenter, angleDiff } from './world.js';

export class CameraNet {
  constructor() {
    this.cameras = CAMERAS.map((c, i) => {
      const pos = tileCenter(c.x, c.y);
      return {
        x: pos.x, y: pos.y, tileX: c.x, tileY: c.y,
        baseFacing: c.facing,
        facing: c.facing,
        phase: i * 1.37,          // desynchronise the pans
        spotting: 0,              // 0..1 how hard it is staring right now
      };
    });
    this.blindLeft = 0;           // seconds of EMP / panel blindness
    this.panelCooldown = 0;
  }

  blindFor(seconds) {
    this.blindLeft = Math.max(this.blindLeft, seconds);
  }

  get blind() {
    return this.blindLeft > 0;
  }

  update(dt, player, world, alarm, time) {
    if (this.blindLeft > 0) this.blindLeft -= dt;
    if (this.panelCooldown > 0) this.panelCooldown -= dt;
    for (const cam of this.cameras) {
      cam.facing = cam.baseFacing + Math.sin(time * CAMERA.sweepSpeed + cam.phase) * CAMERA.sweepArc;
      cam.spotting = Math.max(0, cam.spotting - dt * 2.5);
      if (this.blind || player.hidden) continue;
      if (this.sees(cam, player, world)) {
        // Cameras feed the shared alarm, faster the closer the thief is.
        const dist = Math.hypot(player.x - cam.x, player.y - cam.y);
        const closeness = 1 - dist / CAMERA.coneRange;
        alarm.feed(CAMERA.spotRate * (0.4 + 0.6 * closeness), dt);
        cam.spotting = Math.min(1, cam.spotting + dt * 3);
      }
    }
  }

  sees(cam, player, world) {
    const dx = player.x - cam.x, dy = player.y - cam.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAMERA.coneRange) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), cam.facing)) > CAMERA.coneHalfAngle) return false;
    if (world.inVent(player.x, player.y)) return false;
    return world.hasLineOfSight(cam.x, cam.y, player.x, player.y);
  }

  // The cone polygon for the renderer: march the fan and stop at walls.
  conePolygon(cam, world) {
    const rays = 14;
    const points = [[cam.x, cam.y]];
    for (let i = 0; i <= rays; i++) {
      const a = cam.facing - CAMERA.coneHalfAngle + (2 * CAMERA.coneHalfAngle * i) / rays;
      points.push(this.castRay(cam, a, world));
    }
    return points;
  }

  castRay(cam, angle, world) {
    const step = TILE * 0.25;
    let d = step;
    while (d < CAMERA.coneRange) {
      const x = cam.x + Math.cos(angle) * d;
      const y = cam.y + Math.sin(angle) * d;
      if (world.blocksSight(Math.floor(x / TILE), Math.floor(y / TILE))) {
        return [cam.x + Math.cos(angle) * (d - step * 0.5), cam.y + Math.sin(angle) * (d - step * 0.5)];
      }
      d += step;
    }
    return [cam.x + Math.cos(angle) * CAMERA.coneRange, cam.y + Math.sin(angle) * CAMERA.coneRange];
  }
}
