import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeEarth, makeBurst, softTex, setFace, life, drawSideCounter, drawTitleTimed, drawTag, makeShockwave, RoundedBoxGeometry, stars, carGeos } from './lib.js';
import { makeStreetLife } from './streetlife.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 19 episode — RUNAWAY FORMAT: "What if your cat doubled in size and never stopped?"
// PLACE: the living-room couch of a little ochre cottage squeezed between tall stepped-gable town houses (new: not a kitchen, not a garden).
// STAKE: it's dinner time, Mittens is hungry, you stay on the couch. Payoff: she is past the Moon and still wants her dinner.
// PROCESS: height = 0.30 m x 2^n, weight = 4 kg x 8^n (square-cube law). 12 steps, one continuous pull-back:
//          couch -> room (she flattens the couch) -> the roof comes off and the walls fall open -> street -> town -> clouds -> planes -> space,
//          one cut -> Earth under her paws like a toy ball -> the Moon beside her head.
// CAST: BAD TIMING (neighbour carrying a birthday cake — it becomes Mittens' dinner), THE UNBOTHERED PERSON (man on a bench, keeps eating his sandwich).
// Mittens is the star and is in every shot; the round inset is a HERO cam (your face), shown once you are too small to read.
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
const backOut = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

// ---------------- timeline (step lengths from the real narration durations, audio/mittensgrow_dur.json) ----------------
const T1 = 3.0; const STEPS = [4.0, 4.1, 4.5, 4.0, 4.0, 4.0, 4.0, 4.25, 4.29, 4.55, 4.0, 4.0];
const STS = [T1]; for (const s of STEPS) STS.push(+(STS[STS.length - 1] + s).toFixed(3));
const ST = (k) => STS[k - 1]; const NSTEP = 12; const PUNCH = +(STS[12] + 0.06).toFixed(3), ASK = +(PUNCH + 1.6).toFixed(3), TOT = +(ASK + 2.43 + 0.45).toFixed(2);
const CUT = ST(11);
const NS = [0, 1, 2, 3, 4, 5, 7, 9, 12, 15, 19, 27, 31];
const H0 = 0.30, W0 = 4, HREF = 0.6;            // metres, kg; makeCat is ~0.6 units to the top of the head at scale 1
const stepOf = (t) => { if (t < T1) return 0; for (let k = NSTEP; k >= 1; k--) if (t >= ST(k)) return k; return 0; };
const GROW_AT = (k) => ST(k) + (k === 1 ? 0.35 : 0.15);
function nAt(t) { const k = stepOf(t); if (k === 0) return 0; const a = NS[k - 1], b = NS[k], dn = b - a; const roll = dn === 1 ? (k === 4 ? 1.0 : 0.55) : dn < 4 ? 1.0 : 1.5;
  const u = (t - GROW_AT(k)) / roll; if (u <= 0) return a; if (dn === 1) return a + easeOut(u); return a + dn * easeInOut(u); }
function bounceAt(t) { const k = stepOf(t); if (k === 0) return 1; const u = (t - GROW_AT(k)) / 0.7; return u > 0 && u < 1 ? 1 + 0.07 * Math.sin(Math.PI * u) * (1 - u) * 2 : 1; }
const hOf = (n) => H0 * Math.pow(2, n), wOf = (n) => W0 * Math.pow(8, n);
export { ST, TOT, PUNCH, ASK, CUT, nAt };

