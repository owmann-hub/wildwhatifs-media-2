import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, keys, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeCatCam, makeEarth, makeBurst, softTex, setFace, life, drawSideCounter, drawTitleTimed, RoundedBoxGeometry, stars, carGeos } from './lib.js';
import { makeStreetLife } from './streetlife.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 18 episode — RUNAWAY FORMAT (format_v5.rules[0]): "What if you folded a piece of paper in half and never stopped?"
// PLACE: a first-floor kitchen table in a European town house (new: not a plaza, not a bus stop). Late-afternoon golden light through French windows.
// STAKE: the sheet is your electricity bill — you were supposed to pay it. Punchline: it is now past the Sun and you still have to pay it.
// PROCESS: thickness = 0.1 mm x 2^n. 12 steps of 4.4 s, one continuous pull-back: table -> kitchen -> out of the window -> street ->
//          city -> country -> edge of space (same scene, ground curves, sky goes black) -> one cut -> Earth -> Moon -> Sun.
// CAST: THE UNBOTHERED PERSON (neighbour waters her balcony plants, never looks up), THE SALESMAN (T-shirts by fold 20). Mittens on the table + Mittens cam.
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
const backOut = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

// ---------------- timeline ----------------
const T1 = 3.2, STEP = 4.4, NSTEP = 12;
const ST = (k) => T1 + (k - 1) * STEP;                // start of step k (1..12)
const FOLDS = [0, 7, 10, 12, 14, 17, 20, 23, 27, 30, 37, 42, 51];
const PUNCH = ST(12) + STEP, CARDT = PUNCH + 2.4, TOT = CARDT + 6.2;   // 56.0, 58.4, 64.6
const CUT = ST(10);                                     // 42.8: cut from the ground scene to space
const thick = (n) => 1e-4 * Math.pow(2, n);              // metres
// fold count as a continuous value: in each step the folds happen one after another (crisp flips)
function foldF(t) {
  let f = 0;
  for (let k = 1; k <= NSTEP; k++) { const a = ST(k) + 0.25, n0 = FOLDS[k - 1], n1 = FOLDS[k], dn = n1 - n0, d = Math.min(0.34, 2.4 / dn);
    if (t < a) return n0; if (t < a + dn * d) { const x = (t - a) / d; const i = Math.floor(x); return n0 + i + easeInOut(x - i); } f = n1; }
  return f;
}
const foldTimes = []; for (let k = 1; k <= NSTEP; k++) { const n0 = FOLDS[k - 1], dn = FOLDS[k] - n0, d = Math.min(0.34, 2.4 / dn); for (let i = 0; i < dn; i++) foldTimes.push(ST(k) + 0.25 + (i + 0.5) * d); }
// footprint (metres) after n folds: A4 halves (alternating sides) until fold 5, then stays; drawn wider once it is tall (labelled)
function foot(n) { let w = 0.297, d = 0.21; for (let i = 0; i < Math.min(n, 5); i++) { if (i % 2 === 0) w /= 2; else d /= 2; } const h = thick(n), k = 0.05 * h; return [Math.max(w, k), Math.max(d, k * 0.75)]; }
export { foldF, foldTimes, ST, FOLDS, TOT, CARDT, PUNCH };

