// The Gilded Hour — everything that can be taken, and the taking of it.
// One table holds the paintings, the cash, the gems, the keycard and the
// camera panel; each entry knows where it sits, what it is worth, and how
// long its interaction channel runs for the thief's current gear.

import { TILE } from './config.js';
import { LOOT, KEYCARD, CAMERA_PANEL } from './levels.js';
import { tileCenter } from './world.js';

export class LootTable {
  constructor() {
    this.items = [];
    for (const def of LOOT) {
      const pos = tileCenter(def.x, def.y);
      this.items.push({ ...def, px: pos.x, py: pos.y, taken: false, isLoot: true });
    }
    const kc = tileCenter(KEYCARD.x, KEYCARD.y);
    this.items.push({ ...KEYCARD, px: kc.x, py: kc.y, value: 0, kg: 0, taken: false, isLoot: false });
    const panel = tileCenter(CAMERA_PANEL.x, CAMERA_PANEL.y);
    this.items.push({ ...CAMERA_PANEL, px: panel.x, py: panel.y, value: 0, kg: 0, taken: false, isLoot: false, reusable: true });
  }

  // The closest thing the thief can work on from where he stands, or null.
  // Reach is measured in tiles: display cases are worked from the tile
  // beside them, paintings from the floor beneath the wall they hang on.
  nearest(player, cameraNet) {
    let best = null;
    let bestDist = 1.75 * TILE;
    for (const item of this.items) {
      if (item.taken) continue;
      if (item.kind === 'panel' && cameraNet.panelCooldown > 0) continue;
      const d = Math.hypot(item.px - player.x, item.py - player.y);
      if (d < bestDist) { best = item; bestDist = d; }
    }
    return best;
  }

  // How long the E channel runs, and what it will cost the night.
  channelFor(item, player) {
    switch (item.kind) {
      case 'grab': return { seconds: 0.35, label: 'Taking' };
      case 'keycard': return { seconds: 0.3, label: 'Taking the keycard' };
      case 'panel': return { seconds: 0.8, label: 'Killing the cameras' };
      case 'cage': return { seconds: player.gear.lockpick ? 0.7 : 2.0, label: 'Picking the cage' };
      case 'safe':
        return player.hasKeycard
          ? { seconds: 1.8, label: 'Opening the safe' }
          : { seconds: 0, label: 'Locked: it wants the vault keycard' };
      case 'glass':
        return player.gear.cutter
          ? { seconds: 2.4, label: 'Cutting the glass', silent: true }
          : { seconds: 0.9, label: 'Smashing the case', loud: true };
      default: return { seconds: 0.5, label: 'Working' };
    }
  }

  remainingValue() {
    return this.items.filter((i) => i.isLoot && !i.taken).reduce((s, i) => s + i.value, 0);
  }

  totalValue() {
    return this.items.filter((i) => i.isLoot).reduce((s, i) => s + i.value, 0);
  }
}

// Door channel times, by door and by the thief's gear. The vault door is
// the night's centrepiece: a keycard spins it open, a lockpick worries it
// open, and bare hands drill it open — slowly, and loud the whole while.
export function doorChannel(door, player, vaultDoor, frontDoor) {
  const isVault = door.x === vaultDoor.x && door.y === vaultDoor.y;
  if (isVault) {
    if (player.hasKeycard) return { seconds: 1.2, label: 'Keycard: opening the vault', drill: false };
    if (player.gear.lockpick) return { seconds: 2.6, label: 'Picking the vault door', drill: true };
    return { seconds: 4.5, label: 'Drilling the vault door', drill: true };
  }
  void frontDoor;
  return player.gear.lockpick
    ? { seconds: 0.45, label: 'Picking the lock' }
    : { seconds: 1.3, label: 'Working the lock' };
}
