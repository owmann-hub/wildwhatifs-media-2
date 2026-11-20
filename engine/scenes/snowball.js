import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeEarth, makeBurst, softTex, setFace, life, drawTitleTimed, drawTag, RoundedBoxGeometry, stars, teaserTime, drawTeaser } from './lib.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 20 episode (rebuilt to the Nov 20 STANDARD section 0: really clear, 35-45 s, gauge + NEXT line, clean big part, loop ending)
// "What if your snowball rolled downhill and never stopped?"
// HUMAN PART (~15 s): snowy hilltop park, you roll the head for your snowman, it slips, Mittens jumps on, the skier films, the hot-chocolate
// man flips his sign to TICKETS. Reality: the record snowball is 3.2 m.
// BIG PART: clean shots (ball + gauge + one milestone object next to it), a new milestone every 1.8 s:
// 6 m HOUSE, 96 m BIG BEN, 330 m EIFFEL TOWER, 828 m BURJ KHALIFA, 8,849 m EVEREST, 11 km AIRLINERS, 100 km SPACE, 408 km ISS ORBIT, 3,475 km MOON.
// Ending: "Well. Earth got the head instead." (the Moon-sized ball sits on Earth like a snowman's head); last frame = first frame (loop).
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const TEASER = 1.2;
const HS = [1.0, 6.5, 9.4, 12.5, 15.2]; const T1 = HS[0]; const GD = [1.0, 0.15, 0.15, 1.4];       // human steps start times (scene time); BP = big part start
const DSH = [0.08, 0.3, 0.6, 1.2, 3.2];
const BP = HS[4];
const MIL = [[6, 'HOUSE'], [96, 'BIG BEN'], [330, 'EIFFEL TOWER'], [828, 'BURJ KHALIFA'], [8849, 'MOUNT EVEREST'], [11000, 'AIRLINERS'], [1e5, 'SPACE BEGINS'], [408000, 'ISS ORBIT'], [3474800, 'THE MOON']];
const MT = MIL.map((_, k) => +(BP + 0.8 + 1.8 * k).toFixed(2));
const PUNCH = 31.8, ASK = 33.8, SEND = 36.6; const TOT = +(SEND + TEASER).toFixed(2);
const CUT = MT[6] - 0.6;
const TSLIP = HS[3] + 0.35;
const stepOf = (t) => { if (t < T1) return 0; for (let k = 4; k >= 1; k--) if (t >= HS[k - 1]) return k; return 0; };
function dAt(t) {
  if (t < BP) { const k = stepOf(t); if (k === 0) return DSH[0]; const a = Math.log(DSH[k - 1]), b = Math.log(DSH[k]); const u = (t - HS[k - 1] - GD[k - 1]) / 1.1; return Math.exp(u <= 0 ? a : a + (b - a) * easeInOut(u)); }
  const ts = [BP, ...MT], ds = [DSH[4], ...MIL.map(m => m[0])]; if (t >= ts[ts.length - 1]) return ds[ds.length - 1];
  for (let i = 0; i < ts.length - 1; i++) if (t < ts[i + 1]) { const u = (t - ts[i]) / (ts[i + 1] - ts[i]); return Math.exp(Math.log(ds[i]) + (Math.log(ds[i + 1]) - Math.log(ds[i])) * u); } }
const massOf = (d) => 400 * Math.PI / 6 * d * d * d;
const RE_M = 6.371e6;
export { TOT, PUNCH, ASK, CUT, dAt, TSLIP, TEASER, MT };

// terrain height (metres). Ball path is the x axis (downhill = +x). Valley walls and mountains on both sides.
function ridge(x, z) { return 0.55 * (1 - Math.abs(Math.sin(x / 2300 + Math.sin(z / 1700) * 1.3))) + 0.3 * (1 - Math.abs(Math.sin(x / 830 + z / 1290 + 1.7))) + 0.15 * (1 - Math.abs(Math.sin(x / 370 - z / 510))); }
function hT(x, z) {
  let y; if (x < -40) y = 0.25 * (-40 - x) * smooth(-40, -140, x) + 0; else if (x < 0) y = 0; else if (x < 110) y = -0.22 * x + 0.22 * 10 * (1 - smooth(0, 12, x)) * 0; else if (x < 620) y = -24.2 - 0.06 * (x - 110); else if (x < 40000) y = -54.8 - 0.1 * (x - 620); else y = -3992.8;
  if (x > -2 && x < 14) { const u = smooth(-2, 14, x); y = lerp(0, -0.22 * x, u); }
  if (x > 100 && x < 120) { const u = smooth(100, 120, x); y = lerp(-0.22 * x, -24.2 - 0.06 * (x - 110), u); }
  const az = Math.abs(z);
  y += 60 * smooth(60, 400, az) + 300 * smooth(250, 1400, az) * ridge(x, z) + 2700 * smooth(1500, 9000, az) * ridge(x * 0.35, z * 0.35) * (1 - 0.6 * smooth(80000, 300000, az));
  y += 0.5 * Math.sin(x * 0.37 + z * 0.21) * smooth(5, 30, az);
  y -= (x * x + z * z) / (2 * RE_M);
  return y; }

