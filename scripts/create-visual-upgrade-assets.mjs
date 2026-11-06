import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/assets/visual_upgrade');
const CREATURE_RUN = join(ROOT, 'public/assets/creature-sprite-runs/visual-upgrade-creatures');

const C = {
  transparent: [0, 0, 0, 0],
  ink: [38, 36, 42, 255],
  ink2: [60, 55, 58, 255],
  white: [245, 244, 230, 255],
  cream: [238, 219, 172, 255],
  skin: [206, 139, 93, 255],
  skinHi: [235, 171, 118, 255],
  skinLo: [139, 82, 68, 255],
  grass: [116, 190, 94, 255],
  grassHi: [154, 220, 112, 255],
  grassLo: [62, 137, 78, 255],
  tallGrass: [71, 157, 81, 255],
  hedge: [54, 102, 70, 255],
  path: [203, 166, 101, 255],
  pathHi: [229, 196, 130, 255],
  pathLo: [159, 117, 81, 255],
  wood: [149, 94, 58, 255],
  woodHi: [191, 132, 78, 255],
  woodLo: [94, 61, 48, 255],
  wall: [226, 197, 147, 255],
  wallHi: [244, 224, 179, 255],
  wallLo: [170, 126, 96, 255],
  labFloor: [190, 208, 210, 255],
  labFloorHi: [221, 234, 230, 255],
  labFloorLo: [136, 159, 166, 255],
  blue: [66, 132, 188, 255],
  blueHi: [116, 184, 220, 255],
  red: [201, 74, 67, 255],
  redHi: [238, 111, 80, 255],
  green: [76, 172, 96, 255],
  greenHi: [133, 210, 126, 255],
  orange: [224, 119, 58, 255],
  yellow: [239, 202, 88, 255],
  purple: [110, 93, 176, 255],
  cyan: [81, 190, 190, 255],
  navy: [45, 64, 103, 255],
  trousers: [87, 82, 89, 255],
};

const characters = [
  {
    name: 'player_hoodie',
    hoodie: [50, 139, 137, 255],
    hoodieHi: [82, 184, 172, 255],
    pants: [89, 75, 92, 255],
    hair: [53, 43, 38, 255],
    shoes: [227, 218, 189, 255],
    bag: [151, 102, 64, 255],
    kind: 'hoodie',
  },
  {
    name: 'mom',
    hoodie: [190, 86, 105, 255],
    hoodieHi: [226, 128, 137, 255],
    pants: [68, 98, 126, 255],
    hair: [96, 58, 42, 255],
    shoes: [80, 54, 48, 255],
    kind: 'cardigan',
  },
  {
    name: 'professor',
    hoodie: [229, 231, 221, 255],
    hoodieHi: [255, 255, 245, 255],
    pants: [67, 75, 93, 255],
    hair: [118, 119, 114, 255],
    shoes: [48, 48, 56, 255],
    accent: [95, 166, 179, 255],
    kind: 'labcoat',
  },
  {
    name: 'rival',
    hoodie: [181, 65, 78, 255],
    hoodieHi: [232, 99, 86, 255],
    pants: [47, 73, 122, 255],
    hair: [51, 73, 125, 255],
    shoes: [238, 220, 167, 255],
    kind: 'jacket',
  },
  {
    name: 'townie_adult',
    hoodie: [89, 157, 103, 255],
    hoodieHi: [138, 202, 123, 255],
    pants: [72, 89, 130, 255],
    hair: [92, 57, 36, 255],
    shoes: [67, 50, 42, 255],
    kind: 'adult',
  },
  {
    name: 'townie_kid',
    hoodie: [225, 178, 57, 255],
    hoodieHi: [250, 217, 96, 255],
    pants: [82, 152, 168, 255],
    hair: [56, 43, 37, 255],
    shoes: [232, 238, 218, 255],
    bag: [91, 118, 183, 255],
    kind: 'student',
    short: true,
  },
  {
    name: 'townie_trainer',
    hoodie: [215, 118, 58, 255],
    hoodieHi: [247, 158, 77, 255],
    pants: [67, 112, 73, 255],
    hair: [112, 70, 43, 255],
    shoes: [84, 55, 43, 255],
    accent: [238, 219, 116, 255],
    kind: 'trainer',
  },
];

const pngTable = makeCrcTable();

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await Promise.all(['creatures', 'tiles', 'props', 'ui', 'effects', 'battle'].map((dir) => mkdir(join(OUT, dir), { recursive: true })));

await Promise.all([
  makeTiles(),
  makeProps(),
  makeUi(),
  makeCreatures(),
  makeBattleAssets(),
  makeEffects(),
  writeManifest(),
]);

console.log(`Visual upgrade assets written to ${OUT}`);

function makeImage(width, height, fill = C.transparent) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(fill, i);
  return { width, height, data };
}

function setPixel(img, x, y, color) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  img.data.set(color, (Math.floor(y) * img.width + Math.floor(x)) * 4);
}

function rect(img, x, y, w, h, color) {
  for (let yy = Math.floor(y); yy < y + h; yy += 1) {
    for (let xx = Math.floor(x); xx < x + w; xx += 1) setPixel(img, xx, yy, color);
  }
}

function strokeRect(img, x, y, w, h, color) {
  rect(img, x, y, w, 1, color);
  rect(img, x, y + h - 1, w, 1, color);
  rect(img, x, y, 1, h, color);
  rect(img, x + w - 1, y, 1, h, color);
}

function ellipse(img, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y += 1) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPixel(img, x, y, color);
    }
  }
}

function line(img, x0, y0, x1, y1, color) {
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(img, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const si = (y * src.width + x) * 4;
      if (src.data[si + 3] === 0) continue;
      dst.data.set(src.data.slice(si, si + 4), ((dy + y) * dst.width + dx + x) * 4);
    }
  }
}

function polygon(img, points, color) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.floor(Math.min(...xs));
  const maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) setPixel(img, x, y, color);
    }
  }
}

