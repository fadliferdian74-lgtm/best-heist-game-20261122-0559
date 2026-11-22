// The Gilded Hour — the floor itself: tiles, walls, doors, vents, and the
// two questions everything else asks it — "can I stand there?" and "can I
// see through there?" — plus the pathfinding the guards patrol by.

import { TILE, COLS, ROWS } from './config.js';
import { GRID, FURNITURE } from './levels.js';

// Tile kinds after the level data is baked.
export const T = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,      // closed until opened; state lives in World.doors
  VENT: 3,      // thief only, and slow
  SOLID: 4,     // furniture
};

export class World {
  constructor() {
    this.tiles = new Uint8Array(COLS * ROWS);
    this.furnitureKind = new Array(COLS * ROWS).fill(null);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const ch = GRID[y][x];
        this.tiles[y * COLS + x] =
          ch === '#' ? T.WALL : ch === 'D' ? T.DOOR : ch === 'v' ? T.VENT : T.FLOOR;
      }
    }
    for (const f of FURNITURE) {
      for (let y = f.y; y < f.y + f.h; y++) {
        for (let x = f.x; x < f.x + f.w; x++) {
          this.tiles[y * COLS + x] = T.SOLID;
          this.furnitureKind[y * COLS + x] = f.kind;
        }
      }
    }
    // Door state by "x,y": { open: 0..1, timer } — doors swing and re-close.
    this.doors = new Map();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.tiles[y * COLS + x] === T.DOOR) {
          this.doors.set(x + ',' + y, { open: 0, timer: 0, x, y });
        }
      }
    }
  }

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return T.WALL;
    return this.tiles[y * COLS + x];
  }

  doorAt(x, y) {
    return this.doors.get(x + ',' + y) ?? null;
  }

  isDoorOpen(x, y) {
    const d = this.doorAt(x, y);
    return d !== null && d.open > 0.6;
  }

  openDoor(x, y, holdSeconds = 4) {
    const d = this.doorAt(x, y);
    if (d) {
      d.open = 1;
      d.timer = Math.max(d.timer, holdSeconds);
    }
  }

  // Doors ease shut again once nobody is standing in the frame.
  updateDoors(dt, occupants) {
    for (const d of this.doors.values()) {
      if (d.timer > 0) d.timer -= dt;
      const blocked = occupants.some(
        (o) => Math.floor(o.x / TILE) === d.x && Math.floor(o.y / TILE) === d.y,
      );
      if (d.timer <= 0 && !blocked && d.open > 0) d.open = Math.max(0, d.open - dt * 2.2);
      if (d.timer > 0 && d.open < 1) d.open = Math.min(1, d.open + dt * 3.2);
    }
  }

  // Can a body of this radius stand at pixel (px, py)? who: 'thief' | 'guard'
  canStand(px, py, radius, who) {
    const corners = [
      [px - radius, py - radius], [px + radius, py - radius],
      [px - radius, py + radius], [px + radius, py + radius],
    ];
    for (const [cx, cy] of corners) {
      const t = this.tileAt(Math.floor(cx / TILE), Math.floor(cy / TILE));
      if (t === T.WALL || t === T.SOLID) return false;
      if (t === T.DOOR) {
        const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
        if (!this.isDoorOpen(tx, ty)) return false;
      }
      if (t === T.VENT && who === 'guard') return false;
    }
    return true;
  }

  // Move a body, sliding along walls: try the full step, then each axis.
  moveBody(body, dx, dy, who) {
    if (this.canStand(body.x + dx, body.y + dy, body.radius, who)) {
      body.x += dx; body.y += dy;
      return;
    }
    if (this.canStand(body.x + dx, body.y, body.radius, who)) body.x += dx;
    if (this.canStand(body.x, body.y + dy, body.radius, who)) body.y += dy;
  }

  // Sight: a tile blocks the view if it is a wall, furniture, a closed door,
  // or a vent duct (the ducts run low, under the sight line's height).
  blocksSight(x, y) {
    const t = this.tileAt(x, y);
    if (t === T.WALL || t === T.SOLID || t === T.VENT) return true;
    if (t === T.DOOR) return !this.isDoorOpen(x, y);
    return false;
  }

  // Line of sight between two pixel points, walked on a fine grid (DDA).
  hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (TILE * 0.25)));
    let lastTx = -1, lastTy = -1;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor((x0 + dx * t) / TILE);
      const ty = Math.floor((y0 + dy * t) / TILE);
      if (tx === lastTx && ty === lastTy) continue;
      lastTx = tx; lastTy = ty;
      // The endpoints' own tiles never block: you can see out of your tile.
      if (this.blocksSight(tx, ty)) return false;
    }
    return true;
  }

  inVent(px, py) {
    return this.tileAt(Math.floor(px / TILE), Math.floor(py / TILE)) === T.VENT;
  }

  // Breadth-first path over tiles between two tile positions, for guards.
  // Doors count as passable (guards carry keys); vents and furniture do not.
  findPath(sx, sy, tx, ty) {
    if (sx === tx && sy === ty) return [];
    const key = (x, y) => y * COLS + x;
    const prev = new Map();
    const seen = new Set([key(sx, sy)]);
    const queue = [[sx, sy]];
    const passable = (x, y) => {
      const t = this.tileAt(x, y);
      return t === T.FLOOR || t === T.DOOR;
    };
    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        const k = key(nx, ny);
        if (seen.has(k) || !passable(nx, ny)) continue;
        seen.add(k);
        prev.set(k, [cx, cy]);
        if (nx === tx && ny === ty) {
          const path = [];
          let cur = [nx, ny];
          while (!(cur[0] === sx && cur[1] === sy)) {
            path.unshift(cur);
            cur = prev.get(key(cur[0], cur[1]));
          }
          return path;
        }
        queue.push([nx, ny]);
      }
    }
    return null; // unreachable
  }
}

export function tileCenter(x, y) {
  return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}
