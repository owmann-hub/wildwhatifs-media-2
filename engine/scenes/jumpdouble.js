import { clamp, lerp, smooth, easeOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeCatCam, softTex, setFace, life, drawTitleTimed, drawTag, drawBubble, RoundedBoxGeometry, stars, makeEarth } from './lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 27 episode: "What if every jump was twice as high as the last?"  (Nov 26 STANDARD: calm, rewarding, simple)
// Jump n reaches h(n) = 0.5 m x 2^n. Back yard in a Paris suburb at golden hour, trampoline, frisbee stuck on the house roof.
// Steps (one visible bounce each, the camera rides with you): 1-2-4 m, 8 m past the frisbee, 16 m past a balcony proposal,
// 64 m over the church tower (pigeons scatter), 512 m over the Eiffel Tower, 16 km over an airliner, 524 km over the ISS.
// TWIST (halfway): back on the trampoline, Mittens jumps on your back and comes along. Second climb in space: wider than
// Earth, past the Moon, farther than the Sun, past Neptune, past the nearest star - still climbing on the last frame.
// Cast: THE FILMER (neighbour over the fence, films, complains about the light) + BAD TIMING (balcony proposal).
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const TOT = 62.5;
const HJ = (n) => 0.5 * Math.pow(2, n);
// back-yard jumps: [ground time (take-off), apex time, jump number]
const JA = [[10.0, 10.3, 1], [10.6, 10.9, 2], [11.2, 11.5, 3], [12.0, 15.6, 4], [16.9, 19.4, 5], [20.8, 23.3, 7], [24.7, 26.9, 10], [28.3, 30.7, 15], [32.0, 34.2, 20]];
const S1 = 33.2, S1E = 36.4, TW0 = 36.4, G20 = 37.0, L21 = 37.55, S2 = 39.6;
// space: jump number vs time (piecewise linear), value at each step = the narrated jump
const NS = [[S2, 21.2], [41.3, 25], [44.9, 30], [48.4, 39], [51.8, 44], [55.3, 57], [58.7, 58], [62.5, 59.4]];
const nSpace = (t) => { if (t <= NS[0][0]) return NS[0][1]; for (let i = 1; i < NS.length; i++) if (t <= NS[i][0]) { const u = (t - NS[i - 1][0]) / (NS[i][0] - NS[i - 1][0]); return lerp(NS[i - 1][1], NS[i][1], i === NS.length - 1 ? u : 0.15 * u + 0.85 * u * u * (3 - 2 * u)); } return NS[NS.length - 1][1]; };
export { TOT };

