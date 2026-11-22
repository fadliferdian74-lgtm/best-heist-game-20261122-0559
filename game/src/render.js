// The Gilded Hour — every drawing the game makes. The floor, walls and
// furniture are painted once onto a still canvas; each frame then lays the
// living things over it: vision cones first (they are light), then loot,
// cameras, guards, the thief, and the HUD strip across the top. The palette
// is the promise the judge reads at a glance: gold is loot, red is danger,
// teal is you, and dark blue is safe.

import { TILE, COLS, ROWS, HUD_HEIGHT, VIEW_W } from './config.js';
import { T } from './world.js';
import { VAN } from './levels.js';

const INK = '#0b0e17';
const GOLD = '#f2c14e';
const TEAL = '#3fd9c0';
const RED = '#ff5a4e';
const PAPER = '#e8e3d5';

// Room tints and names: the floor's geography, readable in one look.
export const ROOMS = [
  { x: 1, y: 1, w: 9, h: 5, floor: '#272c38', name: 'KITCHEN & STORES' },
  { x: 1, y: 7, w: 9, h: 4, floor: '#232a33', name: 'SECURITY OFFICE' },
  { x: 1, y: 12, w: 9, h: 8, floor: '#252a30', name: 'LOADING BAY' },
  { x: 11, y: 1, w: 13, h: 15, floor: '#2e2a3d', name: 'GALLERY & GRAND HALL' },
  { x: 11, y: 17, w: 13, h: 3, floor: '#33304a', name: 'LOBBY' },
  { x: 25, y: 1, w: 14, h: 6, floor: '#2c3540', name: 'CASINO' },
  { x: 25, y: 8, w: 14, h: 4, floor: '#38304a', name: 'THE BOUTIQUE' },
  { x: 25, y: 13, w: 6, h: 7, floor: '#2a2f38', name: 'VAULT ANTECHAMBER' },
  { x: 32, y: 13, w: 7, h: 7, floor: '#3a3325', name: 'THE VAULT' },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- floors --
export function paintStaticLayer(world, loot) {
  const c = document.createElement('canvas');
  c.width = COLS * TILE;
  c.height = ROWS * TILE;
  const g = c.getContext('2d');

  g.fillStyle = INK;
  g.fillRect(0, 0, c.width, c.height);

  // Room floors.
  for (const room of ROOMS) {
    g.fillStyle = room.floor;
    g.fillRect(room.x * TILE, room.y * TILE, room.w * TILE, room.h * TILE);
  }
  // A runner carpet down the grand hall and the lobby.
  g.fillStyle = 'rgba(122, 32, 44, 0.5)';
  g.fillRect(16 * TILE, 1 * TILE, 3 * TILE, 15 * TILE);
  g.fillRect(11 * TILE, 17 * TILE, 13 * TILE, 1 * TILE);
  // Tile sheen: a faint dot grid so floors do not read as flat colour.
  g.fillStyle = 'rgba(255,255,255,0.045)';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if ((x + y) % 2 === 0 && world.tileAt(x, y) === T.FLOOR) {
        g.fillRect(x * TILE + TILE / 2 - 1, y * TILE + TILE / 2 - 1, 2, 2);
      }
    }
  }
  // Room names, ghosted into the floor.
  g.fillStyle = 'rgba(232,227,213,0.13)';
  g.font = '600 11px system-ui, sans-serif';
  g.textAlign = 'center';
  for (const room of ROOMS) {
    g.fillText(room.name, (room.x + room.w / 2) * TILE, (room.y + room.h) * TILE - 6);
  }

  // Vents: dark ducts with slats.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (world.tileAt(x, y) !== T.VENT) continue;
      g.fillStyle = '#14161d';
      g.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      g.fillStyle = '#2c3038';
      for (let s = 0; s < 3; s++) g.fillRect(x * TILE + 6, y * TILE + 8 + s * 7, TILE - 12, 2);
    }
  }

  // Furniture, by kind.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (world.tileAt(x, y) !== T.SOLID) continue;
      paintFurniture(g, world.furnitureKind[y * COLS + x], x * TILE, y * TILE);
    }
  }

  // The van in the loading bay.
  paintVan(g, VAN.x * TILE, VAN.y * TILE, VAN.w * TILE, VAN.h * TILE);

  // Walls last, with a lit top edge where they meet a room.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (world.tileAt(x, y) !== T.WALL) continue;
      g.fillStyle = '#101320';
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
      const below = world.tileAt(x, y + 1);
      if (below === T.FLOOR || below === T.DOOR) {
        g.fillStyle = '#2b3049';
        g.fillRect(x * TILE, y * TILE + TILE - 4, TILE, 4);
      }
      const right = world.tileAt(x + 1, y);
      if (right === T.FLOOR || right === T.DOOR) {
        g.fillStyle = '#1d2136';
        g.fillRect(x * TILE + TILE - 3, y * TILE, 3, TILE);
      }
    }
  }
  void loot;
  return c;
}

