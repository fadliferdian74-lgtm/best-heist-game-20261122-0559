// The Gilded Hour — the Meridian Grand's ground floor, drawn as data.
//
// The grid is one character per tile:
//   #  wall            .  open floor        D  a door (locked to the thief)
//   v  a vent duct     =  furniture (stamped in from FURNITURE below)
//
// Rooms: kitchen and stores (north-west), the security office under it, the
// loading bay with the getaway van (south-west), the gallery and grand hall
// (centre), the lobby behind its own wall (south-centre), the casino
// (north-east), the jeweller's boutique under it, and the vault block in the
// south-east corner behind an antechamber.

export const GRID = [
  '########################################',
  '#.........#.............#..............#',
  '#.........#.............#..............#',
  '#.........v.............#..............#',
  '#.........#.............D..............#',
  '#.........#.............#..............#',
  '########D##.............#..............#',
  '#.........#.............####D###########',
  '#.........#.............#..............#',
  '#.........D.............D..............#',
  '#.........#.............#..............#',
  '####D######.............#..............#',
  '#.........#.............################',
  '#.........#.............#......v.......#',
  '#.........#.............#......#.......#',
  '#.........v.............#......D.......#',
  '#.........#####D#########......#.......#',
  '#.........#.............D......#.......#',
  '#.........#.............#......#.......#',
  '#.........#.............#......#.......#',
  '####################D###################',
];

// Solid furniture, in tile rectangles. It blocks feet and sight lines alike:
// casino tables, display plinths, counters, desks, crates.
export const FURNITURE = [
  { x: 1, y: 1, w: 4, h: 1, kind: 'counter' },   // kitchen counter
  { x: 6, y: 1, w: 3, h: 1, kind: 'counter' },   // kitchen counter
  { x: 4, y: 3, w: 2, h: 1, kind: 'counter' },   // kitchen island
  { x: 2, y: 7, w: 3, h: 1, kind: 'desk' },      // security desk
  { x: 6, y: 9, w: 3, h: 1, kind: 'desk' },      // security desk
  { x: 6, y: 13, w: 2, h: 2, kind: 'crates' },   // loading-bay crates
  { x: 2, y: 15, w: 2, h: 1, kind: 'crates' },   // loading-bay crates
  { x: 8, y: 16, w: 1, h: 3, kind: 'shelves' },  // loading-bay shelves
  { x: 13, y: 3, w: 1, h: 1, kind: 'plinth' },   // gallery plinths
  { x: 17, y: 3, w: 1, h: 1, kind: 'plinth' },
  { x: 21, y: 3, w: 1, h: 1, kind: 'plinth' },
  { x: 13, y: 8, w: 2, h: 1, kind: 'bench' },    // hall benches
  { x: 20, y: 8, w: 2, h: 1, kind: 'bench' },
  { x: 17, y: 12, w: 1, h: 1, kind: 'plinth' },
  { x: 13, y: 18, w: 3, h: 1, kind: 'desk' },    // concierge desk
  { x: 22, y: 17, w: 1, h: 1, kind: 'plant' },   // lobby plant
  { x: 27, y: 2, w: 2, h: 1, kind: 'table' },    // casino tables
  { x: 31, y: 2, w: 2, h: 1, kind: 'table' },
  { x: 35, y: 2, w: 2, h: 1, kind: 'table' },
  { x: 29, y: 4, w: 2, h: 1, kind: 'table' },
  { x: 33, y: 4, w: 2, h: 1, kind: 'table' },
  { x: 36, y: 5, w: 3, h: 1, kind: 'counter' },  // cash-cage counter
  { x: 26, y: 9, w: 3, h: 1, kind: 'case' },     // jewellery display cases
  { x: 31, y: 9, w: 3, h: 1, kind: 'case' },
  { x: 35, y: 9, w: 2, h: 1, kind: 'case' },
  { x: 27, y: 17, w: 2, h: 1, kind: 'desk' },    // antechamber desk
  { x: 34, y: 15, w: 2, h: 1, kind: 'pallet' },  // vault gold pallet
];

