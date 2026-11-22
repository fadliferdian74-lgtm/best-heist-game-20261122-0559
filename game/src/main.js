// The Gilded Hour — the night itself: boot, the planning table, the heist
// loop (move, work, hide, run), and the morning after. Every other module
// owns one job; this one owns the order they happen in.

import { TILE, NIGHT_SECONDS, HUD_HEIGHT, GEAR, GEAR_BUDGET } from './config.js';
import { ENTRIES, VAN, VAULT_DOOR, FRONT_DOOR } from './levels.js';
import { World, tileCenter } from './world.js';
import { Input } from './input.js';
import { SoundKit } from './audio.js';
import { Alarm } from './alarm.js';
import { CameraNet } from './cameras.js';
import { Guard, makeGuards } from './guards.js';
import { LootTable, doorChannel } from './loot.js';
import { Player } from './player.js';
import { paintStaticLayer, paintGame } from './render.js';
import { paintPlan, paintEnd, planLayout, inside } from './screens.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const input = new Input(canvas);
const sound = new SoundKit();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

// The planning table's state.
const plan = {
  entry: 'skylight',
  gear: new Set(['lockpick', 'cutter']),
};

let mode = 'plan';               // plan | heist | end
let game = null;                 // the live night, built by startHeist
let endResult = null;
let staticLayer = null;
let lastStamp = performance.now();

function gearLoadout() {
  return {
    lockpick: plan.gear.has('lockpick'),
    soles: plan.gear.has('soles'),
    cutter: plan.gear.has('cutter'),
    decoy: plan.gear.has('decoy') ? 3 : 0,
    emp: plan.gear.has('emp') ? 2 : 0,
    smoke: plan.gear.has('smoke') ? 2 : 0,
  };
}

function startHeist() {
  const world = new World();
  const entry = ENTRIES.find((e) => e.id === plan.entry) ?? ENTRIES[0];
  const start = tileCenter(entry.x, entry.y);
  const player = new Player(start.x, start.y, gearLoadout());
  if (entry.id === 'front') world.openDoor(FRONT_DOOR.x, FRONT_DOOR.y, 5);
  game = {
    world,
    player,
    guards: makeGuards(),
    cameras: new CameraNet(),
    loot: new LootTable(),
    alarm: new Alarm(sound),
    sound,
    time: 0,
    timeLeft: NIGHT_SECONDS,
    pings: [],
    coins: [],
    channel: null,
    prompt: null,
    responseSpawned: false,
    drillNoiseLeft: 0,
  };
  staticLayer = paintStaticLayer(world, game.loot);
  mode = 'heist';
  status.textContent = 'The heist is on. Reach the van in the loading bay with the loot.';
}

// ------------------------------------------------------------- planning --
function updatePlan() {
  if (input.clicked()) {
    sound.unlock();
    const layout = planLayout();
    for (const slot of layout.entries) {
      if (inside(input.mouse, slot.rect)) plan.entry = slot.id;
    }
    for (const slot of layout.gear) {
      if (inside(input.mouse, slot.rect)) {
        if (plan.gear.has(slot.id)) {
          plan.gear.delete(slot.id);
        } else {
          const def = GEAR.find((i) => i.id === slot.id);
          const spent = GEAR.filter((i) => plan.gear.has(i.id)).reduce((s, i) => s + i.cost, 0);
          if (def && spent + def.cost <= GEAR_BUDGET) plan.gear.add(slot.id);
        }
      }
    }
    if (inside(input.mouse, layout.start)) startHeist();
  }
  if (input.pressed('Enter')) {
    sound.unlock();
    startHeist();
  }
}

// --------------------------------------------------------------- heist ---
function nearestClosedDoor(player, world) {
  let best = null;
  let bestDist = 1.7 * TILE;
  for (const door of world.doors.values()) {
    if (door.open > 0.6) continue;
    const c = tileCenter(door.x, door.y);
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d < bestDist) { best = door; bestDist = d; }
  }
  return best;
}

function makeNoise(x, y, radius) {
  game.pings.push({ x, y, age: 0 });
  for (const guard of game.guards) guard.hearNoise({ x, y, radius }, game.world);
}

function finishChannel(channel) {
  const { player, world, loot, cameras, alarm } = game;
  if (channel.door) {
    const isVault = channel.door.x === VAULT_DOOR.x && channel.door.y === VAULT_DOOR.y;
    world.openDoor(channel.door.x, channel.door.y, isVault ? 3600 : 5);
    sound.doorCreak();
    sound.lockDone();
    return;
  }
  const item = channel.item;
  if (item.kind === 'panel') {
    cameras.blindFor(15);
    cameras.panelCooldown = 90;
    sound.empZap();
    return;
  }
  if (item.kind === 'glass' && !player.gear.cutter) {
    sound.glassSmash();
    alarm.spike(9);
    makeNoise(item.px, item.py, 175);
  } else if (item.kind === 'glass') {
    sound.glassCut();
  } else if (item.kind === 'cage' || item.kind === 'safe') {
    sound.lockDone();
  }
  player.take(item);
  sound.pickup();
  if (item.kind === 'keycard') status.textContent = 'Keycard taken. The vault door will open fast now.';
}

