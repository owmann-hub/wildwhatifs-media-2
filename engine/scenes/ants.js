import { clamp, lerp, smooth, easeOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, softTex, setFace, life, drawTitleTimed, drawTag, drawBubble, RoundedBoxGeometry, stars, makeEarth } from './lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 24 episode: "What if one ant doubled every minute?"  (Nov 20 STANDARD)
// HUMAN PART: a picnic blanket in a town park, golden hour. One ant lands on your sandwich; you say "ONE ANT IS FINE."
//   Cast: THE UNBOTHERED PERSON (bench behind you, keeps eating his own sandwich) and BAD TIMING (a friend arrives with a
//   birthday cake - "SURPRISE!" - right as the pile swallows the picnic). Mittens (he) beside you on the blanket.
//   Milestones next to the pile: min 17 heavier than your sandwich, min 22 heavier than Mittens, min 26 heavier than you.
// BIG PART (clean): the ant pile on an empty golden meadow with one real-size object beside it: elephant (32), blue whale (37),
//   Eiffel Tower (43), all ants on Earth (55), all 8 billion humans (58); then space: the ant ball on Earth: all the oceans (90,
//   pulled round), the Moon (95), Earth (102), Jupiter (110), the Sun (120 = two hours), the heaviest known star R136a1 (128).
//   The counter keeps doubling to the last frame. Mittens cam (you + Mittens still on the blanket, on top of the ants).
// All times are VIDEO time (tt). First 1.2 s = POV teaser showing the last frame (so the video loops).
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const TEASER = 1.2, TOT = 38.9, CUT = 20.0, CUT2 = 27.3;
const ANT_KG = 2e-6;
// [minute, video time, label, sub]
const MIL = [[17, 12.4, 'HEAVIER THAN YOUR SANDWICH', 'sandwich ≈ 150 g'], [22, 14.85, 'HEAVIER THAN MITTENS', 'a cat ≈ 4.5 kg'], [26, 17.45, 'HEAVIER THAN YOU', 'you ≈ 75 kg'],
  [32, 20.2, 'ELEPHANT', 'elephant 6 t'], [37, 21.25, 'BLUE WHALE', 'blue whale 150 t'], [43, 22.3, 'EIFFEL TOWER', 'tower 10,100 t'],
  [55, 23.9, 'ALL ANTS ON EARTH', 'real ones: 20 quadrillion'], [58, 25.75, 'ALL 8 BILLION HUMANS', 'all of us ≈ 400 million t'],
  [90, 27.9, 'ALL THE OCEANS', 'gravity pulls it round'], [95, 29.3, 'THE MOON', ''], [102, 30.35, 'EARTH', ''], [110, 32.0, 'JUPITER', ''],
  [120, 33.7, 'THE SUN', 'two hours'], [128, 36.6, 'HEAVIEST STAR KNOWN', 'R136a1 ≈ 200 suns']];
const KF = [[6.0, 0], ...MIL.map(m => [m[1], m[0]]), [TOT + 0.05, 130.4]];
function minAt(tt) { if (tt <= KF[0][0]) return 0; for (let i = 0; i < KF.length - 1; i++) if (tt < KF[i + 1][0]) return lerp(KF[i][1], KF[i + 1][1], (tt - KF[i][0]) / (KF[i + 1][0] - KF[i][0])); return KF[KF.length - 1][1]; }
const massAt = (n) => Math.pow(2, n) * ANT_KG;
const rHemi = (n) => Math.cbrt(3 * massAt(n) / 1000 / (2 * Math.PI));
const rBall = (n) => Math.cbrt(3 * massAt(n) / 1000 / (4 * Math.PI));
export { TOT, MIL, minAt };

