import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, keys, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeEarth, softTex, setFace, life, drawSideCounter, drawTitleTimed, RoundedBoxGeometry, stars } from './lib.js';
import { buildCity } from './city5.js';
import { makeStreetLife } from './streetlife.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 17 episode — format_v5 structure (countdown / slow motion / end card, as the approved sun prototype) with its own
// place, stake, consequences, lines and transformation:
// PLACE: the plaza of a natural-history museum on a busy avenue, late afternoon (not the bus stop, not the esplanade).
// STAKE: you are about to take a selfie with the museum's fibreglass T. rex. Paid off in the aftermath: the selfie happens,
//        but the statue is now looking at you.
// TRANSFORMATION: history gets one edit (the asteroid arrives 7 minutes late and misses Earth). For 5 seconds you see today
//        without the impact: a wave of prehistoric forest spreads out from the statue, the city sinks into it, the statue comes alive,
//        then from above the forest swallows the whole city, Empire State Building included.
// CAST: THE FILMER (films instead of running, blames the lighting), BAD TIMING (proposes at the exact wrong second),
//       THE PIGEON (rides on the T. rex's head — pigeons are dinosaurs). Mittens sits on the plinth and is unimpressed.
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
const backOut = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

const EV = 7.4, STORY = 5, RET = 38.4, SLOW = (RET - EV) / STORY, CARDT = 47.0, TOT = 53.4;
const SPACE0 = 7.4, SPACE1 = 12.9, FACE0 = 36.1;
const STX = -14.5, STZ = 7.5, PLT = 0.97;      // statue hips (on the plinth top)
const ROT = Math.PI / 2 + 0.7, FX_ = Math.sin(ROT), FZ_ = Math.cos(ROT), PX_ = -FZ_, PZ_ = FX_;   // statue faces the avenue at an angle (3/4 view)
const onStat = (s, l) => [STX + s * FX_ + l * PX_, STZ + s * FZ_ + l * PZ_];
const HX = -9.2, HZ = 2.2;                     // you
const [MX, MZ] = onStat(5.3, -1.4);            // Mittens on the plinth corner
const FLX = -3.4, FLZ = 9.4;                   // the filmer
const [CPX, CPZ] = onStat(6.6, 3.2);           // the proposing couple
const ESB = [130, -360];
// the forest front: radius from the statue (m) as a function of film time
const WAVE0 = 13.0;
const waveR = (t) => t <= WAVE0 ? 0 : 40 * Math.pow(t - WAVE0, 1.6);
const arrive = (d) => { let a = WAVE0, b = 80; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (waveR(m) < d) a = m; else b = m; } return b; };