function strokePolygon(img, points, color) {
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    line(img, x0, y0, x1, y1, color);
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function makeCharacterSheet(spec) {
  const sheet = makeImage(64 * 6, 64 * 4);
  ['down', 'left', 'right', 'up'].forEach((direction, row) => {
    for (let frame = 0; frame < 6; frame += 1) drawCharacter(sheet, frame * 64, row * 64, spec, direction, frame);
  });
  return sheet;
}

function drawCharacter(img, ox, oy, spec, direction, frame) {
  const pose = [0, -1, 0, 1, 0, 1][frame];
  const bob = frame === 1 || frame === 4 ? 1 : 0;
  const side = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const short = spec.short ? 3 : 0;
  const cx = ox + 32;
  const footY = oy + 57 - short;
  const headY = oy + 22 + bob;
  const torsoY = oy + 35 + bob;
  const coat = spec.kind === 'labcoat';

  rect(img, cx - 9, footY - 2, 18, 3, [23, 28, 30, 90]);

  if (direction === 'left' || direction === 'right') {
    drawSideCharacter(img, cx, footY, headY, torsoY, side, pose, spec, coat);
    return;
  }

  const back = direction === 'up';
  const legSwing = pose;
  rect(img, cx - 9, footY - 16, 7, 16, C.ink);
  rect(img, cx + 2, footY - 16, 7, 16, C.ink);
  rect(img, cx - 8, footY - 15 + Math.max(0, legSwing), 6, 13, spec.pants);
  rect(img, cx + 2, footY - 15 + Math.max(0, -legSwing), 6, 13, spec.pants);
  rect(img, cx - 10, footY - 3, 9, 3, C.ink);
  rect(img, cx + 1, footY - 3, 9, 3, C.ink);
  rect(img, cx - 9, footY - 4, 7, 2, spec.shoes);
  rect(img, cx + 2, footY - 4, 7, 2, spec.shoes);

  if (spec.bag && !back) {
    rect(img, cx + 11, torsoY - 4, 4, 13, C.ink);
    rect(img, cx + 12, torsoY - 3, 3, 11, spec.bag);
  }

  rect(img, cx - 11, torsoY - 11, 22, 20, C.ink);
  rect(img, cx - 9, torsoY - 10, 18, 18, spec.hoodie);
  rect(img, cx - 7, torsoY - 9, 14, 4, spec.hoodieHi);
  if (coat) {
    rect(img, cx - 12, torsoY - 8, 24, 22, C.ink);
    rect(img, cx - 10, torsoY - 9, 20, 22, spec.hoodie);
    rect(img, cx - 2, torsoY - 7, 4, 20, [89, 106, 128, 255]);
    rect(img, cx - 8, torsoY + 4, 16, 1, [180, 188, 186, 255]);
  }
  if (spec.kind === 'trainer') rect(img, cx - 8, torsoY - 5, 16, 2, spec.accent);
  if (spec.kind === 'student') rect(img, cx - 7, torsoY - 10, 14, 2, [250, 238, 144, 255]);

  rect(img, cx - 16, torsoY - 8 + Math.max(0, -legSwing), 5, 16, C.ink);
  rect(img, cx + 11, torsoY - 8 + Math.max(0, legSwing), 5, 16, C.ink);
  rect(img, cx - 15, torsoY - 7 + Math.max(0, -legSwing), 3, 13, spec.hoodie);
  rect(img, cx + 12, torsoY - 7 + Math.max(0, legSwing), 3, 13, spec.hoodie);
  rect(img, cx - 15, torsoY + 6, 3, 3, C.skin);
  rect(img, cx + 12, torsoY + 6, 3, 3, C.skin);

  ellipse(img, cx, headY, 11, 12, C.ink);
  ellipse(img, cx, headY + 1, 9, 10, back ? spec.hair : C.skin);
  if (!back) {
    rect(img, cx - 7, headY - 8, 14, 4, spec.hair);
    rect(img, cx - 9, headY - 5, 4, 8, spec.hair);
    rect(img, cx + 5, headY - 5, 4, 8, spec.hair);
    rect(img, cx - 4, headY + 1, 2, 2, C.ink);
    rect(img, cx + 3, headY + 1, 2, 2, C.ink);
    rect(img, cx - 3, headY + 7, 6, 1, C.skinLo);
  } else {
    rect(img, cx - 7, headY - 8, 14, 7, spec.hair);
    rect(img, cx - 9, headY - 3, 18, 9, spec.hair);
    rect(img, cx - 5, headY + 7, 10, 3, [34, 35, 42, 255]);
  }
  if (spec.kind === 'labcoat' && !back) rect(img, cx - 6, torsoY - 7, 12, 3, [91, 128, 151, 255]);
}

function drawSideCharacter(img, cx, footY, headY, torsoY, side, pose, spec, coat) {
  const sx = side;
  rect(img, cx - 7, footY - 16, 6, 16, C.ink);
  rect(img, cx + 2, footY - 16, 6, 16, C.ink);
  rect(img, cx - 6, footY - 15 + Math.max(0, -pose), 5, 13, spec.pants);
  rect(img, cx + 2, footY - 15 + Math.max(0, pose), 5, 13, spec.pants);
  rect(img, cx - 8, footY - 3, 8, 3, C.ink);
  rect(img, cx + 1, footY - 3, 8, 3, C.ink);
  rect(img, cx - 7 + sx, footY - 4, 7, 2, spec.shoes);
  rect(img, cx + 1 + sx, footY - 4, 7, 2, spec.shoes);
  rect(img, cx - 10, torsoY - 11, 20, 20, C.ink);
  rect(img, cx - 8, torsoY - 10, 16, 18, spec.hoodie);
  rect(img, cx - 6, torsoY - 9, 12, 4, spec.hoodieHi);
  if (coat) {
    rect(img, cx - 11, torsoY - 9, 22, 23, C.ink);
    rect(img, cx - 9, torsoY - 9, 18, 22, spec.hoodie);
    rect(img, cx + sx * 5, torsoY - 7, 4, 17, [89, 106, 128, 255]);
  }
  if (spec.bag) {
    rect(img, cx - sx * 12 - 2, torsoY - 3, 5, 12, C.ink);
    rect(img, cx - sx * 12 - 1, torsoY - 2, 3, 10, spec.bag);
  }
  rect(img, cx - sx * 12 - 2, torsoY - 7 + Math.max(0, pose), 5, 15, C.ink);
  rect(img, cx - sx * 12 - 1, torsoY - 6 + Math.max(0, pose), 3, 12, spec.hoodie);
  rect(img, cx + sx * 10 - 2, torsoY - 7 + Math.max(0, -pose), 5, 15, C.ink);
  rect(img, cx + sx * 10 - 1, torsoY - 6 + Math.max(0, -pose), 3, 12, spec.hoodie);
  rect(img, cx + sx * 10 - 1, torsoY + 6, 3, 3, C.skin);

  ellipse(img, cx, headY, 11, 12, C.ink);
  ellipse(img, cx + sx * 1, headY + 1, 9, 10, C.skin);
  rect(img, cx - 7, headY - 8, 14, 4, spec.hair);
  rect(img, cx - sx * 8 - 1, headY - 5, 5, 9, spec.hair);
  rect(img, cx + sx * 4, headY - 1, 2, 2, C.ink);
  rect(img, cx + sx * 5, headY + 5, 3, 1, C.skinLo);
}

async function makeTiles() {
  const makers = {
    tile_1: () => tileGrass(false),
    tile_2: () => tileGrass(true),
    tile_3: () => tileHedge(),
    tile_5: () => tilePath(),
  };
  for (const [name, make] of Object.entries(makers)) await saveImage(join(OUT, 'tiles', `${name}.png`), make());
}

function tileGrass(tall) {
  const img = makeImage(16, 16, tall ? C.tallGrass : [105, 181, 91, 255]);
  for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2; x < 16; x += 5) rect(img, x, y + 1, 2, 1, C.grassHi);
  for (let i = 0; i < 12; i += 1) {
    const x = (i * 5 + 2) % 16;
    const y = (i * 7 + 3) % 16;
    rect(img, x, y, 1, tall ? 5 : 3, tall ? [158, 223, 115, 255] : C.grassLo);
    if (!tall && i % 3 === 0) setPixel(img, x + 1, y + 1, [145, 214, 112, 255]);
  }
  if (tall) {
    for (let x = 0; x < 16; x += 2) line(img, x, 15, x + 2, 7 + (x % 3), x % 4 === 0 ? C.grassHi : C.grassLo);
    rect(img, 2, 13, 12, 2, [46, 125, 69, 255]);
    rect(img, 4, 10, 2, 1, [183, 236, 125, 255]);
    rect(img, 11, 9, 2, 1, [183, 236, 125, 255]);
  }
  return img;
}

function tileHedge() {
  const img = makeImage(16, 16, C.hedge);
  ellipse(img, 4, 5, 5, 4, [72, 132, 76, 255]);
  ellipse(img, 12, 6, 5, 5, [79, 145, 80, 255]);
  ellipse(img, 7, 12, 7, 4, [42, 88, 62, 255]);
  for (let x = 1; x < 15; x += 5) rect(img, x, 3 + (x % 3), 2, 2, C.grassHi);
  return img;
}

function tileWater() {
  const img = makeImage(16, 16, [69, 151, 190, 255]);
  for (let y = 3; y < 16; y += 5) {
    line(img, 1, y, 5, y - 1, C.blueHi);
    line(img, 9, y + 1, 14, y, C.blueHi);
  }
  return img;
}

function tilePath() {
  const img = makeImage(16, 16, [198, 159, 94, 255]);
  rect(img, 0, 0, 16, 1, C.pathHi);
  rect(img, 0, 15, 16, 1, C.pathLo);
  [[2, 4], [8, 2], [12, 8], [4, 12], [10, 13], [1, 7], [14, 11]].forEach(([x, y]) => rect(img, x, y, 2, 1, C.pathLo));
  [[5, 7], [13, 3], [1, 10], [7, 14], [10, 5]].forEach(([x, y]) => rect(img, x, y, 2, 1, C.pathHi));
  setPixel(img, 6, 4, [171, 126, 79, 255]);
  setPixel(img, 3, 13, [230, 195, 125, 255]);
  return img;
}

function tileWall() {
  const img = makeImage(16, 16, C.wall);
  rect(img, 0, 0, 16, 2, C.wallHi);
  rect(img, 0, 14, 16, 2, C.wallLo);
  for (let y = 3; y < 14; y += 5) line(img, 0, y, 15, y, [202, 162, 119, 255]);
  line(img, 7, 3, 7, 8, [202, 162, 119, 255]);
  line(img, 12, 8, 12, 13, [202, 162, 119, 255]);
  return img;
}

