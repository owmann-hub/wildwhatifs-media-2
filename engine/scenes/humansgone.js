import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeBurst, softTex, setFace, life, drawTitleTimed, drawTag, RoundedBoxGeometry, stars, teaserTime, drawTeaser } from './lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 21 episode: "What if all humans vanished and time sped up?"  (Nov 20 STANDARD: clear, 35-45 s, timeline gauge + NEXT line, clean big part, loop)
// HUMAN PART (~10 s): café terrace on a cobbled piazza with a stone clock tower. Mittens (he) plays chess against THE PIGEON, you are the
//   referee holding the chess clock, BAD TIMING proposes at the next table. 3.9 s: every human vanishes (puffs); the clock drops on the board.
// BIG PART: one fixed view of the same piazza, slow continuous pull-back, a milestone every ~2 s, each shown where it happens:
//   1 DAY lights out, 2 DAYS subway floods, 1 YEAR weeds, 40 YEARS trees (like Pripyat), 100 YEARS roofs collapse, 1,000 YEARS only stone,
//   100,000 YEARS ice age; then space: 250 MILLION YEARS one supercontinent, 1 BILLION oceans gone, 5 BILLION the Sun swells,
//   7.6 BILLION the Sun swallows Earth. Mittens and the Pigeon are still at the board (Mittens cam in space). The counter never stops.
// Ending: "Well. It's still the Pigeon's move." over the red giant reaching Earth; last frame = first frame (rewind teaser = the payoff).
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const TEASER = 1.2;
const TV = 2.9;                       // the vanish (scene time)
const MIL = [[1 / 365, '1 DAY', 'LIGHTS OUT'], [2 / 365, '2 DAYS', 'SUBWAYS FLOOD'], [1, '1 YEAR', 'WEEDS IN THE CRACKS'], [40, '40 YEARS', 'TREES EVERYWHERE'], [100, '100 YEARS', 'ROOFS COLLAPSE'],
  [1000, '1,000 YEARS', 'ONLY STONE STANDS'], [1e5, '100,000 YEARS', 'ICE AGE'], [2.5e8, '250 MILLION YEARS', 'ONE SUPERCONTINENT'], [1e9, '1 BILLION YEARS', 'OCEANS BOIL AWAY'],
  [5e9, '5 BILLION YEARS', 'THE SUN SWELLS'], [7.59e9, '7.6 BILLION YEARS', 'SUN SWALLOWS EARTH']];
const MT = [9.4, 12.5, 14.3, 16.0, 17.7, 19.8, 22.1, 23.8, 25.4, 27.8, 30.6];
const SUBS = ['', 'no pumps', '', 'like Pripyat since 1986', '', '', '', '', '', '', ''];
const PUNCH = 29.9, ASK = 31.8, SEND = 34.8; const TOT = +(SEND + TEASER).toFixed(2);
const CUT = 23.15;
const Y_END = Math.log10(7.75e9);
const SEC = 1 / (365.25 * 86400);
// years since the vanish (log-interpolated between milestones; climbs until the last frame)
function yrsAt(t) {
  if (t < TV) return 0; const ts = [TV + 0.05, ...MT, SEND + 0.2], ys = [Math.log10(SEC), ...MIL.map(m => Math.log10(m[0])), Y_END];
  if (t <= ts[0]) return SEC * (t - TV) / 0.05;
  for (let i = 0; i < ts.length - 1; i++) if (t < ts[i + 1]) { let u = (t - ts[i]) / (ts[i + 1] - ts[i]); if (i === 0) u = Math.pow(u, 0.8); return Math.pow(10, lerp(ys[i], ys[i + 1], u)); }
  return Math.pow(10, Y_END); }
export { TOT, MT, PUNCH, ASK, CUT, yrsAt, TEASER, TV };