export async function create({ THREE, W, H }) {
  const R = rng(1118);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(45, W / H, 0.02, 4e7);
  const fogC = new THREE.Color(0xf3dcc0); A.fog = new THREE.FogExp2(fogC.getHex(), 0.0007);
  const hemi = new THREE.HemisphereLight(0xdce9ff, 0x9a8466, 0.95); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 3.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x7fb0ff, 1.2); rim.position.set(-300, 220, -260); A.add(rim);
  const SUN = new THREE.Vector3(0.62, 0.47, 0.62).normalize();   // ~28 degrees up, from the street side: warm light through the French windows
  function setShadow(cx, cy, cz, size) { sun.target.position.set(cx, cy, cz); sun.position.set(cx + SUN.x * size * 6, cy + SUN.y * size * 6, cz + SUN.z * size * 6); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = size * 0.5; c.far = size * 14; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 60 ? 1.5 : 0.02; }
  const sky = makeSkyDome(THREE, 0x6ea6e6, 0xffe6c4, [SUN.x, SUN.y, SUN.z]); A.add(sky); sky.scale.setScalar(3e7);
  const zen0 = new THREE.Color(0x6ea6e6), hor0 = new THREE.Color(0xffe6c4), zenS = new THREE.Color(0x030614), horS = new THREE.Color(0x1d4f9a), zenA = new THREE.Color(0x3f7fd0), horA = new THREE.Color(0xbcd6f0), fogA = new THREE.Color(0xa9c6e8);
  const starsA = stars(THREE, 2500, 2e7, 5); starsA.material.transparent = true; starsA.material.opacity = 0; starsA.renderOrder = -9; A.add(starsA);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3();

  // ---------------- builders ----------------
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, r);
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function signMat(text, bg, fg, w = 512, h = 112, font = FONT) { return new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = h * 0.56; g.font = `900 ${fs}px ${font}`; const mw = g.measureText(text).width; if (mw > w * 0.84) { fs *= w * 0.84 / mw; g.font = `900 ${fs}px ${font}`; } g.fillText(text, w / 2, h * 0.54); }) }); }
  const stripeMat = (a, b) => new THREE.MeshStandardMaterial({ roughness: 0.75, map: canvasTex(256, 64, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? a : b; g.fillRect(k * 32, 0, 32, 64); } g.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(k * 32 + 16, 64, 16, Math.PI, 0); g.fill(); } }) });

  // ---------------- European town houses (shutters, balconies, cornices, roofs, chimneys, painted shop signs) ----------------
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a4c, roughness: 0.12, metalness: 0.55, emissive: 0x1a1208, emissiveIntensity: 0.4 });
  const litM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.3, emissive: 0xffb860, emissiveIntensity: 0.9 });
  const shopGlassM = new THREE.MeshStandardMaterial({ color: 0xcfe2ea, roughness: 0.06, metalness: 0.4, emissive: 0x5a4020, emissiveIntensity: 0.55 });
  const iron = M(0x22262c, 0.5, 0.4);
  function balcony(B, trim, wx, by, plants, k) { B.add(RB(1.9, 0.14, 0.85, 0.03), trim, wx, by, 0.45); B.add(BX(1.9, 0.05, 0.05), iron, wx, by + 0.9, 0.85);
    for (let b = 0; b < 8; b++) B.add(BX(0.035, 0.85, 0.035), iron, wx - 0.9 + b * 0.257, by + 0.47, 0.85); B.add(BX(0.05, 0.85, 0.8), iron, wx - 0.93, by + 0.47, 0.45); B.add(BX(0.05, 0.85, 0.8), iron, wx + 0.93, by + 0.47, 0.45);
    if (plants) { B.add(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12), M(0xc9683f, 0.85), wx - 0.5, by + 0.21, 0.6); B.add(new THREE.SphereGeometry(0.2, 12, 10), M([0xff4f7a, 0xffd23f, 0x3f9a4a][k % 3], 0.7), wx - 0.5, by + 0.45, 0.6); } }
  function townhouse(x, z, ry, w, floors, o) {
    const g = new THREE.Group(); const B = Builder(); const D = 10, GF = 4.2, FH = 3.1, Hh = GF + floors * FH;
    const wall = M(o.wall, 0.82), trim = M(o.trim ?? 0xf6efe2, 0.7), shut = M(o.shut, 0.6);
    B.add(BX(w, Hh, D), wall, 0, Hh / 2, -D / 2);
    B.add(RB(w * 0.92, 3.5, 0.24), M(o.shopC, 0.6), 0, 1.75, 0.08);
    B.add(BX(w * 0.62, 2.3, 0.05), shopGlassM, -w * 0.1, 1.55, 0.23); B.add(RB(0.14, 2.5, 0.14), trim, -w * 0.43, 1.55, 0.26); B.add(RB(0.14, 2.5, 0.14), trim, w * 0.21, 1.55, 0.26);
    B.add(RB(w * 0.66, 0.14, 0.4), trim, -w * 0.1, 0.36, 0.3); B.add(RB(1.0, 2.3, 0.1), M(o.door ?? 0x6b3e1e, 0.5), w * 0.33, 1.3, 0.24);
    B.add(BX(w + 0.2, 0.22, 0.4), trim, 0, GF - 0.1, 0.12);
    const nW = w > 7.2 ? 3 : 2, sp = w / nW;
    for (let f = 0; f < floors; f++) { const y = GF + f * FH + FH * 0.52;
      for (let k = 0; k < nW; k++) { const wx = -w / 2 + sp * (k + 0.5); const lit = R() < 0.2;
        B.add(BX(1.25, 1.9, 0.06), trim, wx, y, 0.02); B.add(BX(1.0, 1.65, 0.05), lit ? litM : glassM, wx, y, 0.06); B.add(BX(0.06, 1.65, 0.05), trim, wx, y, 0.09);
        B.add(RB(1.45, 0.12, 0.3, 0.03), trim, wx, y - 1.0, 0.14);
        if (o.shutters !== false) { B.add(RB(0.48, 1.75, 0.07, 0.02), shut, wx - 0.9, y, 0.06, 0, 0.25 * (o.open ? 1 : 0)); B.add(RB(0.48, 1.75, 0.07, 0.02), shut, wx + 0.9, y, 0.06, 0, -0.25 * (o.open ? 1 : 0)); }
        if ((f + k + (o.bal ?? 0)) % 3 === 0 && f < floors - 1) balcony(B, trim, wx, y - 1.05, R() < 0.6, k); }
      if (f > 0) B.add(BX(w + 0.08, 0.16, 0.16), trim, 0, GF + f * FH, 0.06); }
    B.add(BX(w + 0.5, 0.42, 0.8), trim, 0, Hh + 0.1, 0.12); B.add(BX(w + 0.3, 0.2, 0.5), trim, 0, Hh - 0.22, 0.05);
    if (o.roof === 'mansard') { const rg = new THREE.CylinderGeometry(0.62, 1, 1, 4, 1).rotateY(Math.PI / 4); rg.scale(w / 1.414, 2.6, D / 1.414); B.add(rg, M(0x4a5468, 0.6), 0, Hh + 1.6, -D / 2);
      for (let k = 0; k < nW; k++) { const wx = -w / 2 + sp * (k + 0.5); B.add(RB(1.0, 1.3, 1.2), M(0xf6efe2, 0.7), wx, Hh + 1.2, 0.0); B.add(BX(0.7, 0.8, 0.05), glassM, wx, Hh + 1.15, 0.62); } }
    else { const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.25, 0); sh.lineTo(w / 2 + 0.25, 0); sh.lineTo(0, 2.6); sh.closePath(); const rg = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false }); rg.translate(0, 0, -D); B.add(rg, M(o.roofC ?? 0xb5523b, 0.85), 0, Hh + 0.3, 0.1); }
    B.add(RB(0.75, 1.9, 0.75), M(0x9a4a35, 0.9), w * 0.28, Hh + 1.6, -D * 0.55); B.add(BX(0.9, 0.15, 0.9), M(0x6b6b6b, 0.8), w * 0.28, Hh + 2.6, -D * 0.55);
    B.build(g);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, 0.78), signMat(o.name, o.signBg, o.signFg)); sg.position.set(0, 3.45, 0.22); g.add(sg);
    if (o.awn) { const aw = new THREE.Mesh(BX(w * 0.8, 0.07, 1.5), stripeMat(o.awn[0], o.awn[1])); aw.position.set(-w * 0.06, 2.85, 0.85); aw.rotation.x = 0.33; aw.castShadow = true; g.add(aw); }
    g.position.set(x, 0.15, z); g.rotation.y = ry; A.add(g); return g; }
  // west row (the hero's side, facades at x = -5 facing the street), east row (x = 25 facing west). Hero house sits at z -4.5..4.5.
  const walls = [0xe0a84a, 0xf2b8b0, 0xf1e3c4, 0xd0714f, 0xa9c8e0, 0x4fa39a, 0xd9b13b, 0xe9d2b0, 0xc98a6a, 0xb5523b, 0xf6d6a0, 0x9cc9b0];
  const shuts = [0x3f7d5a, 0x3a6ea5, 0x9a3b2f, 0xf6efe2, 0x1d3f6e, 0x7a2e2e];
  const shops = [['BAKERY OLA', '#ffd23f', '#5a2a10', ['#ffd23f', '#ffffff']], ['FARMACIA', '#1f8a4c', '#ffffff', null], ['LIBRERIA', '#6b3e1e', '#ffffff', ['#6b3e1e', '#f6efe2']], ['GELATO ROSA', '#ff5fa2', '#ffffff', ['#ff5fa2', '#ffffff']], ['CAFÉ LUNA', '#1f3d5a', '#ffe9a8', ['#1f3d5a', '#ffe9a8']],
    ['FIORI', '#f6efe2', '#2a6a5a', ['#ff7fb4', '#ffffff']], ['LAVANDERIA', '#ffffff', '#1d5f99', null], ['PIZZA NONNA', '#19a354', '#ffffff', ['#19a354', '#ffffff']], ['CARTOLERIA', '#3a7bd5', '#ffffff', ['#3a7bd5', '#ffffff']], ['MACELLERIA', '#8a2e3b', '#ffffff', ['#8a2e3b', '#ffffff']],
    ['TABACCHI', '#111111', '#ffffff', null], ['OTTICA', '#2a9d8f', '#ffffff', null], ['BICI & CO', '#e63946', '#ffffff', ['#e63946', '#ffd23f']], ['DOLCI', '#c86bff', '#ffffff', ['#c86bff', '#ffffff']]];
  let si = 0; const pickShop = () => shops[(si++) % shops.length];
  for (const [z0, z1, dir] of [[4.5, 70, 1], [-4.5, -70, -1]]) { let z = z0; let k = 0; while (Math.abs(z) < Math.abs(z1)) { const w = 7 + R() * 2; const zc = z + dir * w / 2; const s = pickShop();
      townhouse(-5, zc, Math.PI / 2, w, 3 + Math.floor(R() * 3), { wall: walls[(k * 5 + (dir > 0 ? 1 : 4)) % walls.length], shut: shuts[k % shuts.length], name: s[0], signBg: s[1], signFg: s[2], shopC: new THREE.Color(s[1]).getHex(), awn: s[3], roof: R() < 0.45 ? 'mansard' : 'pitch', bal: k % 3, open: k % 2 === 1 });
      z += dir * (w + 0.05); k++; } }
  { let z = -70; let k = 0; while (z < 70) { const w = 7 + R() * 2; const s = pickShop(); townhouse(25, z + w / 2, -Math.PI / 2, w, 3 + Math.floor(R() * 2), { wall: walls[(k * 7 + 3) % walls.length], shut: shuts[(k + 2) % shuts.length], name: s[0], signBg: s[1], signFg: s[2], shopC: new THREE.Color(s[1]).getHex(), awn: s[3], roof: R() < 0.5 ? 'mansard' : 'pitch', bal: (k + 1) % 3, open: k % 2 === 0 }); z += w + 0.05; k++; } }

  // ---------------- the hero's house: shop on the ground floor, the KITCHEN on the first floor behind open French windows ----------------
  const FL = 4.35, CEIL = 7.3, KX0 = -11.2, KX1 = -5.3, KZ = 4.2;
  { const g = new THREE.Group(); const B = Builder(); const wall = M(0xf2c9a0, 0.82), trim = M(0xf6efe2, 0.7), shut = M(0x3f7d5a, 0.6);
    B.add(BX(10, FL - 0.15, 10).translate(0, (FL - 0.15) / 2, 0), wall, -10, 0.15, 0);                      // ground floor mass
    B.add(BX(10, 13.65 - CEIL, 10).translate(0, (13.65 - CEIL) / 2, 0), wall, -10, CEIL, 0);                 // upper floors mass
    B.add(BX(10 - (KX1 - KX0) + 0.0, CEIL - FL, 10).translate(0, (CEIL - FL) / 2, 0), wall, -15 + (10 - (KX1 - KX0)) / 2, FL, 0);   // behind the kitchen
    B.add(BX(KX1 - KX0, CEIL - FL, 0.8).translate(0, (CEIL - FL) / 2, 0), wall, (KX0 + KX1) / 2, FL, KZ + 0.4); B.add(BX(KX1 - KX0, CEIL - FL, 0.8).translate(0, (CEIL - FL) / 2, 0), wall, (KX0 + KX1) / 2, FL, -KZ - 0.4);
    // facade of the kitchen floor with the opening (z -1.2..1.2, y 4.55..7.0) and two side windows
    const fx = -5.15, fw = 0.3; const seg = (z0, z1, y0, y1, m = wall) => B.add(BX(fw, y1 - y0, z1 - z0), m, fx, (y0 + y1) / 2, (z0 + z1) / 2);
    seg(-5, -4.0, FL, CEIL); seg(4.0, 5, FL, CEIL); seg(-2.4, -1.2, FL, CEIL); seg(1.2, 2.4, FL, CEIL); seg(-1.2, 1.2, FL, 4.55); seg(-1.2, 1.2, 7.0, CEIL);
    for (const zc of [-3.2, 3.2]) { seg(zc - 0.8, zc + 0.8, FL, 5.0); seg(zc - 0.8, zc + 0.8, 6.8, CEIL); B.add(BX(0.06, 1.8, 1.6), glassM, fx + 0.05, 5.9, zc); B.add(BX(0.1, 1.8, 0.06), trim, fx + 0.12, 5.9, zc);
      B.add(RB(0.48, 1.75, 0.07, 0.02), shut, fx + 0.28, 5.9, zc - 1.05, 0, Math.PI / 2 - 0.3); B.add(RB(0.48, 1.75, 0.07, 0.02), shut, fx + 0.28, 5.9, zc + 1.05, 0, Math.PI / 2 + 0.3); B.add(RB(0.3, 0.12, 1.7, 0.03), trim, fx + 0.12, 4.95, zc); }
    // French window frame, open doors, Juliet balcony
    B.add(RB(0.36, 0.14, 2.7), trim, fx + 0.03, 7.0, 0); B.add(RB(0.36, 2.5, 0.14), trim, fx + 0.03, 5.75, -1.27); B.add(RB(0.36, 2.5, 0.14), trim, fx + 0.03, 5.75, 1.27);
    for (const s of [-1, 1]) B.add(RB(0.07, 2.4, 0.62, 0.02), shut, fx + 0.33, 5.75, s * 1.62, 0, s * 0.35, 0);
    B.add(RB(0.7, 0.12, 2.6, 0.03), trim, fx + 0.35, FL + 0.18, 0); B.add(BX(0.05, 0.05, 2.5), iron, fx + 0.65, 5.25, 0); for (let b = 0; b < 11; b++) B.add(BX(0.035, 0.85, 0.035), iron, fx + 0.65, 4.85, -1.2 + b * 0.24);
    // upper floors + ground floor shop
    for (let f = 1; f < 3; f++) { const y = 4.2 + f * 3.1 + 1.6; for (const wz of [-3.0, 0, 3.0]) { B.add(BX(0.06, 1.9, 1.25), trim, fx + 0.14, y, wz); B.add(BX(0.05, 1.65, 1.0), f === 2 && wz === 3 ? litM : glassM, fx + 0.18, y, wz); B.add(RB(0.3, 0.12, 1.45, 0.03), trim, fx + 0.25, y - 1.0, wz);
      B.add(RB(0.07, 1.75, 0.48, 0.02), shut, fx + 0.2, y, wz - 0.9); B.add(RB(0.07, 1.75, 0.48, 0.02), shut, fx + 0.2, y, wz + 0.9); } B.add(BX(0.16, 0.16, 10.1), trim, fx + 0.2, 4.2 + f * 3.1, 0); }
    B.add(BX(0.8, 0.42, 10.5), trim, fx + 0.25, 13.75, 0); B.add(BX(0.4, 0.22, 10.2), trim, fx + 0.1, 4.12, 0);
    { const rg = new THREE.CylinderGeometry(0.62, 1, 1, 4, 1).rotateY(Math.PI / 4); rg.scale(10 / 1.414, 2.6, 10 / 1.414); B.add(rg, M(0x4a5468, 0.6), -10.15, 13.65 + 1.6, 0); for (const wz of [-2.8, 2.8]) { B.add(RB(1.2, 1.3, 1.0), trim, -5.5, 14.9, wz); B.add(BX(0.05, 0.8, 0.7), glassM, -4.88, 14.85, wz); } }
    B.add(RB(0.75, 1.9, 0.75), M(0x9a4a35, 0.9), -11, 16.2, -3); B.add(RB(0.75, 1.9, 0.75), M(0x9a4a35, 0.9), -11, 16.2, 2.5);
    B.add(RB(0.24, 3.5, 9.2), M(0x173d39, 0.6), fx + 0.12, 1.9, 0); B.add(BX(0.05, 2.3, 5.4), shopGlassM, fx + 0.26, 1.6, -1.4); B.add(RB(0.1, 2.3, 1.0), M(0x6b3e1e, 0.5), fx + 0.26, 1.3, 3.0);
    B.build(g); A.add(g);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.8), signMat('PANETTERIA', '#173d39', '#f2e3c6')); sg.position.set(fx + 0.27, 3.45, 0); sg.rotation.y = Math.PI / 2; A.add(sg);
    const aw = new THREE.Mesh(BX(1.5, 0.07, 6.5), stripeMat('#173d39', '#f2e3c6')); aw.position.set(fx + 0.95, 2.85, -0.6); aw.rotation.z = -0.33; aw.castShadow = true; A.add(aw); }

  // ---------------- the kitchen (pastel walls, wooden floor, warm lamp, coloured props) ----------------
  const TX = -7.3, TY = FL + 0.76, TZ = 0;       // table centre (top)
  const SX = -7.45, SZ = -0.05;                  // the paper stack
  { const B = Builder(); const g = new THREE.Group();
    const floorM = new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 512, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = `hsl(${28 + (i * 7) % 8}, 48%, ${44 + (i * 13) % 9}%)`; c.fillRect(0, i * 32, 512, 31); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect((i * 173) % 512, i * 32, 3, 32); } }) });
    floorM.map.wrapS = floorM.map.wrapT = THREE.RepeatWrapping; floorM.map.repeat.set(2, 3);
    const fl = new THREE.Mesh(BX(KX1 - KX0, 0.1, KZ * 2), floorM); fl.position.set((KX0 + KX1) / 2, FL - 0.05, 0); fl.receiveShadow = true; g.add(fl);
    B.add(BX(0.1, CEIL - FL, KZ * 2), M(0xa8dcc8, 0.9), KX0 - 0.05, (FL + CEIL) / 2, 0);                         // back wall mint
    B.add(BX(KX1 - KX0, CEIL - FL, 0.1), M(0xffd6e0, 0.9), (KX0 + KX1) / 2, (FL + CEIL) / 2, -KZ - 0.05);         // side walls peach
    B.add(BX(KX1 - KX0, CEIL - FL, 0.1), M(0xffd6e0, 0.9), (KX0 + KX1) / 2, (FL + CEIL) / 2, KZ + 0.05);
    B.add(BX(KX1 - KX0, 0.1, KZ * 2), M(0xfff6e8, 0.9), (KX0 + KX1) / 2, CEIL + 0.05, 0);                         // ceiling
    B.add(BX(0.12, 0.6, KZ * 2), M(0xf6efe2, 0.8), KX0 + 0.06, FL + 0.3, 0);                                       // skirting / dado
    // table + chairs
    const wood = M(0xc27a35, 0.55), wood2 = M(0x8a4a20, 0.6);
    B.add(RB(1.7, 0.07, 1.1, 0.03), wood, TX, TY - 0.035, TZ); for (const [dx, dz] of [[-0.75, -0.45], [0.75, -0.45], [-0.75, 0.45], [0.75, 0.45]]) B.add(RB(0.07, 0.72, 0.07, 0.02), wood2, TX + dx, FL + 0.36, TZ + dz);
    const chair = (x, z, ry, c) => { const cm = M(c, 0.6); B.add(RB(0.46, 0.06, 0.46, 0.02), cm, x, FL + 0.47, z); for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) B.add(RB(0.045, 0.47, 0.045, 0.015), wood2, x + dx, FL + 0.235, z + dz);
      B.add(RB(0.06, 0.55, 0.46, 0.02), cm, x - Math.cos(ry) * 0.22, FL + 0.78, z + Math.sin(ry) * 0.22); };
    chair(-6.2, 0.9, Math.PI, 0xff7f6a); chair(TX, -1.0, 0, 0x2bb3b1);
    // counter, cupboards, fridge, shelves, jars, plant, clock
    B.add(RB(0.65, 0.9, 3.2, 0.03), M(0xf6efe2, 0.6), KX0 + 0.35, FL + 0.45, -2.2); B.add(RB(0.7, 0.05, 3.3, 0.02), M(0x9aa3ad, 0.4, 0.2), KX0 + 0.36, FL + 0.92, -2.2);
    B.add(RB(0.4, 0.7, 3.2, 0.03), M(0x3a7bd5, 0.6), KX0 + 0.22, FL + 2.0, -2.2); for (let k = 0; k < 4; k++) B.add(new THREE.SphereGeometry(0.025, 8, 6), M(0xffd23f, 0.3, 0.5), KX0 + 0.43, FL + 1.85, -3.4 + k * 0.8);
    B.add(RB(0.7, 1.8, 0.75, 0.12), M(0xff9fb0, 0.45), KX0 + 0.4, FL + 0.9, 1.6); B.add(RB(0.04, 0.4, 0.04, 0.015), M(0xf6efe2, 0.4), KX0 + 0.77, FL + 1.25, 1.35);
    B.add(RB(0.3, 0.05, 1.8, 0.02), wood, KX0 + 0.15, FL + 1.55, 3.2); for (let k = 0; k < 5; k++) { B.add(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 14), M([0xffd23f, 0xff5fa2, 0x2bb3b1, 0xff8a3d, 0x7a4fd0][k], 0.4), KX0 + 0.15, FL + 1.68, 2.5 + k * 0.33); }
    B.add(new THREE.CylinderGeometry(0.14, 0.1, 0.22, 14), M(0xc9683f, 0.85), -5.55, FL + 0.35, 2.0); for (let k = 0; k < 5; k++) B.add(new THREE.SphereGeometry(0.12, 12, 10), M(k % 2 ? 0x4c9a3c : 0x5fae44, 0.85), -5.55 + (R() - 0.5) * 0.12, FL + 0.55 + k * 0.05, 2.0 + (R() - 0.5) * 0.15);
    B.add(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24).rotateZ(Math.PI / 2), M(0xffffff, 0.5), KX0 + 0.03, FL + 2.3, 1.0); B.add(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 24).rotateZ(Math.PI / 2), M(0xe63946, 0.5), KX0 + 0.01, FL + 2.3, 1.0);
    // table props: coffee mug (9.5 cm), fruit bowl, pen, glasses case
    B.add(new THREE.CylinderGeometry(0.042, 0.04, 0.095, 18), M(0xffd23f, 0.35), TX + 0.35, TY + 0.0475, 0.40); B.add(new THREE.TorusGeometry(0.025, 0.007, 8, 14).rotateY(Math.PI / 2), M(0xffd23f, 0.35), TX + 0.35, TY + 0.05, 0.45);
    B.add(new THREE.CylinderGeometry(0.038, 0.038, 0.005, 16), M(0x5a3015, 0.3), TX + 0.35, TY + 0.093, 0.40);
    B.add(new THREE.SphereGeometry(0.14, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(0x2bb3b1, 0.5), TX - 0.5, TY + 0.13, -0.42); for (const [dx, dz, c] of [[0, 0, 0xff4f4f], [0.07, 0.05, 0xffd23f], [-0.06, 0.05, 0xff8a3d], [0.02, -0.07, 0x7fd04f]]) B.add(new THREE.SphereGeometry(0.045, 14, 10), M(c, 0.5), TX - 0.5 + dx, TY + 0.13, -0.42 + dz);
    B.add(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8).rotateZ(Math.PI / 2), M(0x1d5f99, 0.4), TX + 0.1, TY + 0.006, 0.25);
    B.build(g); A.add(g);
    // pendant lamp (warm) + a warm interior light
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.24, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.6, side: THREE.DoubleSide })); shade.position.set(TX + 0.1, CEIL - 0.75, TZ + 0.55); A.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false })); bulb.position.set(TX + 0.1, CEIL - 0.84, TZ + 0.55); A.add(bulb);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.65, 6), M(0x222222, 0.5)); cord.position.set(TX + 0.1, CEIL - 0.32, TZ + 0.55); A.add(cord);
    const lampL = new THREE.PointLight(0xffc27a, 5.0, 9, 1.6); lampL.position.set(TX + 0.1, CEIL - 0.9, TZ + 0.55); A.add(lampL);
    const fillL = new THREE.PointLight(0xffe0c0, 3.0, 7, 1.5); fillL.position.set(-5.8, 6.2, 0.4); A.add(fillL); }

  // ---------------- the street: cobbles, pavements, lamps, trees, bunting, a mural; distant city + countryside + the sea ----------------
  { const cob = new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(512, 512, (g) => { g.fillStyle = '#6d6259'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = `hsl(${25 + (x * 7 + y * 13) % 12}, 14%, ${40 + ((x * 31 + y * 17) % 13)}%)`; g.beginPath(); g.roundRect(x * 32 + 2 + (y % 2) * 16, y * 32 + 2, 28, 28, 7); g.fill(); } }) });
    cob.map.wrapS = cob.map.wrapT = THREE.RepeatWrapping; cob.map.repeat.set(5, 36); const road = new THREE.Mesh(BX(20, 0.1, 150), cob); road.position.set(10, 0.05, 0); road.receiveShadow = true; A.add(road);
    const pav = new THREE.MeshStandardMaterial({ roughness: 0.85, map: canvasTex(256, 256, (g) => { g.fillStyle = '#d9cbb0'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = `hsl(${32 + (x * 7 + y * 13) % 9}, 28%, ${72 + ((x * 31 + y * 17) % 8)}%)`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); } }) });
    pav.map.wrapS = pav.map.wrapT = THREE.RepeatWrapping; pav.map.repeat.set(2, 60);
    for (const x of [-2.5, 22.5]) { const p = new THREE.Mesh(BX(5, 0.17, 150).translate(0, 0.085, 0), pav); p.position.set(x, 0, 0); p.receiveShadow = true; A.add(p); }
    const darkM = M(0x1d2a26, 0.5, 0.3);
    const lamp = (x, z) => { const g = new THREE.Group(); const B = Builder(); B.add(new THREE.CylinderGeometry(0.07, 0.12, 4.4, 14), darkM, 0, 2.2, 0); B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8).rotateZ(Math.PI / 2), darkM, x < 10 ? 0.3 : -0.3, 4.3, 0); B.build(g);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: 0.8 })); hd.position.set(x < 10 ? 0.6 : -0.6, 4.15, 0); g.add(hd); g.position.set(x, 0.17, z); A.add(g); };
    for (const z of [-48, -26, -9, 13, 31, 52]) { lamp(-0.6, z); lamp(20.6, z + 9); }
    const tree = (x, z) => { const g = new THREE.Group(); const B = Builder(); B.add(new THREE.CylinderGeometry(0.12, 0.18, 3.0, 10), M(0x6a4a30, 0.9), 0, 1.5, 0); for (let k = 0; k < 6; k++) B.add(new THREE.SphereGeometry(0.9 + R() * 0.35, 16, 12), M(k % 2 ? 0x4c9a3c : 0x6fb84a, 0.85), (R() - 0.5) * 1.2, 3.5 + R() * 0.9, (R() - 0.5) * 1.2); B.build(g); g.position.set(x, 0.17, z); A.add(g); };
    for (const z of [-58, -37, -18, 22, 41, 62]) tree(-1.0, z); for (const z of [-44, -16, 4, 25, 47]) tree(21.0, z);
    { const flagG = new THREE.ConeGeometry(0.2, 0.42, 3); const g = new THREE.Group(); for (const zb of [-14, 16]) for (let k = 0; k < 26; k++) { const x = -4.5 + k * 1.15, sag = 9.6 - 1.2 * Math.sin(Math.PI * k / 25); const f = new THREE.Mesh(flagG, M([0xff4f7a, 0xffd23f, 0x2bb3b1, 0x3a7bd5][k % 4], 0.6)); f.rotation.x = Math.PI; f.position.set(x, sag, zb); g.add(f); } A.add(g); }
    // benches + parked bikes on the east pavement
    for (const z of [-22, 8]) { const g = new THREE.Group(); const B = Builder(); for (let k = 0; k < 3; k++) B.add(RB(0.14, 0.06, 1.8, 0.02), M(0xc27a35, 0.6), -0.2 + k * 0.17, 0.48, 0); for (let k = 0; k < 2; k++) B.add(RB(0.05, 0.14, 1.8, 0.02), M(0xc27a35, 0.6), 0.3, 0.75 + k * 0.17, 0); B.add(RB(0.5, 0.48, 0.06, 0.02), darkM, 0, 0.24, 0.75); B.add(RB(0.5, 0.48, 0.06, 0.02), darkM, 0, 0.24, -0.75); B.build(g); g.position.set(23.6, 0.17, z); A.add(g); }
  }
  // city blocks out to ~2.5 km (warm town houses with pitched roofs), a business district of glass towers in the distance
  { const blk = [], roofs = [], towers = []; const pal = [0xe0a84a, 0xf2b8b0, 0xf1e3c4, 0xd0714f, 0xa9c8e0, 0x4fa39a, 0xd9b13b, 0xe9d2b0, 0xc98a6a, 0xf6d6a0];
    for (let x = -2600; x <= 2600; x += 64) for (let z = -2600; z <= 2600; z += 46) { const cx = x + 32 * ((Math.floor(z / 46) & 1) ? 0.4 : 0), cz = z; if (Math.hypot(cx, cz) > 2600 + R() * 300) continue; if (cx > -48 && cx < 70 && Math.abs(cz) < 110) continue; if (Math.hypot(cx - 10, cz) < 140) continue;
      if (Math.hypot(cx - 700, cz + 500) < 150) continue;   // a park
      const w = 46 + R() * 8, d = 30 + R() * 6, h = 13 + R() * 9; blk.push([cx, cz, w, d, h, pal[Math.floor(R() * pal.length)]]); roofs.push([cx, cz, w, d, h]); }
    for (let k = 0; k < 16; k++) { const a = -0.9 + R() * 0.7, r = 1700 + R() * 900; towers.push([Math.cos(a) * r * 0.6 - 300, -Math.abs(Math.sin(a)) * r - 600, 30 + R() * 25, 30 + R() * 25, 90 + R() * 170, [0x4a5f74, 0x6f8fa8, 0x55707f, 0x8aa6b8][k % 4]]); }
    const winM = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    winM.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOn = normal; vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp4 = instanceMatrix * wp4;\n#endif\nvWp = (modelMatrix * wp4).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn;').replace('#include <color_fragment>', `#include <color_fragment>
        if (abs(vOn.y) < 0.5) { float uu = abs(vOn.x) > 0.5 ? vWp.z : vWp.x; vec2 c = vec2(uu / 3.0, (vWp.y - 4.2) / 3.1); vec2 f = fract(c); vec2 id = floor(c); float hh = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
          float win = step(0.3, f.x) * step(f.x, 0.7) * step(0.2, f.y) * step(f.y, 0.78) * step(4.2, vWp.y); float lod = clamp(1.0 - max(fwidth(c.x), fwidth(c.y)) * 3.0, 0.0, 1.0);
          vec3 glass = mix(vec3(0.16, 0.2, 0.26), vec3(1.0, 0.82, 0.5), step(0.8, hh)); float sh2 = (step(0.17, f.x) * step(f.x, 0.29) + step(0.71, f.x) * step(f.x, 0.83)) * step(0.2, f.y) * step(f.y, 0.78) * step(4.2, vWp.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb * 0.75, glass, win) , (win + sh2 * 0.5) * lod); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.92, (1.0 - lod) * 0.5);
          if (vWp.y < 4.0) diffuseColor.rgb *= 0.8; }`); };
    const bGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const bM = new THREE.InstancedMesh(bGeo, winM, blk.length + towers.length); blk.concat(towers.map(([x, z, w, d, h, c]) => [x, z, w, d, h, c])).forEach(([x, z, w, d, h, c], k) => { m4.compose(v.set(x, 0.1, z), q.identity(), sc.set(w, h, d)); bM.setMatrixAt(k, m4); bM.setColorAt(k, col.set(c)); });
    bM.castShadow = bM.receiveShadow = true; A.add(bM);
    const rs = new THREE.Shape(); rs.moveTo(-0.5, 0); rs.lineTo(0.5, 0); rs.lineTo(0, 0.5); rs.closePath(); const rGeo = new THREE.ExtrudeGeometry(rs, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
    const rM = new THREE.InstancedMesh(rGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), roofs.length); roofs.forEach(([x, z, w, d, h], k) => { const alongX = w > d; m4.compose(v.set(x, 0.1 + h, z), q.setFromEuler(e.set(0, alongX ? Math.PI / 2 : 0, 0)), sc.set(alongX ? d : w, 7, alongX ? w : d)); rM.setMatrixAt(k, m4); rM.setColorAt(k, col.set([0xb5523b, 0xc8643a, 0x9a4a35, 0x4a5468][k % 4])); });
    rM.castShadow = true; A.add(rM); }
  // the ground: city floor, a park, fields, woods, a river, a coastline and the sea — curved like the planet so the horizon bends as we rise
  const RE_M = 6.371e6;
  const groundM = new THREE.MeshStandardMaterial({ roughness: 0.95, color: 0xffffff });
  groundM.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 wq = modelMatrix * vec4(transformed, 1.0); transformed.y -= dot(wq.xz, wq.xz) / (2.0 * 6.371e6); vWp = wq.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWp;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += vn(p) * a; p *= 2.03; a *= 0.5; } return s; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 p = vWp.xz; float d = length(p);
      // fields: patchwork cells that fade to a soft average far away
      vec2 cell = floor(p / vec2(420.0, 300.0)); float h = hs(cell); float lod = clamp(1.0 - fwidth(p.x) / 120.0, 0.0, 1.0);
      vec3 fA = vec3(0.42, 0.58, 0.2), fB = vec3(0.72, 0.66, 0.3), fC = vec3(0.3, 0.46, 0.16), fD = vec3(0.6, 0.5, 0.32);
      vec3 fld = h < 0.3 ? fA : h < 0.55 ? fB : h < 0.8 ? fC : fD; fld = mix(vec3(0.46, 0.55, 0.26), fld, lod * 0.9);
      float wood = smoothstep(0.55, 0.62, fbm(p / 5200.0)); fld = mix(fld, vec3(0.18, 0.34, 0.14), wood);
      float hills = fbm(p / 40000.0); fld *= 0.85 + 0.3 * hills; fld = mix(fld, vec3(0.62, 0.6, 0.55), smoothstep(0.66, 0.72, fbm(p / 90000.0 + 3.0)) * 0.6);
      vec3 cityC = mix(vec3(0.55, 0.5, 0.45), vec3(0.62, 0.56, 0.48), vn(p / 30.0));
      float cityR = 2700.0 + 500.0 * vn(p / 900.0);
      vec3 cc = mix(cityC, fld, smoothstep(cityR - 200.0, cityR + 300.0, d));
      cc = mix(cc, vec3(0.32, 0.6, 0.25), (1.0 - smoothstep(140.0, 160.0, length(p - vec2(700.0, -500.0)))));
      float rv = abs(p.y - 4200.0 - 2600.0 * sin(p.x / 7000.0) - 900.0 * sin(p.x / 1900.0)); cc = mix(cc, vec3(0.2, 0.42, 0.6), 1.0 - smoothstep(70.0, 110.0 + fwidth(p.x) * 1.5, rv));
      float coast = p.x - 90000.0 - 30000.0 * fbm(p / 60000.0) + 20000.0 * sin(p.y / 70000.0); cc = mix(cc, vec3(0.94, 0.88, 0.7), smoothstep(-2500.0, -500.0, coast)); cc = mix(cc, vec3(0.08, 0.36, 0.62), smoothstep(-300.0, 600.0, coast));
      diffuseColor.rgb = cc;`); };
  const groundG = new THREE.PlaneGeometry(1, 1, 400, 400).rotateX(-Math.PI / 2); { const p = groundG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z), k = Math.pow(r / 0.7071, 3.2) * 0.7071 / Math.max(r, 1e-9); p.setX(i, x * k * 2); p.setZ(i, z * k * 2); } }
  const ground = new THREE.Mesh(groundG, groundM); ground.scale.set(4.5e6, 1, 4.5e6); ground.position.y = 0.0; ground.receiveShadow = true; A.add(ground);
  // clouds (soft sprites, 1.5-3 km up)
  const cloudM = new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xfff6ea, transparent: true, opacity: 0.85, depthWrite: false, fog: true }); const clouds = [];
  for (let k = 0; k < 140; k++) { const a = R() * Math.PI * 2, r = 3500 + Math.pow(R(), 0.6) * 90000; const s = new THREE.Sprite(cloudM); s.position.set(Math.cos(a) * r, 650 + R() * 400, Math.sin(a) * r); s.scale.set(1800 + R() * 2200, 600 + R() * 500, 1); A.add(s); clouds.push(s); }

  // ---------------- people ----------------
  const P = makePerson(THREE, { shirt: 0x2bb3b1, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xffffff, seed: 5, hairStyle: 'short' }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const HX = -8.6, HZ = -0.05;
  const mittens = makeCat(THREE, 0xf0a040); mittens.rotation.order = 'YXZ'; mittens.scale.setScalar(0.62); A.add(mittens);
  const MX = -7.75, MZ = 0.36;
  const mc = makeCatCam(THREE, 0xf0a040, 0xffe3c4);
  // THE UNBOTHERED PERSON: the neighbour next door, watering her balcony plants, never looks up
  const nb = makePerson(THREE, { shirt: 0x7a4fd0, pants: 0xf2e3c6, hair: 0xd9d4cc, skin: 0xd8a47e, shoe: 0x3a2a1e, seed: 21, hairStyle: 'long' }); nb.group.rotation.order = 'YXZ'; A.add(nb.group);
  const NBX = -4.25, NBZ = 8.1, NBY = 4.35 + 0.15;
  const nbBal = new THREE.Group(); { const B = Builder(); const tr = M(0xf6efe2, 0.7); B.add(RB(1.3, 0.14, 2.6, 0.03), tr, 0, -0.07, 0); B.add(BX(0.05, 0.05, 2.6), iron, 0.62, 0.95, 0); for (let b = 0; b < 11; b++) B.add(BX(0.035, 0.95, 0.035), iron, 0.62, 0.47, -1.25 + b * 0.25);
    for (let k = 0; k < 4; k++) { B.add(new THREE.CylinderGeometry(0.15, 0.11, 0.26, 12), M(0xc9683f, 0.85), 0.35, 0.13, -1.0 + k * 0.62); B.add(new THREE.SphereGeometry(0.2, 12, 10), M([0xff4f7a, 0xffd23f, 0xff8a3d, 0xc86bff][k], 0.7), 0.35, 0.38, -1.0 + k * 0.62); }
    B.build(nbBal); nbBal.position.set(-4.5, NBY - 0.02, NBZ); A.add(nbBal); }
  const can = new THREE.Group(); { const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.18, 16), M(0x2bb3b1, 0.4, 0.2)); can.add(cb); const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.26, 8), cb.material); sp.rotation.z = -1.0; sp.position.set(0.15, 0.05, 0); can.add(sp); A.add(can); }
  const drops = makeBurst(THREE, 40, { seed: 4, origin: () => [0, 0, 0], dir: (r) => [0.4 + r() * 0.3, -0.2, (r() - 0.5) * 0.2], speed: [0.6, 1.0], life: [0.3, 0.6], delay: 0.5, gravity: 6, size: 3, color: 0x9fd8ff }); A.add(drops);
  // THE SALESMAN: T-shirts on the far pavement by fold 20
  const sm = makePerson(THREE, { shirt: 0xffd23f, pants: 0x1d1f24, hair: 0x2a1a10, skin: 0x8d5a3b, shoe: 0xe63946, seed: 9, hairStyle: 'bald' }); sm.group.rotation.order = 'YXZ'; A.add(sm.group);
  const SMX = 19.9, SMZ = -2.9;
  const shirtTex = canvasTex(256, 256, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#e63946'; g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.fillText('I SAW', 128, 98); g.fillText('THE BILL', 128, 150); g.font = `800 26px ${FONT}`; g.fillStyle = '#1d3f6e'; g.fillText('FOLD 20', 128, 196); });
  const tshirt = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.62), new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.8, side: THREE.DoubleSide })); A.add(tshirt);
  const rack = new THREE.Group(); { const B = Builder(); B.add(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), darkMat(), -0.7, 0.8, 0); B.add(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), darkMat(), 0.7, 0.8, 0); B.add(new THREE.CylinderGeometry(0.02, 0.02, 1.45, 8).rotateZ(Math.PI / 2), darkMat(), 0, 1.6, 0);
    for (let k = 0; k < 4; k++) B.add(RB(0.5, 0.6, 0.04, 0.02), M([0xffffff, 0xff5fa2, 0x2bb3b1, 0xffd23f][k], 0.8), -0.5 + k * 0.33, 1.25, 0.02 * k); B.build(rack); rack.position.set(SMX + 0.4, 0.17, SMZ - 1.6); rack.rotation.y = Math.PI / 2 - 0.3; A.add(rack); }
  function darkMat() { return M(0x2a2a2a, 0.5, 0.3); }
  const blobM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });
  const smBlob = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20).rotateX(-Math.PI / 2), blobM); smBlob.position.set(SMX, 0.19, SMZ); A.add(smBlob);
  // the lively street (dog walker, jogger, cyclist, kid with balloon, busker, van, phone call, coffee)
  const SL = makeStreetLife(THREE, A, { seed: 18, z: 0, dogX: -2.0, dogZ: 14, dogDir: -1, jogX: 22.6, jogZ: -30, bikeX: 2.2, bikeZ: -45, kidX: -3.4, kidZ: -7.5, kidDir: 1, musX: 23.6, musZ: 12, vanX: 18.2, vanZ: 24, phX: -3.5, phZ: 20, cofX: 22.0, cofZ: 4.5, balloonColor: 0xff4f7a, vanColor: 0xfdfbf5, vanStripe: 0x19a354, dogColor: 0xd9c38a });
  // driving cars (rounded, candy colours)
  const CG = carGeos(THREE); const carCols = [0xe63946, 0x2bb3b1, 0xffd23f, 0x3a7bd5, 0xfdfbf5, 0xff8a3d, 0x7a4fd0, 0x19a354];
  const carB = new THREE.InstancedMesh(CG.body, new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 }), 10), carT = new THREE.InstancedMesh(CG.top, new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.2, metalness: 0.5 }), 10);
  carB.castShadow = carT.castShadow = true; carB.frustumCulled = carT.frustumCulled = false; A.add(carB, carT);
  const cars = []; for (let k = 0; k < 10; k++) { const dir = k % 2 ? 1 : -1; cars.push({ x: dir > 0 ? 6.5 + (k % 4 > 1 ? 4 : 0) : 13.5 + (k % 4 > 1 ? -0 : 0), dir, z0: -75 + k * 17, sp: 7 + R() * 3 }); carB.setColorAt(k, col.set(carCols[k % carCols.length])); }
  // airliner (drawn bigger) that has to go around the stack
  const plane = new THREE.Group(); { const B = Builder(); const wh = M(0xf6f6f2, 0.35, 0.2), bl = M(0xe63946, 0.4);
    B.add(new THREE.CapsuleGeometry(2.0, 32, 8, 16).rotateZ(Math.PI / 2), wh, 0, 0, 0); B.add(RB(10, 0.5, 34, 0.2), M(0x1d5f99, 0.4), 0, -0.6, 0, 0, 0, 0); B.add(RB(3, 5, 0.6, 0.2), bl, -15, 3.5, 0); B.add(RB(4, 0.4, 13, 0.15), wh, -15, 0.5, 0);
    B.add(new THREE.CylinderGeometry(1.1, 1.1, 4, 14).rotateZ(Math.PI / 2), M(0x9aa3ad, 0.4, 0.5), 1, -1.8, 7); B.add(new THREE.CylinderGeometry(1.1, 1.1, 4, 14).rotateZ(Math.PI / 2), M(0x9aa3ad, 0.4, 0.5), 1, -1.8, -7); B.add(RB(28, 0.6, 0.2, 0.1), bl, 0, 0.4, 2.02); B.add(RB(28, 0.6, 0.2, 0.1), bl, 0, 0.4, -2.02); B.build(plane);
    plane.scale.setScalar(6); A.add(plane); }

  // ---------------- the paper ----------------
  const paperTex = canvasTex(64, 256, (g) => { g.fillStyle = '#efe6d4'; g.fillRect(0, 0, 64, 256); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(170,160,140,0.55)' : 'rgba(200,190,170,0.35)'; g.fillRect(0, i * 16 + 14, 64, 2); } });
  paperTex.wrapS = paperTex.wrapT = THREE.RepeatWrapping;
  const paperM = new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.7, emissive: 0xfff4e0, emissiveIntensity: 0.03 });
  const billTex = canvasTex(512, 724, (g, w, h) => { g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#e63946'; g.fillRect(0, 0, w, 90); g.fillStyle = '#fff'; g.font = `900 46px ${FONT}`; g.fillText('ELECTRIC BILL', 30, 62); g.fillStyle = '#333'; g.font = `700 30px ${FONT}`;
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(60,60,60,0.35)'; g.fillRect(30, 140 + i * 42, 300 + (i * 53) % 150, 14); } g.fillStyle = '#111'; g.font = `900 40px ${FONT}`; g.fillText('PLEASE PAY', 30, 600); g.fillStyle = '#e63946'; g.font = `900 64px ${FONT}`; g.fillText('€ 84.20', 250, 680); });
  const billM = new THREE.MeshStandardMaterial({ map: billTex, roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.05 });
  const boxG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); const flapG = new THREE.BoxGeometry(1, 1, 1).translate(0.5, -0.5, 0); const flapGz = new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0.5);
  const base = new THREE.Mesh(boxG, paperM); base.castShadow = base.receiveShadow = true; A.add(base);
  const hinge = new THREE.Group(); A.add(hinge); const flapX = new THREE.Mesh(flapG, paperM), flapZ = new THREE.Mesh(flapGz, paperM); flapX.castShadow = flapZ.castShadow = true; hinge.add(flapX, flapZ);
  const billTop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), billM); A.add(billTop);
  const roofBurst = makeBurst(THREE, 90, { seed: 3, origin: (r) => [SX + (r() - 0.5) * 0.4, 15.8, SZ + (r() - 0.5) * 0.4], dir: (r) => { const a = r() * 6.28; return [Math.cos(a) * 0.6, 0.6 + r() * 0.6, Math.sin(a) * 0.6]; }, speed: [3, 7], life: [0.8, 1.6], gravity: 9.8, size: 5, color: 0x9a4a35, opacity: 1, square: true });
  A.add(roofBurst);
  const tStack = { h: 0, w: 0, d: 0, top: 0 };
  function placeStack(t, tgt) {
    const f = foldF(t); const n = Math.floor(f + 1e-6), u = clamp(f - n); const BY = TY + 0.001;
    const [w1, d1] = foot(n + 1); const h = thick(n); const axisX = n % 2 === 0;
    let a, c;
    if (u < 1e-4) { const [w0, d0] = foot(n); base.scale.set(w0, h, d0); base.position.set(SX, BY, SZ); hinge.visible = false; tStack.h = h; tStack.w = w0; tStack.d = d0; }
    else { hinge.visible = true; a = axisX ? w1 : d1; c = a / 2 * u; const off = -a / 2 + c;
      base.scale.set(w1, h, d1); base.position.set(SX + (axisX ? off : 0), BY, SZ + (axisX ? 0 : off));
      hinge.position.set(SX + (axisX ? c : 0), BY + h, SZ + (axisX ? 0 : c)); flapX.visible = axisX; flapZ.visible = !axisX;
      if (axisX) { flapX.scale.set(a, h, d1); hinge.rotation.set(0, 0, Math.PI * u); } else { flapZ.scale.set(w1, h, a); hinge.rotation.set(-Math.PI * u, 0, 0); }
      tStack.h = h * (1 + Math.sin(Math.PI * u) * 0.0) + h * u; tStack.w = w1; tStack.d = d1; }
    const layers = Math.min(Math.pow(2, n), 48); paperTex.repeat.set(1, Math.max(0.12, layers / 16));
    const bv = n < 2; billTop.visible = bv; if (bv) { const [w0, d0] = foot(n); billTop.scale.set(u > 0 ? w1 : w0, 1, u > 0 ? d1 : d0); billTop.position.set(base.position.x, BY + h + 0.0006, base.position.z); }
    tStack.top = BY + thick(n) * (1 + u); tStack.f = f; tStack.n = n; tStack.u = u;
  }

  // ---------------- SPACE (km): Earth, the Moon, the Sun, the paper going past all of them ----------------
  const B = new THREE.Scene(); B.background = new THREE.Color(0x01020a); const camB = new THREE.PerspectiveCamera(42, W / H, 10, 2e9);
  B.add(stars(THREE, 5000, 1.5e9, 17)); B.add(new THREE.AmbientLight(0x4a5468, 0.6));
  const RE = 6371; const earthB = makeEarth(THREE, RE, 18); B.add(earthB);
  const U = new THREE.Vector3(0.25, 0.92, -0.3).normalize();                     // "up" at the kitchen table
  const V = new THREE.Vector3().crossVectors(U, new THREE.Vector3(0, 0, 1)).normalize(); const Wv = new THREE.Vector3().crossVectors(U, V).normalize();
  const sunDirB = U.clone().multiplyScalar(1.496e8).addScaledVector(V, 4.0e6);        // the column passes ~4 million km beside the Sun
  const sunB = new THREE.DirectionalLight(0xfff3e0, 3.2); sunB.position.copy(sunDirB.clone().normalize().multiplyScalar(1e6)).addScaledVector(Wv, 3e5); B.add(sunB);
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(696000, 48, 32), new THREE.MeshBasicMaterial({ color: 0xfff1c0, toneMapped: false })); sunMesh.position.copy(sunDirB); B.add(sunMesh);
  const glowM = new THREE.SpriteMaterial({ map: softTex(THREE, 256), color: 0xffc860, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }); const sunGlow = new THREE.Sprite(glowM); sunGlow.position.copy(sunDirB); B.add(sunGlow);
  const moonPos = U.clone().multiplyScalar(384400).addScaledVector(V, -9000).addScaledVector(Wv, 4000);
  const moonTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#b9b4ac'; g.fillRect(0, 0, w, h); const r = rng(4); for (let k = 0; k < 260; k++) { const x = r() * w, y = r() * h, s = 2 + r() * r() * 22; g.fillStyle = `rgba(${90 + r() * 40},${88 + r() * 40},${84 + r() * 40},${0.35 + r() * 0.4})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1737, 64, 32), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95 })); moon.position.copy(moonPos); B.add(moon);
  const markM = new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0x8fc8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }); const earthGlow = new THREE.Sprite(markM); B.add(earthGlow);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xe8e4dc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })); moonGlow.position.copy(moonPos); B.add(moonGlow);
  const paperB = new THREE.MeshStandardMaterial({ map: paperTex.clone(), roughness: 0.7, emissive: 0xfff4e0, emissiveIntensity: 0.55 }); paperB.map.wrapS = paperB.map.wrapT = THREE.RepeatWrapping; paperB.map.needsUpdate = true;
  const colB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), paperB); colB.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), U); colB.position.copy(U).multiplyScalar(RE - 5); B.add(colB);
  const colGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xfff2d8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 })); B.add(colGlow);

  await document.fonts.ready;

  // ---------------- camera: one continuous pull-back (look target, direction, log distance) ----------------
  // [t, look xyz, azimuth (deg, around y from +x), elevation (deg), distance, fov]
  const CK = [
    [0.0, [-7.7, 5.45, 0.22], 8, 14, 2.15, 42], [T1, [-7.6, 5.38, 0.12], 12, 20, 1.6, 42], [ST(2), [-7.6, 5.4, 0.1], 10, 17, 1.75, 42], [ST(3), [-7.6, 5.45, 0.0], 8, 14, 2.0, 44],
    [ST(4), [-7.6, 5.75, 0.0], 5, 7, 2.4, 48], [ST(5) + 0.4, [-7.5, 6.1, 0.1], 3, 4, 2.6, 52], [ST(5) + 1.0, [-7.5, 6.3, 0.1], 2, 1, 4.6, 52], [ST(5) + 2.0, [-7.0, 11.5, 0.2], 1, 2, 11.0, 52], [ST(5) + 3.4, [-6.0, 12.0, -0.5], 1, -12, 24.0, 56], [ST(6), [-4.0, 9.0, -4.5], 4.6, -14.2, 28.6, 62], [ST(6) + 1.4, [-4.0, 10.0, -4.4], 4.4, -15.5, 28.6, 62],
    [ST(6) + 2.6, [-6.0, 30.0, -2.0], 3, 3, 31.0, 56], [ST(7), [-6, 55, 0], 18, 4, 150, 52], [ST(8), [-5, 430, 0], 32, 12, 1500, 50], [ST(9), [0, 6900, 0], 40, 14, 23000, 48],
    [ST(10), [0, 56000, 0], 45, 12, 200000, 46], [CUT, [0, 60000, 0], 46, 12, 230000, 46]];
  const sp = (a, b, c, d, u) => { const u2 = u * u, u3 = u2 * u; return 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); };
  const slog = (y) => Math.sign(y) * Math.log(1 + Math.abs(y)), sexp = (y) => Math.sign(y) * (Math.exp(Math.abs(y)) - 1);
  function camAt(K, t) { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[i + 1], k3 = K[Math.min(K.length - 1, i + 2)]; const u = clamp((t - k1[0]) / (k2[0] - k1[0]));
    const S = (f) => sp(f(k0), f(k1), f(k2), f(k3), u);
    const look = [S(k => k[1][0]), sexp(S(k => slog(k[1][1]))), S(k => k[1][2])]; const az = S(k => k[2]) * Math.PI / 180, el = S(k => k[3]) * Math.PI / 180, dist = Math.exp(S(k => Math.log(k[4]))), fov = S(k => k[5]);
    const pos = [look[0] + Math.cos(el) * Math.cos(az) * dist, look[1] + Math.sin(el) * dist, look[2] + Math.cos(el) * Math.sin(az) * dist]; return { pos, look, fov, dist }; }
  // space keyframes (km): [t, look (along U, km from Earth centre), side offset factor, distance, fov]
  const BK = [[CUT, 6371 + 6000, 0, 3.4e4, 44], [ST(11), 6371 + 9000, 0, 6.5e4, 44], [ST(11) + 1.6, 2.2e5, 0, 6.0e5, 44], [ST(12), 3.2e5, 0, 8.0e5, 44], [ST(12) + 1.8, 2.0e7, 0, 6.0e7, 44], [PUNCH, 1.0e8, 0, 3.0e8, 44], [CARDT, 1.1e8, 0, 3.4e8, 44]];
  function camB_at(t) { let i = 0; while (i < BK.length - 2 && t > BK[i + 1][0]) i++; const k0 = BK[Math.max(0, i - 1)], k1 = BK[i], k2 = BK[i + 1], k3 = BK[Math.min(BK.length - 1, i + 2)]; const u = clamp((t - k1[0]) / (k2[0] - k1[0]));
    const S = (f) => sp(f(k0), f(k1), f(k2), f(k3), u); const L = Math.exp(S(k => Math.log(k[1]))), D = Math.exp(S(k => Math.log(k[3]))), fov = S(k => k[4]);
    const look = U.clone().multiplyScalar(L); const dir = V.clone().multiplyScalar(-0.93).addScaledVector(Wv, 0.25).addScaledVector(U, -0.27).normalize(); return { pos: look.clone().addScaledVector(dir, D), look, fov, D }; }

  function walkPose(Q, ph, amp) { Q.legL.rotation.set(Math.sin(ph) * 0.55 * amp, 0, -0.04); Q.legR.rotation.set(-Math.sin(ph) * 0.55 * amp, 0, 0.04); Q.armL.rotation.set(-Math.sin(ph) * 0.45 * amp, 0, -0.1); Q.armR.rotation.set(Math.sin(ph) * 0.45 * amp, 0, 0.1); Q.group.position.y += Math.abs(Math.cos(ph)) * 0.05 * amp; }
  // Mittens' running reaction, one mood per step
  const MOODS = ['sleepy', 'unimpressed', 'annoyed', 'shock', 'unimpressed', 'scared', 'annoyed', 'smug', 'shock', 'sleepy', 'scared', 'smug', 'shock'];
  const stepOf = (t) => t < T1 ? 0 : Math.min(NSTEP, 1 + Math.floor((t - T1) / STEP));

  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.3, bloomThreshold: 0.9, shake: 0, flash: 0, t, env: 0.45, exposure: 1.18, sat: 1.28 };
    const k = stepOf(t); out.step = k;
    placeStack(t, out); out.f = tStack.f; out.top = tStack.top;
    const f = tStack.f; const big = smooth(16.5, 20.5, f);    // 0 at table scale -> 1 once it leaves the house
    // ---- you: seated, folding; proud; stand up in shock at fold 14; at the window afterwards ----
    { const G = P.group; const stand = smooth(ST(4) + 0.9, ST(4) + 1.6, t); const lean = smooth(ST(5) + 0.4, ST(5) + 1.2, t);
      G.position.set(HX + 0.25 * stand, FL - 0.3 * (1 - stand), HZ); G.rotation.set(0, Math.PI / 2, 0);
      P.legL.rotation.set(-1.45 * (1 - stand), 0, -0.05); P.legR.rotation.set(-1.45 * (1 - stand), 0, 0.05);
      const fl = foldTimes.reduce((m, ft) => Math.max(m, pulse(t, ft - 0.15, 0.4)), 0);
      let aL = [-1.05 - 0.25 * fl, 0, -0.15], aR = [-1.0, 0, 0.18 + 0.1 * fl], head = [0.35, 0, 0], face = { brows: 'squint', eyes: 0.85, mouth: 'flat', look: [0, -0.8] };
      if (t < T1) { aL = [-0.9, 0, -0.1]; aR = [-0.95, 0, 0.1]; head = [0.3, 0.1 * Math.sin(t * 1.4), 0]; face = { brows: 'neutral', eyes: 0.9, mouth: 'flat', look: [0, -0.8] }; }
      else if (t < ST(3)) face = { brows: 'squint', eyes: 0.8, mouth: 'smile', look: [0, -0.8] };
      else if (t < ST(4) + 0.9) { face = { brows: 'up', eyes: 1.05, mouth: 'smile', look: [0, -0.3] }; head = [0.1, 0, 0]; }
      else { const up = smooth(ST(4) + 0.6, ST(4) + 1.4, t); face = { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.6, look: [0, 0.6] }; head = [lerp(0.1, -0.45, up), 0, 0]; aL = [lerp(-1.05, -0.4, up), 0, -0.5 * up]; aR = [lerp(-1.0, -0.4, up), 0, 0.5 * up]; }
      if (lean > 0) { head = [-0.6, 0, 0]; aL = [-2.6 * lean, 0, -0.3]; aR = [-0.3, 0, 0.6]; }
      P.armL.rotation.set(...aL); P.armR.rotation.set(...aR); P.headPivot.rotation.set(...head); P.torso.rotation.set(0.12 * (1 - stand), 0, 0); setFace(P, face); life(P, t, 0.7); }
    // ---- Mittens (on the table) ----
    const mood = t >= CARDT ? 'happy' : t >= PUNCH ? 'smug' : MOODS[k];
    { const look = k >= 4 ? smooth(ST(4), ST(4) + 0.6, t) : 0; mittens.position.set(MX, TY, MZ); mittens.rotation.set(-0.35 * look, Math.PI / 2 + 0.5 - 0.6 * (k === 2 ? 1 : 0), 0);
      if (k === 3) { const sw = pulse(t, ST(3) + 2.0, 0.5); mittens.userData.cat.legs[3].rotation.x = -2.0 * Math.sin(Math.PI * sw); }
      setCatFace(mittens, mood, 0.25); catLife(mittens, t, 1); }
    mc.update(t, mood);
    // ---- the neighbour waters her plants (never looks up) ----
    { const ph = (t * 0.25) % 1, zz = NBZ - 1.0 + (ph < 0.5 ? ph * 2 : 2 - ph * 2) * 2.0; nb.group.position.set(NBX, NBY, zz); nb.group.rotation.set(0, Math.PI / 2, 0); nb.armR.rotation.set(-1.15, 0, -0.2); nb.armL.rotation.set(-0.3, 0, 0.1); nb.headPivot.rotation.set(0.35, 0, 0);
      setFace(nb, { brows: 'neutral', eyes: 0.6, mouth: 'smile', look: [0, -0.7] }); life(nb, t, 0.8); nb.group.updateMatrixWorld(true); nb.armR.userData.end.getWorldPosition(tv); can.position.copy(tv).add(v.set(0.12, -0.05, 0)); can.rotation.set(0, -Math.PI / 2 * 0 + 0, -0.5 - 0.15 * Math.sin(t * 3));
      drops.position.copy(can.position).add(v.set(0.25, -0.05, 0)); drops.userData.update(t, Math.floor(t / 1.2) * 1.2); }
    // ---- the salesman (arrives with his rack by fold 18, waves a T-shirt) ----
    { const on = t > ST(5) + 2.0; sm.group.visible = rack.visible = tshirt.visible = smBlob.visible = on; if (on) { const wave = Math.sin(t * 5) * 0.25;
      sm.group.position.set(SMX, 0.17, SMZ); sm.group.rotation.set(0, Math.PI / 2 - 0.15, 0); sm.armR.rotation.set(-1.25 + wave * 0.3, 0, 0.15); sm.armL.rotation.set(-1.2 - wave * 0.2, 0, -0.15); sm.headPivot.rotation.set(-0.15, 0.3 * Math.sin(t * 1.3), 0);
      setFace(sm, { brows: 'up', eyes: 1.1, mouth: 'open', open: 1.2, look: [0.3, 0.2] }); life(sm, t, 0.8); sm.group.updateMatrixWorld(true); sm.armR.userData.end.getWorldPosition(tv); sm.armL.userData.end.getWorldPosition(tv2);
      tshirt.position.copy(tv).add(tv2).multiplyScalar(0.5).add(v.set(0.08, -0.12, 0)); tshirt.rotation.set(0, Math.PI / 2 - 0.15, 0); } }
    // ---- street life + cars ----
    SL.update(t, { look: smooth(ST(5) + 2.2, ST(5) + 3.2, t), stop: 0 });
    cars.forEach((c, i) => { const z = wrap(c.z0 + c.dir * c.sp * t, -80, 80); m4.compose(v.set(c.x, 0.1, z), q.setFromEuler(e.set(0, c.dir > 0 ? 0 : Math.PI, 0)), sc.set(1, 1, 1)); carB.setMatrixAt(i, m4); carT.setMatrixAt(i, m4); }); carB.instanceMatrix.needsUpdate = carT.instanceMatrix.needsUpdate = true;
    roofBurst.userData.update(t, foldTimes[16] - 0.05);
    // ---- the airliner swerves around it (placed between the camera and the stack at cruising height) ----
    const planeT = clamp((t - ST(8) - 0.6) / 3.4); plane.visible = t > ST(8) + 0.5 && t < ST(9) - 0.2;
    // ---- sky: golden afternoon -> black space with stars as we pass 100 km ----
    const sp_ = smooth(ST(9) - 1.0, ST(10) - 0.8, t); const ah = t < CUT ? smooth(700, 15000, camAt(CK, t).dist) : 1;
    sky.material.uniforms.zen.value.copy(zen0).lerp(zenA, ah).lerp(zenS, sp_); sky.material.uniforms.hor.value.copy(hor0).lerp(horA, ah).lerp(horS, sp_ * 0.85); starsA.material.opacity = sp_;

    // ---------------- camera ----------------
    let scene = A, camera = cam, dof = 0.32, focusY = 0.56, focusH = 0.22;
    if (t < CUT) {
      const C = camAt(CK, t); cam.position.set(...C.pos); cam.lookAt(...C.look); cam.fov = C.fov; cam.updateProjectionMatrix(); out.camPos = C.pos; out.dist = C.dist;
      if (plane.visible) { const cp = new THREE.Vector3(...C.pos), tg = new THREE.Vector3(0, C.look[1] + 0.32 * C.dist * Math.tan(C.fov * Math.PI / 360), 0); const fw = tg.clone().sub(cp).normalize(), rt = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize();
        const u = planeT, lat = lerp(-1, 1, u), bulge = Math.sin(Math.PI * u); const dd = cp.distanceTo(tg);
        plane.position.copy(cp).lerp(tg, 0.72 - 0.12 * bulge).addScaledVector(rt, lat * dd * 0.16); const hd = rt.clone().multiplyScalar(1).addScaledVector(fw, -1.4 * Math.cos(Math.PI * u)).normalize();
        plane.rotation.set(0, Math.atan2(-hd.z, hd.x), 0); plane.rotateX(0.5 * Math.sin(Math.PI * u)); plane.scale.setScalar(dd * 0.0009); out.plane = plane.position.toArray(); }
      const D = C.dist; A.fog.density = 0.6 / (D + 900) * (1 - 0.8 * sp_) * (1 - 0.55 * ah); A.fog.color.copy(fogC).lerp(fogA, ah).lerp(new THREE.Color(0x5f86c0), sp_);
      clouds.forEach(s => s.visible = D > 300); cloudM.opacity = 0.7 * smooth(300, 1500, D);
      if (D < 6) setShadow(-7.5, 5, 0, 9); else setShadow(C.look[0], Math.min(C.look[1], 20), C.look[2], clamp(D * 0.9, 9, 2500));
      dof = D < 40 ? 0.34 : lerp(0.3, 0.0, smooth(40, 2000, D)); focusY = 0.52; focusH = D < 3 ? 0.2 : 0.32;
      out.exposure = D < 6 ? 1.04 : lerp(lerp(1.18, 1.07, ah), 1.1, sp_); out.sat = 1.28 + 0.12 * ah;
    } else {
      scene = B; camera = camB; dof = 0; out.env = 0; out.bloom = 0.75; out.bloomThreshold = 0.6; out.exposure = 1.1; out.vignette = 0.45;
      const C = camB_at(t); camB.position.copy(C.pos); camB.lookAt(C.look); camB.fov = C.fov; camB.updateProjectionMatrix();
      const L = thick(f) / 1000; const wv = Math.max(0.035 * L * 0.3, C.D * 0.0042); colB.scale.set(wv, L, wv); paperB.map.repeat.set(1, 40);
      const tip = U.clone().multiplyScalar(RE + L); colGlow.position.copy(tip); colGlow.scale.setScalar(C.D * 0.05);
      earthGlow.position.set(0, 0, 0); earthGlow.scale.setScalar(Math.max(RE * 3.2, C.D * 0.035)); markM.opacity = 0.75 * smooth(2e5, 1e6, C.D);
      moonGlow.scale.setScalar(Math.max(1737 * 3, C.D * 0.05)); moon.scale.setScalar(Math.max(1, C.D * 0.014 / 1737)); sunGlow.scale.setScalar(Math.max(696000 * 7, C.D * 0.16));
      out.tip = tip.toArray(); out.moon = moonPos.toArray(); out.sun = sunDirB.toArray(); out.earth = [0, 0, 0]; out.D = C.D;
    }
    out.scene = scene; out.camera = camera; out.dof = dof; out.focusY = focusY; out.focusH = focusH;
    out.flash = 0.45 * pulse(t, CUT, 0.4) + 0.12 * pulse(t, foldTimes[16], 0.25); out.shake = 0.35 * pulse(t, foldTimes[16], 0.5);
    out.inset = { scene: mc.scene, camera: mc.camera, x: 0.8, y: 0.205, r: 0.14, show: smooth(T1 - 0.3, T1 + 0.2, t) * (1 - smooth(CARDT - 0.2, CARDT + 0.2, t)) };
    return out;
  }

  // ---------------- on-screen text ----------------
  const LT = [[0.25, T1 - 0.1, 'This is your electricity bill. You were supposed to pay it.']];
  const TXT = ['Instead, you fold it in half. Seven times.', 'Ten folds. Taller than your coffee mug.', 'Twelve. In real life, that took a kilometre of toilet paper.', "Fourteen. It's as tall as you are. Mittens is not impressed.",
    'Seventeen. Through the ceiling. The neighbours upstairs have questions.', "Twenty. A hundred metres. Someone's already selling T-shirts.", 'Twenty-three. Taller than the Burj Khalifa. This is your fault.',
    'Twenty-seven. Thirteen kilometres. Planes have to go around it.', 'Thirty folds. Your electricity bill is now in space.', "Thirty-seven. It's taller than the whole Earth is wide.", 'Forty-two. It just went past the Moon.', 'Fifty-one folds. It goes past the Sun.'];
  TXT.forEach((s, i) => LT.push([ST(i + 1) + 0.15, ST(i + 2) - 0.15, s]));
  LT.push([PUNCH + 0.1, CARDT - 0.1, 'And no. You still have to pay it.']);
  const CARD_LINE = [CARDT + 0.4, TOT - 0.6, "Keep going to 103 folds, and it's thicker than the observable universe."];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function italic(ctx, W, H, t, a, b, txt, y = 0.70) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.25, (b - t) / 0.25));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 50px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * y + i * 64); ctx.fillText(l, W / 2, H * y + i * 64); }); ctx.restore(); }
  function tag(ctx, x, y, title, num, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x, y - 34, w, 68, 14); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 12, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 12, y + 16); ctx.restore(); }
  function worldLabel(ctx, pos, title, num, camO, a = 1) { if (!pos || a <= 0) return; tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO);
    if (tv.z > 1 || Math.abs(tv.x) > 1.05 || Math.abs(tv.y) > 1.05) return; const x = (tv.x * 0.5 + 0.5) * 1080, y = (1 - (tv.y * 0.5 + 0.5)) * 1920;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26; const lx = clamp(x + 26, 24, 1080 - w - 24), ly = clamp(y, 760, 1180);
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(lx, ly - 34, w, 68, 14); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, lx + 12, ly - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, lx + 12, ly + 16); ctx.restore(); }
  const win = (t, a, b) => smooth(a, a + 0.3, t) * (1 - smooth(b - 0.3, b, t));
  function fmtLen(m) { if (m < 0.01) return (m * 1000).toFixed(1) + ' mm'; if (m < 1) return (m * 100).toFixed(m < 0.1 ? 2 : 1) + ' cm'; if (m < 1000) return (m < 10 ? m.toFixed(2) : m < 100 ? m.toFixed(1) : Math.round(m)) + ' m';
    const km = m / 1000; if (km < 1e6) return (km < 100 ? km.toFixed(1) : Math.round(km).toLocaleString('en-US')) + ' km'; return (km / 1e6).toFixed(km < 1e7 ? 1 : 0) + ' million km'; }
  const TIERS = [[0, 'thinner than a fingernail'], [7, 'a slice of bread'], [10, 'a coffee mug'], [12, 'a cat'], [14, 'a person'], [17, 'a town house'], [20, 'a church tower'], [23, 'the tallest building'], [27, 'above the planes'], [30, 'outer space'], [37, 'wider than Earth'], [42, 'past the Moon'], [51, 'past the Sun']];
  const tierOf = (n) => { let s = TIERS[0][1]; for (const [k, l] of TIERS) if (n >= k) s = l; return s; };

  function hud(ctx, t, st) { const W = 1080, H = 1920;
    if (t < CARDT) {
      drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF YOU FOLDED PAPER', size: 78 }, { text: 'AND NEVER STOPPED?', size: 84, accent: true }], t, '#ffd23f', { start: 0.25, outAt: T1 - 0.4 });
      const n = st.step === undefined ? 0 : Math.floor(foldF(t) + 1e-6); const yC = lerp(H * 0.268, H * 0.105, smooth(T1 - 0.4, T1 + 0.2, t));
      const bump = foldTimes.reduce((m, ft) => Math.max(m, pulse(t, ft + 0.15, 0.35)), 0);
      drawSideCounter(ctx, W, H, { y: yC, label: `FOLD ${n}`, value: fmtLen(thick(n)), note: tierOf(n), color: n >= 30 ? '#7dd3ff' : '#ffd23f', bump, glow: n >= 30 ? '#7dd3ff' : '#ffd23f' });
      for (const [a, b, txt] of LT) italic(ctx, W, H, t, a, b, txt);
      // comparisons and landmark labels (checked numbers)
      tag(ctx, 56, 560, 'COFFEE MUG', 'about 9.5 cm tall', win(t, ST(2) + 1.0, ST(3) - 0.2));
      tag(ctx, 56, 560, 'REAL RECORD', '12 folds · 1.2 km of toilet paper (2002)', win(t, ST(3) + 0.6, ST(4) - 0.2));
      tag(ctx, 56, 560, 'BURJ KHALIFA', '828 m · tallest building on Earth', win(t, ST(7) + 0.8, ST(8) - 0.2));
      if (st.plane) worldLabel(ctx, st.plane, 'AIRLINER (drawn bigger)', 'swerving around your bill', cam, win(t, ST(8) + 1.0, ST(9) - 0.4));
      if (t > ST(5) + 2.4 && t < ST(6) - 0.2) worldLabel(ctx, [SX, st.top + 0.4, SZ], 'YOUR ELECTRICITY BILL', '13.1 m and rising', cam, win(t, ST(5) + 2.4, ST(6) - 0.2));
      tag(ctx, 56, 560, 'AIRLINERS', 'cruise at about 10–12 km', win(t, ST(8) + 0.8, ST(9) - 0.2));
      if (t > ST(9) + 0.6 && t < CUT - 0.2) worldLabel(ctx, [0, 100000, 0], 'KÁRMÁN LINE · 100 km', 'where space begins', cam, win(t, ST(9) + 0.6, CUT - 0.2));
      tag(ctx, 56, 560, 'EARTH', '12,742 km wide', win(t, ST(10) + 0.8, ST(11) - 0.2));
      if (t > ST(11) + 0.8 && st.moon) worldLabel(ctx, st.moon, 'THE MOON (drawn bigger)', '384,400 km away', camB, win(t, ST(11) + 0.8, ST(12) - 0.1));
      if (t > ST(12) + 1.6 && st.sun) worldLabel(ctx, st.sun, 'THE SUN', '149.6 million km away', camB, win(t, ST(12) + 1.6, CARDT - 0.1));
      if (t > ST(12) + 1.6 && st.earth) worldLabel(ctx, st.earth, 'EARTH', 'your kitchen is here', camB, win(t, ST(12) + 2.2, CARDT - 0.1) * 0.9);
      if (t > ST(6) && t < CUT) tag(ctx, 56, 650, 'NOT TO SCALE', 'paper drawn wider so you can see it', 0.7 * win(t, ST(6) + 0.4, ST(7) + 0.5));
    }
    if (t >= CARDT) { const a = smooth(CARDT, CARDT + 0.6, t); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `500 58px ${FS}`; ctx.fillText('What if you folded paper', W / 2, H * 0.32); ctx.fillStyle = '#ffd23f'; ctx.fillText('and never stopped?', W / 2, H * 0.32 + 76);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `600 23px ${FONT}`; ctx.fillText('0.1 mm × 2 EVERY FOLD  ·  42 FOLDS ≈ PAST THE MOON  ·  51 ≈ PAST THE SUN', W / 2, H * 0.32 + 150); ctx.fillText('REAL-LIFE RECORD: ABOUT 12–13 FOLDS', W / 2, H * 0.32 + 186);
      ctx.restore();
      italic(ctx, W, H, t, CARD_LINE[0], CARD_LINE[1] + 0.6, CARD_LINE[2], 0.47);
      ctx.save(); ctx.globalAlpha = smooth(CARDT + 3.6, CARDT + 4.2, t); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.font = `italic 600 46px ${FS}`; ctx.fillText('What should we try next?', W / 2, H * 0.72); ctx.fillStyle = '#ffd23f'; ctx.font = `800 30px ${FONT}`; ctx.fillText('TELL US IN THE COMMENTS', W / 2, H * 0.72 + 66); ctx.restore(); }
  }
    return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