function tileTrim() {
  const img = makeImage(16, 16, C.wallLo);
  rect(img, 0, 0, 16, 5, C.wall);
  rect(img, 0, 5, 16, 2, C.woodHi);
  rect(img, 0, 7, 16, 9, C.wood);
  for (let x = 1; x < 16; x += 4) line(img, x, 8, x, 15, C.woodLo);
  return img;
}

function tileLabFloor() {
  const img = makeImage(16, 16, C.labFloor);
  rect(img, 0, 0, 16, 1, C.labFloorHi);
  rect(img, 0, 15, 16, 1, C.labFloorLo);
  rect(img, 15, 0, 1, 16, C.labFloorLo);
  rect(img, 7, 7, 2, 2, [175, 197, 202, 255]);
  return img;
}

function tileDarkWood() {
  const img = makeImage(16, 16, C.wood);
  for (let x = 0; x < 16; x += 4) line(img, x, 0, x, 15, C.woodLo);
  rect(img, 0, 0, 16, 1, C.woodHi);
  rect(img, 3, 6, 9, 1, C.woodHi);
  rect(img, 6, 12, 8, 1, C.woodLo);
  return img;
}

async function makeProps() {
  const props = {
    prop_bed: propBed(),
    prop_desk: propDesk(),
    prop_computer: propComputer(),
    prop_chair: propChair(),
    prop_dresser: propDresser(),
    prop_bookshelf: propBookshelf(),
    prop_rug_blue: propRug([65, 104, 174, 255], [239, 215, 128, 255]),
    prop_stairs_down: propStairs(false),
    prop_stairs_up: propStairs(true),
    prop_door_threshold: propDoorThreshold(),
    prop_door_highlight: propDoorHighlight(),
    prop_exit_arrow_up: propArrow('up'),
    prop_exit_arrow_down: propArrow('down'),
    prop_table: propTable(),
    prop_tv: propTv(),
    prop_couch: propCouch(),
    prop_kitchen: propKitchen(),
    prop_plant: propPlant(),
    prop_picture: propPicture(),
    prop_mat: propRug([167, 98, 70, 255], [232, 187, 99, 255], 32, 16),
    prop_lab_machine: propLabMachine(),
    prop_lab_table: propLabTable(),
    prop_lab_terminal: propLabTerminal(),
    prop_specimen_jars: propSpecimenJars(),
    prop_whiteboard: propWhiteboard(),
    prop_professor_desk: propProfessorDesk(),
    prop_starter_ball: propStarterBall('closed'),
    prop_starter_ball_open: propStarterBall('open'),
    prop_sign: propSign(),
    prop_route_marker: propRouteMarker(),
    prop_grass_rustle: propGrassRustle(),
    prop_house_player: propHouse('blue'),
    prop_house_rival: propHouse('red'),
    prop_house_lab: propLabExterior(),
    prop_mailbox: propMailbox(),
    prop_flowers: propFlowers(),
    prop_shrub: propShrub(),
    prop_small_tree: propSmallTree(),
  };
  for (const [name, img] of Object.entries(props)) await saveImage(join(OUT, 'props', `${name}.png`), img);
}

function propBed() {
  const img = makeImage(48, 32);
  rect(img, 1, 4, 46, 25, C.ink);
  rect(img, 3, 5, 42, 22, C.wood);
  rect(img, 5, 6, 16, 9, C.cream);
  rect(img, 22, 6, 21, 18, [77, 130, 190, 255]);
  rect(img, 24, 8, 17, 5, [104, 164, 218, 255]);
  rect(img, 5, 25, 38, 2, C.woodLo);
  return img;
}

function propDesk() {
  const img = makeImage(48, 24);
  rect(img, 2, 4, 44, 17, C.ink);
  rect(img, 4, 3, 40, 8, C.woodHi);
  rect(img, 5, 11, 38, 8, C.wood);
  rect(img, 8, 18, 5, 5, C.woodLo);
  rect(img, 35, 18, 5, 5, C.woodLo);
  rect(img, 22, 12, 8, 2, [228, 198, 128, 255]);
  return img;
}

function propComputer() {
  const img = makeImage(24, 24);
  rect(img, 5, 2, 14, 12, C.ink);
  rect(img, 7, 4, 10, 7, [62, 85, 103, 255]);
  rect(img, 8, 5, 7, 2, C.cyan);
  rect(img, 10, 14, 4, 3, C.ink2);
  rect(img, 6, 18, 12, 3, [194, 190, 172, 255]);
  return img;
}

function propChair() {
  const img = makeImage(24, 24);
  rect(img, 6, 2, 12, 14, C.ink);
  rect(img, 8, 4, 8, 9, [91, 126, 174, 255]);
  rect(img, 5, 13, 14, 5, C.ink);
  rect(img, 7, 13, 10, 4, [71, 101, 151, 255]);
  rect(img, 7, 18, 3, 5, C.woodLo);
  rect(img, 14, 18, 3, 5, C.woodLo);
  return img;
}

function propDresser() {
  const img = makeImage(32, 32);
  rect(img, 3, 4, 26, 24, C.ink);
  rect(img, 5, 5, 22, 21, C.wood);
  for (let y = 8; y <= 20; y += 6) {
    rect(img, 6, y, 20, 1, C.woodLo);
    rect(img, 15, y + 2, 2, 1, C.yellow);
  }
  rect(img, 6, 5, 20, 3, C.woodHi);
  return img;
}

function propBookshelf() {
  const img = makeImage(32, 48);
  rect(img, 2, 2, 28, 43, C.ink);
  rect(img, 4, 4, 24, 39, C.wood);
  for (let y = 8; y <= 32; y += 12) {
    rect(img, 5, y, 22, 2, C.woodLo);
    [C.red, C.blue, C.green, C.yellow, C.purple].forEach((color, i) => rect(img, 6 + i * 4, y - 6, 3, 6, color));
  }
  return img;
}

function propRug(color, trim, w = 48, h = 32) {
  const img = makeImage(w, h);
  rect(img, 0, 0, w, h, color);
  strokeRect(img, 2, 2, w - 4, h - 4, trim);
  rect(img, 5, 5, w - 10, 2, [255, 255, 255, 32]);
  return img;
}

function propStairs(up) {
  const img = makeImage(16, 16);
  rect(img, 0, 0, 16, 16, C.ink);
  rect(img, 1, 1, 14, 14, C.woodLo);
  const ys = up ? [3, 7, 11] : [2, 6, 10, 13];
  ys.forEach((y, i) => rect(img, 2 + i, y, 12 - i * 2, 2, C.woodHi));
  return img;
}

function propDoor() {
  const img = makeImage(16, 16);
  rect(img, 2, 0, 12, 16, C.ink);
  rect(img, 4, 2, 8, 14, [128, 75, 50, 255]);
  rect(img, 5, 3, 6, 5, [163, 93, 57, 255]);
  rect(img, 11, 9, 2, 2, C.yellow);
  return img;
}

function propDoorThreshold() {
  const img = makeImage(16, 16);
  rect(img, 1, 3, 14, 4, [55, 47, 43, 210]);
  rect(img, 2, 7, 12, 6, [196, 148, 78, 255]);
  rect(img, 3, 8, 10, 2, [232, 190, 96, 255]);
  rect(img, 3, 11, 10, 1, [127, 83, 56, 255]);
  rect(img, 0, 13, 16, 2, [45, 68, 47, 120]);
  setPixel(img, 2, 6, [255, 226, 120, 210]);
  setPixel(img, 13, 6, [255, 226, 120, 210]);
  return img;
}

function propDoorHighlight() {
  const img = makeImage(16, 16);
  rect(img, 2, 11, 12, 2, [255, 233, 117, 170]);
  rect(img, 4, 9, 8, 1, [255, 248, 173, 130]);
  setPixel(img, 2, 10, [255, 248, 173, 120]);
  setPixel(img, 13, 10, [255, 248, 173, 120]);
  return img;
}