export async function create({ THREE, W, H }) {
  const R = rng(1120);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function signMat(text, bg, fg, w = 512, h = 112) { return new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = h * 0.56; g.font = `900 ${fs}px ${FONT}`; const mw = g.measureText(text).width; if (mw > w * 0.84) { fs *= w * 0.84 / mw; g.font = `900 ${fs}px ${FONT}`; } g.fillText(text, w / 2, h * 0.54); }) }); }
  const stripeMat = (a, b) => new THREE.MeshStandardMaterial({ roughness: 0.75, map: canvasTex(256, 64, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? a : b; g.fillRect(k * 32, 0, 32, 64); } g.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(k * 32 + 16, 64, 16, Math.PI, 0); g.fill(); } }) });

  // =====================================================================================================
  // SCENE A (metres). Cottage at the origin, front facing +z. Street (cars along x) at z 10..30, opposite town houses face -z at z = 35.
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(48, W / H, 0.03, 4e7);
  const fogC = new THREE.Color(0xf3dcc0); A.fog = new THREE.FogExp2(fogC.getHex(), 0.0006);
  A.add(new THREE.HemisphereLight(0xdce9ff, 0x9a8466, 0.78));
  const sun = new THREE.DirectionalLight(0xffd6a0, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x86b4ff, 1.1); rim.position.set(300, 240, -300); A.add(rim);
  const SUN = new THREE.Vector3(-0.5, 0.48, 0.72).normalize();     // low warm sun from the front-left: lights the faces
  function setShadow(cx, cy, cz, size) { sun.target.position.set(cx, cy, cz); sun.position.set(cx + SUN.x * size * 6, cy + SUN.y * size * 6, cz + SUN.z * size * 6); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = size * 0.5; c.far = size * 14; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 60 ? 1.5 : 0.02; }
  const sky = makeSkyDome(THREE, 0x6aa2e4, 0xffe2bc, [SUN.x, SUN.y, SUN.z]); A.add(sky); sky.scale.setScalar(3e7);
  const zen0 = new THREE.Color(0x6aa2e4), hor0 = new THREE.Color(0xffe2bc), zenA = new THREE.Color(0x3f7fd0), horA = new THREE.Color(0xbcd6f0), zenS = new THREE.Color(0x040820), horS = new THREE.Color(0x1a3c80), fogA = new THREE.Color(0xa9c6e8);
  const starsA = stars(THREE, 2500, 2e7, 5); starsA.material.transparent = true; starsA.material.opacity = 0; starsA.renderOrder = -9; A.add(starsA);

  // ---------------- the ground near the cottage: cobbled street, pavements, lawns, garden path, fences ----------------
  const cob = new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(512, 512, (g) => { g.fillStyle = '#6a5f57'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = `hsl(${22 + (x * 7 + y * 13) % 14}, 15%, ${40 + ((x * 31 + y * 17) % 13)}%)`; g.beginPath(); g.roundRect(x * 32 + 2 + (y % 2) * 16, y * 32 + 2, 28, 28, 8); g.fill(); } }) });
  cob.map.wrapS = cob.map.wrapT = THREE.RepeatWrapping; cob.map.repeat.set(60, 6); { const m = new THREE.Mesh(BX(400, 0.1, 20), cob); m.position.set(0, 0.05, 20); m.receiveShadow = true; A.add(m); }
  const pav = new THREE.MeshStandardMaterial({ roughness: 0.85, map: canvasTex(256, 256, (g) => { g.fillStyle = '#b8a688'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = `hsl(${28 + (x * 7 + y * 13) % 9}, 24%, ${58 + ((x * 31 + y * 17) % 8)}%)`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); } }) });
  pav.map.wrapS = pav.map.wrapT = THREE.RepeatWrapping; pav.map.repeat.set(80, 1);
  for (const z of [7.5, 32.5]) { const p = new THREE.Mesh(BX(400, 0.17, 5).translate(0, 0.085, 0), pav); p.position.set(0, 0, z); p.receiveShadow = true; A.add(p); }
  const lawnM = new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(256, 256, (g) => { g.fillStyle = '#6fae48'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1800; i++) { g.fillStyle = `hsla(${88 + Math.random() * 30}, 50%, ${34 + Math.random() * 22}%, 0.7)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 5); } }) });
  lawnM.map.wrapS = lawnM.map.wrapT = THREE.RepeatWrapping; lawnM.map.repeat.set(6, 6);
  { const l = new THREE.Mesh(BX(20, 0.12, 20), lawnM); l.position.set(0, 0.06, -5); l.receiveShadow = true; A.add(l); }
  // the cottage's front path, picket fence, flower beds, a little tree, the hedge at the back
  { const g = new THREE.Group(); const B = Builder(); const wht = M(0xf6f1e6, 0.6);
    B.add(BX(1.4, 0.04, 2.3), M(0xcbb79a, 0.85), 0.9, 0.13, 3.85); for (let x = -9.8; x <= 9.8; x += 0.32) if (Math.abs(x - 0.9) > 0.75) { B.add(RB(0.1, 0.85, 0.05, 0.02), wht, x, 0.5, 4.9); }
    B.add(BX(19.6, 0.06, 0.05), wht, 0, 0.75, 4.93); B.add(BX(19.6, 0.06, 0.05), wht, 0, 0.35, 4.93);
    for (const [x, c] of [[-2.2, 0xff4f7a], [-1.2, 0xffd23f], [-3.2, 0xc86bff], [2.4, 0xff8a3d], [3.4, 0xff4f7a]]) { B.add(BX(0.9, 0.1, 0.7), M(0x5a3a22, 0.95), x, 0.15, 3.7); for (let k = 0; k < 4; k++) B.add(new THREE.SphereGeometry(0.11, 10, 8), M(c, 0.7), x - 0.3 + k * 0.2, 0.32, 3.6 + (k % 2) * 0.2); }
    B.add(new THREE.CylinderGeometry(0.1, 0.15, 2.4, 10), M(0x6a4a30, 0.9), 6.5, 1.3, 2.5); for (let k = 0; k < 6; k++) B.add(new THREE.SphereGeometry(0.8 + R() * 0.3, 16, 12), M(k % 2 ? 0x4c9a3c : 0x6fb84a, 0.85), 6.5 + (R() - 0.5) * 1.1, 2.9 + R() * 0.8, 2.5 + (R() - 0.5) * 1.1);
    for (let x = -9.5; x <= 9.5; x += 1.0) B.add(new THREE.SphereGeometry(0.75, 12, 10), M(x % 2 ? 0x3f8a3a : 0x4c9a3c, 0.9), x, 0.75, -14.5);
    B.add(RB(0.6, 1.0, 0.5, 0.05), M(0x3a7bd5, 0.5), 3.4, 0.62, 4.3);   // letterbox
    B.build(g); A.add(g); }

  // ---------------- the cottage: four walls that can fall open, a ceiling and a tiled roof that can fly off ----------------
  const FLY = 0.15, CEIL = 2.95, HX0 = -3.3, HX1 = 3.3, HZ0 = -2.7, HZ1 = 2.7, TH = 0.2;
  const wallO = M(0xe9a94b, 0.85), trim = M(0xf6efe2, 0.7), shutM = M(0x2f7d6a, 0.6);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a4c, roughness: 0.12, metalness: 0.55, emissive: 0x1a1208, emissiveIntensity: 0.4 });
  const litM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.3, emissive: 0xffb860, emissiveIntensity: 0.9 });
  const paperIn = new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(256, 256, (g) => { g.fillStyle = '#7fc8b0'; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(255,255,255,0.28)'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 8, 256); g.fillStyle = 'rgba(255,140,170,0.6)'; for (let y = 16; y < 256; y += 64) for (let x = 20; x < 256; x += 64) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); } }) });
  paperIn.map.wrapS = paperIn.map.wrapT = THREE.RepeatWrapping; paperIn.map.repeat.set(3, 1.5);
  const walls = [];   // { g: pivot group, axis, dir }
  function wallPanel(len, holes, inner) {     // panel lying in local x (0..len), y up, thickness toward -z (outer face at z=0)
    const B = Builder(); const h = CEIL - FLY; const cuts = [...holes].sort((a, b) => a[0] - b[0]); let x = 0;
    const seg = (x0, x1, y0, y1) => { if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3) return; B.add(BX(x1 - x0, y1 - y0, TH * 0.75), wallO, (x0 + x1) / 2, (y0 + y1) / 2, -TH * 0.375); B.add(BX(x1 - x0, y1 - y0, TH * 0.25), inner, (x0 + x1) / 2, (y0 + y1) / 2, -TH * 0.875); };
    for (const [cx, w, y0, y1, kind] of cuts) { seg(x, cx - w / 2, 0, h); seg(cx - w / 2, cx + w / 2, 0, y0); seg(cx - w / 2, cx + w / 2, y1, h); x = cx + w / 2;
      if (kind === 'door') { B.add(RB(w, y1 - y0, 0.08, 0.02), M(0x2f7d6a, 0.5), cx, (y0 + y1) / 2, -0.05); B.add(new THREE.SphereGeometry(0.05, 10, 8), M(0xffd23f, 0.3, 0.6), cx + w * 0.35, 1.0, 0.0); }
      else { B.add(BX(w, y1 - y0, 0.04), kind === 'lit' ? litM : glassM, cx, (y0 + y1) / 2, -TH * 0.5); B.add(BX(0.06, y1 - y0, 0.06), trim, cx, (y0 + y1) / 2, -TH * 0.45); B.add(RB(w + 0.2, 0.1, 0.25, 0.02), trim, cx, y0 - 0.05, 0.05);
        B.add(RB(w + 0.16, 0.08, 0.06, 0.02), trim, cx, y1 + 0.04, 0.0); B.add(RB(0.46, y1 - y0 + 0.1, 0.06, 0.02), shutM, cx - w / 2 - 0.26, (y0 + y1) / 2, 0.04); B.add(RB(0.46, y1 - y0 + 0.1, 0.06, 0.02), shutM, cx + w / 2 + 0.26, (y0 + y1) / 2, 0.04); } }
    seg(x, len, 0, h); B.add(BX(len, 0.16, TH + 0.08), trim, len / 2, h - 0.08, -TH / 2); B.add(BX(len, 0.3, TH + 0.04), M(0xb98a5a, 0.9), len / 2, 0.15, -TH / 2);
    return B; }
  function addWall(B, ox, oz, ry, fallAxis) { const piv = new THREE.Group(); piv.position.set(ox, FLY, oz); const inner = new THREE.Group(); piv.add(inner); B.build(inner); A.add(piv); walls.push({ piv, ry }); }
  // front wall (z = HZ1, outer face toward +z): door + two windows
  addWall(wallPanel(HX1 - HX0, [[0.9 + 3.3, 1.0, 0, 2.15, 'door'], [-1.9 + 3.3, 1.3, 0.9, 2.2, 'win'], [2.5 + 3.3, 0.9, 0.9, 2.2, 'win']], paperIn), HX0, HZ1, 0);
  // back wall (outer face toward -z): one lit window above the couch
  addWall(wallPanel(HX1 - HX0, [[3.3, 1.5, 1.45, 2.45, 'lit']], paperIn), HX1, HZ0, Math.PI);
  // side walls
  addWall(wallPanel(HZ1 - HZ0, [[2.7, 1.1, 1.0, 2.2, 'win']], M(0xffd6e0, 0.9)), HX0, HZ0, -Math.PI / 2);
  addWall(wallPanel(HZ1 - HZ0, [[2.7, 1.1, 1.0, 2.2, 'win']], M(0xffd6e0, 0.9)), HX1, HZ1, Math.PI / 2);
  walls.forEach(w => w.piv.rotation.order = 'YXZ');
  // floor (wood planks) + plinth
  const floorM = new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 512, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = `hsl(${26 + (i * 7) % 8}, 46%, ${42 + (i * 13) % 9}%)`; c.fillRect(0, i * 32, 512, 31); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect((i * 173) % 512, i * 32, 3, 32); } }) });
  floorM.map.wrapS = floorM.map.wrapT = THREE.RepeatWrapping; floorM.map.repeat.set(2, 2);
  { const f = new THREE.Mesh(BX(HX1 - HX0, 0.12, HZ1 - HZ0), floorM); f.position.set(0, FLY - 0.06, 0); f.receiveShadow = true; A.add(f); const p = new THREE.Mesh(BX(HX1 - HX0 + 0.3, 0.2, HZ1 - HZ0 + 0.3), M(0xb98a5a, 0.9)); p.position.set(0, 0.03, 0); A.add(p); }
  // ceiling + roof (pitched, ridge along x; gables are part of the roof piece) — they fly off as separate pieces
  const roofPieces = [];
  { const ceil = new THREE.Group(); const B = Builder(); B.add(BX(HX1 - HX0, 0.12, HZ1 - HZ0), M(0xfff6e8, 0.9), 0, 0, 0); B.add(BX(0.5, 0.05, 0.5), M(0xffffff, 0.6), 0, -0.08, -0.3); B.build(ceil); ceil.position.set(0, CEIL + 0.06, 0); A.add(ceil);
    roofPieces.push({ g: ceil, p0: ceil.position.clone(), vel: new THREE.Vector3(0, 12, -13), spin: new THREE.Vector3(0.6, 0.2, -0.4) }); }
  const tileM = new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(256, 256, (g) => { g.fillStyle = '#b5523b'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = `hsl(${10 + (x * 5 + y * 7) % 9}, 52%, ${38 + ((x * 31 + y * 17) % 9)}%)`; g.beginPath(); g.roundRect(x * 32 + (y % 2) * 16 - 2, y * 32 + 2, 30, 28, 9); g.fill(); } }) });
  tileM.map.wrapS = tileM.map.wrapT = THREE.RepeatWrapping; tileM.map.repeat.set(4, 2);
  const RIDGE = 1.75, RW = HZ1 - HZ0 + 0.7, slope = Math.atan2(RIDGE, RW / 2), sl = Math.hypot(RIDGE, RW / 2);
  for (const s of [-1, 1]) { const g = new THREE.Group(); const m = new THREE.Mesh(BX(HX1 - HX0 + 0.6, 0.16, sl), tileM); m.castShadow = m.receiveShadow = true; m.rotation.x = -s * slope; m.position.set(0, RIDGE / 2, s * RW / 4); g.add(m);
    const gable = new THREE.Shape(); gable.moveTo(0, 0); gable.lineTo(s * RW / 2 - s * 0.35, 0); gable.lineTo(0, RIDGE - 0.12); gable.closePath();
    for (const x of [HX0 + 0.1, HX1 - 0.1]) { const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.18, bevelEnabled: false }), wallO); gm.rotation.y = -Math.PI / 2; gm.position.set(x + 0.09, 0, 0); gm.castShadow = true; g.add(gm); }
    if (s > 0) { const ch = new THREE.Mesh(RB(0.6, 1.4, 0.6, 0.05), M(0x9a4a35, 0.9)); ch.position.set(1.9, RIDGE * 0.7, -0.6); g.add(ch); }
    g.position.set(0, CEIL + 0.12, 0); A.add(g); roofPieces.push({ g, p0: g.position.clone(), vel: s > 0 ? new THREE.Vector3(13, 13, -8) : new THREE.Vector3(-12, 13, -10), spin: new THREE.Vector3(s * 1.4, 0.3 * s, 0.5) }); }
  const chimneyNote = 0;
  // ---------------- the living room ----------------
  const couch = new THREE.Group(); { const B = Builder(); const fab = M(0xe2507a, 0.85), fab2 = M(0xf27a9a, 0.85), leg = M(0x5a3a20, 0.6);
    B.add(RB(2.5, 0.28, 0.95, 0.1), fab, 0, 0.26, 0); B.add(RB(2.5, 0.7, 0.26, 0.12), fab, 0, 0.62, -0.38); for (const s of [-1, 1]) B.add(RB(0.26, 0.55, 0.95, 0.12), fab, s * 1.25, 0.47, 0);
    for (const s of [-1, 1]) B.add(RB(1.08, 0.16, 0.72, 0.08), fab2, s * 0.56, 0.47, 0.08); for (const [x, z] of [[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.4], [1.15, 0.4]]) B.add(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 8), leg, x, 0.06, z);
    B.add(RB(0.42, 0.36, 0.14, 0.07), M(0xffd23f, 0.8), -0.95, 0.72, -0.18, -0.2, 0.3, 0.1); B.add(RB(0.42, 0.36, 0.14, 0.07), M(0x2bb3b1, 0.8), 0.95, 0.72, -0.18, -0.2, -0.3, -0.1);
    B.build(couch); couch.position.set(0, FLY, -1.85); A.add(couch); }
  const SEAT = FLY + 0.55;
  { const g = new THREE.Group(); const B = Builder();
    B.add(RB(2.6, 0.02, 1.7, 0.01), M(0x1f5f8a, 0.95), 0, FLY + 0.01, -0.75); B.add(RB(2.2, 0.025, 1.3, 0.01), M(0x2bb3b1, 0.95), 0, FLY + 0.015, -0.75); B.add(RB(1.4, 0.03, 0.6, 0.01), M(0xffd23f, 0.95), 0, FLY + 0.02, -0.75);
    // side table + plant, floor lamp, bookshelf, picture frames
    B.add(RB(0.5, 0.55, 0.5, 0.05), M(0xc27a35, 0.6), -1.75, FLY + 0.275, -2.05); B.add(new THREE.CylinderGeometry(0.15, 0.11, 0.24, 14), M(0xc9683f, 0.85), -1.75, FLY + 0.67, -2.05); for (let k = 0; k < 5; k++) B.add(new THREE.SphereGeometry(0.13, 12, 10), M(k % 2 ? 0x4c9a3c : 0x5fae44, 0.85), -1.75 + (R() - 0.5) * 0.14, FLY + 0.88 + k * 0.05, -2.05 + (R() - 0.5) * 0.14);
    B.add(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), M(0x222222, 0.5), 1.85, FLY + 0.8, -2.1); B.add(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 16), M(0x222222, 0.5), 1.85, FLY + 0.02, -2.1);
    B.add(RB(1.0, 2.0, 0.35, 0.04), M(0x3a7bd5, 0.6), -2.75, FLY + 1.0, -1.2, 0, Math.PI / 2); for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) B.add(BX(0.25, 0.3 + (k % 3) * 0.04, 0.08), M([0xffd23f, 0xff5fa2, 0xf6efe2, 0xff8a3d, 0x19a354, 0xe63946][(k + r) % 6], 0.6), -2.68, FLY + 0.38 + r * 0.48, -1.6 + k * 0.13);
    B.add(RB(0.7, 0.5, 0.04, 0.02), M(0xffffff, 0.6), -1.9, 1.9, HZ0 + 0.27); B.add(BX(0.6, 0.4, 0.02), M(0x7fb7e6, 0.6), -1.9, 1.9, HZ0 + 0.29); B.add(RB(0.5, 0.62, 0.04, 0.02), M(0xffd23f, 0.6), 1.9, 1.95, HZ0 + 0.27); B.add(BX(0.4, 0.5, 0.02), M(0xff8a9a, 0.6), 1.9, 1.95, HZ0 + 0.29);
    // cat bed (still in its wrapping) + the empty food bowl labelled MITTENS
    B.add(new THREE.TorusGeometry(0.28, 0.1, 10, 24).rotateX(Math.PI / 2), M(0x7a4fd0, 0.8), 2.3, FLY + 0.1, 0.6); B.add(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 24), M(0xf6efe2, 0.9), 2.3, FLY + 0.03, 0.6);
    B.build(g); A.add(g);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.34, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd9a0, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xff9a40, emissiveIntensity: 0.6 })); shade.position.set(1.85, FLY + 1.7, -2.1); A.add(shade); }
  const bowl = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.07, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.35, side: THREE.DoubleSide })); b.position.y = 0.035; bowl.add(b);
    const bt = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24).rotateX(-Math.PI / 2), M(0xf6efe2, 0.5)); bt.position.y = 0.004; bowl.add(bt); const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.045), signMat('MITTENS', '#ffffff', '#e63946', 256, 56)); lab.position.set(0, 0.036, 0.113); lab.rotation.x = -0.25; bowl.add(lab);
    bowl.position.set(0.85, FLY, -0.3); A.add(bowl); }
  const lampL = new THREE.PointLight(0xffc27a, 6.0, 10, 1.6); lampL.position.set(1.85, FLY + 1.65, -1.9); A.add(lampL);
  const fillL = new THREE.PointLight(0xffe6cc, 3.2, 12, 1.4); fillL.position.set(-0.6, 2.4, 1.9); A.add(fillL);

  // ---------------- stepped-gable town houses (Flemish style: new look) ----------------
  const wallPal = [0xd0714f, 0xf2b8b0, 0xf1e3c4, 0x4fa39a, 0xa9c8e0, 0xd9b13b, 0xe9d2b0, 0xc98a6a, 0x9cc9b0, 0xb5523b, 0xf6d6a0, 0x7f9fd6];
  const shops = [['BAKKERIJ', '#ffd23f', '#5a2a10', ['#ffd23f', '#ffffff']], ['APOTHEEK', '#1f8a4c', '#ffffff', null], ['BOEKEN', '#6b3e1e', '#ffffff', ['#6b3e1e', '#f6efe2']], ['WAFELS', '#ff5fa2', '#ffffff', ['#ff5fa2', '#ffffff']], ['KOFFIE', '#1f3d5a', '#ffe9a8', ['#1f3d5a', '#ffe9a8']],
    ['BLOEMEN', '#f6efe2', '#2a6a5a', ['#ff7fb4', '#ffffff']], ['FIETSEN', '#e63946', '#ffffff', ['#e63946', '#ffd23f']], ['FRITUUR', '#19a354', '#ffffff', ['#19a354', '#ffffff']], ['KAAS', '#f2c14e', '#3a2a10', ['#f2c14e', '#ffffff']], ['SNOEP', '#c86bff', '#ffffff', ['#c86bff', '#ffffff']], ['DIERSHOP', '#3a7bd5', '#ffffff', ['#3a7bd5', '#ffffff']]];
  let si = 0; const houses = [];
  function townhouse(x, z, ry, w, floors, k) {
    const g = new THREE.Group(); const B = Builder(); const D = 10, GF = 4.0, FH = 3.0, Hh = GF + floors * FH; const s = shops[(si++) % shops.length];
    const wall = M(wallPal[(k * 5 + 3) % wallPal.length], 0.85), tr = M(0xf6efe2, 0.7), sh = M([0x2f7d6a, 0x3a6ea5, 0x9a3b2f, 0x1d3f6e, 0x7a2e2e][k % 5], 0.6), brick = k % 3 === 0;
    B.add(BX(w, Hh, D), brick ? M(0xa0503a, 0.9) : wall, 0, Hh / 2, -D / 2);
    B.add(RB(w * 0.92, 3.3, 0.24), M(new THREE.Color(s[1]).getHex(), 0.6), 0, 1.65, 0.08); B.add(BX(w * 0.6, 2.2, 0.05), glassM, -w * 0.12, 1.5, 0.23); B.add(RB(0.95, 2.2, 0.1), M(0x6b3e1e, 0.5), w * 0.32, 1.25, 0.24);
    const nW = w > 7 ? 3 : 2, sp = w / nW;
    for (let f = 0; f < floors; f++) { const y = GF + f * FH + FH * 0.5; for (let i = 0; i < nW; i++) { const wx = -w / 2 + sp * (i + 0.5); const lit = R() < 0.22;
        B.add(BX(1.15, 1.8, 0.06), tr, wx, y, 0.02); B.add(BX(0.92, 1.55, 0.05), lit ? litM : glassM, wx, y, 0.06); B.add(BX(0.92, 0.05, 0.05), tr, wx, y + 0.25, 0.09); B.add(RB(1.35, 0.1, 0.26, 0.03), tr, wx, y - 0.95, 0.12);
        if ((i + f + k) % 2 === 0) { B.add(RB(0.44, 1.65, 0.07, 0.02), sh, wx - 0.82, y, 0.06); B.add(RB(0.44, 1.65, 0.07, 0.02), sh, wx + 0.82, y, 0.06); }
        if ((f + i + k) % 4 === 1 && f < floors - 1) { B.add(RB(1.6, 0.12, 0.7, 0.03), tr, wx, y - 1.0, 0.36); for (let b = 0; b < 7; b++) B.add(BX(0.03, 0.8, 0.03), M(0x22262c, 0.5, 0.4), wx - 0.75 + b * 0.25, y - 0.55, 0.7); B.add(BX(1.6, 0.04, 0.04), M(0x22262c, 0.5, 0.4), wx, y - 0.15, 0.7); B.add(new THREE.SphereGeometry(0.18, 10, 8), M([0xff4f7a, 0xffd23f, 0x3f9a4a][k % 3], 0.7), wx - 0.45, y - 0.75, 0.5); } }
      B.add(BX(w + 0.06, 0.14, 0.14), tr, 0, GF + f * FH, 0.05); }
    // gable: stepped (k even) or bell-shaped (k odd)
    if (k % 2 === 0) { for (let st = 0; st < 4; st++) { const ww = w * (1 - st * 0.22), hh = 1.3; B.add(BX(ww, hh, 0.5), brick ? M(0xa0503a, 0.9) : wall, 0, Hh + st * hh + hh / 2, -0.25); B.add(BX(ww + 0.12, 0.14, 0.62), tr, 0, Hh + st * hh + hh, -0.25); } B.add(BX(0.8, 0.9, 0.06), glassM, 0, Hh + 1.6, 0.02); }
    else { const shp = new THREE.Shape(); shp.moveTo(-w / 2, 0); shp.lineTo(w / 2, 0); shp.bezierCurveTo(w / 2, 1.6, w * 0.18, 1.8, w * 0.16, 3.6); shp.lineTo(w * 0.16, 4.4); shp.quadraticCurveTo(0, 5.1, -w * 0.16, 4.4); shp.lineTo(-w * 0.16, 3.6); shp.bezierCurveTo(-w * 0.18, 1.8, -w / 2, 1.6, -w / 2, 0);
      B.add(new THREE.ExtrudeGeometry(shp, { depth: 0.5, bevelEnabled: false }), wall, 0, Hh, -0.5); B.add(BX(w + 0.2, 0.2, 0.6), tr, 0, Hh, -0.2); B.add(BX(0.8, 1.0, 0.06), glassM, 0, Hh + 2.4, 0.02); }
    B.add(BX(w - 0.2, 0.2, D - 0.6), M(0x6a5a50, 0.9), 0, Hh + 0.1, -D / 2 - 0.3);
    { const rs = new THREE.Shape(); rs.moveTo(-D / 2 + 0.3, 0); rs.lineTo(D / 2 - 0.3, 0); rs.lineTo(0, 4.2); rs.closePath(); const rg = new THREE.ExtrudeGeometry(rs, { depth: w - 0.3, bevelEnabled: false }); rg.rotateY(Math.PI / 2); rg.translate(-(w - 0.3) / 2, Hh, -D / 2); B.add(rg, M([0xb5523b, 0x4a5468, 0x9a4a35][k % 3], 0.85), 0, 0, 0); }
    B.build(g);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.74, 0.72), signMat(s[0], s[1], s[2])); sg.position.set(0, 3.35, 0.22); g.add(sg);
    if (s[3]) { const aw = new THREE.Mesh(BX(w * 0.78, 0.07, 1.4), stripeMat(s[3][0], s[3][1])); aw.position.set(-w * 0.06, 2.8, 0.8); aw.rotation.x = 0.33; aw.castShadow = true; g.add(aw); }
    g.position.set(x, 0.17, z); g.rotation.y = ry; A.add(g); houses.push({ g, cx: x, cz: z + (ry === 0 ? -5 : 5), w }); return g; }
  // same side as the cottage (fronts at z = 5 facing +z), then the opposite row (fronts at z = 35 facing -z)
  { let k = 0; for (const dir of [1, -1]) { let x = dir * 10.2; while (Math.abs(x) < 95) { const w = 6.5 + R() * 2.2; townhouse(x + dir * w / 2, 5, 0, w, 2 + Math.floor(R() * 3), k++); x += dir * (w + 0.05); } } }
  { let k = 3; let x = -95; while (x < 95) { const w = 6.5 + R() * 2.2; townhouse(x + w / 2, 35, Math.PI, w, 2 + Math.floor(R() * 3), k++); x += w + 0.05; } }
  // street furniture: lamps, trees, bunting, the bench (THE UNBOTHERED PERSON)
  { const dark = M(0x1d2a26, 0.5, 0.3);
    const lamp = (x, z, s) => { const g = new THREE.Group(); const B = Builder(); B.add(new THREE.CylinderGeometry(0.07, 0.12, 4.4, 14), dark, 0, 2.2, 0); B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8).rotateX(Math.PI / 2), dark, 0, 4.3, s * 0.3); B.build(g);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: 0.8 })); hd.position.set(0, 4.15, s * 0.6); g.add(hd); g.position.set(x, 0.17, z); A.add(g); };
    for (const x of [-52, -30, -14, 18, 38, 60]) { lamp(x, 9.4, 1); lamp(x + 9, 30.6, -1); }
    const tree = (x, z) => { const g = new THREE.Group(); const B = Builder(); B.add(new THREE.CylinderGeometry(0.12, 0.18, 3.0, 10), M(0x6a4a30, 0.9), 0, 1.5, 0); for (let k = 0; k < 6; k++) B.add(new THREE.SphereGeometry(0.9 + R() * 0.35, 16, 12), M(k % 2 ? 0x4c9a3c : 0x6fb84a, 0.85), (R() - 0.5) * 1.2, 3.5 + R() * 0.9, (R() - 0.5) * 1.2); B.build(g); g.position.set(x, 0.17, z); A.add(g); };
    for (const x of [-60, -40, -22, 26, 46, 66]) tree(x, 9.0); for (const x of [-48, -20, 12, 34, 55]) tree(x, 31.0);
    const flagG = new THREE.ConeGeometry(0.2, 0.42, 3); const fg = new THREE.Group(); for (const xb of [-26, 30]) for (let k = 0; k < 26; k++) { const z = 5.5 + k * 1.15, sag = 9.4 - 1.2 * Math.sin(Math.PI * k / 25); const f = new THREE.Mesh(flagG, M([0xff4f7a, 0xffd23f, 0x2bb3b1, 0x3a7bd5][k % 4], 0.6)); f.rotation.x = Math.PI; f.position.set(xb, sag, z); fg.add(f); } A.add(fg);
    const g = new THREE.Group(); const B = Builder(); for (let k = 0; k < 3; k++) B.add(RB(1.8, 0.06, 0.14, 0.02), M(0xc27a35, 0.6), 0, 0.48, -0.2 + k * 0.17); for (let k = 0; k < 2; k++) B.add(RB(1.8, 0.14, 0.05, 0.02), M(0xc27a35, 0.6), 0, 0.75 + k * 0.17, -0.3); B.add(RB(0.06, 0.48, 0.5, 0.02), dark, 0.75, 0.24, 0); B.add(RB(0.06, 0.48, 0.5, 0.02), dark, -0.75, 0.24, 0); B.build(g); g.position.set(11.2, 0.17, 6.3); A.add(g); }
  // city blocks out to ~3 km, a few towers far away
  { const blk = [], roofs = []; const pal = [0xe0a84a, 0xf2b8b0, 0xf1e3c4, 0xd0714f, 0xa9c8e0, 0x4fa39a, 0xd9b13b, 0xe9d2b0, 0xc98a6a, 0xf6d6a0];
    for (let x = -3000; x <= 3000; x += 62) for (let z = -3000; z <= 3000; z += 44) { const cx = x + 31 * ((Math.floor(z / 44) & 1) ? 0.4 : 0), cz = z; if (Math.hypot(cx, cz) > 2900 + R() * 300) continue; if (Math.abs(cx) < 120 && cz > -40 && cz < 60) continue; if (Math.hypot(cx + 600, cz - 700) < 170) continue;
      const w = 44 + R() * 8, d = 28 + R() * 6, h = 12 + R() * 10; blk.push([cx, cz, w, d, h, pal[Math.floor(R() * pal.length)]]); roofs.push([cx, cz, w, d, h]); }
    for (let k = 0; k < 14; k++) { const a = R() * Math.PI * 2, r = 1900 + R() * 900; blk.push([Math.cos(a) * r, Math.sin(a) * r - 300, 30 + R() * 25, 30 + R() * 25, 90 + R() * 160, [0x4a5f74, 0x6f8fa8, 0x55707f, 0x8aa6b8][k % 4]]); }
    const winM = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    winM.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOn = normal; vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp4 = instanceMatrix * wp4;\n#endif\nvWp = (modelMatrix * wp4).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn;').replace('#include <color_fragment>', `#include <color_fragment>
        if (abs(vOn.y) < 0.5) { float uu = abs(vOn.x) > 0.5 ? vWp.z : vWp.x; vec2 c = vec2(uu / 3.0, (vWp.y - 4.0) / 3.0); vec2 f = fract(c); vec2 id = floor(c); float hh = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
          float win = step(0.3, f.x) * step(f.x, 0.7) * step(0.2, f.y) * step(f.y, 0.78) * step(4.0, vWp.y); float lod = clamp(1.0 - max(fwidth(c.x), fwidth(c.y)) * 3.0, 0.0, 1.0);
          vec3 glass = mix(vec3(0.16, 0.2, 0.26), vec3(1.0, 0.82, 0.5), step(0.8, hh)); diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb * 0.75, glass, win), win * lod); if (vWp.y < 3.8) diffuseColor.rgb *= 0.8; }`); };
    const bM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), winM, blk.length); blk.forEach(([x, z, w, d, h, c], k) => { m4.compose(v.set(x, 0.1, z), q.identity(), sc.set(w, h, d)); bM.setMatrixAt(k, m4); bM.setColorAt(k, col.set(c)); }); bM.castShadow = bM.receiveShadow = true; A.add(bM);
    const rs = new THREE.Shape(); rs.moveTo(-0.5, 0); rs.lineTo(0.5, 0); rs.lineTo(0, 0.5); rs.closePath(); const rGeo = new THREE.ExtrudeGeometry(rs, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
    const rM = new THREE.InstancedMesh(rGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), roofs.length); roofs.forEach(([x, z, w, d, h], k) => { const ax = w > d; m4.compose(v.set(x, 0.1 + h, z), q.setFromEuler(e.set(0, ax ? Math.PI / 2 : 0, 0)), sc.set(ax ? d : w, 7, ax ? w : d)); rM.setMatrixAt(k, m4); rM.setColorAt(k, col.set([0xb5523b, 0xc8643a, 0x9a4a35, 0x4a5468][k % 4])); }); rM.castShadow = true; A.add(rM); }
  // the big curved ground: town floor, park, canals, fields, woods, hills, a coast and the sea
  const groundM = new THREE.MeshStandardMaterial({ roughness: 0.95, color: 0xffffff });
  groundM.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 wq = modelMatrix * vec4(transformed, 1.0); transformed.y -= dot(wq.xz, wq.xz) / (2.0 * 6.371e6); vWp = wq.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWp;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += vn(p) * a; p *= 2.03; a *= 0.5; } return s; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 p = vWp.xz; float d = length(p);
      vec2 cell = floor(p / vec2(380.0, 280.0)); float h = hs(cell); float lod = clamp(1.0 - fwidth(p.x) / 120.0, 0.0, 1.0);
      vec3 fA = vec3(0.42, 0.6, 0.2), fB = vec3(0.76, 0.68, 0.3), fC = vec3(0.3, 0.48, 0.16), fD = vec3(0.86, 0.6, 0.72);
      vec3 fld = h < 0.3 ? fA : h < 0.55 ? fB : h < 0.88 ? fC : fD; fld = mix(vec3(0.46, 0.56, 0.26), fld, lod * 0.9);
      float wood = smoothstep(0.55, 0.62, fbm(p / 5200.0)); fld = mix(fld, vec3(0.18, 0.34, 0.14), wood);
      float hills = fbm(p / 40000.0); fld *= 0.85 + 0.3 * hills; fld = mix(fld, vec3(0.62, 0.6, 0.55), smoothstep(0.66, 0.72, fbm(p / 90000.0 + 3.0)) * 0.6);
      vec3 cityC = mix(vec3(0.55, 0.5, 0.45), vec3(0.63, 0.56, 0.48), vn(p / 30.0));
      float cityR = 3000.0 + 500.0 * vn(p / 900.0);
      vec3 cc = mix(cityC, fld, smoothstep(cityR - 200.0, cityR + 300.0, d));
      cc = mix(cc, vec3(0.32, 0.6, 0.25), (1.0 - smoothstep(160.0, 180.0, length(p - vec2(-600.0, 700.0)))));
      float cn = abs(p.x - 1500.0 - 300.0 * sin(p.y / 900.0)); cc = mix(cc, vec3(0.22, 0.45, 0.62), 1.0 - smoothstep(14.0, 22.0 + fwidth(p.x) * 1.5, cn));
      float rv = abs(p.y + 5200.0 - 2600.0 * sin(p.x / 7000.0) - 900.0 * sin(p.x / 1900.0)); cc = mix(cc, vec3(0.2, 0.42, 0.6), 1.0 - smoothstep(80.0, 120.0 + fwidth(p.x) * 1.5, rv));
      float coast = -p.y - 70000.0 - 30000.0 * fbm(p / 60000.0) + 20000.0 * sin(p.x / 70000.0); cc = mix(cc, vec3(0.94, 0.88, 0.7), smoothstep(-2500.0, -500.0, coast)); cc = mix(cc, vec3(0.08, 0.36, 0.62), smoothstep(-300.0, 600.0, coast));
      diffuseColor.rgb = cc;`); };
  const groundG = new THREE.PlaneGeometry(1, 1, 400, 400).rotateX(-Math.PI / 2); { const p = groundG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z), k = Math.pow(r / 0.7071, 3.2) * 0.7071 / Math.max(r, 1e-9); p.setX(i, x * k * 2); p.setZ(i, z * k * 2); } }
  const ground = new THREE.Mesh(groundG, groundM); ground.scale.set(4.5e6, 1, 4.5e6); ground.position.y = -0.02; ground.receiveShadow = true; A.add(ground);
  const cloudM = new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xfff6ea, transparent: true, opacity: 0.85, depthWrite: false, fog: true }); const clouds = [];
  for (let k = 0; k < 200; k++) { const a = k < 60 ? Math.PI * (0.9 + R() * 1.2) : R() * Math.PI * 2, r = k < 60 ? 600 + R() * 1400 : 250 + Math.pow(R(), 0.7) * 60000; const s = new THREE.Sprite(cloudM); s.position.set(Math.cos(a) * r, 850 + R() * 600, Math.sin(a) * r); s.scale.set(k < 60 ? 350 + R() * 500 : 900 + R() * 1600, k < 60 ? 160 + R() * 150 : 350 + R() * 350, 1); A.add(s); clouds.push(s); }

  // ---------------- Mittens ----------------
  const mit = makeCat(THREE, 0xf0a040); mit.rotation.order = 'YXZ'; A.add(mit); const MC = mit.userData.cat;
  const frost = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), M(0xff8fc8, 0.4)); frost.position.set(0.045, 0.0, 0.232); frost.scale.set(0.8, 0.55, 0.55); frost.visible = false; MC.headPivot.add(frost);
  const sprinkle = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M(0xfff15a, 0.4)); sprinkle.position.set(-0.03, 0.035, 0.24); sprinkle.visible = false; MC.headPivot.add(sprinkle);
  const mitBlob = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })); A.add(mitBlob);
  // ---------------- you (same look every video: short hair 0x5a3a20) ----------------
  const P = makePerson(THREE, { shirt: 0x2bb3b1, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xffffff, seed: 5, hairStyle: 'short' }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const remote = new THREE.Mesh(RB(0.05, 0.03, 0.18, 0.01), M(0x222222, 0.4)); A.add(remote);
  // BAD TIMING: the neighbour carrying a birthday cake along the pavement
  const nb = makePerson(THREE, { shirt: 0xff8a3d, pants: 0x3b3b46, hair: 0x1a1210, skin: 0x8d5a3b, shoe: 0xf2c14e, seed: 31, hairStyle: 'long' }); nb.group.rotation.order = 'YXZ'; A.add(nb.group);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.02, 24), M(0xffffff, 0.4)); A.add(plate);
  const cake = new THREE.Group(); { const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.13, 24), M(0xfff1e0, 0.6)); c1.position.y = 0.075; cake.add(c1); const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.035, 24), M(0xff8fc8, 0.5)); c2.position.y = 0.15; cake.add(c2);
    for (let k = 0; k < 5; k++) { const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 6), M([0x3a7bd5, 0xffd23f, 0x19a354, 0xe63946, 0xc86bff][k], 0.5)); const a = k / 5 * 6.28; cd.position.set(Math.cos(a) * 0.09, 0.2, Math.sin(a) * 0.09); cake.add(cd);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc040, toneMapped: false })); fl.position.set(Math.cos(a) * 0.09, 0.245, Math.sin(a) * 0.09); cake.add(fl); } A.add(cake); }
  // THE UNBOTHERED PERSON: on the bench, keeps eating his sandwich
  const ub = makePerson(THREE, { shirt: 0x7a4fd0, pants: 0xf2e3c6, hair: 0xd9d4cc, skin: 0xd8a47e, shoe: 0x3a2a1e, seed: 21, hairStyle: 'bald' }); ub.group.rotation.order = 'YXZ'; A.add(ub.group);
  const sandwich = new THREE.Group(); { const b1 = new THREE.Mesh(RB(0.16, 0.035, 0.1, 0.015), M(0xe0b070, 0.7)); b1.position.y = -0.03; sandwich.add(b1); const l = new THREE.Mesh(BX(0.17, 0.02, 0.11), M(0x5fae44, 0.7)); sandwich.add(l); const b2 = b1.clone(); b2.position.y = 0.03; sandwich.add(b2); A.add(sandwich); }
  // street life (avenue actors live in a group turned so their 'avenue' runs along x in front of the houses)
  const SG = new THREE.Group(); SG.rotation.y = -Math.PI / 2; SG.position.set(0, 0, 10); A.add(SG);
  const SL = makeStreetLife(THREE, SG, { seed: 20, z: 0, only: ['dog', 'jogger', 'cyclist', 'kid', 'van', 'coffee'], dogX: -1.6, dogZ: 34, dogDir: -1, jogX: 22.6, jogZ: -40, bikeX: 2.4, bikeZ: -60, kidX: 22.4, kidZ: 30, kidDir: -1, vanX: 18.2, vanZ: -32, cofX: 22.0, cofZ: 18, balloonColor: 0x2bb3b1, vanColor: 0xfdfbf5, vanStripe: 0xe63946, dogColor: 0x2a2a2a });
  const CG = carGeos(THREE); const carCols = [0xe63946, 0x2bb3b1, 0xffd23f, 0x3a7bd5, 0xfdfbf5, 0xff8a3d, 0x7a4fd0, 0x19a354];
  const NC = 10; const carB = new THREE.InstancedMesh(CG.body, new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 }), NC), carT = new THREE.InstancedMesh(CG.top, new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.2, metalness: 0.5 }), NC);
  carB.castShadow = carT.castShadow = true; carB.frustumCulled = carT.frustumCulled = false; A.add(carB, carT);
  const cars = []; for (let k = 0; k < NC; k++) { const dir = k % 2 ? 1 : -1; cars.push({ z: dir > 0 ? 14 + (k % 4 > 1 ? 3.5 : 0) : 22.5 + (k % 4 > 1 ? 3.5 : 0), dir, x0: -90 + k * 19, sp: 7 + R() * 3 }); carB.setColorAt(k, col.set(carCols[k % carCols.length])); }
  // airliners (drawn bigger) that fly around her at cruising height
  const planes = []; for (let k = 0; k < 2; k++) { const g = new THREE.Group(); const B = Builder(); const wh = M(0xf6f6f2, 0.35, 0.2), bl = M(k ? 0x1d5f99 : 0xe63946, 0.4);
    B.add(new THREE.CapsuleGeometry(2.0, 32, 8, 16).rotateZ(Math.PI / 2), wh, 0, 0, 0); B.add(RB(10, 0.5, 34, 0.2), M(0x9aa3ad, 0.4), 0, -0.6, 0); B.add(RB(3, 5, 0.6, 0.2), bl, -15, 3.5, 0); B.add(RB(4, 0.4, 13, 0.15), wh, -15, 0.5, 0);
    B.add(new THREE.CylinderGeometry(1.1, 1.1, 4, 14).rotateZ(Math.PI / 2), M(0x9aa3ad, 0.4, 0.5), 1, -1.8, 7); B.add(new THREE.CylinderGeometry(1.1, 1.1, 4, 14).rotateZ(Math.PI / 2), M(0x9aa3ad, 0.4, 0.5), 1, -1.8, -7); B.add(RB(28, 0.6, 0.2, 0.1), bl, 0, 0.4, 2.02); B.add(RB(28, 0.6, 0.2, 0.1), bl, 0, 0.4, -2.02); B.build(g); A.add(g); planes.push(g); }
  // effects: roof debris, dust, paw shockwaves
  const debris = makeBurst(THREE, 140, { seed: 3, origin: (r) => [(r() - 0.5) * 6, CEIL + r() * 1.5, (r() - 0.5) * 5], dir: (r) => { const a = r() * 6.28; return [Math.cos(a) * 0.7, 0.6 + r() * 0.8, Math.sin(a) * 0.7]; }, speed: [3, 8], life: [0.9, 1.8], gravity: 9.8, size: 6, color: 0xb5523b, opacity: 1, square: true }); A.add(debris);
  const dust = makeBurst(THREE, 120, { seed: 6, origin: (r) => [(r() - 0.5) * 7, 0.4 + r() * 1.2, (r() - 0.5) * 6], dir: (r) => { const a = r() * 6.28; return [Math.cos(a), 0.15 + r() * 0.3, Math.sin(a)]; }, speed: [2, 5], life: [1.0, 2.0], drag: 1.5, size: 30, color: 0xe8dcc8, opacity: 0.7 }); A.add(dust);
  const waves = [0, 1, 2].map(i => { const w = makeShockwave(THREE, { seed: 9 + i, n: 500, size: 14, sizeR: 40, dustColor: 0xe6d8c0, color: 0xfff2dc, opacity: 0.8 }); A.add(w); return w; });
  const STOMPS = [[ST(5) + 0.9, 1, 16], [ST(5) + 2.3, -1, 16], [ST(6) + 1.6, 1, 64], [ST(7) + 1.9, -1, 256]];   // [t, side, scale]

  // =====================================================================================================
  // SCENE B (kilometres): Earth, the Moon, Mittens bigger than the planet
  // =====================================================================================================
  const B = new THREE.Scene(); B.background = new THREE.Color(0x050a22); const camB = new THREE.PerspectiveCamera(44, W / H, 10, 5e7);
  B.add(stars(THREE, 5000, 3e7, 17)); B.add(new THREE.HemisphereLight(0xbfd4ff, 0x40304a, 0.7)); const RE = 6371;
  const sunB = new THREE.DirectionalLight(0xfff0dc, 3.0); sunB.position.set(-0.55, 0.5, 0.7).multiplyScalar(1e6); B.add(sunB);
  const fillB = new THREE.DirectionalLight(0x9ab8ff, 0.9); fillB.position.set(0.8, -0.2, 0.5).multiplyScalar(1e6); B.add(fillB);
  const earthB = makeEarth(THREE, RE, 18); earthB.rotation.set(0.3, 2.2, 0); B.add(earthB);
  const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0x8fc8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })); earthGlow.scale.setScalar(RE * 3.0); B.add(earthGlow);
  const moonTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#c4bfb6'; g.fillRect(0, 0, w, h); const r = rng(4); for (let k = 0; k < 260; k++) { const x = r() * w, y = r() * h, s = 2 + r() * r() * 22; g.fillStyle = `rgba(${90 + r() * 40},${88 + r() * 40},${84 + r() * 40},${0.35 + r() * 0.4})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } });
  const MOON = new THREE.Vector3(300, 330, 40).normalize().multiplyScalar(384400);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1737, 64, 32), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95 })); moon.position.copy(MOON); B.add(moon);
  const mitB = makeCat(THREE, 0xf0a040); mitB.rotation.order = 'YXZ'; B.add(mitB); const MCB = mitB.userData.cat;
  { const f = frost.clone(); f.visible = true; MCB.headPivot.add(f); const s2 = sprinkle.clone(); s2.visible = true; MCB.headPivot.add(s2); }
  const youDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 64), color: 0xffe9a8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.0 })); B.add(youDot);

  // =====================================================================================================
  // HERO CAM (inset): your face, reacting — you are too small to read once she outgrows the house
  // =====================================================================================================
  const HC = new THREE.Scene(); HC.background = new THREE.Color(0xcfe8ff); HC.add(new THREE.HemisphereLight(0xffffff, 0xb0a0c0, 1.3)); { const d = new THREE.DirectionalLight(0xfff0d8, 2.2); d.position.set(-1.5, 2, 3); HC.add(d); }
  const HP = makePerson(THREE, { shirt: 0x2bb3b1, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xffffff, seed: 5, hairStyle: 'short' }); HC.add(HP.group);
  const hBowl = bowl.clone(); hBowl.scale.setScalar(1.6); HC.add(hBowl);
  const hcCam = new THREE.PerspectiveCamera(30, 1, 0.05, 20); hcCam.position.set(0.15, 1.62, 1.9); hcCam.lookAt(0, 1.52, 0);

  await document.fonts.ready;

  // ---------------- camera A: one continuous pull-back [t, look xyz, azimuth deg (from +x), elevation deg, distance, fov] ----------------
  const CK = [
    [0.0, [-0.05, 0.78, -1.0], 92, 8, 2.95, 60], [T1, [-0.02, 0.8, -1.0], 93, 9, 3.0, 60], [ST(2), [0.05, 0.9, -1.0], 94, 9, 3.1, 60], [ST(3) - 0.3, [0.0, 1.1, -1.1], 92, 8, 3.3, 60],
    [ST(3) + 0.6, [-0.1, 1.55, -1.1], 90, 5, 3.55, 62], [ST(4), [-0.1, 1.65, -1.1], 90, 5, 3.55, 62], [GROW_AT(4) + 0.12, [0.0, 1.9, -1.2], 90, 10, 3.6, 62], [GROW_AT(4) + 0.6, [0.1, 3.2, -1.4], 90, 40, 4.6, 58], [GROW_AT(4) + 1.4, [0.2, 3.0, -1.6], 88, 20, 14.5, 52]];
  const TFR = GROW_AT(4) + 1.4;    // from here the camera frames her by her (slightly lagging) height
  function frameAt(t) { const hl = hOf(nAt(t - 0.05)); const L = Math.log10(hl); const el = lerp(17, 9, smooth(0.7, 5.2, L)), az = lerp(87, 72, smooth(0.7, 5.2, L)), D = hl * lerp(2.9, 2.9, smooth(0.7, 5.2, L)) + 4;
    const lz = -2.0 + 0.12 * hl; const look = [lerp(0, -0.05 * hl, smooth(1, 3, L)), 0.46 * hl, lz]; const a = az * Math.PI / 180, e2 = el * Math.PI / 180;
    return { look, pos: [look[0] + Math.cos(e2) * Math.cos(a) * D, look[1] + Math.sin(e2) * D, look[2] + Math.cos(e2) * Math.sin(a) * D], fov: 50, dist: D }; }
  const sp = (a, b, c, d, u) => { const u2 = u * u, u3 = u2 * u; return 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); };
  const slog = (y) => Math.sign(y) * Math.log(1 + Math.abs(y)), sexp = (y) => Math.sign(y) * (Math.exp(Math.abs(y)) - 1);
  function camAt(K, t) { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[i + 1], k3 = K[Math.min(K.length - 1, i + 2)]; const u = clamp((t - k1[0]) / (k2[0] - k1[0]));
    const S = (f) => sp(f(k0), f(k1), f(k2), f(k3), u);
    const look = [S(k => k[1][0]), sexp(S(k => slog(k[1][1]))), S(k => k[1][2])]; const az = S(k => k[2]) * Math.PI / 180, el = S(k => k[3]) * Math.PI / 180, dist = Math.exp(S(k => Math.log(k[4]))), fov = S(k => k[5]);
    const pos = [look[0] + Math.cos(el) * Math.cos(az) * dist, look[1] + Math.sin(el) * dist, look[2] + Math.cos(el) * Math.sin(az) * dist]; return { pos, look, fov, dist }; }
  // camera B (km): [t, look height factor (x cat height), distance factor (x cat height), fov]
  const BK = [[CUT, 0.0, 0.0, 44], [CUT + 1.6, 0.0, 0.0, 44], [ST(12), 0, 0, 44], [ST(12) + 1.6, 0, 0, 44], [PUNCH, 0, 0, 42], [TOT, 0, 0, 41]];

  // Mittens' mood by step (changes every step; reacts within 0.5 s of each event)
  const MOODS = ['annoyed', 'shock', 'unimpressed', 'smug', 'shock', 'happy', 'smug', 'sleepy', 'unimpressed', 'annoyed', 'scared', 'happy', 'unimpressed'];
  const HMOODS = [null, null, null, null, { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.6 }, { brows: 'worried', eyes: 1.3, mouth: 'grit' }, { brows: 'up', eyes: 1.5, mouth: 'o' }, { brows: 'worried', eyes: 1.0, mouth: 'flat' },
    { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.3 }, { brows: 'worried', eyes: 1.4, mouth: 'o' }, { brows: 'squint', eyes: 0.7, mouth: 'grit' }, { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.8 }, { brows: 'worried', eyes: 1.3, mouth: 'smile' }];
  const TBREAK = GROW_AT(4) + 0.12;         // the moment her ears hit the ceiling
  const TCOUCH = GROW_AT(3) + 0.35;         // two tonnes on the couch
  const HOP0 = ST(3) - 0.4, HOP1 = ST(3) + 0.1;   // she hops onto the couch just before growing

  function walkPose(Q, ph, amp) { Q.legL.rotation.set(Math.sin(ph) * 0.55 * amp, 0, -0.04); Q.legR.rotation.set(-Math.sin(ph) * 0.55 * amp, 0, 0.04); Q.armL.rotation.set(-Math.sin(ph) * 0.45 * amp, 0, -0.1); Q.armR.rotation.set(Math.sin(ph) * 0.45 * amp, 0, 0.1); Q.group.position.y += Math.abs(Math.cos(ph)) * 0.05 * amp; }

  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.22, bloomThreshold: 0.92, shake: 0, flash: 0, t, env: 0.35, exposure: 1.06, sat: 1.28, contrast: 1.09 };
    const k = stepOf(t); out.step = k; const n = nAt(t), hM = hOf(n), s = hM / HREF; out.n = n; out.h = hM;
    // ---------------- Mittens' placement (scene A) ----------------
    const hop = smooth(HOP0, HOP1, t), toStreet = smooth(GROW_AT(4) - 0.05, GROW_AT(4) + 0.7, t);
    let px = lerp(0.4, 0.4, hop), pz = lerp(-0.7, -1.55, hop), ry = lerp(-0.45, -0.55, hop), py = FLY + hop * (0.55 + 0.25 * Math.sin(Math.PI * clamp((t - HOP0) / (HOP1 - HOP0))));
    const squash = smooth(TCOUCH - 0.05, TCOUCH + 0.25, t); if (hop >= 1) py = lerp(SEAT, FLY + 0.12, squash);
    px = lerp(px, 0.3, toStreet); pz = lerp(pz, -3.6, toStreet); ry = lerp(ry, -0.3, toStreet) + 0.45 * smooth(ST(4) + 1.4, ST(5) + 0.4, t); py = lerp(py, FLY + 0.05, toStreet);
    if (t > ST(5)) { const u = smooth(ST(5), ST(6) + 1.0, t); pz = lerp(-3.6, -3.0, u); py = lerp(FLY + 0.05, 0.12, u); }
    let pitch = 0; const eat = smooth(ST(6) + 0.9, ST(6) + 1.5, t) * (1 - smooth(ST(6) + 2.4, ST(6) + 3.2, t)); pitch = -0.2 * eat; py += 0.03 * s * eat;
    mit.position.set(px, py, pz); mit.scale.setScalar(s * bounceAt(t)); mit.rotation.set(pitch, ry - 0.25 * eat, 0);
    couch.scale.y = 1 - 0.72 * squash; couch.visible = t < ST(5) + 1.2;
    // stomping paws
    MC.legs.forEach(l => { l.position.y = 0.07; }); for (const [ts, side, ss] of STOMPS) { const u = clamp((t - (ts - 0.45)) / 0.45); if (u > 0 && u < 1.2) { const li = side > 0 ? 3 : 1; MC.legs[li].position.y = 0.07 + 0.09 * Math.sin(Math.PI * clamp(u)); } }
    // mood
    let mood = MOODS[k]; if (k === 1 && t < GROW_AT(1) + 0.25) mood = 'annoyed'; if (k === 5 && t < ST(5) + 1.4) mood = 'neutral'; if (t >= PUNCH) mood = t < ASK ? 'annoyed' : 'unimpressed';
    MC.headPivot.rotation.set(0, 0, 0); setCatFace(mit, mood, 0.25); catLife(mit, t, 1);
    const meow = (t > 0.9 && t < 1.5) || (t > ST(1) + 1.4 && t < ST(1) + 2.0) || (t > ST(10) + 1.9 && t < ST(10) + 3.0) || (t > PUNCH + 0.1 && t < PUNCH + 0.9);
    if (meow) { MC.mouth.visible = false; MC.smile.visible = false; MC.mouthO.visible = true; MC.headPivot.rotation.x = -0.18; }
    MC.headPivot.rotation.x += (k <= 2 ? -0.1 : 0) + 0.55 * eat; if (k === 5 && t > ST(5) + 1.4) MC.headPivot.rotation.y = 0.45 * smooth(ST(5) + 1.4, ST(5) + 2.0, t);
    const ate = t > ST(6) + 1.5; frost.visible = sprinkle.visible = ate;
    // ---------------- you ----------------
    { const G = P.group; const up = smooth(ST(3) - 0.35, ST(3) + 0.15, t), side = smooth(ST(3) - 0.1, ST(3) + 0.5, t), out2 = smooth(ST(4) + 1.0, ST(5) + 0.6, t);
      let x = lerp(-0.5, -1.45, side), z = lerp(-1.72, 1.25, side), y = lerp(SEAT - 0.8, FLY, up), ryy = lerp(0, 0.6, side);
      x = lerp(x, -4.6, out2); z = lerp(z, 3.6, out2); ryy = lerp(ryy, 0.35, out2);
      G.position.set(x, y, z); G.rotation.set(0, ryy, 0);
      P.legL.rotation.set(-1.45 * (1 - up), 0, -0.05); P.legR.rotation.set(-1.45 * (1 - up), 0, 0.05); P.torso.rotation.set(-0.1 * (1 - up), 0, 0);
      let aL = [-0.25, 0, -0.15], aR = [-0.9, 0, 0.18], head = [0.05, 0, 0], face = { brows: 'neutral', eyes: 0.8, mouth: 'smile', look: [0, 0] };
      if (k === 0) { head = [0.05, 0.08 * Math.sin(t * 1.3), 0]; }
      if (k === 1) { face = { brows: 'up', eyes: 1.2, mouth: 'o', look: [0.6, -0.4] }; head = [0.15, 0.35, 0]; }
      if (k === 2) { face = { brows: 'worried', eyes: 1.3, mouth: 'flat', look: [0.6, -0.2] }; head = [0.1, 0.4, 0]; aR = [-1.2, 0, 0.3]; }
      if (k >= 3) { face = { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.5, look: [0.6, 0.5] }; head = [-0.35, -0.4, 0]; aL = [-2.4, 0, -0.4]; aR = [-2.4, 0, 0.4]; }
      if (k >= 5) { head = [-0.7, 0, 0]; face = HMOODS[k] ? { ...HMOODS[k], look: [0, 1] } : face; }
      if (out2 > 0 && out2 < 1) walkPose(P, t * 11, 1);
      P.armL.rotation.set(...aL); P.armR.rotation.set(...aR); P.headPivot.rotation.set(...head); setFace(P, face); life(P, t, 0.7);
      G.updateMatrixWorld(true); P.armR.userData.end.getWorldPosition(tv); remote.position.copy(tv); remote.visible = t < ST(3); remote.rotation.set(0.4, ryy, 0); }
    // ---------------- the neighbour with the cake ----------------
    { const on = t > ST(5) - 0.5; nb.group.visible = plate.visible = on; cake.visible = on && t < ST(6) + 1.45;
      if (on) { const stop = ST(6) + 0.3; const x = t < stop ? lerp(-15, -9.0, clamp((t - (ST(5) - 0.5)) / (stop - ST(5) + 0.5))) : -9.0; nb.group.position.set(x, 0.17, 7.1); nb.group.rotation.set(0, t < stop ? Math.PI / 2 : Math.PI / 2 - 0.5, 0);
        if (t < stop) walkPose(nb, t * 8, 0.8); else { nb.legL.rotation.set(0, 0, -0.05); nb.legR.rotation.set(0, 0, 0.05); }
        nb.armL.rotation.set(-1.35, 0, 0.35); nb.armR.rotation.set(-1.35, 0, -0.35); const gone = t > ST(6) + 1.45;
        nb.headPivot.rotation.set(gone ? -0.55 : t > stop ? -0.4 : 0.25, gone ? 0.3 : 0, 0); setFace(nb, gone ? { brows: 'up', eyes: 1.7, mouth: 'open', open: 1.7, look: [0, 1] } : t > stop ? { brows: 'up', eyes: 1.4, mouth: 'o', look: [0, 1] } : { brows: 'neutral', eyes: 1.0, mouth: 'smile', look: [0, -0.5] }); life(nb, t, 0.8);
        nb.group.updateMatrixWorld(true); nb.armL.userData.end.getWorldPosition(tv); nb.armR.userData.end.getWorldPosition(tv2); plate.position.copy(tv).add(tv2).multiplyScalar(0.5).add(v.set(0, 0.06, 0)); cake.position.copy(plate.position).add(v.set(0, 0.01, 0)); } }
    // ---------------- the unbothered man on the bench ----------------
    { ub.group.position.set(11.2, 0.17 + 0.05, 6.35); ub.group.rotation.set(0, 0.15, 0); ub.legL.rotation.set(-1.5, 0, -0.08); ub.legR.rotation.set(-1.5, 0, 0.08); const bite = pulse(t % 2.6, 0.2, 0.6);
      ub.armR.rotation.set(-1.6 - 0.5 * bite, 0, 0.35 + 0.1 * bite); ub.armL.rotation.set(-0.3, 0, -0.1); ub.headPivot.rotation.set(0.15 - 0.1 * bite, 0, 0); setFace(ub, { brows: 'neutral', eyes: 0.65, mouth: bite > 0.5 ? 'o' : 'flat', look: [0, -0.3] }); life(ub, t, 0.6);
      ub.group.updateMatrixWorld(true); ub.armR.userData.end.getWorldPosition(tv); sandwich.position.copy(tv).add(v.set(0, 0.03, 0.05)); sandwich.rotation.set(0.2, 0.15, 0); }
    // ---------------- house breaking open ----------------
    { const u = clamp((t - TBREAK) / 1.0); walls.forEach((w, i) => { const d = clamp((t - TBREAK - 0.05 * i) / 0.9); const f = d * d; w.piv.rotation.set(0, 0, 0); const ang = Math.min(Math.PI / 2, f * Math.PI / 2) - 0.06 * Math.sin(Math.PI * clamp((d - 0.85) / 0.15));
        // each wall's inner group is rotated by ry so its outer face points outward; tip it outward around its bottom edge
        w.piv.rotation.set(0, w.ry, 0); w.piv.rotateX(ang); });
      roofPieces.forEach((r) => { const dt = Math.max(0, t - TBREAK); r.g.position.set(r.p0.x + r.vel.x * dt, r.p0.y + r.vel.y * dt - 4.9 * dt * dt, r.p0.z + r.vel.z * dt); r.g.rotation.set(r.spin.x * dt, r.spin.y * dt, r.spin.z * dt); r.g.visible = r.g.position.y > -3; });
      debris.userData.update(t, TBREAK); dust.userData.update(t, TBREAK + 0.6); lampL.intensity = t < TBREAK ? 6 : 6 * (1 - u); fillL.intensity = t < TBREAK ? 3.2 : 3.2 * (1 - u); }
    // stomps -> dust shockwaves at the paw
    { mit.updateMatrixWorld(true); waves.forEach((w, i) => { let on = false; STOMPS.forEach(([ts, side, ss], j) => { const age = t - ts; if (j % 3 !== i || age < 0 || age > 2.2) return; on = true; MC.legs[side > 0 ? 3 : 1].getWorldPosition(tv); w.position.set(tv.x, 0.2, tv.z); w.userData.set(ss * 0.25 * (0.3 + 1.6 * Math.sqrt(age / 2.2)), age / 2.2, 1); }); if (!on) w.userData.set(0, 0); }); }
    // houses under a paw get flattened (with the stomp dust)
    if (n > 5.5) { const paws = [1, 3, 0, 2].map(li => { MC.legs[li].getWorldPosition(tv2); return [tv2.x, tv2.z]; }); const pr = 0.04 * s + 3;
      houses.forEach(hs => { const hit = paws.some(([x, z]) => Math.abs(x - hs.cx) < hs.w / 2 + pr && Math.abs(z - hs.cz) < 5 + pr); if (hit && !hs.flat) hs.flat = t; hs.g.scale.y = hs.flat ? lerp(1, 0.1, clamp((t - hs.flat) / 0.25)) : 1; }); }
    mitBlob.position.set(px, 0.2, pz + 0.05 * s); mitBlob.scale.set(0.22 * s, 1, 0.35 * s); mitBlob.visible = t > TBREAK + 0.6 && t < CUT;
    // ---------------- street life + cars ----------------
    SL.update(t, { look: smooth(TBREAK, TBREAK + 1.0, t), stop: smooth(ST(5), ST(5) + 1.0, t), crouch: 0 });
    cars.forEach((c, i) => { const brake = smooth(ST(5) + 0.5, ST(5) + 2.0, t); const x = wrap(c.x0 + c.dir * c.sp * (t - brake * Math.max(0, t - ST(5) - 0.5) * 0.7), -100, 100); m4.compose(v.set(x, 0.1, c.z), q.setFromEuler(e.set(0, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0)), sc.set(1, 1, 1)); carB.setMatrixAt(i, m4); carT.setMatrixAt(i, m4); }); carB.instanceMatrix.needsUpdate = carT.instanceMatrix.needsUpdate = true;
    // ---------------- airliners circling her head at ~10 km (drawn 30x bigger) ----------------
    { const on = t > ST(9) + 0.9 && t < ST(10) + 1.2; planes.forEach((pl, i) => { pl.visible = on; if (!on) return; const a = (t - ST(9)) * 0.55 + i * Math.PI; const r = 0.27 * s + i * 600, y = 9000 + i * 900;
      pl.position.set(Math.cos(a) * r, y, pz + 0.26 * s + Math.sin(a) * r); pl.rotation.set(0, -a - Math.PI / 2 * (i ? 1 : 1), 0.4); pl.scale.setScalar(55); });
      out.plane = planes[0].position.toArray(); }
    // ---------------- sky: golden afternoon -> blue high up -> dark-blue space ----------------
    const sp_ = smooth(ST(10) + 0.2, ST(10) + 2.0, t);
    // ---------------- camera ----------------
    let scene = A, camera = cam, dof = 0.3, focusY = 0.55, focusH = 0.22;
    if (t < CUT) {
      let C = camAt(CK, Math.min(t, TFR)); if (t > TFR) { const F = frameAt(t), u = smooth(TFR, TFR + 1.0, t); C = { pos: C.pos.map((p, i) => lerp(p, F.pos[i], u)), look: C.look.map((p, i) => lerp(p, F.look[i], u)), fov: lerp(C.fov, F.fov, u), dist: Math.exp(lerp(Math.log(C.dist), Math.log(F.dist), u)) }; }
      cam.position.set(...C.pos); cam.lookAt(...C.look); cam.fov = C.fov; cam.updateProjectionMatrix(); out.dist = C.dist;
      const ah = smooth(700, 15000, C.dist); sky.material.uniforms.zen.value.copy(zen0).lerp(zenA, ah).lerp(zenS, sp_); sky.material.uniforms.hor.value.copy(hor0).lerp(horA, ah).lerp(horS, sp_ * 0.8); starsA.material.opacity = sp_;
      const D = C.dist; A.fog.density = 0.6 / (D + 900) * (1 - 0.8 * sp_) * (1 - 0.55 * ah); A.fog.color.copy(fogC).lerp(fogA, ah).lerp(new THREE.Color(0x5f86c0), sp_);
      clouds.forEach(c => c.visible = D > 250); cloudM.opacity = 0.75 * smooth(250, 1500, D);
      if (D < 5) setShadow(0, 1, -0.5, 6); else setShadow(C.look[0], Math.min(C.look[1], 20), C.look[2], clamp(Math.max(D * 0.8, hM * 1.2), 6, 3000));
      dof = D < 6 ? 0.14 : lerp(0.22, 0.0, smooth(30, 1500, D)); focusY = 0.5; focusH = 0.28;
      out.exposure = t < TBREAK ? 0.98 : lerp(1.06, 1.02, ah); out.sat = 1.26 + 0.1 * ah; out.interior = t < TBREAK - 0.02;
      out.focus = mit; out.space = D > 2e5;
    } else {
      scene = B; camera = camB; dof = 0; out.env = 0.35; out.bloom = 0.5; out.bloomThreshold = 0.75; out.exposure = 1.12; out.vignette = 0.45;
      const hK = hM / 1000, sK = hK / HREF; // km
      // blend from 'standing on Earth at the top' to 'Earth held like a ball in front of her paws'
      const ball = smooth(1.2 * RE, 3.0 * RE, hK);
      const ryB = lerp(0, -0.35, ball), Yax = new THREE.Vector3(0, 1, 0); const stand = new THREE.Vector3(0, RE, 0), hold = new THREE.Vector3(0, 0.1 * sK, 0.3 * sK).applyAxisAngle(Yax, ryB).negate();
      mitB.position.copy(stand).lerp(hold, ball); mitB.scale.setScalar(sK); mitB.rotation.set(0, ryB, 0);
      const mB = t >= PUNCH ? (t < ASK ? 'annoyed' : 'unimpressed') : MOODS[k]; setCatFace(mitB, mB, 0.25); catLife(mitB, t, 1);
      if (t > PUNCH + 0.1 && t < PUNCH + 0.9) { MCB.mouth.visible = MCB.smile.visible = false; MCB.mouthO.visible = true; }
      // look at the Moon in the last step, then back at us for the punchline
      MCB.headPivot.rotation.y = 0.5 * smooth(ST(12) + 1.0, ST(12) + 1.6, t) * (1 - smooth(PUNCH - 0.2, PUNCH + 0.3, t)); MCB.headPivot.rotation.x = -0.12 * smooth(ST(12) + 1.0, ST(12) + 1.6, t) * (1 - smooth(PUNCH - 0.2, PUNCH + 0.3, t));
      // front paws around the ball
      MCB.legs[1].rotation.x = MCB.legs[3].rotation.x = -0.6 * ball; MCB.legs[1].position.y = MCB.legs[3].position.y = 0.07 + 0.05 * ball;
      const center = mitB.position.clone().add(new THREE.Vector3(0, 0.3 * sK, 0.15 * sK).applyAxisAngle(Yax, ryB)); const tgt = new THREE.Vector3(0, RE * 0.5, 0).lerp(center, smooth(0.5 * RE, 3.0 * RE, hK));
      const headW = mitB.position.clone().add(new THREE.Vector3(0, 0.42 * sK, 0.26 * sK).applyAxisAngle(Yax, ryB)); tgt.lerp(headW.lerp(MOON, 0.3), smooth(ST(12) + 0.2, ST(12) + 1.6, t));
      let Dd = Math.max(4.2 * RE, 2.25 * hK);
      const drift = smooth(PUNCH, TOT, t); const dir = new THREE.Vector3(0.42 - 0.08 * drift, 0.22, 1).normalize();
      camB.position.copy(tgt).addScaledVector(dir, Dd * (1 + 0.04 * drift)); camB.lookAt(tgt); camB.fov = 44; camB.updateProjectionMatrix();
      moon.scale.setScalar(Math.max(1, hK * 0.06 / 1737)); earthGlow.scale.setScalar(RE * 3.0);
      out.moon = MOON.toArray(); out.earth = [0, 0, 0]; out.Dd = Dd; out.focus = mitB; out.space = true;
    }
    out.scene = scene; out.camera = camera; out.dof = dof; out.focusY = focusY; out.focusH = focusH;
    out.flash = 0.35 * pulse(t, CUT, 0.4); out.shake = 0.5 * pulse(t, TBREAK, 0.6) + 0.25 * pulse(t, TCOUCH, 0.35) + STOMPS.reduce((m, [ts]) => Math.max(m, 0.3 * pulse(t, ts, 0.4)), 0);
    // ---------------- hero cam ----------------
    { const hm = t >= PUNCH ? { brows: 'worried', eyes: 1.2, mouth: 'smile', look: [0.2, 0.3] } : (HMOODS[k] || { brows: 'up', eyes: 1.4, mouth: 'o' }); const pop = Math.max(0, 1 - (t - ST(Math.max(1, k))) / 0.35);
      HP.group.position.set(0, -pop * 0.03, 0); HP.group.rotation.set(0, 0, 0); HP.headPivot.rotation.set(-0.35 + 0.15 * Math.sin(t * 1.1), 0.12 * Math.sin(t * 0.7), 0); setFace(HP, { ...hm, look: hm.look ?? [0, 1] }); life(HP, t, 0.8);
      const holdUp = smooth(PUNCH - 0.3, PUNCH + 0.3, t); HP.armR.rotation.set(-0.3 - 0.75 * holdUp, 0, 0.25); HP.armL.rotation.set(-0.3 - 0.75 * holdUp, 0, -0.25);
      HP.group.updateMatrixWorld(true); HP.armR.userData.end.getWorldPosition(tv); HP.armL.userData.end.getWorldPosition(tv2); hBowl.position.copy(tv).add(tv2).multiplyScalar(0.5).add(v.set(0, 0.0, 0.0)); hBowl.visible = holdUp > 0.05; hBowl.rotation.set(0.5, 0, 0);
      out.inset = { scene: HC, camera: hcCam, x: 0.8, y: 0.205, r: 0.135, show: smooth(TBREAK + 0.8, TBREAK + 1.3, t), ring: '#ffd23f' }; }
    return out;
  }

  // ---------------- on-screen text ----------------
  const TXT = JSON.parse(`[
    "It's dinner time. Mittens is hungry. You stay on the couch.", "Real cats stop growing after about a year. Mittens just doubled.", "Twice as tall, wide and long means eight times heavier. Bye, couch.",
    "Almost five metres. She doesn't fit, so the roof comes off.", "Nearly ten metres. Your neighbour walks past with a birthday cake.", "Thirty-eight metres. Mittens found her dinner. It was the cake.",
    "A hundred and fifty metres. All because you stayed on the couch.", "Over a kilometre. Taller than any building. Her ears are in the clouds.", "Almost ten kilometres. Taller than Everest. Planes fly around her.",
    "A hundred and fifty kilometres. No air up there. Nobody hears her meow.", "Forty thousand kilometres. Now she's heavier than the whole Earth.", "Thirty-one doublings. Her head is past the Moon."]`);
  const LT = []; TXT.forEach((s, i) => LT.push([ST(i + 1) + 0.1, ST(i + 2) - 0.12, s])); LT.push([PUNCH + 0.05, ASK - 0.08, 'And she still wants her dinner.']);
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function italic(ctx, W, H, t, a, b, txt, y = 0.70, size = 50) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.2, (b - t) / 0.2));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * y + i * size * 1.28); ctx.fillText(l, W / 2, H * y + i * size * 1.28); }); ctx.restore(); }
  function tag(ctx, x, y, title, num, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x, y - 34, w, 68, 14); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 12, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 12, y + 16); ctx.restore(); }
  function proj(pos, camO) { tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1 || Math.abs(tv.x) > 1.05 || Math.abs(tv.y) > 1.05) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  function worldLabel(ctx, pos, title, num, camO, a = 1, ylim = [760, 1180]) { if (!pos || a <= 0) return; const p = proj(pos, camO); if (!p) return; const [x, y] = p;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26; const lx = clamp(x + 28, 24, 1080 - w - 24), ly = clamp(y, ylim[0], ylim[1]);
    if (Math.abs(ly - y) > 30) { ctx.beginPath(); ctx.moveTo(x, y + (ly > y ? 18 : -18)); ctx.lineTo(lx, ly); ctx.stroke(); }
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(lx, ly - 34, w, 68, 14); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, lx + 12, ly - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, lx + 12, ly + 16); ctx.restore(); }
  const win = (t, a, b) => smooth(a, a + 0.3, t) * (1 - smooth(b - 0.3, b, t));
  function fmtLen(m) { if (m < 1) return Math.round(m * 100) + ' cm'; if (m < 1000) return (m < 10 ? m.toFixed(1) : Math.round(m).toString()) + ' m'; const km = m / 1000; return (km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString('en-US')) + ' km'; }
  function fmtMass(kg) { if (kg < 1000) return Math.round(kg) + ' kg'; const t = kg / 1000; if (kg > 5.97e24) return 'heavier than Earth'; const u = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
    for (const [d, nm] of u) if (t >= d) { const v = t / d; return (v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US')) + ' ' + nm + ' tonnes'; } return (t < 10 ? t.toFixed(1) : Math.round(t).toLocaleString('en-US')) + ' tonnes'; }

  function hud(ctx, t, st) { const W = 1080, Hh = 1920;
    drawTitleTimed(ctx, W, Hh, [{ text: 'WHAT IF YOUR CAT DOUBLED IN SIZE', size: 70 }, { text: 'AND NEVER STOPPED?', size: 84, accent: true }], t, '#ffd23f', { start: 0.2, outAt: T1 - 0.35 });
    const n = st.n ?? 0; const ni = Math.floor(n + 1e-6); const yC = lerp(Hh * 0.268, Hh * 0.105, smooth(T1 - 0.4, T1 + 0.2, t));
    const bump = Math.max(0, ...Array.from({ length: NSTEP }, (_, i) => pulse(t, GROW_AT(i + 1) + 0.1, 0.4)));
    const space = n >= 19; drawSideCounter(ctx, W, Hh, { y: yC, label: `DOUBLING ${ni}`, value: fmtLen(hOf(n)), note: fmtMass(wOf(n)), color: space ? '#7dd3ff' : '#ffd23f', bump, glow: space ? '#7dd3ff' : '#ffd23f' });
    for (const [a, b, txt] of LT) italic(ctx, W, Hh, t, a, b, txt);
    // name tags (intro only)
    if (t < ST(2) && st.camera) { mit.updateMatrixWorld(true); MC.headPivot.getWorldPosition(tv2); const pm = proj([tv2.x, tv2.y + 0.25 * mit.scale.x, tv2.z], st.camera); if (pm) drawTag(ctx, pm[0], pm[1] - 30, 'MITTENS', t - 0.6, { dur: ST(2) - 0.8 });
      P.headPivot.getWorldPosition(tv2); const pp = proj([tv2.x, tv2.y + 0.45, tv2.z], st.camera); if (pp) drawTag(ctx, pp[0], pp[1] - 30, 'YOU', t - (T1 - 0.2), { dur: ST(2) - T1 + 0.1, bg: '#7dd3ff' }); }
    // labels with real numbers
    tag(ctx, 56, 640, 'LONGEST HOUSE CAT EVER', 'Stewie · 1.23 m nose to tail', win(t, ST(2) + 1.0, ST(3) - 0.15));
    if (t > ST(5) + 1.4 && t < ST(6) - 0.1) { nb.group.getWorldPosition(tv2); worldLabel(ctx, [tv2.x, tv2.y + 1.9, tv2.z], 'YOUR NEIGHBOUR', 'carrying a birthday cake', cam, win(t, ST(5) + 1.4, ST(6) - 0.1), [1120, 1190]); }
    if (t > ST(6) + 1.6 && t < ST(7) - 0.1) worldLabel(ctx, [-9.0, 1.9, 7.1], 'YOUR NEIGHBOUR', 'the cake is gone', cam, win(t, ST(6) + 1.6, ST(7) - 0.1), [1120, 1190]);
    tag(ctx, 56, 640, 'BURJ KHALIFA', '828 m · tallest building', win(t, ST(8) + 1.4, ST(9) - 0.15));
    tag(ctx, 56, 640, 'MOUNT EVEREST', '8,849 m', win(t, ST(9) + 1.2, ST(10) - 0.15));
    if (st.plane) worldLabel(ctx, st.plane, 'AIRLINER (drawn 50x bigger)', 'cruising at ~10 km', cam, win(t, ST(9) + 1.4, ST(10) - 0.2) * 0.9, [700, 1100]);
    if (t > ST(10) + 1.2 && t < CUT) worldLabel(ctx, [0, 100000, 0], 'KÁRMÁN LINE · 100 km', 'where space begins', cam, win(t, ST(10) + 1.2, CUT - 0.05), [760, 1100]);
    if (t > ST(12) + 1.0 && st.moon) worldLabel(ctx, st.moon, 'THE MOON (drawn bigger)', '384,400 km from Earth', camB, win(t, ST(12) + 1.0, PUNCH - 0.05), [760, 1110]);
    if (t > ST(11) + 0.8 && t < ST(12) - 0.1 && st.earth) worldLabel(ctx, st.earth, 'EARTH', '12,742 km wide', camB, win(t, ST(11) + 0.9, ST(12) - 0.1) * 0.95, [1480, 1580]);
    // ending: the narrator asks for ideas over the last shot (no black card)
    if (t >= ASK - 0.05) { const a = smooth(ASK - 0.05, ASK + 0.3, t); ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14;
      ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff'; ctx.font = `italic 600 50px ${FS}`; ctx.strokeText('What should we try next?', W / 2, Hh * 0.70); ctx.fillText('What should we try next?', W / 2, Hh * 0.70);
      ctx.fillStyle = '#ffd23f'; ctx.font = `800 32px ${FONT}`; ctx.strokeText('TELL US IN THE COMMENTS', W / 2, Hh * 0.70 + 66); ctx.fillText('TELL US IN THE COMMENTS', W / 2, Hh * 0.70 + 66); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