export async function create({ THREE, W, H }) {
  const R = rng(2711);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler(), tv = new THREE.Vector3(), col = new THREE.Color();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, s = null) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s ? sc.set(...s) : sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group, shadow = true) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = shadow; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
  const CY = (a, b, h, n = 16) => new THREE.CylinderGeometry(a, b, h, n), SP = (r, a = 20, b = 14) => new THREE.SphereGeometry(r, a, b);
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  const glowT = softTex(THREE, 128);
  const MAT = 0.95; // trampoline mat height

  // =====================================================================================================
  // SCENE A: back yard in a town outside Paris, golden hour (metres). Trampoline at the origin. Camera mostly from +z.
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(46, W / H, 0.1, 400000);
  const SUND = new THREE.Vector3(0.75, 0.32, 0.58).normalize();
  const skyA = makeSkyDome(THREE, 0x4f86d8, 0xffc890, [SUND.x, SUND.y, SUND.z]); skyA.scale.setScalar(300000); A.add(skyA);
  const hemi = new THREE.HemisphereLight(0xffe8cc, 0x9a8a60, 1.0); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc488, 2.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  { const c = sun.shadow.camera; c.left = -16; c.right = 16; c.top = 16; c.bottom = -16; c.near = 1; c.far = 120; }
  const faceL = new THREE.PointLight(0xffdcb0, 7, 10, 1.4); A.add(faceL);
  const fillA = new THREE.DirectionalLight(0xffe6c8, 1.0); fillA.position.set(-4, 3, 6); A.add(fillA);
  A.fog = new THREE.Fog(0xf3c69a, 120, 2200);
  // ground: far fields + roads (big plane) and a lawn
  const fieldT = canvasTex(1024, 1024, (g, w, h) => { const r = rng(4); const cs = ['#7fa24f', '#9bb85a', '#c9b45e', '#6f9446', '#a8a04e', '#8aa858', '#b9c070'];
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { g.fillStyle = cs[Math.floor(r() * cs.length)]; g.fillRect(i * 64, j * 64, 64, 64); }
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(${200 + r() * 50},${180 + r() * 40},${150 + r() * 40},0.9)`; g.fillRect(Math.floor(r() * 16) * 64 + r() * 50, Math.floor(r() * 16) * 64 + r() * 50, 4 + r() * 9, 4 + r() * 9); }
    g.strokeStyle = '#d8cdb8'; g.lineWidth = 3; for (let i = 0; i <= 16; i += 4) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } });
  fieldT.wrapS = fieldT.wrapT = THREE.RepeatWrapping; fieldT.repeat.set(220, 220);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600000, 600000), new THREE.MeshStandardMaterial({ map: fieldT, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.name = 'ground'; A.add(ground);
  const townT = canvasTex(512, 512, (g, w, h) => { const r = rng(8); g.fillStyle = '#b8a888'; g.fillRect(0, 0, w, h); for (let k = 0; k < 2600; k++) { g.fillStyle = ['#c46a4a', '#d9cbb0', '#a85a40', '#e8dcc4', '#8a8a8a', '#7fa24f'][Math.floor(r() * 6)]; g.fillRect(r() * w, r() * h, 3 + r() * 6, 3 + r() * 6); } });
  const town = new THREE.Mesh(new THREE.CircleGeometry(2600, 48), new THREE.MeshStandardMaterial({ map: townT, roughness: 0.95 })); town.rotation.x = -Math.PI / 2; town.position.y = -0.01; A.add(town);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6fae4a'; g.fillRect(0, 0, w, h); const r = rng(3); for (let k = 0; k < 5000; k++) { g.fillStyle = `rgba(${60 + r() * 60},${130 + r() * 60},${40 + r() * 30},0.5)`; g.fillRect(r() * w, r() * h, 1, 2 + r() * 3); } }), roughness: 0.95 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 0, 0); lawn.receiveShadow = true; lawn.name = 'lawn'; A.add(lawn);
  // trampoline: frame ring, blue pad, black mat (dips on each bounce), 6 legs
  const tramp = new THREE.Group(); A.add(tramp);
  { const B = Builder(); const steel = M(0x9aa0aa, 0.4, 0.6); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; B.add(CY(0.035, 0.035, MAT, 8), steel, Math.cos(a) * 1.75, MAT / 2, Math.sin(a) * 1.75); } B.build(tramp);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.07, 10, 48), M(0x2f7de1, 0.6)); ring.rotation.x = Math.PI / 2; ring.position.y = MAT; ring.castShadow = true; tramp.add(ring); }
  const matG = new THREE.CircleGeometry(1.7, 40, 0, 6.2832); matG.rotateX(-Math.PI / 2); const matP0 = matG.attributes.position.array.slice();
  const mat = new THREE.Mesh(matG, new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.7, side: THREE.DoubleSide })); mat.position.y = MAT; mat.receiveShadow = true; tramp.add(mat);
  // the house (frisbee on its roof): x -7.5..-1.5, z -5.5..-0.5, eaves 5.5 m, ridge 7.5 m along x
  const house = new THREE.Group(); A.add(house);
  { const B = Builder(); const wall = M(0xf0e0c4, 0.85), roofM = M(0x5a6070, 0.7), trim = M(0xffffff, 0.6), shut = M(0x3f7f9a, 0.7), glass = M(0x9cc8e8, 0.2, 0.1), door = M(0x7a3a2a, 0.7);
    B.add(BX(6, 5.5, 5), wall, -4.5, 2.75, -3.0);
    for (const sz of [-1, 1]) B.add(BX(6.5, 0.12, 3.05), roofM, -4.5, 6.5, -3.0 + sz * 1.3, sz * 0.674, 0, 0); // two roof slopes (rise 2 over run 2.5)
    { const tri = new THREE.Shape(); tri.moveTo(-2.5, 0); tri.lineTo(2.5, 0); tri.lineTo(0, 2); tri.lineTo(-2.5, 0); const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.05, bevelEnabled: false }); tg.rotateY(Math.PI / 2); for (const x of [-7.49, -1.56]) B.add(tg, wall, x, 5.5, -3.0); }
    for (const [x, y] of [[-6.2, 1.5], [-2.8, 1.5], [-6.2, 4.0], [-4.5, 4.0], [-2.8, 4.0]]) { B.add(BX(0.9, 1.2, 0.08), glass, x, y, -0.47); B.add(BX(1.1, 0.1, 0.12), trim, x, y - 0.65, -0.45); for (const s of [-1, 1]) B.add(BX(0.4, 1.25, 0.06), shut, x + s * 0.68, y, -0.44); }
    B.add(BX(1.0, 2.1, 0.08), door, -4.5, 1.05, -0.47); B.add(BX(0.6, 0.7, 0.6), M(0x8a5a40, 0.8), -3.2, 7.4, -3.4);
    B.build(house); }
  const fris = new THREE.Mesh(CY(0.2, 0.21, 0.04, 24), M(0xff2a2a, 0.35)); fris.position.set(-2.4, 6.98, -2.2); fris.rotation.x = 0.674; fris.castShadow = true; A.add(fris);
  // fence (back + right) and the hedge
  { const B = Builder(); const wd = M(0xc8a070, 0.8); for (let x = -9; x <= 9; x += 0.5) B.add(BX(0.12, 1.4, 0.05), wd, x, 0.7, -7.0); B.add(BX(18.2, 0.1, 0.06), wd, 0, 1.1, -6.97); B.add(BX(18.2, 0.1, 0.06), wd, 0, 0.4, -6.97);
    for (let z = -7; z <= 6; z += 0.5) B.add(BX(0.05, 1.4, 0.12), wd, 6.0, 0.7, z); B.add(BX(0.06, 0.1, 13), wd, 5.97, 1.1, -0.5);
    B.add(RB(0.9, 1.1, 8, 0.4), M(0x3f7f3a, 0.9), -9.2, 0.55, 0); B.build(A); }
  // trees, bench, flower pots in the yard
  { const B = Builder(); for (const [x, z, s] of [[3.8, -5.2, 1.1], [-8.2, 4.0, 0.9], [8.5, -10, 1.3], [-12, -9, 1.2], [14, 3, 1.0]]) { B.add(CY(0.15 * s, 0.2 * s, 2.4 * s, 10), M(0x7a5a3c, 0.9), x, 1.2 * s, z); B.add(SP(1.4 * s, 16, 12), M(0x4a8a3a, 0.85), x, 3.0 * s, z); B.add(SP(1.0 * s, 14, 10), M(0x5a9a42, 0.85), x + 0.6 * s, 3.6 * s, z + 0.3); }
    B.add(BX(1.6, 0.08, 0.45), M(0xa86a3a, 0.7), 3.0, 0.45, 3.6); for (const sx of [-0.7, 0.7]) B.add(BX(0.08, 0.45, 0.45), M(0x333333, 0.5), 3.0 + sx, 0.22, 3.6);
    for (const [x, z, c] of [[-1.2, 2.8, 0xff6a8a], [-0.6, 3.1, 0xffd23f], [-1.8, 3.2, 0xb06aff]]) { B.add(CY(0.18, 0.13, 0.3, 12), M(0xc0603a, 0.8), x, 0.15, z); B.add(SP(0.2, 10, 8), M(c, 0.7), x, 0.4, z); }
    B.build(A); }
  // apartment block across the back fence: x 1..15, z -16..-12, 6 floors (3 m), balcony on floor 5 at y = 15, x = 4.5; front at z = -8
  { const B = Builder(); const wall = M(0xe8b890, 0.85), trim = M(0xfff4e0, 0.6), glass = M(0x8ab8d8, 0.2, 0.1), rail = M(0x2a2a30, 0.5), roofM = M(0x6a6a74, 0.7), shut = M(0x4f8a5a, 0.7);
    B.add(BX(14, 18.5, 4), wall, 8, 9.25, -10); B.add(BX(14.4, 1.2, 4.4), roofM, 8, 19.0, -10);
    for (let f = 0; f < 6; f++) for (let i = 0; i < 6; i++) { const x = 2.2 + i * 2.3, y = 1.6 + f * 3; if (f === 4 && i === 1) continue; B.add(BX(1.0, 1.5, 0.08), glass, x, y, -7.97); for (const s of [-1, 1]) B.add(BX(0.45, 1.55, 0.06), shut, x + s * 0.75, y, -7.95); B.add(BX(1.2, 0.1, 0.25), trim, x, y - 0.85, -7.9); }
    B.add(BX(2.6, 0.15, 1.4), trim, 4.5, 14.95, -7.3); B.add(BX(2.6, 1.0, 0.05), rail, 4.5, 15.5, -6.62); for (const s of [-1, 1]) B.add(BX(0.05, 1.0, 1.4), rail, 4.5 + s * 1.3, 15.5, -7.3);
    B.add(BX(1.0, 2.2, 0.08), glass, 4.5, 16.1, -7.97); B.add(BX(14.2, 0.2, 0.2), trim, 8, 9.0, -7.95); B.build(A); }
  // church tower (45 m) at (-15, 0, -33) with a little clock face
  const churchTop = new THREE.Vector3(-15, 41, -33);
  { const B = Builder(); const st = M(0xe0d2b4, 0.9), dk = M(0x5a5a68, 0.7); B.add(BX(7, 34, 7), st, -15, 17, -33); B.add(BX(7.6, 1.0, 7.6), st, -15, 34.5, -33); B.add(BX(5.8, 4.6, 5.8), st, -15, 37.3, -33);
    for (const [dx, dz, ry] of [[0, 3.51, 0], [3.51, 0, Math.PI / 2]]) B.add(BX(1.4, 2.6, 0.05), M(0x2a2a30, 0.6), -15 + dx, 37.4, -33 + dz, 0, ry, 0);
    B.add(new THREE.ConeGeometry(4.3, 6.5, 4), dk, -15, 42.9, -33, 0, Math.PI / 4, 0); B.add(BX(15, 13, 26), st, -15, 6.5, -49); B.add(new THREE.ConeGeometry(10.6, 6, 4), dk, -15, 16, -49, 0, Math.PI / 4, 0, [1, 1, 1.7]);
    B.build(A); }
  const clock = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g, w) => { g.fillStyle = '#fff6e0'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 22); g.moveTo(64, 64); g.lineTo(94, 70); g.stroke(); }), roughness: 0.6 })); clock.position.set(-15, 30, -29.47); A.add(clock);
  // the town: varied houses (merged), keeping clear of the yard, the block and the church
  { const B = Builder(); const walls = [0xf0e0c4, 0xe8c8a0, 0xd8a888, 0xf4ecd8, 0xc8d8e0, 0xe8d0b8, 0xf0c8a8, 0xd8c0a0].map(c => M(c, 0.85)); const roofs = [0xb5473a, 0x5a6070, 0xa85a40, 0x6a5a5a].map(c => M(c, 0.75));
    let n = 0; for (let k = 0; k < 1400 && n < 520; k++) { const ang = R() * 6.283, d = 18 + Math.pow(R(), 0.7) * 1100; const x = Math.cos(ang) * d, z = Math.sin(ang) * d;
      if (x > -12 && x < 18 && z > -20 && z < 10) continue; if (Math.abs(x + 15) < 14 && z < -24 && z > -66) continue; if (Math.abs(x - 280) < 120 && Math.abs(z + 760) < 120) continue;
      const w = 6 + R() * 6, dd = 6 + R() * 5, h = 5 + Math.floor(R() * 4) * 3; const ry = Math.round(ang / (Math.PI / 2)) * Math.PI / 2 + (R() - 0.5) * 0.1;
      B.add(BX(w, h, dd), walls[Math.floor(R() * walls.length)], x, h / 2, z, 0, ry, 0); B.add(new THREE.ConeGeometry(Math.max(w, dd) * 0.72, 2.2, 4), roofs[Math.floor(R() * roofs.length)], x, h + 1.1, z, 0, ry + Math.PI / 4, 0, [w / Math.max(w, dd), 1, dd / Math.max(w, dd)]); n++; }
    for (let k = 0; k < 160; k++) { const ang = R() * 6.283, d = 20 + R() * 900; const x = Math.cos(ang) * d, z = Math.sin(ang) * d; if (x > -12 && x < 18 && z > -20 && z < 10) continue; B.add(SP(2.2 + R() * 2, 10, 8), M(0x4f8a3f, 0.9), x, 3, z); }
    B.build(A, false); }
  // the Eiffel Tower (330 m) about 800 m away
  const EIF = new THREE.Vector3(280, 0, -760);
  { const B = Builder(); const im = M(0x7a5e48, 0.8); const lx = (y) => (y < 57 ? lerp(62, 26, y / 57) : y < 116 ? lerp(26, 14, (y - 57) / 59) : y < 276 ? lerp(14, 3.5, Math.pow((y - 116) / 160, 0.8)) : lerp(3.5, 1.2, (y - 276) / 40));
    for (let i = 0; i < 40; i++) { const y0 = i * 7.9, y1 = y0 + 7.9; const a = lx(y0), b = lx(y1); for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const p0 = new THREE.Vector3(sx * a, y0, sz * a), p1 = new THREE.Vector3(sx * b, y1, sz * b); const mid = p0.clone().add(p1).multiplyScalar(0.5); const len = p0.distanceTo(p1); const g = CY(lerp(4.5, 0.7, y0 / 316), lerp(4.5, 0.7, y1 / 316), len * 1.04, 6); const dir = p1.clone().sub(p0).normalize(); const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.applyQuaternion(qq); B.add(g, im, EIF.x + mid.x, mid.y, EIF.z + mid.z); } }
    B.add(BX(70, 5, 70), im, EIF.x, 57, EIF.z); B.add(BX(34, 4, 34), im, EIF.x, 116, EIF.z); B.add(BX(11, 4, 11), im, EIF.x, 276, EIF.z); B.add(CY(0.8, 1.2, 14, 6), im, EIF.x, 323, EIF.z);
    for (const [sx, sz] of [[1, 0], [0, 1]]) { const arch = new THREE.TorusGeometry(26, 2.2, 6, 20, Math.PI); for (const s of [-1, 1]) B.add(arch, im, EIF.x + sx * s * 44, 30, EIF.z + sz * s * 44, 0, sx ? Math.PI / 2 : 0, 0, [1, 1.0, 1]); }
    B.build(A, false); }
  // clouds: a thin layer ~1.6-2.4 km up
  const cloudM = new THREE.SpriteMaterial({ map: glowT, color: 0xfff2e4, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  const clouds = new THREE.Group(); A.add(clouds);
  for (let i = 0; i < 260; i++) { const s = new THREE.Sprite(cloudM); const a = R() * 6.283, d = 300 + Math.pow(R(), 0.6) * 28000; s.position.set(Math.cos(a) * d, 1600 + R() * 800, Math.sin(a) * d); const k = 500 + R() * 1400; s.scale.set(k * 1.8, k * 0.8, 1); clouds.add(s); }
  // the airliner at jump 15: flies along +x just below you
  const plane = new THREE.Group(); { const B = Builder(); const wh = M(0xf4f6fa, 0.4), bl = M(0x2a5ab0, 0.5), gl = M(0x1a2030, 0.3);
    B.add(new THREE.CapsuleGeometry(2.0, 34, 8, 16), wh, 0, 0, 0, 0, 0, Math.PI / 2); B.add(BX(7, 0.5, 38), wh, 1, -0.6, 0); B.add(BX(6, 7, 0.4), bl, -16.5, 3.5, 0); B.add(BX(5, 0.35, 12), wh, -16, 0.6, 0);
    for (let i = 0; i < 16; i++) B.add(SP(0.22, 8, 6), gl, 13 - i * 1.7, 0.6, 1.95); B.add(BX(36, 0.5, 0.1), bl, 0, -0.5, 2.0); for (const s of [-1, 1]) B.add(CY(1.1, 1.1, 4.5, 12), M(0x9aa0aa, 0.4, 0.4), 4, -1.7, s * 6.5, 0, 0, Math.PI / 2);
    B.build(plane, false); } A.add(plane);
  // pigeons on the church tower
  const pigs = []; { const gm = M(0x8a909c, 0.7), dk = M(0x5a606c, 0.7); for (let i = 0; i < 7; i++) { const p = new THREE.Group(); const b = new THREE.Mesh(SP(0.3, 12, 10), gm); b.scale.set(1, 0.85, 1.5); p.add(b); const hd = new THREE.Mesh(SP(0.17, 10, 8), dk); hd.position.set(0, 0.25, 0.32); p.add(hd);
      const ws = []; for (const sx of [-1, 1]) { const wp = new THREE.Group(); wp.position.set(sx * 0.22, 0.1, 0); const w = new THREE.Mesh(SP(0.25, 10, 6), gm); w.scale.set(1.6, 0.2, 1.0); w.position.x = sx * 0.3; wp.add(w); p.add(wp); ws.push(wp); }
      p.userData = { ws, a: (i / 7) * 6.283, d: R() }; A.add(p); pigs.push(p); } }

  // ---------------- characters ----------------
  const heroOpts = { shirt: 0xff7a3a, pants: 0x2f5aa8, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xf2f2f2, seed: 5, hairStyle: 'short' };
  const P = makePerson(THREE, heroOpts); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const mit = makeCat(THREE, 0xf0a040); mit.rotation.order = 'YXZ'; A.add(mit); const MC = mit.userData.cat;
  // THE FILMER: neighbour behind the right fence, phone up
  const fil = makePerson(THREE, { shirt: 0x8e5bb5, pants: 0x333333, hair: 0x1a1410, skin: 0xd8a47e, shoe: 0x222222, seed: 17, hairStyle: 'long' }); fil.group.rotation.order = 'YXZ'; A.add(fil.group);
  const phone = new THREE.Mesh(RB(0.08, 0.15, 0.015, 0.01), M(0x111111, 0.3)); A.add(phone);
  // BAD TIMING: the balcony proposal
  const man = makePerson(THREE, { shirt: 0x2a2a30, pants: 0x2a2a30, hair: 0x3a2416, skin: 0xe0a882, shoe: 0x111111, seed: 23, hairStyle: 'side' }); man.group.rotation.order = 'YXZ'; A.add(man.group);
  const wom = makePerson(THREE, { shirt: 0xe84a6a, pants: 0xe84a6a, hair: 0xc89a3a, skin: 0xf1c6a5, shoe: 0xe84a6a, seed: 31, hairStyle: 'long' }); wom.group.rotation.order = 'YXZ'; A.add(wom.group);
  const ringBox = new THREE.Group(); { const b = new THREE.Mesh(RB(0.1, 0.07, 0.09, 0.02), M(0xc0203a, 0.5)); ringBox.add(b); const rg = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16), M(0xffd23f, 0.2, 0.9)); rg.position.y = 0.06; ringBox.add(rg); } A.add(ringBox);
  const mcam = makeCatCam(THREE, 0xf0a040, 0xffe0c0);

  // =====================================================================================================
  // SCENE S: space (metres, floating origin: you are at the origin). Earth below-behind you, things slide past as you climb.
  // =====================================================================================================
  const S = new THREE.Scene(); const camS = new THREE.PerspectiveCamera(48, W / H, 0.05, 1e17); S.background = new THREE.Color(0x03050e);
  S.add(new THREE.HemisphereLight(0xb0c0ff, 0x302028, 0.55));
  const sunS = new THREE.DirectionalLight(0xfff0dc, 2.8); sunS.position.set(3, 1.2, 2); S.add(sunS, sunS.target);
  const fillS = new THREE.DirectionalLight(0xffd8b0, 1.0); fillS.position.set(-2, 1, 4); S.add(fillS);
  const faceS = new THREE.PointLight(0xffe0c0, 5, 8, 1.4); S.add(faceS);
  const starPts = stars(THREE, 6000, 1e15, 27); starPts.material.size = 2.0; S.add(starPts);
  // a faint Milky Way band
  const band = new THREE.Mesh(new THREE.SphereGeometry(5e15, 48, 24), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const r = rng(9); for (let k = 0; k < 9000; k++) { const x = r() * w, y = h / 2 + (r() + r() + r() - 1.5) * 60 + Math.sin(x / w * 6.283) * 40; g.fillStyle = `rgba(${170 + r() * 80},${160 + r() * 70},${200 + r() * 55},${0.05 + r() * 0.15})`; g.beginPath(); g.arc(x, y, 1 + r() * 5, 0, 7); g.fill(); } }), side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0.9 }));
  band.rotation.set(0.9, 0.3, 0.5); S.add(band);
  const RE = 6.371e6; const earth = makeEarth(THREE, 1, 9); earth.scale.setScalar(RE); S.add(earth); earth.name = 'earth';
  const EDIR = new THREE.Vector3(-0.35, -0.42, -0.72).normalize();
  const earthDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0x6fb0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false })); earthDot.scale.setScalar(0.03); S.add(earthDot);
  // ISS (about 100 m wide)
  const iss = new THREE.Group(); { const B = Builder(); const tr = M(0xc8ccd4, 0.5, 0.4), pn = M(0x2a3a6a, 0.3, 0.5), gd = M(0xd8a040, 0.4, 0.6);
    B.add(BX(100, 2.5, 2.5), tr, 0, 0, 0); for (const x of [-44, -32, 32, 44]) for (const s of [-1, 1]) B.add(BX(11, 0.2, 34), pn, x, 0, s * 19);
    B.add(CY(2.2, 2.2, 40, 12), tr, 0, -3, 0, Math.PI / 2, 0, 0); B.add(CY(2.0, 2.0, 12, 12), gd, 0, -3, 22, Math.PI / 2, 0, 0); for (const s of [-1, 1]) B.add(BX(8, 0.2, 4), M(0xf0f0f0, 0.5), s * 8, -3, -12);
    B.build(iss, false); } S.add(iss);
  // pass-by bodies
  const mkBall = (r, c, emiss = 0, tex = null) => new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, map: tex, emissive: emiss ? c : 0x000000, emissiveIntensity: emiss }));
  const moonT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#a8a8a8'; g.fillRect(0, 0, w, h); const r = rng(12); for (let k = 0; k < 500; k++) { const x = r() * w, y = r() * h, s = 1 + Math.pow(r(), 3) * 26; { const c = 70 + r() * 60; g.fillStyle = `rgba(${c},${c},${c + 6},0.55)`; } g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } });
  const moon = mkBall(1.737e6, 0xffffff, 0, moonT); S.add(moon);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(6.96e8, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffe060, toneMapped: false })); S.add(sunBall);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffb050, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sunGlow.scale.setScalar(6.96e8 * 5); sunBall.add(sunGlow); sunGlow.scale.setScalar(6.96e8 * 5);
  const nepT = canvasTex(512, 256, (g, w, h) => { for (let y = 0; y < h; y++) { const k = 0.5 + 0.5 * Math.sin(y * 0.09) * 0.3 + Math.sin(y * 0.031) * 0.15; g.fillStyle = `rgb(${50 * k + 30},${100 * k + 60},${220 * k + 30})`; g.fillRect(0, y, w, 1); } g.fillStyle = 'rgba(20,30,90,0.6)'; g.beginPath(); g.ellipse(180, 110, 40, 18, 0, 0, 7); g.fill(); });
  const nep = mkBall(2.46e7, 0xffffff, 0, nepT); S.add(nep);
  const prox = new THREE.Mesh(new THREE.SphereGeometry(1.07e8, 48, 24), new THREE.MeshBasicMaterial({ color: 0xff8a5a, toneMapped: false })); S.add(prox);
  const proxGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xff5a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); proxGlow.scale.setScalar(1.07e8 * 6); prox.add(proxGlow);
  const xStars = [[57.8, 0.04, 0xcfe0ff], [59.6, -0.42, 0xfff4d8], [61.4, 0.06, 0xffc8a0]].map(([tP, x, c]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(5e8, 32, 16), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.scale.setScalar(5e8 * 7); m.add(g); S.add(m); return { m, tP, x }; });
  const sunDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xfff0c0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false })); sunDot.scale.setScalar(0.05); S.add(sunDot);
  // speed dust streaming past (shows you are climbing)
  const ND = 90; const dustG = new THREE.BufferGeometry(); const dustP = new Float32Array(ND * 6); dustG.setAttribute('position', new THREE.BufferAttribute(dustP, 3));
  const dust = new THREE.LineSegments(dustG, new THREE.LineBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.09 })); dust.frustumCulled = false; S.add(dust);
  const DU = []; for (let i = 0; i < ND; i++) DU.push({ x: (R() - 0.5) * 26, z: -2 - R() * 26, o: R() * 40, v: 0.7 + R() * 0.6 });
  const Ps = makePerson(THREE, heroOpts); Ps.group.rotation.order = 'YXZ'; S.add(Ps.group);
  const mitS = makeCat(THREE, 0xf0a040); mitS.rotation.order = 'YXZ'; S.add(mitS); const MCS = mitS.userData.cat;

  await document.fonts.ready;

  // ---------------- motion ----------------
  // hero height above the mat in the back yard
  function heroY(t) {
    if (t < JA[0][0]) return 0;
    if (t >= TW0) { if (t < G20) { const u = (t - TW0) / (G20 - TW0); return 42 * (1 - u * u); } if (t < L21) return 0; return 26 * Math.pow(t - L21, 2) + 9 * (t - L21); }
    for (let k = 0; k < JA.length; k++) { const [g, a, n] = JA[k]; const gn = k + 1 < JA.length ? JA[k + 1][0] : G20; if (t >= gn) continue; const h = HJ(n), p = n <= 3 ? 2 : 3.2;
      if (t < a) { const u = (t - g) / (a - g); return h * (1 - Math.pow(1 - u, p)); } const u = (t - a) / (gn - a); return h * (1 - Math.pow(u, p)); }
    return 0;
  }
  // jump shown on the counter in the back yard (rolls up during each rise)
  function jumpA(t) {
    if (t < JA[0][0]) return { n: 0, val: 0 };
    if (t >= TW0) return { n: t < L21 ? 20 : 21, val: t < L21 ? HJ(20) : HJ(21) };
    let prev = 0; for (let k = 0; k < JA.length; k++) { const [g, a, n] = JA[k]; const gn = k + 1 < JA.length ? JA[k + 1][0] : G20;
      if (t < gn) { if (t >= a) return { n, val: HJ(n) }; const u = clamp((t - g) / Math.max(0.3, (a - g) * 0.55)); const nf = lerp(prev, n, u); const ni = Math.max(prev + 1, Math.ceil(nf - 1e-6)); return { n: Math.min(n, ni), val: HJ(Math.min(n, ni)) * (u >= 1 ? 1 : lerp(0.5, 1, easeOut(clamp((nf - (ni - 1)) * 1.0)))) }; }
      prev = n; }
    return { n: 20, val: HJ(20) };
  }
  const matDip = (t) => { let d = 0; for (const [g] of JA) d += pulse(t, g - 0.12, 0.35) * 0.32; d += pulse(t, G20, 0.45) * 0.42 + pulse(t, L21 - 0.1, 0.3) * 0.3; if (t > 9.0 && t < 10.0) d += 0.12 * Math.max(0, Math.sin((t - 9.0) * Math.PI * 3)); return d; };
  // camera keys in the yard: [t, yaw, dy, dist, lookDx, lookDy, lookDz]
  const CK = [[0, 0.28, 0.9, 6.6, 0, -0.1, 0], [2.6, 0.32, 1.0, 6.8, -0.6, 1.4, -0.6], [5.4, 0.3, 0.9, 6.8, -0.2, 0.3, 0], [9.0, 0.3, 0.9, 6.8, 0, 0.2, 0], [12.0, 0.45, 0.6, 6.0, -0.6, 0.3, -0.5], [15.6, 0.5, 0.2, 5.4, -0.9, -0.6, -0.9],
    [17.4, -0.35, 1.0, 5.6, 0.8, -0.6, -1.2], [19.4, -0.42, 1.0, 5.4, 1.4, -1.0, -2.0], [21.6, 0.42, 2.0, 6.2, -1.0, -1.6, -1.5], [23.3, 0.42, 2.6, 6.2, -1.2, -2.2, -1.8],
    [25.2, -0.3, 2.6, 6.4, 0.8, -2.4, -1.6], [26.9, -0.32, 2.8, 6.2, 0.9, -2.8, -1.8], [29.0, 0.1, 2.6, 6.0, 0, -2.6, -1.5], [30.7, 0.1, 3.0, 6.0, 0.2, -2.9, -1.4], [33.2, 0.1, 2.0, 6.0, 0, -1.0, 0]];
  const AK = [[9.9, -2.2, 6.6, -1.8, 8, 1.3, 5.6, 0.7], [15.9, -2.2, 6.6, -1.8, 8, 1.3, 5.6, 0.7], [17.2, 4.4, 15.6, -7, 16, -1.3, 5.2, 0.6], [19.9, 4.4, 15.6, -7, 16, -1.3, 5.2, 0.6],
    [21.6, -15, 38, -33, 64, 1.8, 6.0, 1.2], [23.8, -15, 38, -33, 64, 1.8, 6.0, 1.2], [25.3, 280, 250, -760, 512, -1.2, 5.6, 1.2], [27.4, 280, 250, -760, 512, -1.2, 5.6, 1.2], [29.0, -14, HJ(15) - 14, -30, HJ(15), 1.1, 5.6, 1.4], [40, -14, HJ(15) - 14, -30, HJ(15), 1.1, 5.6, 1.4]];
  const AD = AK.map(k => { const d = new THREE.Vector3(k[1], k[2] - k[4], k[3]); const L = d.length(); return { t: k[0], dir: d.normalize(), L, side: k[5], d: k[6], dy: k[7] }; });
  const C0 = new THREE.Vector3(), L0 = new THREE.Vector3();
  function aimCam(t, Hp) { let i = 0; while (i + 1 < AD.length && AD[i + 1].t <= t) i++; const a = AD[i], b = AD[Math.min(i + 1, AD.length - 1)]; const u = b === a ? 0 : smooth(0, 1, (t - a.t) / (b.t - a.t));
    const dir = a.dir.clone().lerp(b.dir, u).normalize(); const L = lerp(a.L, b.L, u), side = lerp(a.side, b.side, u), d = lerp(a.d, b.d, u), dy = lerp(a.dy, b.dy, u);
    const hd = new THREE.Vector3(dir.x, 0, dir.z).normalize(), sd = new THREE.Vector3(-hd.z, 0, hd.x);
    const C = Hp.clone().addScaledVector(hd, -d).addScaledVector(sd, side); C.y += dy; const Op = Hp.clone().addScaledVector(dir, L);
    const ah = Hp.clone().add(v.set(0, 0.9, 0)).sub(C).normalize(), bo = Op.sub(C).normalize(); const ld = ah.multiplyScalar(0.55).add(bo.multiplyScalar(0.45)).normalize(); ld.y += 0.06; ld.normalize();
    C0.copy(C); L0.copy(C).add(ld); }
  function camKey(t) { let i = 0; while (i + 1 < CK.length && CK[i + 1][0] <= t) i++; const a = CK[i], b = CK[Math.min(i + 1, CK.length - 1)]; const u = b === a ? 0 : smooth(0, 1, (t - a[0]) / (b[0] - a[0])); return a.map((x, j) => lerp(x, b[j], u)); }
  // Mittens' moods through the video
  const moodAt = (t) => t < 2.6 ? 'neutral' : t < 5.4 ? 'unimpressed' : t < 8.9 ? 'sleepy' : t < 10.0 ? 'unimpressed' : t < 12.0 ? 'shock' : t < 16.9 ? 'annoyed' : t < 20.8 ? 'shock' : t < 24.7 ? 'unimpressed' : t < 28.3 ? 'scared' : t < 32 ? 'annoyed' : t < G20 + 0.2 ? 'annoyed' : t < 40 ? 'smug' : t < 44.6 ? 'shock' : t < 48 ? 'scared' : t < 51.4 ? 'unimpressed' : t < 54.8 ? 'shock' : t < 58 ? 'smug' : 'sleepy';
  function airPose(Q, t, y, vy) { const up = vy > 0; Q.torso.rotation.set(0, 0, 0);
    if (y < 0.05) { Q.legL.rotation.set(0, 0, 0.03); Q.legR.rotation.set(0, 0, -0.03); Q.armL.rotation.set(0.05, 0, -0.12); Q.armR.rotation.set(0.05, 0, 0.12); return; }
    if (up) { Q.armL.rotation.set(-2.7, 0, -0.25); Q.armR.rotation.set(-2.7, 0, 0.25); Q.legL.rotation.set(0.05, 0, -0.05); Q.legR.rotation.set(-0.05, 0, 0.05); }
    else { const f = Math.sin(t * 14) * 0.4; Q.armL.rotation.set(-1.6 + f, 0, -1.0); Q.armR.rotation.set(-1.6 - f, 0, 1.0); Q.legL.rotation.set(-0.3 + f * 0.5, 0, -0.12); Q.legR.rotation.set(-0.1 - f * 0.5, 0, 0.12); } }

  function update(tt) {
    const mood = moodAt(tt);
    const out = { tt, mood, env: 0.45, exposure: 1.05, sat: 1.22, contrast: 1.05, voff: 1.8, bloom: 0.22, bloomThreshold: 0.9 };
    const inA = tt < S1 || (tt >= S1E && tt < S2);
    if (inA) {
      const y = heroY(tt), vy = heroY(tt + 0.02) - y; const yW = MAT + y - (y < 0.05 ? matDip(tt) : 0);
      // trampoline mat dip
      { const p = matG.attributes.position.array, d = matDip(tt); for (let i = 0; i < p.length; i += 3) { const r = Math.hypot(matP0[i], matP0[i + 2]); p[i + 1] = -d * Math.max(0, 1 - (r / 1.7) ** 2); } matG.attributes.position.needsUpdate = true; }
      // YOU
      const G = P.group; const ck = tt < S1 ? camKey(tt) : [0, 0.25, 0.9, 7.2, 0, 0.4, 0]; const faceYaw = ck[1] * 0.8;
      G.position.set(0, yW, 0); G.rotation.set(0, faceYaw, 0); airPose(P, tt, y, vy);
      if (tt < 9.0 && tt > 2.6 && tt < 5.4) { P.armR.rotation.set(-2.2, 0.4, 0.5); } // points at the frisbee
      if (tt >= 5.4 && tt < 9.0) { P.armL.rotation.set(-0.4, 0, -0.9); P.armR.rotation.set(-0.4, 0, 0.9); }
      if (tt >= 14.6 && tt < 16.0) { P.armL.rotation.set(-2.3, 0, -1.0); }  // reaches for the frisbee... too late
      if (tt >= TW0 && tt < G20 + 0.3) { P.armL.rotation.set(-2.6, 0, -0.6); P.armR.rotation.set(-2.6, 0, 0.6); }
      let f = { brows: 'neutral', eyes: 1.0, mouth: 'smile', look: [0, 0] };
      if (tt > 2.6 && tt < 5.4) f = { brows: 'worried', eyes: 1.0, mouth: 'flat', look: [-0.6, 0.6] }; else if (tt < 9.0 && tt >= 5.4) f = { brows: 'up', eyes: 1.0, mouth: 'smile', look: [0.3, 0] };
      else if (tt >= 9.0) { const st = Math.floor((tt - 9) / 3.8) % 4; f = [{ brows: 'up', eyes: 1.3, mouth: 'open', open: 1.2, look: [0, 0.4] }, { brows: 'up', eyes: 1.2, mouth: 'smile', look: [-0.5, -0.3] }, { brows: 'worried', eyes: 1.35, mouth: 'o', look: [0.5, -0.4] }, { brows: 'up', eyes: 1.4, mouth: 'open', open: 1.0, look: [0, -0.5] }][st]; }
      setFace(P, f); P.headPivot.rotation.set(y > 2 ? 0.25 : 0, 0, 0); life(P, tt, 0.6);
      // MITTENS: on the trampoline frame; at the twist he jumps onto your back
      { let p0 = new THREE.Vector3(1.4, MAT + 0.06, 1.15); let ry = -0.4 + 0.3 * Math.sin(tt * 0.5), rx = 0, rz = 0;
        if (tt > 9.6 && tt < TW0) ry = -0.2; // looks up at you
        if (tt >= G20 + 0.05) { const u = smooth(G20 + 0.05, G20 + 0.5, tt); G.updateMatrixWorld(true); P.torso.getWorldPosition(tv); const back = tv.clone().add(v.set(-Math.sin(faceYaw) * 0.22, 0.12, -Math.cos(faceYaw) * 0.22)); const hop = Math.sin(Math.PI * clamp(u)) * 0.9; p0 = p0.clone().lerp(back, u); p0.y += hop; ry = lerp(ry, faceYaw, u); rx = u * -0.3; }
        mit.position.copy(p0); mit.rotation.set(rx, ry, rz); mit.scale.setScalar(1.0); setCatFace(mit, mood, 0.3); catLife(mit, tt, 1);
        MC.headPivot.rotation.x = (tt > 9.6 && tt < TW0) ? -0.5 : 0.05; MC.headPivot.rotation.y = 0.3 * Math.sin(tt * 0.7); }
      // THE FILMER behind the right fence
      { const F = fil.group; F.position.set(lerp(-6.5, -0.6, smooth(4.2, 6.0, tt)), 0, -7.6); if (tt > 4.2 && tt < 6.0) { const w = Math.sin(tt * 9); fil.legL.rotation.x = 0.5 * w; fil.legR.rotation.x = -0.5 * w; } else { fil.legL.rotation.x = 0; fil.legR.rotation.x = 0; } F.rotation.set(0, (tt > 4.2 && tt < 6.0) ? 1.57 : -0.15, 0); fil.armR.rotation.set(-1.75, 0, 0.35); fil.armL.rotation.set(-1.6, 0, -0.35);
        setFace(fil, tt > 12 && tt < 14 ? { brows: 'angry', eyes: 0.8, mouth: 'grit', look: [0.3, 0.3] } : { brows: 'up', eyes: 1.1, mouth: 'o', look: [0.4, 0.4] }); fil.headPivot.rotation.set(-0.25 - 0.4 * clamp(y / 10), 0, 0); life(fil, tt, 0.4); F.updateMatrixWorld(true);
        fil.armR.userData.end.getWorldPosition(tv); phone.position.copy(tv).add(v.set(-0.06, 0.08, 0.06)); phone.rotation.set(0, -0.15, 0); }
      // BAD TIMING: the proposal on the balcony (y = 15)
      { const ty = 15.02; const sw = smooth(18.7, 19.2, tt); man.group.position.set(4.9, ty, -7.2); man.group.rotation.set(0, 0.25 - sw * 0.9, 0); man.legL.rotation.set(-1.5, 0, 0); man.legR.rotation.set(0.0, 0, 0); man.group.position.y = ty - 0.42; man.armR.rotation.set(-1.4, 0, 0.1);
        setFace(man, sw > 0.5 ? { brows: 'worried', eyes: 1.4, mouth: 'o', look: [0.5, 0.3] } : { brows: 'up', eyes: 1.0, mouth: 'smile', look: [0.2, 0.2] }); life(man, tt, 0.4);
        wom.group.position.set(3.9, ty, -7.0); wom.group.rotation.set(0, 0.9 + sw * 0.4, 0); wom.armL.rotation.set(-0.3, 0, -0.2); wom.armR.rotation.set(sw > 0.5 ? -2.2 : -0.6, 0, 0.3);
        setFace(wom, sw > 0.5 ? { brows: 'up', eyes: 1.45, mouth: 'open', open: 1.2, look: [0.6, 0.5] } : { brows: 'up', eyes: 1.1, mouth: 'smile', look: [0.5, -0.2] }); wom.headPivot.rotation.set(sw * -0.3, sw * 0.4, 0); life(wom, tt, 0.4);
        man.group.updateMatrixWorld(true); man.armR.userData.end.getWorldPosition(tv); const drop = Math.max(0, tt - 19.3); ringBox.position.copy(tv).add(v.set(0, 0.05 + drop * 0.6 - 4.9 * drop * drop, 0.1 + drop * 0.5)); if (ringBox.position.y < 0.05) ringBox.position.y = 0.05; ringBox.rotation.set(drop * 6, drop * 3, 0); }
      // pigeons: sit on the tower ledge, scatter at jump 7
      for (const p of pigs) { const u = p.userData; const a = Math.max(0, tt - 22.6 - u.d * 0.4); const ang = u.a; const r0 = 3.2;
        p.position.set(churchTop.x + Math.cos(ang) * (r0 + a * 6), 35.2 + a * 4 + Math.sin(a * 3 + ang) * 0.5, churchTop.z + Math.sin(ang) * (r0 + a * 6)); p.rotation.set(0, -ang + Math.PI / 2, 0); p.scale.setScalar(1.6);
        const fl = a > 0 ? Math.sin(tt * 22 + ang) * 0.9 : 0; u.ws[0].rotation.z = fl; u.ws[1].rotation.z = -fl; }
      // airliner passes just below you at jump 15
      { const u = (tt - 30.7); plane.position.set(-14 + u * 40, HJ(15) - 14, -30); plane.visible = tt > 27.5 && tt < S1; plane.rotation.set(0.25 * Math.sin((tt - 30.4) * 5) * Math.exp(-Math.max(0, tt - 30.4) * 0.8) * (tt > 30.4 ? 1 : 0), 0, 0.06 * Math.sin(tt * 3) * (tt > 30.4 ? 1 : 0)); }
      // sky darkens with height
      { const hgt = yW; const k = smooth(4000, 30000, hgt); skyA.material.uniforms.zen.value.set(0x4f86d8).lerp(col.set(0x0a1440), k); skyA.material.uniforms.hor.value.set(0xffc890).lerp(col.set(0x9ab8ff), k * 0.7);
        A.fog.near = 120 + hgt * 2.0; A.fog.far = 2200 + hgt * 9; A.fog.color.set(0xf3c69a).lerp(col.set(0xb8c8e8), smooth(2000, 16000, hgt)); }
      // camera
      if (tt < S1) { const [, yaw, dy, d, lx, ly, lz] = ck; const hy = yW + 1.0;
        const cA = new THREE.Vector3(Math.sin(yaw) * d, hy + dy, Math.cos(yaw) * d), lA = new THREE.Vector3(lx, hy + ly, lz);
        const w = smooth(9.3, 10.1, tt); if (w > 0) { aimCam(tt, new THREE.Vector3(0, yW, 0)); cA.lerp(C0, w); lA.lerp(L0, w); }
        cam.position.copy(cA); cam.lookAt(lA); cam.fov = lerp(46, 54, smooth(9.3, 10.5, tt)); cam.updateProjectionMatrix(); G.rotation.y = Math.atan2(cam.position.x, cam.position.z) * (tt < 9.3 ? 0.8 : 1); }
      else { // twist: medium shot of the yard; follows you as you shoot up again
        const fy = (tt > L21 || tt < G20) ? Math.max(0, MAT + heroY(tt) - 1.5) : 0; const yaw = 0.25; cam.position.set(Math.sin(yaw) * 7.4, 2.3 + fy, Math.cos(yaw) * 7.4); cam.lookAt(0, 2.3 + fy, 0); cam.fov = 46; cam.updateProjectionMatrix(); }
      sun.position.copy(SUND).multiplyScalar(60); sun.target.position.set(0, 0, 0);
      faceL.position.copy(cam.position).lerp(G.position, 0.55); faceL.position.y = G.position.y + 1.9;
      out.scene = A; out.camera = cam; out.dof = 0.06; out.focusY = 0.55; out.focusH = 0.3; out.focus = P.group;
      out.shake = 0.08 * pulse(tt, 19.2, 0.3) + 0.06 * pulse(tt, G20, 0.4) + 0.05 * pulse(tt, 23.2, 0.3); out.flash = 0.3 * pulse(tt, S1E, 0.25);
      const ja = jumpA(tt); out.jn = ja.n; out.jv = ja.val; out.alt = y;
      // Mittens cam: 3 times (the proposal, the Eiffel Tower, the twist)
      const showMC = Math.max(smooth(19.3, 19.6, tt) * (1 - smooth(21.3, 21.6, tt)), smooth(26.9, 27.2, tt) * (1 - smooth(28.6, 28.9, tt)));
      if (showMC > 0.01) { mcam.update(tt, tt < 22 ? 'shock' : 'unimpressed'); out.inset = { scene: mcam.scene, camera: mcam.camera, x: 0.79, y: 0.8, r: 0.15, show: showMC, ring: '#ffd23f' }; }
    } else {
      // ---------------- SCENE S: space ----------------
      let hM, n;
      if (tt < S1E) { n = 20; const u = tt - 34.2; hM = u < 0 ? HJ(20) * (1 - 0.75 * Math.pow(-u / 1.0, 2)) : HJ(20) - 25000 * u * u; hM = Math.max(9e4, hM); }
      else { n = nSpace(tt); hM = HJ(n); }
      // Earth below-behind you
      const ED = tt < S1E ? new THREE.Vector3(-0.02, -1, -0.03).normalize() : new THREE.Vector3(0, -1, 0).lerp(EDIR, smooth(S2, 41.0, tt)).normalize(); const dE = RE + hM; earth.position.copy(ED).multiplyScalar(dE); earth.rotation.y = 0.6 + tt * 0.01; earth.visible = dE < 3e9; earthDot.position.copy(ED).multiplyScalar(dE); earthDot.visible = dE > 5e7; earthDot.material.opacity = clamp((dE - 5e7) / 5e7) * (1 - smooth(1e11, 1e12, dE));
      // the Sun as a far dot until the pass
      sunDot.position.set(-0.7, -0.25, -0.65).multiplyScalar(1e12); sunDot.visible = tt > 49.5;
      // pass-by objects: slide from above to below the frame as you climb past
      const pass = (obj, tP, D, x, k = 0.3) => { const u = tt - tP; obj.visible = u > -2.6 && u < 3.0; obj.position.set(x * D, -u * k * D - 0.1 * D, -D); };
      iss.visible = tt < S1E; iss.position.set(-70, -30 - (tt - 34.2) * 6, -150); iss.rotation.set(0.35, 0.4 + tt * 0.03, 0.1);
      pass(moon, 44.9, 6.5e6, -0.42); pass(sunBall, 48.4, 3.2e9, 0.06); pass(nep, 51.8, 1.0e8, -0.43); pass(prox, 55.3, 8e8, 0.07); for (const X of xStars) pass(X.m, X.tP, 4e9, X.x);
      // dust streaks streaming down
      const sp = tt < S1E ? 6 : 14 + 6 * smooth(S2, TOT, tt);
      for (let i = 0; i < ND; i++) { const d = DU[i]; const yy = 14 - ((tt * sp * d.v + d.o) % 30); dustP.set([d.x, yy, d.z, d.x, yy + 0.6 + sp * 0.05, d.z], i * 6); } dustG.attributes.position.needsUpdate = true;
      // YOU (+ Mittens on your back after the twist)
      const G = Ps.group; G.position.set(0, -0.9, 0); G.rotation.set(0.05, 0.35, 0.03 * Math.sin(tt * 1.3));
      const rising = tt >= S1E || tt < 34.2; airPose(Ps, tt, 1, rising ? 1 : -1); if (rising) { const w = Math.sin(tt * 1.7) * 0.35; Ps.armL.rotation.z -= 0.2 + w; Ps.armR.rotation.z += 0.2 + w; Ps.legL.rotation.x = 0.15 * Math.sin(tt * 2.1); Ps.legR.rotation.x = -0.25 - 0.15 * Math.sin(tt * 2.1); } if (tt < S1E && tt > 34.2) { Ps.armL.rotation.set(-1.2, 0, -1.2); Ps.armR.rotation.set(-1.2, 0, 1.2); }
      const fk = Math.floor(tt / 3.4) % 3; setFace(Ps, [{ brows: 'up', eyes: 1.35, mouth: 'open', open: 1.0, look: [0.3, -0.4] }, { brows: 'worried', eyes: 1.3, mouth: 'o', look: [-0.4, -0.3] }, { brows: 'up', eyes: 1.2, mouth: 'smile', look: [0.5, -0.2] }][fk]);
      Ps.headPivot.rotation.set(0.15, 0, 0); life(Ps, tt, 0.6);
      mitS.visible = tt > S2 - 0.1; if (mitS.visible) { G.updateMatrixWorld(true); Ps.torso.getWorldPosition(tv); mitS.position.copy(tv).add(v.set(0.12, 0.28, -0.05)); mitS.rotation.set(-0.15, 0.55, 0.1 * Math.sin(tt * 2)); mitS.scale.setScalar(1.1);
        setCatFace(mitS, mood, 0.3); catLife(mitS, tt, 1.2); MCS.headPivot.rotation.y = -0.5 + 0.3 * Math.sin(tt * 0.8); MCS.headPivot.rotation.x = 0.1; }
      // camera: close on you, looking a little down past you at what you just passed; slow orbit
      const yaw = 0.18 + 0.06 * Math.sin(tt * 0.21); const cd = 5.1; camS.position.set(Math.sin(yaw) * cd, 1.0, Math.cos(yaw) * cd); camS.lookAt(0, 0.1, 0); camS.updateProjectionMatrix();
      faceS.position.set(camS.position.x * 0.6, 1.2, camS.position.z * 0.6);
      starPts.position.copy(camS.position);
      out.scene = S; out.camera = camS; out.dof = 0; out.focus = G; out.space = true; out.vignette = 0.42; out.bloom = 0.35; out.bloomThreshold = 0.88; out.exposure = 1.1;
      out.flash = 0.35 * pulse(tt, S1, 0.25) + 0.35 * pulse(tt, S2, 0.25); out.shake = 0.06 * pulse(tt, 48.4, 0.5) + 0.06 * pulse(tt, 55.3, 0.5);
      if (tt < S1E) { out.jn = 20; out.jv = HJ(20); } else { const n2 = n + 0.25; const ni = Math.floor(n2 + 1e-6); const fr = n2 - ni; out.jn = ni; out.jv = HJ(ni) * (fr < 0.25 ? lerp(0.5, 1, easeOut(fr / 0.25)) : 1); if (ni === 21 && fr < 0.25) out.jv = HJ(21); }
      // Mittens cam: the twist (he is on your back, smug)
      const showMC = smooth(S2 + 0.1, S2 + 0.4, tt) * (1 - smooth(42.6, 42.9, tt)); if (showMC > 0.01) { mcam.update(tt, 'smug'); out.inset = { scene: mcam.scene, camera: mcam.camera, x: 0.79, y: 0.8, r: 0.15, show: showMC, ring: '#ffd23f' }; }
    }
    return out;
  }

  // ---------------- on-screen text: title, one caption line, one big number ----------------
  const VO = [['n1', 2.6], ['n2', 5.5], ['n3', 8.9], ['n4', 12.1], ['n5', 15.3], ['n6', 18.9], ['n7', 22.7], ['n8', 26.4], ['n9', 30.0], ['n10', 33.6], ['n11', 37.0], ['n12', 40.8], ['n13', 44.4], ['n14', 47.9], ['n15', 51.3], ['n16', 54.8], ['n17', 58.0], ['n18', 60.4]];
  const TXT = { n1: 'Your frisbee is stuck on the roof. You just want it back.', n2: 'The world record high jump is 2.45 metres.', n3: 'But your jumps double. One metre. Two. Four.', n4: 'Twice as high only takes 41% more speed.',
    n5: 'Eight metres. You fly right past the frisbee.', n6: 'Sixteen metres. You just ruined a proposal.', n7: 'Sixty-four metres. Higher than the church tower.', n8: 'Jump ten. Higher than the Eiffel Tower.', n9: 'Jump fifteen. Above the planes.',
    n10: 'Jump twenty. Higher than the space station.', n11: "Then Mittens jumps on. He's coming too.", n12: 'Jump twenty-five. Higher than Earth is wide.', n13: 'Jump thirty. Past the Moon.', n14: 'Jump thirty-nine. Farther than the Sun.',
    n15: 'Jump forty-four. Past Neptune.', n16: 'Jump fifty-seven. Past the nearest star.', n17: 'And the frisbee? Still on the roof.', n18: 'Which jump would you stop at?' };
  let DUR = {}; try { DUR = await (await fetch('audio/jumpdouble_dur.json')).json(); } catch (_) {}
  const CAP = VO.map(([id, t], i) => [t, i + 1 < VO.length ? Math.min(t + (DUR[id] ?? 2.2) + 0.6, VO[i + 1][1] - 0.05) : 1e9, TXT[id]]);
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function topText(ctx, W, t, a, b, txt, size = 56, y = 255) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.15, (b - t) / 0.15));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 700 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.86).forEach((l, i) => { ctx.strokeText(l, W / 2, y + i * size * 1.22); ctx.fillText(l, W / 2, y + i * size * 1.22); }); ctx.restore(); }
  function proj(p3, camO) { tv.copy(p3); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  const comma = (x) => Math.round(x).toLocaleString('en-US');
  function fmtH(m) { if (m < 1000) return (m < 10 ? (Math.round(m * 10) / 10).toString() : comma(m)) + ' M'; const km = m / 1000; if (km < 100) return km.toFixed(1) + ' KM'; if (km < 1e6) return comma(km) + ' KM';
    const ly = m / 9.461e15; if (ly >= 0.1) return ly.toFixed(1) + ' LIGHT-YEARS'; if (km < 1e9) return (km / 1e6).toFixed(km < 1e7 ? 1 : 0) + ' MILLION KM'; if (km < 1e12) return (km / 1e9).toFixed(km < 1e10 ? 1 : 0) + ' BILLION KM'; return (km / 1e12).toFixed(1) + ' TRILLION KM'; }
  let lastN = -1, tN = -9;
  function counter(ctx, tt, st) { if (tt < 9.9) return; const n = st.jn ?? 0, val = st.jv ?? 0; if (n !== lastN) { lastN = n; tN = tt; } const bump = Math.max(0, 1 - (tt - tN) / 0.35);
    const a = smooth(9.9, 10.2, tt); ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    const lab = 'JUMP ' + n; ctx.font = `800 36px ${FONT}`; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#ffd23f'; ctx.strokeText(lab, 540, 405); ctx.fillText(lab, 540, 405);
    const num = fmtH(val); ctx.translate(540, 500); ctx.scale(1 + bump * 0.1, 1 + bump * 0.1); let fs = 104; ctx.font = `900 ${fs}px ${FONT}`; while (ctx.measureText(num).width > 940 && fs > 50) { fs -= 4; ctx.font = `900 ${fs}px ${FONT}`; }
    ctx.lineWidth = 12; ctx.strokeText(num, 0, 0); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(255,210,63,0.6)'; ctx.shadowBlur = 10 + bump * 30; ctx.fillText(num, 0, 0); ctx.restore(); }
  function hud(ctx, tt0, st) { const W = 1080, Hh = 1920; const tt = st.tt;
    drawTitleTimed(ctx, W, Hh, [{ text: 'WHAT IF EVERY JUMP WAS', size: 80 }, { text: 'TWICE AS HIGH AS THE LAST?', size: 76, accent: true }], tt, '#ffd23f', { start: 0, wps: 1000, outAt: 2.35, y: 0.12 });
    for (const [a, b, txt] of CAP) if (txt !== TXT.n18) topText(ctx, W, tt, a, b, txt);
    counter(ctx, tt, st);
    const camO = st.camera;
    if (st.scene === A && camO) {
      fil.group.updateMatrixWorld(true); fil.headPivot.getWorldPosition(tv); const pf = proj(tv.clone().add(v.set(0, 0.4, 0)), camO);
      if (pf) { drawTag(ctx, pf[0], Math.max(780, pf[1]), 'THE FILMER', tt - 6.0, { dur: 2.2, bg: '#d9c8ff' }); drawBubble(ctx, pf[0], Math.max(780, pf[1]) - 12, 'UGH. THE LIGHTING.', tt - 12.3, { dur: 1.6, size: 38 }); }
      if (tt > 18 && tt < 21.5) { man.group.updateMatrixWorld(true); man.headPivot.getWorldPosition(tv); const pw = proj(tv.clone().add(v.set(0, 0.45, 0)), camO); if (pw) drawBubble(ctx, pw[0], pw[1], '…IS THAT A YES?', tt - 19.9, { dur: 1.5, size: 38 }); }
    }
    if (tt >= 60.4) topText(ctx, W, tt, 60.4, 1e9, 'Which jump would you stop at? 👇', 58, 255);
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