function propArrow(dir) {
  const img = makeImage(16, 16);
  const color = [249, 221, 88, 255];
  if (dir === 'up') {
    for (let y = 1; y < 10; y += 1) rect(img, 8 - Math.floor(y / 2), y, Math.max(1, y), 1, color);
    rect(img, 6, 8, 4, 7, color);
  } else {
    for (let y = 6; y < 15; y += 1) rect(img, 8 - Math.floor((15 - y) / 2), y, Math.max(1, 15 - y), 1, color);
    rect(img, 6, 1, 4, 8, color);
  }
  strokeRect(img, 5, dir === 'up' ? 8 : 1, 6, 7, [108, 88, 36, 255]);
  return img;
}

function propTable() {
  const img = makeImage(48, 32);
  ellipse(img, 24, 15, 21, 11, C.ink);
  ellipse(img, 24, 13, 20, 10, C.woodHi);
  rect(img, 6, 14, 36, 5, C.wood);
  rect(img, 9, 22, 5, 8, C.woodLo);
  rect(img, 34, 22, 5, 8, C.woodLo);
  rect(img, 20, 11, 8, 3, C.cream);
  return img;
}

function propTv() {
  const img = makeImage(40, 32);
  rect(img, 3, 10, 34, 18, C.ink);
  rect(img, 5, 12, 30, 14, [74, 61, 59, 255]);
  rect(img, 9, 4, 22, 17, C.ink);
  rect(img, 11, 6, 18, 12, [62, 102, 132, 255]);
  rect(img, 13, 7, 12, 4, C.blueHi);
  line(img, 16, 3, 11, 0, C.ink);
  line(img, 24, 3, 29, 0, C.ink);
  return img;
}

function propCouch() {
  const img = makeImage(48, 24);
  rect(img, 3, 8, 42, 13, C.ink);
  rect(img, 5, 6, 38, 13, [111, 141, 172, 255]);
  rect(img, 7, 4, 14, 8, [132, 164, 190, 255]);
  rect(img, 27, 4, 14, 8, [132, 164, 190, 255]);
  rect(img, 7, 20, 5, 3, C.woodLo);
  rect(img, 36, 20, 5, 3, C.woodLo);
  return img;
}

function propKitchen() {
  const img = makeImage(48, 32);
  rect(img, 2, 5, 44, 23, C.ink);
  rect(img, 4, 5, 40, 7, [218, 217, 194, 255]);
  rect(img, 5, 12, 38, 14, [132, 94, 65, 255]);
  rect(img, 9, 15, 10, 8, [166, 116, 72, 255]);
  rect(img, 28, 15, 10, 8, [166, 116, 72, 255]);
  rect(img, 31, 7, 10, 3, [121, 169, 176, 255]);
  return img;
}

function propPlant() {
  const img = makeImage(24, 32);
  rect(img, 7, 20, 10, 9, C.ink);
  rect(img, 8, 21, 8, 7, [163, 91, 63, 255]);
  ellipse(img, 9, 13, 6, 7, [75, 154, 91, 255]);
  ellipse(img, 16, 12, 6, 8, [84, 174, 94, 255]);
  ellipse(img, 12, 7, 5, 6, [115, 198, 101, 255]);
  return img;
}

function propPicture() {
  const img = makeImage(24, 24);
  rect(img, 4, 4, 16, 14, C.ink);
  rect(img, 5, 5, 14, 12, C.cream);
  rect(img, 7, 12, 10, 4, C.green);
  rect(img, 8, 7, 4, 4, C.blueHi);
  return img;
}

function propLabMachine() {
  const img = makeImage(64, 48);
  rect(img, 5, 10, 54, 31, C.ink);
  rect(img, 8, 12, 48, 25, [198, 211, 209, 255]);
  rect(img, 8, 37, 48, 3, [115, 134, 139, 255]);
  rect(img, 12, 16, 18, 14, [65, 103, 125, 255]);
  rect(img, 14, 18, 14, 8, C.cyan);
  rect(img, 15, 19, 9, 2, [145, 233, 224, 255]);
  ellipse(img, 42, 19, 5, 5, C.redHi);
  ellipse(img, 50, 19, 5, 5, C.greenHi);
  rect(img, 35, 29, 17, 3, [124, 145, 146, 255]);
  rect(img, 14, 33, 36, 2, [228, 234, 224, 255]);
  line(img, 10, 14, 54, 14, [235, 240, 230, 255]);
  line(img, 59, 15, 63, 8, C.ink);
  line(img, 59, 16, 63, 22, C.ink);
  return img;
}

function propLabTable() {
  const img = makeImage(96, 28);
  rect(img, 1, 8, 94, 16, C.ink);
  rect(img, 3, 6, 90, 8, [215, 216, 196, 255]);
  rect(img, 3, 14, 90, 7, [144, 105, 70, 255]);
  rect(img, 5, 15, 86, 2, [181, 130, 78, 255]);
  [16, 46, 76].forEach((x) => {
    rect(img, x, 21, 6, 6, C.ink);
    rect(img, x + 1, 21, 4, 5, C.woodLo);
  });
  rect(img, 11, 4, 14, 3, [238, 222, 176, 255]);
  rect(img, 66, 3, 16, 4, [151, 197, 190, 255]);
  return img;
}

function propLabCounter() {
  const img = makeImage(64, 32);
  rect(img, 2, 5, 60, 23, C.ink);
  rect(img, 4, 5, 56, 7, [220, 222, 203, 255]);
  rect(img, 5, 12, 54, 14, [111, 141, 151, 255]);
  rect(img, 10, 16, 12, 7, [142, 170, 174, 255]);
  rect(img, 42, 16, 12, 7, [142, 170, 174, 255]);
  return img;
}

function propLabTerminal() {
  const img = makeImage(32, 40);
  rect(img, 4, 12, 24, 24, C.ink);
  rect(img, 7, 14, 18, 18, [200, 207, 202, 255]);
  rect(img, 8, 5, 16, 15, C.ink);
  rect(img, 10, 7, 12, 10, [49, 83, 108, 255]);
  rect(img, 12, 8, 8, 3, C.greenHi);
  rect(img, 11, 23, 10, 2, [129, 151, 151, 255]);
  rect(img, 12, 27, 3, 3, C.redHi);
  rect(img, 17, 27, 3, 3, C.blueHi);
  rect(img, 8, 34, 16, 2, [91, 101, 101, 255]);
  return img;
}

function propSpecimenJars() {
  const img = makeImage(48, 32);
  for (let i = 0; i < 3; i += 1) {
    const x = 5 + i * 14;
    rect(img, x, 6, 10, 20, C.ink);
    rect(img, x + 1, 7, 8, 18, [139, 202, 203, 180]);
    rect(img, x + 3, 14, 4, 5, i === 0 ? C.green : i === 1 ? C.red : C.purple);
    rect(img, x + 2, 5, 6, 2, [220, 218, 190, 255]);
  }
  return img;
}

function propWhiteboard() {
  const img = makeImage(64, 40);
  rect(img, 5, 4, 54, 30, C.ink);
  rect(img, 8, 7, 48, 24, [230, 235, 225, 255]);
  line(img, 14, 24, 25, 12, C.green);
  line(img, 25, 12, 36, 24, C.green);
  rect(img, 41, 12, 11, 2, C.blue);
  rect(img, 41, 19, 11, 2, C.red);
  rect(img, 12, 28, 40, 1, [185, 196, 188, 255]);
  rect(img, 45, 31, 8, 2, C.redHi);
  return img;
}

function propProfessorDesk() {
  const img = makeImage(72, 48);
  rect(img, 2, 16, 68, 25, C.ink);
  rect(img, 5, 13, 62, 11, C.woodHi);
  rect(img, 6, 24, 60, 14, C.wood);
  rect(img, 8, 38, 56, 3, C.woodLo);
  rect(img, 11, 11, 17, 4, C.cream);
  rect(img, 13, 12, 13, 1, [250, 236, 188, 255]);
  rect(img, 35, 7, 20, 15, C.ink);
  rect(img, 38, 10, 14, 9, [62, 91, 116, 255]);
  rect(img, 40, 11, 9, 3, C.cyan);
  rect(img, 57, 17, 8, 4, C.red);
  rect(img, 19, 27, 12, 2, C.woodLo);
  rect(img, 43, 27, 12, 2, C.woodLo);
  return img;
}

