// The Gilded Hour — the two still screens: the planning table, where the
// night is won before it starts, and the morning-after panel that scores
// it. The plan screen lays the whole floor out as a blueprint, sells the
// tools at their point costs, and takes the entry choice; the end screen
// reads the haul back, bonus by bonus.

import { VIEW_W, GEAR, GEAR_BUDGET } from './config.js';
import { ENTRIES } from './levels.js';

const GOLD = '#f2c14e';
const PAPER = '#e8e3d5';
const TEAL = '#3fd9c0';
const RED = '#ff5a4e';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The plan screen's clickable geometry, shared by the painter and the
// mouse handler so they can never disagree.
export function planLayout() {
  const entries = ENTRIES.map((e, i) => ({
    id: e.id,
    rect: { x: 40 + i * 232, y: 596, w: 216, h: 62 },
  }));
  const gear = GEAR.map((item, i) => ({
    id: item.id,
    rect: { x: 748, y: 148 + i * 62, w: 492, h: 52 },
  }));
  return {
    map: { x: 40, y: 128, w: 664, h: 348 },
    entries,
    gear,
    start: { x: 748, y: 596, w: 492, h: 62 },
  };
}

export function paintPlan(g, plan, staticLayer, mouse) {
  const layout = planLayout();
  g.fillStyle = '#0b0e17';
  g.fillRect(0, 0, VIEW_W, 720);

  g.fillStyle = GOLD;
  g.font = '700 40px Georgia, serif';
  g.textAlign = 'left';
  g.fillText('THE GILDED HOUR', 40, 62);
  g.fillStyle = 'rgba(232,227,213,0.8)';
  g.font = '15px Georgia, serif';
  g.fillText('One night at the Meridian Grand. Plan it, work it, vanish.', 42, 90);
  g.font = '600 12px system-ui, sans-serif';
  g.fillStyle = 'rgba(232,227,213,0.55)';
  g.fillText('THE FLOOR — GUARDS PATROL, CAMERAS PAN, THE VAULT SITS SOUTH-EAST', 40, 118);

  // The blueprint: the real floor, shrunk.
  g.save();
  g.translate(layout.map.x, layout.map.y);
  g.scale(layout.map.w / 1280, layout.map.h / 672);
  g.drawImage(staticLayer, 0, 0);
  g.restore();
  g.strokeStyle = 'rgba(242,193,78,0.4)';
  g.lineWidth = 1.5;
  g.strokeRect(layout.map.x, layout.map.y, layout.map.w, layout.map.h);

  // Ways in.
  g.fillStyle = 'rgba(232,227,213,0.55)';
  g.font = '600 12px system-ui, sans-serif';
  g.fillText('CHOOSE THE WAY IN', 40, 586);
  for (const slot of layout.entries) {
    const def = ENTRIES.find((e) => e.id === slot.id);
    const chosen = plan.entry === slot.id;
    const hover = inside(mouse, slot.rect);
    g.fillStyle = chosen ? 'rgba(63,217,192,0.16)' : hover ? 'rgba(232,227,213,0.08)' : 'rgba(232,227,213,0.04)';
    roundRect(g, slot.rect.x, slot.rect.y, slot.rect.w, slot.rect.h, 8); g.fill();
    g.strokeStyle = chosen ? TEAL : 'rgba(232,227,213,0.25)';
    g.lineWidth = chosen ? 2 : 1;
    roundRect(g, slot.rect.x, slot.rect.y, slot.rect.w, slot.rect.h, 8); g.stroke();
    g.fillStyle = chosen ? TEAL : PAPER;
    g.font = '700 14px system-ui, sans-serif';
    g.textAlign = 'left';
    g.fillText(def.name, slot.rect.x + 12, slot.rect.y + 23);
    g.fillStyle = 'rgba(232,227,213,0.65)';
    g.font = '11px system-ui, sans-serif';
    wrapText(g, def.blurb, slot.rect.x + 12, slot.rect.y + 41, slot.rect.w - 24, 13);
  }

  // The gear shelf.
  const spent = GEAR.filter((item) => plan.gear.has(item.id)).reduce((s, i) => s + i.cost, 0);
  g.fillStyle = 'rgba(232,227,213,0.55)';
  g.font = '600 12px system-ui, sans-serif';
  g.fillText(`GEAR — ${GEAR_BUDGET - spent} OF ${GEAR_BUDGET} POINTS LEFT`, 748, 118);
  for (const slot of layout.gear) {
    const def = GEAR.find((i) => i.id === slot.id);
    const owned = plan.gear.has(slot.id);
    const afford = owned || def.cost <= GEAR_BUDGET - spent;
    const hover = inside(mouse, slot.rect);
    g.fillStyle = owned ? 'rgba(242,193,78,0.14)' : hover && afford ? 'rgba(232,227,213,0.08)' : 'rgba(232,227,213,0.04)';
    roundRect(g, slot.rect.x, slot.rect.y, slot.rect.w, slot.rect.h, 8); g.fill();
    g.strokeStyle = owned ? GOLD : 'rgba(232,227,213,0.22)';
    g.lineWidth = owned ? 2 : 1;
    roundRect(g, slot.rect.x, slot.rect.y, slot.rect.w, slot.rect.h, 8); g.stroke();
    g.globalAlpha = afford || owned ? 1 : 0.45;
    g.fillStyle = owned ? GOLD : PAPER;
    g.font = '700 14px system-ui, sans-serif';
    g.fillText(`${def.name}${def.key ? `  [${def.key}]` : ''}`, slot.rect.x + 14, slot.rect.y + 22);
    g.fillStyle = 'rgba(232,227,213,0.65)';
    g.font = '11px system-ui, sans-serif';
    g.fillText(def.blurb, slot.rect.x + 14, slot.rect.y + 40);
    g.fillStyle = owned ? GOLD : 'rgba(232,227,213,0.7)';
    g.font = '700 13px system-ui, sans-serif';
    g.textAlign = 'right';
    g.fillText(owned ? 'PACKED' : `${def.cost} pt`, slot.rect.x + slot.rect.w - 14, slot.rect.y + 31);
    g.textAlign = 'left';
    g.globalAlpha = 1;
  }

  // The start.
  const hoverStart = inside(mouse, layout.start);
  g.fillStyle = hoverStart ? '#ffd970' : GOLD;
  roundRect(g, layout.start.x, layout.start.y, layout.start.w, layout.start.h, 8); g.fill();
  g.fillStyle = '#14100a';
  g.font = '700 19px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('BEGIN THE HEIST', layout.start.x + layout.start.w / 2, layout.start.y + 39);
  g.fillStyle = 'rgba(232,227,213,0.5)';
  g.font = '11px system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillText('WASD move · Shift sneak · E work · the van waits in the loading bay', 748, 580);
}

