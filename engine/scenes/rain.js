import { clamp, lerp, smooth, easeOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, softTex, setFace, life, drawTitleTimed, drawTag, drawBubble, RoundedBoxGeometry, stars, carGeos, drawTeaser } from './lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 22 episode: "What if it rained 10 cm an hour and never stopped?"  (Nov 20 STANDARD)
// HUMAN PART (~8 s): a bus stop on a cobbled European street in a golden-hour cloudburst. You turned down THE SALESMAN's umbrella
//   ("NO THANKS, IT'LL STOP!"). THE UNBOTHERED PERSON keeps reading his newspaper on the bench. Mittens (he) hates the water.
//   Water rises: 15 cm kerb, 30 cm cars float, you and Mittens jump into the Salesman's yellow boat (BOATS EUR500), 2.5 m bus stop under,
//   13 m rooftops. The Salesman floats past: UMBRELLAS EUR900. You buy it.
// BIG PART: clean shots of the yellow boat on open water; each landmark's top sinks right next to it at the right scale:
//   93 m Statue of Liberty, 330 m Eiffel Tower, 828 m Burj Khalifa, 2.7 km all Earth's water (clouds), 8,849 m Everest;
//   then space: 100 km the bottom turns to ice, 408 km higher than the ISS, 3,475 km deeper than the Moon is wide,
//   5,527 km the rain outweighs Earth. The water ball never stops growing (Mittens cam with you under the umbrella).
// All times below are VIDEO time (tt). The first 1.2 s are the FREEZE teaser (the last frame, so the video loops).
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const TEASER = 1.2, TOT = 35.1, CUT = 20.4;
const MIL = [[0.15, '15 CM', 'OVER THE KERB'], [0.3, '30 CM', 'CARS FLOAT'], [2.5, '2.5 M', 'BUS STOP UNDER'], [13, '13 M', 'ROOFTOPS GONE'], [93, '93 M', 'STATUE OF LIBERTY'],
  [330, '330 M', 'EIFFEL TOWER'], [828, '828 M', 'BURJ KHALIFA'], [2718, '2.7 KM', "ALL EARTH'S WATER"], [8849, '8,849 M', 'EVEREST'],
  [1e5, '100 KM', 'BOTTOM TURNS TO ICE'], [4.08e5, '408 KM', 'HIGHER THAN THE ISS'], [3.4748e6, '3,475 KM', 'DEEPER THAN THE MOON IS WIDE'], [5.527e6, '5,527 KM', 'RAIN OUTWEIGHS EARTH']];
const MT = [4.4, 6.1, 7.9, 9.9, 11.9, 13.6, 15.4, 16.9, 18.6, 22.0, 24.0, 26.0, 27.9];
const SUBS = ['', 'a foot of water floats a car', '', '', 'ground to torch', '', 'tallest building', 'Earth runs out here', 'no land left', 'crushed into ice', '', '', 'not to scale'];
const D_END = 7.6e6;
const T0 = TEASER + 0.02;
// water depth in metres (log-interpolated between milestones; never stops)
function depthAt(tt) {
  if (tt < T0) return 0; const ts = [T0, ...MT, TOT + 0.05], ds = [Math.log10(0.003), ...MIL.map(m => Math.log10(m[0])), Math.log10(D_END)];
  for (let i = 0; i < ts.length - 1; i++) if (tt < ts[i + 1]) { let u = (tt - ts[i]) / (ts[i + 1] - ts[i]); if (i > 0 && i < ts.length - 2) u = lerp(u, smooth(0, 1, u), 0.55); return Math.pow(10, lerp(ds[i], ds[i + 1], u)); }
  return D_END; }
export { TOT, MT, CUT, depthAt };