function updateChannel(dt) {
  const { player, world, loot, cameras } = game;
  game.prompt = null;
  game.channel = game.channel ?? null;

  // What could the thief work on from here?
  const item = loot.nearest(player, cameras);
  const door = nearestClosedDoor(player, world);
  let target = null;
  if (item && door) {
    const di = Math.hypot(item.px - player.x, item.py - player.y);
    const dd = Math.hypot(door.x * TILE + 16 - player.x, door.y * TILE + 16 - player.y);
    target = di <= dd ? { item } : { door };
  } else if (item) target = { item };
  else if (door) target = { door };

  if (!target) { game.channel = null; return; }

  const spec = target.item
    ? loot.channelFor(target.item, player)
    : doorChannel(target.door, player, VAULT_DOOR, FRONT_DOOR);
  const name = target.item ? target.item.name : (target.door.x === VAULT_DOOR.x && target.door.y === VAULT_DOOR.y ? 'The vault door' : 'A locked door');

  if (spec.seconds <= 0) {
    game.prompt = `${name}: ${spec.label}`;
    game.channel = null;
    return;
  }
  game.prompt = `[E] ${spec.label} — ${name}`;

  const sameTarget = game.channel
    && game.channel.item === target.item
    && game.channel.door === target.door;
  const moving = input.moveVector().x !== 0 || input.moveVector().y !== 0;
  if (input.held('KeyE') && !moving) {
    if (!sameTarget) {
      game.channel = { ...target, seconds: spec.seconds, progress: 0, drill: !!spec.drill };
    }
    game.channel.progress += dt / spec.seconds;
    if (game.channel.drill) {
      game.drillNoiseLeft -= dt;
      if (game.drillNoiseLeft <= 0) {
        sound.drillLoop();
        makeNoise(player.x, player.y, 150);
        game.drillNoiseLeft = 0.3;
      }
    }
    if (game.channel.progress >= 1) {
      finishChannel(game.channel);
      game.channel = null;
    }
  } else {
    game.channel = null;
  }
}

function updateTools() {
  const { player, cameras } = game;
  if (input.pressed('KeyQ') && player.gear.decoy > 0) {
    player.gear.decoy--;
    const dx = input.mouse.x - player.x;
    const dy = (input.mouse.y - HUD_HEIGHT) - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const reach = Math.min(dist, 230);
    game.coins.push({
      x: player.x + (dx / dist) * reach,
      y: player.y + (dy / dist) * reach,
      age: 0, pinged: false,
    });
  }
  if (input.pressed('KeyF') && player.gear.emp > 0) {
    player.gear.emp--;
    cameras.blindFor(8);
    sound.empZap();
  }
  if (input.pressed('Space') && player.gear.smoke > 0) {
    player.gear.smoke--;
    player.smokeLeft = 3;
    sound.smokePop();
  }
  if (input.pressed('KeyM')) sound.toggleMute();
}

function updateHeist(dt) {
  const { world, player, guards, cameras, loot, alarm } = game;
  game.time += dt;
  game.timeLeft -= dt;

  const stepped = player.update(dt, input, world);
  if (stepped === 'step' && player.noiseRadius > 0) {
    makeNoise(player.x, player.y, player.noiseRadius * 1.5);
  }

  updateTools();
  updateChannel(dt);

  // Coins land, ping once, and draw every ear in range.
  for (const coin of game.coins) {
    coin.age += dt;
    if (!coin.pinged && coin.age > 0.35) {
      coin.pinged = true;
      sound.coinPing();
      makeNoise(coin.x, coin.y, 135);
    }
  }
  game.coins = game.coins.filter((c) => c.age < 7);
  for (const ping of game.pings) ping.age += dt;
  game.pings = game.pings.filter((p) => p.age < 1.6);

  world.updateDoors(dt, [player, ...guards]);
  cameras.update(dt, player, world, alarm, game.time);

  // The response guard arrives the first time the hunt is on.
  if (alarm.level >= 2 && !game.responseSpawned) {
    game.responseSpawned = true;
    const guard = new Guard(
      { name: 'Response guard', loop: [[20, 18], [12, 18], [12, 8], [22, 8], [22, 18]] },
      0,
    );
    guards.push(guard);
    status.textContent = 'A second guard has come in through the lobby.';
  }

  for (const guard of guards) {
    if (guard.update(dt, world, player, alarm, sound) === 'caught') {
      endNight(false, 'caught');
      return;
    }
  }
  alarm.update(dt);

  // The van, and what it takes to leave.
  const tx = Math.floor(player.x / TILE), ty = Math.floor(player.y / TILE);
  const atVan = tx >= VAN.x && tx < VAN.x + VAN.w && ty >= VAN.y && ty < VAN.y + VAN.h;
  if (atVan && player.carriedValue > 0) {
    endNight(true, 'getaway');
    return;
  }
  if (atVan && player.carriedValue === 0) {
    game.prompt = 'The van is waiting — bring it something worth taking.';
  }
  if (alarm.lockdownExpired) {
    endNight(false, 'lockdown');
    return;
  }
  if (game.timeLeft <= 0) {
    endNight(false, 'dawn');
    return;
  }
}