export function inside(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function wrapText(g, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (g.measureText(trial).width > maxWidth && line) {
      g.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = trial;
    }
  }
  if (line) g.fillText(line, x, yy);
}

// -------------------------------------------------------------- the end --
export function scoreBreakdown(result) {
  const lines = [{ label: `Loot carried out (${result.takenCount} pieces)`, value: result.lootValue }];
  let total = result.lootValue;
  if (result.won) {
    if (!result.everRaised) { lines.push({ label: 'Ghost bonus — never even raised the alarm', value: 5000 }); total += 5000; }
    if (!result.everHunting) { lines.push({ label: 'Cool head — they never hunted you', value: 2500 }); total += 2500; }
    const timeBonus = Math.floor(Math.max(0, result.timeLeft)) * 10;
    if (timeBonus > 0) { lines.push({ label: 'Time to spare', value: timeBonus }); total += timeBonus; }
  }
  return { lines, total };
}

export function rankTitle(total, won) {
  if (!won) return 'A cautionary tale';
  if (total >= 60000) return 'Legend of the Meridian';
  if (total >= 42000) return 'Master thief';
  if (total >= 24000) return 'A professional';
  if (total >= 10000) return 'An opportunist';
  if (total > 0) return 'Smash-and-grab';
  return 'Empty-handed';
}

export function paintEnd(g, result) {
  g.fillStyle = 'rgba(5,7,12,0.88)';
  g.fillRect(0, 0, VIEW_W, 720);
  const { lines, total } = scoreBreakdown(result);
  const panelW = 560;
  const panelH = 150 + lines.length * 30 + 120;
  const px = (VIEW_W - panelW) / 2;
  const py = (720 - panelH) / 2;
  g.fillStyle = '#12151f';
  roundRect(g, px, py, panelW, panelH, 14); g.fill();
  g.strokeStyle = result.won ? GOLD : RED;
  g.lineWidth = 2;
  roundRect(g, px, py, panelW, panelH, 14); g.stroke();

  g.textAlign = 'center';
  g.fillStyle = result.won ? GOLD : RED;
  g.font = '700 34px Georgia, serif';
  const headline = result.won ? 'A CLEAN GETAWAY' : result.cause === 'dawn' ? 'DAWN BROKE' : 'BUSTED';
  g.fillText(headline, VIEW_W / 2, py + 58);
  g.fillStyle = 'rgba(232,227,213,0.75)';
  g.font = '13px Georgia, serif';
  const sub = result.won
    ? 'The van is gone before the first guest wakes.'
    : result.cause === 'dawn'
      ? 'The night ended with the bag still inside.'
      : 'A guard got a hand on you. The Meridian keeps its gold.';
  g.fillText(sub, VIEW_W / 2, py + 82);

  let y = py + 122;
  g.font = '13px system-ui, sans-serif';
  for (const line of lines) {
    g.fillStyle = 'rgba(232,227,213,0.8)';
    g.textAlign = 'left';
    g.fillText(line.label, px + 36, y);
    g.fillStyle = GOLD;
    g.textAlign = 'right';
    g.fillText(`$${line.value.toLocaleString('en-US')}`, px + panelW - 36, y);
    y += 30;
  }
  g.fillStyle = 'rgba(242,193,78,0.3)';
  g.fillRect(px + 36, y - 16, panelW - 72, 1);
  g.font = '700 17px system-ui, sans-serif';
  g.fillStyle = PAPER;
  g.textAlign = 'left';
  g.fillText('THE NIGHT PAYS', px + 36, y + 12);
  g.fillStyle = GOLD;
  g.textAlign = 'right';
  g.fillText(result.won ? `$${total.toLocaleString('en-US')}` : '$0 — it stays in the vault', px + panelW - 36, y + 12);

  g.textAlign = 'center';
  g.fillStyle = TEAL;
  g.font = '700 15px Georgia, serif';
  g.fillText(rankTitle(total, result.won), VIEW_W / 2, y + 48);
  g.fillStyle = 'rgba(232,227,213,0.55)';
  g.font = '12px system-ui, sans-serif';
  g.fillText('Press R to run the night again · Enter for a new plan', VIEW_W / 2, y + 74);
}