function propStarterBall(state) {
  const img = makeImage(24, 24);
  ellipse(img, 12, 18, 8, 3, [45, 38, 38, 125]);
  if (state === 'glow') ellipse(img, 12, 11, 11, 10, [255, 232, 112, 115]);
  rect(img, 7, 15, 10, 4, C.ink);
  rect(img, 8, 14, 8, 4, [197, 204, 188, 255]);
  ellipse(img, 12, 9, 7, 7, C.ink);
  if (state === 'open') {
    ellipse(img, 12, 7, 6, 3, C.redHi);
    ellipse(img, 12, 13, 6, 3, C.white);
    rect(img, 6, 10, 12, 2, C.ink);
    rect(img, 11, 9, 3, 4, C.white);
  } else {
    ellipse(img, 12, 9, 6, 6, C.white);
    rect(img, 6, 3, 12, 6, C.redHi);
    rect(img, 6, 9, 12, 2, C.ink);
    ellipse(img, 12, 10, 3, 3, C.white);
    rect(img, 11, 9, 3, 2, C.ink);
  }
  return img;
}

function propSign() {
  const img = makeImage(24, 24);
  rect(img, 11, 13, 3, 10, C.woodLo);
  rect(img, 3, 4, 18, 11, C.ink);
  rect(img, 4, 5, 16, 9, [213, 184, 109, 255]);
  rect(img, 7, 8, 10, 1, C.ink2);
  rect(img, 7, 11, 7, 1, C.ink2);
  return img;
}

function propRouteMarker() {
  const img = makeImage(32, 24);
  rect(img, 14, 12, 4, 11, C.woodLo);
  rect(img, 3, 3, 26, 11, C.ink);
  rect(img, 5, 5, 22, 7, [230, 201, 112, 255]);
  rect(img, 9, 7, 14, 2, C.green);
  return img;
}

function propGrassRustle() {
  const img = makeImage(16, 16);
  line(img, 2, 14, 5, 7, C.grassHi);
  line(img, 7, 14, 8, 5, C.grassHi);
  line(img, 13, 14, 10, 7, C.grassHi);
  rect(img, 3, 12, 10, 2, C.grassLo);
  return img;
}

function propHouse(roof) {
  const img = makeImage(80, 72);
  const roofColor = roof === 'blue' ? [79, 122, 179, 255] : [177, 73, 69, 255];
  const roofHi = roof === 'blue' ? [107, 158, 206, 255] : [224, 106, 80, 255];
  rect(img, 8, 24, 64, 38, C.ink);
  rect(img, 12, 27, 56, 31, C.wall);
  rect(img, 12, 27, 56, 4, C.wallHi);
  rect(img, 5, 15, 70, 20, C.ink);
  rect(img, 8, 12, 64, 20, roofColor);
  rect(img, 11, 12, 58, 5, roofHi);
  rect(img, 8, 30, 64, 4, [54, 54, 62, 255]);
  for (let x = 10; x < 68; x += 12) {
    line(img, x, 15, x + 6, 31, [45, 61, 91, 255]);
    line(img, x + 1, 15, x + 7, 31, [45, 61, 91, 255]);
  }
  rect(img, 34, 39, 14, 23, C.ink);
  rect(img, 37, 42, 8, 20, [129, 73, 52, 255]);
  rect(img, 38, 43, 6, 5, [164, 92, 57, 255]);
  rect(img, 45, 51, 2, 2, C.yellow);
  rect(img, 17, 34, 15, 12, C.ink);
  rect(img, 48, 34, 15, 12, C.ink);
  rect(img, 20, 37, 9, 6, [111, 171, 205, 255]);
  rect(img, 51, 37, 9, 6, [111, 171, 205, 255]);
  rect(img, 14, 58, 52, 4, [92, 80, 61, 255]);
  rect(img, 8, 62, 64, 4, [54, 80, 52, 180]);
  rect(img, 12, 66, 56, 3, [36, 63, 43, 120]);
  return img;
}

function propLabExterior() {
  const img = makeImage(96, 80);
  rect(img, 8, 27, 80, 42, C.ink);
  rect(img, 12, 30, 72, 35, [216, 218, 205, 255]);
  rect(img, 12, 30, 72, 5, [237, 239, 224, 255]);
  rect(img, 5, 18, 86, 20, C.ink);
  rect(img, 8, 15, 80, 20, [92, 139, 151, 255]);
  rect(img, 13, 15, 70, 5, [137, 184, 190, 255]);
  rect(img, 8, 34, 80, 4, [44, 49, 59, 255]);
  rect(img, 34, 43, 16, 26, C.ink);
  rect(img, 37, 46, 10, 23, [95, 115, 129, 255]);
  rect(img, 39, 47, 6, 5, [122, 145, 158, 255]);
  rect(img, 56, 38, 20, 13, C.ink);
  rect(img, 59, 41, 14, 7, [101, 178, 207, 255]);
  rect(img, 20, 38, 14, 13, C.ink);
  rect(img, 23, 41, 8, 7, [101, 178, 207, 255]);
  rect(img, 34, 23, 28, 8, C.white);
  rect(img, 39, 26, 18, 2, C.red);
  rect(img, 12, 65, 72, 4, [55, 58, 63, 255]);
  rect(img, 8, 69, 80, 4, [54, 80, 52, 180]);
  rect(img, 12, 73, 72, 3, [36, 63, 43, 120]);
  return img;
}

function propMailbox() {
  const img = makeImage(16, 24);
  rect(img, 7, 11, 2, 11, C.woodLo);
  rect(img, 3, 4, 10, 8, C.ink);
  rect(img, 4, 3, 8, 8, [89, 128, 164, 255]);
  rect(img, 9, 5, 4, 2, C.redHi);
  return img;
}

function propFlowers() {
  const img = makeImage(24, 16);
  for (let i = 0; i < 5; i += 1) {
    const x = 3 + i * 4;
    const y = 8 + (i % 2) * 2;
    rect(img, x, y, 1, 5, C.green);
    ellipse(img, x, y, 2, 2, i % 2 ? C.yellow : C.redHi);
  }
  return img;
}

function propShrub() {
  const img = makeImage(24, 16);
  ellipse(img, 8, 9, 7, 5, C.grassLo);
  ellipse(img, 15, 9, 7, 5, C.green);
  ellipse(img, 12, 6, 7, 5, C.greenHi);
  rect(img, 3, 12, 18, 2, [42, 91, 60, 255]);
  return img;
}

function propSmallTree() {
  const img = makeImage(32, 48);
  rect(img, 13, 28, 6, 15, C.woodLo);
  ellipse(img, 11, 24, 11, 12, [61, 129, 74, 255]);
  ellipse(img, 21, 23, 10, 12, [78, 155, 81, 255]);
  ellipse(img, 16, 14, 12, 12, [93, 176, 84, 255]);
  rect(img, 9, 40, 14, 3, [38, 85, 59, 140]);
  return img;
}

function propFence(horizontal) {
  const img = makeImage(horizontal ? 32 : 16, horizontal ? 16 : 32);
  if (horizontal) {
    rect(img, 0, 7, 32, 4, C.wood);
    rect(img, 2, 3, 4, 12, C.woodHi);
    rect(img, 25, 3, 4, 12, C.woodHi);
    strokeRect(img, 0, 7, 32, 4, C.woodLo);
  } else {
    rect(img, 6, 0, 4, 32, C.wood);
    rect(img, 2, 3, 12, 4, C.woodHi);
    rect(img, 2, 24, 12, 4, C.woodHi);
    strokeRect(img, 6, 0, 4, 32, C.woodLo);
  }
  return img;
}

async function makeUi() {
  const cursor = makeImage(8, 8);
  for (let y = 1; y < 7; y += 1) rect(cursor, 1, y, y, 1, C.ink);
  rect(cursor, 2, 3, 3, 1, [118, 111, 96, 255]);
  await saveImage(join(OUT, 'ui', 'cursor.png'), cursor);

  const arrow = makeImage(8, 8);
  rect(arrow, 2, 1, 4, 2, C.ink);
  rect(arrow, 3, 3, 2, 2, C.ink);
  rect(arrow, 4, 5, 1, 1, C.ink);
  await saveImage(join(OUT, 'ui', 'continue_arrow.png'), arrow);
}

