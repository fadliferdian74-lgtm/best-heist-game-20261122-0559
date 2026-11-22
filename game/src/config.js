// The Gilded Hour — tuning constants for one night at the Meridian Grand.
// Every number the rest of the game argues about lives here.

export const TILE = 32;                 // pixels per floor tile
export const COLS = 40;                  // floor width in tiles
export const ROWS = 21;                  // floor height in tiles
export const HUD_HEIGHT = 48;            // the status strip across the top
export const VIEW_W = COLS * TILE;       // 1280
export const VIEW_H = ROWS * TILE + HUD_HEIGHT; // 720

export const NIGHT_SECONDS = 360;        // six minutes until dawn

export const PLAYER = {
  walkSpeed: 152,        // px/s on foot
  sneakSpeed: 84,        // px/s holding Shift
  radius: 11,
  walkNoise: 48,         // px hearing radius while walking
  sneakNoise: 0,         // silent while sneaking
  carrySlowPerKg: 0.02,  // fraction of speed lost per kilo carried
  carrySlowMax: 0.45,    // never slower than 55% from weight
  reach: 44,             // px interaction reach
};

export const GUARD = {
  patrolSpeed: 62,
  investigateSpeed: 96,
  chaseSpeed: 138,
  radius: 12,
  coneRange: 178,
  coneHalfAngle: 0.92,   // ~53 degrees each side
  turnRate: 2.6,         // rad/s while patrolling
  chaseTurnRate: 4.4,
  catchDistance: 24,     // px: a touch while alerted ends the night
  memorySeconds: 3.2,    // how long a lost thief is hunted
  hearRadiusBonus: 10,
};

export const CAMERA = {
  coneRange: 158,
  coneHalfAngle: 0.62,
  sweepArc: 0.85,        // radians either side of its base facing
  sweepSpeed: 0.55,      // rad/s
  spotRate: 26,          // heat per second at point blank
};

export const ALARM = {
  guardSpotRate: 46,     // heat per second, scaled by range and cover
  decayPerSecond: 5.5,   // heat lost while unseen
  levelTwoAt: 40,
  levelThreeAt: 75,
  lockdownSeconds: 45,   // escape window once level 3 trips
};

export const GEAR_BUDGET = 6;

// The loadout shelf: every tool costs points, and points are the plan's cost.
export const GEAR = [
  { id: 'lockpick', name: 'Lockpick kit', cost: 1, key: '', blurb: 'Doors open in a third of the time.' },
  { id: 'soles', name: 'Padded soles', cost: 1, key: '', blurb: 'Walking makes no sound at all.' },
  { id: 'decoy', name: 'Decoy coins x3', cost: 1, key: 'Q', blurb: 'Throw a coin: guards go and look.' },
  { id: 'emp', name: 'EMP charges x2', cost: 2, key: 'F', blurb: 'Blind every camera for 8 seconds.' },
  { id: 'smoke', name: 'Smoke pellets x2', cost: 2, key: 'Space', blurb: 'Vanish: breaks every line of sight.' },
  { id: 'cutter', name: 'Glass cutter', cost: 2, key: '', blurb: 'Display cases open silently, no smash.' },
];