export async function create({ THREE, W, H }) {
  const R = rng(2411);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler(), tv = new THREE.Vector3(), col = new THREE.Color();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, s = null) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s ? sc.set(...s) : sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
  const CY = (a, b, h, n = 16) => new THREE.CylinderGeometry(a, b, h, n), SP = (r, a = 20, b = 14) => new THREE.SphereGeometry(r, a, b);
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function signTex(lines, bg, fg, w = 512, h = 160) { return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => { let fs = h * (lines.length > 1 ? 0.36 : 0.56); g.font = `900 ${fs}px ${FONT}`; const mw = g.measureText(t).width; if (mw > w * 0.86) { fs *= w * 0.86 / mw; g.font = `900 ${fs}px ${FONT}`; } g.fillText(t, w / 2, h * (lines.length > 1 ? 0.3 + i * 0.42 : 0.54)); }); }); }

  // ---------- ant swarm texture (for the pile / the ant ball) ----------
  function antTex(seed, w = 1024, h = 512, n = 5200) { return canvasTex(w, h, (g) => { g.fillStyle = '#140904'; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let k = 0; k < n; k++) { const x = r() * w, y = r() * h, a = r() * 6.28, s = 0.7 + r() * 0.6; const c = 60 + r() * 70;
      g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.fillStyle = `rgb(${c + 40},${c * 0.5},${c * 0.28})`;
      g.beginPath(); g.ellipse(-5, 0, 4.2, 2.8, 0, 0, 7); g.ellipse(0.5, 0, 2.2, 1.7, 0, 0, 7); g.ellipse(4.5, 0, 2.6, 2.3, 0, 0, 7); g.fill();
      g.strokeStyle = `rgba(20,10,6,0.8)`; g.lineWidth = 0.8; g.beginPath(); for (const sx of [-1, 1]) for (const lx of [-1.5, 0.5, 2]) { g.moveTo(lx, 0); g.lineTo(lx + (lx - 0.5) * 0.8, sx * 4.5); } g.stroke();
      g.fillStyle = 'rgba(255,225,190,0.6)'; g.beginPath(); g.arc(-5.5, -1, 1.3, 0, 7); g.fill(); g.restore(); } }); }
  const swarmT = antTex(5); swarmT.wrapS = swarmT.wrapT = THREE.RepeatWrapping;
  const pileM = new THREE.MeshStandardMaterial({ map: swarmT, bumpMap: swarmT, bumpScale: 2, roughness: 0.5, metalness: 0.05, color: 0xffffff });

  // =====================================================================================================
  // SCENE A: the park picnic (metres)
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(48, W / H, 0.02, 3000);
  const fogC = new THREE.Color(0xe8c49a); A.fog = new THREE.FogExp2(fogC.getHex(), 0.012);
  A.add(new THREE.HemisphereLight(0xcfe0ff, 0x7a8a50, 0.85));
  const SUND = new THREE.Vector3(0.55, 0.42, 0.72).normalize();
  const sun = new THREE.DirectionalLight(0xffc98a, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.radius = 3; A.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xffe2c0, 0.9); fill.position.set(0.5, 1.2, 3); A.add(fill);
  const sky = makeSkyDome(THREE, 0x5d86c8, 0xffcf96, [SUND.x, SUND.y, SUND.z]); sky.scale.setScalar(2500); A.add(sky);
  const grassT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5f8f35'; g.fillRect(0, 0, w, h); const r = rng(9); for (let k = 0; k < 9000; k++) { const x = r() * w, y = r() * h, l = 3 + r() * 7; const c = r(); g.strokeStyle = c < 0.5 ? `rgba(130,180,70,0.7)` : `rgba(60,100,30,0.6)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - l); g.stroke(); } });
  grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping; grassT.repeat.set(300, 300);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: grassT, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'grass'; A.add(ground);
  // gravel path
  { const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 400), M(0xcdb58f, 1)); path.rotation.set(-Math.PI / 2, 0, 0.35); path.position.set(-4.5, 0.004, -6); path.receiveShadow = true; A.add(path); }
  // picnic blanket (red/white check)
  const blanketT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(214,40,50,0.75)'; for (let i = 0; i < 8; i++) { if (i % 2) { g.fillRect(i * 32, 0, 32, h); g.fillRect(0, i * 32, w, 32); } } g.fillStyle = 'rgba(160,20,30,0.5)'; for (let i = 1; i < 8; i += 2) for (let j = 1; j < 8; j += 2) g.fillRect(i * 32, j * 32, 32, 32); });
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.008, 1.9), new THREE.MeshStandardMaterial({ map: blanketT, roughness: 0.9 })); blanket.position.set(0, 0.004, 0); blanket.receiveShadow = true; blanket.name = 'blanket'; A.add(blanket);
  // sandwich on a plate (S), basket, lemonade
  const S = new THREE.Vector3(0.38, 0, 0.55);
  const sandwich = new THREE.Group(); { const B = Builder(); B.add(CY(0.13, 0.11, 0.018, 32), M(0xffffff, 0.3), 0, 0.009, 0);
    B.add(RB(0.12, 0.018, 0.11, 0.008), M(0xe3b778, 0.8), 0, 0.03, 0, 0, 0.3); B.add(RB(0.125, 0.008, 0.115, 0.003), M(0x5cbf3a, 0.7), 0, 0.043, 0, 0, 0.35); B.add(CY(0.04, 0.04, 0.007, 20), M(0xd8342c, 0.5), 0.02, 0.049, 0.01); B.add(CY(0.04, 0.04, 0.007, 20), M(0xd8342c, 0.5), -0.03, 0.049, -0.02);
    B.add(RB(0.11, 0.006, 0.1, 0.002), M(0xffcc33, 0.5), 0, 0.054, 0, 0, 0.2); B.add(RB(0.12, 0.018, 0.11, 0.008), M(0xe9c08a, 0.8), 0, 0.066, 0, 0, 0.32); B.build(sandwich); sandwich.position.copy(S); A.add(sandwich); }
  const SAND_TOP = 0.075;
  { const g = new THREE.Group(); const B = Builder(); const wick = M(0xb88a4a, 0.9); B.add(RB(0.5, 0.3, 0.34, 0.05), wick, 0, 0.15, 0); B.add(RB(0.52, 0.04, 0.36, 0.02), M(0x8a5a2a, 0.8), 0, 0.31, 0);
    B.add(new THREE.TorusGeometry(0.2, 0.018, 8, 20, Math.PI), M(0x8a5a2a, 0.8), 0, 0.33, 0); B.add(CY(0.035, 0.035, 0.2, 14), M(0xfff1a0, 0.2), 0.4, 0.1, 0.2); B.add(CY(0.03, 0.03, 0.12, 12), M(0xe63946, 0.5), 0.48, 0.06, 0.05);
    B.build(g); g.position.set(-0.85, 0, 0.45); g.rotation.y = 0.4; A.add(g); }
  // park: trees, bench + lamp, a fountain, town houses at the edge of the park
  const treeCrown = new THREE.IcosahedronGeometry(1, 2), trunkG = CY(0.18, 0.26, 3, 10).translate(0, 1.5, 0);
  const TREES = []; for (let i = 0; i < 46; i++) { const a = R() * Math.PI * 2, d = 9 + R() * 55; const x = Math.cos(a) * d, z = Math.sin(a) * d - 10; if (z > 6 && Math.abs(x) < 14) continue; TREES.push([x, z, 2 + R() * 1.8, R()]); }
  { const tr = new THREE.InstancedMesh(trunkG, M(0x6a4a30, 0.9), TREES.length), cr = new THREE.InstancedMesh(treeCrown, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: false }), TREES.length * 2);
    TREES.forEach(([x, z, s, r], i) => { m4.compose(v.set(x, 0, z), q.identity(), sc.set(s / 2.4, s / 2.4, s / 2.4)); tr.setMatrixAt(i, m4);
      for (let k = 0; k < 2; k++) { m4.compose(v.set(x + (k ? 0.6 : -0.4) * s * 0.5, s * (1.25 + k * 0.45), z + (k ? -0.3 : 0.3)), q.identity(), sc.set(s * (1 - k * 0.25), s * 0.9 * (1 - k * 0.2), s * (1 - k * 0.25))); cr.setMatrixAt(i * 2 + k, m4); cr.setColorAt(i * 2 + k, col.setHSL(0.22 + r * 0.08, 0.5, 0.28 + r * 0.1 + k * 0.05)); } });
    tr.castShadow = cr.castShadow = true; A.add(tr, cr); }
  const ironM = M(0x2a2e33, 0.5, 0.4);
  { const g = new THREE.Group(); const B = Builder(); const wood = M(0x9a5a30, 0.7);
    for (let i = 0; i < 3; i++) B.add(RB(1.8, 0.05, 0.12, 0.02), wood, 0, 0.45, -0.18 + i * 0.14); for (let i = 0; i < 2; i++) B.add(RB(1.8, 0.11, 0.04, 0.02), wood, 0, 0.62 + i * 0.16, -0.27, -0.2);
    for (const x of [-0.8, 0.8]) { B.add(BX(0.06, 0.45, 0.5), ironM, x, 0.225, -0.05); B.add(BX(0.06, 0.45, 0.06), ironM, x, 0.68, -0.28, -0.2); }
    B.build(g); g.position.set(-2.3, 0, -2.6); g.rotation.y = 0.25; A.add(g); }
  for (const [x, z] of [[-4.2, -2.0], [3.8, -4.5]]) { const l = new THREE.Group(); const L = Builder(); L.add(CY(0.06, 0.1, 3.8, 12), ironM, 0, 1.9, 0); L.add(RB(0.32, 0.45, 0.32, 0.06), ironM, 0, 3.95, 0); L.build(l); const b = new THREE.Mesh(SP(0.13, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a0, toneMapped: false })); b.position.y = 3.9; l.add(b); l.position.set(x, 0, z); A.add(l); }
  { const g = new THREE.Group(); const B = Builder(); const st = M(0xd8cfc0, 0.8); B.add(CY(2.4, 2.5, 0.5, 40), st, 0, 0.25, 0); B.add(CY(0.35, 0.45, 1.6, 16), st, 0, 0.9, 0); B.add(CY(0.9, 0.6, 0.25, 24), st, 0, 1.75, 0); B.build(g);
    const wt = new THREE.Mesh(CY(2.25, 2.25, 0.05, 40), new THREE.MeshStandardMaterial({ color: 0x5fb6d8, roughness: 0.1, metalness: 0.2 })); wt.position.y = 0.46; g.add(wt);
    const jet = new THREE.Mesh(CY(0.05, 0.3, 1.2, 12, 1), new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.55, roughness: 0.1 })); jet.position.y = 2.4; g.add(jet); g.position.set(5.5, 0, -9); A.add(g); }
  // town houses along the far edge of the park (varied facades, shop signs with invented names)
  { const wallPal = [0xf1d9a8, 0xe9a08a, 0xa9c8e0, 0xf6efe2, 0x9cc9b0, 0xe8c36b, 0xd0714f, 0xc9b6df, 0xf2b8b0]; const roofPal = [0xb0553a, 0x6a4a3a, 0x8a3a2a, 0x4a5560];
    const shops = [['GELATERIA SOLE', '#ffd23f', '#5a2a10'], ['BÄCKEREI ROSA', '#1f3d5a', '#ffe9a8'], ['FIORI', '#e63946', '#ffffff'], ['CAFÉ PARC', '#2a6a5a', '#ffffff'], ['LIBRAIRIE', '#6b3e1e', '#ffffff']];
    const winT = canvasTex(64, 64, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(14, 10, 36, 44); }); winT.colorSpace = THREE.NoColorSpace;
    let x = -60, k = 0; while (x < 60) { const w = 7 + R() * 5, fl = 3 + Math.floor(R() * 3), hh = 3.6 + fl * 3; const g = new THREE.Group(); const B = Builder();
      B.add(BX(w, hh, 9), M(wallPal[(k * 4 + 1) % wallPal.length], 0.85), 0, hh / 2, 0); B.add(BX(w + 0.4, 0.35, 9.4), M(0xf6efe2, 0.7), 0, hh, 0);
      const nW = Math.max(2, Math.round(w / 2.4)); for (let f = 1; f <= fl; f++) for (let i = 0; i < nW; i++) { const wx = -w / 2 + (i + 0.5) * w / nW; const lit = R() < 0.4; B.add(BX(1.0, 1.5, 0.08), lit ? M(0xffe2a8, 0.3) : M(0x2a3a4c, 0.2, 0.4), wx, 3.6 + (f - 1) * 3 + 1.4, 4.52); B.add(BX(0.32, 1.5, 0.06), M([0x2f7d6a, 0x9a3b2f, 0x1d3f6e][k % 3], 0.6), wx - 0.68, 3.6 + (f - 1) * 3 + 1.4, 4.53); }
      const rh = 2.6 + R() * 1.5; B.add(new THREE.CylinderGeometry(0.01, 6.6, rh, 4, 1).rotateY(Math.PI / 4), M(roofPal[k % 4], 0.8), 0, hh + rh / 2, 0, 0, 0, 0, [w / 9.3, 1, 1]);
      B.add(BX(w * 0.8, 2.4, 0.06), M(0xffe2a8, 0.3), 0, 1.4, 4.52); B.add(BX(w * 0.85, 0.15, 1.2), M([0xe63946, 0x2a6a5a, 0xffd23f, 0x3a7bd5][k % 4], 0.7), 0, 2.95, 5.0, -0.3, 0, 0); B.build(g);
      const s = shops[k % shops.length]; const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, 0.62), new THREE.MeshStandardMaterial({ map: signTex([s[0]], s[1], s[2], 512, 112), roughness: 0.6 })); sg.position.set(0, 3.3, 4.6); g.add(sg);
      g.position.set(x + w / 2, 0, -46 - R() * 3); A.add(g); x += w + 0.2; k++; } }

  // ---------------- characters ----------------
  const P = makePerson(THREE, { shirt: 0x3a9a8a, pants: 0x2b3550, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xf2f2f2, seed: 5, hairStyle: 'short' }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const mit = makeCat(THREE, 0xf0a040); mit.rotation.order = 'YXZ'; A.add(mit); const MC = mit.userData.cat;
  // THE UNBOTHERED PERSON: on the bench, eating his own sandwich the whole time
  const unb = makePerson(THREE, { shirt: 0xe0b84a, pants: 0x3b3b46, hair: 0x9a9a9a, skin: 0xb5835a, shoe: 0x222222, seed: 41, hairStyle: 'bald' }); unb.group.rotation.order = 'YXZ'; A.add(unb.group);
  const unbSand = new THREE.Group(); { const B = Builder(); B.add(RB(0.1, 0.025, 0.08, 0.008), M(0xe3b778, 0.8), 0, 0, 0); B.add(RB(0.105, 0.01, 0.085, 0.003), M(0x5cbf3a, 0.7), 0, 0.016, 0); B.add(RB(0.1, 0.025, 0.08, 0.008), M(0xe9c08a, 0.8), 0, 0.032, 0); B.build(unbSand); A.add(unbSand); }
  // BAD TIMING: your friend arrives with a birthday cake
  const bt = makePerson(THREE, { shirt: 0xe86aa0, pants: 0x3a4a7a, hair: 0x1a1210, skin: 0xd8a47e, shoe: 0x444444, seed: 23, hairStyle: 'long' }); bt.group.rotation.order = 'YXZ'; A.add(bt.group);
  const cake = new THREE.Group(); { const B = Builder(); B.add(CY(0.2, 0.2, 0.02, 28), M(0xdddddd, 0.3, 0.3), 0, 0, 0); B.add(CY(0.15, 0.15, 0.12, 28), M(0xffb6c8, 0.6), 0, 0.07, 0); B.add(CY(0.155, 0.155, 0.02, 28), M(0xffffff, 0.5), 0, 0.135, 0);
    for (let i = 0; i < 5; i++) { const a = i * 1.256; B.add(CY(0.006, 0.006, 0.05, 6), M([0x3a7bd5, 0xffd23f, 0xe63946, 0x5cbf3a, 0xffffff][i], 0.5), Math.cos(a) * 0.08, 0.17, Math.sin(a) * 0.08); } B.build(cake);
    const flM = new THREE.MeshBasicMaterial({ color: 0xffc040, toneMapped: false }); for (let i = 0; i < 5; i++) { const a = i * 1.256; const f = new THREE.Mesh(SP(0.008, 8, 6), flM); f.scale.y = 1.6; f.position.set(Math.cos(a) * 0.08, 0.205, Math.sin(a) * 0.08); cake.add(f); } A.add(cake); }

  // ---------------- the ants ----------------
  const antGeo = (() => { const parts = []; const add = (g, x, y, z, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) => { g = g.index ? g.toNonIndexed() : g; g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(...s))); for (const n of Object.keys(g.attributes)) if (!['position', 'normal'].includes(n)) g.deleteAttribute(n); parts.push(g); };
    add(SP(1, 10, 8), 0, 1.3, -2.6, 0, 0, 0, [1.45, 1.2, 1.9]); add(SP(1, 8, 6), 0, 1.25, -0.2, 0, 0, 0, [0.75, 0.7, 1.15]); add(SP(1, 10, 8), 0, 1.45, 1.7, 0, 0, 0, [1.05, 0.95, 1.0]);
    for (const sx of [-1, 1]) { for (const lz of [-0.9, -0.1, 0.7]) add(CY(0.13, 0.1, 2.6, 4), sx * 1.25, 0.65, lz + lz * 0.4, 0, 0, sx * 1.05); add(CY(0.09, 0.07, 2.0, 4), sx * 0.45, 2.3, 2.9, -0.9, 0, sx * 0.5); }
    return mergeGeometries(parts).scale(0.0021, 0.0021, 0.0021); })();   // ~12 mm long (drawn a little big so a single ant reads on a phone)
  const NA = 1100; const antsI = new THREE.InstancedMesh(antGeo, new THREE.MeshStandardMaterial({ color: 0x2a140a, roughness: 0.35, metalness: 0.1 }), NA); antsI.castShadow = true; antsI.frustumCulled = false; A.add(antsI);
  const AD = []; for (let i = 0; i < NA; i++) AD.push({ a: R() * 6.283, f: Math.sqrt(R()), w: (0.4 + R() * 0.9) * (R() < 0.5 ? 1 : -1), ph: R() * 6.28, s: 0.85 + R() * 0.3 });
  const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2), pileM); pile.castShadow = pile.receiveShadow = true; pile.name = 'antpile'; A.add(pile);

  // =====================================================================================================
  // SCENE B: CLEAN meadow (metres). Only the pile + one real-size object beside it.
  // =====================================================================================================
  const B2 = new THREE.Scene(); const camB = new THREE.PerspectiveCamera(46, W / H, 0.1, 2e5);
  B2.fog = new THREE.FogExp2(0xf0c89a, 0.00006); B2.add(new THREE.HemisphereLight(0xcfe0ff, 0x8a9a50, 0.85));
  const sunB = new THREE.DirectionalLight(0xffc98a, 3.0); sunB.castShadow = true; sunB.shadow.mapSize.set(2048, 2048); sunB.shadow.bias = -0.0004; B2.add(sunB, sunB.target);
  const skyB = makeSkyDome(THREE, 0x3f6fbf, 0xffc890, [SUND.x, SUND.y, SUND.z]); skyB.scale.setScalar(5e6); B2.add(skyB);
  const grassB = grassT.clone(); grassB.repeat.set(4000, 4000); grassB.needsUpdate = true;
  const groundB = new THREE.Mesh(new THREE.CircleGeometry(4e6, 96), new THREE.MeshStandardMaterial({ map: grassB, color: 0xd8e8b0, roughness: 0.95 })); groundB.rotation.x = -Math.PI / 2; groundB.receiveShadow = true; groundB.name = 'meadow'; B2.add(groundB);
  // farmland around the meadow (patchwork fields + roads) and a small town, so the growth reads at the km scale
  const fieldsT = canvasTex(1024, 1024, (g, w, h) => { const r = rng(31); const n = 16, cs = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = r(); g.fillStyle = k < 0.45 ? `hsl(${95 + r() * 20},${40 + r() * 15}%,${30 + r() * 10}%)` : k < 0.75 ? `hsl(${50 + r() * 12},${55 + r() * 15}%,${50 + r() * 10}%)` : `hsl(${30 + r() * 10},${35 + r() * 10}%,${38 + r() * 8}%)`; g.fillRect(i * cs, j * cs, cs, cs);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; for (let y = j * cs + 4; y < (j + 1) * cs; y += 7) { g.beginPath(); g.moveTo(i * cs, y); g.lineTo((i + 1) * cs, y); g.stroke(); } }
    g.strokeStyle = '#cfc6b0'; g.lineWidth = 5; for (let i = 0; i <= n; i += 4) { g.beginPath(); g.moveTo(i * cs, 0); g.lineTo(i * cs, h); g.stroke(); g.beginPath(); g.moveTo(0, i * cs); g.lineTo(w, i * cs); g.stroke(); } });
  fieldsT.wrapS = fieldsT.wrapT = THREE.RepeatWrapping; fieldsT.repeat.set(800, 800);
  groundB.material.map = fieldsT; groundB.material.color.set(0xffffff); groundB.material.needsUpdate = true;
  const meadow = new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshStandardMaterial({ map: (() => { const t = grassT.clone(); t.repeat.set(150, 150); t.needsUpdate = true; return t; })(), roughness: 0.95 })); meadow.rotation.x = -Math.PI / 2; meadow.position.y = 0.05; meadow.receiveShadow = true; meadow.name = 'meadow'; B2.add(meadow);
  const TN = 900; const town = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), TN); const townR = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 0.6, 4).rotateY(Math.PI / 4).translate(0, 0.3, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), TN);
  { const r = rng(77); for (let i = 0; i < TN; i++) { const a = -0.4 + r() * 2.6, d = 700 + Math.pow(r(), 0.7) * 2600; const x = Math.cos(a) * d + 400, z = -Math.sin(a) * d * 0.9 - 300; const w = 8 + r() * 10, hh = 7 + r() * 14;
    m4.compose(v.set(x, 0, z), q.setFromEuler(e.set(0, r() * 3, 0)), sc.set(w, hh, w * 0.8)); town.setMatrixAt(i, m4); town.setColorAt(i, col.set([0xf1d9a8, 0xe9a08a, 0xa9c8e0, 0xf6efe2, 0xe8c36b, 0xd0714f][i % 6]));
    m4.compose(v.set(x, hh, z), q.setFromEuler(e.set(0, r() * 3, 0)), sc.set(w * 1.1, hh * 0.5, w * 0.9)); townR.setMatrixAt(i, m4); townR.setColorAt(i, col.set([0xb0553a, 0x8a3a2a, 0x6a4a3a][i % 3])); } }
  town.castShadow = townR.castShadow = true; B2.add(town, townR);
  const pileB = new THREE.Mesh(pile.geometry, pileM); pileB.castShadow = pileB.receiveShadow = true; pileB.name = 'antpile'; B2.add(pileB);
  // elephant (3.3 m at the shoulder)
  const eleph = new THREE.Group(); { const B = Builder(); const gr = M(0x8d8d92, 0.85);
    B.add(SP(1, 24, 16), gr, 0, 2.15, 0, 0, 0, 0, [1.25, 1.1, 1.9]); B.add(SP(0.85, 20, 14), gr, 0, 2.7, 2.1);
    for (const sx of [-1, 1]) { B.add(SP(0.8, 16, 10), gr, sx * 0.85, 2.75, 1.85, 0, sx * 0.5, 0, [0.15, 1, 0.9]); for (const z of [-1.1, 1.1]) B.add(CY(0.38, 0.34, 1.7, 14), gr, sx * 0.65, 0.85, z); B.add(new THREE.ConeGeometry(0.08, 0.7, 8), M(0xfff6e0, 0.4), sx * 0.35, 2.1, 2.8, 1.9, 0, 0); }
    for (let i = 0; i < 6; i++) B.add(CY(0.24 - i * 0.025, 0.26 - i * 0.025, 0.42, 12), gr, 0, 2.4 - i * 0.36, 2.85 + Math.sin(i * 0.35) * 0.2, 0.12 * i);
    B.add(CY(0.06, 0.03, 0.9, 6), gr, 0, 1.9, -1.95, 0.4, 0, 0); B.build(eleph); const ey = new THREE.Mesh(SP(0.07, 10, 8), M(0x111111, 0.3)); for (const sx of [-1, 1]) { const x = ey.clone(); x.position.set(sx * 0.5, 2.95, 2.65); eleph.add(x); } B2.add(eleph); }
  // blue whale (~25 m)
  const whale = new THREE.Group(); { const B = Builder(); const bl = M(0x4a6f9a, 0.6), belly = M(0xb8c8d8, 0.7);
    B.add(SP(1, 32, 18), bl, 0, 2.2, 0, 0, 0, 0, [2.4, 2.1, 12.5]); B.add(SP(1, 28, 14), belly, 0, 1.6, 1.5, 0, 0, 0, [2.1, 1.3, 10.5]);
    B.add(new THREE.ConeGeometry(1.3, 5, 12).rotateX(Math.PI / 2), bl, 0, 2.3, -13.5); B.add(SP(1, 16, 8), bl, 0, 2.3, -16.2, 0, 0, 0, [3.6, 0.25, 1.3]);
    for (const sx of [-1, 1]) B.add(SP(1, 12, 8), bl, sx * 2.6, 1.3, 5, 0, sx * 0.6, sx * 0.4, [2.0, 0.2, 0.7]); B.build(whale);
    for (const sx of [-1, 1]) { const ey = new THREE.Mesh(SP(0.18, 10, 8), M(0x111111, 0.3)); ey.position.set(sx * 2.1, 2.3, 7.5); whale.add(ey); } whale.rotation.y = Math.PI / 2; B2.add(whale); }
  // Eiffel Tower (330 m)
  const eiffel = new THREE.Group(); { const latTex = canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 10; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke(); });
    latTex.colorSpace = THREE.NoColorSpace; latTex.wrapS = latTex.wrapT = THREE.RepeatWrapping; latTex.repeat.set(4, 36); const latM = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.6, metalness: 0.35, alphaMap: latTex, alphaTest: 0.4, side: THREE.DoubleSide });
    const B = Builder(); const iron = M(0x7a4e32, 0.6, 0.35);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const g = new THREE.CylinderGeometry(4, 9, 62, 4, 1, true).rotateY(Math.PI / 4); const ang = 0.33; B.add(g, latM, sx * 38 - sx * 10, 30, sz * 38 - sz * 10, sz * ang * 0.7, 0, -sx * ang * 0.7); }
    B.add(BX(70, 5, 70), iron, 0, 58, 0); B.add(new THREE.CylinderGeometry(11, 26, 58, 4, 1, true).rotateY(Math.PI / 4), latM, 0, 87, 0); B.add(BX(34, 4, 34), iron, 0, 116, 0);
    B.add(new THREE.CylinderGeometry(3, 12, 158, 4, 1, true).rotateY(Math.PI / 4), latM, 0, 196, 0); B.add(BX(9, 6, 9), iron, 0, 276, 0); B.add(new THREE.CylinderGeometry(1.2, 3, 30, 4, 1, true).rotateY(Math.PI / 4), latM, 0, 294, 0);
    B.add(BX(4.5, 6, 4.5), M(0x9a6a48, 0.6, 0.3), 0, 310, 0); B.add(CY(0.5, 0.8, 18, 8), M(0xdddddd, 0.4, 0.5), 0, 322, 0);
    for (const s of [-1, 1]) B.add(new THREE.TorusGeometry(24, 1.6, 6, 24, Math.PI), iron, 0, 30, s * 26, 0, 0, 0, [1, 0.9, 1]); B.build(eiffel);
    const bl = new THREE.Mesh(SP(1.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5040, toneMapped: false })); bl.position.y = 331; eiffel.add(bl); B2.add(eiffel); }

  // =====================================================================================================
  // SCENE C: space. 1 unit = 63.71 km (Earth radius 100). The ant ball sits on Earth and grows.
  // =====================================================================================================
  const C3 = new THREE.Scene(); C3.background = new THREE.Color(0x040816); const camC = new THREE.PerspectiveCamera(46, W / H, 1, 1e9);
  const KM = 100 / 6371; const U = (m) => m / 1000 * KM;
  const starPts = stars(THREE, 6000, 4e8, 23); C3.add(starPts); C3.add(new THREE.HemisphereLight(0xbfd4ff, 0x30304a, 0.35));
  const sunC = new THREE.DirectionalLight(0xfff0dc, 3.2); C3.add(sunC, sunC.target);
  const earth = makeEarth(THREE, 100, 9); C3.add(earth);
  const ballMat = new THREE.MeshStandardMaterial({ map: swarmT.clone(), bumpMap: swarmT, bumpScale: 1.5, roughness: 0.55, color: 0xffffff }); ballMat.map.repeat.set(6, 3); ballMat.map.needsUpdate = true;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), ballMat); ball.name = 'antball'; C3.add(ball);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(U(1737.4e3), 64, 32), new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#b8b4ac'; g.fillRect(0, 0, w, h); const r = rng(4); for (let k = 0; k < 220; k++) { g.fillStyle = `rgba(80,76,70,${0.15 + r() * 0.3})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 14, 0, 7); g.fill(); } }), roughness: 0.95 })); C3.add(moon);
  const jup = new THREE.Mesh(new THREE.SphereGeometry(U(69911e3), 96, 48), new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (g, w, h) => { const r = rng(12); const cs = ['#e8d2b0', '#c89a6a', '#f2e6d0', '#b07a50', '#ddc0a0', '#a8704a']; let y = 0; while (y < h) { const bh = 6 + r() * 18; g.fillStyle = cs[Math.floor(r() * cs.length)]; g.fillRect(0, y, w, bh); y += bh; }
    g.fillStyle = '#c0583a'; g.beginPath(); g.ellipse(w * 0.62, h * 0.64, 26, 12, 0, 0, 7); g.fill(); }), roughness: 0.9 })); C3.add(jup);
  const glowT = softTex(THREE, 128);
  const sunS = new THREE.Mesh(new THREE.SphereGeometry(U(696340e3), 96, 48), new THREE.MeshBasicMaterial({ color: 0xfff2c0, toneMapped: false })); C3.add(sunS);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffb040, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); C3.add(sunGlow);
  const R136 = new THREE.Mesh(new THREE.SphereGeometry(U(40 * 696340e3), 96, 48), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, toneMapped: false })); C3.add(R136);
  const r136Glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0x6fa0ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); C3.add(r136Glow);

  // MITTENS CAM (big part): you + Mittens still sitting on the blanket, now on top of the ants
  const MCam = new THREE.Scene(); MCam.background = new THREE.Color(0xffd9a8); MCam.add(new THREE.HemisphereLight(0xffffff, 0x6a5040, 1.2)); const mcD = new THREE.DirectionalLight(0xffe0b8, 2.4); mcD.position.set(2, 2.5, 3); MCam.add(mcD);
  const mcAnts = new THREE.Mesh(new THREE.SphereGeometry(6, 48, 24), new THREE.MeshStandardMaterial({ map: swarmT.clone(), roughness: 0.5 })); mcAnts.material.map.repeat.set(10, 5); mcAnts.material.map.needsUpdate = true; mcAnts.position.y = -6; MCam.add(mcAnts);
  const mcBl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.01, 1.3), new THREE.MeshStandardMaterial({ map: blanketT, roughness: 0.9 })); mcBl.position.y = 0.0; MCam.add(mcBl);
  const mcP = makePerson(THREE, { shirt: 0x3a9a8a, pants: 0x2b3550, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xf2f2f2, seed: 5, hairStyle: 'short' }); mcP.group.rotation.order = 'YXZ'; MCam.add(mcP.group);
  const mc = makeCat(THREE, 0xf0a040); MCam.add(mc); const MCC = mc.userData.cat;
  const mcSand = sandwich.clone(); mcSand.scale.setScalar(1.0); MCam.add(mcSand);
  const mcCam = new THREE.PerspectiveCamera(34, 1, 0.05, 40); mcCam.position.set(0.5, 1.15, 2.6); mcCam.lookAt(0.05, 0.5, 0);

  await document.fonts.ready;
  const milIdx = (tt) => { let k = -1; for (let i = 0; i < MIL.length; i++) if (tt >= MIL[i][1] - 0.05) k = i; return k; };
  const MOODS = ['annoyed', 'shock', 'scared', 'unimpressed', 'shock', 'annoyed', 'unimpressed', 'shock', 'annoyed', 'unimpressed', 'shock', 'annoyed', 'shock', 'smug'];
  function sitGround(Q) { Q.legL.rotation.set(-1.5, 0, -0.1); Q.legR.rotation.set(-1.5, 0, 0.1); Q.armL.rotation.set(0.25, 0, -0.35); Q.armR.rotation.set(0.25, 0, 0.35); }
  function sitBench(Q) { Q.legL.rotation.set(-1.45, 0, -0.08); Q.legR.rotation.set(-1.45, 0, 0.08); Q.armL.rotation.set(-0.6, 0, -0.2); Q.armR.rotation.set(-0.6, 0, 0.2); }
  function standPose(Q) { Q.legL.rotation.set(0, 0, 0.02); Q.legR.rotation.set(0, 0, -0.02); Q.armL.rotation.set(0.05, 0, -0.08); Q.armR.rotation.set(0.05, 0, 0.08); }
  function walkPose(Q, t, amt = 1) { const s = Math.sin(t * 8) * amt; Q.legL.rotation.set(0.5 * s, 0, 0.02); Q.legR.rotation.set(-0.5 * s, 0, -0.02); Q.armL.rotation.set(-0.4 * s, 0, -0.1); Q.armR.rotation.set(0.4 * s, 0, 0.1); }
  // log-space keyframes (values > 0)
  function lkeys(k, t) { if (t <= k[0][0]) return k[0][1]; for (let i = 0; i < k.length - 1; i++) { const [t0, v0] = k[i], [t1, v1] = k[i + 1]; if (t <= t1) { const u = smooth(0, 1, (t - t0) / (t1 - t0)); return Math.exp(lerp(Math.log(v0), Math.log(v1), u)); } } return k[k.length - 1][1]; }

  function update(tt0) {
    const teaser = tt0 < TEASER; const tt = teaser ? TOT - 0.04 : tt0;
    const n = minAt(tt); const mi = milIdx(tt); const mood = mi >= 0 ? MOODS[mi] : 'neutral';
    const out = { scene: A, camera: cam, bloom: 0.22, bloomThreshold: 0.9, tt, tt0, teaser, tk: tt0 / TEASER, env: 0.4, exposure: 1.02, sat: 1.25, contrast: 1.05, voff: 0, n, mi };
    out.count = Math.pow(2, Math.floor(n + 1e-9)); out.massKg = out.count * ANT_KG;
    if (tt < CUT) {
      // ---------------- SCENE A: the picnic ----------------
      const rp = rHemi(n); const showPile = rp > 0.022; pile.visible = showPile; pile.scale.set(rp * 1.08, rp * 0.92, rp * 1.08); pile.position.copy(S);
      swarmT.offset.set(tt * 0.01, tt * 0.017); swarmT.repeat.set(clamp(rp * 14, 1, 40), clamp(rp * 7, 0.5, 20));
      sandwich.visible = rp < 0.075;
      // individual ants: exactly 2^n of them while they fit (up to 1,024), crawling on the sandwich, then over the pile and the blanket
      const shown = Math.min(NA, out.count);
      for (let i = 0; i < NA; i++) { const d = AD[i]; if (i >= shown) { m4.compose(v.set(0, -5, 0), q.identity(), sc.setScalar(0.001)); antsI.setMatrixAt(i, m4); continue; }
        let x, y, z, yaw; const born = i === 0 ? 0 : 1;
        if (shown <= 64 || i < 40) { // on the sandwich top
          const rr = 0.012 + 0.04 * d.f * (i === 0 ? 0.6 : 1); const a = d.a + tt * d.w * 0.9 * (i === 0 ? 0.6 : 1); x = S.x + Math.cos(a) * rr; z = S.z + Math.sin(a) * rr; y = SAND_TOP; yaw = -a + (d.w > 0 ? 0 : Math.PI);
          if (rp > 0.06) { const dd = rp * 0.8; x = S.x + Math.cos(a) * dd; z = S.z + Math.sin(a) * dd; y = Math.sqrt(Math.max(0, rp * rp - dd * dd)) * 0.92 + 0.002; } }
        else { const area = Math.max(0.09, rp * 1.7 + 0.05); const rr = area * (0.25 + 0.75 * d.f); const a = d.a + tt * d.w * 0.35 / Math.max(0.3, rr * 4); x = S.x + Math.cos(a) * rr; z = S.z + Math.sin(a) * rr; yaw = -a + (d.w > 0 ? 0 : Math.PI);
          const dd = rr; y = dd < rp ? Math.sqrt(Math.max(0, rp * rp - dd * dd)) * 0.92 + 0.002 : (Math.abs(x - S.x) < 0.13 && Math.abs(z - S.z) < 0.13 && rp < 0.075 ? 0.02 : 0.009); }
        const wob = Math.sin(tt * 18 + d.ph) * 0.12; m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0, yaw + wob, 0)), sc.setScalar(d.s * born + (i === 0 ? 1.05 : 0))); antsI.setMatrixAt(i, m4); }
      antsI.instanceMatrix.needsUpdate = true; antsI.visible = true;
      { const c = sun.shadow.camera; const sz = 3 + rp * 3; sun.target.position.set(0, 0, 0); sun.position.copy(SUND).multiplyScalar(20).add(sun.target.position); c.left = -sz; c.right = sz; c.top = sz; c.bottom = -sz; c.near = 1; c.far = 60; c.updateProjectionMatrix(); }
      // you: sit, then scoot back (15.6), then stand up and back away (18.0)
      { const G = P.group; const scoot = smooth(15.4, 16.2, tt), up = smooth(17.9, 18.7, tt), away = smooth(18.6, 20, tt);
        const bx = -0.6 - 0.3 * scoot - 1.5 * away, bz = -0.85 - 0.25 * scoot + 0.7 * away;
        if (up < 0.5) { G.position.set(bx, -0.76 * (1 - up * 2) + 0.0 * up, bz); sitGround(P); G.rotation.set(0, 0.6, 0); P.torso.rotation.x = 0;
          if (tt < 6) { P.armR.rotation.set(-0.9 + 0.1 * Math.sin(tt * 1.5), 0.2, 0.15); } // reaching for the sandwich
          if (tt > 9.7 && tt < 11.8) { P.armR.rotation.set(-1.3, 0, 0.4 + 0.25 * Math.sin(tt * 7)); } }  // waves it off: "one ant is fine"
        else { const k = (up - 0.5) * 2; G.position.set(bx, lerp(-0.4, 0, k), bz); standPose(P); if (away > 0 && away < 1) walkPose(P, tt, 0.7); P.armL.rotation.set(-2.2 * k, 0, -0.4); P.armR.rotation.set(-2.2 * k, 0, 0.4); G.rotation.set(0, 0.55 - 0.2 * away, 0); }
        let face = { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.3, -0.6] }, head = [0.35, 0.15, 0];
        if (tt < 3.9) { face = { brows: 'up', eyes: 1.05, mouth: 'smile', look: [0.2, -0.7] }; head = [0.4, 0.1, 0]; }
        else if (tt < 6) { face = { brows: 'up', eyes: 1.15, mouth: 'o', look: [0.3, -0.8] }; head = [0.5, 0.15, 0]; }
        else if (tt < 9.7) { face = { brows: 'worried', eyes: 1.2, mouth: 'o', look: [0.4, -0.8] }; head = [0.45, 0.2, 0]; }
        else if (tt < 12.0) { face = { brows: 'neutral', eyes: 0.9, mouth: 'smile', look: [0.6, -0.3] }; head = [0.15, 0.35, 0.05]; }
        else if (tt < 14.8) { face = { brows: 'worried', eyes: 1.25, mouth: 'grit', look: [0.4, -0.8] }; head = [0.4, 0.1, 0]; }
        else if (tt < 17.4) { face = { brows: 'up', eyes: 1.4, mouth: 'open', open: 1.3, look: [0.5, -0.6] }; head = [0.3, 0.1, 0]; }
        else { face = { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.6, look: [0.6, -0.4] }; head = [0.15, 0.1, 0]; }
        P.headPivot.rotation.set(...head); setFace(P, face); life(P, tt, 0.8); }
      { // Mittens: on the blanket beside the sandwich; jumps back onto the basket lid at 14.9 (the ants outweigh him)
        const jump = smooth(14.9, 15.35, tt); const p0 = [0.15, 0, -0.5], p1 = [-0.05, 0, -1.35];
        const mAway = smooth(18.4, 19.8, tt); mit.position.set(lerp(p0[0], p1[0], jump) - 1.7 * mAway, lerp(p0[1], p1[1], jump) + Math.sin(Math.PI * jump) * 0.45 + Math.abs(Math.sin(Math.PI * 3 * mAway)) * 0.12 * (mAway > 0 && mAway < 1 ? 1 : 0), lerp(p0[2], p1[2], jump) + 0.9 * mAway); mit.rotation.set(0, lerp(0.15, 0.6, jump), 0); mit.scale.setScalar(1.25);
        let m = 'neutral'; if (tt > 3.2) m = 'unimpressed'; if (tt > 6.1) m = 'annoyed'; if (tt > 9.8) m = 'unimpressed'; if (tt > 12.45) m = 'shock'; if (tt > 13.3) m = 'annoyed'; if (tt > 14.9) m = 'shock'; if (tt > 15.6) m = 'unimpressed'; if (tt > 17.5) m = 'scared'; if (tt > 18.6) m = 'annoyed';
        MC.headPivot.rotation.y = 0.3 * Math.sin(tt * 0.8) + (m === 'unimpressed' ? -0.45 : 0) + (tt < 12 ? 0.25 : 0); MC.headPivot.rotation.x = tt < 9 ? 0.25 : 0;
        setCatFace(mit, m, 0.25); catLife(mit, tt, 1); out.catMood = m; }
      { // THE UNBOTHERED PERSON eats on the bench, bite every ~2.4 s
        const G = unb.group; G.position.set(-2.3, -0.36, -2.58); G.rotation.set(0, 0.25, 0); sitBench(unb); const bite = Math.pow(Math.max(0, Math.sin(tt * 2.6)), 6);
        unb.armR.rotation.set(-1.4 - 0.9 * bite, 0, 0.45 + 0.3 * bite); unb.armL.rotation.set(-0.5, 0, -0.2);
        setFace(unb, { brows: 'neutral', eyes: 0.75, mouth: bite > 0.5 ? 'o' : 'flat', look: [0.3, -0.2] }); unb.headPivot.rotation.set(0.1 - 0.15 * bite, 0.3, 0); life(unb, tt, 0.5);
        G.updateMatrixWorld(true); unb.armR.userData.end.getWorldPosition(tv); unbSand.position.copy(tv).add(v.set(0, 0.05, 0.03)); unbSand.rotation.set(0.3, 0.25, 0); G.visible = unbSand.visible = !teaser; }
      { // BAD TIMING: walks in with the cake 12.6 -> 15.3, "SURPRISE!", then backs away
        const G = bt.group; const walk = smooth(11.8, 15.3, tt), back = smooth(17.6, 19.8, tt); const x = lerp(3.0, 0.75, walk) + back * 1.1, z = lerp(-1.2, -2.0, walk) - back * 0.5;
        G.position.set(x, 0, z); G.rotation.set(0, lerp(-2.2, -2.0, walk) + back * 0.4, 0); if ((walk > 0 && walk < 1) || (back > 0 && back < 1)) walkPose(bt, tt, 0.8); else standPose(bt);
        bt.armL.rotation.set(-1.25, 0, -0.15); bt.armR.rotation.set(-1.25, 0, 0.15);
        const shocked = tt > 16.6; setFace(bt, shocked ? { brows: 'up', eyes: 1.45, mouth: 'open', open: 1.4, look: [0, -0.6] } : { brows: 'up', eyes: 1.1, mouth: 'smile', look: [0, 0] }); bt.headPivot.rotation.set(shocked ? 0.35 : 0.05, 0, 0); life(bt, tt, 0.6);
        G.updateMatrixWorld(true); bt.armL.userData.end.getWorldPosition(tv); const a = tv.clone(); bt.armR.userData.end.getWorldPosition(tv); cake.position.copy(a.add(tv).multiplyScalar(0.5)).add(v.set(0, 0.03, 0)); cake.rotation.set(0, G.rotation.y, 0);
        G.visible = cake.visible = tt > 11.8 && !teaser; }
      // camera: close on the sandwich + you, one continuous pull back as the pile grows
      const CK = [[1.2, [0.95, 0.55, 2.15], [-0.15, 0.74, -0.5]], [9.6, [1.0, 0.6, 2.35], [-0.1, 0.74, -0.45]], [12.4, [1.15, 0.75, 2.6], [0.0, 0.72, -0.35]], [14.85, [1.35, 0.9, 2.7], [0.1, 0.5, -0.15]], [17.45, [1.6, 1.3, 3.9], [0.0, 0.55, 0]], [CUT, [1.2, 1.7, 6.0], [-0.9, 0.7, 0]]];
      let cp = CK[0][1], cl = CK[0][2]; for (let k = 0; k < CK.length - 1; k++) if (tt >= CK[k][0]) { const u = smooth(CK[k][0], CK[k + 1][0], tt); cp = CK[k][1].map((x, j) => lerp(x, CK[k + 1][1][j], u)); cl = CK[k][2].map((x, j) => lerp(x, CK[k + 1][2][j], u)); }
      cam.position.set(cp[0] + 0.02 * Math.sin(tt * 0.6), cp[1] + 0.015 * Math.sin(tt * 0.9), cp[2]); cam.lookAt(...cl); cam.fov = 48; cam.near = 0.02; cam.far = 3000; cam.updateProjectionMatrix();
      A.fog.density = lerp(0.012, 0.009, smooth(12, CUT, tt));
      out.dof = 0.06; out.focusY = 0.58; out.focusH = 0.26; out.interior = false; out.focus = rp > 0.06 ? pile : sandwich; out.rp = rp;
      out.flash = 0; out.shake = 0.08 * pulse(tt, 17.45, 0.4);
    } else if (tt < CUT2) {
      // ---------------- SCENE B: clean meadow ----------------
      const rp = rHemi(n); pileB.scale.set(rp * 1.08, rp * 0.92, rp * 1.08); pileB.position.set(0, 0, 0); swarmT.offset.set(tt * 0.01, tt * 0.017); swarmT.repeat.set(clamp(rp * 3, 3, 40), clamp(rp * 1.5, 1.5, 20));
      const show = (i, a = 1.0, b = 1.2) => tt > MIL[i][1] - a && tt < MIL[i][1] + b;
      eleph.visible = show(3, 0.4, 0.9); eleph.position.set(-(rp * 0.9 + 0.6), 0, -4.5); eleph.rotation.y = 0.7;
      whale.visible = show(4, 0.4, 0.75); whale.position.set(rp * 0.9 + 1.5, 0, -14); whale.rotation.y = 0.35;
      eiffel.visible = tt > MIL[5][1] - 0.45 && tt < MIL[6][1] + 1.3; eiffel.position.set(rp * 1.15 + 60, 0, -40); eiffel.rotation.y = 0.5;
      const F = Math.max(lkeys([[CUT, 12], [MIL[3][1], 16], [MIL[4][1] - 0.15, 48], [MIL[5][1], 640], [MIL[6][1], 1500], [MIL[7][1], 3600]], tt), rp * 5.2);
      const yaw = 0.15 + 0.05 * Math.sin(tt * 0.5) + 0.2 * smooth(CUT, CUT2, tt);
      const lookY = tt < MIL[5][1] - 0.5 ? rp * 0.55 : lerp(110, rp * 0.5, smooth(MIL[5][1] + 0.5, MIL[6][1] + 0.5, tt));
      const lookX = tt > MIL[5][1] - 0.6 && tt < MIL[6][1] + 0.8 ? lerp(0, (rp + 60) * 0.42, smooth(MIL[5][1] - 0.6, MIL[5][1], tt) * (1 - smooth(MIL[6][1], MIL[6][1] + 0.8, tt))) : 0;
      camB.position.set(lookX + Math.sin(yaw) * F, Math.max(1.5, F * 0.16 + rp * 0.3), Math.cos(yaw) * F); camB.lookAt(lookX, lookY, 0); camB.near = Math.max(0.1, F * 0.01); camB.far = 2e7; camB.fov = 46; camB.updateProjectionMatrix();
      { const c = sunB.shadow.camera; const sz = Math.max(rp * 3, F * 0.6); sunB.target.position.set(0, 0, 0); sunB.position.copy(SUND).multiplyScalar(sz * 3); c.left = -sz; c.right = sz; c.top = sz; c.bottom = -sz; c.near = sz * 0.2; c.far = sz * 8; c.updateProjectionMatrix(); }
      B2.fog.density = 0.02 / Math.max(F, 50);
      out.scene = B2; out.camera = camB; out.dof = 0; out.focus = pileB; out.rp = rp; out.clean = true; out.vignette = 0.4;
      out.flash = 0.35 * pulse(tt, CUT, 0.3); out.shake = 0.1 * pulse(tt, MIL[3][1], 0.35) + 0.12 * pulse(tt, MIL[4][1], 0.35) + 0.15 * pulse(tt, MIL[6][1], 0.4);
    } else {
      // ---------------- SCENE C: space ----------------
      const rb = U(rBall(n)); const dir = new THREE.Vector3(0.62, 0.5, 0.6).normalize();
      // the ball sits on Earth's surface (centre just above it); once bigger than Earth, Earth is stuck to its side
      const cd = 100 + rb * 0.55; ball.scale.setScalar(rb); ball.position.copy(dir).multiplyScalar(cd); ball.rotation.y = tt * 0.03; ballMat.map.offset.set(tt * 0.004, tt * 0.006);
      earth.rotation.y = tt * 0.05;
      const bc = ball.position.clone(); const camD = lkeys([[CUT2, 300], [MIL[8][1], 420], [MIL[9][1], 900], [MIL[10][1], 2600], [MIL[11][1], 9500], [MIL[12][1], 72000], [MIL[13][1], 1.2e6], [TOT, 2.6e6]], tt);
      // the thing we look at: the ball, with the comparison object beside it
      const side = new THREE.Vector3(-0.75, 0.15, 0.65).normalize();
      moon.visible = tt > MIL[9][1] - 0.9 && tt < MIL[10][1] + 0.8; moon.position.copy(bc).addScaledVector(side, rb + U(1737.4e3) * 1.6);
      jup.visible = tt > MIL[11][1] - 0.9 && tt < MIL[12][1] + 0.3; jup.position.copy(bc).addScaledVector(side, rb + U(69911e3) * 1.25); jup.rotation.y = tt * 0.2;
      const sunVis = tt > MIL[12][1] - 1.0; sunS.visible = sunGlow.visible = sunVis; const sR = U(696340e3);
      const side2 = new THREE.Vector3(-0.8, -0.1, -0.6).normalize(); sunS.position.copy(bc).addScaledVector(side2, rb + sR * 1.25); sunGlow.position.copy(sunS.position); sunGlow.scale.setScalar(sR * 4.5);
      const rVis = tt > MIL[13][1] - 1.1; R136.visible = r136Glow.visible = rVis; const rR = U(40 * 696340e3);
      const side3 = new THREE.Vector3(0.7, 0.25, -0.8).normalize(); R136.position.copy(bc).addScaledVector(side3, rb + rR * 1.15 + lerp(rR * 1.5, 0, smooth(MIL[13][1] - 1.1, MIL[13][1], tt))); r136Glow.position.copy(R136.position); r136Glow.scale.setScalar(rR * 4);
      sunC.position.copy(bc).add(new THREE.Vector3(600, 300, 500).normalize().multiplyScalar(camD * 3)); sunC.target.position.copy(bc);
      if (sunVis) { sunC.position.copy(sunS.position); }
      const yaw = 0.0 + 0.35 * smooth(CUT2, TOT, tt) + 0.04 * Math.sin(tt * 0.3);
      const lookP = bc.clone(); if (moon.visible) lookP.lerp(moon.position, 0.25 * smooth(MIL[9][1] - 0.9, MIL[9][1], tt)); if (jup.visible) lookP.lerp(jup.position, 0.28 * smooth(MIL[11][1] - 0.9, MIL[11][1], tt));
      if (sunVis) lookP.lerp(sunS.position, 0.32 * smooth(MIL[12][1] - 1.0, MIL[12][1], tt) * (1 - smooth(MIL[13][1] - 1, MIL[13][1], tt))); if (rVis) lookP.lerp(R136.position, 0.18 * smooth(MIL[13][1] - 1.1, MIL[13][1], tt));
      const fwd = new THREE.Vector3(Math.sin(yaw) * 0.85, 0.22, Math.cos(yaw) * 0.85).normalize();
      camC.position.copy(lookP).addScaledVector(fwd, camD); camC.lookAt(lookP); camC.near = camD * 0.002; camC.far = camD * 400; camC.fov = 46; camC.updateProjectionMatrix();
      starPts.position.copy(camC.position); starPts.scale.setScalar(camD * 60 / 4e8);
      out.scene = C3; out.camera = camC; out.dof = 0; out.space = true; out.focus = ball; out.rb = rb; out.vignette = 0.45; out.bloom = 0.3; out.bloomThreshold = 0.85;
      out.flash = 0.35 * pulse(tt, CUT2, 0.3) + 0.25 * pulse(tt, MIL[12][1], 0.4); out.shake = 0.12 * pulse(tt, MIL[10][1], 0.4) + 0.15 * pulse(tt, MIL[13][1], 0.5);
    }
    // Mittens cam (big part)
    { const show = tt > CUT ? smooth(CUT, CUT + 0.35, tt) : 0; const m = mood;
      mcAnts.rotation.y = tt * 0.15; mcAnts.material.map.offset.set(tt * 0.02, tt * 0.03);
      mcP.group.position.set(-0.3, -0.76, -0.15); mcP.group.rotation.set(0, 0.45, 0); sitGround(mcP); mcP.armR.rotation.set(-1.0, 0.2, 0.2);
      const k = mi % 3; setFace(mcP, [{ brows: 'up', eyes: 1.35, mouth: 'o', look: [0.5, 0.2] }, { brows: 'worried', eyes: 1.15, mouth: 'flat', look: [0.6, 0.3] }, { brows: 'up', eyes: 1.25, mouth: 'open', open: 1.1, look: [0.5, 0.5] }][k]); mcP.headPivot.rotation.set(-0.15, 0.25, 0); life(mcP, tt, 0.8);
      mcSand.position.set(0.3, 0.005, 0.25); mc.position.set(0.45, 0.005, -0.15); mc.rotation.set(0, -0.6, 0); mc.scale.setScalar(1.3);
      setCatFace(mc, m, 0.3); catLife(mc, tt, 1); MCC.headPivot.rotation.y = 0.25 * Math.sin(tt * 0.9) + (m === 'unimpressed' ? -0.4 : 0);
      out.inset = { scene: MCam, camera: mcCam, x: 0.74, y: 0.73, r: 0.155, show, ring: '#ffd23f' }; out.mcMood = m; }
    return out;
  }

  // ---------------- on-screen text ----------------
  const CAP = [[2.3, 3.85, 'One ant crashes your quiet picnic.'], [3.89, 5.85, 'Real ants need six weeks to grow.'], [5.93, 9.6, 'This one doubles every minute. In two hours, it outweighs the Sun.'],
    [9.66, 12.3, 'You could flick it away. You say one ant is fine.'], [12.36, 14.75, 'Seventeen minutes. They outweigh your sandwich.'], [14.81, 17.3, 'Now they outweigh Mittens. He is not impressed.'],
    [17.38, 20.05, 'Now they outweigh you. One ant was fine, you said.'], [20.13, 22.18, 'Half an hour. Heavier than an elephant.'], [22.24, 23.8, 'Heavier than the Eiffel Tower.'],
    [23.85, 25.65, 'More ants than every ant on Earth.'], [25.7, 27.8, 'They outweigh all eight billion humans.'], [27.85, 30.2, 'So heavy, its own gravity pulls it round.'],
    [30.25, 32.55, 'A hundred and two minutes. Heavier than Earth.'], [32.61, 34.38, 'Two hours. Heavier than the Sun.'], [34.42, 36.4, 'Well. You did say one ant was fine.']];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function topText(ctx, W, t, a, b, txt, size = 54, y = 250) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.15, (b - t) / 0.15));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 700 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.86).forEach((l, i) => { ctx.strokeText(l, W / 2, y + i * size * 1.22); ctx.fillText(l, W / 2, y + i * size * 1.22); }); ctx.restore(); }
  function proj(pos, camO) { tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  function mileLabel(ctx, p, title, sub, a = 1) { if (a <= 0 || !p) return; let [x, y] = p; x = clamp(x, 300, 1040); y = clamp(y, 820, 1480);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 42px ${FONT}`; const tw = ctx.measureText(title).width; ctx.font = `700 28px ${FONT}`; const sw = sub ? ctx.measureText(sub).width : 0; const w = Math.min(1000, Math.max(tw, sw) + 36), h = sub ? 100 : 68;
    const lx = clamp(x - w / 2, 70, 1050 - w), ly = y - h - 26; ctx.fillStyle = 'rgba(10,12,16,0.82)'; ctx.beginPath(); ctx.roundRect(lx, ly, w, h, 16); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(clamp(x, lx + 20, lx + w - 20), ly + h); ctx.lineTo(x, y - 4); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `900 42px ${FONT}`; ctx.fillText(title, lx + 18, ly + 35, w - 30); if (sub) { ctx.font = `700 28px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(sub, lx + 18, ly + 77, w - 30); } ctx.restore(); }
  const WORDS = [[1e36, 'UNDECILLION'], [1e33, 'DECILLION'], [1e30, 'NONILLION'], [1e27, 'OCTILLION'], [1e24, 'SEPTILLION'], [1e21, 'SEXTILLION'], [1e18, 'QUINTILLION'], [1e15, 'QUADRILLION'], [1e12, 'TRILLION'], [1e9, 'BILLION']];
  function bigWord(x) { for (const [p, w] of WORDS) if (x >= p) { const k = x / p; return (k < 10 ? k.toFixed(1).replace('.0', '') : Math.floor(k).toLocaleString('en-US')) + ' ' + w; } return Math.round(x).toLocaleString('en-US'); }
  function fmtMass(kg) { if (kg < 1e-3) return Math.round(kg * 1e6).toLocaleString('en-US') + ' MG'; if (kg < 1) return Math.max(1, Math.round(kg * 1000)).toLocaleString('en-US') + ' G'; if (kg < 1000) return (kg < 10 ? kg.toFixed(1) : Math.round(kg).toLocaleString('en-US')) + ' KG';
    const t = kg / 1000; if (t < 1e6) return Math.round(t).toLocaleString('en-US') + ' T'; if (kg < 5.972e24 * 0.999) { if (t < 1e9) return Math.round(t / 1e6).toLocaleString('en-US') + ' MILLION T'; return bigWord(t) + ' T'; }
    const fx = (x) => x < 10 ? x.toFixed(1) : Math.round(x).toLocaleString('en-US'); if (kg < 1.989e30) return fx(kg / 5.972e24) + ' × EARTH'; return fx(kg / 1.989e30) + ' × THE SUN'; }
  const GMAX = 130;
  function gauge(ctx, tt, st) { const x = 44, y0 = 330, y1 = 1500, w = 22; const n = st.n ?? 0, mi = st.mi ?? -1; const f = clamp(n / GMAX); const yF = lerp(y1, y0, f);
    ctx.save(); ctx.fillStyle = 'rgba(10,12,16,0.55)'; ctx.beginPath(); ctx.roundRect(x - 6, y0 - 6, w + 12, y1 - y0 + 12, 16); ctx.fill();
    const gr = ctx.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, '#ffd23f'); gr.addColorStop(0.5, '#ff8a3a'); gr.addColorStop(1, '#e63946'); ctx.fillStyle = gr; if (y1 - yF > 1) { ctx.beginPath(); ctx.roundRect(x, yF, w, Math.max(8, y1 - yF), 10); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; MIL.forEach(([mm]) => { const py = lerp(y1, y0, mm / GMAX); ctx.beginPath(); ctx.moveTo(x + w + 4, py); ctx.lineTo(x + w + 18, py); ctx.stroke(); });
    ctx.restore();
    const cnt = st.count ?? 1; const num = cnt < 1e9 ? Math.round(cnt).toLocaleString('en-US') : bigWord(cnt); const bump = mi >= 0 ? pulse(tt, MIL[mi][1], 0.4) : 0;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.font = `800 30px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#ffd23f'; const lab = cnt === 1 ? 'ANT' : 'ANTS'; ctx.strokeText(lab, 92, 392); ctx.fillText(lab, 92, 392);
    ctx.save(); ctx.translate(92, 478); ctx.scale(1 + bump * 0.12, 1 + bump * 0.12); let fs = 88; ctx.font = `900 ${fs}px ${FONT}`; while (ctx.measureText(num).width > 880 && fs > 40) { fs -= 4; ctx.font = `900 ${fs}px ${FONT}`; }
    ctx.lineWidth = 10; ctx.strokeText(num, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(num, 0, 0); ctx.restore();
    const minute = Math.floor((st.n ?? 0) + 1e-9); const sub = 'MINUTE ' + minute + '  ·  ' + fmtMass(st.massKg ?? ANT_KG);
    ctx.font = `800 34px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(sub, 94, 530); ctx.fillStyle = '#ffd23f'; ctx.fillText(sub, 94, 530);
    let txt = '', colr = '#ffe9b0'; const justPassed = mi >= 0 && tt < MIL[mi][1] + 0.7; if (justPassed) { txt = 'PASSED: ' + MIL[mi][2]; colr = '#7dff9a'; } else if (mi + 1 < MIL.length) txt = 'NEXT: MIN ' + MIL[mi + 1][0] + ' = ' + MIL[mi + 1][2];
    if (txt) { ctx.font = `800 29px ${FONT}`; ctx.lineWidth = 6; const tw = ctx.measureText(txt).width; if (tw > 940) ctx.font = `800 ${Math.floor(29 * 940 / tw)}px ${FONT}`; ctx.strokeText(txt, 94, 576); ctx.fillStyle = colr; ctx.fillText(txt, 94, 576); }
    ctx.font = `700 24px ${FONT}`; ctx.lineWidth = 5; ctx.strokeText('×2 EVERY MINUTE', 94, 614); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('×2 EVERY MINUTE', 94, 614);
    ctx.restore(); }
  function pov(ctx, k) { const a = clamp(k * 4); ctx.save(); ctx.globalAlpha = a; ctx.font = `900 50px ${FONT}`; const txt = 'POV: you said one ant is fine'; const w = ctx.measureText(txt).width + 60; const x = (1080 - w) / 2, y = 1180;
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.beginPath(); ctx.roundRect(x, y, w, 86, 18); ctx.fill(); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 540, y + 45); ctx.restore(); }
  function hud(ctx, tt0, st) { const W = 1080, Hh = 1920; const tt = st.tt;
    const title = (x) => drawTitleTimed(ctx, W, Hh, [{ text: 'WHAT IF ONE ANT', size: 84 }, { text: 'DOUBLED EVERY MINUTE?', size: 80, accent: true }], x, '#ffd23f', { start: 0, wps: 1000, outAt: 1.9, y: 0.115 });
    gauge(ctx, tt, st);
    if (st.teaser) { title(tt0 + 0.01); pov(ctx, st.tk); return; }
    title(tt0);
    for (const [a, b, txt] of CAP) topText(ctx, W, tt, a, b, txt);
    const camO = st.camera;
    if (tt < CUT && camO) {
      // tags + bubbles (human part)
      P.group.updateMatrixWorld(true); P.headPivot.getWorldPosition(tv); const ph = proj([tv.x, tv.y + 0.32, tv.z], camO);
      mit.updateMatrixWorld(true); MC.headPivot.getWorldPosition(tv); const pm = proj([tv.x, tv.y + 0.22, tv.z], camO);
      const pa = proj([S.x, SAND_TOP + 0.03, S.z], camO);
      if (pa) drawTag(ctx, pa[0], pa[1] - 40, '1 ANT', tt - 2.0, { dur: 4.0, bg: '#ffffff' });
      if (ph) drawTag(ctx, ph[0], ph[1] - 10, 'YOU', tt - 1.5, { dur: 2.2, bg: '#7dd3ff' });
      if (pm) drawTag(ctx, pm[0], pm[1] - 10, 'MITTENS', tt - 2.4, { dur: 2.4 });
      if (ph) drawBubble(ctx, ph[0], Math.max(ph[1] - 20, 760), 'ONE ANT IS FINE.', tt - 10.0, { dur: 1.9, size: 46 });
      if (tt > 13.5 && tt < 16.8) { unb.group.updateMatrixWorld(true); unb.headPivot.getWorldPosition(tv); const pu = proj([tv.x, tv.y + 0.3, tv.z], camO); if (pu && pu[1] > 700) drawTag(ctx, pu[0], pu[1], 'THE UNBOTHERED GUY', tt - 13.5, { dur: 2.2, bg: '#c9f0c0' }); }
      if (tt > 14.9) { bt.group.updateMatrixWorld(true); bt.headPivot.getWorldPosition(tv); const pb = proj([tv.x, tv.y + 0.32, tv.z], camO); if (pb) drawBubble(ctx, pb[0], Math.max(760, pb[1] - 10), 'SURPRISE!', tt - 15.2, { dur: 1.3, size: 48 }); if (pb) drawBubble(ctx, pb[0], Math.max(760, pb[1] - 10), '...OH NO.', tt - 16.7, { dur: 1.2, size: 44 }); }
      // milestone labels next to the pile
      for (let i = 0; i <= 2; i++) { const t1 = MIL[i][1]; if (!(tt > t1 - 0.2 && tt < t1 + 2.2)) continue; const a = smooth(t1 - 0.2, t1, tt) * (1 - smooth(t1 + 1.9, t1 + 2.2, tt));
        const rp = st.rp || 0.05; const p = proj([S.x + rp * 0.2, rp * 0.95 + 0.02, S.z], camO); if (p) p[1] = Math.max(p[1], 900); mileLabel(ctx, p, 'MIN ' + MIL[i][0] + ' = ' + MIL[i][2], MIL[i][3], a); }
    } else if (tt < CUT2 && camO) {
      for (let i = 3; i <= 7; i++) { const t1 = MIL[i][1]; const e1 = i < 7 ? Math.min(1.5, MIL[i + 1][1] - t1 - 0.1) : 2.0; if (!(tt > t1 - 0.2 && tt < t1 + e1)) continue; const a = smooth(t1 - 0.2, t1, tt) * (1 - smooth(t1 + e1 - 0.25, t1 + e1, tt));
        const rp = st.rp; const p = proj([0, rp * 0.98, 0], camO); const sub = MIL[i][3] + '  ·  ants ' + fmtMass(massAt(MIL[i][0])).toLowerCase().replace(' t', ' t'); mileLabel(ctx, p, 'MIN ' + MIL[i][0] + ' = ' + MIL[i][2], i === 6 || i === 7 ? MIL[i][3] : sub, a); }
    } else if (camO) {
      for (let i = 8; i < MIL.length; i++) { const t1 = MIL[i][1]; const e1 = i < MIL.length - 1 ? Math.min(1.6, MIL[i + 1][1] - t1 - 0.1) : 1e9; if (!(tt > t1 - 0.2 && tt < t1 + e1)) continue; const a = smooth(t1 - 0.2, t1, tt) * (i < MIL.length - 1 ? 1 - smooth(t1 + e1 - 0.25, t1 + e1, tt) : 1);
        const b = ball.position, rb = st.rb; const p = proj([b.x, b.y + rb * 0.9, b.z], camO); const sub = MIL[i][3] || ('heavier than ' + (i === 9 ? 'the Moon' : i === 10 ? 'Earth' : 'Jupiter')); mileLabel(ctx, p, 'MIN ' + MIL[i][0] + ' = ' + MIL[i][2], sub, a); }
    }
    if (tt >= 36.44) topText(ctx, W, tt, 36.44, 1e9, 'At which minute would you have flicked it away?', 52);
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