// Everything worth stealing. kind drives the interaction:
//   grab   — just take it          glass — a display case: smash it loud and
//   cage     quick, or cut it slow and silent with the glass cutter
//   safe   — needs the keycard     keycard — the keycard itself
export const LOOT = [
  { x: 12, y: 1, name: 'Sunset over Leonida Bay', value: 4200, kg: 3, kind: 'grab', art: 'painting' },
  { x: 22, y: 1, name: 'Portrait of the Founder', value: 3800, kg: 3, kind: 'grab', art: 'painting' },
  { x: 17, y: 3, name: 'The Marble Muse', value: 6000, kg: 8, kind: 'grab', art: 'statue' },
  { x: 11, y: 7, name: 'Harbour Lights, 1911', value: 2600, kg: 2, kind: 'grab', art: 'painting' },
  { x: 23, y: 12, name: 'Study in Gold Leaf', value: 3100, kg: 2, kind: 'grab', art: 'painting' },
  { x: 37, y: 1, name: 'The cash cage', value: 5500, kg: 2, kind: 'cage', art: 'cash' },
  { x: 30, y: 4, name: 'A tower of house chips', value: 3000, kg: 1, kind: 'grab', art: 'chips' },
  { x: 34, y: 2, name: 'Roulette cash box', value: 1800, kg: 1, kind: 'grab', art: 'cash' },
  { x: 27, y: 9, name: 'The Meridian Star necklace', value: 7500, kg: 1, kind: 'glass', art: 'gems' },
  { x: 32, y: 9, name: 'A tray of cut sapphires', value: 4800, kg: 1, kind: 'glass', art: 'gems' },
  { x: 35, y: 9, name: 'Chronograph watch case', value: 3900, kg: 2, kind: 'glass', art: 'watch' },
  { x: 2, y: 1, name: 'Vintage wine, a full crate', value: 1500, kg: 4, kind: 'grab', art: 'wine' },
  { x: 7, y: 1, name: 'The silver service', value: 2100, kg: 5, kind: 'grab', art: 'silver' },
  { x: 6, y: 13, name: 'Smuggled watch crates', value: 2800, kg: 6, kind: 'grab', art: 'crates' },
  { x: 22, y: 18, name: "The manager's safe", value: 6800, kg: 3, kind: 'safe', art: 'safe' },
  { x: 34, y: 15, name: 'Gold bars, a stacked pallet', value: 9000, kg: 10, kind: 'grab', art: 'gold' },
  { x: 36, y: 18, name: 'The Gilded Hour diamond', value: 12000, kg: 1, kind: 'grab', art: 'gems' },
  { x: 33, y: 13, name: 'Bearer bonds, banded', value: 7000, kg: 1, kind: 'grab', art: 'cash' },
];

export const KEYCARD = { x: 3, y: 8, name: 'Vault keycard', kind: 'keycard' };

// The camera panel on the security-office wall: one visit blinds the whole
// camera net for 15 seconds (then it needs 90 seconds to be usable again).
export const CAMERA_PANEL = { x: 5, y: 7, kind: 'panel', name: 'Camera panel' };

// Guard patrols, as loops of tile waypoints. Guards path between them on
// their own; the vault guard never leaves the vault block on patrol.
export const PATROLS = [
  { name: 'Gallery guard', loop: [[12, 2], [22, 2], [22, 13], [12, 13]] },
  { name: 'Casino guard', loop: [[26, 5], [35, 5], [37, 1], [26, 1]] },
  { name: 'Boutique guard', loop: [[26, 10], [23, 10], [23, 14], [29, 14], [29, 18], [26, 18]] },
  { name: 'House guard', loop: [[2, 8], [8, 8], [8, 13], [5, 13], [5, 18], [2, 18]] },
  { name: 'Vault guard', loop: [[33, 14], [37, 14], [37, 18], [33, 18]] },
];

// Security cameras: a wall tile, the way it faces at rest (radians), and how
// far it pans to either side.
export const CAMERAS = [
  { x: 23, y: 1, facing: Math.PI / 2 },
  { x: 38, y: 1, facing: Math.PI * 0.8 },
  { x: 25, y: 8, facing: 0 },
  { x: 11, y: 17, facing: 0 },
  { x: 9, y: 12, facing: Math.PI },
];

// Three ways in. The van waits in the loading bay either way: the night ends
// by reaching it with something in the bag.
export const ENTRIES = [
  { id: 'front', name: 'The front doors', x: 20, y: 19, blurb: 'Bold. Straight into the lobby, past its camera.' },
  { id: 'alley', name: 'The service alley', x: 2, y: 18, blurb: 'Quiet. Into the loading bay, beside the van.' },
  { id: 'skylight', name: 'The gallery skylight', x: 17, y: 1, blurb: 'Down a rope into the gallery, among the paintings.' },
];

export const VAN = { x: 2, y: 17, w: 2, h: 2 }; // the getaway van's tiles

export const VAULT_DOOR = { x: 31, y: 15 };
export const FRONT_DOOR = { x: 20, y: 20 };