function endNight(won, cause) {
  const { player, alarm } = game;
  endResult = {
    won,
    cause,
    lootValue: player.carriedValue,
    takenCount: player.takenNames.length,
    everRaised: alarm.everRaised,
    everHunting: alarm.everHunting,
    timeLeft: Math.max(0, game.timeLeft),
  };
  if (won) sound.getaway(); else sound.busted();
  mode = 'end';
  status.textContent = won ? 'A clean getaway.' : 'The night is over.';
}

// ---------------------------------------------------------------- loop ---
function refreshConeCaches() {
  if (!game) return;
  for (const guard of game.guards) guard.coneCache = guard.conePolygon(game.world);
  for (const cam of game.cameras.cameras) cam.coneCache = game.cameras.conePolygon(cam, game.world);
}

function frame(now) {
  const dt = Math.min(0.033, (now - lastStamp) / 1000 || 0.016);
  lastStamp = now;

  if (mode === 'plan') {
    if (!staticLayer) staticLayer = paintStaticLayer(new World(), null);
    updatePlan();
    paintPlan(ctx, plan, staticLayer, input.mouse);
  } else if (mode === 'heist') {
    if (!shot) updateHeist(dt);
    else game.time += dt;
    refreshConeCaches();
    paintGame(ctx, game, staticLayer);
  } else if (mode === 'end') {
    if (input.pressed('KeyR')) startHeist();
    if (input.pressed('Enter')) { mode = 'plan'; }
    refreshConeCaches();
    if (game) paintGame(ctx, game, staticLayer);
    paintEnd(ctx, endResult);
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

// ------------------------------------------------- screenshot staging ----
// ?shot=plan|heist|vault|getaway poses the game's own states for the
// maker's screenshots: real renders of the real code, nothing composited.
function stageShot() {
  if (shot === 'plan') {
    plan.entry = 'skylight';
    plan.gear = new Set(['lockpick', 'cutter', 'emp']);
    staticLayer = paintStaticLayer(new World(), null);
    mode = 'plan';
    return;
  }
  plan.gear = new Set(['lockpick', 'cutter', 'emp', 'decoy']);
  if (shot === 'getaway') {
    startHeist();
    endResult = {
      won: true, cause: 'getaway', lootValue: 47400, takenCount: 11,
      everRaised: true, everHunting: false, timeLeft: 74,
    };
    mode = 'end';
    return;
  }
  startHeist();
  const { player, guards, alarm } = game;
  if (shot === 'heist') {
    // Mid-gallery: the thief crosses under a sweeping camera while the
    // gallery guard's cone warms on him and the alarm bar climbs.
    const p = tileCenter(17, 7);
    player.x = p.x; player.y = p.y; player.angle = 0.5;
    player.carriedValue = 8400; player.carriedKg = 5;
    const g1 = guards[0];
    const gp = tileCenter(13, 4);
    g1.x = gp.x; g1.y = gp.y;
    g1.angle = Math.atan2(player.y - g1.y, player.x - g1.x) + 0.25;
    g1.suspicion = 0.55; g1.state = 'investigate';
    alarm.heat = 38; alarm.level = 1; alarm.everRaised = true;
    const cam = game.cameras.cameras[0];
    cam.facing = Math.atan2(player.y - cam.y, player.x - cam.x) + 0.15;
    cam.spotting = 0.85;
    game.timeLeft = 243;
  } else if (shot === 'vault') {
    // The drill is singing and the boutique guard is coming to listen.
    const p = tileCenter(30, 15);
    player.x = p.x; player.y = p.y; player.angle = 0;
    player.carriedValue = 15900; player.carriedKg = 7;
    game.channel = { door: game.world.doorAt(VAULT_DOOR.x, VAULT_DOOR.y), seconds: 4.5, progress: 0.6, drill: true };
    game.prompt = '[E] Drilling the vault door — The vault door';
    const g3 = guards[2];
    const gp = tileCenter(27, 13);
    g3.x = gp.x; g3.y = gp.y;
    g3.angle = Math.atan2(player.y - g3.y, player.x - g3.x);
    g3.suspicion = 0.7; g3.state = 'investigate';
    alarm.heat = 55; alarm.level = 2; alarm.everRaised = true; alarm.everHunting = true;
    game.timeLeft = 161;
  }
  mode = 'heist';
}

if (shot) stageShot();
requestAnimationFrame(frame);

// A handle for the maker's own automated playtests (and curious thieves):
// it changes nothing about the game, it only lets a test drive it.
window.__gildedHour = {
  plan,
  startHeist,
  get mode() { return mode; },
  get game() { return game; },
  get endResult() { return endResult; },
};
