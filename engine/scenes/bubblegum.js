import { clamp, lerp, smooth, easeOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, softTex, setFace, life, drawTitleTimed, drawTag, drawBubble, drawTeaser, RoundedBoxGeometry, stars, makeEarth } from './lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 25 episode: "What if every breath doubled your gum bubble?"  (Nov 20 STANDARD)
// HUMAN PART (office, golden light through the window): you blow a 5 cm bubble at your desk. Breath 3 knocks your coffee off the
//   paper stack, breath 4 beats the 50.8 cm world record and bumps Mittens (he jumps onto your head), breath 5 shoves the desk,
//   breath 6 (3.2 m) bursts through the 2.7 m ceiling and lifts you off your chair. Cast: THE FILMER (films, complains about the
//   lighting) and THE SALESMAN (already selling bubble T-shirts, gets squashed against the wall).
// BIG PART (clean): one fixed framing in units of the bubble radius, so the bubble stays the same size on screen while the world
//   shrinks next to it: the town house (7), lift-off (8), Statue of Liberty (11), Burj Khalifa (15), Everest (18), the edge of space
//   (21), the Moon (27), Earth (28), Jupiter (32), the Sun (35), Earth's orbit (43), Neptune's orbit (48); keeps doubling to breath 52.
// Teaser (0-1.2 s): REWIND - the last frame plays backwards fast, tape-rewind overlay, then the office. Last frame = first frame.
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const TEASER = 1.2, TOT = 39.6, CUT = 10.2;
const D0 = 0.05;  // breath 0 = a normal 5 cm bubble
// [breath, video time, label, sub]
const MIL = [[3, 3.8, 'COFFEE GONE', 'bubble 40 cm'], [4, 4.9, 'WORLD RECORD', 'record: 50.8 cm (2004)'], [5, 6.6, 'BIGGER THAN YOUR DESK', 'desk 1.4 m'],
  [6, 8.8, 'THROUGH THE CEILING', 'ceiling 2.7 m'], [8, 12.6, 'IT LIFTS YOU', 'warm breath: 72 kg of lift'], [11, 14.0, 'STATUE OF LIBERTY', '93 m to the torch'],
  [15, 16.65, 'BURJ KHALIFA', '828 m'], [18, 19.15, 'MOUNT EVEREST', '8,849 m'], [21, 21.5, 'SPACE STARTS', '100 km up'], [27, 24.6, 'THE MOON', '3,475 km wide'],
  [28, 25.65, 'EARTH', '12,742 km wide'], [32, 27.35, 'JUPITER', '139,820 km wide'], [35, 28.8, 'THE SUN', '1.39 million km wide'],
  [43, 32.75, "EARTH'S WHOLE ORBIT", '299 million km across'], [48, 36.4, "NEPTUNE'S ORBIT", '9 billion km across']];
const KF = [[1.6, 0], [2.0, 1], [2.9, 2], [3.8, 3], [4.9, 4], [6.6, 5], [8.8, 6], [10.4, 7], [12.6, 8], [14.0, 11], [16.65, 15], [19.15, 18], [21.5, 21], [24.6, 27], [25.65, 28], [27.35, 32], [28.8, 35], [32.75, 43], [36.4, 48], [TOT + 0.05, 52.1]];
function nAt(tt) { if (tt <= KF[0][0]) return 0; for (let i = 0; i < KF.length - 1; i++) if (tt < KF[i + 1][0]) return lerp(KF[i][1], KF[i + 1][1], (tt - KF[i][0]) / (KF[i + 1][0] - KF[i][0])); return KF[KF.length - 1][1]; }
export { TOT, MIL, nAt };