export async function create({ THREE, W, H }) {
  const R = rng(2211);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler(), tv = new THREE.Vector3();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, s = null) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s ? sc.set(...s) : sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function signTex(lines, bg, fg, w = 512, h = 160) { return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => { let fs = h * (lines.length > 1 ? 0.36 : 0.56); g.font = `900 ${fs}px ${FONT}`; const mw = g.measureText(t).width; if (mw > w * 0.86) { fs *= w * 0.86 / mw; g.font = `900 ${fs}px ${FONT}`; } g.fillText(t, w / 2, h * (lines.length > 1 ? 0.3 + i * 0.42 : 0.54)); }); }); }
  const signMat = (lines, bg, fg, w, h) => new THREE.MeshStandardMaterial({ map: signTex(lines, bg, fg, w, h), roughness: 0.6 });

  // =====================================================================================================
  // SCENE A (metres). The water surface is always y = 0; the drowned world sits in `world`, moved down by the depth.
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
  const fogC = new THREE.Color(0xd9b48e); A.fog = new THREE.FogExp2(fogC.getHex(), 0.006);
  const hemi = new THREE.HemisphereLight(0xc4d4f0, 0x6a7a80, 0.7); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc27a, 3.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  const SUND = new THREE.Vector3(0.62, 0.36, 0.7).normalize();
  const sky = makeSkyDome(THREE, 0x4a5f86, 0xffc48a, [SUND.x, SUND.y, SUND.z]); sky.scale.setScalar(5000); A.add(sky);
  const world = new THREE.Group(); A.add(world);
  // street: asphalt road (z 0..8), kerb 15 cm, sidewalk (z -5..0), cobbles
  const cobTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8a7c6c'; g.fillRect(0, 0, w, h); const r = rng(3); for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { const c = 140 + r() * 50; g.fillStyle = `rgb(${c},${c * 0.9},${c * 0.8})`; g.beginPath(); g.roundRect(x + 1, y + 1, 14, 14, 5); g.fill(); } });
  cobTex.wrapS = cobTex.wrapT = THREE.RepeatWrapping; cobTex.repeat.set(30, 4);
  { const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), M(0x4a4c52, 0.9)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 25); road.receiveShadow = true; road.name = 'road'; world.add(road);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(400, 0.15, 5), new THREE.MeshStandardMaterial({ map: cobTex, roughness: 0.9 })); walk.position.set(0, 0.075, -2.5); walk.receiveShadow = true; walk.name = 'sidewalk'; world.add(walk);
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(400, 0.16, 0.22), M(0xb8b2a6, 0.8)); kerb.position.set(0, 0.08, 0.02); world.add(kerb);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(400, 80), M(0x6a6258, 1)); back.rotation.x = -Math.PI / 2; back.position.set(0, 0.01, -45); world.add(back);
    const dashes = Builder(); for (let x = -60; x < 60; x += 4) dashes.add(BX(2, 0.01, 0.15), new THREE.MeshBasicMaterial({ color: 0xe8e0c0 }), x, 0.005, 4.2); dashes.build(world); }
  // town houses along the back of the sidewalk (3 floors + pitched roof; ridge ~12.8 m)
  const wallPal = [0xf1d9a8, 0xe9a08a, 0xa9c8e0, 0xf6efe2, 0x9cc9b0, 0xe8c36b, 0xd0714f, 0xc9b6df, 0xf2b8b0];
  const shops = [['BÄCKEREI', '#ffd23f', '#5a2a10'], ['CAFÉ SOLEIL', '#1f3d5a', '#ffe9a8'], ['BLUMEN', '#e63946', '#ffffff'], ['BUCHLADEN', '#6b3e1e', '#ffffff'], ['EIS', '#ff7fb4', '#ffffff'], ['APOTHEKE', '#1f8a4c', '#ffffff']];
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a4c, roughness: 0.15, metalness: 0.5 }), litM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.3, emissive: 0xffb860, emissiveIntensity: 1.1 });
  const trimM = M(0xf6efe2, 0.7), ironM = M(0x2a2e33, 0.5, 0.4);
  let si = 0;
  function townHouse(x, z, w, dpt, floors, k) {
    const g = new THREE.Group(); const B = Builder(); const FH = 3.0, Hh = 3.6 + (floors - 1) * FH;
    const wall = new THREE.MeshStandardMaterial({ color: wallPal[(k * 5 + 2) % wallPal.length], roughness: 0.85 }); B.add(BX(w, Hh, dpt), wall, 0, Hh / 2, -dpt / 2);
    B.add(BX(w + 0.3, 0.3, dpt + 0.3), trimM, 0, Hh, -dpt / 2); B.add(BX(w + 0.1, 0.15, 0.3), trimM, 0, 3.6, 0);
    const shM = M([0x2f7d6a, 0x9a3b2f, 0x1d3f6e, 0x3a6ea5, 0x7a5a2e][k % 5], 0.6); const nW = Math.max(2, Math.round(w / 2.6)), sp = w / nW;
    for (let f = 1; f < floors; f++) { const y = 3.6 + (f - 1) * FH + 1.5; for (let i = 0; i < nW; i++) { const wx = -w / 2 + sp * (i + 0.5); const lit = R() < 0.45;
        B.add(BX(1.0, 1.6, 0.06), trimM, wx, y, 0.03); B.add(BX(0.8, 1.4, 0.05), lit ? litM : glassM, wx, y, 0.07);
        B.add(RB(0.38, 1.5, 0.06, 0.02), shM, wx - 0.62, y, 0.06); B.add(RB(0.38, 1.5, 0.06, 0.02), shM, wx + 0.62, y, 0.06);
        if (f === 1 && (i + k) % 2 === 0) { B.add(BX(1.4, 0.1, 0.6), M(0xd8cfc0, 0.8), wx, y - 0.85, 0.3); B.add(BX(1.4, 0.5, 0.04), ironM, wx, y - 0.55, 0.58); } } }
    B.add(BX(w * 0.8, 2.4, 0.05), litM, 0, 1.4, 0.03); B.add(BX(w * 0.84, 0.15, 1.2), M([0xe63946, 0x2a6a5a, 0xffd23f, 0x3a7bd5][k % 4], 0.7), 0, 2.95, 0.6, -0.25, 0, 0);
    const rh = 3.0, half = dpt / 2 + 0.4, sl = Math.hypot(half, rh), ang = Math.atan2(rh, half);
    for (const s2 of [-1, 1]) B.add(BX(w + 0.5, 0.25, sl), M([0xb0553a, 0x6a4a3a, 0x8a3a2a][k % 3], 0.8), 0, Hh + 0.15 + rh / 2, -dpt / 2 + s2 * half / 2, s2 * ang, 0, 0);
    B.add(BX(0.7, 1.8, 0.7), M(0x9a8a80, 0.9), w * 0.3, Hh + 2.2, -dpt / 2 - 1); B.build(g);
    const s = shops[(si++) % shops.length]; const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.62, 0.62), signMat([s[0]], s[1], s[2], 512, 112)); sg.position.set(0, 3.25, 0.09); g.add(sg);
    g.position.set(x, 0, z); world.add(g); return g; }
  { let x = -46, k = 0; while (x < 46) { const w = 6 + R() * 3; townHouse(x + w / 2, -5, w, 9, 3 + (k % 4 === 2 ? 1 : 0), k); x += w + 0.1; k++; } }
  // distant towers that sink later (20-80 m)
  for (let i = 0; i < 12; i++) { const h = 22 + R() * 60, w = 12 + R() * 10; const b = new THREE.Mesh(BX(w, h, w), new THREE.MeshStandardMaterial({ color: [0xb8c4d0, 0xd8c8b0, 0x9ab0c4][i % 3], roughness: 0.4, metalness: 0.2 })); b.position.set(-260 + i * 46 + R() * 10, h / 2, -120 - R() * 100); world.add(b); }
  // bus stop: posts, glass back, roof (top at 2.5 m), bench, sign
  const shelter = new THREE.Group(); { const B = Builder(); const metal = M(0x3a5a7a, 0.4, 0.5);
    for (const [x, z] of [[-1.9, -3.5], [1.9, -3.5], [-1.9, -1.5], [1.9, -1.5]]) B.add(new THREE.CylinderGeometry(0.05, 0.05, 2.35, 10), metal, x, 1.325, z);
    B.add(RB(4.2, 0.12, 2.5, 0.04), metal, 0, 2.44, -2.5); B.add(RB(3.8, 1.2, 0.45, 0.05), M(0xffffff, 0.4), 0, 0.85, -3.25);
    B.add(RB(2.6, 0.08, 0.5, 0.03), M(0x8a5a34, 0.6), 0, 0.6, -3.1); for (const x of [-1.1, 1.1]) B.add(BX(0.06, 0.45, 0.4), metal, x, 0.375, -3.1);
    B.add(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 10), metal, 2.5, 1.55, -0.6); B.build(shelter);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1.4), new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25 })); gl.position.set(0, 1.85, -3.5); shelter.add(gl);
    const bs = new THREE.Mesh(new THREE.CircleGeometry(0.33, 32), signMat(['BUS', '42'], '#1f8a4c', '#ffffff', 256, 256)); bs.position.set(2.5, 2.75, -0.55); shelter.add(bs);
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), signMat(['SUNNY', 'ALL WEEK!'], '#ffd23f', '#1a1a1a', 256, 240)); ad.position.set(-1.25, 0.95, -3.0); shelter.add(ad);
    shelter.position.y = 0.15; world.add(shelter); }
  // street lamps
  for (const x of [-9, 9, 26, -26]) { const l = new THREE.Group(); const L = Builder(); L.add(new THREE.CylinderGeometry(0.07, 0.11, 4.2, 12), ironM, 0, 2.1, 0); L.add(RB(0.36, 0.5, 0.36, 0.06), ironM, 0, 4.35, 0); L.build(l); const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a0, toneMapped: false })); b.position.y = 4.3; l.add(b); l.position.set(x, 0.15, -0.6); world.add(l); }
  // parked cars (they float at 30 cm)
  const CG = carGeos(THREE); const CARS = [];
  for (const [x, c] of [[-10, 0xd8342c], [-3.6, 0x2d6fd6], [-17, 0xf2f2f2], [9, 0xe0b84a]]) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.25 }); const b = new THREE.Mesh(CG.body, m), tp = new THREE.Mesh(CG.top, M(0x1d2228, 0.3)); g.add(b, tp); g.rotation.y = Math.PI / 2; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.position.set(x, 0, x === -3.6 ? 0.25 : 1.3); g.scale.setScalar(0.85); world.add(g); CARS.push({ g, x, ph: R() * 6 }); }
  // the Salesman's stall: cart + umbrellas + sign (UMBRELLAS €10 -> €50 -> BOATS €500); a yellow boat leans on it
  const stall = new THREE.Group(); const signMs = { a: signMat(['UMBRELLAS', '€10'], '#ffffff', '#e63946'), b: signMat(['UMBRELLAS', '€50'], '#ffffff', '#e63946'), c: signMat(['BOATS', '€500'], '#ffd23f', '#1a1a1a'), d: signMat(['UMBRELLAS', '€900'], '#ffffff', '#e63946') };
  const stallSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.48), signMs.a);
  { const B = Builder(); B.add(RB(1.6, 0.8, 0.8, 0.06), M(0x8a5a34, 0.7), 0, 0.75, 0); for (const x of [-0.7, 0.7]) B.add(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), ironM, x, 1.75, 0.3); B.add(BX(1.6, 0.05, 0.05), ironM, 0, 2.35, 0.3);
    for (let i = 0; i < 6; i++) { const cc = [0xe63946, 0x3a7bd5, 0xffd23f, 0x2a6a5a, 0xff7fb4, 0x1a1a1a][i]; B.add(new THREE.ConeGeometry(0.12, 0.9, 8), M(cc, 0.6), -0.55 + i * 0.22, 1.55, -0.1, 0.12, 0, (i - 2.5) * 0.06); B.add(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6), ironM, -0.55 + i * 0.22, 2.1, -0.1); }
    for (const x of [-0.6, 0.6]) B.add(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16).rotateZ(Math.PI / 2), M(0x222222, 0.6), x, 0.25, 0.42); B.build(stall);
    stallSign.position.set(0, 2.62, 0.32); stall.add(stallSign); stall.position.set(2.7, 0.15, -1.3); stall.rotation.y = -0.4; world.add(stall); }

  // ---------------- the yellow inflatable boat (focus object of the big part) ----------------
  function makeBoat(color = 0xffc21a) { const g = new THREE.Group(); const tube = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 18, 40), new THREE.MeshStandardMaterial({ color, roughness: 0.35 })); tube.rotation.x = Math.PI / 2; tube.scale.set(1, 1.45, 1); tube.position.y = 0.16; g.add(tube);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 32), M(0x3a7bd5, 0.5)); floor.scale.set(1, 1, 1.45); floor.position.y = 0.0; g.add(floor);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.625, 0.205, 6, 40, Math.PI * 2), new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.4 })); stripe.rotation.x = Math.PI / 2; stripe.scale.set(1, 1.45, 0.18); stripe.position.y = 0.16; g.add(stripe);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }
  function makeUmbrella(c = 0xe63946) { const g = new THREE.Group(); const can = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, side: THREE.DoubleSide })); can.position.y = 0.4; can.scale.y = 0.75; g.add(can);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6), ironM); sh.position.y = 0.0; g.add(sh); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12, Math.PI), ironM); hd.position.y = -0.5; hd.rotation.z = Math.PI; g.add(hd); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
  const boat = makeBoat(); A.add(boat); const umb = makeUmbrella(); A.add(umb);
  const sBoat = makeBoat(0xe63946); A.add(sBoat);   // the Salesman's own boat
  const sSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), signMs.d); A.add(sSign); const sUmb = makeUmbrella(0x3a7bd5); A.add(sUmb);

  // ---------------- characters ----------------
  const P = makePerson(THREE, { shirt: 0xf2994a, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0x3a2a1e, seed: 5, hairStyle: 'short' }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const mit = makeCat(THREE, 0xf0a040); mit.rotation.order = 'YXZ'; A.add(mit); const MC = mit.userData.cat;
  const sal = makePerson(THREE, { shirt: 0x2a6a5a, pants: 0x3b3b46, hair: 0x1a1210, skin: 0xd8a47e, shoe: 0x111111, seed: 23, hairStyle: 'short' }); sal.group.rotation.order = 'YXZ'; A.add(sal.group);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xe63946, 0.6)); cap.position.set(0, 0.2, 0); sal.headPivot.add(cap);
  // THE UNBOTHERED PERSON: bald man on the bus-stop bench, keeps reading his newspaper
  const unb = makePerson(THREE, { shirt: 0x8e5bb5, pants: 0x2b2f3a, hair: 0x888888, skin: 0xb5835a, shoe: 0x222222, seed: 41, hairStyle: 'bald' }); unb.group.rotation.order = 'YXZ'; A.add(unb.group);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), new THREE.MeshStandardMaterial({ map: canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = `900 30px ${FS}`; g.fillText('DAILY NEWS', 20, 36); g.font = `700 18px ${FONT}`; g.fillText('SUNNY ALL WEEK', 20, 66); for (let y = 84; y < h - 10; y += 12) g.fillRect(20, y, w - 40, 4); }), roughness: 0.8, side: THREE.DoubleSide })); A.add(paper);

  // ---------------- water ----------------
  const waveTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#3f7f9a'; g.fillRect(0, 0, w, h); const r = rng(5); for (let k = 0; k < 900; k++) { const x = r() * w, y = r() * h, l = 10 + r() * 40; g.strokeStyle = r() < 0.5 ? 'rgba(200,235,255,0.35)' : 'rgba(20,60,80,0.35)'; g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); } });
  waveTex.wrapS = waveTex.wrapT = THREE.RepeatWrapping; waveTex.repeat.set(160, 160);
  const waterM = new THREE.MeshStandardMaterial({ map: waveTex, color: 0xffffff, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.6, depthWrite: true });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), waterM); water.rotation.x = -Math.PI / 2; water.receiveShadow = true; water.name = 'water'; A.add(water);
  // rain ripples on the water near the camera
  const NR = 140; const rip = new THREE.InstancedMesh(new THREE.RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.45, depthWrite: false }), NR); rip.frustumCulled = false; A.add(rip); const RIP = []; for (let i = 0; i < NR; i++) RIP.push([R() * 2 - 1, R() * 2 - 1, R()]);
  // clouds (passed at ~2.7 km)
  const cloudM = new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xfff1e0, transparent: true, opacity: 0.8, depthWrite: false, fog: false }); const CLOUDS = [];
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(cloudM.clone()); A.add(s); CLOUDS.push({ s, x: (R() - 0.5) * 90, z: -10 - R() * 70, y: R() * 18 - 4, k: 14 + R() * 22 }); }
  // landmarks (true size, base at y = -depth inside their own group)
  const copper = M(0x6fb59a, 0.6, 0.2), stoneP = M(0xc9b48e, 0.9), iron = M(0x6b4a32, 0.6, 0.4), steel = M(0xc8d4e0, 0.25, 0.7), rock = M(0x6f6258, 0.95), snow = M(0xf4f8ff, 0.5);
  const LM = {};
  { const g = new THREE.Group(); const B = Builder(); B.add(BX(20, 27, 20), stoneP, 0, 13.5, 0); B.add(BX(13, 20, 13), stoneP, 0, 37, 0);   // pedestal to 47 m
    B.add(new THREE.CylinderGeometry(3.2, 6.5, 24, 16), copper, 0, 59, 0); B.add(new THREE.CylinderGeometry(2.6, 3.2, 6, 14), copper, 0, 74, 0); B.add(new THREE.SphereGeometry(2.2, 18, 14), copper, 0, 79.5, 0.3);
    for (let k = 0; k < 7; k++) { const a = -1.2 + k * 0.4; B.add(new THREE.ConeGeometry(0.35, 3.2, 6), copper, Math.sin(a) * 2.4, 81.5 + Math.cos(a) * 1.2, 0.8, 0.3, 0, -a); }
    B.add(new THREE.CylinderGeometry(0.9, 1.0, 12, 10), copper, 2.4, 82, 0, 0, 0, -0.08); B.add(new THREE.CylinderGeometry(0.9, 0.6, 1.6, 10), copper, 2.9, 88.6, 0); B.add(RB(3.0, 4, 1.2, 0.3), copper, -2.6, 70, 1.6);
    B.build(g); const fl = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.2, 12), new THREE.MeshBasicMaterial({ color: 0xffc23a, toneMapped: false })); fl.position.set(2.95, 91.3, 0); g.add(fl); A.add(g); LM.lib = g; }
  { const g = new THREE.Group(); const latTex = canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 9; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke(); });
    latTex.wrapS = latTex.wrapT = THREE.RepeatWrapping; latTex.repeat.set(3, 40); const latM = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.6, metalness: 0.4, map: latTex, alphaMap: latTex, alphaTest: 0.4, side: THREE.DoubleSide });
    const B = Builder(); B.add(new THREE.CylinderGeometry(9, 62, 116, 4, 1, true).rotateY(Math.PI / 4), latM, 0, 58, 0); B.add(new THREE.CylinderGeometry(3, 9, 160, 4, 1, true).rotateY(Math.PI / 4), latM, 0, 196, 0); B.add(new THREE.CylinderGeometry(1.2, 3, 32, 4, 1, true).rotateY(Math.PI / 4), latM, 0, 292, 0);
    B.add(BX(46, 3, 46), iron, 0, 57, 0); B.add(BX(22, 3, 22), iron, 0, 116, 0); B.add(BX(9, 4, 9), iron, 0, 276, 0); B.add(BX(5, 5, 5), M(0x8a6040, 0.6, 0.3), 0, 309, 0); B.add(new THREE.CylinderGeometry(0.4, 0.6, 18, 8), M(0xdddddd, 0.4, 0.5), 0, 321, 0); B.build(g);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5040, toneMapped: false })); bl.position.y = 330; g.add(bl); A.add(g); LM.eif = g; }
  { const g = new THREE.Group(); const B = Builder(); let r = 32; for (let k = 0; k < 14; k++) { const h0 = k * 42, hh = 42; for (let j = 0; j < 3; j++) { const a = j * Math.PI * 2 / 3; const rr = r * (j === k % 3 ? 0.8 : 1); B.add(new THREE.CylinderGeometry(rr * 0.5, rr * 0.52, hh, 16), steel, Math.sin(a) * rr * 0.45, h0 + hh / 2, Math.cos(a) * rr * 0.45); } r *= 0.83; }
    B.add(new THREE.CylinderGeometry(1.0, 3.5, 240, 10), steel, 0, 590 + 120, 0); for (let y = 30; y < 600; y += 10) B.add(new THREE.CylinderGeometry(1, 1, 0.6, 6), M(0x9fb4c8, 0.2, 0.6), 0, y, 0, 0, 0, 0, [0.01, 1, 0.01]); B.build(g);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5040, toneMapped: false })); bl.position.y = 829; g.add(bl); A.add(g); LM.burj = g; }
  { const g = new THREE.Group(); const B = Builder(); B.add(new THREE.ConeGeometry(1100, 8849, 6, 1).rotateY(0.4), rock, 0, 8849 / 2, 0); B.add(new THREE.ConeGeometry(150, 470, 5, 1).rotateY(0.4), snow, 0, 8849 - 230, 0); B.add(new THREE.ConeGeometry(40, 125, 5, 1).rotateY(0.4), snow, 3, 8849 - 61, 2);
    for (let k = 0; k < 9; k++) { const a = k * 0.7; B.add(new THREE.DodecahedronGeometry(14 + k * 6, 0), k % 2 ? rock : snow, Math.sin(a) * (40 + k * 22), 8849 - 150 - k * 60, Math.cos(a) * (40 + k * 22)); } B.build(g);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), M(0xffd23f, 0.6)); flag.position.set(0.7, 8849 + 1.6, 0); g.add(flag); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), ironM); pole.position.set(0, 8849 + 1.2, 0); g.add(pole); A.add(g); LM.ev = g; }
  // per landmark: milestone index, height, where it sits next to the boat
  const LMS = [[LM.lib, 4, 93, 4, -22], [LM.eif, 5, 330, 5, -45], [LM.burj, 6, 828, 4.5, -50], [LM.ev, 8, 8849, 120, -600]];

  // =====================================================================================================
  // SCENE B: space. Earth radius 100 (= 6,371 km); the water ball grows around it; ice at the bottom; Moon and ISS for scale.
  // =====================================================================================================
  const B2 = new THREE.Scene(); B2.background = new THREE.Color(0x050a1e); const camB = new THREE.PerspectiveCamera(46, W / H, 1, 1e5);
  B2.add(stars(THREE, 5000, 3e4, 17)); B2.add(new THREE.HemisphereLight(0xbfd4ff, 0x30304a, 0.45)); const sunL = new THREE.DirectionalLight(0xfff0dc, 3.0); sunL.position.set(600, 300, 500); B2.add(sunL);
  const SC = 100 / 6371e3;
  const rockE = new THREE.Mesh(new THREE.SphereGeometry(100, 96, 48), new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#1f4f7f'; g.fillRect(0, 0, w, h); const r = rng(8); for (let k = 0; k < 40; k++) { g.fillStyle = ['#2f6a6a', '#3a6070', '#2a5a62'][k % 3]; g.beginPath(); g.ellipse(r() * w, h * 0.2 + r() * h * 0.6, 20 + r() * 50, 10 + r() * 30, r() * 3, 0, 7); g.fill(); } }), roughness: 0.85 })); B2.add(rockE);
  const iceS = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshStandardMaterial({ color: 0x6aa8dc, roughness: 0.95, emissive: 0x0a2a5a, emissiveIntensity: 0.2 })); B2.add(iceS);
  const ballM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { op: { value: 0.75 }, sunD: { value: new THREE.Vector3(600, 300, 500).normalize() } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float op; uniform vec3 sunD; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(1.0-abs(dot(vN,vV)),2.5); float l = 0.35+0.75*max(dot(vN,sunD),0.); vec3 c = mix(vec3(0.03,0.22,0.62), vec3(0.3,0.65,0.95), f)*l; float s = pow(max(dot(reflect(-sunD,vN),vV),0.),80.); c += vec3(1.)*s*0.0; gl_FragColor = vec4(c, clamp(op*(0.9+0.3*f),0.,1.)); }` });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), ballM); B2.add(ball);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(0.4,0.7,1.0,1.0)*f*1.4; }` })); B2.add(atm);
  const cloudsB = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const r = rng(21); for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`; const x = r() * w, y = h * 0.12 + r() * h * 0.76, a = 10 + r() * 40, b = 4 + r() * 10; for (const dx of [-w, 0, w]) { g.beginPath(); g.ellipse(x + dx, y, a, b, 0, 0, 7); g.fill(); } } }), transparent: true, opacity: 0.8, depthWrite: false, roughness: 1 })); B2.add(cloudsB);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3474.8e3 / 2 * SC, 48, 32), new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#b8b4ac'; g.fillRect(0, 0, w, h); const r = rng(4); for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(80,76,70,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 10, 0, 7); g.fill(); } }), roughness: 0.95 })); B2.add(moon);
  const iss = new THREE.Group(); { const Bi = Builder(); Bi.add(BX(1.6, 0.25, 0.25), M(0xdddddd, 0.4, 0.5), 0, 0, 0); for (const x of [-0.7, -0.35, 0.35, 0.7]) Bi.add(BX(0.18, 0.02, 1.4), M(0xc89a3a, 0.3, 0.6), x, 0, 0); Bi.build(iss); iss.scale.setScalar(2.2); B2.add(iss); }
  // MITTENS CAM (space part): you under the umbrella in the yellow boat, Mittens on the bow, rain
  const MCam = new THREE.Scene(); MCam.background = new THREE.Color(0x6f8fb8); MCam.fog = new THREE.Fog(0x8fa8c8, 4, 14); MCam.add(new THREE.HemisphereLight(0xffffff, 0x5a7a9a, 1.1)); const mcD = new THREE.DirectionalLight(0xffd9a8, 2.4); mcD.position.set(2, 2.5, 3); MCam.add(mcD);
  const mcW = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ map: waveTex.clone(), roughness: 0.15, metalness: 0.2 })); mcW.material.map.repeat.set(12, 12); mcW.rotation.x = -Math.PI / 2; MCam.add(mcW);
  const mcBoat = makeBoat(); MCam.add(mcBoat); const mcP = makePerson(THREE, { shirt: 0xf2994a, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0x3a2a1e, seed: 5, hairStyle: 'short' }); mcP.group.rotation.order = 'YXZ'; MCam.add(mcP.group);
  const mcU = makeUmbrella(); MCam.add(mcU); const mc = makeCat(THREE, 0xf0a040); MCam.add(mc); const MCC = mc.userData.cat;
  const mcRain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xdfefff, transparent: true, opacity: 0.6 })); { const pts = []; const r = rng(9); for (let i = 0; i < 260; i++) { const x = (r() - 0.5) * 6, y = r() * 4, z = (r() - 0.5) * 5; pts.push(x, y, z, x - 0.03, y - 0.35, z); } mcRain.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3)); MCam.add(mcRain); }
  const mcCam = new THREE.PerspectiveCamera(34, 1, 0.05, 40); mcCam.position.set(0.6, 1.5, 3.4); mcCam.lookAt(0, 0.7, 0);

  await document.fonts.ready;

  const milIdx = (tt) => { let k = -1; for (let i = 0; i < MT.length; i++) if (tt >= MT[i] - 0.05) k = i; return k; };
  const MOODS = ['annoyed', 'scared', 'shock', 'annoyed', 'unimpressed', 'annoyed', 'shock', 'sleepy', 'unimpressed', 'annoyed', 'unimpressed', 'shock', 'annoyed'];
  // poses
  function sitPose(Q) { Q.legL.rotation.set(-1.45, 0, -0.08); Q.legR.rotation.set(-1.45, 0, 0.08); Q.armL.rotation.set(-0.6, 0, -0.2); Q.armR.rotation.set(-0.6, 0, 0.2); Q.torso.rotation.set(0, 0, 0); }
  function standPose(Q, t) { Q.legL.rotation.set(0, 0, 0.02); Q.legR.rotation.set(0, 0, -0.02); Q.armL.rotation.set(0.05, 0, -0.08); Q.armR.rotation.set(0.05, 0, 0.08); Q.torso.rotation.set(0, 0, 0); }
  function boatPos(tt) { return [-0.4 - 0.35 * Math.max(0, tt - 7), 0, 1.7 + 0.1 * Math.max(0, tt - 7)]; }

  function update(tt0) {
    const teaser = tt0 < TEASER; const tt = teaser ? TOT - 0.04 : tt0;
    const out = { scene: A, camera: cam, bloom: 0.25, bloomThreshold: 0.9, tt, tt0, teaser, tk: tt0 / TEASER, env: 0.35, exposure: 1.0, sat: 1.25, contrast: 1.05, voff: 0 };
    const d = depthAt(tt); out.d = d; out.mi = milIdx(tt); out.hours = d / 0.1;
    const mi = out.mi; const mood = mi >= 0 ? MOODS[mi] : 'annoyed';
    // ---------------- the drowned world ----------------
    world.position.y = -d; world.visible = d < 120;
    const wet = smooth(0.0, 1.2, d); waterM.opacity = lerp(0.5, 0.97, wet); waterM.color.set(0xb8d8e8).lerp(new THREE.Color(0xffffff), wet); water.visible = d > 0.012; water.position.y = 0.004;
    waveTex.offset.set(tt * 0.02, tt * 0.013);
    { const Bp = boatPos(tt); sun.target.position.set(Bp[0], 0, Bp[2] - 4); sun.position.copy(SUND).multiplyScalar(60).add(sun.target.position); const c = sun.shadow.camera; c.left = -25; c.right = 25; c.top = 25; c.bottom = -25; c.near = 5; c.far = 150; c.updateProjectionMatrix(); }
    stallSign.material = d < 0.2 ? signMs.a : (d < 0.32 ? signMs.b : signMs.c);
    CARS.forEach((c, i) => { const fl = smooth(0.22, 0.32, d); c.g.position.y = fl * (d - 0.55); c.g.visible = i !== 1 || tt < 12.4; c.g.position.x = i === 1 ? c.x + 2.1 * clamp(tt - 5.55, 0, 1.05) + 1.1 * Math.max(0, tt - 7.5) : c.x - fl * Math.min(6, Math.max(0, tt - MT[1]) * 0.8); c.g.rotation.z = fl * 0.12 * Math.sin(tt * 1.3 + c.ph); c.g.rotation.x = fl * 0.08 * Math.sin(tt * 1.7 + c.ph); });
    stall.visible = tt < MT[2];
    // ---------------- hero, Mittens, the Unbothered Person, the Salesman ----------------
    const Bp = boatPos(tt); const bob = Math.sin(tt * 2.1) * 0.04; const inBoat = tt > 6.75;
    const boatOn = d > 0.2; boat.visible = boatOn || teaser; const sb0 = [1.0, 0, 0.3];
    const toBoat = smooth(5.6, 6.4, tt);   // the boat floats off the stall into the street
    const bpos = [lerp(sb0[0], Bp[0], toBoat), 0, lerp(sb0[2], Bp[2], toBoat)];
    boat.position.set(bpos[0], bob, bpos[2]); boat.rotation.set(0.04 * Math.sin(tt * 1.7), 0.3 + 0.15 * Math.sin(tt * 0.4), 0.05 * Math.sin(tt * 2.1)); out.focus = inBoat ? boat : P.group;
    { const G = P.group; const jump = smooth(6.35, 6.75, tt); const sx = -0.2, sz = -2.2, sy = 0.15 - d;
      if (!inBoat) { const bx = bpos[0], bz = bpos[2]; G.position.set(lerp(sx, bx, jump), lerp(sy, 0.1, jump) + Math.sin(Math.PI * jump) * 0.9, lerp(sz, bz, jump)); G.rotation.set(0, lerp(0.25, 0.4, jump), 0); standPose(P, tt);
        if (jump > 0) { P.legL.rotation.x = -0.9 * Math.sin(Math.PI * jump); P.legR.rotation.x = -0.4 * Math.sin(Math.PI * jump); P.armL.rotation.set(-2.4 * Math.sin(Math.PI * jump), 0, -0.4); P.armR.rotation.set(-2.4 * Math.sin(Math.PI * jump), 0, 0.4); } }
      else { boat.updateMatrixWorld(true); G.position.copy(boat.position).add(v.set(-0.05, -0.62, -0.45).applyEuler(boat.rotation)); G.rotation.set(boat.rotation.x, boat.rotation.y - 0.25, boat.rotation.z); sitPose(P); }
      let face = { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.5, 0] }, head = [0, 0.5, 0];
      if (tt < 2.2) { face = { brows: 'up', eyes: 1.05, mouth: 'smile', look: [0.6, 0] }; head = [0, 0.55, 0]; }
      else if (tt < 3.6) { face = { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0, 0.3] }; head = [-0.15, 0.1, 0]; }
      else if (tt < 5.5) { face = { brows: 'worried', eyes: 1.25, mouth: 'o', look: [0, -0.8] }; head = [0.4, 0.1, 0]; }
      else if (tt < 8.4) { face = { brows: 'up', eyes: 1.4, mouth: 'open', open: 1.3, look: [0, -0.4] }; head = [0.25, 0, 0]; }
      else if (tt < 11.2) { face = { brows: 'worried', eyes: 1.1, mouth: 'grit', look: [0.8, 0] }; head = [0, 0.7, 0]; }
      else { const k = mi % 3; face = [{ brows: 'up', eyes: 1.35, mouth: 'o', look: [0.8, 0.4] }, { brows: 'worried', eyes: 1.1, mouth: 'flat', look: [0.7, 0.2] }, { brows: 'up', eyes: 1.2, mouth: 'open', open: 1.1, look: [0.9, 0.6] }][k]; head = [-0.2, 0.55, 0]; }
      P.headPivot.rotation.set(...head); setFace(P, face); life(P, tt, 0.8);
      // the umbrella: bought at 11.2 s, held up in the right hand
      if (tt > 11.2 || teaser) { P.armR.rotation.set(-2.6, 0, 0.25); P.group.updateMatrixWorld(true); P.armR.userData.end.getWorldPosition(tv); const op = smooth(11.2, 11.5, tt); umb.position.copy(tv).add(v.set(0, 0.45, 0)); umb.rotation.set(0.1, 0, -0.12); umb.scale.set(lerp(0.15, 1, op), 1, lerp(0.15, 1, op)); umb.visible = true; } else umb.visible = false; }
    { // Mittens: on the bench, then jumps into the boat (bow)
      const jump = smooth(6.45, 6.9, tt); const bx = -0.9, by = 0.15 + 0.64 - d, bz = -3.0;
      boat.updateMatrixWorld(true); const bow = v.set(0.32, 0.03, 0.5).applyMatrix4(boat.matrixWorld).clone();
      if (tt < 6.45) { mit.position.set(bx, by, bz); mit.rotation.set(0, 0.5, 0); } else { mit.position.set(lerp(bx, bow.x, jump), lerp(by, bow.y, jump) + Math.sin(Math.PI * jump) * 0.8, lerp(bz, bow.z, jump)); mit.rotation.set(boat.rotation.x, lerp(0.5, boat.rotation.y - 0.35, jump), boat.rotation.z); }
      mit.scale.setScalar(1.5);
      let m = 'unimpressed'; if (tt > 2.0) m = 'annoyed'; if (tt > 4.3) m = 'scared'; if (tt > 6.4 && tt < 7.2) m = 'shock'; if (tt >= 7.2) m = mood; if (tt > 8.6 && tt < 11.2) m = 'annoyed'; if (tt >= 11.2 && tt < 11.9) m = 'smug';
      MC.headPivot.rotation.y = 0.3 * Math.sin(tt * 0.8) + (m === 'unimpressed' ? -0.4 : 0); MC.headPivot.rotation.x = m === 'sleepy' ? 0.3 : 0; MC.legs.forEach(l => { l.rotation.x = 0; });
      // shakes a wet paw now and then (he hates water)
      const shake = tt > 3.5 && tt < 6.3 ? Math.max(0, Math.sin(tt * 3.0)) : 0; MC.legs[3].rotation.x = -1.2 * shake + 0.3 * shake * Math.sin(tt * 40); MC.legs[3].position.y = 0.07 + 0.1 * shake;
      setCatFace(mit, m, 0.25); catLife(mit, tt, 1); out.catMood = m; }
    { // THE UNBOTHERED PERSON: reads on the bench; still reading as the water reaches his chest; floats away on the bench? no - he just keeps reading until the stop is under
      const G = unb.group; G.position.set(0.75, -0.05 - d, -3.05); G.rotation.set(0, 0, 0); sitPose(unb); unb.armL.rotation.set(-1.25, 0, -0.35); unb.armR.rotation.set(-1.25, 0, 0.35);
      setFace(unb, { brows: 'neutral', eyes: 0.7, mouth: 'flat', look: [0, -0.8] }); unb.headPivot.rotation.set(0.35, 0, 0); life(unb, tt, 0.5);
      G.updateMatrixWorld(true); unb.armL.userData.end.getWorldPosition(tv); const a = tv.clone(); unb.armR.userData.end.getWorldPosition(tv); paper.position.copy(a.add(tv).multiplyScalar(0.5)).add(v.set(0, 0.12, 0.05)); paper.rotation.set(-0.35, 0, 0); paper.position.y += Math.sin(tt * 0.6) * 0.01;
      G.visible = paper.visible = tt < MT[2] + 0.4 && !teaser; }
    { // THE SALESMAN: at his stall, then in his own red boat next to yours with the €900 umbrella sign (8.4-11.6 s)
      const G = sal.group; const inB = tt > 7.6; standPose(sal, tt);
      if (!inB) { G.position.set(1.75, 0.15 - d, -0.9); G.rotation.set(0, -0.5, 0); sal.armR.rotation.set(-1.6 + 0.5 * Math.sin(tt * 4), 0, 0.3); sal.armL.rotation.set(-0.3, 0, -0.2); sBoat.visible = false; sSign.visible = false; sUmb.visible = false; }
      else { const k = smooth(7.6, 8.6, tt) * (1 - smooth(11.6, 12.6, tt)); const bx = Bp[0] + lerp(6, 2.2, k) + (tt > 11.6 ? (tt - 11.6) * 3 : 0), bz = Bp[2] - 1.4; sBoat.position.set(bx, Math.sin(tt * 2.3 + 1) * 0.04, bz); sBoat.rotation.set(0.04 * Math.sin(tt * 1.9), -0.4, 0.05 * Math.sin(tt * 2.4)); sBoat.visible = tt < 12.8;
        G.position.copy(sBoat.position).add(v.set(0, -0.62, 0)); G.rotation.set(0, -0.9, 0); sitPose(sal); sal.armL.rotation.set(-2.5, 0, -0.2); sal.armR.rotation.set(-1.3 + 0.3 * Math.sin(tt * 5), 0, 0.3);
        G.updateMatrixWorld(true); sal.armL.userData.end.getWorldPosition(tv); sSign.position.copy(tv).add(v.set(0, 0.35, 0.05)); sSign.lookAt(cam.position); sSign.visible = sBoat.visible && tt < 11.3; sal.armR.userData.end.getWorldPosition(tv); sUmb.position.copy(tv).add(v.set(0, 0.2, 0)); sUmb.rotation.set(0, 0, 0.5); sUmb.scale.setScalar(0.3); sUmb.visible = sBoat.visible && tt < 11.2; }
      setFace(sal, { brows: 'up', eyes: 1.1, mouth: 'smile', look: [-0.5, 0] }); sal.headPivot.rotation.set(0, inB ? 0.4 : 0.5, 0); life(sal, tt, 0.6); G.visible = !teaser && tt < 12.8; }
    // ripples around the boat
    { for (let i = 0; i < NR; i++) { const [rx, rz, ph] = RIP[i]; const u = ((tt * 1.6 + ph) % 1); const span = lerp(6, 14, smooth(8, 14, tt)); m4.compose(v.set(Bp[0] + rx * span + Math.floor(tt * 1.6 + ph) * 0.37 % 1, 0.02, Bp[2] + rz * span - 2), q.identity(), sc.setScalar(0.04 + u * 0.22)); rip.setMatrixAt(i, m4); } rip.instanceMatrix.needsUpdate = true; rip.material.opacity = 0.28; rip.visible = d > 0.012; }
    // landmarks: the top sinks right next to the boat
    for (const [g, i, Hm, ox, oz] of LMS) { const t1 = MT[i]; const w0 = Hm > 5000 ? 1.0 : 1.3; const win = tt > t1 - w0 && tt < t1 + 0.6; g.visible = win && tt < CUT; if (!g.visible) continue;
      const slide = smooth(t1 - w0, t1 - w0 + 0.8, tt); const s = Hm > 5000 ? 1 : 1; g.position.set(Bp[0] + lerp(ox * 3.5, ox, slide) * s, -d, Bp[2] + oz); }
    // clouds around 2.7 km
    { const k = Math.exp(-Math.pow((tt - MT[7]) / 1.1, 2)); CLOUDS.forEach((c, i) => { c.s.position.set(Bp[0] + c.x - (tt - 15) * 4, c.y + lerp(30, -20, smooth(MT[7] - 1.5, MT[7] + 1.5, tt)), Bp[2] + c.z); c.s.scale.setScalar(c.k); c.s.material.opacity = 0.75 * k; c.s.visible = false; }); }
    // light: golden low sun; a little paler in the clouds
    A.fog.density = lerp(lerp(0.006, 0.0012, smooth(9, 12, tt)), 0.0005, smooth(17.2, 17.7, tt)); A.fog.color.copy(fogC);
    // ---------------- camera ----------------
    let scene = A, camera = cam;
    if (tt < CUT) {
      // human part: fixed street shot that rises with the water, then follows the boat
      const hk = smooth(6.6, 8.4, tt); const camY0 = Math.max(0.9, 1.6 - d * 0.6), camZ0 = 5.0;
      const orbit = 0.25 * Math.sin(tt * 0.18) + 0.15 * smooth(11, 20, tt); const dist = lerp(5.2, 6.4, smooth(11, 14, tt));
      const cpos = [lerp(0.35, Bp[0] - 0.2 + Math.sin(orbit) * dist * 0.15, hk), lerp(camY0, 2.1, hk), lerp(camZ0, Bp[2] + dist, hk)];
      const look = [lerp(0.35, Bp[0] + 0.3, hk), lerp(1.1 - d * 0.3, 0.9, hk), lerp(-2.0, Bp[2] - 2, hk)];
      if (tt > 11.2) { const k2 = smooth(11.2, 12, tt); look[0] += 0.4 * k2; look[1] += 0.7 * k2; }
      cam.position.set(cpos[0] + 0.03 * Math.sin(tt * 0.7), cpos[1] + 0.03 * Math.sin(tt * 1.1), cpos[2]); cam.lookAt(...look); cam.fov = lerp(55, 56, hk); cam.near = 0.05; cam.far = 20000; cam.updateProjectionMatrix();
      out.dof = hk < 0.5 ? 0.1 : 0.05; out.focusY = 0.58; out.focusH = 0.3; out.interior = false;
    } else {
      scene = B2; camera = camB; out.bloom = 0.22; out.bloomThreshold = 0.95; out.vignette = 0.45; out.dof = 0; out.space = true;
      const rb = 100 + d * SC; ball.scale.setScalar(rb); atm.scale.setScalar(rb * 1.03 + 1); cloudsB.scale.setScalar(rb + 0.6); cloudsB.material.opacity = 0.8 * (1 - 0.6 * smooth(MT[9] + 0.2, MT[9] + 1.2, tt)) + 0.3 * smooth(29, 31, tt); cloudsB.visible = cloudsB.material.opacity > 0.01; cloudsB.rotation.y = tt * 0.05 + 0.25 * Math.pow(Math.max(0, tt - 29.2), 1.6);
      const iceT = Math.max(0, d - 1e5); iceS.scale.setScalar(100 + iceT * SC + 0.05); iceS.visible = d > 1.05e5; ballM.uniforms.op.value = lerp(0.97, 0.8, smooth(MT[9] - 0.8, MT[9] + 0.4, tt));
      rockE.rotation.y = tt * 0.04; iceS.rotation.y = tt * 0.04;
      const mk = smooth(MT[11] - 1.4, MT[11] - 0.4, tt); moon.position.set(lerp(700, (rb + 3474.8e3 / 2 * SC + 10) * 0.8, mk), lerp(400, rb * 0.62, mk), 0); moon.visible = tt > MT[11] - 1.5;
      const ia = tt * 0.35; iss.position.set(Math.cos(ia) * (100 + 408e3 * SC), 18, Math.sin(ia) * 30 + 60); iss.lookAt(0, 0, 0); iss.visible = tt > MT[10] - 1.6 && tt < MT[10] + 1.8;
      // camera pulls back the whole time; the ball grows towards the frame edges
      const D = lerp(520, 640, smooth(CUT, MT[11], tt)) + lerp(0, 380, smooth(MT[11] - 0.5, TOT, tt)) + 6 * (tt - CUT);
      const orb = 0.5 * Math.pow(smooth(29, TOT, tt), 1.3); camB.position.set(-0.12 * D * Math.cos(orb) - D * Math.sin(orb) * 0.9 + 10 * Math.sin(tt * 0.2), 0.16 * D, D * Math.cos(orb)); camB.lookAt(lerp(lerp(0, 85, smooth(MT[11] - 1.4, MT[11], tt)), 20, smooth(29, TOT, tt)), 0, 0); camB.fov = 46; camB.updateProjectionMatrix();
      out.focus = ball; out.rb = rb;
    }
    out.scene = scene; out.camera = camera;
    out.flash = 0.3 * pulse(tt, CUT, 0.3); out.shake = 0.15 * pulse(tt, MT[3], 0.4) + 0.12 * pulse(tt, MT[8], 0.5);
    // Mittens cam (space part)
    { const show = tt > CUT ? smooth(CUT, CUT + 0.35, tt) : 0; const m = tt >= 29.6 ? 'smug' : mood;
      mcBoat.position.y = Math.sin(tt * 2) * 0.04; mcBoat.rotation.set(0.05 * Math.sin(tt * 1.6), 0.5, 0.05 * Math.sin(tt * 2.2)); mcBoat.updateMatrixWorld(true);
      mcP.group.position.copy(mcBoat.position).add(v.set(-0.05, -0.62, -0.45).applyEuler(mcBoat.rotation)); mcP.group.rotation.set(0, 0.6, 0); sitPose(mcP); mcP.armR.rotation.set(-2.6, 0, 0.25); setFace(mcP, tt > 29.6 ? { brows: 'up', eyes: 1, mouth: 'smile', look: [0.3, 0] } : { brows: 'worried', eyes: 1.2, mouth: 'o', look: [0.4, 0.5] }); mcP.headPivot.rotation.set(-0.1, 0.1, 0); life(mcP, tt, 0.8);
      mcP.group.updateMatrixWorld(true); mcP.armR.userData.end.getWorldPosition(tv); mcU.position.copy(tv).add(v.set(0, 0.45, 0)); mcU.rotation.set(0.1, 0, -0.15);
      const bow = v.set(0.32, 0.03, 0.5).applyMatrix4(mcBoat.matrixWorld); mc.position.copy(bow); mc.rotation.set(0, 0.3, 0); mc.scale.setScalar(1.4);
      setCatFace(mc, m, 0.3); catLife(mc, tt, 1); MCC.headPivot.rotation.y = 0.25 * Math.sin(tt * 0.9);
      mcRain.position.y = -((tt * 6) % 1.2); mcW.material.map.offset.set(tt * 0.05, tt * 0.03);
      out.inset = { scene: MCam, camera: mcCam, x: 0.74, y: lerp(0.76, 0.62, smooth(MT[11] - 1, MT[11], tt)), r: 0.17, show, ring: '#ffd23f' }; }
    return out;
  }

  // ---------------- on-screen text ----------------
  const CAP = [[3.1, 5.85, "That's a cloudburst. Real ones stop within an hour."], [5.95, 8.65, "This one won't. In ten years, it covers Everest."], [8.75, 11.3, 'You said no to an umbrella. You said it would stop.'],
    [11.4, 13.85, 'Nothing drains away. So it just piles up.'], [13.95, 16.0, 'Under a year. Over the tallest building.'], [16.1, 18.1, "Earth doesn't even have this much water."], [18.2, 19.95, 'Ten years. Everest is gone.'],
    [20.05, 21.6, 'No land is left anywhere.'], [21.7, 23.7, 'The weight squeezes the bottom into ice.'], [23.8, 25.7, "It's now higher than the space station."], [25.8, 27.7, "It's now deeper than the Moon is wide."],
    [27.8, 29.5, 'The rain now weighs more than Earth.'], [29.6, 31.35, 'Well. At least you bought the umbrella.']];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function topText(ctx, W, t, a, b, txt, size = 54, y = 250) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.15, (b - t) / 0.15));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 700 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.86).forEach((l, i) => { ctx.strokeText(l, W / 2, y + i * size * 1.25); ctx.fillText(l, W / 2, y + i * size * 1.25); }); ctx.restore(); }
  function proj(pos, camO) { tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  function mileLabel(ctx, p, title, sub, a = 1) { if (a <= 0 || !p) return; let [x, y] = p; x = clamp(x, 300, 1040); y = clamp(y, 760, 1560);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 42px ${FONT}`; const tw = ctx.measureText(title).width; ctx.font = `700 26px ${FONT}`; const sw = sub ? ctx.measureText(sub).width : 0; const w = Math.max(tw, sw) + 36, h = sub ? 98 : 68;
    const lx = clamp(x - w / 2, 230, 1060 - w), ly = y - h - 26; ctx.fillStyle = 'rgba(10,12,16,0.82)'; ctx.beginPath(); ctx.roundRect(lx, ly, w, h, 16); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(clamp(x, lx + 20, lx + w - 20), ly + h); ctx.lineTo(x, y - 4); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `900 42px ${FONT}`; ctx.fillText(title, lx + 18, ly + 35); if (sub) { ctx.font = `700 26px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(sub, lx + 18, ly + 76); } ctx.restore(); }
  function fmtD(m) { if (m < 1) return [Math.max(0, Math.round(m * 100)) + '', 'CM']; if (m < 10) return [m.toFixed(1), 'M']; if (m < 1000) return [Math.floor(m) + '', 'M']; if (m < 1e4) return [(m / 1000).toFixed(2), 'KM']; return [Math.floor(m / 1000).toLocaleString('en-US'), 'KM']; }
  function fmtT(h) { if (h < 1) return 'AFTER ' + Math.max(1, Math.floor(h * 60)) + ' MIN'; if (h < 48) { const n = Math.floor(h); return 'AFTER ' + n + (n === 1 ? ' HOUR' : ' HOURS'); } const dd = h / 24; if (dd < 60) return 'AFTER ' + Math.floor(dd) + ' DAYS'; if (dd < 365.25 * 2) return 'AFTER ' + Math.floor(dd / 30.44) + ' MONTHS'; return 'AFTER ' + Math.floor(dd / 365.25).toLocaleString('en-US') + ' YEARS'; }
  const G0 = Math.log10(0.01), G1 = Math.log10(1e7);
  function gauge(ctx, tt, dm, mi) { const x = 44, y0 = 330, y1 = 1500, w = 22; const f = dm > 0 ? clamp((Math.log10(Math.max(dm, 0.01)) - G0) / (G1 - G0)) : 0; const yF = lerp(y1, y0, f);
    ctx.save(); ctx.fillStyle = 'rgba(10,12,16,0.55)'; ctx.beginPath(); ctx.roundRect(x - 6, y0 - 6, w + 12, y1 - y0 + 12, 16); ctx.fill();
    const gr = ctx.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, '#9fe8ff'); gr.addColorStop(0.5, '#3fa9ff'); gr.addColorStop(1, '#1f5fd8'); ctx.fillStyle = gr; if (y1 - yF > 1) { ctx.beginPath(); ctx.roundRect(x, yF, w, y1 - yF, 10); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; MIL.forEach(([mm]) => { const py = lerp(y1, y0, (Math.log10(mm) - G0) / (G1 - G0)); ctx.beginPath(); ctx.moveTo(x + w + 4, py); ctx.lineTo(x + w + 18, py); ctx.stroke(); });
    ctx.restore();
    const [num, unit] = fmtD(dm); const bump = mi >= 0 ? pulse(tt, MT[mi], 0.4) : 0;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.font = `800 30px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#7dd3ff'; ctx.strokeText('WATER DEPTH', 92, 392); ctx.fillText('WATER DEPTH', 92, 392);
    ctx.save(); ctx.translate(92, 478); ctx.scale(1 + bump * 0.12, 1 + bump * 0.12); ctx.font = `900 88px ${FONT}`; ctx.lineWidth = 10; ctx.strokeText(num, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(num, 0, 0); const nw = ctx.measureText(num).width; ctx.font = `900 50px ${FONT}`; ctx.lineWidth = 8; ctx.strokeText(unit, nw + 14, 0); ctx.fillText(unit, nw + 14, 0); ctx.restore();
    ctx.font = `800 32px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(fmtT(dm / 0.1), 94, 528); ctx.fillStyle = '#ffd23f'; ctx.fillText(fmtT(dm / 0.1), 94, 528);
    let txt = '', colr = '#bfe3ff'; const justPassed = mi >= 0 && tt < MT[mi] + 0.7; if (justPassed) { txt = 'PASSED: ' + MIL[mi][2]; colr = '#7dff9a'; } else if (mi + 1 < MIL.length) txt = 'NEXT: ' + MIL[mi + 1][1] + ' = ' + MIL[mi + 1][2];
    if (txt) { ctx.font = `800 29px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(txt, 94, 574); ctx.fillStyle = colr; ctx.fillText(txt, 94, 574); }
    ctx.font = `700 24px ${FONT}`; ctx.lineWidth = 5; ctx.strokeText('RAIN: 10 CM EVERY HOUR', 94, 612); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('RAIN: 10 CM EVERY HOUR', 94, 612);
    ctx.restore(); }
  // rain streaks over the whole frame (deterministic per frame)
  function rainFX(ctx, tt, amt) { if (amt <= 0) return; ctx.save(); ctx.globalAlpha = 0.55 * amt; ctx.strokeStyle = 'rgba(225,240,255,0.9)'; ctx.lineWidth = 2.2; ctx.beginPath();
    const r = rng(7); for (let i = 0; i < 260; i++) { const x0 = r() * 1200, sp = 2400 + r() * 1200, ph = r(), len = 50 + r() * 60; const y = ((tt * sp / 1920 + ph) % 1) * 2100 - 100; const x = x0 - y * 0.12; ctx.moveTo(x, y); ctx.lineTo(x - len * 0.12, y + len); } ctx.stroke(); ctx.restore(); }
  function hud(ctx, tt0, st) { const W = 1080, Hh = 1920; const tt = st.tt;
    rainFX(ctx, tt0, st.space ? lerp(0.35, 0.85, smooth(29.2, 31, tt)) : 1);
    const title = (x) => drawTitleTimed(ctx, W, Hh, [{ text: 'WHAT IF IT RAINED 10 CM AN HOUR', size: 70 }, { text: 'AND NEVER STOPPED?', size: 84, accent: true }], x, '#ffd23f', { start: 0, wps: 1000, outAt: 2.55, y: 0.115 });
    gauge(ctx, tt, st.d ?? 0, st.mi ?? -1);
    if (st.teaser) { title(tt0 + 0.01); drawTeaser(ctx, W, Hh, 'freeze', st.tk); return; }
    title(tt0);
    for (const [a, b, txt] of CAP) topText(ctx, W, tt, a, b, txt);
    const camO = st.camera;
    // name tags + speech bubbles (human part only)
    if (tt < 6.3 && camO && !st.space) { P.group.updateMatrixWorld(true); P.headPivot.getWorldPosition(tv); const ph = proj([tv.x, tv.y + 0.45, tv.z], camO);
      mit.updateMatrixWorld(true); MC.headPivot.getWorldPosition(tv); const pm = proj([tv.x, tv.y + 0.32, tv.z], camO);
      sal.group.updateMatrixWorld(true); sal.headPivot.getWorldPosition(tv); const ps = proj([tv.x, tv.y + 0.45, tv.z], camO);
      if (ps) drawBubble(ctx, ps[0], ps[1] - 10, 'UMBRELLA? €10', tt - 1.3, { dur: 1.3, size: 44 });
      if (ph) drawBubble(ctx, ph[0], ph[1] - 10, "NO THANKS, IT'LL STOP!", tt - 2.6, { dur: 1.6, size: 44 });
      if (ph) drawTag(ctx, ph[0], ph[1] + 10, 'YOU', tt - 4.2, { dur: 1.9, bg: '#7dd3ff' });
      if (pm) drawTag(ctx, pm[0], pm[1] - 10, 'MITTENS (HATES WATER)', tt - 3.0, { dur: 2.6 });
      if (ps) drawTag(ctx, ps[0], ps[1] + 10, 'THE SALESMAN', tt - 4.2, { dur: 1.9, bg: '#c9f0c0' }); }
    if (tt > 9.8 && tt < 11.0 && camO && !st.space) { boat.updateMatrixWorld(true); P.headPivot.getWorldPosition(tv); const ph = proj([tv.x, tv.y + 0.45, tv.z], camO); if (ph) drawBubble(ctx, ph[0] - 120, ph[1] - 110, 'FINE. ONE UMBRELLA.', tt - 9.8, { dur: 1.2, size: 42 }); }
    // milestone labels next to the thing
    if (!st.space) { const Bp = boatPos(tt);
      const LP = [[1.4, 0.05, -0.2], null, [0.6, 0.1, -2.6], [Bp[0] + 6, 0.2, -6], null, null, null, [Bp[0] + 3, 2, Bp[2] - 6], null];
      for (let i = 0; i <= 8; i++) { const e1 = i === 1 ? 0.6 : (i >= 4 && i <= 6 ? -0.35 : 0); if (!(tt > MT[i] - 0.25 && tt < MT[i] + 1.4 + e1)) continue; const a = smooth(MT[i] - 0.25, MT[i], tt) * (1 - smooth(MT[i] + 1.1 + e1, MT[i] + 1.4 + e1, tt)); let p = null;
        if (i === 1) { const c = CARS[1].g; c.updateMatrixWorld(true); c.getWorldPosition(tv); p = proj([tv.x, tv.y + 1.5, tv.z], camO); }
        else if (i >= 4 && i !== 7) { const L = LMS.find(l => l[1] === i); L[0].updateMatrixWorld(true); L[0].getWorldPosition(tv); p = proj([tv.x, 0.5, tv.z], camO); }
        else if (LP[i]) p = proj([LP[i][0], LP[i][1], LP[i][2]], camO);
        mileLabel(ctx, p, MIL[i][1] + ' = ' + MIL[i][2], SUBS[i], a); } }
    else { const rb = st.rb || 100;
      for (let i = 9; i < MIL.length; i++) { const end = i === MIL.length - 1 ? 1e9 : MT[i] + 1.6; if (!(tt > MT[i] - 0.25 && tt < end)) continue; const a = smooth(MT[i] - 0.25, MT[i], tt) * (i === MIL.length - 1 ? 1 : 1 - smooth(end - 0.3, end, tt)); let p;
        if (i === 9) p = proj([rb * 0.55, rb * 0.62, rb * 0.55], camO); else if (i === 10) p = proj(iss.position.toArray(), camO); else if (i === 11) p = proj(moon.position.toArray(), camO); else p = proj([0, rb * 0.95, 0], camO);
        if (p && i === 11) p[1] -= 40; mileLabel(ctx, p, MIL[i][1] + ' = ' + MIL[i][2], SUBS[i], a); } }
    if (tt >= 31.45) topText(ctx, W, tt, 31.45, 1e9, "How high would it get before you'd leave home?", 50);
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