export async function create({ THREE, W, H }) {
  const R = rng(2011);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function signTex(text, bg, fg, w = 512, h = 112) { return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = h * 0.56; g.font = `900 ${fs}px ${FONT}`; const mw = g.measureText(text).width; if (mw > w * 0.84) { fs *= w * 0.84 / mw; g.font = `900 ${fs}px ${FONT}`; } g.fillText(text, w / 2, h * 0.54); }); }
  const signMat = (text, bg, fg, w, h) => new THREE.MeshBasicMaterial({ toneMapped: false, map: signTex(text, bg, fg, w, h) });

  // =====================================================================================================
  // SCENE A (metres)
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 4e7);
  const fogC = new THREE.Color(0xf4cfb0); A.fog = new THREE.FogExp2(fogC.getHex(), 0.0006);
  const hemi = new THREE.HemisphereLight(0xc4d8ff, 0x8a7a70, 0.5); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc07a, 3.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  const SUN = new THREE.Vector3(0.42, 0.33, 0.85).normalize();   // low warm sun from the camera side: lights the faces
  function setShadow(cx, cy, cz, size) { sun.target.position.set(cx, cy, cz); sun.position.set(cx + SUN.x * size * 6, cy + SUN.y * size * 6, cz + SUN.z * size * 6); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = size * 0.5; c.far = size * 14; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 60 ? 1.5 : 0.02; }
  const sky = makeSkyDome(THREE, 0x5f97de, 0xffd6a8, [SUN.x, SUN.y, SUN.z]); A.add(sky); sky.scale.setScalar(3e7);
  const zen0 = new THREE.Color(0x5f97de), hor0 = new THREE.Color(0xffd6a8), zenA = new THREE.Color(0x3b78cc), horA = new THREE.Color(0xc6daf0), zenS = new THREE.Color(0x040820), horS = new THREE.Color(0x1a3c80), fogA = new THREE.Color(0xb7cde8);
  const starsA = stars(THREE, 2500, 2e7, 5); starsA.material.transparent = true; starsA.material.opacity = 0; starsA.renderOrder = -9; A.add(starsA);

  // ---------------- terrain: non-uniform grid (fine near the ball path and the town, coarse far away) ----------------
  const xs = []; { let x = -6000; while (x < -40) { xs.push(x); x += Math.max(2, 0.06 * Math.abs(x)); } x = -40; while (x < 30) { xs.push(x); x += 1.0; } while (x < 1.6e6) { xs.push(x); x += Math.max(1.0, 0.045 * x); } xs.push(1.6e6); }
  const zsP = []; { let z = 0; while (z < 1.4e6) { zsP.push(z); z += Math.max(1.0, 0.05 * z); } zsP.push(1.4e6); }
  const zs = [...zsP.slice(1).map(z => -z).reverse(), ...zsP];
  const NX = xs.length, NZ = zs.length;
  const tpos = new Float32Array(NX * NZ * 3), tcol = new Float32Array(NX * NZ * 3);
  const snowC = new THREE.Color(0xf3f5fb), rockC = new THREE.Color(0x6a6460), forC = new THREE.Color(0x5d7062), blueC = new THREE.Color(0xdfe8f8);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const x = xs[i], z = zs[j], y = hT(x, z); const k = (i * NZ + j) * 3; tpos[k] = x; tpos[k + 1] = y; tpos[k + 2] = z;
    const s = Math.max(1, Math.abs(x) * 0.02, Math.abs(z) * 0.02); const sl = Math.hypot(hT(x + s, z) - hT(x - s, z), hT(x, z + s) - hT(x, z - s)) / (2 * s);
    const nz = 0.5 + 0.5 * Math.sin(x * 0.0013 + Math.sin(z * 0.0021) * 2) * Math.sin(z * 0.0017 + x * 0.0004);
    col.copy(snowC).lerp(blueC, 0.25 + 0.25 * Math.sin(x * 0.05 + z * 0.07)); if (Math.abs(z) > 300) col.lerp(forC, 0.55 * smooth(0.55, 0.75, nz) * (1 - smooth(0.6, 1.0, sl)));
    col.lerp(rockC, smooth(0.75, 1.3, sl) * 0.8); tcol[k] = col.r; tcol[k + 1] = col.g; tcol[k + 2] = col.b; }
  const tidx = []; for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NZ - 1; j++) { const a = i * NZ + j, b = a + 1, c = a + NZ, d = c + 1; tidx.push(a, b, c, b, d, c); }
  const tgeo = new THREE.BufferGeometry(); tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tgeo.setAttribute('color', new THREE.BufferAttribute(tcol, 3)); tgeo.setIndex(tidx); tgeo.computeVertexNormals();
  const terrain = new THREE.Mesh(tgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 })); terrain.receiveShadow = true; terrain.name = 'terrain'; A.add(terrain);

  // ---------------- the ball path (precomputed: x, roll angle) ----------------
  const DT = 1 / 120, NT = Math.ceil((SEND + 1) / DT); const PX = new Float64Array(NT), PR = new Float64Array(NT);
  { let x = -6.6, ang = 0; for (let i = 0; i < NT; i++) { const t = i * DT; PX[i] = x; PR[i] = ang; const d = dAt(t);
      let vv = 0; if (t > 0.3 && t < TSLIP) vv = 0.56 * (1 + 0.45 * Math.sin(t * 5.2)); else if (t >= TSLIP) vv = Math.max(0.6, (1.6 + (t < BP ? 1.25 : 0.8) * d) * smooth(TSLIP, TSLIP + 1.6, t));
      x += vv * DT; ang += vv / (d / 2) * DT; } }
  const pathAt = (t) => { const f = clamp(t / DT, 0, NT - 1.001), i = Math.floor(f), u = f - i; return [PX[i] + (PX[i + 1] - PX[i]) * u, PR[i] + (PR[i + 1] - PR[i]) * u]; };
  const xToT = (xq) => { for (let i = 0; i < NT; i++) if (PX[i] >= xq) return i * DT; return 1e9; };   // when the ball centre reaches x
  // bare-ground track left behind the ball (the snow is rolled up)
  const TRK = []; { let lastX = -1e9; for (let i = Math.floor(0.3 / DT); i < NT; i += 2) { const t = i * DT; if (t > CUT) break; const x = PX[i]; if (x - lastX < Math.max(0.15, dAt(t) * 0.12)) continue; lastX = x; TRK.push([x, dAt(t) * 0.92, t]); } }
  const NW = 7; const trPos = new Float32Array(TRK.length * NW * 3), trCol = new Float32Array(TRK.length * NW * 3); const trIdx = [];
  TRK.forEach(([x, w], i) => { for (let j = 0; j < NW; j++) { const z = (j / (NW - 1) - 0.5) * w; const k = (i * NW + j) * 3; trPos[k] = x; trPos[k + 1] = hT(x, z) + Math.max(0.025, w * 0.004); trPos[k + 2] = z;
      const edge = Math.abs(j / (NW - 1) - 0.5) * 2; col.setRGB(0.45, 0.5, 0.33).lerp(new THREE.Color(0.86, 0.88, 0.92), edge * edge * 0.8); col.multiplyScalar(0.9 + 0.2 * Math.sin(i * 1.7 + j)); trCol[k] = col.r; trCol[k + 1] = col.g; trCol[k + 2] = col.b; }
    if (i > 0) for (let j = 0; j < NW - 1; j++) { const a = (i - 1) * NW + j, b = a + 1, c = i * NW + j, d = c + 1; trIdx.push(a, b, c, b, d, c); } });
  const trGeo = new THREE.BufferGeometry(); trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3)); trGeo.setAttribute('color', new THREE.BufferAttribute(trCol, 3)); trGeo.setIndex(trIdx); trGeo.computeVertexNormals();
  const track = new THREE.Mesh(trGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); track.receiveShadow = true; A.add(track);
  const trackCount = (t) => { let n = 0; while (n < TRK.length && TRK[n][2] <= t - 0.05) n++; return Math.max(0, n - 1) * (NW - 1) * 6; };

  // ---------------- the snowball ----------------
  let ballG = new THREE.IcosahedronGeometry(1, 5); ballG.deleteAttribute('normal'); ballG.deleteAttribute('uv'); ballG = mergeVertices(ballG, 1e-4); { const p = ballG.attributes.position; const cc = new Float32Array(p.count * 3); const rr = rng(77);
    const bumps = Array.from({ length: 40 }, () => [new THREE.Vector3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize(), 0.2 + rr() * 0.35, rr()]);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); let dsp = 0; for (const [b, w, s] of bumps) { const dd = v.distanceTo(b); if (dd < w) dsp += (s - 0.4) * 0.05 * (1 - dd / w) ** 2; } v.multiplyScalar(1 + dsp + (rr() - 0.5) * 0.008); p.setXYZ(i, v.x, v.y, v.z);
      const sp = rr(); col.setRGB(0.97, 0.98, 1.0); if (sp < 0.008) col.setRGB(0.5, 0.44, 0.38); else if (sp < 0.014) col.setRGB(0.45, 0.55, 0.45); else col.multiplyScalar(0.93 + 0.07 * rr()); cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b; }
    ballG.setAttribute('color', new THREE.BufferAttribute(cc, 3)); ballG.computeVertexNormals(); }
  const ballMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
  const ball = new THREE.Mesh(ballG, ballMat); ball.castShadow = true; ball.receiveShadow = true; ball.name = 'snowball'; A.add(ball);
  const ballPiv = new THREE.Group(); A.add(ballPiv);
  // snow spray where it touches the ground
  const spray = makeBurst(THREE, 160, { seed: 4, origin: (r) => [(r() - 0.5) * 0.6, r() * 0.2, (r() - 0.5) * 1.0], dir: (r) => [-0.6 - r() * 0.4, 0.5 + r() * 0.8, (r() - 0.5) * 1.2], speed: [1.5, 3.5], life: [0.4, 0.9], gravity: 6, size: 10, color: 0xffffff, opacity: 0.9 });
  const sprayG = new THREE.Group(); sprayG.add(spray); A.add(sprayG);

  // ---------------- hilltop park: snowman (no head), pines, bench, lamp ----------------
  const pineG = mergeGeometries([new THREE.ConeGeometry(1, 1.4, 9).translate(0, 1.5, 0), new THREE.ConeGeometry(0.8, 1.2, 9).translate(0, 2.25, 0), new THREE.ConeGeometry(0.55, 1.0, 9).translate(0, 2.9, 0)].map(g => g.toNonIndexed()));
  const pineSnowG = mergeGeometries([new THREE.ConeGeometry(0.62, 0.55, 9).translate(0, 1.98, 0), new THREE.ConeGeometry(0.45, 0.5, 9).translate(0, 2.62, 0), new THREE.ConeGeometry(0.3, 0.45, 9).translate(0, 3.25, 0)].map(g => g.toNonIndexed()));
  const trunkG = new THREE.CylinderGeometry(0.12, 0.17, 1.0, 7).translate(0, 0.5, 0);
  const TREES = []; const addTree = (x, z, s) => { if (Math.abs(z) < 12 && x > -20) return; if (Math.hypot(x - (-8.5), z - (-9.5)) < 6) return; TREES.push([x, z, s]); };
  for (const [x, z] of [[-12, -6], [-15, 4], [-9, -9], [-18, -2], [-6, -11], [-20, 7], [-3, -13], [2, -12], [6, 10], [-10, 9]]) addTree(x, z, 2.2 + R() * 0.9);
  for (let k = 0; k < 900; k++) { const x = -300 + R() * 1200, z = (R() < 0.5 ? -1 : 1) * (14 + Math.pow(R(), 1.5) * 500); if (x > 100 && x < 640 && Math.abs(z) < 170) continue; addTree(x, z, 2.4 + R() * 2.4); }
  for (let k = 0; k < 3200; k++) { const x = -2000 + Math.pow(R(), 1.6) * 40000, z = (R() < 0.5 ? -1 : 1) * (120 + Math.pow(R(), 1.3) * 9000); addTree(x, z, 3 + R() * 3); }
  const NTREE = TREES.length; const pine = new THREE.InstancedMesh(pineG, M(0x2f5a3c, 0.85), NTREE), pineS = new THREE.InstancedMesh(pineSnowG, M(0xf4f7fc, 0.8), NTREE), trunk = new THREE.InstancedMesh(trunkG, M(0x5a3a22, 0.9), NTREE);
  TREES.forEach(([x, z, s], i) => { m4.compose(v.set(x, hT(x, z) - 0.1, z), q.setFromEuler(e.set(0, R() * 6, 0)), sc.set(s, s * (0.9 + R() * 0.3), s)); pine.setMatrixAt(i, m4); pineS.setMatrixAt(i, m4); trunk.setMatrixAt(i, m4); TREES[i].push(m4.clone()); });
  for (const im of [pine, pineS, trunk]) { im.castShadow = true; im.receiveShadow = true; A.add(im); }
  const treeR = TREES.map(([x]) => dAt(xToT(x)) / 2);
  const snowman = new THREE.Group(); { const B = Builder(); const sn = M(0xf6f8fd, 0.8), coal = M(0x1d1d22, 0.5);
    B.add(new THREE.SphereGeometry(0.5, 28, 20), sn, 0, 0.42, 0); B.add(new THREE.SphereGeometry(0.36, 28, 20), sn, 0, 1.05, 0);
    for (const y of [0.95, 1.1, 1.25]) B.add(new THREE.SphereGeometry(0.035, 10, 8), coal, 0, y, 0.34 - Math.abs(y - 1.1) * 0.25);
    B.add(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), M(0x5a3a22, 0.9), 0.5, 1.2, 0, 0, 0, -1.0); B.add(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), M(0x5a3a22, 0.9), -0.5, 1.2, 0, 0, 0, 1.0);
    B.add(new THREE.TorusGeometry(0.26, 0.06, 8, 20).rotateX(Math.PI / 2), M(0xe63946, 0.7), 0, 1.33, 0); B.build(snowman); snowman.position.set(-4.6, 0, -1.6); A.add(snowman); }
  // a carrot for the missing head (stuck in the snow next to the snowman)
  { const c = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.24, 10), M(0xff7a1a, 0.6)); c.position.set(-4.0, 0.1, -1.1); c.rotation.set(0.5, 0, 0.3); A.add(c); }
  { const g = new THREE.Group(); const B = Builder(); const wood = M(0xa8683a, 0.7), dark = M(0x26302c, 0.5, 0.3);
    for (let k = 0; k < 3; k++) B.add(RB(1.8, 0.06, 0.14, 0.02), wood, 0, 0.48, -0.2 + k * 0.17); for (let k = 0; k < 2; k++) B.add(RB(1.8, 0.14, 0.05, 0.02), wood, 0, 0.75 + k * 0.17, -0.3); B.add(RB(0.06, 0.48, 0.5, 0.02), dark, 0.75, 0.24, 0); B.add(RB(0.06, 0.48, 0.5, 0.02), dark, -0.75, 0.24, 0);
    B.add(RB(1.8, 0.08, 0.5, 0.04), M(0xf6f8fd, 0.8), 0, 0.55, -0.03); B.build(g); g.position.set(-9.5, 0, -4.2); g.rotation.y = 0.4; A.add(g);
    const l = new THREE.Group(); const L = Builder(); L.add(new THREE.CylinderGeometry(0.06, 0.1, 3.6, 12), dark, 0, 1.8, 0); L.add(RB(0.36, 0.5, 0.36, 0.06), dark, 0, 3.75, 0); L.build(l); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a0, toneMapped: false })); bulb.position.y = 3.72; l.add(bulb); l.position.set(-7.5, 0, 2.5); A.add(l);
    const sled = new THREE.Group(); const S = Builder(); S.add(RB(0.5, 0.06, 1.1, 0.03), M(0xe63946, 0.5), 0, 0.14, 0); for (const s of [-1, 1]) S.add(RB(0.04, 0.04, 1.2, 0.02), M(0x22262c, 0.4, 0.5), s * 0.22, 0.05, 0.03); S.build(sled); sled.position.set(-2.6, 0, 2.8); sled.rotation.y = 0.9; A.add(sled); }
  const parkFill = new THREE.PointLight(0xffe0c0, 3.0, 12, 1.5); A.add(parkFill);

  const FX = 13, FZ = -6.5, SX = -8.5, SZ = -9.5;
  // ---------------- the Alpine town (main street = the ball path, x 110..620) ----------------
  const shops = [['BÄCKEREI', '#ffd23f', '#5a2a10'], ['SKI VERLEIH', '#e63946', '#ffffff'], ['KÄSEREI', '#f2c14e', '#3a2a10'], ['CAFÉ ALPINA', '#1f3d5a', '#ffe9a8'], ['SPORT HUBER', '#19a354', '#ffffff'], ['APOTHEKE', '#1f8a4c', '#ffffff'],
    ['STUBE ZUM BÄR', '#6b3e1e', '#ffffff'], ['BLUMEN', '#ff7fb4', '#ffffff'], ['METZGEREI', '#9a2a2a', '#ffffff'], ['BERGHOF', '#3a7bd5', '#ffffff'], ['SCHOKOLADE', '#5a2a10', '#ffd9a0'], ['BUCHHANDLUNG', '#2a6a5a', '#ffffff']];
  const wallPal = [0xf1e3c4, 0xf2b8b0, 0xe9a94b, 0xa9c8e0, 0xf6efe2, 0x9cc9b0, 0xe8d2b0, 0xd0714f, 0xf6d6a0, 0xc9d6df];
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a4c, roughness: 0.12, metalness: 0.55, emissive: 0x1a1208, emissiveIntensity: 0.4 });
  const litM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.3, emissive: 0xffb860, emissiveIntensity: 1.1 });
  const woodM = M(0x8a5a34, 0.8), woodD = M(0x5e3a20, 0.8), snowM = M(0xf6f8fd, 0.85), trimM = M(0xf6efe2, 0.7), roofM = M(0x5a4038, 0.85);
  const HOUSES = []; let si = 0;
  function chalet(x, z, w, dpt, floors, k, face) {
    const g = new THREE.Group(); const B = Builder(); const base = hT(x, z); const GF = 3.4, FH = 2.9, Hh = GF + (floors - 1) * FH; const wall = M(wallPal[(k * 7 + 2) % wallPal.length], 0.85);
    B.add(BX(w, Hh + 3, dpt), wall, 0, (Hh - 3) / 2, 0); B.add(BX(w + 0.1, FH, dpt + 0.1), woodM, 0, Hh - FH / 2 + 0.01, 0);
    const shM = M([0x2f7d6a, 0x9a3b2f, 0x1d3f6e, 0x3a6ea5, 0x7a2e2e][k % 5], 0.6); const nW = w > 8 ? 3 : 2, sp = w / nW;
    for (let f = 0; f < floors; f++) { const y = f === 0 ? 1.7 : GF + (f - 1) * FH + FH * 0.52; for (let i = 0; i < nW; i++) { const wx = -w / 2 + sp * (i + 0.5); if (f === 0 && i === 0 && k % 3 !== 2) continue; const lit = R() < 0.35;
        B.add(BX(1.05, 1.35, 0.06), trimM, wx, y, dpt / 2 + 0.03); B.add(BX(0.85, 1.15, 0.05), lit ? litM : glassM, wx, y, dpt / 2 + 0.07);
        B.add(RB(0.42, 1.3, 0.06, 0.02), shM, wx - 0.68, y, dpt / 2 + 0.06); B.add(RB(0.42, 1.3, 0.06, 0.02), shM, wx + 0.68, y, dpt / 2 + 0.06);
        if (f > 0) { B.add(RB(1.1, 0.22, 0.25, 0.04), M(0x8a4a2a, 0.8), wx, y - 0.8, dpt / 2 + 0.18); B.add(BX(1.0, 0.08, 0.22), snowM, wx, y - 0.66, dpt / 2 + 0.18); } } }
    if (floors > 1) { B.add(RB(w * 0.9, 0.12, 1.1, 0.03), woodD, 0, GF + 0.05, dpt / 2 + 0.55); for (let b = 0; b <= 12; b++) B.add(BX(0.06, 0.9, 0.06), woodD, -w * 0.45 + b * w * 0.9 / 12, GF + 0.5, dpt / 2 + 1.07); B.add(BX(w * 0.9, 0.08, 0.1), woodD, 0, GF + 0.95, dpt / 2 + 1.07); B.add(BX(w * 0.9, 0.06, 1.1), snowM, 0, GF + 0.98, dpt / 2 + 0.55); }
    // gable roof facing the street (ridge runs front-to-back), big overhang, thick snow on top
    const rh = w * 0.42, half = w / 2 + 0.9, sl = Math.hypot(half, rh), ang = Math.atan2(rh, half);
    for (const s of [-1, 1]) { B.add(BX(sl, 0.25, dpt + 1.8), roofM, s * half / 2, Hh + rh / 2, 0, 0, 0, -s * ang); B.add(BX(sl, 0.32, dpt + 1.9), snowM, s * half / 2 - s * Math.sin(ang) * 0.27, Hh + rh / 2 + Math.cos(ang) * 0.27, 0, 0, 0, -s * ang); }
    { const gs = new THREE.Shape(); gs.moveTo(-w / 2, 0); gs.lineTo(w / 2, 0); gs.lineTo(0, rh * (w / 2) / half); gs.closePath(); for (const zz of [dpt / 2, -dpt / 2 - 0.12]) B.add(new THREE.ExtrudeGeometry(gs, { depth: 0.12, bevelEnabled: false }), woodM, 0, Hh, zz); }
    B.add(BX(0.7, 2.0, 0.7), M(0x8a8078, 0.9), w * 0.25, Hh + rh * 0.7, -dpt * 0.2); B.add(BX(0.8, 0.2, 0.8), snowM, w * 0.25, Hh + rh * 0.7 + 1.05, -dpt * 0.2);
    B.add(RB(1.0, 2.2, 0.1, 0.03), woodD, -w / 2 + sp * 0.5, 1.1, dpt / 2 + 0.05);
    B.build(g);
    if (k % 3 !== 2) { const s = shops[(si++) % shops.length]; const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 0.62), signMat(s[0], s[1], s[2])); sg.position.set(sp * 0.3, 2.85, dpt / 2 + 0.09); g.add(sg); }
    g.position.set(x, base, z); g.rotation.y = face; return g; }
  // clouds (seen once the camera is high)
  const cloudM = new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xfff3e6, transparent: true, opacity: 0.85, depthWrite: false, fog: true }); const clouds = [];
  for (let k = 0; k < 160; k++) { const x = -20000 + R() * 120000, z = (R() - 0.5) * 80000; const s = new THREE.Sprite(cloudM); s.position.set(x, hT(x, 0) * 0.3 + 2200 + R() * 1200, z); s.scale.set(1500 + R() * 2500, 500 + R() * 400, 1); A.add(s); clouds.push(s); }

  // ---------------- characters ----------------
  // YOU (same look every video: short hair 0x5a3a20), in a winter jacket + beanie colours
  const P = makePerson(THREE, { shirt: 0x2bb3b1, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0x3a2a1e, seed: 5, hairStyle: 'short' }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  { const sc2 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 18).rotateX(Math.PI / 2), M(0xffd23f, 0.8)); sc2.position.y = 1.47; P.group.add(sc2); }
  // Mittens
  const mit = makeCat(THREE, 0xf0a040); mit.rotation.order = 'YXZ'; A.add(mit); const MC = mit.userData.cat;
  // THE FILMER: a skier on the slope, filming instead of helping
  const fm = makePerson(THREE, { shirt: 0xe63946, pants: 0x22262c, hair: 0xf2d27a, skin: 0xd8a47e, shoe: 0x22262c, seed: 41, hairStyle: 'long' }); fm.group.rotation.order = 'YXZ'; A.add(fm.group);
  const phone = new THREE.Mesh(RB(0.08, 0.15, 0.015, 0.01), M(0x111111, 0.3)); A.add(phone); const phoneScr = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.13), new THREE.MeshBasicMaterial({ color: 0xbfe2ff, toneMapped: false })); phoneScr.position.z = 0.009; phone.add(phoneScr);
  const skis = new THREE.Group(); { for (const s of [-1, 1]) { const sk = new THREE.Mesh(RB(0.09, 0.03, 1.7, 0.012), M(0xffd23f, 0.4)); sk.position.set(s * 0.12, 0.02, 0.1); skis.add(sk); } A.add(skis); }
  // THE SALESMAN: hot chocolate stall beside the main street (the sign flips to TICKETS)
  const stall = new THREE.Group(); const signA = signMat('HOT CHOCOLATE', '#7a3e1e', '#ffe9c8', 768, 160), signB = signMat('TICKETS €5', '#ffd23f', '#111111', 768, 160);
  { const B = Builder(); B.add(RB(4.4, 1.15, 1.6, 0.06), M(0xb5523b, 0.7), 0, 0.58, 0); B.add(RB(4.6, 0.12, 1.8, 0.04), M(0xf6efe2, 0.6), 0, 1.2, 0); for (const s of [-1, 1]) B.add(BX(0.12, 2.0, 0.12), woodD, s * 2.1, 2.2, -0.7); for (const s of [-1, 1]) B.add(BX(0.12, 2.0, 0.12), woodD, s * 2.1, 2.2, 0.7);
    B.add(BX(5.0, 0.2, 2.4), M(0xe63946, 0.7), 0, 3.25, 0); B.add(BX(5.0, 0.18, 2.4), snowM, 0, 3.42, 0); for (let k = 0; k < 4; k++) B.add(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 12), M(0xffffff, 0.5), -1.2 + k * 0.5, 1.33, 0.3);
    B.add(BX(0.08, 1.8, 0.08), woodD, 0, 4.3, 0); B.build(stall); }
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.96), signA); signM.position.set(0, 4.9, 0.05); stall.add(signM); const signBack = new THREE.Mesh(BX(4.7, 1.06, 0.06), woodD); signBack.position.set(0, 4.9, -0.0); stall.add(signBack);
  stall.position.set(SX, hT(SX, SZ), SZ); stall.rotation.y = 0.35; A.add(stall);
  const sm = makePerson(THREE, { shirt: 0xff8a3d, pants: 0x3b3b46, hair: 0x1a1210, skin: 0x8d5a3b, shoe: 0x22262c, seed: 31, hairStyle: 'bald' }); sm.group.rotation.order = 'YXZ'; A.add(sm.group);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0xe63946, 0.8)); hat.position.y = 0.16; hat.scale.set(1, 1.1, 1); sm.headPivot.add(hat);
  const tix = new THREE.Mesh(BX(0.3, 0.12, 0.01), M(0xffd23f, 0.5)); A.add(tix);
  // =====================================================================================================
  // SCENE B (kilometres): Earth, the Moon-sized snowball on it, the Moon for comparison
  // =====================================================================================================
  const B2 = new THREE.Scene(); B2.background = new THREE.Color(0x050a22); const camB = new THREE.PerspectiveCamera(44, W / H, 10, 5e7);
  B2.add(stars(THREE, 5000, 3e7, 17)); B2.add(new THREE.HemisphereLight(0xbfd4ff, 0x40304a, 0.55)); const RE = 6371;
  const sunB = new THREE.DirectionalLight(0xfff0dc, 3.0); sunB.position.set(0.5, 0.45, 0.75).multiplyScalar(1e6); B2.add(sunB);
  const fillB = new THREE.DirectionalLight(0x9ab8ff, 0.7); fillB.position.set(-0.8, -0.2, 0.5).multiplyScalar(1e6); B2.add(fillB);
  const earthB = makeEarth(THREE, RE, 21); earthB.rotation.set(0.25, 1.4, 0); B2.add(earthB);
  const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0x8fc8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 })); earthGlow.scale.setScalar(RE * 3.0); B2.add(earthGlow);
  const moonTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#c4bfb6'; g.fillRect(0, 0, w, h); const r = rng(4); for (let k = 0; k < 260; k++) { const x = r() * w, y = r() * h, s = 2 + r() * r() * 22; g.fillStyle = `rgba(${110 + r() * 30},${106 + r() * 30},${100 + r() * 30},${0.2 + r() * 0.25})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1737.4, 64, 32), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95, color: 0x8a8680 })); B2.add(moon);
  const ballB = new THREE.Mesh(ballG, new THREE.MeshStandardMaterial({ color: 0xe4ebf5, roughness: 0.85 })); B2.add(ballB);
  const UPB = new THREE.Vector3(0.22, 0.8, 0.5).normalize();   // where on Earth it sits (upper left of the globe)

  // =====================================================================================================
  // MITTENS CAM (inset): she keeps running on top of the ball (shown once she is too small to read)
  // =====================================================================================================
  const MCam = new THREE.Scene(); const mcBg = new THREE.Color(0xffd9b0); MCam.background = mcBg; MCam.add(new THREE.HemisphereLight(0xffffff, 0xb0a0c0, 1.2)); { const d = new THREE.DirectionalLight(0xfff0d8, 2.2); d.position.set(1.5, 2, 3); MCam.add(d); }
  const mc = makeCat(THREE, 0xf0a040); mc.rotation.order = 'YXZ'; MCam.add(mc); const MCC = mc.userData.cat;
  const mcBall = new THREE.Mesh(ballG, ballMat); mcBall.scale.setScalar(3.0); mcBall.position.set(0, -3.0, 0); MCam.add(mcBall);
  const mcCam = new THREE.PerspectiveCamera(30, 1, 0.05, 30); mcCam.position.set(0.95, 0.42, 1.3); mcCam.lookAt(0, 0.3, 0.05);

  // ---------------- milestone objects (real size, placed right next to the ball when it passes them) ----------------
  const MS = [];
  { const house = chalet(0, 0, 8, 9, 2, 3, 0); house.position.set(0, 0, 0); A.add(house); MS.push({ g: house, half: 6, h: 9.8, sub: '' }); }
  { const g = new THREE.Group(); const B = Builder(); const st = M(0xcfa865, 0.8), dk = M(0x3f5a4a, 0.6, 0.2);
    B.add(BX(12, 62, 12), st, 0, 31, 0); B.add(BX(13, 12, 13), st, 0, 58, 0); for (const [x, z, ry] of [[0, 6.6, 0], [0, -6.6, Math.PI], [6.6, 0, Math.PI / 2], [-6.6, 0, -Math.PI / 2]]) { B.add(new THREE.CylinderGeometry(3.6, 3.6, 0.4, 32).rotateX(Math.PI / 2), M(0xf6efe2, 0.5), x, 58, z, 0, ry, 0); B.add(BX(0.4, 2.8, 0.3), M(0x111111, 0.5), x * 1.03, 59, z * 1.03, 0, ry, 0); }
    B.add(BX(10, 8, 10), st, 0, 68, 0); B.add(new THREE.ConeGeometry(7.5, 22, 4).rotateY(Math.PI / 4), dk, 0, 83, 0); B.add(new THREE.CylinderGeometry(0.3, 0.3, 4, 6), M(0xffd23f, 0.3, 0.7), 0, 95, 0);
    for (let y = 6; y < 52; y += 6) for (const s of [-1, 1]) { B.add(BX(1.2, 3.5, 0.3), glassM, s * 3, y, 6.1); B.add(BX(0.3, 3.5, 1.2), glassM, 6.1, y, s * 3); }
    B.build(g); A.add(g); MS.push({ g, half: 8, h: 96, sub: '' }); }
  { const g = new THREE.Group(); const B = Builder(); const ir = M(0x8a5a3a, 0.6, 0.3); const leg = (x0, z0, x1, z1, y0, y1, w) => { const dx = x1 - x0, dz = z1 - z0, dy = y1 - y0, L = Math.hypot(dx, dy, dz); const geo = BX(w, L, w); const o = new THREE.Object3D(); o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); o.lookAt(x1, y1, z1); o.rotateX(Math.PI / 2); o.updateMatrix(); geo.applyMatrix4(o.matrix); B.add(geo, ir, 0, 0, 0); };
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { leg(sx * 62, sz * 62, sx * 22, sz * 22, 0, 57, 12); leg(sx * 22, sz * 22, sx * 12, sz * 12, 57, 116, 9); leg(sx * 12, sz * 12, sx * 4, sz * 4, 116, 276, 6); for (let k = 0; k < 6; k++) { const y = 8 + k * 9; const r = lerp(62, 22, y / 57) ; B.add(BX(3, 2, r * 2), ir, sx * r, y, 0); } }
    B.add(BX(70, 6, 70), ir, 0, 57, 0); B.add(BX(36, 5, 36), ir, 0, 116, 0); B.add(BX(14, 6, 14), ir, 0, 276, 0); B.add(new THREE.CylinderGeometry(1.5, 3.5, 50, 8), ir, 0, 303, 0);
    for (const sx of [-1, 1]) B.add(new THREE.TorusGeometry(26, 2, 6, 24, Math.PI), ir, sx * 0, 30, sx * 48, 0, sx > 0 ? 0 : Math.PI, 0);
    B.build(g); A.add(g); MS.push({ g, half: 65, h: 330, sub: '' }); }
  { const g = new THREE.Group(); const B = Builder(); const sv = M(0xd5dee8, 0.25, 0.6); let y = 0; const segs = [[38, 160], [30, 140], [23, 130], [17, 120], [12, 100], [8, 80], [5, 50], [2.5, 30]];
    for (const [r, h] of segs) { B.add(new THREE.CylinderGeometry(r, r * 1.05, h, 6), sv, 0, y + h / 2, 0); B.add(new THREE.CylinderGeometry(r * 0.6, r * 0.6, h, 6), sv, r * 0.9, y + h * 0.4, 0); y += h; }
    B.add(new THREE.CylinderGeometry(0.6, 2.2, 828 - y, 8), sv, 0, y + (828 - y) / 2, 0); B.build(g); A.add(g); MS.push({ g, half: 70, h: 828, sub: '' }); }
  { const geo = new THREE.ConeGeometry(14000, 8849, 64, 24, false); geo.translate(0, 8849 / 2, 0); const p = geo.attributes.position; const cc = new Float32Array(p.count * 3); const rr = rng(5);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > 10 && y < 8800) { const n = 1 + 0.12 * Math.sin(x * 0.0009 + z * 0.0013) + 0.08 * Math.sin(Math.atan2(z, x) * 7); p.setXYZ(i, x * n, y, z * n); }
      col.setRGB(0.95, 0.96, 1.0).lerp(new THREE.Color(0.42, 0.4, 0.42), (0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 9 + y * 0.001)) * (y < 6500 ? 0.55 : 0.15)); cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(cc, 3)); geo.computeVertexNormals(); const g = new THREE.Group(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); m.castShadow = m.receiveShadow = true; g.add(m); A.add(g); MS.push({ g, half: 14500, h: 8849, sub: '' }); }
  { const g = new THREE.Group(); const B = Builder(); const wh = M(0xf6f6f2, 0.35, 0.2), bl = M(0x1d5f99, 0.4);
    B.add(new THREE.CapsuleGeometry(2.0, 32, 8, 16).rotateZ(Math.PI / 2), wh, 0, 0, 0); B.add(RB(10, 0.5, 34, 0.2), M(0x9aa3ad, 0.4), 0, -0.6, 0); B.add(RB(3, 5, 0.6, 0.2), bl, -15, 3.5, 0); B.add(RB(4, 0.4, 13, 0.15), wh, -15, 0.5, 0);
    B.add(new THREE.CylinderGeometry(1.1, 1.1, 4, 14).rotateZ(Math.PI / 2), M(0x9aa3ad, 0.4, 0.5), 1, -1.8, 7); B.add(new THREE.CylinderGeometry(1.1, 1.1, 4, 14).rotateZ(Math.PI / 2), M(0x9aa3ad, 0.4, 0.5), 1, -1.8, -7); B.build(g); A.add(g); MS.push({ g, half: 0, h: 0, sub: '(plane drawn 120x bigger)', air: true }); }
  MS.forEach(m => m.g.visible = false);
  const [bxAt] = [(t) => pathAt(t)[0]];
  function placeMS(k) { const d = MIL[k][0], m = MS[k]; const t0 = MT[k]; const bx0 = bxAt(t0);
    if (m.air) { const x = bx0 + 0.95 * d; const z = -0.1 * d; m.g.position.set(x, hT(x, 0) + 11000, z); m.g.scale.setScalar(120); m.g.rotation.set(0, Math.PI, 0.15); return; }
    const d1 = dAt(t0 + 1.5); const x = bx0 + 1.05 * d + (k === 4 ? 0.45 : 1) * m.half, z = -(0.5 * d1 + m.half * 1.05 + 0.05 * d); m.g.position.set(x, hT(x, z) - 0.5, z); m.g.rotation.y = k === 0 ? 0 : 0.3; }
  for (let k = 0; k < 6; k++) placeMS(k);
  const msTop = (k) => { const m = MS[k]; if (m.air) return m.g.position.toArray(); return [m.g.position.x, m.g.position.y + m.h, m.g.position.z]; };
  // ISS orbit ring (scene B) — a great circle at 408 km through the ball's spot
  const issR = new THREE.Mesh(new THREE.TorusGeometry(RE + 408, 9, 8, 256), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 })); B2.add(issR);
  { const ax = new THREE.Vector3().crossVectors(UPB, new THREE.Vector3(1, 0, 0)).normalize(); issR.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ax); }

  await document.fonts.ready;

  const MOODS = ['annoyed', 'unimpressed', 'annoyed', 'shock', 'scared'];
  const BMOODS = ['annoyed', 'shock', 'unimpressed', 'scared', 'smug', 'shock', 'sleepy', 'scared', 'shock', 'unimpressed'];
  const TJUMP = TSLIP + 0.85;
  function runPose(C, t, amt) { C.legs.forEach((l, i) => { const ph = t * 16 + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0); l.rotation.x = Math.sin(ph) * 0.9 * amt; l.position.y = 0.07 + Math.max(0, Math.sin(ph)) * 0.03 * amt; }); }
  function walkPose(Q, ph, amp) { Q.legL.rotation.set(Math.sin(ph) * 0.55 * amp, 0, -0.04); Q.legR.rotation.set(-Math.sin(ph) * 0.55 * amp, 0, 0.04); Q.armL.rotation.set(-Math.sin(ph) * 0.45 * amp, 0, -0.1); Q.armR.rotation.set(Math.sin(ph) * 0.45 * amp, 0, 0.1); Q.group.position.y += Math.abs(Math.cos(ph)) * 0.05 * amp; }
  const milIdx = (t) => { let k = -1; for (let i = 0; i < MT.length; i++) if (t >= MT[i] - 0.05) k = i; return k; };   // last milestone reached
  const dirF = new THREE.Vector3(0.15, 0.12, 1).normalize();

  function update(tt) {
    const T = teaserTime(tt, { teaser: TEASER, payoffT: SEND - 0.75 }); const t = T.st;
    const out = { scene: A, camera: cam, bloom: 0.22, bloomThreshold: 0.92, shake: 0, flash: 0, t, tt, teaser: T.inTeaser, tk: T.k, env: 0.32, exposure: 0.92, sat: 1.22, contrast: 1.08 };
    const k = stepOf(t); const d = dAt(t), r = d / 2; out.d = d; out.mi = milIdx(t);
    const [bx, ang] = pathAt(t); const by = hT(bx, 0) + r * 0.97;
    ball.position.set(bx, by, 0); ball.scale.setScalar(r); ball.rotation.set(0, 0, -ang); ball.visible = t < CUT;
    track.geometry.setDrawRange(0, trackCount(t));
    sprayG.position.set(bx - r * 0.2, hT(bx, 0), 0); sprayG.scale.setScalar(Math.max(1, d * 0.8)); spray.userData.update(t > TSLIP ? ((t - TSLIP) % 0.9) + 0.0001 : 0, 0); spray.visible = t > TSLIP && t < CUT;
    // ---------------- you ----------------
    { const G = P.group; let x = bx - r - 0.42, z = 0.05, y = 0, ry = Math.PI / 2, pitch = 0; const push = t < TSLIP;
      if (!push) { const u = clamp((t - TSLIP) / 0.55); x = PX[Math.floor(TSLIP / DT)] - 0.15 - 0.42 + 0.9 * easeOut(u); const fall = smooth(TSLIP + 0.1, TSLIP + 0.6, t); pitch = 1.45 * fall; const sit = smooth(TSLIP + 1.9, TSLIP + 2.9, t); pitch = lerp(pitch, -0.15, sit); }
      G.position.set(x, y, z); G.rotation.set(push ? 0.35 : pitch, ry, 0);
      let face = { brows: 'neutral', eyes: 1.0, mouth: 'smile', look: [0.3, -0.5] }, head = [0.25, 0, 0];
      if (push) { walkPose(P, t * 5.5, 0.6); P.armL.rotation.set(-1.25, 0, -0.1); P.armR.rotation.set(-1.25, 0, 0.1); P.torso.rotation.set(0.15, 0, 0); if (k === 2) face = { brows: 'up', eyes: 1.15, mouth: 'smile', look: [0.3, -0.4] }; head = [-0.15, 0.25, 0]; }
      else { P.legL.rotation.set(0.2, 0, -0.06); P.legR.rotation.set(-0.15, 0, 0.06); P.armL.rotation.set(-2.6, 0, -0.5); P.armR.rotation.set(-2.6, 0, 0.5); face = { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.6, look: [0, 0.3] }; head = [-0.55, 0.0, 0];
        if (t > TSLIP + 2.2) { P.legL.rotation.set(-1.4, 0, -0.2); P.legR.rotation.set(-1.4, 0, 0.2); P.armL.rotation.set(-0.4, 0, -0.5); P.armR.rotation.set(-0.4, 0, 0.5); face = { brows: 'worried', eyes: 1.3, mouth: 'o', look: [0.4, 0] }; head = [0.05, 0.35, 0]; } }
      if (k === 0) face = { brows: 'neutral', eyes: 0.95, mouth: 'smile', look: [0.2, -0.6] };
      P.headPivot.rotation.set(...head); setFace(P, face); life(P, t, 0.7); G.visible = t < BP + 1; }
    parkFill.position.set(P.group.position.x + 1.5, 2.2, 2.4); parkFill.intensity = t < BP ? 3.0 : 0;
    // ---------------- Mittens ----------------
    { let px, py, pz, ry = -Math.PI / 2, mood = t < BP ? MOODS[k] : BMOODS[Math.max(0, out.mi + 1)]; const C = MC; const on = t >= TJUMP;
      const hx = PX[Math.floor(TSLIP / DT)] + 0.9, hz = -0.95;
      if (t < T1) mood = 'annoyed'; if (k === 3 && t < TSLIP + 0.3) mood = 'unimpressed';
      if (!on) { px = t < TSLIP ? Math.min(bx + 0.75, hx) : hx; pz = hz; py = 0; ry = t < TSLIP ? Math.PI * 0.42 : Math.PI * 0.3; C.legs.forEach(l => { l.rotation.x = 0; l.position.y = 0.07; });
        if (t < TSLIP) runPose(C, t * 0.4, t > 0.3 ? 0.3 : 0);
        const jj = clamp((t - (TJUMP - 0.45)) / 0.45); if (jj > 0) { const [jbx] = pathAt(TJUMP); const tgy = hT(jbx, 0) + dAt(TJUMP) * 0.97; px = lerp(hx, jbx - 0.05, jj); pz = lerp(hz, 0, jj); py = lerp(0, tgy, jj) + Math.sin(Math.PI * jj) * 0.9; ry = lerp(ry, -Math.PI / 2, jj); mood = 'shock'; } }
      else { px = bx - 0.04 * r; pz = 0; py = by + r * 0.985; ry = -Math.PI / 2; runPose(C, t, 1); }
      mit.position.set(px, py, pz); mit.scale.setScalar(on ? 1.45 : 1.25); mit.rotation.set(on ? -0.05 : 0, ry, 0);
      setCatFace(mit, mood, 0.25); catLife(mit, t, 1); C.headPivot.rotation.y = on ? 0.9 * Math.sin(t * 0.8) * 0.3 + 0.5 : 0; mit.visible = t < CUT; out.mood = mood; }
    // ---------------- the filmer (skier) ----------------
    { const fy = hT(FX, FZ); fm.group.position.set(FX, fy, FZ); const look = Math.atan2(bx - FX, 0 - FZ); fm.group.rotation.set(0, look, 0); skis.position.set(FX, fy + 0.01, FZ); skis.rotation.set(0.22, Math.PI / 2, 0);
      fm.legL.rotation.set(-0.15, 0, -0.08); fm.legR.rotation.set(-0.15, 0, 0.08); fm.armR.rotation.set(-1.9, 0, 0.35); fm.armL.rotation.set(-0.3, 0, -0.25); fm.headPivot.rotation.set(-0.1, 0.0, 0);
      setFace(fm, { brows: t > TSLIP ? 'up' : 'neutral', eyes: 1.2, mouth: t > TSLIP ? 'o' : 'smile', look: [0, 0] }); life(fm, t, 0.6);
      fm.group.updateMatrixWorld(true); fm.armR.userData.end.getWorldPosition(tv); phone.position.copy(tv).add(v.set(0, 0.06, 0)); phone.rotation.set(0, fm.group.rotation.y + Math.PI, 0); fm.group.visible = skis.visible = phone.visible = t < BP + 1; }
    // ---------------- the salesman (hot chocolate -> tickets the moment it slips) ----------------
    { const flip = smooth(TSLIP + 0.6, TSLIP + 1.0, t); signM.material = flip > 0.5 ? signB : signA; signM.scale.y = Math.abs(1 - 2 * flip) * 0.9 + 0.1;
      const y0 = hT(SX, SZ); sm.group.position.set(SX + 2.9, y0, SZ + 0.9); sm.group.rotation.set(0, flip > 0.5 ? 0.9 : 0.6, 0); sm.legL.rotation.set(0, 0, -0.05); sm.legR.rotation.set(0, 0, 0.05);
      const wave = flip > 0.5 ? Math.sin(t * 9) * 0.35 : 0; sm.armR.rotation.set(flip > 0.5 ? -2.7 + wave : -1.0, 0, 0.3); sm.armL.rotation.set(-0.8, 0, -0.2); sm.headPivot.rotation.set(-0.05, 0.2, 0);
      setFace(sm, flip > 0.5 ? { brows: 'up', eyes: 1.2, mouth: 'smile', look: [0, 0] } : { brows: 'neutral', eyes: 1.0, mouth: 'smile', look: [0.5, 0] }); life(sm, t, 0.7);
      sm.group.updateMatrixWorld(true); sm.armR.userData.end.getWorldPosition(tv); tix.position.copy(tv); tix.visible = flip > 0.5 && t < BP + 1; tix.rotation.set(0, 0.9, 0.3); stall.visible = sm.group.visible = t < BP + 1; out.flip = flip; }
    // trees in the ball's way get rolled up
    { let ch = false; for (let i = 0; i < NTREE; i++) { const [x, z, s, mm] = TREES[i]; const gone = (bx > x && Math.abs(z) < treeR[i] * 0.95 && t > TSLIP) || (z > 0 && x > -20 && t > BP - 0.3); const g2 = TREES[i][4];
        if (gone !== !!g2) { TREES[i][4] = gone; ch = true; if (gone) m4.makeScale(0, 0, 0); else m4.copy(mm); pine.setMatrixAt(i, m4); pineS.setMatrixAt(i, m4); trunk.setMatrixAt(i, m4); } }
      if (ch) pine.instanceMatrix.needsUpdate = pineS.instanceMatrix.needsUpdate = trunk.instanceMatrix.needsUpdate = true; }
    // milestone objects: visible around their moment
    MS.forEach((m, i) => { m.g.visible = t < CUT && t > MT[i] - 1.1 && t < MT[i] + 1.5; });
    // ---------------- camera ----------------
    let scene = A, camera = cam, dof = 0.0, focusY = 0.52, focusH = 0.24;
    const sp_ = smooth(MT[5], CUT, t);
    if (t < CUT) {
      const I = { look: [bx - 0.35, 0.62, -0.25], az: 0.95, el: 0.14, D: 6.2 + 0.8 * smooth(T1, HS[2], t) };
      const lag = dAt(Math.max(0, t - 0.2)); const big = smooth(BP - 0.3, BP + 1.2, t);
      const F = { look: [bx + 0.15 * lag + big * 0.55 * lag, by + big * 0.25 * lag, -big * 0.2 * lag], az: lerp(0.78, 0.06, big), el: lerp(0.18, 0.08, big), D: lerp(2.6 * lag + 3.6, 5.2 * lag + 4, big) };
      const u = smooth(TSLIP - 0.2, TSLIP + 1.4, t);
      const look = I.look.map((p, i) => lerp(p, F.look[i], u)); const az = lerp(I.az, F.az, u), el = lerp(I.el, F.el, u), D = Math.exp(lerp(Math.log(I.D), Math.log(F.D), u));
      let pos = [look[0] + Math.cos(el) * Math.sin(az) * D, look[1] + Math.sin(el) * D, look[2] + Math.cos(el) * Math.cos(az) * D];
      const gy = hT(pos[0], pos[2]) + Math.max(1.4, D * 0.05); if (pos[1] < gy) pos[1] = gy;
      cam.position.set(...pos); cam.lookAt(...look); cam.fov = 50; cam.near = Math.max(0.05, D * 0.005); cam.updateProjectionMatrix(); out.dist = D;
      const ah = smooth(800, 20000, D); sky.material.uniforms.zen.value.copy(zen0).lerp(zenA, ah).lerp(zenS, sp_); sky.material.uniforms.hor.value.copy(hor0).lerp(horA, ah).lerp(horS, sp_ * 0.8); starsA.material.opacity = sp_;
      A.fog.density = 0.25 / (D + 900) * (1 - 0.85 * sp_) * (1 - 0.6 * ah); A.fog.color.copy(fogC).lerp(fogA, ah).lerp(new THREE.Color(0x5f86c0), sp_);
      clouds.forEach(c => c.visible = D > 1500); cloudM.opacity = 0.7 * smooth(1500, 5000, D);
      setShadow(look[0], look[1], look[2], clamp(Math.max(D * 0.75, r * 2.5), 7, 60000));
      dof = D < 8 ? 0.14 : 0; out.exposure = lerp(0.92, 1.0, ah); out.sat = 1.24 + 0.06 * ah; out.focus = t < TSLIP ? P.group : ball; out.space = D > 2e5;
    } else {
      scene = B2; camera = camB; out.bloom = 0.3; out.bloomThreshold = 0.9; out.exposure = 1.0; out.vignette = 0.45; out.env = 0.3;
      const dK = d / 1000, rK = dK / 2; const c = UPB.clone().multiplyScalar(RE + rK * 0.98); ballB.position.copy(c); ballB.scale.setScalar(rK); ballB.rotation.set(0, 0, -ang * 0.02);
      const tgtF = c.clone().multiplyScalar(0.45).add(new THREE.Vector3(rK * 1.15, 0, 0)), DdF = Math.max(3.9 * RE, 3.0 * (RE + rK)); const u = smooth(4.9, 6.35, Math.log10(d));
      const tgt = c.clone().lerp(tgtF, u); const dir = UPB.clone().multiplyScalar(0.6 * (1 - u)).add(dirF).normalize(); const Dd = Math.exp(lerp(Math.log(6 * dK), Math.log(DdF), u));
      camB.position.copy(tgt).addScaledVector(dir, Dd); camB.lookAt(tgt); camB.fov = 44; camB.near = Math.max(1, Dd * 0.002); camB.updateProjectionMatrix();
      const MOONP = c.clone().add(new THREE.Vector3(1, 0.05, 0.1).normalize().multiplyScalar(rK + 1737.4 + 350)); moon.position.copy(MOONP); moon.visible = t > MT[8] - 1.0;
      issR.visible = t > MT[7] - 1.1; issR.material.opacity = 0.85 * smooth(MT[7] - 1.1, MT[7] - 0.6, t);
      out.moonP = MOONP.toArray(); out.ballTop = UPB.clone().multiplyScalar(RE + dK).toArray(); out.issP = UPB.clone().multiplyScalar(RE + 408).toArray(); out.focus = ballB; out.space = true;
    }
    out.scene = scene; out.camera = camera; out.dof = dof; out.focusY = focusY; out.focusH = focusH;
    out.flash = 0.25 * pulse(t, CUT, 0.35); out.shake = 0.25 * pulse(t, TSLIP + 0.5, 0.4);
    // ---------------- Mittens cam (small reaction once she is too small to see) ----------------
    { const show = smooth(BP - 0.4, BP + 0.2, t); const mood = t >= PUNCH ? 'unimpressed' : out.mood;
      setCatFace(mc, mood, 0.3); catLife(mc, t, 1); runPose(MCC, t, 1); mc.rotation.set(0, -0.35, 0); mc.position.set(0, 0, 0);
      mcBall.rotation.set(-t * 1.6, 0, 0); mcBg.set(0xffd9b0).lerp(new THREE.Color(0x9cc4ff), smooth(MT[2], MT[4], t)).lerp(new THREE.Color(0x0a1438), t > CUT ? 1 : sp_);
      out.inset = { scene: MCam, camera: mcCam, x: 0.84, y: 0.8, r: 0.105, show, ring: '#ffd23f' }; }
    return out;
  }

  // ---------------- on-screen text: (1) caption at the top, (2) gauge + counter on the left, (3) milestone label next to the object ----------------
  const CAP = [[1.75, 3.85, 'The biggest snowball ever made was three metres.'], [3.9, 6.45, 'But yours never stops. Not even at the Moon.'], [HS[1] + 0.05, HS[2] - 0.1, 'Your snowman needs a head. So you roll a snowball.'], [HS[2] + 0.05, HS[3] - 0.1, 'Rolling snow sticks. Every turn adds a new layer.'],
    [HS[3] + 0.05, BP - 0.1, 'Then it slips. You let go. Mittens jumps on.'], [MT[2] - 0.35, MT[3] - 0.4, 'Taller than the Eiffel Tower.'], [MT[4] - 0.35, MT[5] - 0.4, 'Taller than Mount Everest.'],
    [MT[6] - 0.25, MT[7] - 0.3, 'Now the top is in space.'], [MT[8] - 0.25, PUNCH - 0.1, 'As big as the Moon.'], [PUNCH, ASK - 0.1, 'Well. Earth got the head instead.']];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function topText(ctx, W, t, a, b, txt, size = 54, y = 250) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.15, (b - t) / 0.15));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 700 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.86).forEach((l, i) => { ctx.strokeText(l, W / 2, y + i * size * 1.25); ctx.fillText(l, W / 2, y + i * size * 1.25); }); ctx.restore(); }
  function proj(pos, camO) { tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1 || Math.abs(tv.x) > 1.1 || Math.abs(tv.y) > 1.1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  function mileLabel(ctx, pos, title, sub, camO, a = 1) { if (!pos || a <= 0 || !camO) return; const p = proj(pos, camO); if (!p) return; let [x, y] = p; x = clamp(x, 300, 1040); y = clamp(y, 720, 1500);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 40px ${FONT}`; const w = Math.max(ctx.measureText(title).width, sub ? (ctx.font = `700 26px ${FONT}`, ctx.measureText(sub).width) : 0) + 36; ctx.font = `900 40px ${FONT}`; const h = sub ? 96 : 66;
    const lx = clamp(x - w / 2, 250, 1060 - w), ly = y - h - 26; ctx.fillStyle = 'rgba(10,12,16,0.78)'; ctx.beginPath(); ctx.roundRect(lx, ly, w, h, 16); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(clamp(x, lx + 20, lx + w - 20), ly + h); ctx.lineTo(x, y - 4); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(title, lx + 18, ly + 34); if (sub) { ctx.font = `700 26px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(sub, lx + 18, ly + 74); } ctx.restore(); }
  function fmtLen(m) { if (m < 1) return Math.round(m * 100) + ' cm'; if (m < 1000) return (m < 10 ? m.toFixed(1) : Math.round(m).toString()) + ' m'; const km = m / 1000; return (km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString('en-US')) + ' km'; }
  const MLAB = MIL.map(([dd, nm]) => `${fmtLen(dd)} = ${nm}`);
  const G0 = Math.log10(0.08), G1 = Math.log10(3474800);
  function gauge(ctx, t, d, mi) { const x = 44, y0 = 330, y1 = 1500, w = 22; const f = clamp((Math.log10(d) - G0) / (G1 - G0)); const yF = lerp(y1, y0, f);
    ctx.save(); ctx.fillStyle = 'rgba(10,12,16,0.55)'; ctx.beginPath(); ctx.roundRect(x - 6, y0 - 6, w + 12, y1 - y0 + 12, 16); ctx.fill();
    const gr = ctx.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#bfe3ff'); gr.addColorStop(1, '#7dd3ff'); ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(x, yF, w, y1 - yF, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; [3.2, ...MIL.map(m => m[0])].forEach((dd, i) => { const yy = lerp(y1, y0, (Math.log10(dd) - G0) / (G1 - G0)); ctx.beginPath(); ctx.moveTo(x + w + 4, yy); ctx.lineTo(x + w + 18, yy); ctx.stroke(); });
    ctx.restore();
    // counter + NEXT line next to the top of the gauge
    const k = (t < BP ? Math.max(1, stepOf(t)) : 5 + Math.max(0, mi + (t >= MT[0] - 0.05 ? 0 : 0))); const stepN = t < BP ? Math.max(0, stepOf(t)) : 5 + mi + 1;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    const bump = Math.max(pulse(t, MT[Math.max(0, mi)] ?? -9, 0.4), ...HS.slice(0, 4).map(h => pulse(t, h + 0.25, 0.4)));
    ctx.font = `800 30px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#ffd23f'; ctx.strokeText(`SNOWBALL WIDTH · STEP ${Math.max(1, stepN)}`, 92, 392); ctx.fillText(`SNOWBALL WIDTH · STEP ${Math.max(1, stepN)}`, 92, 392);
    ctx.save(); ctx.translate(92, 476); ctx.scale(1 + bump * 0.12, 1 + bump * 0.12); ctx.font = `900 88px ${FONT}`; ctx.lineWidth = 10; ctx.strokeText(fmtLen(d), 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(fmtLen(d), 0, 0); ctx.restore();
    // NEXT threshold (turns into the passed one for a moment)
    let txt = '', colr = '#bfe3ff'; const recT = HS[3] + 2.5;
    if (t < recT) txt = 'NEXT: 3.2 m = RECORD SNOWBALL'; else if (t < recT + 0.9) { txt = 'PASSED: RECORD SNOWBALL'; colr = '#7dff9a'; }
    else { const justPassed = mi >= 0 && t < MT[mi] + 0.7; if (justPassed) { txt = 'PASSED: ' + MIL[mi][1]; colr = '#7dff9a'; } else if (mi + 1 < MIL.length) txt = 'NEXT: ' + MLAB[mi + 1]; }
    if (txt) { ctx.font = `800 32px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(txt, 94, 530); ctx.fillStyle = colr; ctx.fillText(txt, 94, 530); }
    ctx.restore(); }

  function hud(ctx, tt, st) { const W = 1080, Hh = 1920; const t = st.t;
    const title = (tt0) => drawTitleTimed(ctx, W, Hh, [{ text: 'WHAT IF YOUR SNOWBALL ROLLED', size: 70 }, { text: 'DOWNHILL AND NEVER STOPPED?', size: 74, accent: true }], tt0, '#ffd23f', { start: 0, wps: 1000, outAt: 2.45, y: 0.115 });
    if (st.teaser) { title(tt + 0.01); ctx.save(); ctx.font = `800 40px ${FONT}`; ctx.textAlign = 'center'; const txt = 'POV: you let go of your snowball'; const w = ctx.measureText(txt).width + 50; ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect((W - w) / 2, 560, w, 64); ctx.fillStyle = '#111'; ctx.fillText(txt, W / 2, 606); ctx.restore(); return; }
    title(tt);
    gauge(ctx, t, st.d ?? 0.08, st.mi ?? -1);
    for (const [a, b, txt] of CAP) topText(ctx, W, t, a, b, txt);
    // name tags (intro only)
    if (t < HS[1] && st.camera) { mit.updateMatrixWorld(true); MC.headPivot.getWorldPosition(tv2); const pm = proj([tv2.x, tv2.y + 0.3, tv2.z], st.camera); if (pm) drawTag(ctx, pm[0], pm[1] - 30, 'MITTENS', t - 0.6, { dur: HS[1] - 0.8 });
      P.headPivot.getWorldPosition(tv2); const pp = proj([tv2.x, tv2.y + 0.45, tv2.z], st.camera); if (pp) drawTag(ctx, pp[0], pp[1] - 30, 'YOU', t - (T1 - 0.2), { dur: HS[1] - T1 + 0.1, bg: '#7dd3ff' }); }
    // the record: label right next to the ball
    if (t > HS[3] + 1.8 && t < BP + 0.5) mileLabel(ctx, [ball.position.x, ball.position.y + ball.scale.x, 0], '3.2 m = RECORD SNOWBALL', 'Michigan Tech, 2013', cam, smooth(HS[3] + 1.8, HS[3] + 2.1, t) * (1 - smooth(BP + 0.2, BP + 0.5, t)));
    // milestones next to the object
    for (let i = 0; i < 6; i++) if (t < CUT && t > MT[i] - 0.9 && t < MT[i] + 1.3) mileLabel(ctx, msTop(i), MLAB[i], MS[i].sub, cam, smooth(MT[i] - 0.9, MT[i] - 0.6, t) * (1 - smooth(MT[i] + 1.0, MT[i] + 1.3, t)));
    if (t >= CUT) { if (t > MT[6] - 0.5 && t < MT[6] + 1.3) mileLabel(ctx, st.ballTop, MLAB[6], 'the top of the ball', camB, smooth(MT[6] - 0.5, MT[6] - 0.2, t) * (1 - smooth(MT[6] + 1.0, MT[6] + 1.3, t)));
      if (t > MT[7] - 0.9 && t < MT[7] + 1.3) mileLabel(ctx, st.issP, MLAB[7], 'the space station', camB, smooth(MT[7] - 0.9, MT[7] - 0.6, t) * (1 - smooth(MT[7] + 1.0, MT[7] + 1.3, t)));
      if (t > MT[8] - 0.9 && t < ASK - 0.2) mileLabel(ctx, st.moonP, MLAB[8], '(Moon moved closer)', camB, smooth(MT[8] - 0.9, MT[8] - 0.6, t) * (1 - smooth(ASK - 0.5, ASK - 0.2, t))); }
    // ending: the narrator asks over the last shot (no black card)
    if (t >= ASK - 0.05) { const a = smooth(ASK - 0.05, ASK + 0.3, t); ctx.save(); ctx.globalAlpha = a; topText(ctx, W, t, ASK - 0.05, 1e9, 'How big was the biggest snowball you ever made?', 50); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