export async function create({ THREE, W, H }) {
  const R = rng(2511);
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

  // the gum: glossy pink, slightly lighter where it is stretched thin
  const gumT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#ff7fb5'; g.fillRect(0, 0, w, h); const r = rng(3); for (let k = 0; k < 140; k++) { const x = r() * w, y = r() * h, s = 10 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(255,${190 + r() * 40},${220 + r() * 30},0.35)`); gr.addColorStop(1, 'rgba(255,200,230,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2); } });
  const gumM = () => new THREE.MeshPhysicalMaterial({ map: gumT, color: 0xffffff, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.6, sheenColor: new THREE.Color(0xffd0e6), sheenRoughness: 0.4 });

  // =====================================================================================================
  // SCENE A: the office (metres). You sit at x=-0.55 facing +x; the bubble grows along +x from your mouth.
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(48, W / H, 0.02, 300); A.background = new THREE.Color(0xe8c49a);
  A.add(new THREE.HemisphereLight(0xfff0e0, 0x8a6a50, 0.95));
  const SUND = new THREE.Vector3(0.45, 0.55, 0.7).normalize();
  const sun = new THREE.DirectionalLight(0xffc98a, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  { const c = sun.shadow.camera; c.left = -6; c.right = 6; c.top = 6; c.bottom = -6; c.near = 1; c.far = 40; sun.position.copy(SUND).multiplyScalar(15); }
  const faceL = new THREE.PointLight(0xffd8a8, 2.2, 6, 1.5); faceL.position.set(0.9, 1.6, 1.4); A.add(faceL);
  const winL = new THREE.DirectionalLight(0xffb070, 1.2); winL.position.set(1.5, 2, -6); A.add(winL);
  const RW = { x0: -4.0, x1: 4.6, z0: -2.4, z1: 12.0, hC: 2.7 };
  const woodT = canvasTex(512, 512, (g, w, h) => { const r = rng(5); for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(${28 + r() * 6},${45 + r() * 10}%,${46 + r() * 8}%)`; g.fillRect(0, i * 64, w, 64); g.fillStyle = 'rgba(60,30,10,0.25)'; g.fillRect(0, i * 64, w, 2); for (let k = 0; k < 30; k++) { g.fillStyle = 'rgba(90,50,20,0.12)'; g.fillRect(r() * w, i * 64 + r() * 60, 40 + r() * 120, 1.5); } } });
  woodT.wrapS = woodT.wrapT = THREE.RepeatWrapping; woodT.repeat.set(5, 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW.x1 - RW.x0, RW.z1 - RW.z0), new THREE.MeshStandardMaterial({ map: woodT, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.position.set((RW.x0 + RW.x1) / 2, 0, (RW.z0 + RW.z1) / 2); floor.receiveShadow = true; floor.name = 'floor'; A.add(floor);
  const wallM = M(0xf3e3c8, 0.9), wallM2 = M(0xb9d6c9, 0.9);
  { const B = Builder(); const g = new THREE.Group();
    // back wall with a window (x 0.6..3.6, y 0.9..2.35)
    B.add(BX(4.6, RW.hC, 0.15), wallM2, -1.7, RW.hC / 2, RW.z0); B.add(BX(1.0, RW.hC, 0.15), wallM2, 4.1, RW.hC / 2, RW.z0);
    B.add(BX(3.0, 0.9, 0.15), wallM2, 2.1, 0.45, RW.z0); B.add(BX(3.0, 0.35, 0.15), wallM2, 2.1, 2.525, RW.z0);
    B.add(BX(3.1, 0.08, 0.3), M(0xffffff, 0.5), 2.1, 0.9, RW.z0 + 0.08); for (const x of [0.6, 2.1, 3.6]) B.add(BX(0.07, 1.45, 0.12), M(0xffffff, 0.5), x, 1.625, RW.z0); B.add(BX(3.0, 0.07, 0.12), M(0xffffff, 0.5), 2.1, 2.35, RW.z0);
    B.add(BX(0.15, RW.hC, RW.z1 - RW.z0), wallM, RW.x0, RW.hC / 2, (RW.z0 + RW.z1) / 2); B.add(BX(0.15, RW.hC, RW.z1 - RW.z0), wallM, RW.x1, RW.hC / 2, (RW.z0 + RW.z1) / 2);
    B.add(BX(RW.x1 - RW.x0, 0.1, 0.04), M(0x8a6a50, 0.7), (RW.x0 + RW.x1) / 2, 0.05, RW.z0 + 0.09);
    // plenum slab above the ceiling tiles + a duct
    B.add(BX(RW.x1 - RW.x0, 0.25, RW.z1 - RW.z0), M(0x55504c, 0.95), (RW.x0 + RW.x1) / 2, 3.55, (RW.z0 + RW.z1) / 2); B.add(CY(0.25, 0.25, RW.z1 - RW.z0, 14), M(0x9aa0a8, 0.5, 0.6), -1.8, 3.15, (RW.z0 + RW.z1) / 2, Math.PI / 2);
    // pin board + clock on the back wall, a filing cabinet and a plant
    B.add(BX(1.2, 0.8, 0.04), M(0xc89a62, 0.9), -1.6, 1.6, RW.z0 + 0.1); for (let i = 0; i < 6; i++) B.add(BX(0.2, 0.26, 0.01), M([0xffe07a, 0x9ad0ff, 0xff9ab0, 0xffffff][i % 4], 0.8), -2.0 + (i % 3) * 0.38, 1.75 - Math.floor(i / 3) * 0.34, RW.z0 + 0.125, 0, 0, (i - 3) * 0.05);
    B.add(CY(0.17, 0.17, 0.04, 24), M(0xffffff, 0.4), -0.3, 2.2, RW.z0 + 0.1, Math.PI / 2); B.add(BX(0.015, 0.11, 0.01), M(0x111111, 0.4), -0.3, 2.24, RW.z0 + 0.13); B.add(BX(0.08, 0.012, 0.01), M(0x111111, 0.4), -0.27, 2.2, RW.z0 + 0.13);
    B.add(RB(0.5, 1.2, 0.6, 0.03), M(0x6f7f8f, 0.5, 0.4), -3.4, 0.6, -1.6); for (let i = 0; i < 3; i++) B.add(BX(0.2, 0.03, 0.01), M(0xdddddd, 0.3, 0.6), -3.4, 0.95 - i * 0.37, -1.29);
    B.add(CY(0.18, 0.14, 0.4, 16), M(0xc0603a, 0.8), -2.9, 0.2, 0.9); B.add(new THREE.IcosahedronGeometry(0.4, 1), M(0x4f8f3a, 0.8), -2.9, 0.75, 0.9);
    B.build(g); A.add(g); }
  // ceiling tiles (drop ceiling) - break and fall when the bubble pushes through
  const TS = 0.6; const TILES = []; for (let x = RW.x0 + TS / 2; x < RW.x1; x += TS) for (let z = RW.z0 + TS / 2; z < RW.z1; z += TS) TILES.push({ x, z, tb: 1e9, vx: 0, vz: 0, rot: R() * 2 - 1 });
  const tileI = new THREE.InstancedMesh(new THREE.BoxGeometry(TS - 0.03, 0.03, TS - 0.03), M(0xf4f1ea, 0.95), TILES.length); tileI.castShadow = false; tileI.receiveShadow = true; tileI.name = 'ceiling'; A.add(tileI);
  const gridM = new THREE.Mesh(new THREE.PlaneGeometry(RW.x1 - RW.x0, RW.z1 - RW.z0), new THREE.MeshStandardMaterial({ color: 0xbdb7ad, roughness: 0.9, side: THREE.DoubleSide })); gridM.rotation.x = Math.PI / 2; gridM.position.set((RW.x0 + RW.x1) / 2, RW.hC + 0.02, (RW.z0 + RW.z1) / 2); gridM.name = 'ceilinggrid';
  // ceiling lights (panels)
  { const lm = new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false }); for (const [x, z] of [[-1.8, 0.6], [1.2, 0.6], [-1.8, 4.2], [1.2, 4.2]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.02, 0.55), lm); p.position.set(x, RW.hC - 0.02, z); p.userData.light = true; A.add(p); TILES.forEach(t => { if (Math.abs(t.x - x) < 0.6 && Math.abs(t.z - z) < 0.3) t.hidden = true; }); p.userData.tile = TILES.find(t => Math.abs(t.x - x) < 0.31 && Math.abs(t.z - z) < 0.31); A.userData.panels = (A.userData.panels || []).concat([p]); } }
  // the view out of the window: a golden street of town houses
  { const tex = canvasTex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fa6e0'); gr.addColorStop(0.6, '#ffd39a'); gr.addColorStop(1, '#ffc080'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const r = rng(8); const pal = ['#f1d9a8', '#e9a08a', '#a9c8e0', '#f6efe2', '#e8c36b', '#d0714f', '#c9b6df']; let x = -20; let k = 0; while (x < w) { const bw = 90 + r() * 70, bh = 220 + r() * 160; g.fillStyle = pal[k % pal.length]; g.fillRect(x, h - bh, bw, bh); g.fillStyle = ['#b0553a', '#6a4a3a', '#8a3a2a'][k % 3]; g.beginPath(); g.moveTo(x - 6, h - bh); g.lineTo(x + bw / 2, h - bh - 40 - r() * 20); g.lineTo(x + bw + 6, h - bh); g.fill();
        for (let fy = h - bh + 30; fy < h - 70; fy += 55) for (let fx = x + 14; fx < x + bw - 24; fx += 34) { g.fillStyle = r() < 0.4 ? '#ffe2a8' : '#2a3a4c'; g.fillRect(fx, fy, 18, 30); g.fillStyle = ['#2f7d6a', '#9a3b2f', '#1d3f6e'][k % 3]; g.fillRect(fx - 6, fy, 5, 30); g.fillRect(fx + 19, fy, 5, 30); }
        x += bw + 4; k++; } });
    const out = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map: tex })); out.position.set(2.1, 1.6, RW.z0 - 2.5); A.add(out); }
  // desk (origin = its left edge, x from 0 to 1.4), monitor, keyboard, paper stack + coffee mug, office chair
  const desk = new THREE.Group(); { const B = Builder(); B.add(RB(1.4, 0.05, 0.9, 0.02), M(0xd8b48a, 0.6), 0.7, 0.75, 0); for (const [x, z] of [[0.06, -0.4], [1.34, -0.4], [0.06, 0.4], [1.34, 0.4]]) B.add(CY(0.025, 0.025, 0.73, 10), M(0x3a3e44, 0.4, 0.6), x, 0.365, z);
    B.add(RB(0.16, 0.03, 0.45, 0.01), M(0x2a2e33, 0.5), 0.35, 0.79, 0.0); B.add(RB(0.08, 0.02, 0.05, 0.01), M(0x2a2e33, 0.5), 0.35, 0.785, 0.32); B.build(desk); A.add(desk); }
  const monitor = new THREE.Group(); { const B = Builder(); B.add(RB(0.05, 0.42, 0.66, 0.02), M(0x22262b, 0.4), 0, 0.3, 0); B.add(CY(0.02, 0.03, 0.2, 10), M(0x22262b, 0.4), 0.03, 0.06, 0); B.add(RB(0.2, 0.015, 0.25, 0.01), M(0x22262b, 0.4), 0.03, 0.008, 0); B.build(monitor);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), new THREE.MeshBasicMaterial({ map: canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#2a4a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(14, 14, w - 28, 18); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#9ad0ff' : '#ffffff'; g.fillRect(14, 44 + i * 18, 40 + (i * 53) % 150, 8); } g.fillStyle = '#ffd23f'; g.fillRect(180, 50, 60, 80); }) })); scr.rotation.y = -Math.PI / 2; scr.position.set(-0.028, 0.3, 0); monitor.add(scr); A.add(monitor); }
  const stack = new THREE.Group(); { const B = Builder(); for (let i = 0; i < 9; i++) B.add(BX(0.3, 0.035, 0.22), M(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xf6f0dc : 0xe8eef6, 0.9), 0, 0.775 + 0.018 + i * 0.036, 0, 0, (i % 4 - 1.5) * 0.06); B.build(stack); A.add(stack); }
  const STACK_TOP = 0.775 + 9 * 0.036;
  const mug = new THREE.Group(); { const B = Builder(); B.add(CY(0.045, 0.04, 0.1, 20), M(0xe63946, 0.4), 0, 0.05, 0); B.add(new THREE.TorusGeometry(0.03, 0.009, 8, 16), M(0xe63946, 0.4), 0.05, 0.05, 0, 0, 0, 0); B.add(CY(0.04, 0.04, 0.005, 20), M(0x4a2a14, 0.3), 0, 0.093, 0); B.build(mug); A.add(mug); }
  const coffeeSpill = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.2 })); coffeeSpill.rotation.x = -Math.PI / 2; coffeeSpill.position.y = 0.003; A.add(coffeeSpill);
  const chair = new THREE.Group(); { const B = Builder(); const blk = M(0x2a2e33, 0.6); B.add(RB(0.48, 0.08, 0.48, 0.04), blk, 0, 0.47, 0); B.add(RB(0.08, 0.55, 0.46, 0.04), blk, -0.25, 0.8, 0, 0, 0, -0.1); B.add(CY(0.03, 0.03, 0.4, 10), M(0x9aa0a8, 0.3, 0.7), 0, 0.25, 0);
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; B.add(BX(0.3, 0.03, 0.04), M(0x9aa0a8, 0.3, 0.7), Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, 0, -a, 0); B.add(SP(0.03, 8, 6), blk, Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29); } B.build(chair); A.add(chair); }

  // ---------------- characters ----------------
  const heroOpts = { shirt: 0xffb83a, pants: 0x2b3550, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xf2f2f2, seed: 5, hairStyle: 'short' };
  const P = makePerson(THREE, heroOpts); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const mit = makeCat(THREE, 0xf0a040); mit.rotation.order = 'YXZ'; A.add(mit); const MC = mit.userData.cat;
  // THE FILMER: films the whole thing on her phone, complains about the lighting
  const fil = makePerson(THREE, { shirt: 0x7a5ad8, pants: 0x30303a, hair: 0xc8442a, skin: 0xe8b896, shoe: 0x222222, seed: 31, hairStyle: 'long' }); fil.group.rotation.order = 'YXZ'; A.add(fil.group);
  const phone = new THREE.Group(); { const B = Builder(); B.add(RB(0.08, 0.15, 0.012, 0.01), M(0x111111, 0.3, 0.3), 0, 0, 0); B.build(phone); const sc2 = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.13), new THREE.MeshBasicMaterial({ color: 0xaee0ff, toneMapped: false })); sc2.position.z = -0.007; sc2.rotation.y = Math.PI; phone.add(sc2); A.add(phone); }
  // THE SALESMAN: already selling bubble T-shirts
  const sal = makePerson(THREE, { shirt: 0x2a6a5a, pants: 0x55493a, hair: 0x1a1210, skin: 0xb5835a, shoe: 0x3a2a1a, seed: 47, hairStyle: 'short' }); sal.group.rotation.order = 'YXZ'; A.add(sal.group);
  const tshirt = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.6), new THREE.MeshStandardMaterial({ map: canvasTex(256, 280, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ff7fb5'; g.beginPath(); g.moveTo(60, 20); g.lineTo(100, 8); g.quadraticCurveTo(128, 40, 156, 8); g.lineTo(196, 20); g.lineTo(250, 70); g.lineTo(215, 105); g.lineTo(195, 90); g.lineTo(195, 272); g.lineTo(61, 272); g.lineTo(61, 90); g.lineTo(41, 105); g.lineTo(6, 70); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `900 34px ${FONT}`; g.fillText('I ♥', 128, 130); g.fillText('BUBBLE', 128, 172); g.font = `900 28px ${FONT}`; g.fillStyle = '#ffd23f'; g.fillText('€20', 128, 220); }), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 })); A.add(tshirt);
  const salSign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.22), new THREE.MeshStandardMaterial({ map: signTex(['T-SHIRTS €20'], '#ffd23f', '#1a1a1a', 512, 160), roughness: 0.6 })); A.add(salSign);

  // ---------------- the bubble (A) ----------------
  const bubA = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), gumM()); bubA.castShadow = true; bubA.receiveShadow = true; bubA.name = 'bubble'; A.add(bubA);
  const lipGum = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 10, 20), gumM()); A.add(lipGum);
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M(0xe8e2d6, 0.95), 160); dust.frustumCulled = false; A.add(dust); const DU = []; for (let i = 0; i < 160; i++) DU.push({ x: R() * 2 - 1, z: R() * 2 - 1, v: 0.5 + R() * 1.5, s: 0.01 + R() * 0.03, d: R() * 0.5 });

  // geometry helpers for scene A
  const SEAT_Y = -0.31, HERO_X = -0.55, YA = 0.5; const MOUTH_OFF = new THREE.Vector3(0.183 * Math.cos(YA), 1.558, 0.183 * Math.sin(YA)); const MOUTH_OFF0 = new THREE.Vector3(0.183, 1.558, 0); const M0 = new THREE.Vector3(HERO_X + MOUTH_OFF.x, SEAT_Y + MOUTH_OFF.y, MOUTH_OFF.z);
  const DIRA = new THREE.Vector2(0.94, -0.34).normalize();
  function bubbleA(r) { // returns { c: centre, m: mouth }
    let hd = DIRA.x * r, cy = M0.y + DIRA.y * r, my = M0.y;
    if (cy < r) { my = Math.min(2.0, r * (1 - DIRA.y)); const s = clamp((my - r) / r, -1, 1); cy = r; hd = r * Math.sqrt(1 - s * s); }
    return { c: new THREE.Vector3(M0.x + hd * Math.cos(YA), cy, M0.z + hd * Math.sin(YA)), m: new THREE.Vector3(M0.x, my, M0.z) }; }
  const nVis = (tt) => { const n = nAt(tt); if (tt >= CUT || n < 1) return n; const k = Math.floor(n); const u = n - k;
    if (k === 5) return 5 + 0.7 * easeOut(clamp(u * 2.4));            // breath 5 stops just under the ceiling (2.6 m < 2.7 m)
    if (k >= 6) return 5.7 + 0.75 * easeOut(clamp(u * 1.4));           // breath 6: through the ceiling (cut before breath 7 fills the room)
    return k + easeOut(clamp(u * 2.4)); };
  const rAt = (tt) => (tt < 1.6 ? D0 * smooth(1.2, 1.6, tt) * 0.5 : D0 * Math.pow(2, nVis(tt)) / 2);
  // when does each ceiling tile break? (first time the bubble's circle in the ceiling plane reaches it)
  for (let t = 7.0; t < CUT + 0.01; t += 0.01) { const r = rAt(t); const { c } = bubbleA(r); const dy = RW.hC - c.y; if (r <= dy) continue; const rho = Math.sqrt(r * r - dy * dy);
    for (const T of TILES) if (T.tb > 1e8 && Math.hypot(T.x - c.x, T.z - c.z) < rho + 0.25) { T.tb = t; const a = Math.atan2(T.z - c.z, T.x - c.x); T.vx = Math.cos(a) * (0.6 + R()); T.vz = Math.sin(a) * (0.6 + R()); } }
  const CEIL_T = Math.min(...TILES.map(T => T.tb));

  // =====================================================================================================
  // SCENE B: CLEAN. Units = bubble radius (the bubble is a unit sphere at the origin); the world is scaled by 1/r around it.
  // =====================================================================================================
  const B2 = new THREE.Scene(); const camB = new THREE.PerspectiveCamera(46, W / H, 0.001, 1e6);
  B2.add(new THREE.HemisphereLight(0xcfe0ff, 0x8a7a60, 0.8)); const hemiB = B2.children[0];
  const sunB = new THREE.DirectionalLight(0xffd0a0, 2.8); sunB.position.set(3, 4, 5); B2.add(sunB, sunB.target);
  const fillB = new THREE.DirectionalLight(0xffe8d0, 0.6); fillB.position.set(-4, 1, 3); B2.add(fillB);
  const sky = makeSkyDome(THREE, 0x4a7ac8, 0xffcf96, [SUND.x, SUND.y, SUND.z]); sky.scale.setScalar(5e5); B2.add(sky);
  const skyZen = new THREE.Color(0x4a7ac8), skyHor = new THREE.Color(0xffcf96), black = new THREE.Color(0x02040c);
  const starPts = stars(THREE, 5000, 4e5, 23); starPts.material.transparent = true; B2.add(starPts);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), gumM()); bub.name = 'bubble'; B2.add(bub);
  // the ground world (metres, scaled by 1/r): farmland, a small town, the town house you burst out of
  const world = new THREE.Group(); B2.add(world);
  const fieldsT = canvasTex(1024, 1024, (g, w, h) => { const r = rng(31); const n = 16, cs = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = r(); g.fillStyle = k < 0.45 ? `hsl(${95 + r() * 20},${40 + r() * 15}%,${32 + r() * 10}%)` : k < 0.75 ? `hsl(${50 + r() * 12},${55 + r() * 15}%,${52 + r() * 10}%)` : `hsl(${30 + r() * 10},${35 + r() * 10}%,${40 + r() * 8}%)`; g.fillRect(i * cs, j * cs, cs, cs); }
    g.strokeStyle = '#cfc6b0'; g.lineWidth = 4; for (let i = 0; i <= n; i += 4) { g.beginPath(); g.moveTo(i * cs, 0); g.lineTo(i * cs, h); g.stroke(); g.beginPath(); g.moveTo(0, i * cs); g.lineTo(w, i * cs); g.stroke(); } });
  fieldsT.wrapS = fieldsT.wrapT = THREE.RepeatWrapping; fieldsT.repeat.set(2000, 2000);
  const groundB = new THREE.Mesh(new THREE.CircleGeometry(4e6, 128), new THREE.MeshStandardMaterial({ map: fieldsT, roughness: 0.95 })); groundB.rotation.x = -Math.PI / 2; groundB.receiveShadow = true; groundB.name = 'ground'; world.add(groundB);
  const cityT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c9b89a'; g.fillRect(0, 0, w, h); const r = rng(9); for (let k = 0; k < 1600; k++) { g.fillStyle = ['#f1d9a8', '#e9a08a', '#b0553a', '#f6efe2', '#8a3a2a', '#d0714f'][k % 6]; g.fillRect(r() * w, r() * h, 4 + r() * 8, 4 + r() * 8); } });
  const cityDisk = new THREE.Mesh(new THREE.CircleGeometry(2500, 64), new THREE.MeshStandardMaterial({ map: cityT, roughness: 0.9 })); cityDisk.rotation.x = -Math.PI / 2; cityDisk.position.y = 0.3; world.add(cityDisk);
  const TN = 500; const town = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), TN); const townR = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 0.6, 4).rotateY(Math.PI / 4).translate(0, 0.3, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), TN);
  { const r = rng(77); for (let i = 0; i < TN; i++) { const a = r() * 6.283, d = 14 + Math.pow(r(), 0.8) * 700; const x = Math.cos(a) * d, z = Math.sin(a) * d; const w = 7 + r() * 6, hh = 9 + r() * 9;
    m4.compose(v.set(x, 0, z), q.setFromEuler(e.set(0, r() * 3, 0)), sc.set(w, hh, w * 0.9)); town.setMatrixAt(i, m4); town.setColorAt(i, col.set([0xf1d9a8, 0xe9a08a, 0xa9c8e0, 0xf6efe2, 0xe8c36b, 0xd0714f][i % 6]));
    m4.compose(v.set(x, hh, z), q.setFromEuler(e.set(0, r() * 3, 0)), sc.set(w * 1.1, hh * 0.4, w)); townR.setMatrixAt(i, m4); townR.setColorAt(i, col.set([0xb0553a, 0x8a3a2a, 0x6a4a3a][i % 3])); } }
  town.castShadow = townR.castShadow = true; world.add(town, townR);
  const house = new THREE.Group(); { const B = Builder(); B.add(BX(10, 12, 9), M(0xe9a08a, 0.85), 0, 6, 0); B.add(BX(10.4, 0.4, 9.4), M(0xf6efe2, 0.7), 0, 12, 0);
    for (let f = 0; f < 3; f++) for (let i = 0; i < 4; i++) { B.add(BX(1.1, 1.6, 0.1), M(f === 2 && i === 1 ? 0xffe2a8 : 0x2a3a4c, 0.3), -3.6 + i * 2.4, 4.2 + f * 3, 4.52); B.add(BX(0.35, 1.6, 0.08), M(0x2f7d6a, 0.6), -4.35 + i * 2.4, 4.2 + f * 3, 4.55); }
    B.add(BX(8, 2.4, 0.08), M(0xffe2a8, 0.3), 0, 1.4, 4.52); B.add(BX(8.5, 0.15, 1.2), M(0xe63946, 0.7), 0, 2.95, 5.0, -0.3); B.build(house); world.add(house); }
  // the comparison objects (metres; ground objects stand on world y = 0)
  const liberty = new THREE.Group(); { const B = Builder(); const st = M(0xcdbf9f, 0.85), cu = M(0x6fb5a0, 0.6, 0.2);
    B.add(BX(28, 8, 28), st, 0, 4, 0); B.add(BX(19, 30, 19), st, 0, 23, 0); B.add(BX(21, 3, 21), st, 0, 38.5, 0); B.add(BX(14, 6, 14), st, 0, 43, 0);
    B.add(CY(3.2, 6, 26, 16), cu, 0, 59, 0); B.add(SP(3.6, 16, 12), cu, 0, 74, 0); for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; B.add(new THREE.ConeGeometry(0.6, 3, 6), cu, Math.sin(a) * 3.6, 77 + Math.cos(a) * 1.5, Math.cos(a) * 1.2, 0, 0, -a * 0.8); }
    B.add(CY(1.1, 1.3, 13, 10), cu, 3.2, 81, 0, 0, 0, -0.18); B.add(CY(1.6, 0.9, 2.5, 12), M(0xd8a83a, 0.3, 0.6), 4.5, 88.5, 0); B.add(RB(4, 5, 2, 0.4), cu, -2.8, 63, 2.5, 0.2, 0.3, 0); B.build(liberty);
    const fl = new THREE.Mesh(SP(1.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffc040, toneMapped: false })); fl.position.set(4.6, 91, 0); fl.scale.y = 1.4; liberty.add(fl); world.add(liberty); }
  const burj = new THREE.Group(); { const B = Builder(); const gl = M(0xb8c8d8, 0.25, 0.7); let y = 0; const segs = [[42, 160], [34, 140], [27, 120], [21, 100], [15, 90], [10, 70], [6, 60]];
    for (const [r, h] of segs) { B.add(CY(r * 0.82, r, h, 6), gl, 0, y + h / 2, 0); y += h; } B.add(CY(0.6, 4, 828 - y, 8), M(0xdfe6ee, 0.3, 0.7), 0, y + (828 - y) / 2, 0); B.build(burj); world.add(burj); }
  const everest = new THREE.Group(); { const g = new THREE.ConeGeometry(9000, 8849, 9, 6); const p = g.attributes.position; const rr = rng(4); for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 4424) { const k = (1 - (y + 4424.5) / 8849) * 0.25; p.setX(i, p.getX(i) * (1 + (rr() - 0.5) * k)); p.setZ(i, p.getZ(i) * (1 + (rr() - 0.5) * k)); } } g.computeVertexNormals(); g.translate(0, 4424.5, 0);
    const rock = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x7a6a5c, roughness: 0.95, flatShading: true })); rock.castShadow = true; everest.add(rock);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(3700, 3640, 9, 2).translate(0, 8849 - 1820 + 20, 0), new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.7, flatShading: true })); everest.add(snow);
    const side = new THREE.Mesh(new THREE.ConeGeometry(6000, 6200, 8, 3).translate(0, 3100, 0), new THREE.MeshStandardMaterial({ color: 0x6a5c50, roughness: 0.95, flatShading: true })); side.position.set(-7000, 0, -3000); everest.add(side); world.add(everest); }
  // space objects (metres, positioned in units at render time)
  const earth = makeEarth(THREE, 1, 9); B2.add(earth);
  const moonM = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#b8b4ac'; g.fillRect(0, 0, w, h); const r = rng(4); for (let k = 0; k < 220; k++) { g.fillStyle = `rgba(80,76,70,${0.15 + r() * 0.3})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 14, 0, 7); g.fill(); } }), roughness: 0.95 })); B2.add(moonM);
  const jup = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (g, w, h) => { const r = rng(12); const cs = ['#e8d2b0', '#c89a6a', '#f2e6d0', '#b07a50', '#ddc0a0', '#a8704a']; let y = 0; while (y < h) { const bh = 6 + r() * 18; g.fillStyle = cs[Math.floor(r() * cs.length)]; g.fillRect(0, y, w, bh); y += bh; } g.fillStyle = '#c0583a'; g.beginPath(); g.ellipse(w * 0.62, h * 0.64, 26, 12, 0, 0, 7); g.fill(); }), roughness: 0.9 })); B2.add(jup);
  const glowT = softTex(THREE, 128);
  const sunS = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ color: 0xfff2c0, toneMapped: false })); B2.add(sunS);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffb040, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); B2.add(sunGlow);
  // orbit diagrams: a ring + the Sun dot + a planet dot (Earth's orbit, then Neptune's)
  function orbitDiagram(color, planetColor) { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 8, 160), new THREE.MeshBasicMaterial({ color, toneMapped: false })); ring.rotation.x = Math.PI / 2 - 0.35; g.add(ring);
    const s = new THREE.Mesh(SP(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff0b0, toneMapped: false })); g.add(s); const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffb040, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); sg.scale.setScalar(0.35); g.add(sg);
    const p = new THREE.Mesh(SP(0.035, 12, 10), new THREE.MeshBasicMaterial({ color: planetColor, toneMapped: false })); g.add(p); g.userData = { ring, p }; B2.add(g); return g; }
  const orbE = orbitDiagram(0x7dd3ff, 0x4a9aff), orbN = orbitDiagram(0x9a8aff, 0x6a7aff);
  // you (+ Mittens on your head), hanging from the bubble, at real scale (tiny after a few breaths)
  const PB = makePerson(THREE, heroOpts); PB.group.rotation.order = 'YXZ'; B2.add(PB.group); const mitB = makeCat(THREE, 0xf0a040); B2.add(mitB);
  const MOUTH_DIR = new THREE.Vector3(-0.82, -0.5, 0.28).normalize();

  // HERO CAM (big part): you hanging from the bubble by the lips, Mittens on your head
  const HC = new THREE.Scene(); HC.background = new THREE.Color(0xffd9a8); HC.add(new THREE.HemisphereLight(0xffffff, 0x6a5040, 1.2)); const hcD = new THREE.DirectionalLight(0xffe0b8, 2.4); hcD.position.set(2, 2.5, 3); HC.add(hcD);
  const hcBub = new THREE.Mesh(new THREE.SphereGeometry(5, 64, 48), gumM()); hcBub.position.set(5.3, 1.35, -0.4); HC.add(hcBub);
  const hcP = makePerson(THREE, heroOpts); hcP.group.rotation.order = 'YXZ'; HC.add(hcP.group); const hcM = makeCat(THREE, 0xf0a040); HC.add(hcM); const HCC = hcM.userData.cat;
  const hcCam = new THREE.PerspectiveCamera(34, 1, 0.05, 60); hcCam.position.set(1.1, 1.5, 3.0); hcCam.lookAt(0.05, 1.22, 0); { const f2 = new THREE.DirectionalLight(0xffe8f0, 1.4); f2.position.set(-1, 1, 3); HC.add(f2); }

  await document.fonts.ready;
  const milIdx = (tt) => { let k = -1; for (let i = 0; i < MIL.length; i++) if (tt >= MIL[i][1] - 0.05) k = i; return k; };
  const MOODS = ['shock', 'annoyed', 'unimpressed', 'scared', 'shock', 'unimpressed', 'annoyed', 'shock', 'scared', 'unimpressed', 'shock', 'annoyed', 'shock', 'sleepy', 'smug'];
  function sitChair(Q) { Q.legL.rotation.set(-1.45, 0, -0.08); Q.legR.rotation.set(-1.45, 0, 0.08); Q.armL.rotation.set(-0.7, 0, -0.15); Q.armR.rotation.set(-0.7, 0, 0.15); Q.torso.rotation.x = 0; }
  function dangle(Q, t, amt = 1) { const s = Math.sin(t * 5.5); Q.legL.rotation.set(0.35 * s * amt - 0.15, 0, -0.08); Q.legR.rotation.set(-0.35 * s * amt - 0.1, 0, 0.08); Q.armL.rotation.set(-0.4 + 0.5 * Math.sin(t * 7), 0, -0.9 - 0.3 * Math.sin(t * 6)); Q.armR.rotation.set(-0.4 + 0.5 * Math.sin(t * 7 + 1), 0, 0.9 + 0.3 * Math.sin(t * 6 + 1)); }
  function standPose(Q) { Q.legL.rotation.set(0, 0, 0.02); Q.legR.rotation.set(0, 0, -0.02); Q.armL.rotation.set(0.05, 0, -0.08); Q.armR.rotation.set(0.05, 0, 0.08); }
  function lkeys(k, t) { if (t <= k[0][0]) return k[0][1]; for (let i = 0; i < k.length - 1; i++) { const [t0, v0] = k[i], [t1, v1] = k[i + 1]; if (t <= t1) { const u = smooth(0, 1, (t - t0) / (t1 - t0)); return Math.exp(lerp(Math.log(v0), Math.log(v1), u)); } } return k[k.length - 1][1]; }
  const heroFace = (tt) => { if (tt < 3.8) return [{ brows: 'up', eyes: 1.05, mouth: 'o', look: [0.6, 0] }, [0, 0, 0]]; if (tt < 4.9) return [{ brows: 'up', eyes: 1.25, mouth: 'o', look: [0.6, -0.4] }, [0.05, 0, 0]];
    if (tt < 6.6) return [{ brows: 'up', eyes: 1.15, mouth: 'o', look: [0.4, 0.5] }, [-0.05, 0, 0]]; if (tt < 8.8) return [{ brows: 'worried', eyes: 1.3, mouth: 'o', look: [0.6, 0.2] }, [0, 0, 0]]; return [{ brows: 'up', eyes: 1.5, mouth: 'o', look: [0.3, -0.6] }, [0.1, 0, 0]]; };

  function update(tt0) {
    const teaser = tt0 < TEASER; const tt = teaser ? (TOT - 0.04) - Math.pow(tt0 / TEASER, 1.6) * 3.2 : tt0;   // REWIND: the payoff plays backwards
    const n = nAt(tt); const mi = milIdx(tt); const mood = mi >= 0 ? MOODS[mi] : 'neutral';
    const out = { scene: A, camera: cam, bloom: 0.2, bloomThreshold: 0.9, tt, tt0, teaser, tk: tt0 / TEASER, env: 0.45, exposure: 1.02, sat: 1.25, contrast: 1.05, voff: 0, n, mi };
    out.D = D0 * Math.pow(2, tt < CUT ? nVis(tt) : n); if (tt < 1.6) out.D = D0 * smooth(1.2, 1.6, tt);
    if (tt < CUT) {
      // ---------------- SCENE A: the office ----------------
      const r = Math.max(0.004, rAt(tt)); const { c, m } = bubbleA(r); bubA.scale.setScalar(r); bubA.position.copy(c); bubA.rotation.y = tt * 0.2; bubA.visible = true;
      const lifted = m.y > M0.y + 0.01;
      // you: seated, blowing; lifted off the chair once the bubble rests on the floor
      { const G = P.group; G.rotation.set(0, Math.PI / 2 - YA, 0); G.position.set(m.x - MOUTH_OFF.x, m.y - MOUTH_OFF.y, m.z);
        if (!lifted) { sitChair(P); const puff = Math.max(0, Math.sin((nAt(tt) % 1) * Math.PI * 2.4)) * (tt > 1.6 ? 1 : 0); P.torso.scale.x = 1 + 0.04 * puff; P.armR.rotation.set(-0.9, 0, 0.2); P.armL.rotation.set(-1.0 - 0.3 * pulse(tt, 4.9, 0.8), 0, -0.2); }
        else { dangle(P, tt, 1); }
        const [f, hd] = heroFace(tt); P.headPivot.rotation.set(...hd); setFace(P, f); life(P, tt, 0.4); P.headPivot.rotation.y *= 0.3; G.visible = true; }
      lipGum.position.copy(m); lipGum.rotation.set(0, Math.PI / 2 - YA, 0); lipGum.scale.setScalar(clamp(r / 0.03, 0.6, 1.2));
      chair.position.set(HERO_X + 0.05, 0, 0.05); chair.rotation.y = lifted ? smooth(7.4, 8.4, tt) * 0.8 : 0; chair.position.x += -0.6 * smooth(7.4, 8.4, tt);
      // desk pushed by the bubble (desk front edge stays outside the bubble at desk height)
      const reach = (y, z = 0) => { const dy = y - c.y, rr = r * r - dy * dy - (z - c.z) * (z - c.z); return rr > 0 ? c.x + Math.sqrt(rr) : -1e9; };
      const dx = clamp(Math.max(0, reach(0.6) + 0.02), 0, 3.0); const tip = clamp((reach(0.6) + 0.02 - 3.0) * 0.6, 0, 1.2);
      desk.position.set(dx, 0, 0); desk.rotation.set(0, 0, 0); if (tip > 0) { desk.position.y = 0; desk.rotation.z = -tip * 0.3; }
      const monFall = smooth(6.35, 6.9, tt); monitor.position.set(dx + 1.2 + 0.25 * monFall, 0.775 - 0.6 * smooth(6.6, 6.95, tt), 0); monitor.rotation.set(0, 0, -monFall * 1.4);
      stack.position.set(dx + 0.1, 0, 0.25); stack.rotation.y = 0.15;
      // coffee: knocked off the paper stack at breath 3
      { const k0 = 3.75; if (tt < k0) { mug.position.set(0.1, STACK_TOP, 0.25); mug.rotation.set(0, 0.4, 0); coffeeSpill.visible = false; }
        else { const u = tt - k0; const x = 0.1 + u * 0.9, y = Math.max(0.0, STACK_TOP - 4.9 * u * u + 0.6 * u); mug.position.set(x, y, 0.25 + u * 0.3); mug.rotation.set(u * 6, 0.4, -u * 9); if (y <= 0.001) { mug.position.y = 0.04; mug.rotation.set(Math.PI / 2, 0.4, 0); }
          coffeeSpill.visible = y <= 0.001 || u > 0.55; coffeeSpill.position.set(x + 0.1, 0.003, 0.4 + u * 0.15); coffeeSpill.scale.setScalar(clamp((u - 0.5) * 0.5, 0.01, 0.28)); } }
      // Mittens: on the desk, bumped by the bubble at breath 4 -> jumps onto your head
      { const jump = smooth(4.95, 5.4, tt); P.group.updateMatrixWorld(true); P.headPivot.getWorldPosition(tv); const head = tv.clone().add(v.set(-0.04, 0.27, 0));
        const p0 = new THREE.Vector3(dx + 0.62, 0.775, -0.2); const p = p0.clone().lerp(head, jump); p.y += Math.sin(Math.PI * jump) * 0.45; mit.position.copy(p);
        mit.rotation.set(0, lerp(-1.4, Math.PI / 2, jump), 0); mit.scale.setScalar(lerp(1.0, 0.72, jump));
        let mm = 'neutral'; if (tt > 2.1) mm = 'unimpressed'; if (tt > 3.8) mm = 'shock'; if (tt > 4.3) mm = 'annoyed'; if (tt > 4.9) mm = 'shock'; if (tt > 5.6) mm = 'unimpressed'; if (tt > 6.65) mm = 'annoyed'; if (tt > 8.0) mm = 'scared'; if (tt > 9.2) mm = 'shock';
        MC.headPivot.rotation.y = 0.3 * Math.sin(tt * 0.8) + (mm === 'unimpressed' ? 0.5 : 0); MC.headPivot.rotation.x = 0.15; setCatFace(mit, mm, 0.25); catLife(mit, tt, 1); out.catMood = mm; }
      // THE FILMER: behind you to the left, phone up the whole time
      { const G = fil.group; G.position.set(-0.75, 0, -1.9); G.rotation.set(0, 0.45 + 0.1 * smooth(7, 9, tt), 0); standPose(fil); fil.armL.rotation.set(-1.65, 0, -0.25); fil.armR.rotation.set(-1.65, 0, 0.25);
        const sh = tt > 8.8; setFace(fil, sh ? { brows: 'angry', eyes: 0.9, mouth: 'open', open: 1.1, look: [0.3, 0.5] } : { brows: 'up', eyes: 1.15, mouth: 'smile', look: [0.4, 0.2] }); fil.headPivot.rotation.set(sh ? -0.25 : 0, 0.15, 0); life(fil, tt, 0.6);
        G.updateMatrixWorld(true); fil.armL.userData.end.getWorldPosition(tv); const a = tv.clone(); fil.armR.userData.end.getWorldPosition(tv); phone.position.copy(a.add(tv).multiplyScalar(0.5)).add(v.set(0.02, 0.08, 0.02)); phone.rotation.set(0, G.rotation.y, 0); G.visible = phone.visible = true; }
      // THE SALESMAN: behind the desk with a T-shirt; squashed against the back wall by the bubble
      { const G = sal.group; const walk = 0; const x0 = 0.35, z = -1.95;
        G.position.set(x0, 0, z); G.rotation.set(0, -0.2, 0); standPose(sal); if (walk > 0 && walk < 1) { sal.legL.rotation.x = 0.45 * Math.sin(tt * 8); sal.legR.rotation.x = -0.45 * Math.sin(tt * 8); } sal.armL.rotation.set(-1.3, 0, -0.3); sal.armR.rotation.set(-1.3, 0, 0.3);
        const squash = tt > 5.0; setFace(sal, squash ? { brows: 'worried', eyes: 1.3, mouth: 'grit', look: [0, 0] } : { brows: 'up', eyes: 1.1, mouth: 'smile', look: [-0.3, 0] }); sal.headPivot.rotation.set(0, -0.2, 0); life(sal, tt, 0.6);
        G.updateMatrixWorld(true); sal.armL.userData.end.getWorldPosition(tv); const a = tv.clone(); sal.armR.userData.end.getWorldPosition(tv); tshirt.position.copy(a.add(tv).multiplyScalar(0.5)).add(v.set(0, -0.12, 0.08)); tshirt.rotation.set(0, G.rotation.y, 0);
        salSign.position.set(0.9, 2.1, RW.z0 + 0.1); salSign.visible = false; }
      // ceiling tiles
      { let k = 0; for (const T of TILES) { const age = tt - T.tb; let y = RW.hC, x = T.x, z = T.z, rx = 0, rz = 0, s = 1;
          if (T.hidden) s = 0.0001; else if (age > 0) { y = RW.hC - 4.9 * age * age + 0.8 * age; x += T.vx * age; z += T.vz * age; rx = T.rot * age * 4; rz = T.rot * age * 3; if (y < -0.5 || age > 1.6) s = 0.0001; }
          m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, 0, rz)), sc.setScalar(s)); tileI.setMatrixAt(k++, m4); } tileI.instanceMatrix.needsUpdate = true;
        for (const p of A.userData.panels) { const T = p.userData.tile; const age = T ? tt - T.tb : -1; p.visible = !(age > 0.05); }
        for (let i = 0; i < DU.length; i++) { const d = DU[i]; const age = tt - CEIL_T - d.d; let s = 0.0001, x = 0, y = 0, z = 0; if (age > 0 && age < 1.6) { s = d.s; x = c.x + d.x * r * 1.1; z = c.z + d.z * 1.4; y = RW.hC - d.v * age - 2 * age * age; }
          m4.compose(v.set(x, y, z), q.setFromEuler(e.set(age * 3, age * 2, 0)), sc.setScalar(s)); dust.setMatrixAt(i, m4); } dust.instanceMatrix.needsUpdate = true; }
      // camera: one continuous pull back as the bubble grows
      const CK = [[1.2, [0.3, 1.42, 2.7], [-0.25, 1.2, -0.3]], [3.8, [0.2, 1.44, 3.1], [-0.15, 1.18, -0.2]], [4.9, [-0.1, 1.5, 3.9], [-0.05, 1.22, 0]], [6.6, [-1.7, 1.6, 5.4], [0.05, 1.3, 0.2]], [8.8, [-2.7, 1.75, 7.6], [0.45, 1.6, 0.4]], [CUT, [-3.1, 1.85, 9.0], [0.85, 1.8, 0.6]]];
      let cp = CK[0][1], cl = CK[0][2]; for (let k = 0; k < CK.length - 1; k++) if (tt >= CK[k][0]) { const u = smooth(CK[k][0], CK[k + 1][0], tt); cp = CK[k][1].map((x, j) => lerp(x, CK[k + 1][1][j], u)); cl = CK[k][2].map((x, j) => lerp(x, CK[k + 1][2][j], u)); }
      cam.position.set(cp[0] + 0.02 * Math.sin(tt * 0.6), cp[1] + 0.015 * Math.sin(tt * 0.9), cp[2]); cam.lookAt(...cl); cam.fov = 48; cam.near = 0.02; cam.far = 300; cam.updateProjectionMatrix();
      out.dof = 0.05; out.focusY = 0.55; out.focusH = 0.3; out.interior = true; out.focus = bubA; out.r = r; out.bc = c.clone();
      out.flash = 0; out.shake = 0.06 * pulse(tt, 3.8, 0.3) + 0.1 * pulse(tt, 6.6, 0.4) + 0.16 * pulse(tt, CEIL_T, 0.5) + 0.12 * pulse(tt, 8.8, 0.4);
    } else {
      // ---------------- SCENE B: clean, in units of the bubble radius ----------------
      const rM = D0 * Math.pow(2, n) / 2; const U = 1 / rM; const sp = smooth(19.0, 21.3, tt);   // sp: 0 = sky, 1 = space
      const alt = 12 + rM * (0.5 + 1.0 * smooth(7.8, 9.6, n));          // bubble centre altitude (m)
      bub.rotation.y = tt * 0.12 + 3 * smooth(33, TOT, tt); bub.rotation.x = 0.2;
      const flat = n < 20.2; world.visible = flat; world.scale.setScalar(U); world.position.set(0, -alt * U, 0);
      house.visible = n < 10.5; liberty.visible = n > 10.2 && n < 13.4; burj.visible = n > 14.2 && n < 17.4; everest.visible = n > 17.0 && n < 20.2;
      const sideX = (halfW) => -(1 + halfW * U + 0.28);
      liberty.position.set(sideX(14) / U, 0, -0.4 / U); liberty.rotation.y = 0.5; burj.position.set(sideX(42) / U, 0, -0.4 / U); everest.position.set(sideX(7600) / U, 0, -1.2 / U); everest.rotation.y = 0.4;
      // Earth (sphere) under the bubble once we leave the flat world
      const RE = 6371e3 * U; earth.visible = !flat; earth.scale.setScalar(RE); earth.position.set(0, -(alt * U + RE), 0); earth.rotation.set(1.05, 0.6 + tt * 0.02, 0.3);
      const ms = (i, a = 0.6, b = 1.6) => tt > MIL[i][1] - a && tt < MIL[i][1] + b;
      moonM.visible = ms(9, 0.7, 1.0); moonM.scale.setScalar(1737.4e3 * U); moonM.position.set(-(1 + 1737.4e3 * U + 0.35), -0.2, -0.3);
      jup.visible = ms(11, 0.7, 1.3); jup.scale.setScalar(69911e3 * U); jup.position.set(-(1 + 69911e3 * U + 0.3), 0.1, -0.4); jup.rotation.y = tt * 0.3;
      const sVis = tt > MIL[12][1] - 0.8; const sR = 696340e3 * U; sunS.visible = sunGlow.visible = sVis; sunS.scale.setScalar(sR); sunS.position.set(-(1 + sR + 0.3) - smooth(MIL[12][1] + 0.8, MIL[13][1], tt) * 1.5, 0.15 + smooth(MIL[12][1] + 0.8, MIL[13][1], tt) * 1.2, -0.6 - smooth(MIL[12][1] + 0.8, MIL[13][1], tt) * 2); sunGlow.position.copy(sunS.position); sunGlow.scale.setScalar(Math.max(sR * 5, 0.25));
      const oE = 149.6e9 * U; orbE.visible = tt > MIL[13][1] - 0.9; orbE.scale.setScalar(oE); orbE.position.set(-(0.5 + oE), -0.55, 0.95); orbE.userData.ring.rotation.z = 0; { const a = tt * 1.5; orbE.userData.p.position.set(Math.cos(a), Math.sin(a) * Math.sin(0.35) * 0, Math.sin(a)).applyAxisAngle(v.set(1, 0, 0), -0.35); }
      orbE.children.forEach(ch => { if (ch.isSprite) ch.scale.setScalar(0.35); else if (ch !== orbE.userData.ring) ch.scale.setScalar(Math.max(1, 0.4 / Math.max(oE, 0.05))); });
      const oN = 4.495e12 * U; orbN.visible = tt > MIL[14][1] - 0.9; orbN.scale.setScalar(oN); orbN.position.set(-(0.5 + oN), -0.5, 0.95); { const a = tt * 0.5 + 2; orbN.userData.p.position.set(Math.cos(a), 0, Math.sin(a)).applyAxisAngle(v.set(1, 0, 0), -0.35); }
      orbN.children.forEach(ch => { if (ch.isSprite) ch.scale.setScalar(0.3); else if (ch !== orbN.userData.ring) ch.scale.setScalar(Math.max(1, 0.4 / Math.max(oN, 0.05))); });
      { const g0 = -alt * U; const A_ = [null, null, null, null, MOUTH_DIR.toArray(), [liberty.position.x * U, g0 + 95 * U, -0.4], [burj.position.x * U, g0 + 830 * U, -0.4], [everest.position.x * U, g0 + 8900 * U, -1.2], [-0.9, -1.05, 0.2],
          [moonM.position.x, moonM.position.y + moonM.scale.x, moonM.position.z], [0, -(alt * U), 0], [jup.position.x, jup.position.y + jup.scale.x, jup.position.z], [sunS.position.x, sunS.position.y + sR, sunS.position.z],
          [orbE.position.x, orbE.position.y + Math.max(oE * 0.35, 0.05), orbE.position.z], [orbN.position.x, orbN.position.y + Math.max(oN * 0.35, 0.05), orbN.position.z]]; out.anchor = mi >= 4 ? A_[mi] : null;
        if (mi === 10) out.anchor = [earth.position.x, earth.position.y + RE, earth.position.z]; }
      // you + Mittens hanging at the bubble's lower left (real size)
      { const mp = MOUTH_DIR.clone(); const G = PB.group; G.rotation.set(0, Math.PI / 2 + 0.3, 0.25); G.scale.setScalar(U); G.updateMatrixWorld(true);
        const off = MOUTH_OFF.clone().applyEuler(G.rotation).multiplyScalar(U); G.position.copy(mp).sub(off); dangle(PB, tt, 1); setFace(PB, { brows: 'up', eyes: 1.4, mouth: 'o', look: [0.4, -0.5] }); life(PB, tt, 0.4);
        G.visible = n < 12.5; G.updateMatrixWorld(true); PB.headPivot.getWorldPosition(tv); mitB.position.copy(tv).add(v.set(0, 0.25 * U, 0)); mitB.scale.setScalar(0.72 * U); mitB.rotation.set(0, Math.PI / 2, 0); mitB.visible = G.visible; setCatFace(mitB, mood, 0.25); catLife(mitB, tt, 1); }
      // sky -> space
      sky.material.uniforms.zen.value.copy(skyZen).lerp(black, sp); sky.material.uniforms.hor.value.copy(skyHor).lerp(new THREE.Color(0x0a1028), sp); sky.visible = sp < 0.999; starPts.material.opacity = sp; starPts.visible = sp > 0.01;
      B2.background = sp > 0.99 ? black : null; hemiB.intensity = lerp(0.8, 0.3, sp); fillB.intensity = lerp(0.6, 0.35, sp);
      sunB.color.set(sp > 0.5 ? 0xfff0dc : 0xffd0a0); sunB.position.set(3, 4, 5); if (sVis) sunB.position.copy(sunS.position).normalize().multiplyScalar(10).add(v.set(0, 3, 6));
      B2.fog = flat && sp < 0.9 ? (B2.userData.fog || (B2.userData.fog = new THREE.FogExp2(0xf0c89a, 0.01))) : null; if (B2.fog) { B2.fog.density = clamp(rM / 90000, 0.0005, 0.035) * (1 - sp); B2.fog.color.set(0xf0c89a).lerp(black, sp); }
      // camera: the same framing all the way, slowly orbiting; pulls back a touch for wide comparison objects
      const lift = smooth(CUT, CUT + 1.0, tt); const yaw = 0.15 + 0.25 * Math.sin((tt - CUT) * 0.11) + 0.5 * smooth(33, TOT, tt) + 2.4 * Math.pow(smooth(37.2, TOT + 1.2, tt), 1.1) - 0.5 * smooth(35.5, 37.0, tt);
      let dist = lerp(3.0, 5.4, lift); if (everest.visible) dist += 1.4 * smooth(MIL[7][1] - 0.6, MIL[7][1], tt) * (1 - smooth(MIL[7][1] + 1.0, MIL[7][1] + 1.8, tt));
      if (orbE.visible || orbN.visible) dist += 0.8 * smooth(MIL[13][1] - 0.8, MIL[13][1], tt) + 1.2 * smooth(36.4, TOT, tt);
      if (sVis) dist += 0.6 * smooth(MIL[12][1] - 0.8, MIL[12][1], tt) * (1 - smooth(MIL[12][1] + 1, MIL[13][1] - 1, tt));
      const lookX = -0.75 + 0.5 * smooth(37.0, TOT, tt), lookY = lerp(-0.25, -0.15, sp) + 0.3 * smooth(34.5, 36.0, tt);
      const hgt = lerp(0.05, 0.55, lift) + (flat ? 0 : 0.3 * sp);
      camB.position.set(lookX + Math.sin(yaw) * dist, lookY + hgt * dist * 0.35, Math.cos(yaw) * dist); camB.lookAt(lookX, lookY, 0); camB.near = 0.001; camB.far = 1e6; camB.fov = 46; camB.updateProjectionMatrix();
      starPts.position.copy(camB.position);
      out.scene = B2; out.camera = camB; out.dof = 0; out.focus = bub; out.clean = true; out.vignette = lerp(0.35, 0.45, sp); out.space = sp > 0.5; out.rM = rM;
      out.bloom = lerp(0.2, 0.32, sp); out.bloomThreshold = 0.85;
      out.flash = 0.35 * pulse(tt, CUT, 0.3) + 0.2 * pulse(tt, MIL[12][1], 0.4); out.shake = 0.12 * pulse(tt, MIL[4][1], 0.4) + 0.12 * pulse(tt, MIL[8][1], 0.4) + 0.12 * pulse(tt, MIL[10][1], 0.4) + 0.15 * pulse(tt, MIL[13][1], 0.5);
    }
    // HERO CAM (big part): you hanging by the lips, Mittens on your head
    { const show = tt > CUT ? smooth(CUT + 0.2, CUT + 0.6, tt) : 0; const sp = smooth(19.0, 21.3, tt);
      HC.background.set(0xffd9a8).lerp(new THREE.Color(0x0a1230), sp);
      const G = hcP.group; G.rotation.set(0, Math.PI / 2, 0.08 * Math.sin(tt * 2)); G.position.set(0.3 - 0.183 - 0.02, 1.35 - 1.558, 0); dangle(hcP, tt, 1.2);
      const k = Math.max(0, mi) % 3; setFace(hcP, [{ brows: 'up', eyes: 1.4, mouth: 'o', look: [0.5, 0.2] }, { brows: 'worried', eyes: 1.2, mouth: 'o', look: [0.6, -0.4] }, { brows: 'up', eyes: 1.5, mouth: 'o', look: [-0.2, -0.6] }][k]); hcP.headPivot.rotation.set(0, -0.15, 0); life(hcP, tt, 0.6); hcP.headPivot.rotation.y *= 0.3;
      G.updateMatrixWorld(true); hcP.headPivot.getWorldPosition(tv); hcM.position.copy(tv).add(v.set(-0.04, 0.24, 0)); hcM.scale.setScalar(0.75); hcM.rotation.set(0, 0.5 + 0.3 * Math.sin(tt * 0.7), 0);
      setCatFace(hcM, mood, 0.3); catLife(hcM, tt, 1); HCC.headPivot.rotation.y = 0.25 * Math.sin(tt * 0.9) + (mood === 'unimpressed' ? -0.4 : 0); hcBub.rotation.y = tt * 0.2;
      out.inset = { scene: HC, camera: hcCam, x: 0.2, y: 0.865, r: 0.14, show, ring: '#ff7fb5' }; out.mcMood = mood; }
    return out;
  }

  // ---------------- on-screen text ----------------
  const VO = [['n1', 2.3], ['n2', 5.72], ['n3', 8.45], ['n4', 10.38], ['n5', 13.75], ['n6', 16.4], ['n7', 18.9], ['n8', 21.25], ['n9', 23.7], ['n10', 25.4], ['n11', 27.3], ['n12', 28.55], ['n13', 30.65], ['n14', 32.5], ['n15', 35.6]];
  const TXT = { n1: 'You want one good bubble. The record is 51 cm.', n2: 'But yours never pops. Every breath doubles it.', n3: 'Breath six. Straight through the ceiling.', n4: 'Your breath is warm. Warm air rises. So up you go.',
    n5: 'Breath eleven. Taller than the Statue of Liberty.', n6: 'Breath fifteen. Taller than the Burj Khalifa.', n7: 'Breath eighteen. Bigger than Mount Everest.', n8: 'Breath twenty-one. It pokes out into space.', n9: "Don't ask where the air comes from.",
    n10: 'Breath twenty-eight. Bigger than Earth.', n11: 'Bigger than Jupiter.', n12: 'Breath thirty-five. Bigger than the Sun.', n13: "You could stop blowing. You don't.", n14: "Breath forty-three. Earth's whole orbit fits inside.", n15: "Well. That's one good bubble." };
  const DUR = { n1: 3.33, n2: 2.62, n3: 1.83, n4: 3.24, n5: 2.52, n6: 2.39, n7: 2.24, n8: 2.33, n9: 1.58, n10: 1.79, n11: 1.11, n12: 1.96, n13: 1.71, n14: 2.92, n15: 1.51 };
  const CAP = VO.map(([id, t], i) => [t, Math.min(t + DUR[id] + 0.25, i + 1 < VO.length ? VO[i + 1][1] - 0.05 : 1e9), TXT[id]]);
  const ASK = 37.25;
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function topText(ctx, W, t, a, b, txt, size = 54, y = 250) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.15, (b - t) / 0.15));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 700 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.86).forEach((l, i) => { ctx.strokeText(l, W / 2, y + i * size * 1.22); ctx.fillText(l, W / 2, y + i * size * 1.22); }); ctx.restore(); }
  function proj(pos, camO) { tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  function mileLabel(ctx, p, title, sub, a = 1) { if (a <= 0 || !p) return; let [x, y] = p; x = clamp(x, 120, 1000); y = clamp(y, 860, 1560);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 42px ${FONT}`; const tw = ctx.measureText(title).width; ctx.font = `700 28px ${FONT}`; const sw = sub ? ctx.measureText(sub).width : 0; const w = Math.min(1000, Math.max(tw, sw) + 36), h = sub ? 100 : 68;
    const lx = clamp(x - w / 2, 110, 1050 - w), ly = y - h - 26; ctx.fillStyle = 'rgba(10,12,16,0.82)'; ctx.beginPath(); ctx.roundRect(lx, ly, w, h, 16); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(clamp(x, lx + 20, lx + w - 20), ly + h); ctx.lineTo(x, y - 4); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `900 42px ${FONT}`; ctx.fillText(title, lx + 18, ly + 35, w - 30); if (sub) { ctx.font = `700 28px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(sub, lx + 18, ly + 77, w - 30); } ctx.restore(); }
  function fmtLen(m) { const f = (x, d = 1) => (x < 10 ? x.toFixed(d).replace(/\.0$/, '') : Math.round(x).toLocaleString('en-US'));
    if (m < 1) return Math.round(m * 100) + ' CM'; if (m < 1000) return f(m) + ' M'; if (m < 1e9) return f(m / 1000) + ' KM'; if (m < 1e12) return f(m / 1e9) + ' MILLION KM'; return f(m / 1e12, 2) + ' BILLION KM'; }
  const GMAX = 52;
  function gauge(ctx, tt, st) { const x = 44, y0 = 330, y1 = 1500, w = 22; const n = st.n ?? 0, mi = st.mi ?? -1; const f = clamp(n / GMAX); const yF = lerp(y1, y0, f);
    ctx.save(); ctx.fillStyle = 'rgba(10,12,16,0.55)'; ctx.beginPath(); ctx.roundRect(x - 6, y0 - 6, w + 12, y1 - y0 + 12, 16); ctx.fill();
    const gr = ctx.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, '#ffb3d4'); gr.addColorStop(0.5, '#ff6fae'); gr.addColorStop(1, '#c2186b'); ctx.fillStyle = gr; if (y1 - yF > 1) { ctx.beginPath(); ctx.roundRect(x, yF, w, Math.max(8, y1 - yF), 10); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; MIL.forEach(([b]) => { const py = lerp(y1, y0, b / GMAX); ctx.beginPath(); ctx.moveTo(x + w + 4, py); ctx.lineTo(x + w + 18, py); ctx.stroke(); });
    ctx.restore();
    const num = fmtLen(st.D ?? D0); const bump = mi >= 0 ? pulse(tt, MIL[mi][1], 0.4) : 0;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.font = `800 30px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#ff9ac8'; ctx.strokeText('BUBBLE WIDTH', 92, 392); ctx.fillText('BUBBLE WIDTH', 92, 392);
    ctx.save(); ctx.translate(92, 478); ctx.scale(1 + bump * 0.12, 1 + bump * 0.12); let fs = 88; ctx.font = `900 ${fs}px ${FONT}`; while (ctx.measureText(num).width > 880 && fs > 40) { fs -= 4; ctx.font = `900 ${fs}px ${FONT}`; }
    ctx.lineWidth = 10; ctx.strokeText(num, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(num, 0, 0); ctx.restore();
    const sub = 'BREATH ' + Math.floor((st.n ?? 0) + 1e-6) + '  ·  ×2 EVERY BREATH';
    ctx.font = `800 34px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(sub, 94, 530); ctx.fillStyle = '#ff9ac8'; ctx.fillText(sub, 94, 530);
    let txt = '', colr = '#ffe9b0'; const justPassed = mi >= 0 && tt < MIL[mi][1] + 0.7; if (justPassed) { txt = 'PASSED: ' + MIL[mi][2]; colr = '#7dff9a'; } else if (mi + 1 < MIL.length) txt = 'NEXT: BREATH ' + MIL[mi + 1][0] + ' = ' + MIL[mi + 1][2]; else txt = 'NEXT: IT NEVER POPS';
    if (txt) { ctx.font = `800 29px ${FONT}`; ctx.lineWidth = 6; const tw = ctx.measureText(txt).width; if (tw > 940) ctx.font = `800 ${Math.floor(29 * 940 / tw)}px ${FONT}`; ctx.strokeText(txt, 94, 576); ctx.fillStyle = colr; ctx.fillText(txt, 94, 576); }
    ctx.restore(); }
  function hud(ctx, tt0, st) { const W = 1080, Hh = 1920; const tt = st.tt;
    const title = (x) => drawTitleTimed(ctx, W, Hh, [{ text: 'WHAT IF EVERY BREATH', size: 80 }, { text: 'DOUBLED YOUR GUM BUBBLE?', size: 76, accent: true }], x, '#ff7fb5', { start: 0, wps: 1000, outAt: 1.95, y: 0.115 });
    gauge(ctx, tt, st);
    if (st.teaser) { title(tt0 + 0.01); drawTeaser(ctx, W, Hh, 'rewind', st.tk); return; }
    title(tt0);
    for (const [a, b, txt] of CAP) topText(ctx, W, tt, a, b, txt);
    const camO = st.camera;
    if (tt < CUT && camO) {
      P.group.updateMatrixWorld(true); P.headPivot.getWorldPosition(tv); const ph = proj([tv.x, tv.y + 0.32, tv.z], camO);
      mit.updateMatrixWorld(true); MC.headPivot.getWorldPosition(tv); const pm = proj([tv.x, tv.y + 0.2, tv.z], camO);
      if (ph) drawTag(ctx, ph[0] - 60, ph[1] - 10, 'YOU', tt - 1.3, { dur: 2.0, bg: '#7dd3ff' });
      if (pm) drawTag(ctx, pm[0], pm[1] - 10, 'MITTENS', tt - 2.0, { dur: 1.8 });
      if (tt > 5.6 && tt < 10.2) { fil.group.updateMatrixWorld(true); fil.headPivot.getWorldPosition(tv); const pf = proj([tv.x, tv.y + 0.33, tv.z], camO); if (pf) { pf[1] = Math.max(pf[1], 700); drawTag(ctx, pf[0], pf[1] + 4, 'THE FILMER', tt - 5.6, { dur: 1.6, bg: '#d9c8ff' }); drawBubble(ctx, pf[0], pf[1] - 10, 'THIS LIGHTING IS AWFUL!', tt - 8.95, { dur: 1.2, size: 40 }); } }
      if (tt > 2.2 && tt < 4.7) { sal.group.updateMatrixWorld(true); sal.headPivot.getWorldPosition(tv); const pq = proj([tv.x, tv.y + 0.33, tv.z], camO); if (pq) { pq[1] = Math.max(pq[1], 700); drawTag(ctx, pq[0], pq[1] + 4, 'THE SALESMAN', tt - 2.2, { dur: 1.0, bg: '#c9f0c0' }); drawBubble(ctx, pq[0], pq[1] - 10, 'BUBBLE T-SHIRTS! €20!', tt - 3.1, { dur: 1.6, size: 40 }); } }
      // milestone labels next to the bubble
      for (let i = 0; i <= 3; i++) { const t1 = MIL[i][1]; const e1 = i < 3 ? Math.min(1.8, MIL[i + 1][1] - t1 - 0.1) : CUT - t1; if (!(tt > t1 - 0.15 && tt < t1 + e1)) continue; const a = smooth(t1 - 0.15, t1, tt) * (1 - smooth(t1 + e1 - 0.2, t1 + e1, tt));
        const c = st.bc, r = st.r; const p = proj([c.x + r * 0.3, c.y - r * 0.6, c.z], camO); mileLabel(ctx, p ? [p[0], Math.max(p[1], 1150)] : null, MIL[i][0] + ' = ' + MIL[i][2], MIL[i][3], a); }
    } else if (camO) {
      for (let i = 4; i < MIL.length; i++) { const t1 = MIL[i][1]; const e1 = i < MIL.length - 1 ? Math.min(1.7, MIL[i + 1][1] - t1 - 0.1) : 1.9; if (!(tt > t1 - 0.15 && tt < t1 + e1)) continue; const a = smooth(t1 - 0.15, t1, tt) * (1 - smooth(t1 + e1 - 0.2, t1 + e1, tt));
        // point at the comparison object (left of the bubble); lift-off points at you
        const wp = st.anchor || [-1.25, -0.6, 0]; const p = proj(wp, camO); mileLabel(ctx, p, MIL[i][0] + ' = ' + MIL[i][2], MIL[i][3], a); }
    }
    if (tt >= ASK) topText(ctx, W, tt, ASK, 1e9, "What's the biggest bubble you've ever blown?", 52);
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