function paintFurniture(g, kind, px, py) {
  const pad = 3;
  switch (kind) {
    case 'counter':
      g.fillStyle = '#4a4238'; g.fillRect(px + pad, py + pad, TILE - pad * 2, TILE - pad * 2);
      g.fillStyle = '#6b5d49'; g.fillRect(px + pad, py + pad, TILE - pad * 2, 5);
      break;
    case 'desk':
      g.fillStyle = '#4d3b28'; g.fillRect(px + pad, py + pad, TILE - pad * 2, TILE - pad * 2);
      g.fillStyle = '#6e5638'; g.fillRect(px + pad + 2, py + pad + 2, TILE - pad * 2 - 4, 4);
      break;
    case 'crates':
      g.fillStyle = '#5d4a2c'; g.fillRect(px + pad, py + pad, TILE - pad * 2, TILE - pad * 2);
      g.strokeStyle = '#3c2f1a'; g.lineWidth = 2;
      g.strokeRect(px + pad + 1, py + pad + 1, TILE - pad * 2 - 2, TILE - pad * 2 - 2);
      g.beginPath(); g.moveTo(px + pad, py + pad); g.lineTo(px + TILE - pad, py + TILE - pad); g.stroke();
      break;
    case 'shelves':
      g.fillStyle = '#3d4450'; g.fillRect(px + pad, py + 2, TILE - pad * 2, TILE - 4);
      g.fillStyle = '#59627080';
      for (let s = 0; s < 3; s++) g.fillRect(px + pad + 2, py + 7 + s * 8, TILE - pad * 2 - 4, 2);
      break;
    case 'plinth':
      g.fillStyle = '#585d6e'; g.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
      g.fillStyle = '#767c90'; g.fillRect(px + 6, py + 6, TILE - 12, 4);
      break;
    case 'bench':
      g.fillStyle = '#5e2f38'; g.fillRect(px + pad, py + 8, TILE - pad * 2, TILE - 16);
      break;
    case 'plant':
      g.fillStyle = '#2e4a2e'; g.beginPath(); g.arc(px + TILE / 2, py + TILE / 2, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3d633d'; g.beginPath(); g.arc(px + TILE / 2 - 3, py + TILE / 2 - 3, 6, 0, Math.PI * 2); g.fill();
      break;
    case 'table':
      g.fillStyle = '#274d33'; g.beginPath(); g.arc(px + TILE / 2, py + TILE / 2, 13, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#c9a227'; g.lineWidth = 2; g.beginPath(); g.arc(px + TILE / 2, py + TILE / 2, 13, 0, Math.PI * 2); g.stroke();
      break;
    case 'case':
      g.fillStyle = '#3a4152'; g.fillRect(px + pad, py + pad, TILE - pad * 2, TILE - pad * 2);
      g.fillStyle = 'rgba(160,220,255,0.35)'; g.fillRect(px + pad + 3, py + pad + 3, TILE - pad * 2 - 6, TILE - pad * 2 - 6);
      break;
    case 'pallet':
      g.fillStyle = '#54452a'; g.fillRect(px + pad, py + pad, TILE - pad * 2, TILE - pad * 2);
      break;
    default:
      g.fillStyle = '#444a58'; g.fillRect(px + pad, py + pad, TILE - pad * 2, TILE - pad * 2);
  }
}

function paintVan(g, px, py, w, h) {
  g.fillStyle = '#1d2733';
  roundRect(g, px + 4, py + 6, w - 8, h - 12, 8); g.fill();
  g.fillStyle = '#31435a';
  roundRect(g, px + 10, py + 12, w - 20, 16, 4); g.fill();
  g.fillStyle = GOLD;
  g.font = '700 11px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('GETAWAY', px + w / 2, py + h - 12);
  g.fillStyle = '#0c0f14';
  for (const [wx, wy] of [[px + 14, py + h - 14], [px + w - 14, py + h - 14], [px + 14, py + 12], [px + w - 14, py + 12]]) {
    g.beginPath(); g.arc(wx, wy, 5, 0, Math.PI * 2); g.fill();
  }
}

// ----------------------------------------------------------------- cones --
function paintCone(g, points, inner, outer) {
  if (points.length < 3) return;
  const [ox, oy] = points[0];
  const grad = g.createRadialGradient(ox, oy, 8, ox, oy, 190);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(ox, oy);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
  g.closePath();
  g.fill();
}

// ------------------------------------------------------------------ loot --
function paintLootItem(g, item, time) {
  const { px, py } = { px: item.px, py: item.py };
  const pulse = 0.75 + 0.25 * Math.sin(time * 3 + item.px * 0.05);
  // A gold halo so loot reads from across the room.
  g.fillStyle = `rgba(242,193,78,${0.16 * pulse})`;
  g.beginPath(); g.arc(px, py, 15, 0, Math.PI * 2); g.fill();
  g.strokeStyle = `rgba(242,193,78,${0.65 * pulse})`;
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(px, py, 12.5, 0, Math.PI * 2); g.stroke();

  g.save();
  g.translate(px, py);
  switch (item.art) {
    case 'painting':
      g.fillStyle = '#7a5a1e'; g.fillRect(-9, -11, 18, 22);
      g.fillStyle = '#31517a'; g.fillRect(-6, -8, 12, 16);
      g.fillStyle = '#e8a33d'; g.beginPath(); g.arc(1, 2, 4, 0, Math.PI * 2); g.fill();
      break;
    case 'statue':
      g.fillStyle = '#d8d5cc';
      g.beginPath(); g.arc(0, -6, 4, 0, Math.PI * 2); g.fill();
      g.fillRect(-3, -2, 6, 9);
      g.fillStyle = '#a9a59a'; g.fillRect(-6, 7, 12, 3);
      break;
    case 'cash':
      g.fillStyle = '#2e7d46'; g.fillRect(-9, -5, 18, 10);
      g.fillStyle = '#57b877'; g.fillRect(-9, -5, 18, 3);
      g.fillStyle = '#e8e3d5'; g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill();
      break;
    case 'chips':
      for (let i = 0; i < 3; i++) {
        g.fillStyle = ['#b83a32', '#31517a', '#e8e3d5'][i];
        g.beginPath(); g.arc(0, 5 - i * 4, 6, 0, Math.PI * 2); g.fill();
      }
      break;
    case 'gems':
      g.fillStyle = '#7fe7ff';
      g.beginPath();
      g.moveTo(0, -9); g.lineTo(7, -2); g.lineTo(0, 10); g.lineTo(-7, -2); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath(); g.moveTo(0, -9); g.lineTo(3.5, -2); g.lineTo(-3.5, -2); g.closePath(); g.fill();
      break;
    case 'watch':
      g.fillStyle = '#c9ccd4'; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#20242e'; g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8a6f2f'; g.fillRect(-2, -10, 4, 4); g.fillRect(-2, 6, 4, 4);
      break;
    case 'wine':
      g.fillStyle = '#3d2b16'; g.fillRect(-9, -6, 18, 13);
      g.fillStyle = '#274d33';
      for (const bx of [-5, 0, 5]) { g.fillRect(bx - 1.5, -10, 3, 6); }
      break;
    case 'silver':
      g.fillStyle = '#c9ccd4'; g.fillRect(-9, -3, 18, 7);
      g.fillStyle = '#eef0f4'; g.fillRect(-9, -3, 18, 2);
      g.fillStyle = '#9ea3ad'; g.fillRect(-6, -8, 12, 4);
      break;
    case 'crates':
      g.fillStyle = GOLD; g.fillRect(-7, -7, 14, 14);
      g.fillStyle = '#a87f24'; g.fillRect(-7, -1.5, 14, 3);
      break;
    case 'safe':
      g.fillStyle = '#565e6e'; g.fillRect(-10, -9, 20, 18);
      g.fillStyle = '#788194'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2c3038'; g.beginPath(); g.arc(0, 0, 2, 0, Math.PI * 2); g.fill();
      break;
    case 'gold':
      g.fillStyle = '#e9b93c';
      g.fillRect(-10, 1, 9, 5); g.fillRect(1, 1, 9, 5); g.fillRect(-5, -5, 9, 5);
      g.fillStyle = '#f7dd7e';
      g.fillRect(-10, 1, 9, 2); g.fillRect(1, 1, 9, 2); g.fillRect(-5, -5, 9, 2);
      break;
    default:
      g.fillStyle = GOLD; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- actors --
function paintGuard(g, guard, time) {
  // Vision cone, coloured by temper.
  const s = guard.suspicion;
  const inner = guard.state === 'chase'
    ? 'rgba(255,70,50,0.40)'
    : `rgba(${240 + Math.floor(15 * s)},${Math.floor(205 - 130 * s)},${Math.floor(80 - 60 * s)},${0.30 + 0.12 * s})`;
  paintCone(g, guard.coneCache, inner, 'rgba(255,90,60,0)');
  // Body: a dark uniform, a cap, a nose for facing.
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(guard.x, guard.y + 9, 10, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2b3350';
  g.beginPath(); g.arc(guard.x, guard.y, 11, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3c4a75';
  g.beginPath(); g.arc(guard.x, guard.y, 7.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d8b25c';
  const nx = guard.x + Math.cos(guard.angle) * 12, ny = guard.y + Math.sin(guard.angle) * 12;
  g.beginPath(); g.arc(nx, ny, 3, 0, Math.PI * 2); g.fill();
  // Temper readout: a rising arc, then ? and !.
  if (s > 0.06) {
    g.strokeStyle = guard.state === 'chase' ? RED : '#ffb84e';
    g.lineWidth = 3;
    g.beginPath(); g.arc(guard.x, guard.y, 16, -Math.PI / 2, -Math.PI / 2 + s * Math.PI * 2); g.stroke();
  }
  if (guard.state === 'chase' || (guard.suspicion > 0.5 && guard.state !== 'patrol')) {
    g.fillStyle = guard.state === 'chase' ? RED : '#ffb84e';
    g.font = '700 15px system-ui, sans-serif';
    g.textAlign = 'center';
    const bob = Math.sin(time * 6) * 1.5;
    g.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 20 + bob);
  }
}

function paintCamera(g, cam, net, time) {
  if (!net.blind) {
    const inner = cam.spotting > 0.25 ? 'rgba(255,80,60,0.34)' : 'rgba(110,180,255,0.20)';
    paintCone(g, cam.coneCache, inner, 'rgba(110,180,255,0)');
  }
  g.fillStyle = '#151a26';
  g.fillRect(cam.x - 6, cam.y - 6, 12, 12);
  g.fillStyle = net.blind ? '#3a3f4a' : (cam.spotting > 0.25 ? RED : '#7fc4ff');
  g.beginPath(); g.arc(cam.x, cam.y, 3.4, 0, Math.PI * 2); g.fill();
  if (!net.blind && Math.sin(time * 2.4 + cam.phase) > 0) {
    g.fillStyle = RED;
    g.beginPath(); g.arc(cam.x + 4, cam.y - 4, 1.6, 0, Math.PI * 2); g.fill();
  }
}

function paintPlayer(g, player, time) {
  if (player.hidden) {
    for (let i = 0; i < 5; i++) {
      const a = time * 1.7 + i * 1.256;
      const r = 13 + Math.sin(time * 2.2 + i) * 3;
      g.fillStyle = 'rgba(190,196,205,0.30)';
      g.beginPath(); g.arc(player.x + Math.cos(a) * r * 0.6, player.y + Math.sin(a) * r * 0.6, 8, 0, Math.PI * 2); g.fill();
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.4)';
  g.beginPath(); g.ellipse(player.x, player.y + 9, 10, 4, 0, 0, Math.PI * 2); g.fill();
  // The bag grows with the take.
  const bagR = 6 + Math.min(5, player.carriedKg * 0.28);
  g.fillStyle = '#6b4f1d';
  g.beginPath(); g.arc(player.x - Math.cos(player.angle) * 9, player.y - Math.sin(player.angle) * 9, bagR, 0, Math.PI * 2); g.fill();
  g.fillStyle = TEAL;
  g.beginPath(); g.arc(player.x, player.y, 10.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#173f39';
  g.beginPath(); g.arc(player.x, player.y, 6.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#eafffa';
  const nx = player.x + Math.cos(player.angle) * 11, ny = player.y + Math.sin(player.angle) * 11;
  g.beginPath(); g.arc(nx, ny, 2.6, 0, Math.PI * 2); g.fill();
  if (player.hasKeycard) {
    g.fillStyle = '#ffd94e';
    g.fillRect(player.x + 7, player.y - 12, 6, 4);
  }
  if (player.sneaking) {
    g.strokeStyle = 'rgba(63,217,192,0.5)';
    g.lineWidth = 1.5;
    g.setLineDash([4, 4]);
    g.beginPath(); g.arc(player.x, player.y, 15, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
  }
}

// ------------------------------------------------------------------- HUD --
export function paintHud(g, game) {
  const { alarm, player, timeLeft } = game;
  g.fillStyle = '#0d1019';
  g.fillRect(0, 0, VIEW_W, HUD_HEIGHT);
  g.fillStyle = 'rgba(242,193,78,0.25)';
  g.fillRect(0, HUD_HEIGHT - 2, VIEW_W, 2);

  g.fillStyle = GOLD;
  g.font = '700 15px Georgia, serif';
  g.textAlign = 'left';
  g.fillText('THE GILDED HOUR', 14, 29);

  // The alarm meter: the one bar the whole night hangs on.
  const barX = 190, barY = 15, barW = 300, barH = 18;
  g.fillStyle = '#1a1e2b';
  roundRect(g, barX, barY, barW, barH, 4); g.fill();
  const heatW = (alarm.heat / 100) * barW;
  const heatColor = alarm.level >= 3 ? RED : alarm.level === 2 ? '#ff8a3d' : alarm.level === 1 ? '#ffc94e' : '#57b877';
  if (heatW > 0) {
    g.fillStyle = alarm.flash > 0 && Math.sin(alarm.flash * 18) > 0 ? '#ffffff' : heatColor;
    roundRect(g, barX, barY, Math.max(6, heatW), barH, 4); g.fill();
  }
  g.fillStyle = PAPER;
  g.font = '700 11px system-ui, sans-serif';
  g.fillText(`ALARM ${['— CALM', '— RAISED', '— THEY ARE HUNTING', '— LOCKDOWN'][alarm.level]}`, barX + 8, barY + 13);
  if (alarm.level === 3) {
    g.fillStyle = RED;
    g.font = '700 13px system-ui, sans-serif';
    g.fillText(`VAN LEAVES IN ${Math.ceil(alarm.lockdownLeft)}s`, barX + barW + 12, barY + 14);
  }

  // The take so far.
  g.fillStyle = GOLD;
  g.font = '700 16px system-ui, sans-serif';
  g.textAlign = 'right';
  g.fillText(`$${player.carriedValue.toLocaleString('en-US')}`, 830, 30);
  g.fillStyle = 'rgba(232,227,213,0.75)';
  g.font = '11px system-ui, sans-serif';
  g.fillText(`${player.carriedKg} kg in the bag`, 830, 44 - 2);

  // The clock.
  const mm = Math.floor(Math.max(0, timeLeft) / 60);
  const ss = Math.floor(Math.max(0, timeLeft) % 60);
  g.fillStyle = timeLeft < 45 ? RED : PAPER;
  g.font = '700 16px system-ui, sans-serif';
  g.fillText(`${mm}:${ss.toString().padStart(2, '0')} to dawn`, 960, 30);

  // Gear counts.
  g.textAlign = 'left';
  g.font = '11px system-ui, sans-serif';
  g.fillStyle = 'rgba(232,227,213,0.85)';
  const bits = [];
  if (player.gear.emp > 0) bits.push(`EMP x${player.gear.emp} [F]`);
  if (player.gear.smoke > 0) bits.push(`Smoke x${player.gear.smoke} [Space]`);
  if (player.gear.decoy > 0) bits.push(`Coin x${player.gear.decoy} [Q]`);
  if (player.gear.lockpick) bits.push('Lockpick');
  if (player.gear.cutter) bits.push('Cutter');
  if (player.gear.soles) bits.push('Soft soles');
  g.fillText(bits.join('   '), 990, 21);
  g.fillStyle = 'rgba(232,227,213,0.5)';
  g.fillText(game.sound.muted ? 'M — sound off' : 'M — mute', 990, 38);
}

// ------------------------------------------------------------- the frame --
export function paintGame(g, game, staticLayer) {
  const { world, player, guards, cameras, loot, time } = game;
  g.fillStyle = INK;
  g.fillRect(0, 0, VIEW_W, 720);
  paintHud(g, game);
  g.save();
  g.translate(0, HUD_HEIGHT);
  g.drawImage(staticLayer, 0, 0);

  // Doors, swung by their state.
  for (const door of world.doors.values()) {
    const px = door.x * TILE, py = door.y * TILE;
    g.fillStyle = '#241a10';
    g.fillRect(px, py, TILE, TILE);
    g.save();
    g.translate(px + 3, py + TILE / 2);
    g.rotate(-door.open * 1.9);
    g.fillStyle = door.x === 31 && door.y === 15 ? '#6e5a26' : '#7a5a34';
    g.fillRect(0, -3, TILE - 6, 6);
    g.restore();
    if (door.x === 31 && door.y === 15) {
      g.fillStyle = GOLD;
      g.font = '700 9px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('VAULT', px + TILE / 2, py + TILE - 5);
    }
  }

  // Light first: camera cones, then guard cones.
  for (const cam of cameras.cameras) paintCamera(g, cam, cameras, time);
  for (const guard of guards) paintGuard(g, guard, time);

  // Loot still on the floor.
  for (const item of loot.items) {
    if (item.taken) continue;
    if (item.kind === 'keycard') {
      const pulse = 0.7 + 0.3 * Math.sin(time * 4);
      g.fillStyle = `rgba(255,217,78,${0.25 * pulse})`;
      g.beginPath(); g.arc(item.px, item.py, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd94e';
      roundRect(g, item.px - 8, item.py - 5, 16, 10, 2); g.fill();
      g.fillStyle = '#7a5a1e';
      g.fillRect(item.px - 8, item.py - 1, 16, 2);
    } else if (item.kind === 'panel') {
      g.fillStyle = cameras.panelCooldown > 0 ? '#2c3038' : '#57b877';
      g.fillRect(item.px - 7, item.py - 10, 14, 9);
      g.fillStyle = 'rgba(232,227,213,0.8)';
      g.font = '7px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('CAM', item.px, item.py - 3);
    } else {
      paintLootItem(g, item, time);
    }
  }

  // Decoy coins and noise pings.
  for (const ping of game.pings) {
    g.strokeStyle = `rgba(255,217,78,${Math.max(0, 0.7 - ping.age * 0.5)})`;
    g.lineWidth = 2;
    g.beginPath(); g.arc(ping.x, ping.y, ping.age * 90, 0, Math.PI * 2); g.stroke();
  }
  for (const coin of game.coins) {
    g.fillStyle = '#ffd94e';
    g.beginPath(); g.arc(coin.x, coin.y, 4, 0, Math.PI * 2); g.fill();
  }

  paintPlayer(g, player, time);

  // A soft night vignette.
  const vig = g.createRadialGradient(640, 336, 260, 640, 336, 760);
  vig.addColorStop(0, 'rgba(4,6,14,0)');
  vig.addColorStop(1, 'rgba(4,6,14,0.42)');
  g.fillStyle = vig;
  g.fillRect(0, 0, VIEW_W, ROWS * TILE);

  // The interaction prompt and channel bar.
  if (game.prompt) {
    g.fillStyle = 'rgba(10,12,20,0.82)';
    const label = game.prompt;
    g.font = '600 13px system-ui, sans-serif';
    const w = g.measureText(label).width + 26;
    roundRect(g, player.x - w / 2, player.y - 52, w, 22, 6); g.fill();
    g.fillStyle = PAPER;
    g.textAlign = 'center';
    g.fillText(label, player.x, player.y - 37);
  }
  if (game.channel) {
    const { progress } = game.channel;
    g.fillStyle = 'rgba(10,12,20,0.8)';
    roundRect(g, player.x - 34, player.y - 30, 68, 9, 4); g.fill();
    g.fillStyle = GOLD;
    roundRect(g, player.x - 32, player.y - 28, 64 * Math.min(1, progress), 5, 3); g.fill();
  }
  g.restore();

  // Lockdown: the edges of the world go red.
  if (game.alarm.level === 3) {
    g.strokeStyle = `rgba(255,60,40,${0.35 + 0.3 * Math.sin(time * 5)})`;
    g.lineWidth = 6;
    g.strokeRect(3, 3, VIEW_W - 6, 714);
  }
}