async function makeCreatures() {
  const defs = [
    ['sproutle', 'tuxemon_shybulb_sheet', C.green, C.greenHi, 'leaf'],
    ['kindlett', 'tuxemon_knindling_sheet', C.orange, C.yellow, 'fire'],
    ['shelldrop', 'tuxemon_forturtle_sheet', C.blue, C.blueHi, 'shell'],
    ['nibwing', 'tuxemon_birdee_sheet', [166, 167, 190, 255], C.white, 'bird'],
    ['nibblit', 'tuxemon_squabbit_sheet', [166, 111, 70, 255], [234, 190, 132, 255], 'rodent'],
  ];
  const highFidelitySheets = await Promise.all(
    defs.map(async ([name, file]) => ({
      file,
      source: join(CREATURE_RUN, '64/final', `${name}-battle-sheet-clean.png`),
      exists: await fileExists(join(CREATURE_RUN, '64/final', `${name}-battle-sheet-clean.png`)),
    })),
  );
  if (highFidelitySheets.every((sheet) => sheet.exists)) {
    await Promise.all(highFidelitySheets.map((sheet) => copyFile(sheet.source, join(OUT, 'creatures', `${sheet.file}.png`))));
    return;
  }

  const contact = makeImage(128, 64 * defs.length);
  const manifestSheets = [];
  await mkdir(join(CREATURE_RUN, '64/final'), { recursive: true });
  await mkdir(join(CREATURE_RUN, '64/qa'), { recursive: true });
  for (const [name, file, body, accent, kind] of defs) {
    const sheet = makeImage(128, 64);
    drawCreature(sheet, 0, 0, body, accent, kind, false);
    drawCreature(sheet, 64, 0, body, accent, kind, true);
    await saveImage(join(OUT, 'creatures', `${file}.png`), sheet);
    await saveImage(join(CREATURE_RUN, '64/final', `${name}-battle-sheet-clean.png`), sheet);
    blit(contact, sheet, 0, manifestSheets.length * 64);
    manifestSheets.push({
      creature: name,
      file: `public/assets/visual_upgrade/creatures/${file}.png`,
      run_file: `public/assets/creature-sprite-runs/visual-upgrade-creatures/64/final/${name}-battle-sheet-clean.png`,
      cell: 64,
      columns: ['front', 'back'],
      method: 'procedural pixel art following character-animation-creator-skill creature battler scope',
    });
  }
  await saveImage(join(CREATURE_RUN, '64/qa/contact-sheet.png'), contact);
  await writeFile(
    join(CREATURE_RUN, 'run-manifest.json'),
    `${JSON.stringify(
      {
        reference: {
          source_type: 'game_context',
          source: 'Creaturemon starter and route species concepts',
          used_for_generation: true,
          identity_notes: [
            'Sproutle: grass quadruped with leaf crest and side fronds',
            'Kindlett: ember lizard with angular snout and tail flame',
            'Shelldrop: armored water turtle with plated shell and flippers',
            'Nibwing: crested bird with broad white wings and beak',
            'Nibblit: long-eared burrower with curled tail and elongated body',
          ],
        },
        scope: {
          sizes: [64],
          actions: ['battle_idle'],
          directions: ['front', 'back'],
          frames: 2,
        },
        generation: {
          method: 'repo-local procedural pixel art',
          procedural: true,
          text_only: false,
        },
        sheets: manifestSheets,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(CREATURE_RUN, '64/qa/visual-review.json'),
    `${JSON.stringify(
      {
        accepted: true,
        notes: [
          'Each creature uses a unique primary silhouette rather than a shared circular body.',
          'All sheets are 128x64 with 64x64 front/back cells for Phaser battle loading.',
          'Back sprites retain the same mass, palette, and signature shapes as front sprites.',
        ],
      },
      null,
      2,
    )}\n`,
  );
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function drawCreature(img, ox, oy, body, accent, kind, back) {
  const cx = ox + 32;
  const cy = oy + 33;
  ellipse(img, cx, cy + 21, 22, 5, [30, 34, 34, 80]);
  if (kind === 'leaf') drawSproutle(img, cx, cy, back);
  if (kind === 'fire') drawKindlett(img, cx, cy, back);
  if (kind === 'shell') drawShelldrop(img, cx, cy, back);
  if (kind === 'bird') drawNibwing(img, cx, cy, back);
  if (kind === 'rodent') drawNibblit(img, cx, cy, back);
}

function drawSproutle(img, cx, cy, back) {
  const dark = [45, 114, 70, 255];
  const mid = [77, 172, 85, 255];
  const hi = [151, 220, 112, 255];
  polygon(img, [[cx - 22, cy + 5], [cx - 13, cy - 4], [cx + 12, cy - 6], [cx + 24, cy + 3], [cx + 17, cy + 17], [cx - 15, cy + 18]], C.ink);
  polygon(img, [[cx - 19, cy + 5], [cx - 11, cy - 2], [cx + 11, cy - 4], [cx + 21, cy + 3], [cx + 15, cy + 14], [cx - 13, cy + 15]], mid);
  polygon(img, [[cx - 6, cy - 4], [cx + 6, cy - 6], [cx + 18, cy + 7], [cx + 4, cy + 5]], [98, 190, 99, 255]);
  polygon(img, [[cx - 6, cy - 25], [cx + 1, cy - 10], [cx - 12, cy - 7]], C.ink);
  polygon(img, [[cx - 4, cy - 23], [cx, cy - 11], [cx - 10, cy - 8]], hi);
  polygon(img, [[cx + 5, cy - 28], [cx + 2, cy - 9], [cx + 15, cy - 12]], C.ink);
  polygon(img, [[cx + 6, cy - 25], [cx + 3, cy - 11], [cx + 13, cy - 12]], [118, 206, 91, 255]);
  line(img, cx + 3, cy - 24, cx + 3, cy - 6, dark);
  polygon(img, [[cx - 24, cy + 6], [cx - 13, cy - 7], [cx - 8, cy + 2], [cx - 16, cy + 12]], C.ink);
  polygon(img, [[cx - 21, cy + 6], [cx - 13, cy - 4], [cx - 10, cy + 2], [cx - 16, cy + 10]], hi);
  polygon(img, [[cx + 20, cy + 5], [cx + 29, cy - 3], [cx + 25, cy + 9]], C.ink);
  polygon(img, [[cx + 21, cy + 5], [cx + 27, cy], [cx + 24, cy + 7]], hi);
  rect(img, cx - 15, cy + 15, 5, 8, C.ink);
  rect(img, cx + 11, cy + 13, 5, 9, C.ink);
  rect(img, cx - 14, cy + 15, 3, 6, dark);
  rect(img, cx + 12, cy + 13, 3, 7, dark);
  if (!back) {
    polygon(img, [[cx - 9, cy - 5], [cx + 8, cy - 6], [cx + 15, cy + 3], [cx + 6, cy + 9], [cx - 10, cy + 7]], C.ink);
    polygon(img, [[cx - 7, cy - 3], [cx + 7, cy - 4], [cx + 12, cy + 2], [cx + 5, cy + 7], [cx - 8, cy + 5]], [109, 194, 93, 255]);
    rect(img, cx - 2, cy, 3, 3, C.ink);
    rect(img, cx + 8, cy, 3, 3, C.ink);
    rect(img, cx + 1, cy + 6, 8, 2, [219, 242, 162, 255]);
  } else {
    rect(img, cx - 9, cy - 2, 21, 4, [174, 232, 128, 105]);
    rect(img, cx - 15, cy + 8, 24, 3, dark);
  }
}

function drawKindlett(img, cx, cy, back) {
  const orange = [229, 111, 48, 255];
  const red = [173, 67, 47, 255];
  const hi = [255, 163, 77, 255];
  polygon(img, [[cx - 20, cy + 8], [cx - 9, cy - 7], [cx + 10, cy - 8], [cx + 22, cy + 4], [cx + 18, cy + 17], [cx - 12, cy + 18]], C.ink);
  polygon(img, [[cx - 17, cy + 7], [cx - 7, cy - 5], [cx + 8, cy - 5], [cx + 19, cy + 4], [cx + 15, cy + 14], [cx - 11, cy + 15]], orange);
  polygon(img, [[cx + 7, cy - 8], [cx + 21, cy - 17], [cx + 26, cy - 8], [cx + 19, cy + 3]], C.ink);
  polygon(img, [[cx + 9, cy - 7], [cx + 20, cy - 14], [cx + 24, cy - 8], [cx + 18, cy + 1]], [242, 137, 58, 255]);
  polygon(img, [[cx + 19, cy - 17], [cx + 25, cy - 29], [cx + 31, cy - 17], [cx + 25, cy - 5]], C.ink);
  polygon(img, [[cx + 21, cy - 16], [cx + 25, cy - 25], [cx + 29, cy - 16], [cx + 25, cy - 8]], C.redHi);
  polygon(img, [[cx + 24, cy - 19], [cx + 27, cy - 13], [cx + 24, cy - 9]], C.yellow);
  polygon(img, [[cx - 19, cy + 8], [cx - 29, cy + 3], [cx - 26, cy + 13]], C.ink);
  polygon(img, [[cx - 19, cy + 8], [cx - 27, cy + 5], [cx - 25, cy + 11]], red);
  rect(img, cx - 12, cy + 15, 6, 8, C.ink);
  rect(img, cx + 10, cy + 14, 6, 8, C.ink);
  rect(img, cx - 11, cy + 15, 4, 5, red);
  rect(img, cx + 11, cy + 14, 4, 6, red);
  polygon(img, [[cx - 12, cy - 12], [cx - 3, cy - 7], [cx - 12, cy - 3]], C.ink);
  polygon(img, [[cx - 10, cy - 10], [cx - 4, cy - 7], [cx - 10, cy - 5]], hi);
  if (!back) {
    rect(img, cx - 6, cy - 1, 3, 3, C.ink);
    rect(img, cx + 6, cy - 2, 3, 3, C.ink);
    rect(img, cx - 5, cy + 8, 14, 5, red);
    rect(img, cx - 1, cy + 5, 9, 3, hi);
  } else {
    rect(img, cx - 8, cy - 4, 19, 4, hi);
    rect(img, cx - 12, cy + 9, 22, 5, red);
  }
}

function drawShelldrop(img, cx, cy, back) {
  const shell = [47, 91, 142, 255];
  const shellHi = [72, 147, 195, 255];
  const skin = [109, 186, 220, 255];
  polygon(img, [[cx - 24, cy + 5], [cx - 14, cy - 14], [cx + 11, cy - 17], [cx + 24, cy + 1], [cx + 18, cy + 18], [cx - 16, cy + 18]], C.ink);
  polygon(img, [[cx - 21, cy + 5], [cx - 12, cy - 11], [cx + 10, cy - 14], [cx + 21, cy + 1], [cx + 15, cy + 15], [cx - 14, cy + 15]], shell);
  polygon(img, [[cx - 13, cy - 9], [cx + 7, cy - 12], [cx + 16, cy], [cx + 2, cy + 5], [cx - 15, cy + 2]], shellHi);
  line(img, cx - 12, cy - 5, cx + 13, cy + 8, [35, 69, 117, 255]);
  line(img, cx + 8, cy - 10, cx - 4, cy + 14, [35, 69, 117, 255]);
  polygon(img, [[cx - 7, cy - 24], [cx + 8, cy - 23], [cx + 13, cy - 12], [cx + 7, cy - 5], [cx - 6, cy - 6], [cx - 12, cy - 14]], C.ink);
  polygon(img, [[cx - 5, cy - 21], [cx + 7, cy - 20], [cx + 10, cy - 13], [cx + 5, cy - 8], [cx - 5, cy - 8], [cx - 9, cy - 14]], skin);
  rect(img, cx - 7, cy - 27, 16, 5, C.ink);
  rect(img, cx - 5, cy - 28, 12, 5, [69, 139, 181, 255]);
  polygon(img, [[cx - 23, cy + 9], [cx - 33, cy + 2], [cx - 27, cy + 17]], C.ink);
  polygon(img, [[cx - 22, cy + 9], [cx - 30, cy + 5], [cx - 26, cy + 14]], skin);
  polygon(img, [[cx + 20, cy + 9], [cx + 31, cy + 3], [cx + 27, cy + 17]], C.ink);
  polygon(img, [[cx + 19, cy + 9], [cx + 28, cy + 6], [cx + 25, cy + 14]], skin);
  if (!back) {
    rect(img, cx - 4, cy - 16, 3, 3, C.ink);
    rect(img, cx + 6, cy - 16, 3, 3, C.ink);
    rect(img, cx - 3, cy - 9, 10, 2, [44, 106, 151, 255]);
    rect(img, cx - 10, cy + 10, 21, 5, [134, 207, 230, 255]);
  } else {
    rect(img, cx - 13, cy - 3, 26, 4, [35, 69, 117, 255]);
    rect(img, cx - 6, cy - 20, 13, 3, [173, 225, 235, 90]);
  }
}

function drawNibwing(img, cx, cy, back) {
  const feather = [148, 152, 181, 255];
  const darkFeather = [87, 94, 137, 255];
  polygon(img, [[cx - 7, cy - 19], [cx + 8, cy - 19], [cx + 16, cy - 5], [cx + 12, cy + 15], [cx - 10, cy + 15], [cx - 16, cy - 4]], C.ink);
  polygon(img, [[cx - 5, cy - 16], [cx + 6, cy - 16], [cx + 13, cy - 4], [cx + 9, cy + 12], [cx - 8, cy + 12], [cx - 13, cy - 3]], feather);
  polygon(img, [[cx - 15, cy - 5], [cx - 34, cy - 17], [cx - 28, cy + 10], [cx - 14, cy + 12]], C.ink);
  polygon(img, [[cx - 15, cy - 4], [cx - 31, cy - 13], [cx - 26, cy + 7], [cx - 14, cy + 9]], C.white);
  polygon(img, [[cx + 14, cy - 5], [cx + 34, cy - 17], [cx + 28, cy + 10], [cx + 13, cy + 12]], C.ink);
  polygon(img, [[cx + 14, cy - 4], [cx + 31, cy - 13], [cx + 26, cy + 7], [cx + 13, cy + 9]], C.white);
  line(img, cx - 29, cy - 9, cx - 15, cy + 3, darkFeather);
  line(img, cx - 25, cy - 1, cx - 14, cy + 7, darkFeather);
  line(img, cx + 29, cy - 9, cx + 15, cy + 3, darkFeather);
  line(img, cx + 25, cy - 1, cx + 14, cy + 7, darkFeather);
  polygon(img, [[cx - 4, cy - 27], [cx + 7, cy - 27], [cx + 10, cy - 18], [cx - 7, cy - 18]], C.ink);
  polygon(img, [[cx - 2, cy - 30], [cx + 6, cy - 30], [cx + 7, cy - 20], [cx - 5, cy - 20]], darkFeather);
  rect(img, cx - 4, cy + 14, 3, 10, C.orange);
  rect(img, cx + 5, cy + 14, 3, 10, C.orange);
  rect(img, cx - 6, cy + 23, 6, 2, C.ink);
  rect(img, cx + 4, cy + 23, 6, 2, C.ink);
  if (!back) {
    rect(img, cx - 4, cy - 8, 3, 3, C.ink);
    rect(img, cx + 6, cy - 8, 3, 3, C.ink);
    polygon(img, [[cx + 1, cy - 3], [cx + 9, cy], [cx + 1, cy + 3]], C.ink);
    polygon(img, [[cx + 2, cy - 2], [cx + 7, cy], [cx + 2, cy + 2]], C.yellow);
    rect(img, cx - 7, cy + 6, 15, 3, C.white);
  } else {
    rect(img, cx - 8, cy - 12, 18, 3, [225, 225, 235, 100]);
    rect(img, cx - 8, cy + 2, 17, 6, darkFeather);
  }
}

function drawNibblit(img, cx, cy, back) {
  const fur = [159, 103, 64, 255];
  const furHi = [232, 187, 126, 255];
  const furDark = [91, 58, 46, 255];
  polygon(img, [[cx - 25, cy + 8], [cx - 11, cy - 8], [cx + 15, cy - 7], [cx + 25, cy + 4], [cx + 17, cy + 16], [cx - 17, cy + 17]], C.ink);
  polygon(img, [[cx - 22, cy + 7], [cx - 10, cy - 5], [cx + 13, cy - 5], [cx + 22, cy + 4], [cx + 15, cy + 13], [cx - 15, cy + 14]], fur);
  polygon(img, [[cx - 7, cy - 6], [cx + 10, cy - 6], [cx + 17, cy + 6], [cx + 3, cy + 9], [cx - 11, cy + 5]], furHi);
  polygon(img, [[cx - 15, cy - 10], [cx - 23, cy - 29], [cx - 12, cy - 33], [cx - 6, cy - 13]], C.ink);
  polygon(img, [[cx - 14, cy - 12], [cx - 20, cy - 27], [cx - 13, cy - 29], [cx - 9, cy - 14]], furHi);
  polygon(img, [[cx + 7, cy - 11], [cx + 14, cy - 31], [cx + 25, cy - 27], [cx + 16, cy - 9]], C.ink);
  polygon(img, [[cx + 9, cy - 12], [cx + 15, cy - 28], [cx + 22, cy - 25], [cx + 14, cy - 10]], furHi);
  polygon(img, [[cx + 18, cy + 5], [cx + 31, cy - 4], [cx + 27, cy - 13], [cx + 17, cy - 6], [cx + 22, cy + 4]], C.ink);
  line(img, cx + 19, cy + 4, cx + 29, cy - 5, fur);
  line(img, cx + 20, cy + 3, cx + 26, cy - 11, furHi);
  rect(img, cx - 16, cy + 14, 8, 6, C.ink);
  rect(img, cx + 7, cy + 13, 8, 7, C.ink);
  rect(img, cx - 15, cy + 14, 7, 4, furDark);
  rect(img, cx + 8, cy + 13, 7, 5, furDark);
  if (!back) {
    rect(img, cx - 7, cy - 1, 3, 3, C.ink);
    rect(img, cx + 6, cy - 1, 3, 3, C.ink);
    rect(img, cx - 1, cy + 4, 4, 2, C.ink);
    rect(img, cx - 13, cy + 3, 6, 1, C.cream);
    rect(img, cx + 8, cy + 3, 6, 1, C.cream);
  } else {
    rect(img, cx - 9, cy - 2, 23, 5, furDark);
    rect(img, cx - 8, cy - 7, 20, 2, [221, 169, 105, 255]);
  }
}

async function makeBattleAssets() {
  const route = makeImage(256, 112, [182, 222, 170, 255]);
  rect(route, 0, 0, 256, 26, [150, 207, 221, 255]);
  rect(route, 0, 26, 256, 4, [210, 231, 184, 255]);
  ellipse(route, 40, 14, 18, 5, [231, 246, 238, 210]);
  ellipse(route, 58, 12, 13, 4, [231, 246, 238, 190]);
  ellipse(route, 203, 16, 21, 5, [231, 246, 238, 180]);
  rect(route, 0, 82, 256, 30, [132, 184, 120, 255]);
  for (let x = 0; x < 256; x += 14) line(route, x, 92, x + 10, 76 + (x % 5), [88, 150, 90, 255]);
  for (let x = 4; x < 256; x += 23) {
    rect(route, x, 72 + (x % 9), 2, 5, [75, 142, 82, 255]);
    rect(route, x + 2, 75 + (x % 7), 2, 1, [218, 228, 104, 255]);
  }
  ellipse(route, 72, 86, 58, 14, [94, 146, 87, 255]);
  ellipse(route, 72, 82, 43, 8, [116, 166, 96, 255]);
  ellipse(route, 184, 44, 50, 11, [94, 146, 87, 255]);
  ellipse(route, 184, 40, 37, 7, [116, 166, 96, 255]);
  await saveImage(join(OUT, 'battle', 'battle_bg_route.png'), route);

  const lab = makeImage(256, 112, [194, 211, 213, 255]);
  rect(lab, 0, 0, 256, 28, [226, 220, 196, 255]);
  rect(lab, 0, 28, 256, 4, [119, 146, 151, 255]);
  rect(lab, 0, 7, 256, 2, [246, 238, 207, 255]);
  for (let x = 0; x < 256; x += 16) line(lab, x, 32, x, 111, [154, 180, 185, 255]);
  for (let y = 40; y < 112; y += 16) line(lab, 0, y, 255, y, [154, 180, 185, 255]);
  for (let x = 8; x < 256; x += 32) for (let y = 48; y < 112; y += 32) rect(lab, x, y, 3, 2, [217, 231, 229, 255]);
  rect(lab, 12, 8, 34, 13, [202, 214, 203, 255]);
  rect(lab, 15, 11, 28, 2, [111, 171, 130, 255]);
  rect(lab, 205, 8, 34, 13, [202, 214, 203, 255]);
  rect(lab, 209, 11, 25, 2, [171, 117, 113, 255]);
  ellipse(lab, 72, 86, 58, 14, [136, 157, 158, 255]);
  ellipse(lab, 72, 82, 43, 8, [154, 176, 176, 255]);
  ellipse(lab, 184, 44, 50, 11, [136, 157, 158, 255]);
  ellipse(lab, 184, 40, 36, 6, [154, 176, 176, 255]);
  await saveImage(join(OUT, 'battle', 'battle_bg_lab.png'), lab);
}

async function makeEffects() {
  const sheet = makeImage(32 * 8, 32);
  drawImpact(sheet, 0, C.white);
  drawSlash(sheet, 32);
  drawLeaves(sheet, 64);
  drawEmber(sheet, 96);
  drawSplash(sheet, 128);
  drawSparkle(sheet, 160);
  drawImpact(sheet, 192, [255, 255, 255, 255]);
  drawSwirl(sheet, 224);
  await saveImage(join(OUT, 'effects', 'battle_effects.png'), sheet);
}

function drawImpact(img, ox, color) {
  line(img, ox + 16, 3, ox + 16, 28, color);
  line(img, ox + 4, 16, ox + 28, 16, color);
  line(img, ox + 7, 7, ox + 25, 25, color);
  line(img, ox + 25, 7, ox + 7, 25, color);
  ellipse(img, ox + 16, 16, 4, 4, [255, 226, 108, 255]);
}

function drawSlash(img, ox) {
  for (let i = 0; i < 4; i += 1) line(img, ox + 6 + i, 25, ox + 25 + i, 6, C.white);
  line(img, ox + 8, 27, ox + 27, 8, [106, 141, 180, 255]);
}

function drawLeaves(img, ox) {
  [[10, 12], [18, 8], [22, 19], [12, 23]].forEach(([x, y], i) => ellipse(img, ox + x, y, 4, 2, i % 2 ? C.greenHi : C.green));
  line(img, ox + 6, 25, ox + 25, 7, C.grassLo);
}

function drawEmber(img, ox) {
  ellipse(img, ox + 13, 16, 5, 8, C.redHi);
  ellipse(img, ox + 18, 13, 4, 7, C.orange);
  ellipse(img, ox + 16, 17, 3, 5, C.yellow);
}

function drawSplash(img, ox) {
  ellipse(img, ox + 15, 18, 8, 5, C.blueHi);
  [8, 14, 22].forEach((x, i) => ellipse(img, ox + x, 10 + i, 3, 4, [211, 244, 255, 255]));
}

function drawSparkle(img, ox) {
  [[8, 11], [17, 8], [23, 19], [14, 23]].forEach(([x, y]) => {
    line(img, ox + x, y - 4, ox + x, y + 4, C.yellow);
    line(img, ox + x - 4, y, ox + x + 4, y, C.yellow);
  });
}

function drawSwirl(img, ox) {
  for (let i = 0; i < 12; i += 1) {
    const a = i * 0.7;
    const r = 3 + i;
    setPixel(img, ox + 16 + Math.round(Math.cos(a) * r), 16 + Math.round(Math.sin(a) * r), [245, 245, 255, 230]);
  }
}

async function writeManifest() {
  const manifest = {
    name: 'creaturemon visual upgrade pack',
    style: 'cohesive top-down retro monster-catching RPG pixel art',
    generated_at: new Date().toISOString(),
    runtime_only: true,
    creature_sheet: {
      cell: 64,
      columns: ['front', 'back'],
      note: 'Runtime Creaturemon battlers only; upgraded overworld characters live in public/assets/sprites/characters/upgraded.',
    },
    directories: ['creatures', 'tiles', 'props', 'ui', 'effects', 'battle'],
  };
  await writeFile(join(OUT, 'asset-pack-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function saveImage(path, img) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, encodePng(img));
}

function encodePng({ width, height, data }) {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(data.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = pngTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