export async function create({ THREE, W, H }) {
  const R = rng(2111);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler(), tv = new THREE.Vector3();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function signTex(text, bg, fg, w = 512, h = 112) { return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = h * 0.56; g.font = `900 ${fs}px ${FONT}`; const mw = g.measureText(text).width; if (mw > w * 0.84) { fs *= w * 0.84 / mw; g.font = `900 ${fs}px ${FONT}`; } g.fillText(text, w / 2, h * 0.54); }); }
  const signMat = (text, bg, fg, w, h) => new THREE.MeshStandardMaterial({ map: signTex(text, bg, fg, w, h), roughness: 0.6, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 });

  // =====================================================================================================
  // SCENE A: the piazza (metres). Table with the chess board at the origin, camera looks north (-z).
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 3000);
  const fogC = new THREE.Color(0xf2c9a4); A.fog = new THREE.FogExp2(fogC.getHex(), 0.0045);
  const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x8a7060, 0.55); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc98a, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  const SUND = new THREE.Vector3(0.55, 0.42, 0.72).normalize();
  { sun.target.position.set(0, 0, -12); sun.position.copy(SUND).multiplyScalar(80).add(sun.target.position); const c = sun.shadow.camera; c.left = -40; c.right = 40; c.top = 40; c.bottom = -40; c.near = 10; c.far = 200; c.updateProjectionMatrix(); }
  const sky = makeSkyDome(THREE, 0x5d95dc, 0xffd3a2, [SUND.x, SUND.y, SUND.z]); sky.scale.setScalar(2500); A.add(sky);
  const zen0 = new THREE.Color(0x5d95dc), hor0 = new THREE.Color(0xffd3a2), zenI = new THREE.Color(0x8fb3dc), horI = new THREE.Color(0xe8eef6);
  // cobbled ground
  const cobTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#9a8a78'; g.fillRect(0, 0, w, h); const r = rng(3); for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { const c = 150 + r() * 50; g.fillStyle = `rgb(${c},${c * 0.9},${c * 0.78})`; g.beginPath(); g.roundRect(x + 1, y + 1, 14, 14, 5); g.fill(); } });
  cobTex.wrapS = cobTex.wrapT = THREE.RepeatWrapping; cobTex.repeat.set(40, 40);
  const groundM = new THREE.MeshStandardMaterial({ map: cobTex, roughness: 0.9, color: 0xffffff });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundM); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -10); ground.receiveShadow = true; ground.name = 'ground'; A.add(ground);
  const farGM = new THREE.MeshStandardMaterial({ color: 0x8a8a70, roughness: 1 }); const farG = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), farGM); farG.rotation.x = -Math.PI / 2; farG.position.y = -0.05; A.add(farG);

  // ---------------- town houses around the square (each one: walls group + roof group, so roofs can fall and walls crumble) ----------------
  const wallPal = [0xf1e3c4, 0xf2b8b0, 0xe9a94b, 0xa9c8e0, 0xf6efe2, 0x9cc9b0, 0xe8d2b0, 0xd0714f, 0xf6d6a0, 0xc9d6df];
  const shops = [['PANETTERIA', '#ffd23f', '#5a2a10'], ['CAFÉ LUNA', '#1f3d5a', '#ffe9a8'], ['FARMACIA', '#1f8a4c', '#ffffff'], ['LIBRERIA', '#6b3e1e', '#ffffff'], ['GELATERIA', '#ff7fb4', '#ffffff'], ['FIORI', '#e63946', '#ffffff'], ['OTTICA', '#3a7bd5', '#ffffff'], ['BAR CENTRALE', '#2a6a5a', '#ffffff']];
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a4c, roughness: 0.15, metalness: 0.5 });
  const litM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.3, emissive: 0xffb860, emissiveIntensity: 1.2 });
  const trimM = M(0xf6efe2, 0.7), roofM = M(0xb0553a, 0.8), ironM = M(0x2a2e33, 0.5, 0.4);
  const HOUSES = []; const shopMats = []; let si = 0;
  function townHouse(x, z, w, dpt, floors, k, ry) {
    const g = new THREE.Group(), walls = new THREE.Group(), roof = new THREE.Group(); g.add(walls, roof); const B = Builder(); const FH = 3.0, Hh = 3.6 + (floors - 1) * FH;
    const wall = new THREE.MeshStandardMaterial({ color: wallPal[(k * 7 + 3) % wallPal.length], roughness: 0.85 }); B.add(BX(w, Hh, dpt), wall, 0, Hh / 2, 0);
    B.add(BX(w + 0.3, 0.3, dpt + 0.3), trimM, 0, Hh, 0); B.add(BX(w + 0.1, 0.15, dpt + 0.1), trimM, 0, 3.6, 0);
    const shM = M([0x2f7d6a, 0x9a3b2f, 0x1d3f6e, 0x3a6ea5, 0x7a5a2e][k % 5], 0.6); const nW = Math.max(2, Math.round(w / 2.6)), sp = w / nW;
    for (let f = 1; f < floors; f++) { const y = 3.6 + (f - 1) * FH + 1.5; for (let i = 0; i < nW; i++) { const wx = -w / 2 + sp * (i + 0.5); const lit = R() < 0.4;
        B.add(BX(1.0, 1.6, 0.06), trimM, wx, y, dpt / 2 + 0.03); B.add(BX(0.8, 1.4, 0.05), lit ? litM : glassM, wx, y, dpt / 2 + 0.07);
        B.add(RB(0.38, 1.5, 0.06, 0.02), shM, wx - 0.62, y, dpt / 2 + 0.06); B.add(RB(0.38, 1.5, 0.06, 0.02), shM, wx + 0.62, y, dpt / 2 + 0.06);
        if (f === 1 && i % 2 === 0) { B.add(BX(1.4, 0.1, 0.6), M(0xd8cfc0, 0.8), wx, y - 0.85, dpt / 2 + 0.3); B.add(BX(1.4, 0.5, 0.04), ironM, wx, y - 0.55, dpt / 2 + 0.58); } } }
    // shop front + awning
    B.add(BX(w * 0.8, 2.4, 0.05), glassM, 0, 1.4, dpt / 2 + 0.03); B.add(BX(w * 0.84, 0.15, 1.2), M([0xe63946, 0x2a6a5a, 0xffd23f, 0x3a7bd5][k % 4], 0.7), 0, 2.95, dpt / 2 + 0.6, -0.25, 0, 0);
    B.build(walls); const s = shops[(si++) % shops.length]; const sm = signMat(s[0], s[1], s[2]); shopMats.push(sm); const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.62, 0.62), sm); sg.position.set(0, 3.25, dpt / 2 + 0.09); walls.add(sg);
    const RBl = Builder(); const rh = 2.6, half = dpt / 2 + 0.4, sl = Math.hypot(half, rh), ang = Math.atan2(rh, half);
    for (const s2 of [-1, 1]) RBl.add(BX(w + 0.5, 0.25, sl), roofM, 0, rh / 2, s2 * half / 2, s2 * ang, 0, 0);
    RBl.add(BX(0.7, 1.6, 0.7), M(0x9a8a80, 0.9), w * 0.3, rh * 0.7, -0.5); RBl.build(roof); roof.position.y = Hh + 0.15;
    g.position.set(x, 0, z); g.rotation.y = ry; A.add(g); HOUSES.push({ g, walls, roof, H: Hh, k, w, ph: R() }); return g; }
  { let x = -30; let k = 0; while (x < 30) { const w = 6 + R() * 3; townHouse(x + w / 2, -26, w, 9, 4 + (k % 3 === 1 ? 1 : 0), k, 0); x += w + 0.1; k++; }
    let z = -21; while (z < 4) { const w = 6 + R() * 2.5; townHouse(-17, z + w / 2, w, 9, 4 + (k % 2), k, Math.PI / 2); townHouse(17, z + w / 2, w, 9, 4 + ((k + 1) % 2), k + 3, -Math.PI / 2); z += w + 0.1; k++; } }
  // distant glass towers (they fall at ~1,000 years)
  const TOWERS = []; for (let i = 0; i < 9; i++) { const g = new THREE.Group(); const h = 70 + R() * 110, w = 18 + R() * 14; const tm = new THREE.MeshStandardMaterial({ color: [0x7fa8cc, 0x9ab8d0, 0x6f90b0][i % 3], roughness: 0.2, metalness: 0.5 });
    const b = new THREE.Mesh(BX(w, h, w), tm); b.position.y = h / 2; g.add(b); for (let y = 6; y < h; y += 6) { const s = new THREE.Mesh(BX(w + 0.3, 0.6, w + 0.3), M(0xdfe6ee, 0.5)); s.position.y = y; g.add(s); }
    g.position.set(-130 + i * 32 + R() * 10, 0, -150 - R() * 120); g.rotation.y = R(); A.add(g); TOWERS.push({ g, h, ph: R(), dir: R() < 0.5 ? -1 : 1 }); }
  // the stone clock tower
  const tower = new THREE.Group(); const stoneM = M(0xcdb08a, 0.9), stoneD = M(0xa88e6c, 0.9); const towerTop = new THREE.Group();
  { const B = Builder(); B.add(BX(5, 14, 5), stoneM, 0, 7, 0); B.add(BX(5.6, 0.6, 5.6), stoneD, 0, 0.3, 0); B.add(BX(5.6, 0.5, 5.6), stoneD, 0, 14, 0); for (let y = 3; y < 9; y += 4) B.add(BX(0.9, 2.2, 0.1), M(0x3a3028, 0.8), 0, y, 2.52); B.build(tower);
    const T = Builder(); T.add(BX(4.4, 6, 4.4), stoneM, 0, 3, 0); for (const [x, zz] of [[-1.6, 1.6], [1.6, 1.6], [-1.6, -1.6], [1.6, -1.6]]) T.add(BX(0.6, 6, 0.6), stoneD, x, 3, zz); T.add(new THREE.ConeGeometry(3.6, 4, 4).rotateY(Math.PI / 4), M(0x4a6a6a, 0.6, 0.3), 0, 8, 0); T.build(towerTop); towerTop.position.y = 14.25; tower.add(towerTop);
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.7, 40), M(0xf6efe2, 0.5)); face.position.set(0, 11.5, 2.53); tower.add(face);
    const hh = new THREE.Mesh(BX(0.14, 1.0, 0.05), M(0x111111, 0.5)); hh.geometry.translate(0, 0.45, 0); hh.position.set(0, 11.5, 2.58); tower.add(hh); const mh = new THREE.Mesh(BX(0.1, 1.45, 0.05), M(0x111111, 0.5)); mh.geometry.translate(0, 0.65, 0); mh.position.set(0, 11.5, 2.6); tower.add(mh);
    tower.userData = { hh, mh, face }; tower.position.set(-3.2, 0, -19); A.add(tower); }
  // metro entrance (stair well + railing + sign); water rises in it
  const metro = new THREE.Group(); { const B = Builder(); const pitW = 2.2, pitL = 4.2;
    B.add(BX(pitW, 4, 0.2), M(0x8a8a8a, 0.9), 0, -2, -pitL / 2); B.add(BX(pitW, 4, 0.2), M(0x8a8a8a, 0.9), 0, -2, pitL / 2); B.add(BX(0.2, 4, pitL), M(0x8a8a8a, 0.9), -pitW / 2, -2, 0); B.add(BX(0.2, 4, pitL), M(0x8a8a8a, 0.9), pitW / 2, -2, 0);
    for (let i = 0; i < 14; i++) B.add(BX(pitW - 0.2, 0.28, 0.3), M(0x9a9a9a, 0.9), 0, -0.2 - i * 0.28, -pitL / 2 + 0.15 + i * 0.3);
    for (const s of [-1, 1]) { B.add(BX(0.06, 0.06, pitL), ironM, s * pitW / 2, 1.0, 0); for (let i = 0; i < 6; i++) B.add(BX(0.05, 1.0, 0.05), ironM, s * pitW / 2, 0.5, -pitL / 2 + i * pitL / 5); }
    B.add(BX(pitW, 0.06, 0.06), ironM, 0, 1.0, -pitL / 2); B.add(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), ironM, pitW / 2 + 0.3, 1.4, pitL / 2); B.build(metro);
    const msg = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), signMat('M', '#d8342c', '#ffffff', 128, 128)); msg.position.set(pitW / 2 + 0.3, 2.9, pitL / 2 + 0.07); metro.add(msg); shopMats.push(msg.material);
    metro.position.set(2.8, 0, -8.5); metro.rotation.y = -0.3; A.add(metro); }
  const pitHole = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 4.0), M(0x1a1a1e, 1)); pitHole.rotation.x = -Math.PI / 2; pitHole.position.set(0, -3.9, 0); metro.add(pitHole);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 4.0), new THREE.MeshStandardMaterial({ color: 0x2a6f8f, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.92 })); water.rotation.x = -Math.PI / 2; metro.add(water);
  // hole in the cobbles for the pit
  ground.geometry = (() => { const sh = new THREE.Shape(); sh.moveTo(-40, -40); sh.lineTo(40, -40); sh.lineTo(40, 40); sh.lineTo(-40, 40); sh.closePath();
    const hp = new THREE.Path(); const c = Math.cos(-0.3), s = Math.sin(-0.3); const pts = [[-1.1, -2.1], [1.1, -2.1], [1.1, 2.1], [-1.1, 2.1]].map(([x, z]) => [2.8 + x * c + z * s, -8.5 - x * s + z * c]); // world xz of the pit corners
    hp.moveTo(pts[0][0], -(pts[0][1] + 10)); for (let i = 1; i < 4; i++) hp.lineTo(pts[i][0], -(pts[i][1] + 10)); hp.closePath(); sh.holes.push(hp); const g = new THREE.ShapeGeometry(sh);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 40) / 80, (p.getY(i) + 40) / 80); return g; })();
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x3a7f9f, roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(2.8, 0.02, -8.0); A.add(puddle);
  // street lamps + café string lights
  const lampBulbs = [], lamps = []; const bulbOn = new THREE.MeshBasicMaterial({ color: 0xffe2a0, toneMapped: false }), bulbOff = M(0x6a665e, 0.4);
  for (const [x, z] of [[-6, -3], [8, -2], [-10, -14], [10, -15], [0, -18]]) { const l = new THREE.Group(); const L = Builder(); L.add(new THREE.CylinderGeometry(0.07, 0.11, 3.8, 12), ironM, 0, 1.9, 0); L.add(RB(0.36, 0.5, 0.36, 0.06), ironM, 0, 3.95, 0); L.build(l);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), bulbOn); b.position.y = 3.9; l.add(b); lampBulbs.push(b); l.position.set(x, 0, z); A.add(l); lamps.push(l); }
  // café terrace: other tables with umbrellas, cups
  const cafe = new THREE.Group(); { const B = Builder(); const wood = M(0x8a5a34, 0.7);
    for (const [x, z] of [[-3.2, -2.6], [3.6, -1.2], [-2.4, -6.5], [2.0, -5.2]]) { B.add(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 20), M(0xf6efe2, 0.5), x, 0.74, z); B.add(new THREE.CylinderGeometry(0.04, 0.05, 0.74, 8), ironM, x, 0.37, z);
      for (const a of [0, 2.4, 4.2]) { const cx = x + Math.cos(a) * 0.65, cz = z + Math.sin(a) * 0.65; B.add(RB(0.4, 0.05, 0.4, 0.02), wood, cx, 0.45, cz); B.add(RB(0.4, 0.4, 0.04, 0.02), wood, cx + Math.cos(a) * 0.2, 0.68, cz + Math.sin(a) * 0.2, 0, -a + Math.PI / 2, 0); for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) B.add(BX(0.03, 0.45, 0.03), ironM, cx + dx, 0.22, cz + dz); }
      B.add(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), M(0xeeeeee, 0.5), x, 1.2, z); B.add(new THREE.ConeGeometry(1.4, 0.5, 8, 1, true), M([0xe63946, 0x2a6a5a, 0xf2c14e, 0x3a7bd5][Math.abs(Math.round(x)) % 4], 0.8), x, 2.35, z);
      B.add(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 12), M(0xffffff, 0.4), x + 0.1, 0.8, z); }
    B.build(cafe); A.add(cafe); }
  // our table: board + pieces + your chess clock + coffee
  const table = new THREE.Group(); const tableTop = new THREE.Group(); table.add(tableTop);
  const wood = M(0x8a5a34, 0.7);
  const tTopM = new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: 0.5 }); { const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 32), tTopM); top.position.y = 0.74; top.castShadow = top.receiveShadow = true; table.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.74, 8), ironM); leg.position.y = 0.37; table.add(leg); const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.04, 16), ironM); ft.position.y = 0.02; table.add(ft); }
  const boardTex = canvasTex(256, 256, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#6b3e1e' : '#f2dcb0'; g.fillRect(i * 32, j * 32, 32, 32); } });
  const boardM = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.5 }); const board = new THREE.Mesh(RB(0.42, 0.03, 0.42, 0.01), [M(0x4a2a14, 0.6), M(0x4a2a14, 0.6), boardM, M(0x4a2a14, 0.6), M(0x4a2a14, 0.6), M(0x4a2a14, 0.6)]);
  board.position.y = 0.775; board.castShadow = board.receiveShadow = true; table.add(board);
  const pieceW = M(0xf6f0e0, 0.4), pieceB = M(0x1e1e24, 0.35); const PIECES = [];
  const pawnG = mergeGeometries([new THREE.CylinderGeometry(0.014, 0.018, 0.012, 14).translate(0, 0.006, 0), new THREE.CylinderGeometry(0.007, 0.012, 0.03, 12).translate(0, 0.027, 0), new THREE.SphereGeometry(0.01, 12, 8).translate(0, 0.046, 0)].map(g => g.toNonIndexed()));
  const kingG = mergeGeometries([new THREE.CylinderGeometry(0.017, 0.021, 0.014, 14).translate(0, 0.007, 0), new THREE.CylinderGeometry(0.009, 0.015, 0.06, 12).translate(0, 0.044, 0), new THREE.BoxGeometry(0.006, 0.02, 0.006).translate(0, 0.084, 0), new THREE.BoxGeometry(0.016, 0.006, 0.006).translate(0, 0.084, 0)].map(g => g.toNonIndexed()));
  const sqr = (i, j) => [-0.1575 + i * 0.045, -0.1575 + j * 0.045];   // board square centre (x, z); j=0 is Mittens' side? (z towards camera = white)
  const place0 = [[0, 7, 'B', 'K'], [4, 7, 'B', 'K'], [1, 6, 'B'], [2, 6, 'B'], [5, 5, 'B'], [6, 6, 'B'], [7, 6, 'B'], [3, 4, 'B'], [4, 0, 'W', 'K'], [2, 0, 'W', 'K'], [0, 1, 'W'], [1, 1, 'W'], [5, 1, 'W'], [6, 2, 'W'], [7, 1, 'W'], [3, 3, 'W']];
  for (const [i, j, c, k] of place0) { const p = new THREE.Mesh(k ? kingG : pawnG, c === 'W' ? pieceW : pieceB); const [x, z] = sqr(i, j); p.position.set(x, 0.79, z); p.castShadow = true; table.add(p); PIECES.push(p); }
  const movePiece = PIECES[15];   // Mittens' white piece, pushed with his paw at the start (3,3) -> (3,4)? takes black (3,4)
  const takenPiece = PIECES[7];
  const clockG = new THREE.Group(); { const B = Builder(); B.add(RB(0.2, 0.08, 0.08, 0.015), M(0xc9a060, 0.5), 0, 0.04, 0); B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18).rotateX(Math.PI / 2), M(0xffffff, 0.4), -0.05, 0.045, 0.041); B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18).rotateX(Math.PI / 2), M(0xffffff, 0.4), 0.05, 0.045, 0.041);
    B.add(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), M(0xe63946, 0.4), -0.05, 0.095, 0); B.add(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), M(0xe63946, 0.4), 0.05, 0.09, 0); B.build(clockG); A.add(clockG); }
  const cup = new THREE.Group(); { const B = Builder(); B.add(new THREE.CylinderGeometry(0.04, 0.032, 0.08, 16), M(0xffffff, 0.35), 0, 0.04, 0); B.add(new THREE.CylinderGeometry(0.07, 0.07, 0.008, 18), M(0xffffff, 0.35), 0, 0.004, 0); B.add(new THREE.TorusGeometry(0.022, 0.006, 6, 12), M(0xffffff, 0.35), 0.05, 0.045, 0); B.build(cup); cup.position.set(0.33, 0.76, -0.12); table.add(cup); }
  const chairB = new THREE.Group(); { const B = Builder(); B.add(RB(0.42, 0.05, 0.42, 0.02), wood, 0, 0.46, 0); B.add(RB(0.42, 0.45, 0.04, 0.02), wood, 0, 0.72, -0.2); for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) B.add(BX(0.03, 0.46, 0.03), ironM, dx, 0.23, dz); B.build(chairB); chairB.position.set(0, 0, -0.72); table.add(chairB); }
  const chairM = chairB.clone(); chairM.position.set(-0.68, 0, 0.0); chairM.rotation.y = Math.PI / 2; table.add(chairM);
  A.add(table);
  // moss on the table/board as decades pass
  const mossC = new THREE.Color(0x4f7a3a);

  // ---------------- vegetation (grows with time) ----------------
  const weedG = mergeGeometries([new THREE.ConeGeometry(0.06, 0.25, 5).translate(0.03, 0.12, 0), new THREE.ConeGeometry(0.05, 0.2, 5).translate(-0.04, 0.1, 0.02), new THREE.ConeGeometry(0.05, 0.22, 5).translate(0, 0.11, -0.04)].map(g => g.toNonIndexed()));
  const NWEED = 900; const weeds = new THREE.InstancedMesh(weedG, M(0x5f9a3a, 0.85), NWEED); const WD = [];
  for (let i = 0; i < NWEED; i++) { let x, z; do { x = (R() - 0.5) * 32; z = -24 + R() * 30; } while (Math.hypot(x, z) < 0.7 || (Math.abs(x - 2.8) < 1.8 && Math.abs(z + 8.5) < 2.8)); WD.push([x, z, 0.6 + R() * 1.4, R() * 6]); }
  weeds.castShadow = false; weeds.receiveShadow = true; A.add(weeds);
  const crownG = new THREE.IcosahedronGeometry(1, 2), trunkG2 = new THREE.CylinderGeometry(0.12, 0.2, 1, 8).translate(0, 0.5, 0);
  const NTREE = 70; const crowns = new THREE.InstancedMesh(crownG, M(0x4f8a3a, 0.85), NTREE), trunks = new THREE.InstancedMesh(trunkG2, M(0x5a3a22, 0.9), NTREE); const TR = [];
  for (let i = 0; i < NTREE; i++) { let x, z; do { x = (R() - 0.5) * 34; z = -25 + R() * 29; } while (Math.hypot(x, z) < 2.2 || (Math.abs(x - 5.2) < 2 && Math.abs(z + 7.5) < 3) || (Math.abs(x + 3.2) < 3.5 && Math.abs(z + 19) < 3.5) || z > -3.5 || (Math.abs(x - 2.8) < 2 && Math.abs(z + 8.5) < 3)); TR.push([x, z, 0.7 + R() * 0.6, R()]); crowns.setColorAt(i, col.set([0x4f8a3a, 0x5d9a40, 0x3f7a34, 0x6a9a3a][i % 4])); }
  crowns.castShadow = trunks.castShadow = true; crowns.receiveShadow = true; A.add(crowns, trunks);
  // ice sheet
  const iceM = new THREE.MeshStandardMaterial({ color: 0xe8f2ff, roughness: 0.35, metalness: 0.05 }); const ice = new THREE.Mesh(new THREE.BoxGeometry(400, 60, 400), iceM); ice.receiveShadow = true; ice.name = 'ice'; A.add(ice);

  // ---------------- characters ----------------
  const P = makePerson(THREE, { shirt: 0x2bb3b1, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0x3a2a1e, seed: 5, hairStyle: 'short' }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const mit = makeCat(THREE, 0xf0a040); mit.rotation.order = 'YXZ'; A.add(mit); const MC = mit.userData.cat;
  function makePigeon() { const pg = new THREE.Group(); const gm = M(0x8d94a0, 0.6), nk = new THREE.MeshStandardMaterial({ color: 0x5f8a7a, roughness: 0.4, metalness: 0.3 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), gm); b.scale.set(0.85, 0.8, 1.25); b.position.y = 0.12; pg.add(b);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.02, 0.12, 2, 0.01), M(0x4a4f58, 0.6)); tl.position.set(0, 0.12, -0.15); tl.rotation.x = 0.4; pg.add(tl);
    const hp = new THREE.Group(); hp.position.set(0, 0.2, 0.08); pg.add(hp); const h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), nk); h.position.set(0, 0.04, 0.03); hp.add(h);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 8).rotateX(Math.PI / 2), M(0xd9a05a, 0.5)); bk.position.set(0, 0.035, 0.1); hp.add(bk);
    for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M(0xff7a1a, 0.3)); ey.position.set(sx * 0.04, 0.06, 0.06); hp.add(ey); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M(0x111111, 0.3)); pu.position.set(sx * 0.047, 0.062, 0.07); hp.add(pu);
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), M(0xe06a6a, 0.6)); lg.position.set(sx * 0.03, 0.03, 0.02); pg.add(lg); }
    pg.userData.head = hp; pg.traverse(o => { if (o.isMesh) o.castShadow = true; }); return pg; }
  const pigeon = makePigeon(); A.add(pigeon);
  // BAD TIMING: a proposal at the next table (he kneels with a ring box; she is about to answer)
  const pr = makePerson(THREE, { shirt: 0x22262c, pants: 0x22262c, hair: 0x1a1210, skin: 0xd8a47e, shoe: 0x111111, seed: 23, hairStyle: 'short' }); pr.group.rotation.order = 'YXZ'; A.add(pr.group);
  const pw = makePerson(THREE, { shirt: 0xe63946, pants: 0x3b3b46, hair: 0xf2d27a, skin: 0xf1c6a5, shoe: 0xe63946, seed: 37, hairStyle: 'long' }); pw.group.rotation.order = 'YXZ'; A.add(pw.group);
  const ringBox = new THREE.Group(); { const b = new THREE.Mesh(RB(0.07, 0.05, 0.07, 0.01), M(0xb0203a, 0.5)); ringBox.add(b); const rg = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 16), M(0xffd23f, 0.2, 0.9)); rg.position.y = 0.04; ringBox.add(rg); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.01), new THREE.MeshBasicMaterial({ color: 0xdff6ff })); gem.position.y = 0.062; ringBox.add(gem); A.add(ringBox); }
  // passers-by
  const PEDS = []; for (let i = 0; i < 5; i++) { const p = makePerson(THREE, { shirt: [0xf2c14e, 0x3a7bd5, 0x8e5bb5, 0x4caf7a, 0xf28c38][i], pants: [0x2b2f3a, 0x5a4a3a, 0x22262c, 0x3b3b46, 0x1d3f6e][i], hair: [0x2a1a10, 0x8a5a2a, 0x111111, 0xc0c0c0, 0x6a3a1a][i], skin: [0xf1c6a5, 0x8d5a3b, 0xd8a47e, 0xb5835a, 0xf1c6a5][i], seed: 50 + i, hairStyle: i % 2 ? 'long' : 'short' }); p.group.rotation.order = 'YXZ'; A.add(p.group); PEDS.push({ p, z: -4.5 - i * 2.6, x0: (R() - 0.5) * 20, dir: i % 2 ? 1 : -1, v: 1.0 + R() * 0.4 }); }
  const puff = makeBurst(THREE, 260, { seed: 9, origin: (r) => { const k = Math.floor(r() * 9); const pts = [[0, 1.1, -0.72], [1.35, 0.7, -3.3], [1.05, 1.0, -4.3], ...PEDS.map(p => [0, 1.1, p.z]), [0, 1.0, -0.72]]; const b = pts[k]; return [b[0] + (r() - 0.5) * 0.4, b[1] + (r() - 0.5) * 1.2, b[2] + (r() - 0.5) * 0.4]; }, dir: (r) => [(r() - 0.5), 0.6 + r(), (r() - 0.5)], speed: [0.4, 1.4], life: [0.4, 0.9], gravity: -0.5, size: 9, color: 0xfff6dc, opacity: 0.95 });
  A.add(puff);

  // =====================================================================================================
  // SCENE B: space (not to scale: Earth radius 100, the Sun 3,000 away)
  // =====================================================================================================
  const B2 = new THREE.Scene(); B2.background = new THREE.Color(0x03050f); const camB = new THREE.PerspectiveCamera(46, W / H, 5, 5e5);
  B2.add(stars(THREE, 5000, 2e5, 17)); B2.add(new THREE.HemisphereLight(0xbfd4ff, 0x40304a, 0.25));
  const SUNP = new THREE.Vector3(0, 3000, 0);
  const sunL = new THREE.DirectionalLight(0xfff0dc, 3.2); sunL.position.copy(SUNP); B2.add(sunL);
  const sunTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); const r = rng(12); for (let k = 0; k < 900; k++) { const x = r() * w, y = r() * h, s = 2 + r() * 9; const dk = r() < 0.4; g.fillStyle = dk ? `rgba(${90 + r() * 60 | 0},${30 + r() * 30 | 0},${10 + r() * 20 | 0},${0.35 + r() * 0.3})` : `rgba(${220 + r() * 35 | 0},${170 + r() * 60 | 0},${110 + r() * 60 | 0},${0.3 + r() * 0.3})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } });
  const sunM = new THREE.MeshBasicMaterial({ color: 0xfff2c0, map: sunTex, toneMapped: false }); const sunS = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), sunM); sunS.position.copy(SUNP); B2.add(sunS);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xffd080, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); sunGlow.position.copy(SUNP); B2.add(sunGlow);
  // Earth with a live texture: continents drift together, oceans dry up, the crust glows
  const EC = document.createElement('canvas'); EC.width = 1024; EC.height = 512; const eg = EC.getContext('2d'); const eTex = new THREE.CanvasTexture(EC); eTex.colorSpace = THREE.SRGBColorSpace;
  const CONT = []; { const rr = rng(44); const starts = [[0.12, 0.33, 0.13, 0.16], [0.2, 0.64, 0.07, 0.14], [0.52, 0.3, 0.17, 0.13], [0.5, 0.55, 0.08, 0.14], [0.78, 0.66, 0.07, 0.06], [0.68, 0.32, 0.12, 0.1]];
    for (const [cx, cy, rx, ry] of starts) { const pts = []; for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; const n = 0.75 + 0.35 * rr(); pts.push([Math.cos(a) * rx * n, Math.sin(a) * ry * n]); } CONT.push({ cx, cy, pts }); } }
  const MERGE = [0.36, 0.42, 0.44, 0.5, 0.52, 0.47];   // target longitudes (fraction) of the supercontinent
  function drawEarth(mu, dry, hot) {
    const w = 1024, h = 512; const oc = new THREE.Color(0x1f5fa8).lerp(new THREE.Color(0x9a7a58), dry).lerp(new THREE.Color(0x5a1a0a), hot);
    eg.fillStyle = '#' + oc.getHexString(); eg.fillRect(0, 0, w, h);
    const ln = new THREE.Color(0x4f8a3a).lerp(new THREE.Color(0xb08a50), Math.max(dry, mu * 0.4)).lerp(new THREE.Color(0x3a1206), hot);
    CONT.forEach((c, i) => { const cx = lerp(c.cx, MERGE[i], mu) * w, cy = lerp(c.cy, 0.5 + (c.cy - 0.5) * 0.45, mu) * h; eg.fillStyle = '#' + ln.getHexString(); eg.beginPath(); c.pts.forEach(([x, y], k) => { const px = cx + x * w * (1 + mu * 0.25), py = cy + y * h; if (k) eg.lineTo(px, py); else eg.moveTo(px, py); }); eg.closePath(); eg.fill(); });
    if (hot > 0) { eg.strokeStyle = `rgba(255,${120 + 80 * hot | 0},40,${hot})`; eg.lineWidth = 4; const rr = rng(8); for (let k = 0; k < 60; k++) { eg.beginPath(); let x = rr() * w, y = rr() * h; eg.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (rr() - 0.5) * 60; y += (rr() - 0.5) * 40; eg.lineTo(x, y); } eg.stroke(); } }
    eg.fillStyle = `rgba(240,245,255,${0.9 * (1 - dry)})`; eg.fillRect(0, 0, w, 30); eg.fillRect(0, h - 30, w, 30);
    eTex.needsUpdate = true; }
  drawEarth(0, 0, 0);
  const embers = makeBurst(THREE, 600, { seed: 31, origin: (r) => { const a = r() * 6.28, b = r() * 3.14; return [100 * Math.sin(b) * Math.cos(a), 100 * Math.cos(b), 100 * Math.sin(b) * Math.sin(a)]; }, dir: (r) => [(r() - 0.5) * 0.8, 0.6 + r(), (r() - 0.5) * 0.8], speed: [40, 160], life: [0.8, 1.6], gravity: 0, size: 10, color: 0xffb060, opacity: 0.95 });
  const earthM = new THREE.MeshStandardMaterial({ map: eTex, roughness: 0.85, emissive: 0xff4a10, emissiveMap: eTex, emissiveIntensity: 0 }); const earth = new THREE.Mesh(new THREE.SphereGeometry(100, 96, 48), earthM); earth.rotation.set(0.35, 0, 0); B2.add(earth); B2.add(embers);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(101.8, 96, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { c: { value: new THREE.Color(0.35, 0.65, 1.0) }, k: { value: 1.6 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 c; uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(c,1.0)*f*k; }` })); atm.scale.setScalar(1.0); B2.add(atm);

  // MITTENS CAM (space part): Mittens and the Pigeon still at the board
  const MCam = new THREE.Scene(); const mcBg = new THREE.Color(0x0a1438); MCam.background = mcBg; MCam.add(new THREE.HemisphereLight(0xffffff, 0xb0a0c0, 1.1)); const mcD = new THREE.DirectionalLight(0xfff0d8, 2.2); mcD.position.set(1.5, 2, 3); MCam.add(mcD);
  const mc = makeCat(THREE, 0xf0a040); MCam.add(mc); const MCC = mc.userData.cat; mc.position.set(-0.32, 0, 0); mc.rotation.y = 0.9;
  const mcBoard = new THREE.Mesh(RB(0.42, 0.03, 0.42, 0.01), [M(0x4a2a14, 0.6), M(0x4a2a14, 0.6), boardM, M(0x4a2a14, 0.6), M(0x4a2a14, 0.6), M(0x4a2a14, 0.6)]); mcBoard.position.set(0, 0.2, 0.05); MCam.add(mcBoard);
  const mcRock = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x6a5a50, roughness: 0.9, emissive: 0xff4010, emissiveIntensity: 0 })); mcRock.position.y = -0.05; MCam.add(mcRock);
  const mcPg = makePigeon(); mcPg.position.set(0.3, 0.0, 0.0); mcPg.rotation.y = -1.0; mcPg.scale.setScalar(1.2); MCam.add(mcPg);
  for (const [i, j, c, k] of place0) { const p = new THREE.Mesh(k ? kingG : pawnG, c === 'W' ? pieceW : pieceB); const [x, z] = sqr(i, j); p.position.set(x, 0.215, z + 0.05); MCam.add(p); }
  const shades = new THREE.Group(); { for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16).rotateX(Math.PI / 2), M(0x111111, 0.2, 0.3)); l.position.set(sx * 0.078, 0.085, 0.235); shades.add(l); } const br = new THREE.Mesh(BX(0.08, 0.01, 0.01), M(0x111111, 0.3)); br.position.set(0, 0.09, 0.235); shades.add(br); MCC.headPivot.add(shades); }
  const mcCam = new THREE.PerspectiveCamera(32, 1, 0.05, 30); mcCam.position.set(0.05, 0.62, 1.45); mcCam.lookAt(-0.05, 0.3, 0.0);

  await document.fonts.ready;

  const milIdx = (t) => { let k = -1; for (let i = 0; i < MT.length; i++) if (t >= MT[i] - 0.05) k = i; return k; };
  const MOODS = ['unimpressed', 'annoyed', 'sleepy', 'annoyed', 'shock', 'unimpressed', 'scared', 'annoyed', 'shock', 'unimpressed', 'scared'];
  function weedsAt(Y, t) { const g = smooth(-1.2, 0.2, Y) * (1 + 0.8 * smooth(0.2, 2, Y)) * (1 - smooth(4.4, 4.9, Y)); for (let i = 0; i < NWEED; i++) { const [x, z, s, r] = WD[i]; const k = g * s * (0.6 + 0.4 * Math.sin(r * 3)); m4.compose(v.set(x, 0, z), q.setFromEuler(e.set(0, r, 0)), sc.set(k + 1e-4, k + 1e-4, k + 1e-4)); weeds.setMatrixAt(i, m4); } weeds.instanceMatrix.needsUpdate = true; }
  function treesAt(Y) { const g0 = smooth(0.3, 1.65, Y), g1 = smooth(1.65, 2.8, Y), gone = 1 - smooth(4.3, 4.85, Y); for (let i = 0; i < NTREE; i++) { const [x, z, s, r] = TR[i]; const d = clamp(g0 * 1.15 - r * 0.25) * gone; const hgt = (1.0 + 3.6 * d + 2.6 * g1) * s * d, cr = (0.4 + 1.1 * d + 0.8 * g1) * s * d;
      m4.compose(v.set(x, 0, z), q.identity(), sc.set(s * d + 1e-4, hgt * 0.62 + 1e-4, s * d + 1e-4)); trunks.setMatrixAt(i, m4); m4.compose(v.set(x, hgt * 0.62 + cr * 0.6, z), q.setFromEuler(e.set(0, r * 6, 0)), sc.set(cr + 1e-4, cr * 0.85 + 1e-4, cr + 1e-4)); crowns.setMatrixAt(i, m4); }
    trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; }
  function pigeonHead(pg, t, think) { const hp = pg.userData.head; hp.position.z = 0.08 + 0.02 * Math.sin(t * 7) * (Math.sin(t * 0.9) > 0 ? 1 : 0); hp.rotation.y = think ? 0.35 * Math.sin(t * 0.6) : 0.4 * Math.sin(Math.floor(t * 0.8) * 2.1); hp.rotation.x = think ? 0.35 : 0; }

  function update(tt) {
    const T = teaserTime(tt, { teaser: TEASER, payoffT: SEND - 0.75 }); const t = T.st;
    const out = { scene: A, camera: cam, bloom: 0.22, bloomThreshold: 0.92, t, tt, teaser: T.inTeaser, tk: T.k, env: 0.32, exposure: 0.95, sat: 1.22, contrast: 1.06, voff: 0 };
    const yrs = yrsAt(t), Y = Math.log10(Math.max(yrs, 1e-12)); out.yrs = yrs; out.mi = milIdx(t); out.Y = Y;
    const van = t >= TV;
    // ---------------- the world decays ----------------
    const lightsOn = yrs < 1 / 365 * 0.97; litM.emissiveIntensity = lightsOn ? 1.2 : 0.0; litM.color.set(lightsOn ? 0xffe2a8 : 0x2a3a4c); lampBulbs.forEach(b => b.material = lightsOn ? bulbOn : bulbOff);
    shopMats.forEach(m => { m.color.setScalar(lerp(1, 0.55, smooth(0, 2, Y))); });
    water.position.y = lerp(-3.85, -0.25, smooth(Math.log10(1.2 / 365), Math.log10(2 / 365), Y)); water.visible = Y > Math.log10(1.1 / 365) && Y < 4.6;
    weedsAt(Y, t); treesAt(Y);
    groundM.color.set(0xffffff).lerp(new THREE.Color(0x6f8a50), smooth(0.2, 2.2, Y) * 0.7);
    const decayW = smooth(0.8, 2.3, Y);
    HOUSES.forEach(h => { const yr = 1.85 + h.ph * 0.3; const rf = smooth(yr, yr + 0.25, Y); h.roof.rotation.x = rf * 0.5 * (h.ph > 0.5 ? 1 : -1); h.roof.position.y = lerp(h.H + 0.15, h.H * 0.45, rf); h.roof.scale.setScalar(1 - 0.6 * smooth(yr + 0.2, yr + 0.5, Y)); h.roof.visible = Y < yr + 0.55;
      const cr = smooth(1.95 + h.ph * 0.25, 3.0, Y); h.walls.scale.y = Math.max(0.02, 1 - 0.85 * cr); h.walls.children.forEach(c => { if (c.material && c.material.color && c.isMesh && !c.material.map) {} }); h.g.visible = Y < 4.8; });
    TOWERS.forEach(tw => { const f = smooth(2.2 + tw.ph * 0.5, 2.6 + tw.ph * 0.5, Y); tw.g.rotation.z = tw.dir * f * 1.45; tw.g.visible = Y < 3.6; });
    tower.userData.hh.rotation.z = -(lightsOn ? t * 0.05 : (TV + 6.4) * 0.05) * 1.2 - 0.6; tower.userData.mh.rotation.z = -(lightsOn ? (t - TV > 0 ? (t - TV) * 6 : t * 0.3) : 6.5 * 6) - 1;   // electric clock stops when the power goes
    towerTop.rotation.z = smooth(2.95, 3.25, Y) * 0.3; towerTop.position.y = lerp(14.25, 10, smooth(2.95, 3.25, Y)); towerTop.visible = Y < 3.35; tower.scale.y = 1 - 0.35 * smooth(3.3, 4.2, Y);
    // ice sheet rises at the ice age (everything under it is scraped away)
    const iceH = lerp(-1.5, 3.2, smooth(4.3, 4.95, Y)); ice.position.set(0, iceH - 30, -40); ice.visible = Y > 4.2; out.iceH = Math.max(0, iceH);
    const lift = out.iceH;
    // table, moss
    const moss = smooth(1.0, 2.2, Y); tTopM.color.set(0xf6efe2).lerp(mossC, moss * 0.8); table.position.y = lift; cafe.visible = Y < 2.4; metro.visible = Y < 4.6; lamps.forEach(l => { l.visible = Y < 3; l.rotation.z = smooth(2.2, 2.6, Y) * 0.4; }); puddle.visible = Y > Math.log10(1.6 / 365) && Y < 4.5; puddle.scale.setScalar(0.3 + 3.2 * smooth(Math.log10(1.6 / 365), 1.4, Y)); cafe.scale.y = 1 - 0.8 * smooth(1.8, 2.4, Y);
    // the move: Mittens pushes his piece and takes a black one (0.4-1.4 s)
    { const u = smooth(0.5, 1.3, t); const [x0, z0] = sqr(3, 3), [x1, z1] = sqr(3, 4); movePiece.position.set(lerp(x0, x1, u), 0.79 + Math.sin(Math.PI * u) * 0.04, lerp(z0, z1, u)); takenPiece.visible = u < 0.6; }
    // ---------------- you (the referee) ----------------
    { const G = P.group; G.position.set(0, lift, -0.68); G.rotation.set(0, 0, 0); P.legL.rotation.set(-1.45, 0, -0.05); P.legR.rotation.set(-1.45, 0, 0.05); G.position.y = lift - 0.36;
      P.armL.rotation.set(-1.1, 0, -0.15); P.armR.rotation.set(-1.1, 0, 0.15); P.torso.rotation.set(0.05, 0, 0);
      let face = { brows: 'up', eyes: 1.1, mouth: 'smile', look: [-0.4, -0.6] }, head = [0.25, -0.2, 0]; if (t > 1.3) { face = { brows: 'up', eyes: 1.25, mouth: 'o', look: [0.6, -0.5] }; head = [0.2, 0.35, 0]; } if (t > 2.2) { face = { brows: 'neutral', eyes: 1.0, mouth: 'smile', look: [0.5, -0.3] }; head = [0.15, 0.3, 0]; }
      P.headPivot.rotation.set(...head); setFace(P, face); life(P, t, 0.7); G.visible = !van; }
    // chess clock: in your hands, then drops onto the table
    { if (!van) { P.group.updateMatrixWorld(true); P.armL.userData.end.getWorldPosition(tv); const a = tv.clone(); P.armR.userData.end.getWorldPosition(tv); clockG.position.copy(a.add(tv).multiplyScalar(0.5)).add(v.set(0, 0.03, 0.03)); clockG.rotation.set(0, 0, 0); }
      else { const u = clamp((t - TV) / 0.35); const y0 = 0.86 + lift, y1 = 0.762 + lift; clockG.position.set(lerp(0.0, 0.16, u), lerp(y0, y1, u * u), lerp(-0.4, -0.3, u)); clockG.rotation.set(0, 0, u < 1 ? 0.3 * u : 0.3 * Math.exp(-(t - TV - 0.35) * 8) * Math.cos((t - TV) * 30) + 0.0); } clockG.visible = true; }
    // ---------------- Mittens (on the chair at the left of the board) and the Pigeon (on the table, right) ----------------
    { let mood = 'smug'; if (t < 0.4) mood = 'unimpressed'; if (t > 1.5) mood = 'smug'; if (t > 2.2) mood = 'annoyed'; if (van && t < TV + 1.4) mood = 'shock'; if (t > TV + 1.4) mood = 'annoyed'; if (t > 6.9) mood = 'unimpressed';
      if (t >= MT[0] - 0.1) mood = MOODS[Math.max(0, out.mi)];
      mit.position.set(-0.5, 0.48 + lift, 0.02); mit.scale.setScalar(1.35); mit.rotation.set(0, Math.PI / 2 - 0.35, 0);
      const paw = MC.legs[3]; MC.legs.forEach(l => { l.rotation.x = 0; l.position.y = 0.07; });
      const reach = smooth(0.35, 0.6, t) * (1 - smooth(1.25, 1.5, t)); const tap = t > TV + 1.6 && t < CUT ? Math.max(0, Math.sin(t * 9)) * (Math.sin(t * 0.9) > 0.2 ? 1 : 0) : 0;
      paw.rotation.x = -1.6 * reach - 0.9 * tap; paw.position.y = 0.07 + 0.18 * reach + 0.12 * tap;
      MC.headPivot.rotation.y = t < 2.2 ? -0.2 : (van && t < TV + 1.4 ? -0.5 + 0.6 * Math.sin(t * 6) : 0.25 + 0.15 * Math.sin(t * 0.7)); MC.headPivot.rotation.x = mood === 'sleepy' ? 0.25 : 0;
      setCatFace(mit, mood, 0.25); catLife(mit, t, 1); mit.visible = t < CUT; out.mood = mood;
      pigeon.position.set(0.33, 0.76 + lift, 0.08); pigeon.rotation.set(0, -Math.PI / 2 + 0.3, 0); pigeon.scale.setScalar(1.1); pigeonHead(pigeon, t, true); pigeon.visible = t < CUT;
      if (van && t < TV + 0.6) { pigeon.position.y += Math.max(0, Math.sin((t - TV) * 10)) * 0.08; } }
    // ---------------- the proposal (Bad Timing) ----------------
    { pr.group.position.set(1.35, 0, -3.3); pr.group.rotation.set(0, 2.6, 0); pr.legL.rotation.set(-1.5, 0, 0); pr.legR.rotation.set(0.0, 0, 0); pr.group.position.y = -0.35; pr.legR.rotation.x = 0.1; pr.armR.rotation.set(-1.35, 0, 0.1); pr.armL.rotation.set(-0.2, 0, -0.1);
      setFace(pr, { brows: 'up', eyes: 1.1, mouth: 'smile', look: [0, 0.5] }); pr.headPivot.rotation.set(-0.35, 0, 0); life(pr, t, 0.5); pr.group.visible = !van;
      pw.group.position.set(1.05, -0.36, -4.3); pw.group.rotation.set(0, 0.2, 0); pw.legL.rotation.set(-1.45, 0, -0.05); pw.legR.rotation.set(-1.45, 0, 0.05); const sh = smooth(1.0, 1.6, t); pw.armL.rotation.set(-2.2 * sh - 0.2, 0, -0.5 * sh); pw.armR.rotation.set(-2.2 * sh - 0.2, 0, 0.5 * sh);
      setFace(pw, { brows: 'up', eyes: 1.3 + 0.3 * sh, mouth: sh > 0.5 ? 'open' : 'smile', open: 1.3, look: [0, -0.3] }); pw.headPivot.rotation.set(0.15, 0, 0); life(pw, t, 0.6); pw.group.visible = !van;
      if (!van) { pr.group.updateMatrixWorld(true); pr.armR.userData.end.getWorldPosition(tv); ringBox.position.copy(tv).add(v.set(0, 0.05, 0)); } else { const u = clamp((t - TV) / 0.45); ringBox.position.y = lerp(ringBox.position.y, 0.035, u * u); }
      ringBox.visible = Y < 2.2; }
    // passers-by
    PEDS.forEach((p, i) => { const x = p.x0 + p.dir * p.v * t; const G = p.p.group; G.position.set(x, 0, p.z); G.rotation.set(0, p.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0); const ph = t * 6 + i;
      p.p.legL.rotation.set(Math.sin(ph) * 0.55, 0, 0); p.p.legR.rotation.set(-Math.sin(ph) * 0.55, 0, 0); p.p.armL.rotation.set(-Math.sin(ph) * 0.45, 0, -0.1); p.p.armR.rotation.set(Math.sin(ph) * 0.45, 0, 0.1); G.position.y = Math.abs(Math.cos(ph)) * 0.05;
      setFace(p.p, { brows: 'neutral', eyes: 1, mouth: 'smile' }); life(p.p, t, 0.5); G.visible = !van; });
    puff.userData.update(t, TV);
    // ---------------- light: dusk dip when the lights go out, then golden; ice age is pale ----------------
    const iceK = smooth(4.2, 4.9, Y); const night = Math.exp(-Math.pow((t - (MT[0] + 0.6)) / 0.9, 2)) * 0.55;
    sun.intensity = 3.0 * (1 - night) * (1 - 0.25 * iceK); hemi.intensity = 0.55 + 0.25 * iceK;
    sky.material.uniforms.zen.value.copy(zen0).lerp(zenI, iceK).multiplyScalar(1 - night * 0.7); sky.material.uniforms.hor.value.copy(hor0).lerp(horI, iceK).multiplyScalar(1 - night * 0.5);
    A.fog.color.copy(fogC).lerp(new THREE.Color(0xdde8f4), iceK).multiplyScalar(1 - night * 0.5); A.fog.density = lerp(0.0045, 0.006, iceK);
    out.exposure = 0.95 - night * 0.15;
    // ---------------- camera ----------------
    let scene = A, camera = cam;
    if (t < CUT) {
      const u = smooth(7.2, 21.5, t); const ui = smooth(22.4, CUT, t) * 0;
      const pos0 = [0.3, 1.62, 3.0], look0 = [0.25, 1.0, -0.8], pos1 = [0.35, 3.1, 6.8], look1 = [-0.6, 6.4, -16];
      const pos = pos0.map((p, i) => lerp(p, pos1[i], u)), look = look0.map((p, i) => lerp(p, look1[i], u)); pos[1] += lift; look[1] += lift * 0.8;
      const sway = 0.04 * Math.sin(t * 0.5); cam.position.set(pos[0] + sway, pos[1], pos[2]); cam.lookAt(...look); cam.fov = lerp(50, 60, u); cam.near = 0.05; cam.updateProjectionMatrix();
      out.dof = u < 0.3 ? 0.12 : 0; out.focusY = 0.6; out.focusH = 0.3; out.focus = mit;
    } else {
      scene = B2; camera = camB; out.bloom = 0.5; out.bloomThreshold = 0.75; out.exposure = 1.0; out.vignette = 0.45; out.env = 0.3; out.dof = 0; out.space = true;
      const mu = smooth(MT[7] - 1.0, MT[7] + 0.4, t), dry = smooth(MT[8] - 1.0, MT[8] + 0.4, t), hot = smooth(MT[9] + 0.6, MT[10] - 0.2, t);
      drawEarth(mu, dry, hot); earthM.emissiveIntensity = 0.0 + 0.9 * hot;
      atm.material.uniforms.k.value = 1.6 * (1 - dry * 0.7); atm.material.uniforms.c.value.setRGB(lerp(0.35, 1.0, hot), lerp(0.65, 0.45, hot), lerp(1.0, 0.2, hot));
      earth.rotation.y = -1.26 + 0.05 * (t - CUT);
      // the Sun: normal -> swells red -> reaches Earth (3,000 away) at 7.6 billion years, still growing after
      const lg = Math.log10(Math.max(yrs, 1)); const g1 = smooth(Math.log10(3.0e9), Math.log10(5.0e9), lg), g2 = smooth(Math.log10(5.0e9), Math.log10(7.59e9), lg);
      const rS = 130 * Math.pow(10, 1.12 * g1) + (2905 - 130 * Math.pow(10, 1.12)) * g2 + 26 * Math.max(0, t - MT[10]);   // limb touches Earth at MT[10], half of Earth inside by the end
      sunS.scale.setScalar(rS); const red = smooth(0, 1, g1 * 0.6 + g2 * 0.6); sunM.color.set(0xfff2c0).lerp(new THREE.Color(0xff5a2a), red); sunGlow.scale.setScalar(rS * 2.25 + 200); sunGlow.material.opacity = 0.5 * (1 - 0.6 * g2); sunS.rotation.set(Math.PI / 2, 0, t * 0.07 + 0.22 * Math.max(0, t - MT[9]) + 0.35 * Math.pow(Math.max(0, t - MT[10] + 1.2), 1.5)); embers.userData.update(MT[10] - 0.6 + ((t - (MT[10] - 0.6)) % 1.6 + 1.6) % 1.6, MT[10] - 0.6); embers.visible = t > MT[10] - 0.6; earthM.emissiveIntensity *= 0.85 + 0.15 * Math.sin(t * 9); sunGlow.material.color.set(0xffd080).lerp(new THREE.Color(0xff4020), red); sunL.color.copy(sunM.color); sunL.intensity = 3.2 + 1.5 * red;
      // camera: Earth first, then pulling back the whole time so the swelling Sun comes in from the top (never still)
      const c1 = smooth(CUT, MT[8] + 0.5, t), c2 = smooth(MT[8], MT[9] + 0.2, t); const D = lerp(lerp(430, 620, c1), 1500, c2) + 30 * Math.max(0, t - MT[9]);
      const zk = smooth(MT[10] - 1.2, SEND + 0.3, t); camB.position.set(0, -lerp(0, 100, c2), D); camB.lookAt(0, lerp(lerp(0, 450, c2) + 8 * Math.max(0, t - MT[9]), 120, zk), 0); camB.fov = lerp(lerp(50, 56, c2), 22, zk); camB.near = 2; camB.updateProjectionMatrix();
      out.earthTop = [0, 120, 0]; out.sunEdge = SUNP.clone().add(new THREE.Vector3(0.45, -0.75, 0.5).normalize().multiplyScalar(rS)).toArray(); out.focus = earth; out.rS = rS;
    }
    out.scene = scene; out.camera = camera;
    out.flash = 0.35 * pulse(t, CUT, 0.35) + 0.25 * pulse(t, TV, 0.25); out.shake = 0.2 * pulse(t, MT[4], 0.5) + 0.25 * pulse(t, MT[10] - 0.3, 0.8);
    // ---------------- Mittens cam (space part) ----------------
    { const show = smooth(CUT - 0.1, CUT + 0.3, t); const mood = t >= PUNCH ? 'unimpressed' : (out.mi >= 0 ? MOODS[out.mi] : 'annoyed');
      setCatFace(mc, mood, 0.3); catLife(mc, t, 1); MCC.headPivot.rotation.y = 0.2 + 0.2 * Math.sin(t * 0.8); pigeonHead(mcPg, t, true);
      const hot = t > CUT ? smooth(MT[9] - 1, MT[10], t) : 0; mcBg.set(0x0a1438).lerp(new THREE.Color(0xff6a2a), hot); mcRock.material.emissiveIntensity = 0.6 * hot; mcD.color.set(0xfff0d8).lerp(new THREE.Color(0xff8a50), hot);
      shades.visible = t > MT[9] + 0.3; const tapK = Math.max(0, Math.sin(t * 9)) * (Math.sin(t * 0.9) > 0.2 ? 1 : 0); MCC.legs[3].rotation.x = -0.9 * tapK; MCC.legs[3].position.y = 0.07 + 0.12 * tapK;
      out.inset = { scene: MCam, camera: mcCam, x: 0.79, y: lerp(lerp(0.78, 0.66, smooth(MT[8], MT[9], t)), 0.42, smooth(MT[10] - 1.2, MT[10] + 0.3, t)), r: 0.16, show, ring: '#ffd23f' }; }
    return out;
  }

  // ---------------- on-screen text: caption at the top, timeline gauge on the left, milestone label next to the thing ----------------
  const CAP = [[1.55, 3.85, 'Eight billion people. Gone in one second.'], [3.9, 6.85, "But the chess game isn't over. It's the Pigeon's move."], [6.9, 9.2, 'You were the referee. You vanished mid-game.'],
    [9.25, 12.3, 'Now nobody fixes anything. No power. No pumps.'], [12.35, 14.45, 'Two days. The subway is full of water.'], [14.5, 17.35, 'Forty years. Trees everywhere, like near Chernobyl.'], [17.4, 19.55, 'Roofs cave in. Rain does the rest.'],
    [19.6, 21.95, 'A thousand years. Only stone is left.'], [22, 23.35, 'Then the ice comes back.'], [23.4, 24.95, 'The continents crash into one.'], [25, 27.5, 'The Sun gets hotter. The oceans boil away.'], [27.55, 29.75, 'Then the Sun swells up. Red and huge.'], [PUNCH, ASK - 0.1, "Well. It's still the Pigeon's move."]];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function topText(ctx, W, t, a, b, txt, size = 54, y = 250) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.15, (b - t) / 0.15));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 700 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.86).forEach((l, i) => { ctx.strokeText(l, W / 2, y + i * size * 1.25); ctx.fillText(l, W / 2, y + i * size * 1.25); }); ctx.restore(); }
  function proj(pos, camO) { tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  function mileLabel(ctx, pos, title, sub, camO, a = 1, xy = null) { if (a <= 0) return; let p = xy; if (!p) { if (!pos || !camO) return; p = proj(pos, camO); if (!p) return; } let [x, y] = p; x = clamp(x, 300, 1040); y = clamp(y, 700, 1560);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 40px ${FONT}`; const w = Math.max(ctx.measureText(title).width, sub ? (ctx.font = `700 26px ${FONT}`, ctx.measureText(sub).width) : 0) + 36; ctx.font = `900 40px ${FONT}`; const h = sub ? 96 : 66;
    const lx = clamp(x - w / 2, 230, 1060 - w), ly = y - h - 26; ctx.fillStyle = 'rgba(10,12,16,0.8)'; ctx.beginPath(); ctx.roundRect(lx, ly, w, h, 16); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(clamp(x, lx + 20, lx + w - 20), ly + h); ctx.lineTo(x, y - 4); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(title, lx + 18, ly + 34); if (sub) { ctx.font = `700 26px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(sub, lx + 18, ly + 74); } ctx.restore(); }
  // counter text: number + unit
  function fmt(y) { if (y <= 0) return ['0', 'SECONDS']; const s = y * 365.25 * 86400; if (s < 60) return [Math.max(1, Math.floor(s)) + '', Math.floor(s) === 1 ? 'SECOND' : 'SECONDS']; if (s < 3600) return [Math.floor(s / 60) + '', Math.floor(s / 60) === 1 ? 'MINUTE' : 'MINUTES']; if (s < 86400) return [Math.floor(s / 3600) + '', Math.floor(s / 3600) === 1 ? 'HOUR' : 'HOURS'];
    if (y < 1) { const d = Math.floor(s / 86400); return [d + '', d === 1 ? 'DAY' : 'DAYS']; } if (y < 1e6) { const n = Math.floor(y); return [n.toLocaleString('en-US'), n === 1 ? 'YEAR' : 'YEARS']; } if (y < 1e9) return [Math.floor(y / 1e6).toLocaleString('en-US'), 'MILLION YEARS']; return [(Math.floor(y / 1e7) / 100).toFixed(2), 'BILLION YEARS']; }
  const G0 = Math.log10(SEC), G1 = Math.log10(1e10);
  function gauge(ctx, t, yrs, mi) { const x = 44, y0 = 330, y1 = 1500, w = 22; const f = yrs > 0 ? clamp((Math.log10(yrs) - G0) / (G1 - G0)) : 0; const yF = lerp(y1, y0, f);
    ctx.save(); ctx.fillStyle = 'rgba(10,12,16,0.55)'; ctx.beginPath(); ctx.roundRect(x - 6, y0 - 6, w + 12, y1 - y0 + 12, 16); ctx.fill();
    const gr = ctx.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, '#7dd3ff'); gr.addColorStop(0.55, '#7dff9a'); gr.addColorStop(0.8, '#ffd23f'); gr.addColorStop(1, '#ff6a2a'); ctx.fillStyle = gr; if (y1 - yF > 1) { ctx.beginPath(); ctx.roundRect(x, yF, w, y1 - yF, 10); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; MIL.forEach(([yy]) => { const py = lerp(y1, y0, (Math.log10(yy) - G0) / (G1 - G0)); ctx.beginPath(); ctx.moveTo(x + w + 4, py); ctx.lineTo(x + w + 18, py); ctx.stroke(); });
    ctx.restore();
    const [num, unit] = fmt(yrs); const bump = mi >= 0 ? pulse(t, MT[mi], 0.4) : 0;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.font = `800 30px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#ffd23f'; ctx.strokeText('TIME WITHOUT HUMANS', 92, 392); ctx.fillText('TIME WITHOUT HUMANS', 92, 392);
    ctx.save(); ctx.translate(92, 478); ctx.scale(1 + bump * 0.12, 1 + bump * 0.12); ctx.font = `900 88px ${FONT}`; ctx.lineWidth = 10; ctx.strokeText(num, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(num, 0, 0); ctx.restore();
    ctx.font = `900 44px ${FONT}`; ctx.lineWidth = 8; ctx.strokeText(unit, 94, 530); ctx.fillStyle = '#fff'; ctx.fillText(unit, 94, 530);
    let txt = '', colr = '#bfe3ff'; const justPassed = mi >= 0 && t < MT[mi] + 0.7; if (justPassed) { txt = 'PASSED: ' + MIL[mi][2]; colr = '#7dff9a'; } else if (mi + 1 < MIL.length) txt = 'NEXT: ' + MIL[mi + 1][1] + ' = ' + MIL[mi + 1][2];
    if (t < TV) txt = ''; if (txt) { ctx.font = `800 30px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(txt, 94, 580); ctx.fillStyle = colr; ctx.fillText(txt, 94, 580); }
    ctx.restore(); }
  // where each milestone label points (scene A world positions)
  const backH = (x) => HOUSES.filter(h => Math.abs(h.g.position.z + 26) < 0.1).sort((a, b) => Math.abs(a.g.position.x - x) - Math.abs(b.g.position.x - x))[0];
  const hL = backH(3.5), hR = backH(-2.5); const midTree = TR.filter(([x, z]) => z < -7 && z > -15 && Math.abs(x) < 4)[0] || TR[0];
  const LABPOS = [() => [hL.g.position.x, 8.1, -21.5], () => [2.8, 0.2, -8.5], () => [-1.4, 0.2, -3.5], () => [midTree[0], 6.5 * midTree[2], midTree[1]], () => [hR.g.position.x, hR.H * hR.walls.scale.y + 1, -21.5],
    () => [-3.2, 14 * tower.scale.y + 2, -19], (st) => [0.8, (st.iceH || 3) + 0.1, -5]];
  function hud(ctx, tt, st) { const W = 1080, Hh = 1920; const t = st.t;
    const title = (tt0) => drawTitleTimed(ctx, W, Hh, [{ text: 'WHAT IF ALL HUMANS VANISHED', size: 72 }, { text: 'AND TIME SPED UP?', size: 84, accent: true }], tt0, '#ffd23f', { start: 0, wps: 1000, outAt: 2.3, y: 0.115 });
    if (st.teaser) { title(tt + 0.01); drawTeaser(ctx, W, Hh, 'rewind', st.tk); return; }
    title(tt);
    if (t >= TV - 0.2) gauge(ctx, t, st.yrs ?? 0, st.mi ?? -1);
    for (const [a, b, txt] of CAP) topText(ctx, W, t, a, b, txt);
    // name tags (intro only)
    if (t < TV - 0.1 && st.camera) { mit.updateMatrixWorld(true); MC.headPivot.getWorldPosition(tv); const pm = proj([tv.x, tv.y + 0.25, tv.z], st.camera); if (pm) drawTag(ctx, pm[0], pm[1] - 30, 'MITTENS', t - 0.3, { dur: TV - 0.5 });
      pigeon.updateMatrixWorld(true); pigeon.userData.head.getWorldPosition(tv); const pp = proj([tv.x, tv.y + 0.2, tv.z], st.camera); if (pp) drawTag(ctx, pp[0] + 40, pp[1] - 90, 'THE PIGEON', t - 0.5, { dur: TV - 0.7, bg: '#c9d6df' });
      P.headPivot.getWorldPosition(tv); const py = proj([tv.x, tv.y + 0.42, tv.z], st.camera); if (py) drawTag(ctx, py[0], py[1] - 30, 'YOU (REFEREE)', t - 0.7, { dur: TV - 0.8, bg: '#7dd3ff' }); }
    // milestone labels next to the thing
    for (let i = 0; i < 7; i++) if (t < CUT && t > MT[i] - 0.3 && t < MT[i] + 1.5) mileLabel(ctx, LABPOS[i](st), MIL[i][1] + ' = ' + MIL[i][2], SUBS[i], st.camera, smooth(MT[i] - 0.3, MT[i], t) * (1 - smooth(MT[i] + 1.2, MT[i] + 1.5, t)));
    if (t >= CUT) { for (let i = 7; i < 11; i++) { const end = i === 10 ? 1e9 : MT[i] + 1.6; if (t > MT[i] - 0.3 && t < end) { const pos = i === 9 ? st.sunEdge : [0, 0, 0]; const p = i === 9 ? null : proj(i === 10 ? [0, 0, 0] : [0, 100, 0], st.camera); mileLabel(ctx, pos, MIL[i][1] + ' = ' + MIL[i][2], i === 10 ? '(not to scale)' : '', st.camera, smooth(MT[i] - 0.3, MT[i], t) * (i === 10 ? 1 : 1 - smooth(end - 0.3, end, t)), p ? [p[0], p[1] - (i === 10 ? 60 : 20)] : null); } } }
    if (t >= ASK - 0.05) { topText(ctx, W, t, ASK - 0.05, 1e9, 'Which building in your city would last the longest?', 50); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