export async function create({ THREE, W, H }) {
  const R = rng(1117);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(45, W / H, 0.05, 2e5);
  // GOLDEN LIGHT (owner, Nov 15): warm low late-afternoon sun, long soft shadows, warm haze, cool fill
  A.fog = new THREE.FogExp2(0xf3dcc0, 0.0007);
  const hemi = new THREE.HemisphereLight(0xdce9ff, 0x9a8466, 0.95); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffcf98, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x7fb0ff, 1.2); rim.position.set(-300, 220, -260); A.add(rim);
  const SUN = new THREE.Vector3(0.6, 0.48, 0.64).normalize();   // ~31 degrees up, behind the camera: faces lit, shadows long across the plaza
  function setShadow(cx, cz, size) { sun.target.position.set(cx, 0, cz); sun.position.set(cx + SUN.x * 1500, SUN.y * 1500, cz + SUN.z * 1500); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 10; c.far = 3500; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 100 ? 1.5 : 0.04; }
  A.add(makeSkyDome(THREE, 0x6ea6e6, 0xffe6c4, [SUN.x, SUN.y, SUN.z]));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3(), tv3 = new THREE.Vector3();
  const D2 = (x, z) => Math.hypot(x - STX, z - STZ);
  const sinkers = [];   // { obj, T, dur } groups/meshes that sink into the forest when the front passes

  // ---------------- the shared NYC-style city, recoloured warm; the hero's blocks replaced by real town houses ----------------
  const before0 = new Set(A.children);
  const C = await buildCity(THREE, A, R, { hero: [HX, HZ], np: 170, clear: 12, boards: [['MUSEUM|LATE OPENING', '#1d5f99', '#fff', 24.7, 13, 30, 13, 8, -Math.PI / 2], ['TACOS', '#19a354', '#fff', 24.7, 11, -26, 12, 6, -Math.PI / 2]] });
  const cityMisc = A.children.filter(o => !before0.has(o) && !o.isInstancedMesh && (o.isMesh || o.isGroup) && o.position.lengthSq() > 1);
  const bMesh = A.children.find(o => o.isInstancedMesh && o.material === C.bMat);
  const warm = [0xd0714f, 0xf1e3c4, 0xe0a84a, 0xf2b8b0, 0x4fa39a, 0xa9c8e0, 0xd9b13b, 0xb5523b, 0xe9d2b0, 0xc98a6a];
  const bOrig = [];
  for (let k = 0; k < bMesh.count; k++) { bMesh.getMatrixAt(k, m4); const p = new THREE.Vector3(), s = new THREE.Vector3(); m4.decompose(p, q, s);
    if ((p.x > -82 && p.x < 0 && p.z > -46 && p.z < 62) || (p.x > 20 && p.x < 40 && p.z > -42 && p.z < 40 && s.y < 120)) s.set(0, 0, 0);                       // the hero's two blocks: rebuilt below
    bMesh.getColorAt(k, col); if (!(col.b > col.r * 1.08) || s.y < 60) bMesh.setColorAt(k, col.setHex(warm[Math.floor(R() * warm.length)]));
    bOrig.push({ p, s, T: arrive(D2(p.x, p.z)) }); m4.compose(p, q.identity(), s); bMesh.setMatrixAt(k, m4); }
  bMesh.instanceColor.needsUpdate = true; bMesh.instanceMatrix.needsUpdate = true;
  const otherInst = A.children.filter(o => o.isInstancedMesh && o !== bMesh && !before0.has(o) && ![C.carB, C.carT, C.carL, C.pB, C.pH, C.pL].includes(o) && o.count < 400 && o.geometry.type !== 'PlaneGeometry');
  const instSink = otherInst.map(mesh => { const arr = []; for (let k = 0; k < mesh.count; k++) { mesh.getMatrixAt(k, m4); const p = new THREE.Vector3(), s = new THREE.Vector3(); m4.decompose(p, q, s); arr.push({ p, s, r: q.clone(), T: arrive(D2(p.x, p.z)) }); } return { mesh, arr }; });
  cityMisc.forEach(o => sinkers.push({ obj: o, T: arrive(D2(o.position.x, o.position.z)), dur: 1.2, y0: o.position.y }));
  C.cars.forEach(c => { if (c.still && c.x < 0) c.hide = true; });
  // taxis crossing the near lanes in the opening and the aftermath
  { const AFT = RET - EV - STORY; const pass = [[3, 3.3, 11], [2, 1.6, 10], [1, 2.4, 12], [7, 2.9, 11], [6, 3.9, 10], [5, 5.0, 11], [0, 4.4, 10], [4, 6.3, 11], [8, 40.2 - AFT, 10], [9, 42.4 - AFT, 11], [12, 44.9 - AFT, 10], [13, 45.8 - AFT, 12], [10, 46.5 - AFT, 11], [14, 45.2 - AFT, 10], [15, 46.1 - AFT, 11], [16, 43.6 - AFT, 12]];
    for (const [k, tc, sp] of pass) { const c = C.cars[k]; c.x = [3.4, 7.8, 12.2, 16.6][k % 4]; c.sp = sp; c.z0 = 2.0 - sp * tc; } }
  C.peds.forEach(p => { p.T = 0; });

  // ---------------- merged-geometry builder (keeps draw calls low) ----------------
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, r);
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function signMat(text, bg, fg, w = 512, h = 112, font = FONT) { return new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = h * 0.56; g.font = `900 ${fs}px ${font}`; const mw = g.measureText(text).width; if (mw > w * 0.84) { fs *= w * 0.84 / mw; g.font = `900 ${fs}px ${font}`; } g.fillText(text, w / 2, h * 0.54); }) }); }
  const stripeMat = (a, b) => new THREE.MeshStandardMaterial({ roughness: 0.75, map: canvasTex(256, 64, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? a : b; g.fillRect(k * 32, 0, 32, 64); } g.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(k * 32 + 16, 64, 16, Math.PI, 0); g.fill(); } }) });

  // ---------------- BUILDING STYLE (owner, Nov 15): 4-6 storey town houses with shutters, balconies, cornices, roofs, chimneys, shops ----------------
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a4c, roughness: 0.12, metalness: 0.55, emissive: 0x1a1208, emissiveIntensity: 0.4 });
  const litM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.3, emissive: 0xffb860, emissiveIntensity: 0.9 });
  const shopGlassM = new THREE.MeshStandardMaterial({ color: 0xcfe2ea, roughness: 0.06, metalness: 0.4, emissive: 0x5a4020, emissiveIntensity: 0.55 });
  function townhouse(x, z, ry, w, floors, o) {
    const g = new THREE.Group(); const B = Builder(); const D = 10, GF = 4.2, FH = 3.1, Hh = GF + floors * FH;
    const wall = M(o.wall, 0.82), trim = M(o.trim ?? 0xf6efe2, 0.7), shut = M(o.shut, 0.6), iron = M(0x22262c, 0.5, 0.4);
    B.add(BX(w, Hh, D), wall, 0, Hh / 2, -D / 2);
    // ground-floor shop
    B.add(RB(w * 0.92, 3.5, 0.24), M(o.shopC, 0.6), 0, 1.75, 0.08);
    B.add(BX(w * 0.62, 2.3, 0.05), shopGlassM, -w * 0.1, 1.55, 0.23); B.add(RB(0.14, 2.5, 0.14), trim, -w * 0.43, 1.55, 0.26); B.add(RB(0.14, 2.5, 0.14), trim, w * 0.21, 1.55, 0.26);
    B.add(RB(w * 0.66, 0.14, 0.4), trim, -w * 0.1, 0.36, 0.3); B.add(RB(1.0, 2.3, 0.1), M(o.door ?? 0x6b3e1e, 0.5), w * 0.33, 1.3, 0.24);
    B.add(BX(w + 0.2, 0.22, 0.4), trim, 0, GF - 0.1, 0.12);
    // upper floors: framed windows, sills, shutters, string courses, balconies with balusters
    const nW = w > 7.2 ? 3 : 2, sp = w / nW;
    for (let f = 0; f < floors; f++) { const y = GF + f * FH + FH * 0.52;
      for (let k = 0; k < nW; k++) { const wx = -w / 2 + sp * (k + 0.5); const lit = R() < 0.18;
        B.add(BX(1.25, 1.9, 0.06), trim, wx, y, 0.02); B.add(BX(1.0, 1.65, 0.05), lit ? litM : glassM, wx, y, 0.06); B.add(BX(0.06, 1.65, 0.05), trim, wx, y, 0.09);
        B.add(RB(1.45, 0.12, 0.3, 0.03), trim, wx, y - 1.0, 0.14);
        if (o.shutters !== false) { B.add(RB(0.48, 1.75, 0.07, 0.02), shut, wx - 0.9, y, 0.06, 0, 0.25 * (o.open ? 1 : 0)); B.add(RB(0.48, 1.75, 0.07, 0.02), shut, wx + 0.9, y, 0.06, 0, -0.25 * (o.open ? 1 : 0)); }
        if ((f + k + (o.bal ?? 0)) % 3 === 0 && f < floors - 1) { const by = y - 1.05; B.add(RB(1.9, 0.14, 0.85, 0.03), trim, wx, by, 0.45); B.add(BX(1.9, 0.05, 0.05), iron, wx, by + 0.9, 0.85);
          for (let b = 0; b < 8; b++) B.add(BX(0.035, 0.85, 0.035), iron, wx - 0.9 + b * 0.257, by + 0.47, 0.85); B.add(BX(0.05, 0.85, 0.8), iron, wx - 0.93, by + 0.47, 0.45); B.add(BX(0.05, 0.85, 0.8), iron, wx + 0.93, by + 0.47, 0.45);
          if (R() < 0.6) { B.add(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12), M(0xc9683f, 0.85), wx - 0.5, by + 0.21, 0.6); B.add(new THREE.SphereGeometry(0.2, 12, 10), M([0xff4f7a, 0xffd23f, 0x3f9a4a][k % 3], 0.7), wx - 0.5, by + 0.45, 0.6); } } }
      if (f > 0) B.add(BX(w + 0.08, 0.16, 0.16), trim, 0, GF + f * FH, 0.06); }
    // cornice + roof + chimney
    B.add(BX(w + 0.5, 0.42, 0.8), trim, 0, Hh + 0.1, 0.12); B.add(BX(w + 0.3, 0.2, 0.5), trim, 0, Hh - 0.22, 0.05);
    if (o.roof === 'mansard') { const rg = new THREE.CylinderGeometry(0.62, 1, 1, 4, 1).rotateY(Math.PI / 4); rg.scale(w / 1.414 * 1.0, 2.6, D / 1.414 * 1.0); B.add(rg, M(0x4a5468, 0.6), 0, Hh + 1.6, -D / 2);
      for (let k = 0; k < nW; k++) { const wx = -w / 2 + sp * (k + 0.5); B.add(RB(1.0, 1.3, 1.2), M(0xf6efe2, 0.7), wx, Hh + 1.2, 0.0); B.add(BX(0.7, 0.8, 0.05), glassM, wx, Hh + 1.15, 0.62); } }
    else { const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.25, 0); sh.lineTo(w / 2 + 0.25, 0); sh.lineTo(0, 2.6); sh.closePath(); const rg = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false }); rg.translate(0, 0, -D); B.add(rg, M(o.roofC ?? 0xb5523b, 0.85), 0, Hh + 0.3, 0.1); }
    B.add(RB(0.75, 1.9, 0.75), M(0x9a4a35, 0.9), w * 0.28, Hh + 1.6, -D * 0.55); B.add(BX(0.9, 0.15, 0.9), M(0x6b6b6b, 0.8), w * 0.28, Hh + 2.6, -D * 0.55);
    B.build(g);
    // painted shop sign + striped awning
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, 0.78), signMat(o.name, o.signBg, o.signFg)); sg.position.set(0, 3.45, 0.22); g.add(sg);
    if (o.awn) { const aw = new THREE.Mesh(BX(w * 0.8, 0.07, 1.5), stripeMat(o.awn[0], o.awn[1])); aw.position.set(-w * 0.06, 2.85, 0.85); aw.rotation.x = 0.33; aw.castShadow = true; g.add(aw); }
    if (o.extra) o.extra(g, w);
    g.position.set(x, 0.15, z); g.rotation.y = ry; A.add(g); sinkers.push({ obj: g, T: arrive(D2(x, z)), dur: 1.8 }); return g; }
  const S0 = { wall: 0, shut: 0x3f7d5a };
  const rowA = [ // west side of the avenue, facing the traffic (+x), south of the plaza
    [-8.5, 7, 5, { wall: 0xe0a84a, shut: 0x3f7d5a, name: 'CAFÉ LUNA', signBg: '#1f3d5a', signFg: '#ffe9a8', shopC: 0x1f3d5a, awn: ['#1f3d5a', '#ffe9a8'], roof: 'mansard' }],
    [-15.5, 7, 4, { wall: 0xf2b8b0, shut: 0x3a6ea5, name: 'FOSSIL BOOKS', signBg: '#6b3e1e', signFg: '#fff', shopC: 0x6b3e1e, awn: ['#6b3e1e', '#f6efe2'], bal: 1 }],
    [-22.5, 7, 5, { wall: 0xf1e3c4, shut: 0x9a3b2f, name: 'PHARMACY', signBg: '#1f8a4c', signFg: '#fff', shopC: 0xf6f6f2, roof: 'mansard', bal: 2,
      extra: (g) => { const cm = new THREE.MeshBasicMaterial({ color: 0x3dff7a, toneMapped: false }); for (const [a, b] of [[0.2, 0.7], [0.7, 0.2]]) { const c = new THREE.Mesh(BX(a, b, 0.12), cm); c.position.set(2.6, 4.6, 0.9); g.add(c); } } }],
    [-29.5, 7, 4, { wall: 0xd0714f, shut: 0xf6efe2, name: 'SUDS LAUNDRY', signBg: '#ffffff', signFg: '#1d5f99', shopC: 0x9cc9e8, open: true }],
    [-36.5, 7, 6, { wall: 0xa9c8e0, shut: 0x1d3f6e, name: 'BAKERY OLA', signBg: '#ffd23f', signFg: '#5a2a10', shopC: 0xffd23f, awn: ['#ffd23f', '#ffffff'], bal: 1, roofC: 0x8a3b2a }],
  ];
  rowA.forEach(([zc, w, fl, o]) => townhouse(-5, zc, Math.PI / 2, w, fl, o));
  const rowN = [ // west side, north of the plaza
    [22.5, 7, 4, { wall: 0x4fa39a, shut: 0xf6efe2, name: 'FLORA FLOWERS', signBg: '#f6efe2', signFg: '#2a6a5a', shopC: 0xf6efe2, awn: ['#ff7fb4', '#ffffff'], open: true,
      extra: (g) => { for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), M([0xff4f7a, 0xffd23f, 0xff8a3d, 0xc86bff, 0xffffff][k], 0.6)); b.position.set(-2.4 + k * 0.55, 0.7, 0.75); b.castShadow = true; g.add(b); } } }],
    [29.5, 7, 5, { wall: 0xd9b13b, shut: 0x3a6ea5, name: 'TACO TITAN', signBg: '#e63946', signFg: '#fff', shopC: 0xe63946, awn: ['#e63946', '#ffd23f'], roof: 'mansard' }],
    [36.5, 7, 4, { wall: 0xf2b8b0, shut: 0x3f7d5a, name: 'GELATO ROSA', signBg: '#ff5fa2', signFg: '#fff', shopC: 0xffc4d8, awn: ['#ff5fa2', '#ffffff'], bal: 2 }],
    [43.5, 7, 6, { wall: 0xe9d2b0, shut: 0x7a2e2e, name: 'CLIPPERS', signBg: '#111111', signFg: '#fff', shopC: 0x2b2b2b, roof: 'mansard' }],
    [50.5, 7, 5, { wall: 0xc98a6a, shut: 0xf6efe2, name: 'PIZZA NONNA', signBg: '#19a354', signFg: '#fff', shopC: 0x19a354, awn: ['#19a354', '#ffffff'] }],
  ];
  rowN.forEach(([zc, w, fl, o]) => townhouse(-5, zc, Math.PI / 2, w, fl, o));
  // east side of the avenue (seen in the aftermath): more town houses, all different
  [[-33, 8, 5, 0xf1e3c4, 0x3a6ea5, 'NOODLE BAR', '#e63946', 'mansard'], [-25, 8, 4, 0x4fa39a, 0xf6efe2, 'DELI DELUXE', '#1f3d5a', 'pitch'], [-17, 8, 6, 0xe0a84a, 0x7a2e2e, 'TOY STORE', '#ff5fa2', 'mansard'], [-9, 8, 4, 0xf2b8b0, 0x3f7d5a, 'NEWS & CO', '#111111', 'pitch'],
   [-1, 8, 5, 0xd0714f, 0xf6efe2, 'BIKE SHOP', '#19a354', 'pitch'], [7, 8, 4, 0xa9c8e0, 0x1d3f6e, 'COFFEE CORNER', '#6b3e1e', 'mansard'], [15, 8, 5, 0xd9b13b, 0x3a6ea5, 'SHOE REPAIR', '#3a7bd5', 'pitch'], [23, 8, 6, 0xe9d2b0, 0x9a3b2f, 'HOTEL ASTOR', '#8a2e3b', 'mansard'], [31, 8, 4, 0xf2b8b0, 0x3f7d5a, 'SUSHI GO', '#e63946', 'pitch']]
    .forEach(([zc, w, fl, wall, shut, name, bg, roof], k) => townhouse(25, zc, -Math.PI / 2, w, fl, { wall, shut, name, signBg: bg, signFg: '#fff', shopC: new THREE.Color(bg).getHex(), roof, bal: k % 3, open: k % 2 === 0, awn: k % 2 ? [bg, '#ffffff'] : null }));
  // the plaza's side rows
  townhouse(-19, -5, 0, 7.5, 4, { wall: 0xb5523b, shut: 0xf6efe2, name: 'GIFT SHOP', signBg: '#173d39', signFg: '#f2e3c6', shopC: 0x173d39, awn: ['#173d39', '#f2e3c6'] });
  townhouse(-26.5, -5, 0, 7.5, 5, { wall: 0xf1e3c4, shut: 0x3f7d5a, name: 'BISTRO 66', signBg: '#8a2e3b', signFg: '#fff', shopC: 0x8a2e3b, roof: 'mansard' });
  townhouse(-19, 19, Math.PI, 7.5, 5, { wall: 0xe0a84a, shut: 0x1d3f6e, name: 'ART SUPPLY', signBg: '#3a7bd5', signFg: '#fff', shopC: 0x3a7bd5, awn: ['#3a7bd5', '#ffffff'] });
  townhouse(-26.5, 19, Math.PI, 7.5, 4, { wall: 0xf2b8b0, shut: 0x3a6ea5, name: 'TEA HOUSE', signBg: '#2a9d8f', signFg: '#fff', shopC: 0x2a9d8f, roof: 'mansard' });
  // filler masses behind the rows (seen from above)
  { const fB = Builder(); for (const [x, z, w, d, h, c] of [[-40, -25, 50, 32, 16, 0xd0a080], [-62, 20, 36, 70, 20, 0xc98a6a], [-40, 40, 50, 30, 17, 0xe9d2b0], [-66, -25, 28, 36, 22, 0xb5806a]]) fB.add(BX(w, h, d).translate(0, h / 2, 0), M(c, 0.85), x, 0.15, z);
    const fg = fB.build(new THREE.Group()); A.add(fg); sinkers.push({ obj: fg, T: arrive(40), dur: 2.0 }); }

  // ---------------- the plaza, the museum, the statue's plinth ----------------
  const pave = new THREE.Mesh(BX(31, 0.17, 24).translate(0, 0.085, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(512, 512, (g) => { g.fillStyle = '#d9cbb0'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = `hsl(${32 + (x * 7 + y * 13) % 9}, 30%, ${70 + ((x * 31 + y * 17) % 9)}%)`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); } }) }));
  pave.material.map.wrapS = pave.material.map.wrapT = THREE.RepeatWrapping; pave.material.map.repeat.set(8, 6); pave.position.set(-15.5, 0, 7); pave.receiveShadow = true; A.add(pave);
  { const mus = new THREE.Group(); const B = Builder(); const stone = M(0xeadcc0, 0.8), stone2 = M(0xd8c8a8, 0.8);
    B.add(BX(16, 19, 26).translate(0, 9.5, 0), stone, -8, 0, 0);
    for (let s = 0; s < 4; s++) B.add(BX(1.0, 0.3, 22), stone2, 0.5 + s * 0.9 - 0.4, 0.15 + s * 0.3 - 0.1, 0); B.add(BX(3.4, 1.2, 22), stone2, -1.2, 0.6, 0);
    for (let k = 0; k < 7; k++) { B.add(new THREE.CylinderGeometry(0.55, 0.62, 10.5, 20), M(0xf4ead6, 0.7), 0.6, 1.2 + 5.25, -9 + k * 3); B.add(BX(1.4, 0.4, 1.4), stone2, 0.6, 1.4, -9 + k * 3); B.add(BX(1.4, 0.4, 1.4), stone2, 0.6, 11.6, -9 + k * 3); }
    B.add(BX(2.6, 1.6, 22.5), stone, 0.4, 12.6, 0);
    const sh = new THREE.Shape(); sh.moveTo(-11.5, 0); sh.lineTo(11.5, 0); sh.lineTo(0, 3.6); sh.closePath(); const pg = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: false }); pg.rotateY(Math.PI / 2); B.add(pg, stone, -0.8, 13.4, 0);
    B.add(BX(0.2, 7, 2.6), M(0x3a2a1e, 0.5), -0.9, 4.7, 0);
    B.build(mus);
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(19, 1.1), signMat('MUSEUM OF DEEP TIME', '#eadcc0', '#3a2a1e', 1024, 64, FS)); nm.position.set(1.75, 12.6, 0); nm.rotation.y = Math.PI / 2; mus.add(nm);
    for (const [zz, c] of [[-7.5, '#c0392b'], [-1.5, '#1f8a4c'], [4.5, '#c0392b'], [7.5, '#1f8a4c']]) { const bn = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 6.2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, map: canvasTex(128, 460, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); g.fillText('DINOSAUR HALL', 0, 12); g.restore(); }) })); bn.position.set(1.4, 7.6, zz); bn.rotation.y = Math.PI / 2; mus.add(bn); }
    mus.position.set(-31, 0.15, 7); A.add(mus); sinkers.push({ obj: mus, T: arrive(17), dur: 2.0 }); }
  { const g = new THREE.Group(); const B = Builder(); const st = M(0x9c958a, 0.75); B.add(RB(4.4, 0.82, 14, 0.08), st, 0, 0.56, -1); B.add(RB(4.8, 0.14, 14.4, 0.05), M(0x8a8378, 0.8), 0, 0.22, -1); B.build(g);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), signMat('TYRANNOSAURUS REX · 66 MILLION YEARS AGO', '#3a3026', '#f2d58a', 1024, 160)); pl.position.set(0, 0.58, 6.02); g.add(pl);
    g.position.set(STX, 0, STZ); g.rotation.y = ROT; A.add(g); }
  // street furniture: lamps, benches, trees in planters, bunting across the plaza
  const darkM = C.dark;
  function lamp(x, z) { const g = new THREE.Group(); const B = Builder(); B.add(new THREE.CylinderGeometry(0.08, 0.13, 4.6, 14), darkM, 0, 2.3, 0); B.add(new THREE.CylinderGeometry(0.2, 0.08, 0.3, 14), darkM, 0, 4.7, 0); B.build(g);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: 0.8, roughness: 0.3 })); head.position.y = 5.0; g.add(head); g.position.set(x, 0.17, z); A.add(g); sinkers.push({ obj: g, T: arrive(D2(x, z)), dur: 0.9 }); }
  lamp(-1.0, -1.5); lamp(-1.0, 15.5); lamp(-22, 1.2); lamp(-22, 13.0);
  function bench(x, z, ry) { const g = new THREE.Group(); const B = Builder(); const wd = M(0xc27a35, 0.6); for (let k = 0; k < 3; k++) B.add(RB(1.8, 0.06, 0.14, 0.02), wd, 0, 0.48, -0.2 + k * 0.17); for (let k = 0; k < 2; k++) B.add(RB(1.8, 0.14, 0.05, 0.02), wd, 0, 0.75 + k * 0.17, -0.3);
    for (const dx of [-0.75, 0.75]) B.add(RB(0.06, 0.48, 0.5, 0.02), darkM, dx, 0.24, -0.05); B.build(g); g.position.set(x, 0.17, z); g.rotation.y = ry; A.add(g); sinkers.push({ obj: g, T: arrive(D2(x, z)), dur: 0.9 }); }
  bench(-22.5, 3.0, Math.PI / 2); bench(-4.6, 15.4, -Math.PI / 2);
  function planterTree(x, z) { const g = new THREE.Group(); const B = Builder(); B.add(RB(1.4, 0.6, 1.4, 0.08), M(0x8a8378, 0.85), 0, 0.3, 0); B.add(new THREE.CylinderGeometry(0.1, 0.15, 2.6, 10), M(0x6a4a30, 0.9), 0, 1.6, 0);
    for (let k = 0; k < 5; k++) B.add(new THREE.SphereGeometry(0.75 + R() * 0.3, 16, 12), M(k % 2 ? 0x4c9a3c : 0x5fae44, 0.85), (R() - 0.5) * 0.9, 3.0 + R() * 0.7, (R() - 0.5) * 0.9); B.build(g); g.position.set(x, 0.17, z); A.add(g); sinkers.push({ obj: g, T: arrive(D2(x, z)), dur: 1.0 }); }
  planterTree(-1.2, -20); planterTree(-1.2, -33); planterTree(-1.2, 27); planterTree(-28, -1.5); planterTree(-28, 15.5);
  { const flagG = new THREE.ConeGeometry(0.22, 0.45, 3); const g = new THREE.Group(); for (const zb of [-3.6, 17.6]) for (let k = 0; k < 22; k++) { const x = -27 + k * 1.15, sag = 7.4 - 0.9 * Math.sin(Math.PI * k / 21); const f = new THREE.Mesh(flagG, M([0xff4f7a, 0xffd23f, 0x2bb3b1, 0x3a7bd5][k % 4], 0.6)); f.rotation.x = Math.PI; f.position.set(x, sag, zb); g.add(f); } A.add(g); sinkers.push({ obj: g, T: arrive(12), dur: 0.8 }); }
  // the Empire State Building (443 m to the tip) — "never built"
  { const g = new THREE.Group(); const B = Builder(); const tiers = [[71, 36.6, 25], [56, 30, 260], [44, 24, 40], [34, 18, 20], [22, 14, 18], [14, 10, 18]]; let y = 0;
    for (const [w, d, h] of tiers) { B.add(BX(w, h, d).translate(0, h / 2, 0), M(0xd8cdb8, 0.7), 0, y, 0); y += h; }
    B.add(new THREE.CylinderGeometry(4.5, 6, 18, 16), M(0xd8cdb8, 0.7), 0, y + 9, 0); y += 18; B.add(new THREE.CylinderGeometry(0.8, 2.2, 443.2 - y, 12), M(0xcfd4da, 0.3, 0.6), 0, (y + 443.2) / 2, 0);
    B.build(g); g.position.set(ESB[0], 0.15, ESB[1]); A.add(g); sinkers.push({ obj: g, T: 32.7, dur: 2.2 }); }   // the last one standing

  // ---------------- the forest: spreading ground, ferns, tree ferns, conifers ----------------
  const UF = { uR: { value: 0 }, uC: { value: new THREE.Vector2(STX, STZ) } };
  const forestM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  forestM.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, UF);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWp; uniform float uR; uniform vec2 uC;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float d = distance(vWp.xz, uC); float n = vn(vWp.xz * 0.12) * 0.6 + vn(vWp.xz * 0.5) * 0.4;
      if (d > uR * (0.86 + 0.22 * n)) discard;
      float n2 = vn(vWp.xz * 1.7);
      vec3 moss = mix(vec3(0.24, 0.42, 0.13), vec3(0.42, 0.56, 0.18), n); moss = mix(moss, vec3(0.36, 0.27, 0.15), smoothstep(0.62, 0.9, n2) * 0.6);
      diffuseColor.rgb = moss;`); };
  const forest = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), forestM); forest.position.y = 0.176; forest.receiveShadow = true; forest.visible = false; A.add(forest);
  // keep-clear zones (cast, plinth, camera paths)
  const clearZ = [[HX, HZ, 2.0], [FLX, FLZ, 1.6], [CPX, CPZ, 1.6], [CPX, CPZ + 1.3, 1.4], [MX, MZ, 1.0], [-1.0, -0.8, 2.4], [-2.5, 0.2, 2.2], [-6.0, 1.0, 1.8], [-6.4, 0.8, 1.8], [-4.5, 6.0, 1.8], [-9.0, 1.0, 1.4], [-3.6, 0.0, 1.6], [-8.0, 8.6, 1.8], [-3.4, 5.2, 1.8], [-5.4, 5.8, 1.4], [-8.5, 4.7, 1.6], [-10.0, 3.8, 1.2], [-6.0, 5.0, 1.4]];
  const okAt = (x, z) => { const rx = x - STX, rz = z - STZ, s = rx * FX_ + rz * FZ_, l = rx * PX_ + rz * PZ_; return !clearZ.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) && !(s > -8.4 && s < 6.4 && Math.abs(l) < 2.6); };
  function frondGeo(len, wid, bend, n) { const parts = []; for (let k = 0; k < n; k++) { const g = new THREE.PlaneGeometry(wid, len, 1, 8); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const yy = p.getY(i) + len / 2, u = yy / len; p.setX(i, p.getX(i) * Math.sin(Math.PI * Math.min(1, u * 1.15)) * 1.2); p.setY(i, yy * Math.cos(bend * u)); p.setZ(i, -yy * Math.sin(bend * u) * 0.9 * u); }
      g.computeVertexNormals(); g.rotateX(-0.25 - (k % 2) * 0.25); g.rotateY(k / n * Math.PI * 2 + (k % 3) * 0.2); parts.push(g.toNonIndexed()); } return mergeGeometries(parts); }
  const fernG = frondGeo(1.4, 0.42, 1.5, 9);
  const treeFernG = (() => { const tr = new THREE.CylinderGeometry(0.16, 0.24, 4.2, 10).translate(0, 2.1, 0).toNonIndexed(); const fr = frondGeo(2.6, 0.6, 1.9, 11).translate(0, 4.2, 0); tr.deleteAttribute('uv'); fr.deleteAttribute('uv'); return mergeGeometries([tr, fr]); })();
  const coniferG = (() => { const parts = [new THREE.CylinderGeometry(0.03, 0.05, 1, 8).translate(0, 0.5, 0)]; for (let k = 0; k < 4; k++) parts.push(new THREE.ConeGeometry(0.28 - k * 0.05, 0.32, 12).translate(0, 0.45 + k * 0.17, 0)); parts.push(new THREE.SphereGeometry(0.06, 8, 6).translate(0, 1.08, 0));
    return mergeGeometries(parts.map(g => { const n = g.toNonIndexed(); n.deleteAttribute('uv'); return n; })); })();
  const plantM = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide });
  const veg = [];
  function vegSet(geo, n, place, colorF) { const list = []; for (let k = 0; k < n * 4 && list.length < n; k++) { const p = place(); if (!p) continue; list.push(p); }
    const mesh = new THREE.InstancedMesh(geo, plantM, list.length); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    list.forEach((p, k) => { p.T = arrive(D2(p.x, p.z)) + R() * 0.35; mesh.setColorAt(k, col.setHSL(...colorF())); m4.compose(v.set(p.x, -10, p.z), q.identity(), sc.set(0.001, 0.001, 0.001)); mesh.setMatrixAt(k, m4); });
    A.add(mesh); veg.push({ mesh, list }); }
  vegSet(fernG, 1400, () => { const a = R() * Math.PI * 2, d = 2.5 + Math.pow(R(), 0.8) * 70; const x = STX + Math.cos(a) * d, z = STZ + Math.sin(a) * d; return okAt(x, z) ? { x, z, s: 0.8 + R() * 1.0, ry: R() * 6.28, y: 0.17 } : null; }, () => [0.24 + R() * 0.08, 0.55 + R() * 0.2, 0.28 + R() * 0.12]);
  vegSet(treeFernG, 110, () => { const a = R() * Math.PI * 2, d = 7 + Math.pow(R(), 0.7) * 90; const x = STX + Math.cos(a) * d, z = STZ + Math.sin(a) * d; return okAt(x, z) && Math.hypot(x - 2, z - 3) > 5 ? { x, z, s: 0.8 + R() * 0.7, ry: R() * 6.28, y: 0.17 } : null; }, () => [0.25 + R() * 0.06, 0.5 + R() * 0.2, 0.26 + R() * 0.1]);
  vegSet(coniferG, 3200, () => { const x = -1300 + R() * 2700, z = -1600 + R() * 2600; if (Math.hypot(x - STX, z - STZ) < 28) return null; const h = 14 + R() * 22; return { x, z, s: h, ry: R() * 6.28, y: 0.1 }; }, () => [0.27 + R() * 0.08, 0.42 + R() * 0.2, 0.2 + R() * 0.12]);
  vegSet(coniferG, 160, () => { const a = R() * Math.PI * 2, d = 26 + R() * 90; const x = STX + Math.cos(a) * d, z = STZ + Math.sin(a) * d; return { x, z, s: 12 + R() * 14, ry: R() * 6.28, y: 0.1 }; }, () => [0.28 + R() * 0.06, 0.45, 0.22 + R() * 0.1]);

  // ---------------- dinosaurs ----------------
  // theropod rig: root at the feet, facing local +z; head is a free group placed every frame; the neck stretches between them.
  function makeTheropod(S, o) {
    const skin = new THREE.MeshStandardMaterial({ color: o.color, roughness: o.rough ?? 0.7 }), belly = new THREE.MeshStandardMaterial({ color: o.belly ?? o.color, roughness: 0.75 });
    const crestM = new THREE.MeshStandardMaterial({ color: o.crest ?? 0xff8a3d, roughness: 0.6 }), toothM = new THREE.MeshStandardMaterial({ color: 0xfff8e6, roughness: 0.4 });
    const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 26), skin); torso.scale.set(1.05 * S, 1.2 * S, 2.25 * S); torso.position.set(0, 0.15 * S, 0.7 * S); body.add(torso);
    const bel = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), belly); bel.scale.set(0.9 * S, 0.9 * S, 1.9 * S); bel.position.set(0, -0.22 * S, 0.9 * S); body.add(bel);
    const tail = []; { let par = body, len = [1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8], rad = [0.85, 0.7, 0.56, 0.44, 0.33, 0.24, 0.15]; let pz = -1.1 * S;
      for (let i = 0; i < len.length; i++) { const gp = new THREE.Group(); gp.position.set(0, i === 0 ? 0.1 * S : 0, i === 0 ? pz : -len[i - 1] * S); par.add(gp);
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(rad[i] * S, len[i] * S, 6, 16).rotateX(Math.PI / 2).translate(0, 0, -len[i] * S / 2), skin); gp.add(m); tail.push(gp); par = gp; } }
    const crest = new THREE.Group(); body.add(crest);
    for (let i = 0; i < 14; i++) { const z = 2.0 - i * 0.5; const c = new THREE.Mesh(new THREE.ConeGeometry(0.16 * S, 0.65 * S * (1 - i * 0.04), 10), i % 2 ? crestM : new THREE.MeshStandardMaterial({ color: o.crest2 ?? 0xffd23f, roughness: 0.6 })); c.position.set(0, (1.25 - Math.abs(z - 0.6) * 0.06) * S, z * S); c.rotation.x = -0.5; crest.add(c); }
    for (const sx of [-1, 1]) { const ap = new THREE.Group(); ap.position.set(sx * 0.62 * S, -0.15 * S, 2.25 * S); body.add(ap); const a1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * S, 0.45 * S, 4, 10), skin); a1.position.y = -0.25 * S; ap.add(a1); ap.rotation.x = -0.9; const cl = new THREE.Mesh(new THREE.ConeGeometry(0.05 * S, 0.18 * S, 8), toothM); cl.position.set(0, -0.55 * S, 0.05 * S); ap.add(cl); root.userData['arm' + sx] = ap; }
    const legs = []; for (const sx of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(sx * 0.75 * S, 0, 0); root.add(hip);
      const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.55 * S, 1.3 * S, 6, 16), skin); th.position.y = -0.85 * S; hip.add(th);
      const knee = new THREE.Group(); knee.position.y = -1.7 * S; hip.add(knee); const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3 * S, 1.3 * S, 6, 14), skin); sh.position.y = -0.8 * S; knee.add(sh);
      const ank = new THREE.Group(); ank.position.y = -1.6 * S; knee.add(ank); const mt = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * S, 0.6 * S, 4, 12), skin); mt.position.y = -0.45 * S; ank.add(mt);
      const foot = new THREE.Group(); foot.position.y = -0.9 * S; ank.add(foot); for (const tz of [-0.25, 0, 0.25]) { const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.12 * S, 0.5 * S, 4, 10).rotateX(Math.PI / 2), skin); toe.position.set(tz * S, 0.05 * S, 0.35 * S); toe.rotation.y = tz * 0.8; foot.add(toe); const cw = new THREE.Mesh(new THREE.ConeGeometry(0.07 * S, 0.22 * S, 8).rotateX(Math.PI / 2), toothM); cw.position.set(tz * 1.2 * S, 0.05 * S, 0.7 * S); foot.add(cw); }
      legs.push({ hip, knee, ank, foot, sx }); }
    // head
    const head = new THREE.Group(); head.rotation.order = 'YXZ';
    const skull = new THREE.Mesh(new RoundedBoxGeometry(1.0 * S, 0.9 * S, 1.9 * S, 4, 0.3 * S), skin); skull.position.set(0, 0.1 * S, 0.75 * S); head.add(skull);
    const snout = new THREE.Mesh(new RoundedBoxGeometry(0.8 * S, 0.55 * S, 0.9 * S, 4, 0.22 * S), skin); snout.position.set(0, -0.05 * S, 1.65 * S); head.add(snout);
    const jaw = new THREE.Group(); jaw.position.set(0, -0.28 * S, 0.1 * S); head.add(jaw);
    const jm = new THREE.Mesh(new RoundedBoxGeometry(0.85 * S, 0.3 * S, 2.1 * S, 4, 0.12 * S), belly); jm.position.set(0, -0.12 * S, 0.95 * S); jaw.add(jm);
    const tongue = new THREE.Mesh(new RoundedBoxGeometry(0.5 * S, 0.12 * S, 1.4 * S, 3, 0.05 * S), new THREE.MeshStandardMaterial({ color: 0xc0485a, roughness: 0.5 })); tongue.position.set(0, 0.04 * S, 0.9 * S); jaw.add(tongue);
    const mouthIn = new THREE.Mesh(new RoundedBoxGeometry(0.75 * S, 0.12 * S, 1.8 * S, 2, 0.05 * S), new THREE.MeshStandardMaterial({ color: 0x5a1820, roughness: 0.6 })); mouthIn.position.set(0, -0.3 * S, 1.0 * S); head.add(mouthIn);
    for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) { const z = 0.5 + i * 0.22; const tu = new THREE.Mesh(new THREE.ConeGeometry(0.05 * S, 0.2 * S, 8), toothM); tu.rotation.x = Math.PI; tu.position.set(sx * 0.33 * S, -0.38 * S, z * S); head.add(tu);
      const tl = new THREE.Mesh(new THREE.ConeGeometry(0.045 * S, 0.17 * S, 8), toothM); tl.position.set(sx * 0.33 * S, 0.08 * S, (z + 0.1) * S); jaw.add(tl); }
    const eyes = [], pups = [], lids = []; const eyeW = new THREE.MeshStandardMaterial({ color: 0xfff6dc, roughness: 0.25 });
    for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.16 * S, 18, 14), eyeW); ey.position.set(sx * 0.43 * S, 0.3 * S, 0.65 * S); head.add(ey); eyes.push(ey);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.095 * S, 14, 10), new THREE.MeshStandardMaterial({ color: 0x151008, roughness: 0.3 })); pu.position.set(sx * 0.08 * S, 0, 0.08 * S); pu.scale.set(0.7, 1.15, 0.6); ey.add(pu); pups.push(pu);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.025 * S, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); gl.position.set(0.02 * S, 0.04 * S, 0.07 * S); pu.add(gl);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.175 * S, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.position.copy(ey.position); head.add(lid); lids.push(lid);
      const brow = new THREE.Mesh(new RoundedBoxGeometry(0.34 * S, 0.12 * S, 0.5 * S, 2, 0.05 * S), skin); brow.position.set(sx * 0.4 * S, 0.5 * S, 0.62 * S); brow.rotation.z = sx * 0.3; head.add(brow); }
    const hcrest = new THREE.Group(); head.add(hcrest); for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12 * S, 0.5 * S, 10), i % 2 ? crestM : new THREE.MeshStandardMaterial({ color: o.crest2 ?? 0xffd23f, roughness: 0.6 })); c.position.set(0, 0.6 * S, (0.1 + i * 0.28) * S); c.rotation.x = -0.6; hcrest.add(c); }
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.58 * S, 1, 6, 18), skin);
    const grp = new THREE.Group(); grp.add(root, head, neck);
    [root, head, neck].forEach(g => g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }));
    // rest pose: find hip height so the feet touch the ground
    const hipH = 1.7 * S * Math.cos(0.35) + 1.6 * S * Math.cos(0.45) + 0.9 * S + 0.06 * S;
    const D = { grp, root, body, head, neck, jaw, tail, legs, crest, hcrest, eyes, pups, lids, skin, belly, eyeW, S, hipH, mats: [skin, belly] };
    D.pose = (p) => {   // p: {x,z,ry, crouch, pitch, walk, tailT, headW:[x,y,z], yaw, hpitch, jaw, blink, alive}
      const S = D.S; const cr = p.crouch ?? 0; root.position.set(p.x, (p.y ?? 0) + hipH - cr * 0.9 * S, p.z); root.rotation.set(0, p.ry ?? 0, 0); body.rotation.set(p.pitch ?? 0, 0, p.roll ?? 0);
      for (const L of legs) { const ph = (p.walk ?? 0) + (L.sx > 0 ? Math.PI : 0), sw = p.walkAmp ?? 0; L.hip.rotation.x = -0.35 - 0.45 * cr - Math.sin(ph) * 0.5 * sw; L.knee.rotation.x = 0.8 + 1.0 * cr + Math.max(0, Math.sin(ph + 1.2)) * 0.7 * sw; L.ank.rotation.x = -0.45 - 0.55 * cr - Math.max(0, Math.sin(ph + 0.3)) * 0.3 * sw; L.foot.rotation.x = -(L.hip.rotation.x + L.knee.rotation.x + L.ank.rotation.x); }
      if (sw0(p)) root.position.y += Math.abs(Math.sin(p.walk)) * 0.08 * S;
      tail.forEach((g, i) => { g.rotation.y = Math.sin((p.tailT ?? 0) * 1.3 - i * 0.55) * (0.05 + i * 0.018) * (p.tailAmp ?? 1); g.rotation.x = i === 0 ? 0.12 : 0.04 + (p.tailLift ?? 0) * 0.02; });
      root.updateMatrixWorld(true);
      tv.set(0, 0.75 * S, 2.6 * S); body.localToWorld(tv);                      // neck base (world)
      const hw = p.headW; head.position.set(hw[0], hw[1], hw[2]); head.rotation.set(p.hpitch ?? 0, (p.ry ?? 0) + (p.yaw ?? 0), p.hroll ?? 0); head.updateMatrixWorld(true);
      tv2.set(0, 0.1 * S, 0.1 * S); head.localToWorld(tv2); tv3.subVectors(tv2, tv); const len = Math.max(0.2, tv3.length());
      neck.position.copy(tv).addScaledVector(tv3, 0.5); neck.quaternion.setFromUnitVectors(v.set(0, 1, 0), tv3.clone().normalize()); neck.scale.set(1, len, 1);
      jaw.rotation.x = 0.9 * (p.jaw ?? 0);
      const bl = p.blink ?? 0; lids.forEach(l => { l.rotation.x = -Math.PI / 2 + Math.PI * (0.35 + 0.65 * bl) - 0.8 + (p.alive ?? 1) * 0.0; });
    };
    function sw0(p) { return (p.walkAmp ?? 0) > 0; }
    D.neutralHead = (x, z, ry, pitch = 0, fwd = 3.9, up = 1.15) => [x + Math.sin(ry) * fwd * D.S, hipH + up * D.S - fwd * D.S * Math.sin(pitch) * 0.6, z + Math.cos(ry) * fwd * D.S];
    return D; }
  // the museum's T. rex: 12 m long, about 4 m at the hips — fibreglass, until it is not
  const rex = makeTheropod(1.0, { color: 0x8a9777, belly: 0xb9b49a, rough: 0.35, crest: 0xff6a2a, crest2: 0xffc83a }); A.add(rex.grp);
  const rexStatue = new THREE.Color(0x8a9777), rexAlive = new THREE.Color(0x5d7f34), bellyStatue = new THREE.Color(0xb9b49a), bellyAlive = new THREE.Color(0xd9c38a);
  // two smaller, feathered, very speculative modern dinosaurs (66 million more years of evolution)
  const raptors = [0, 1].map(k => { const d = makeTheropod(0.34, { color: k ? 0x2bb3b1 : 0x7a4fd0, belly: k ? 0xbff0e6 : 0xe6d6ff, crest: k ? 0xff4f7a : 0xffd23f, crest2: k ? 0xffd23f : 0xff8a3d }); d.crest.scale.setScalar(1.6); A.add(d.grp); return d; });
  // long-necks in the forest (seen from above)
  function makeSauropod() { const g = new THREE.Group(); const B = Builder(); const sk = M(0x7d8f6a, 0.8), bl = M(0xb8b090, 0.8);
    B.add(new THREE.SphereGeometry(1, 24, 18).scale(3.2, 3.4, 7), sk, 0, 7.5, 0); B.add(new THREE.SphereGeometry(1, 20, 14).scale(2.6, 2.2, 5.5), bl, 0, 6.2, 0.5);
    for (const [x, z] of [[-2, 4], [2, 4], [-2, -4], [2, -4]]) B.add(new THREE.CylinderGeometry(0.9, 1.0, 6.5, 14), sk, x, 3.25, z);
    for (let i = 0; i < 9; i++) { const u = i / 8; B.add(new THREE.SphereGeometry(1.5 - u * 0.95, 16, 12), sk, 0, 9 + u * 9, 6 + u * 7 - u * u * 2); }
    B.add(new THREE.SphereGeometry(1, 16, 12).scale(0.7, 0.6, 1.2), sk, 0, 18.6, 11.6);
    for (let i = 0; i < 10; i++) { const u = i / 9; B.add(new THREE.SphereGeometry(1.6 - u * 1.45, 14, 10), sk, 0, 8 - u * 5, -7 - u * 14); }
    B.build(g); A.add(g); return g; }
  const sauros = []; for (let k = 0; k < 7; k++) { const s = makeSauropod(); s.position.set(70 + (k % 4) * 26 + R() * 10, 0.1, -140 + Math.floor(k / 4) * 30 + R() * 10); s.rotation.y = 0.9 + R() * 0.3; s.userData.p0 = s.position.clone(); s.scale.setScalar(0.9 + R() * 0.3); sauros.push(s); }
  // pterosaurs gliding over the forest
  const pteroG = new THREE.Group(); A.add(pteroG); const pteros = [];
  { const wingS = new THREE.Shape(); wingS.moveTo(0, 0); wingS.lineTo(3.6, 0.5); wingS.lineTo(0.2, -1.2); wingS.closePath(); const wg = new THREE.ShapeGeometry(wingS).rotateX(-Math.PI / 2);
    const wm = new THREE.MeshStandardMaterial({ color: 0xc8643a, roughness: 0.7, side: THREE.DoubleSide }), bm = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.7 });
    for (let k = 0; k < 16; k++) { const p = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.4, 4, 10).rotateX(Math.PI / 2), bm); p.add(b); const crestP = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 8).rotateX(-Math.PI / 2 - 0.4), bm); crestP.position.set(0, 0.25, -0.6); p.add(crestP);
      const wl = new THREE.Mesh(wg, wm), wr = new THREE.Mesh(wg, wm); wr.scale.x = -1; const pl = new THREE.Group(), pr = new THREE.Group(); pl.add(wl); pr.add(wr); p.add(pl, pr); p.userData = { pl, pr, a0: R() * 6.28, r: 30 + R() * 50, h: 35 + R() * 45, sp: 0.18 + R() * 0.1, cx: -20 + R() * 80, cz: -60 + R() * 60 };
      p.scale.setScalar(1.6); pteroG.add(p); pteros.push(p); } }

  // ---------------- the lively avenue (dog walker, jogger, cyclist, kid with balloon, busker, van, phone call, coffee) ----------------
  const before = new Set(A.children);
  const SL = makeStreetLife(THREE, A, { seed: 17, z: HZ, dogX: -5.6, dogZ: 15.3, dogDir: -1, jogX: -1.4, jogZ: -24, bikeX: 1.7, bikeZ: -40, kidX: -3.0, kidZ: -3.9, kidDir: 1, musX: -3.2, musZ: 11.2, vanX: 18.5, vanZ: 18, phX: 21.8, phZ: -10, cofX: 22.4, cofZ: 4, balloonColor: 0x2bb3b1, vanColor: 0xfdfbf5, vanStripe: 0x3a7bd5, dogColor: 0x2a2a2a });
  // extra passers-by on the sidewalk and across the plaza (opening and aftermath): [x0, z0, dirx, dirz, speed, tmPass, shirt]
  const walkers = [[-2.3, 2.0, 0, 1, 1.3, 4.0, 0xe63946], [-1.7, 1.5, 0, -1, 1.25, 15.5, 0x4caf7a], [-3.2, -0.6, -1, 0, 1.15, 2.0, 0xffd23f], [-16.0, 0.0, 1, 0, 1.2, 17.0, 0x3a7bd5], [-2.9, 4.0, 0, 1, 1.4, 18.5, 0xf28c38], [-4.0, 12.5, 0, -1, 1.2, 1.5, 0x2bb3b1]].map(([x, z, dx, dz, sp, tp, sh], k) => {
    const Q = makePerson(THREE, { shirt: sh, pants: [0x2b2f3a, 0x3a5a8a, 0xf2e3c6][k % 3], hair: [0x2a1a10, 0xd9c38a, 0x1a1a1a][k % 3], skin: [0xf1c6a5, 0x8d5a3b, 0xd8a47e, 0xb5835a][k % 4], seed: 30 + k }); Q.group.rotation.order = 'YXZ'; A.add(Q.group); return { Q, x, z, dx, dz, sp, tp }; });
  const slObjs = A.children.filter(o => !before.has(o));

  // ---------------- you, Mittens, the filmer, the couple, the pigeon ----------------
  const P = makePerson(THREE, { shirt: 0x3fb5ff, pants: 0xf2e3c6, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xff4f7a, seed: 5 }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const capY = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.6 })); capY.position.y = 0.2; capY.scale.set(1, 0.8, 1); P.headPivot.add(capY);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), capY.material); visor.position.set(0, 0.21, 0.13); visor.scale.set(1.1, 1, 1.2); P.headPivot.add(visor);
  const phoneM = [new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.3, metalness: 0.5 }), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x6fb8ff, emissiveIntensity: 0.9, roughness: 0.2 })];
  function phone() { const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.16, 0.012, 2, 0.008), phoneM[0]); g.add(b); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.145), phoneM[1]); s.position.z = 0.007; g.add(s); g.userData.screen = s; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); return g; }
  const phY = phone(), phF = phone();
  const flashL = new THREE.PointLight(0xffffff, 0, 6); A.add(flashL);
  const mittens = makeCat(THREE, 0xf0a040); mittens.rotation.order = 'YXZ'; mittens.scale.setScalar(1.35); A.add(mittens);
  const filmer = makePerson(THREE, { shirt: 0x8e5bb5, pants: 0x2b2f3a, hair: 0x1a1a1a, skin: 0x8d5a3b, seed: 13 }); filmer.group.rotation.order = 'YXZ'; A.add(filmer.group);
  const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.185, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.8 })); beanie.position.y = 0.17; filmer.headPivot.add(beanie);
  const man = makePerson(THREE, { shirt: 0x1d3f6e, pants: 0x1d1f24, hair: 0x2a1a10, skin: 0xd8a47e, shoe: 0x3a2a1e, seed: 7 }); man.group.rotation.order = 'YXZ'; A.add(man.group);
  const woman = makePerson(THREE, { shirt: 0xff5fa2, pants: 0xff5fa2, hair: 0x8a4a20, skin: 0xb5835a, shoe: 0xffffff, seed: 8 }); woman.group.rotation.order = 'YXZ'; A.add(woman.group);
  { const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), woman.mats.hair); bun.position.set(0, 0.3, -0.12); woman.headPivot.add(bun); const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.5, 20), woman.mats.shirt); skirt.position.y = 0.75; woman.group.add(skirt); }
  const ringBox = new THREE.Group(); { const b = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.06, 0.08, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0xc0182e, roughness: 0.5 })); ringBox.add(b); const r = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.9, roughness: 0.2, emissive: 0x403000 })); r.position.y = 0.05; ringBox.add(r); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.012), new THREE.MeshBasicMaterial({ color: 0xffffff })); gem.position.y = 0.075; ringBox.add(gem); A.add(ringBox); }
  const pigeon = new THREE.Group(); { const gm = new THREE.MeshStandardMaterial({ color: 0x8d94a0, roughness: 0.6 }), nk = new THREE.MeshStandardMaterial({ color: 0x5f8a7a, roughness: 0.4, metalness: 0.3 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), gm); b.scale.set(0.85, 0.8, 1.25); b.position.y = 0.14; pigeon.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), nk); h.position.set(0, 0.29, 0.12); pigeon.add(h); pigeon.userData.head = h;
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x3a3030 })); bk.rotation.x = Math.PI / 2; h.add(bk); bk.position.set(0, -0.01, 0.08);
    for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff9a2a, roughness: 0.3 })); ey.position.set(sx * 0.045, 0.02, 0.04); h.add(ey); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0x000000 })); pu.position.set(0, 0, 0.013); ey.add(pu);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), nk); lid.position.copy(ey.position); lid.rotation.x = -0.9; h.add(lid); }
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.03, 0.16, 2, 0.01), new THREE.MeshStandardMaterial({ color: 0x4a505a })); tl.position.set(0, 0.12, -0.2); tl.rotation.x = 0.3; pigeon.add(tl);
    for (const sx of [-1, 1]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), new THREE.MeshStandardMaterial({ color: 0xd86a6a })); lg.position.set(sx * 0.04, 0.03, 0); pigeon.add(lg); }
    pigeon.traverse(o => { if (o.isMesh) o.castShadow = true; }); pigeon.scale.setScalar(1.5); rex.head.add(pigeon); pigeon.position.set(0, 0.62, 0.55); }
  const blobM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
  const blobs = [0, 1, 2, 3].map(() => { const b = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20).rotateX(-Math.PI / 2), blobM); A.add(b); return b; });

  // ---------------- space, 66 million years ago: the asteroid arrives 7 minutes late ----------------
  const B = new THREE.Scene(); const camB = new THREE.PerspectiveCamera(38, W / H, 50, 4e5);
  const sunB = new THREE.DirectionalLight(0xffffff, 3.0); sunB.position.set(1, 0.25, 0.6); B.add(sunB); B.add(new THREE.AmbientLight(0x4a5468, 0.55)); B.add(stars(THREE, 4000, 150000, 17));
  const RE = 6371; const earthB = makeEarth(THREE, RE, 66); B.add(earthB);
  const rockG = new THREE.IcosahedronGeometry(1, 4); { const p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.18 * Math.sin(v.x * 5.1 + v.y * 3.3) * Math.cos(v.z * 4.2) + 0.08 * Math.sin(v.x * 13 + v.z * 11); p.setXYZ(i, v.x * n, v.y * n * 0.85, v.z * n); } rockG.computeVertexNormals(); }
  const rock = new THREE.Mesh(rockG, new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.95 })); rock.scale.setScalar(520); B.add(rock);
  const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 })); coma.scale.setScalar(2600); B.add(coma);
  const trailN = 60, trailPos = new Float32Array(trailN * 3); const trailG = new THREE.BufferGeometry(); trailG.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Points(trailG, new THREE.PointsMaterial({ map: softTex(THREE), color: 0xffb070, size: 1500, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); trail.frustumCulled = false; B.add(trail);
  const pathG = new THREE.BufferGeometry(); const pathPos = new Float32Array(6); pathG.setAttribute('position', new THREE.BufferAttribute(pathPos, 3));
  const pathL = new THREE.Line(pathG, new THREE.LineDashedMaterial({ color: 0xff5a4a, dashSize: 900, gapSize: 600, transparent: true, opacity: 0.9 })); pathL.frustumCulled = false; B.add(pathL);
  const AST0 = new THREE.Vector3(30000, 34000, -45000), E0 = new THREE.Vector3(-3500, -2600, 0), AST1 = new THREE.Vector3(26000, -24000, 42000);
  const astAt = (u) => tv3.copy(AST0).lerp(E0, clamp(u)).clone().add(u > 1 ? E0.clone().sub(AST0).multiplyScalar(u - 1) : new THREE.Vector3());

  await document.fonts.ready;

  // ---------------- animation ----------------
  function walkPose(Q, ph, amp) { Q.legL.rotation.set(Math.sin(ph) * 0.55 * amp, 0, -0.04); Q.legR.rotation.set(-Math.sin(ph) * 0.55 * amp, 0, 0.04); Q.armL.rotation.set(-Math.sin(ph) * 0.45 * amp, 0, -0.1); Q.armR.rotation.set(Math.sin(ph) * 0.45 * amp, 0, 0.1); Q.group.position.y += Math.abs(Math.cos(ph)) * 0.05 * amp; }
  // rex keyframes during the event: [t, head xyz, yaw, hpitch, jaw, body pitch, crouch]
  const nh = rex.neutralHead(STX, STZ, ROT);
  const HN = [nh[0], nh[1] + PLT, nh[2]];
  const OS = (s, l, y) => { const [x, z] = onStat(s, l); return [x, y, z]; };
  const RK = [
    [0, HN, 0.55, 0.1, 0, 0, 0], [17.0, HN, 0.55, 0.1, 0, 0, 0], [19.6, [HN[0], HN[1] + 0.2, HN[2]], 0.05, 0.45, 0.05, 0.05, 0.1],   // wakes, looks down at you
    [20.5, OS(4.3, -0.3, HN[1] - 0.4), 0.0, 0.2, 1.0, 0.15, 0.2], [21.8, OS(4.4, -0.3, HN[1] - 0.45), 0.0, 0.15, 0.95, 0.15, 0.2],   // ROAR
    [22.6, OS(4.6, 1.8, 4.9), -0.55, 0.45, 0.1, 0.1, 0.1], [24.3, OS(4.8, 2.0, 4.7), -0.65, 0.55, 0.15, 0.12, 0.15],   // looks down at the couple
    [25.2, OS(3.05, -1.3, PLT + 0.8), 0.0, 0.25, 0.05, 0.45, 0.55], [25.75, OS(3.2, -1.3, PLT + 0.78), 0.0, 0.25, 0.12, 0.45, 0.55],     // sniffs Mittens
    [26.05, OS(2.4, -1.0, PLT + 2.2), 0.0, -0.1, 0.5, 0.3, 0.35], [27.4, [HN[0], HN[1] + 0.1, HN[2]], 0.3, 0.05, 0.0, 0, 0],               // swatted, recoils
    [33.0, [HN[0], HN[1] + 0.2, HN[2]], 0.5, 0.05, 0.1, 0, 0], [36.0, [HN[0], HN[1], HN[2]], 0.2, 0.2, 0.05, 0.05, 0.1],
    [37.3, [HX - 2.7, 3.1, HZ + 0.9], -0.45, 0.2, 0.45, 0.3, 0.5], [38.4, [HX - 2.6, 3.0, HZ + 0.85], -0.45, 0.15, 1.0, 0.3, 0.5]];              // behind you, in your selfie
              // behind you, in your selfie
  const rexPose = (t) => { let i = 0; while (i < RK.length - 2 && t > RK[i + 1][0]) i++; const a = RK[i], b = RK[i + 1]; const u = easeInOut(clamp((t - a[0]) / (b[0] - a[0])));
    return { headW: a[1].map((x, j) => lerp(x, b[1][j], u)), yaw: lerp(a[2], b[2], u), hpitch: lerp(a[3], b[3], u), jaw: lerp(a[4], b[4], u), pitch: lerp(a[5], b[5], u), crouch: lerp(a[6], b[6], u) }; };
  const STAT_AFTER = { headW: [HN[0] + 0.3, HN[1] - 0.25, HN[2] - 0.3], yaw: 0.12, hpitch: 0.55, jaw: 0.1, pitch: 0.06, crouch: 0.08 };   // the statue, now looking at you

  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.3, bloomThreshold: 0.9, shake: 0, flash: 0, t, env: 0.45, exposure: 1.17, sat: 1.28 };
    const inEv = t >= EV && t < RET; const story = clamp((t - EV) / SLOW, 0, STORY); out.story = story;
    const tm = t < EV ? t : inEv ? EV + story : EV + STORY + (t - RET);        // world clock (slow motion inside)
    const back = t >= RET ? t - RET : -1;
    const wr = inEv ? waveR(t) : 0; UF.uR.value = wr; forest.visible = inEv && wr > 0.5;
    const fOf = (T, dur) => inEv ? smooth(T, T + dur, t) : 0;

    // ---- the city sinks into the forest ----
    bOrig.forEach((b, k) => { const f = fOf(b.T, 1.8); m4.compose(v.set(b.p.x, b.p.y * (1 - f), b.p.z), q.identity(), sc.set(b.s.x, b.s.y * (1 - f) + 1e-4, b.s.z)); bMesh.setMatrixAt(k, m4); }); bMesh.instanceMatrix.needsUpdate = true;
    instSink.forEach(({ mesh, arr }) => { arr.forEach((b, k) => { const f = fOf(b.T, 1.2); m4.compose(v.set(b.p.x, b.p.y * (1 - f), b.p.z), b.r, sc.set(b.s.x, b.s.y * (1 - f) + 1e-4, b.s.z)); mesh.setMatrixAt(k, m4); }); mesh.instanceMatrix.needsUpdate = true; });
    sinkers.forEach(s => { const f = fOf(s.T, s.dur); s.obj.scale.y = Math.max(1e-4, 1 - f); s.obj.visible = f < 0.999; if (s.y0 !== undefined) s.obj.position.y = s.y0 * (1 - f); });
    // ---- traffic + crowds (they never happened: gone when the front passes) ----
    C.cars.forEach((c, i) => { const z = c.still ? c.z0 : wrap(c.z0 + c.sp * tm, -250, 254); const f = c.hide ? 1 : fOf(arrive(D2(c.x, z)), 0.35); m4.compose(v.set(c.x, 0.02, z), q.setFromEuler(e.set(0, c.ry, 0)), sc.setScalar(Math.max(1e-4, 1 - f))); C.carB.setMatrixAt(i, m4); C.carT.setMatrixAt(i, m4); C.carL.setMatrixAt(i, m4); });
    C.carB.instanceMatrix.needsUpdate = C.carT.instanceMatrix.needsUpdate = C.carL.instanceMatrix.needsUpdate = true;
    C.peds.forEach((p, i) => { const z = wrap(p.z0 + p.dir * p.sp * tm, -200, 200); const f = fOf(arrive(D2(p.x, z)), 0.3); const s = p.s * Math.max(1e-4, 1 - f);
      m4.compose(v.set(p.x, 0.15 + Math.abs(Math.sin(tm * 8 + p.ph)) * 0.05, z), q.setFromEuler(e.set(0, p.dir > 0 ? 0 : Math.PI, 0)), sc.set(s, s, s)); C.pB.setMatrixAt(i, m4); C.pH.setMatrixAt(i, m4); C.pL.setMatrixAt(i, m4); });
    C.pB.instanceMatrix.needsUpdate = C.pH.instanceMatrix.needsUpdate = C.pL.instanceMatrix.needsUpdate = true;
    SL.update(tm, { look: 0, stop: 0 });
    slObjs.forEach(o => { const f = fOf(arrive(D2(o.position.x, o.position.z)), 0.3); o.visible = f < 0.99; if (f > 0) o.scale.setScalar(Math.max(1e-4, 1 - f)); else o.scale.setScalar(1); });
    walkers.forEach(w => { const d = (tm - w.tp) * w.sp; const x = w.x + w.dx * d, z = w.z + w.dz * d; const Q = w.Q; Q.group.position.set(x, 0.17, z); Q.group.rotation.set(0, Math.atan2(w.dx, w.dz), 0); walkPose(Q, tm * 7.2 + w.tp, 1); Q.headPivot.rotation.set(0, 0, 0);
      setFace(Q, { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0, 0] }); life(Q, tm, 0.6); });
    // ---- the forest grows ----
    veg.forEach(({ mesh, list }) => { list.forEach((p, k) => { const g = inEv ? backOut((t - p.T) / 0.9) : 0; const s = Math.max(1e-4, g) * p.s; const sway = inEv ? Math.sin(t * 0.9 + p.x) * 0.03 : 0;
      m4.compose(v.set(p.x, g > 0 ? p.y : -50, p.z), q.setFromEuler(e.set(sway, p.ry, sway * 0.6)), sc.set(s, s, s)); mesh.setMatrixAt(k, m4); }); mesh.instanceMatrix.needsUpdate = true; });

    // ---- the T. rex ----
    const alive = inEv ? smooth(16.6, 19.2, t) : 0;
    rex.skin.color.copy(rexStatue).lerp(rexAlive, alive); rex.skin.roughness = lerp(0.32, 0.72, alive); rex.belly.color.copy(bellyStatue).lerp(bellyAlive, alive); rex.eyeW.color.set(alive > 0.5 ? 0xffe38a : 0xb9b49a);
    rex.crest.scale.setScalar(Math.max(1e-3, backOut((alive - 0.3) / 0.7))); rex.hcrest.scale.setScalar(Math.max(1e-3, backOut((alive - 0.4) / 0.6)));
    rex.pups.forEach(p => p.visible = alive > 0.35);
    let rp = inEv ? rexPose(t) : back >= 0 ? STAT_AFTER : rexPose(0);
    const breathe = alive * Math.sin(t * 1.6) * 0.04, blink = alive > 0.9 ? pulse(t, 19.1, 0.3) + pulse(t, 23.4, 0.25) + pulse(t, 28.6, 0.25) + pulse(t, 32.2, 0.25) : 0;
    const rshake = inEv ? 0.06 * Math.sin(t * 40) * smooth(20.4, 20.6, t) * (1 - smooth(21.6, 21.9, t)) : 0;
    rex.pose({ x: STX, y: PLT, z: STZ, ry: ROT, crouch: rp.crouch, pitch: rp.pitch + breathe, roll: rshake, headW: [rp.headW[0], rp.headW[1] + breathe * 2, rp.headW[2]], yaw: rp.yaw, hpitch: rp.hpitch, hroll: rshake * 2, jaw: rp.jaw, blink: alive < 0.35 ? 0.0 : blink, tailT: t * alive, tailAmp: alive, alive });
    out.rexHead = [rp.headW[0], rp.headW[1], rp.headW[2]];
    // ---- the speculative dinosaurs walking through the new forest ----
    raptors.forEach((d, k) => { const show = inEv && t > 17.2; d.grp.visible = show; if (!show) return; const ph = (t - 17.2) * 2.2 + k * 1.7; const x = -34 + (t - 17.2) * 1.9 + k * 3.5, z = 15.6 + k * 1.4 - (t - 17.2) * 0.05;
      const hw = d.neutralHead(x, z, Math.PI / 2 - 0.1, 0.25, 3.6, 0.9); d.pose({ x, z, ry: Math.PI / 2 - 0.1, walk: ph, walkAmp: 1, pitch: 0.12, headW: [hw[0], hw[1] + Math.sin(ph * 2) * 0.05, hw[2]], yaw: Math.sin(ph * 0.5) * 0.3, hpitch: 0.1, jaw: k === 1 && t > 26 && t < 27 ? 0.6 : 0.05, tailT: t * 1.5, tailAmp: 1.5 }); });
    sauros.forEach((s, k) => { s.visible = inEv && t > 28; s.position.copy(s.userData.p0); s.position.x += Math.sin(s.rotation.y) * (t - 28) * 1.4; s.position.z += Math.cos(s.rotation.y) * (t - 28) * 1.4; });
    pteroG.visible = inEv && t > 18;
    pteros.forEach((p, k) => { const u = p.userData; const a = u.a0 + t * u.sp; p.position.set(STX + u.cx + Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + k) * 3, STZ + u.cz + Math.sin(a) * u.r); p.rotation.set(0, -a, Math.sin(a) * 0.3); const fl = Math.sin(t * 3.2 + k) * 0.5; u.pl.rotation.z = fl; u.pr.rotation.z = -fl; });

    // ---- you: the selfie (arm up), the shock, the selfie that finally happens ----
    { const G = P.group; G.position.set(HX, 0.17, HZ); let ry = Math.PI / 2 + 0.25, aL = [-1.95, 0, -0.38], aR = [-0.1, 0, 0.12], head = [0.05, 0.15, 0.08], face = { brows: 'neutral', eyes: 1.05, mouth: 'smile', look: [0.3, 0] };
      P.torso.rotation.set(0, 0, 0.06); P.legL.rotation.set(0, 0, -0.06); P.legR.rotation.set(0, 0, 0.06);
      if (t < EV) { const pose = smooth(0.6, 1.4, t); aL = [lerp(-0.2, -1.95, pose), 0, lerp(-0.1, -0.38, pose)]; const peace = smooth(3.2, 3.6, t) * (1 - smooth(6.0, 6.4, t)); aR = [-0.1 - 2.5 * peace, 0, 0.12 + 0.45 * peace];
        face = t > 6.4 ? { brows: 'up', eyes: 1.3, mouth: 'o', look: [0, 0.4] } : t > 3.2 ? { brows: 'up', eyes: 0.8, mouth: 'smile', look: [0.4, 0.2] } : face; head = [0.05, 0.15 + 0.1 * Math.sin(t * 0.8), 0.08 + 0.1 * peace]; }
      else if (t < RET) { const look = smooth(19.8, 20.4, t); head = [lerp(0.05, -0.3, look), lerp(0.15, 1.0, look), 0]; ry += 0.35 * look; aL = [-1.95 + 0.8 * smooth(20.3, 20.8, t), 0, -0.38];
        face = t < 15 ? { brows: 'up', eyes: 1.3, mouth: 'o', look: [0, 0.4] } : t < 19.8 ? { brows: 'worried', eyes: 1.2, mouth: 'flat', look: [-0.6, 0.6] } : { brows: 'up', eyes: 1.7, mouth: 'open', open: 1.7, look: [-0.7, 0.7] };
        if (t > 22 && t < 36.1) { head = [-0.4, 0.9, 0]; aR = [-1.2, 0, 0.4]; aL = [-1.1, 0, -0.5]; P.legL.rotation.x = -0.15; }
        if (t >= FACE0) { const up = smooth(FACE0, FACE0 + 0.5, t); aL = [-1.95, 0, -0.38]; head = [0.05, 0.15, 0.08]; ry = Math.PI / 2 + 0.25; face = t < 37.2 ? { brows: 'up', eyes: 0.8, mouth: 'smile', look: [0.4, 0.2] } : { brows: 'up', eyes: 1.8, mouth: 'open', open: 1.8, look: [0.4, 0.3] }; void up; } }
      else { const snap = smooth(2.0, 2.4, back), turn = smooth(3.0, 3.6, back); aL = [-1.95, 0, -0.38]; head = [0.05 - 0.2 * turn, 0.15 + 1.1 * turn, 0.05]; ry = Math.PI / 2 + 0.25 + 0.3 * turn;
        face = back < 1.6 ? { brows: 'worried', eyes: 1.4, mouth: 'o', look: [0, 0.3] } : back < 3.0 ? { brows: 'up', eyes: 0.8, mouth: 'smile', look: [0.4, 0.2] } : { brows: 'up', eyes: 1.5, mouth: 'flat', look: [-0.8, 0.5] }; void snap; }
      G.rotation.set(0, ry, 0); P.armR.rotation.set(...aR); P.armL.rotation.set(...aL); P.headPivot.rotation.set(...head); setFace(P, face); life(P, tm, inEv ? 0.4 : 0.8);
      G.updateMatrixWorld(true); P.armL.userData.end.getWorldPosition(tv); phY.position.copy(tv).add(v.set(0.02, 0.07, 0)); phY.lookAt(P.headPivot.getWorldPosition(tv2)); phY.rotateY(Math.PI);
      const shot = back >= 0 ? pulse(back, 2.05, 0.25) : 0; flashL.position.copy(phY.position); flashL.intensity = 30 * shot; out.phone = phY.position.toArray(); out.youHead = tv2.toArray(); }
    // ---- Mittens: sleepy -> shock (it's alive) -> annoyed (sniffed), swat -> unimpressed -> smug ----
    { let mood = 'sleepy', ry = 2.0, rx = 0, sw = 0;
      if (t < EV) { mood = t > 2.0 && t < 5.0 ? 'happy' : 'sleepy'; ry += 0.2 * Math.sin(t * 0.8); }
      else if (t < RET) { mood = t < 17.5 ? 'unimpressed' : t < 22.0 ? 'shock' : t < 24.9 ? 'scared' : t < 26.5 ? 'annoyed' : t < 30 ? 'smug' : 'unimpressed'; ry = t > 24.6 && t < 27 ? 0.1 : 2.0; sw = pulse(t, 25.65, 0.5); }
      else { mood = back < 1.0 ? 'shock' : back < 3.5 ? 'unimpressed' : 'smug'; ry = 2.0; }
      mittens.position.set(MX, PLT, MZ); mittens.rotation.set(rx, ry, 0); setCatFace(mittens, mood, 0.25); catLife(mittens, t, 1);
      const Cc = mittens.userData.cat; Cc.legs[3].rotation.x = -2.2 * Math.sin(Math.PI * sw); Cc.legs[3].position.y = 0.07 + 0.18 * Math.sin(Math.PI * sw);
      out.cat = [MX, PLT + 0.45, MZ]; }
    // ---- the filmer: films the statue, keeps filming the T. rex, then finds his video is gone ----
    { const Q = filmer; Q.group.position.set(FLX, 0.17, FLZ); const after = back >= 0; const check = after ? smooth(5.2, 5.8, back) : 0;
      Q.group.rotation.set(0, -Math.PI / 2 - 0.2 + 0.6 * check, 0); Q.armR.rotation.set(-1.45 + 0.4 * check, 0, -0.25); Q.armL.rotation.set(-1.4 + 0.4 * check, 0, 0.3); Q.headPivot.rotation.set(0.08 + 0.45 * check, 0, 0);
      Q.legL.rotation.set(inEv ? -0.15 : 0, 0, -0.04); Q.legR.rotation.set(inEv ? 0.2 : 0, 0, 0.04);
      setFace(Q, after && back > 5.8 ? { brows: 'angry', eyes: 0.8, mouth: 'grit', look: [0, -0.8] } : inEv && t > 17 ? { brows: 'up', eyes: 1.4, mouth: 'smile', look: [0, 0.2] } : { brows: 'neutral', eyes: 0.9, mouth: 'flat', look: [0, 0] }); life(Q, tm, 0.7);
      if (after && back > 6.1) { Q.armL.rotation.set(-0.5, 0, 0.9 + 0.2 * Math.sin(back * 6)); Q.headPivot.rotation.set(0.2, 0.25 * Math.sin(back * 3), 0); }
      Q.group.updateMatrixWorld(true); Q.armR.userData.end.getWorldPosition(tv); Q.armL.userData.end.getWorldPosition(tv2); phF.position.copy(tv).add(tv2).multiplyScalar(0.5).add(v.set(0, 0.06, 0)); phF.rotation.set(0, Q.group.rotation.y + Math.PI, Math.PI / 2 * (1 - check)); phF.rotateX(-0.3 * check);
      out.filmer = [FLX, 1.7, FLZ]; }
    // ---- bad timing: he kneels with the ring at the exact wrong second; she says yes after ----
    { const Mn = man, Wm = woman; const kneel = t < EV ? smooth(3.0, 4.2, t) : 1; const yes = back >= 0 ? smooth(4.0, 4.6, back) : 0; const up = back >= 0 ? smooth(4.6, 5.4, back) : 0;
      Mn.group.position.set(CPX, 0.17 - 0.38 * kneel * (1 - up), CPZ); Mn.group.rotation.set(0, 0.25, 0); Mn.legL.rotation.set(-1.55 * kneel * (1 - up), 0, -0.05); Mn.legR.rotation.set(0.0, 0, 0.05); Mn.torso.rotation.set(0.0, 0, 0);
      const kneelKnee = Mn.legR; kneelKnee.rotation.x = 0.9 * kneel * (1 - up); Mn.armR.rotation.set(lerp(-0.2, -1.35, kneel) * (1 - up) - 2.6 * up * 0.4, 0, -0.1 - 0.5 * up); Mn.armL.rotation.set(-0.3 * kneel * (1 - up), 0, 0.2 + 0.5 * up);
      Mn.headPivot.rotation.set(-0.25 * kneel * (1 - up), 0, 0); setFace(Mn, up > 0.3 ? { brows: 'up', eyes: 1.0, mouth: 'smile' } : { brows: 'up', eyes: 1.05, mouth: 'smile', look: [0, 0.6] }); life(Mn, tm, 0.6);
      Mn.group.updateMatrixWorld(true); Mn.armR.userData.end.getWorldPosition(tv); ringBox.position.copy(tv).add(v.set(0, 0.05, 0.03)); ringBox.rotation.set(0, 0.25, 0); ringBox.visible = up < 0.5;
      const gasp = t >= EV && t < RET ? smooth(21.0, 22.0, t) : 0; Wm.group.position.set(CPX + 0.55, 0.17, CPZ + 1.25); Wm.group.rotation.set(0, Math.PI + 0.35 - 1.3 * gasp * 0, 0);
      Wm.armL.rotation.set(lerp(-2.2, -2.9, gasp) * (t > 3.6 || t >= EV ? 1 : smooth(3.0, 3.6, t)) * (1 - yes) + yes * -2.8, 0, lerp(0.35, 0.1, gasp) + 0.5 * yes); Wm.armR.rotation.set(lerp(-2.2, -2.9, gasp) * (t > 3.6 || t >= EV ? 1 : smooth(3.0, 3.6, t)) * (1 - yes) + yes * -2.8, 0, -lerp(0.35, 0.1, gasp) - 0.5 * yes);
      Wm.headPivot.rotation.set(-0.3 * gasp + 0.25 * (1 - gasp) * (1 - yes), 0.8 * gasp, 0); Wm.group.position.y += yes > 0 && yes < 1 ? Math.sin(yes * Math.PI) * 0.15 : 0;
      setFace(Wm, gasp > 0.5 ? { brows: 'up', eyes: 1.7, mouth: 'open', open: 1.6, look: [0, 0.8] } : yes > 0.3 ? { brows: 'up', eyes: 0.7, mouth: 'smile' } : { brows: 'up', eyes: 1.3, mouth: 'o', look: [0, -0.4] }); life(Wm, tm, 0.7);
      out.couple = [CPX + 0.3, 1.2, CPZ + 0.6]; }
    // ---- the pigeon: rides the T. rex's head, completely calm ----
    { const ph = pigeon.userData.head; ph.position.z = 0.12 + 0.03 * Math.sin(tm * (inEv ? 3 : 9)); ph.rotation.y = inEv ? 0.6 * Math.sin(t * 0.7) : 0; pigeon.rotation.y = inEv && t > 27 ? -1.2 * smooth(27.2, 28.0, t) : 0; }
    // contact shadows
    [[HX, HZ], [FLX, FLZ], [CPX, CPZ], [CPX + 0.55, CPZ + 1.25]].forEach(([x, z], k) => { blobs[k].position.set(x + 0.05, 0.19, z); });

    // ---------------- camera: one continuous move per place, three cuts (space, back, your face) ----------------
    let c, g, fov = 42, shC = [HX - 4, HZ + 2, 22], focusY = 0.56, focusH = 0.22, scene = A, camera = cam, dof = 0.5;
    if (t < SPACE0) {                          // 1. across the avenue: taxis, the dog walker, the kid; push in to you, the statue, Mittens
      c = keys([[0, [19.6, 1.8, -2.8]], [3.9, [18.6, 1.95, -1.6]], [5.4, [10.0, 3.3, -0.6]], [EV, [-1.6, 2.0, -0.4]]], t); g = keys([[0, [-10.2, 3.6, 3.4]], [3.9, [-10.2, 3.5, 3.2]], [EV, [-10.6, 3.5, 3.0]]], t); fov = keys([[0, [32]], [3.9, [28]], [EV, [47]]], t)[0];
      focusY = 0.6; focusH = lerp(0.32, 0.24, smooth(3.9, EV, t)); dof = lerp(0.2, 0.5, smooth(3.9, EV, t));
    } else if (t < SPACE1) {                   // 2. space, 66 million years ago
      scene = B; camera = camB; dof = 0; out.bloom = 0.7; out.bloomThreshold = 0.55; out.env = 0; out.exposure = 1.12; out.vignette = 0.5;
      const u = (t - SPACE0) / (SPACE1 - SPACE0); const ue = easeInOut(clamp((u - 0.12) / 0.6));
      earthB.position.set(E0.x + 9800 * ue, E0.y, E0.z); earthB.rotation.y = 0.6 + u * 0.4;
      const au = lerp(0.0, 1.55, clamp((u - 0.02) / 0.93)); const ap = astAt(au); rock.position.copy(ap); rock.rotation.set(u * 2, u * 3, 0); coma.position.copy(ap);
      for (let k = 0; k < trailN; k++) { const p = astAt(au - k * 0.006); trailPos.set([p.x, p.y, p.z], k * 3); } trailG.attributes.position.needsUpdate = true;
      const pe = E0.clone(); pathPos.set([ap.x, ap.y, ap.z, pe.x, pe.y, pe.z]); pathG.attributes.position.needsUpdate = true; pathL.computeLineDistances(); pathL.material.opacity = 0.9 * (1 - smooth(0.5, 0.7, u)) * smooth(0.04, 0.12, u); pathL.visible = au < 1;
      camB.position.set(lerp(600, 1400, u), lerp(800, 0, u), 54000); camB.lookAt(1200, -1500, 0); camB.updateProjectionMatrix();
      out.ast = ap.toArray(); out.earth = earthB.position.toArray(); out.u = u;
    } else if (t < 29.4) {                     // 3. back on the plaza: the forest spreads, the statue wakes, the couple, Mittens, the pigeon
      c = keys([[SPACE1, [-1.0, 2.3, -0.8]], [16.2, [-2.4, 2.1, -0.2]], [19.6, [-5.4, 2.5, 0.2]], [21.9, [-5.8, 2.9, 0.0]], [24.3, [-3.4, 1.0, 5.2]], [25.2, [-8.0, 1.6, 4.9]], [26.4, [-8.5, 1.9, 4.6]], [29.4, [-7.6, 7.4, 1.8]]], t);
      g = keys([[SPACE1, [-12.0, 3.4, 5.2]], [16.2, [-12.5, 4.0, 5.6]], [19.6, [HN[0], HN[1] - 0.8, HN[2]]], [21.9, [HN[0] + 0.6, HN[1] - 0.9, HN[2] - 0.4]], [24.3, [-7.6, 2.4, 6.4]], [25.2, [-11.2, PLT + 0.5, 3.1]], [26.4, [-11.5, PLT + 0.55, 3.2]], [29.4, [HN[0], HN[1] + 0.5, HN[2]]]], t);
      fov = keys([[SPACE1, [44]], [19.6, [44]], [21.9, [48]], [24.3, [55]], [25.2, [46]], [26.4, [44]], [29.4, [40]]], t)[0]; focusY = 0.55; focusH = 0.24; shC = [-10, 7, 30];
      out.shake = 0.5 * smooth(20.4, 20.6, t) * (1 - smooth(21.5, 21.9, t));
    } else if (t < FACE0) {                    // 4. rise: the forest swallows the whole city — Empire State Building included
      c = keys([[29.4, [-7.6, 7.4, 1.8]], [31.0, [-22, 40, 40]], [33.2, [-60, 190, 160]], [FACE0, [-80, 310, 250]]], t); g = keys([[29.4, [HN[0] - 0.3, HN[1] + 0.6, HN[2]]], [31.0, [-4, 2, -10]], [33.2, [90, 60, -230]], [FACE0, [140, 90, -330]]], t);
      fov = keys([[29.4, [40]], [31.0, [50]], [FACE0, [46]]], t)[0]; shC = [lerp(-10, 120, smooth(30, 34, t)), lerp(7, -200, smooth(30, 34, t)), lerp(30, 520, smooth(30, 33, t))]; focusY = 0.55; focusH = 0.4; dof = lerp(0.4, 0.15, smooth(30, 32, t));
    } else {                                   // 5. cut: the selfie view — you, and the T. rex right behind you; then the aftermath
      const yh = out.youHead, fx = Math.sin(Math.PI / 2 + 0.25), fz = Math.cos(Math.PI / 2 + 0.25); const ph = [yh[0] + fx * 1.55, yh[1] + 0.25, yh[2] + fz * 1.55 - 0.1];
      if (t < RET + 1.2) { c = [ph[0], ph[1], ph[2]]; g = [yh[0] - fx * 2.2, yh[1] + 0.75, yh[2] - fz * 2.2 + 0.2]; fov = 56; focusY = 0.6; focusH = 0.35; }
      else { const u = t; c = keys([[RET + 1.2, [ph[0], ph[1], ph[2]]], [RET + 2.4, [-3.4, 1.9, -0.6]], [RET + 5.4, [-3.9, 1.85, -0.2]], [RET + 6.4, [-7.4, 1.7, 10.8]], [CARDT, [-7.6, 1.65, 10.6]]], u);
        g = keys([[RET + 1.2, [yh[0] - fx * 2.2, yh[1] + 0.75, yh[2] - fz * 2.2 + 0.2]], [RET + 2.4, [-10.8, 3.0, 3.6]], [RET + 5.4, [-10.9, 3.1, 3.7]], [RET + 6.4, [FLX + 0.4, 1.5, FLZ - 0.3]], [CARDT, [FLX + 0.4, 1.5, FLZ - 0.3]]], u);
        fov = keys([[RET + 1.2, [56]], [RET + 2.4, [44]], [RET + 6.4, [44]]], u)[0]; focusY = 0.57; focusH = 0.26; }
      shC = [HX, HZ + 2, 14];
    }
    if (scene === A) { setShadow(...shC); cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix(); }
    out.scene = scene; out.camera = camera; out.dof = dof; out.focusY = focusY; out.focusH = focusH;
    out.flash = 0.2 * pulse(t, EV, 0.3) + 0.2 * pulse(t, SPACE1, 0.25) + 0.35 * pulse(t, RET, 0.35) + (back >= 0 ? 0.35 * pulse(back, 2.05, 0.2) : 0); out.shake = Math.max(out.shake, 0.4 * pulse(t, RET, 0.5));
    out.label = { esb: [ESB[0], 443 * Math.max(0.05, 1 - fOf(32.7, 2.2)), ESB[1]] };
    return out;
  }

  // ---------------- on-screen text ----------------
  const lines = [
    [0.3, 2.95, "You're about to take a selfie with a fake T.\u00a0rex."],
    [3.0, 7.4, 'In a few seconds, history gets one tiny edit. The asteroid misses.'],
    [7.6, 12.65, 'Sixty-six million years ago, it arrives seven minutes late. Earth has moved on.'],
    [13.1, 16.05, 'No asteroid. The dinosaurs just keep going.'],
    [16.2, 19.95, "Sixty-six million more years. Nobody knows what they'd look like."],
    [20.1, 22.0, 'But this one definitely has teeth.'],
    [22.2, 24.4, 'He picked this exact moment to propose.'],
    [24.6, 26.35, 'Mittens has met bigger dogs.'],
    [26.5, 29.3, 'The pigeon is fine. Pigeons are dinosaurs.'],
    [29.5, 32.45, 'Mammals stay small. Badger-sized, at best.'],
    [32.6, 36.0, 'So people probably never happen. Neither does this city.'],
    [36.3, 38.1, 'This was your idea, by the way.'],
    [38.7, 40.4, 'Back to normal. Mostly.'],
    [40.6, 43.9, "You wanted a selfie with a T.\u00a0rex. It's still looking at you."],
    [44.1, 46.6, 'His video? Gone. He blames the lighting.'],
  ];
  const CARD_LINE = [47.4, 52.1, 'The strangest part? Almost anywhere else on Earth, it might not have killed them at all.'];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function italic(ctx, W, H, t, a, b, txt, y = 0.70) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.3, (b - t) / 0.3));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 50px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * y + i * 64); ctx.fillText(l, W / 2, H * y + i * 64); }); ctx.restore(); }
  function worldLabel(ctx, pos, title, num, camO) { if (!pos) return; const cm = camO || cam; tv.set(pos[0], pos[1], pos[2]); cm.updateMatrixWorld(); tv.project(cm);
    if (tv.z > 1 || Math.abs(tv.x) > 0.95 || tv.y < -0.5 || tv.y > 0.9) return;
    const x = (tv.x * 0.5 + 0.5) * 1080, y = (1 - (tv.y * 0.5 + 0.5)) * 1920;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    const lx = clamp(x + 14, 24, 1080 - w - 24), ly = clamp(y, 560, 1150); ctx.translate(lx - (x + 14), ly - y);
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x + 14, y - 34, w, 68, 14); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 26, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 26, y + 16); ctx.restore(); }
  function tag(ctx, x, y, title, num, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x, y - 34, w, 68, 14); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 12, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 12, y + 16); ctx.restore(); }
  const win = (t, a, b) => smooth(a, a + 0.3, t) * (1 - smooth(b - 0.3, b, t));

  function hud(ctx, t, st) { const W = 1080, H = 1920;
    if (t < CARDT) {
      drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF THE ASTEROID', size: 80 }, { text: 'HAD MISSED THE DINOSAURS?', size: 76, accent: true }], t, '#ffd23f', { start: 0.3, outAt: 6.0 });
      const yC = lerp(H * 0.268, H * 0.105, smooth(6.0, 6.6, t)); const f3 = (x) => `0:0${Math.max(0, x).toFixed(3)}`;
      const o = t < EV ? { label: 'THE ASTEROID MISSES IN', value: f3(EV - t), color: '#ffd23f' } : t < RET ? { label: 'REALITY RETURNS IN', value: f3(STORY - st.story), color: '#7dff9a' } : { label: 'REALITY:', value: 'BACK', color: '#ffd23f' };
      drawSideCounter(ctx, W, H, { y: yC, ...o, note: t < EV ? 'real time' : t < RET ? 'slow motion · 6x' : '', bump: Math.max(pulse(t, EV, 0.4), pulse(t, RET, 0.4)), glow: o.color });
      for (const [a, b, txt] of lines) italic(ctx, W, H, t, a, b, txt);
      if (t > 3.6 && t < 6.6) worldLabel(ctx, [STX + 2, 6.2, STZ], 'T. REX (FIBREGLASS)', 'real ones: up to 12 m long');
      if (t > SPACE0 && t < SPACE1) { tag(ctx, 56, 470, '66 MILLION YEARS AGO', 'Earth, minus seven minutes', win(t, SPACE0 + 0.2, SPACE1));
        if (st.ast && st.u < 0.8) worldLabel(ctx, st.ast, 'THE ASTEROID', 'about 10 km wide (drawn bigger)', camB);
        if (st.u > 0.55) tag(ctx, 56, 560, 'EARTH', 'moves 30 km every second', win(t, SPACE0 + 0.55 * (SPACE1 - SPACE0), SPACE1)); }
      if (t > 32.6 && t < 35.9) worldLabel(ctx, st.label.esb, 'EMPIRE STATE BUILDING', '443 m · never built');
      if (t > 29.6 && t < 32.4) tag(ctx, 56, 470, 'BIGGEST DINOSAUR-AGE MAMMAL', 'about the size of a badger', win(t, 29.6, 32.4));
    }
    if (t >= CARDT) { const a = smooth(CARDT, CARDT + 0.6, t); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `500 58px ${FS}`; ctx.fillText('What if the asteroid', W / 2, H * 0.32); ctx.fillStyle = '#ffd23f'; ctx.fillText('had missed the dinosaurs?', W / 2, H * 0.32 + 76);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `600 23px ${FONT}`; ctx.fillText('≈10 km ASTEROID  ·  66 MILLION YEARS AGO  ·  ≈75% OF SPECIES LOST', W / 2, H * 0.32 + 150); ctx.fillText('ONLY ≈13% OF EARTH’S SURFACE COULD HAVE CAUSED IT (KAIHO & OSHIMA, 2017)', W / 2, H * 0.32 + 186);
      ctx.restore();
      italic(ctx, W, H, t, CARD_LINE[0], CARD_LINE[1] + 1.0, CARD_LINE[2], 0.47);
      ctx.save(); ctx.globalAlpha = smooth(CARDT + 4.4, CARDT + 5.0, t); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.font = `italic 600 46px ${FS}`; ctx.fillText('What should we try next?', W / 2, H * 0.72); ctx.fillStyle = '#ffd23f'; ctx.font = `800 30px ${FONT}`; ctx.fillText('TELL US IN THE COMMENTS', W / 2, H * 0.72 + 66); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
