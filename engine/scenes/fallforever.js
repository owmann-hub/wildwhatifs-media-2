import { clamp, lerp, smooth, easeOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeEarth, softTex, setFace, life, drawTitleTimed, drawTag, drawBubble, RoundedBoxGeometry, stars, drawTeaser } from './lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 23 episode: "What if you tripped and your speed doubled every second?"  (Nov 20 STANDARD, NO-NARRATOR TEST: lines on screen only)
// HUMAN PART (~9 s): a cobbled Lisbon-style tram street (azulejo town houses, cafe, yellow tram). You run for your tram with a coffee,
//   Mittens (he) in your backpack. THE PIGEON walks into your path, you trip over him at 4.0 s - and never land: your speed doubles
//   every second (10 km/h x 2^n). THE FILMER at the cafe table films instead of helping. You race past Usain Bolt, a cheetah, your tram.
// BIG PART: clean shots of you flying (coffee in hand): over the river past a bullet train, sound barrier (vapour cone), Mach 5 (air glows),
//   then space: orbit speed, escape speed, Earth falling away, Parker Solar Probe, light pulses racing you. Light speed can't be passed,
//   so the counter adds nines; stars crowd ahead (aberration); you cross the Milky Way. Speed climbs until the last frame.
// Video time tt; trip at 4.0 s; 1 video second = 1 story second. First 1.2 s: ZOOM teaser on your face at the final moment (loops).
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const TEASER = 1.2, TOT = 43.4, TRIP = 4.0, CUT = 14.4, C_KMH = 1079252848.8;
// milestones: [video time, value text, name, sub]
const MIL = [[6.16, '44.7 KM/H', 'USAIN BOLT', 'fastest human ever'], [7.38, '104 KM/H', 'CHEETAH', 'fastest land animal'], [9.0, '320 KM/H', 'BULLET TRAIN', ''],
  [10.95, '1,235 KM/H', 'SOUND BARRIER', 'BOOM'], [13.27, 'MACH 5', 'AIR HITS 1,500 °C', '6,174 km/h'], [15.48, '28,500 KM/H', 'ORBIT SPEED', 'Earth curves away as fast as you fall'],
  [15.98, '40,300 KM/H', 'ESCAPE SPEED', "Earth can't pull you back"], [17.39, '107,000 KM/H', 'FASTER THAN EARTH', 'goes around the Sun'], [20.08, '692,000 KM/H', 'FASTEST SPACECRAFT', 'Parker Solar Probe'],
  [21.88, '2.4 MILLION KM/H', 'AROUND EARTH IN 1 MIN', ''], [24.04, '1%', 'OF LIGHT SPEED', '10.8 million km/h'], [25.14, '23 MILLION KM/H', 'MOON IN 1 MINUTE', 'not to scale'],
  [27.36, '10%', 'OF LIGHT SPEED', '108 million km/h'], [29.69, '50%', 'OF LIGHT SPEED', "can't double any more"], [31.3, '99%', '1 SEC = 7 SEC ON EARTH', 'time slows down'],
  [33.0, '99.99%', '1 MIN = 71 MIN ON EARTH', ''], [34.7, '99.9999%', '1 DAY = 2 YEARS ON EARTH', ''], [36.4, '99.999999995%', 'MILKY WAY IN 1 YEAR', 'your time'],
  [38.1, '99.999…%', 'MILKY WAY IN 5 MINUTES', 'your time - coffee still hot']];
const MT = MIL.map(m => m[0]);
const V0 = 10 / 3.6, LN2 = Math.LN2;
const nOf = (tt) => tt - TRIP;
function kmh(tt) { if (tt < TRIP) return 10; return 10 * Math.pow(2, Math.min(nOf(tt), 25.69)); }
// nines k = -log10(1 - v/c) after half light speed
const KT = [[29.69, 0.301], [31.3, 2], [33.0, 4], [34.7, 6], [36.4, 10.3], [38.1, 20.35], [TOT + 0.05, 26]];
function ninesK(tt) { if (tt <= KT[0][0]) return 0; for (let i = 0; i < KT.length - 1; i++) if (tt < KT[i + 1][0]) { const u = (tt - KT[i][0]) / (KT[i + 1][0] - KT[i][0]); return lerp(KT[i][1], KT[i + 1][1], u); } return 26; }
function beta(tt) { return tt > 29.69 ? 1 - Math.pow(10, -ninesK(tt)) : kmh(tt) / C_KMH; }
// distance travelled in metres (run at 10 km/h from 1.2 s, then the doubling)
const X4 = V0 * (TRIP - TEASER);
function xh(tt) { if (tt < TEASER) return 0; if (tt < TRIP) return V0 * (tt - TEASER); const n = Math.min(nOf(tt), 30); return X4 + V0 * (Math.pow(2, n) - 1) / LN2; }
export { TOT, MT, xh, kmh };

export async function create({ THREE, W, H }) {
  const R = rng(1123);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler(), tv = new THREE.Vector3(), col = new THREE.Color();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, s = null) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s ? sc.set(...s) : sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group, shadow = true) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = shadow; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function signTex(lines, bg, fg, w = 512, h = 128) { return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => { let fs = h * (lines.length > 1 ? 0.36 : 0.52); g.font = `900 ${fs}px ${FONT}`; const mw = g.measureText(t).width; if (mw > w * 0.86) { fs *= w * 0.86 / mw; g.font = `900 ${fs}px ${FONT}`; } g.fillText(t, w / 2, h * (lines.length > 1 ? 0.3 + i * 0.42 : 0.54)); }); }); }
  const signMat = (lines, bg, fg, w, h) => new THREE.MeshStandardMaterial({ map: signTex(lines, bg, fg, w, h), roughness: 0.6 });

  // =====================================================================================================
  // SCENE A (metres): tram street along +x, then the quay and the river. You fly along x at z = 0.5.
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 30000);
  const fogC = new THREE.Color(0xe8b98e); A.fog = new THREE.FogExp2(fogC.getHex(), 0.004);
  A.add(new THREE.HemisphereLight(0xbfd4f0, 0x7a6a58, 0.75));
  const sun = new THREE.DirectionalLight(0xffc27a, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  const SUND = new THREE.Vector3(0.75, 0.38, 0.55).normalize();
  const sky = makeSkyDome(THREE, 0x4f6fa0, 0xffc48a, [SUND.x, SUND.y, SUND.z]); A.add(sky);
  const street = new THREE.Group(); A.add(street);
  const cobTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7d7266'; g.fillRect(0, 0, w, h); const r = rng(3); for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { const c = 135 + r() * 55; g.fillStyle = `rgb(${c},${c * 0.92},${c * 0.82})`; g.beginPath(); g.roundRect(x + 1, y + 1, 14, 14, 5); g.fill(); } });
  cobTex.wrapS = cobTex.wrapT = THREE.RepeatWrapping; cobTex.repeat.set(80, 7);
  const SX0 = -40, SX1 = 112;
  { const road = new THREE.Mesh(new THREE.BoxGeometry(SX1 - SX0, 0.4, 7), new THREE.MeshStandardMaterial({ map: cobTex, roughness: 0.9 })); road.position.set((SX0 + SX1) / 2, -0.2, -1); road.receiveShadow = true; road.name = 'road'; street.add(road);
    const wT = cobTex.clone(); wT.repeat.set(60, 2); const walkM = new THREE.MeshStandardMaterial({ map: wT, color: 0xf0e6d6, roughness: 0.9 });
    for (const [z, d] of [[-5.75, 2.5], [3.75, 2.5]]) { const s = new THREE.Mesh(new THREE.BoxGeometry(SX1 - SX0, 0.55, d), walkM); s.position.set((SX0 + SX1) / 2, -0.125, z); s.receiveShadow = true; s.name = 'sidewalk'; street.add(s); }
    const B = Builder(); for (const z of [-3.6, -2.4]) B.add(BX(SX1 - SX0, 0.03, 0.08), M(0xb8bcc4, 0.3, 0.8), (SX0 + SX1) / 2, 0.015, z);
    // tram wires
    for (let x = SX0; x < SX1; x += 18) { B.add(new THREE.CylinderGeometry(0.06, 0.08, 6.2, 8), M(0x2a2e33, 0.5, 0.4), x, 3.1, -6.6); B.add(BX(0.06, 0.06, 4), M(0x2a2e33, 0.5, 0.4), x, 6.0, -4.8); }
    B.add(BX(SX1 - SX0, 0.02, 0.02), M(0x222222, 0.5), (SX0 + SX1) / 2, 5.6, -3.0);
    // quay edge + steps to the river
    B.add(BX(8, 0.6, 16), M(0xcfc2aa, 0.85), SX1 + 4, -0.3, -1); B.add(BX(0.4, 0.9, 16), M(0xb8aa92, 0.85), SX1 + 8, 0.15, -1);
    B.build(street); }
  // azulejo town houses on the far side (z = -7), all different
  const tileTex = (base, ink, k) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 3; const s = 32;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.strokeRect(x + 1, y + 1, s - 2, s - 2); g.beginPath(); if (k % 3 === 0) { g.arc(x + s / 2, y + s / 2, 8, 0, 7); g.stroke(); } else if (k % 3 === 1) { g.moveTo(x + s / 2, y + 4); g.lineTo(x + s - 4, y + s / 2); g.lineTo(x + s / 2, y + s - 4); g.lineTo(x + 4, y + s / 2); g.closePath(); g.fill(); } else { g.arc(x, y, 9, 0, 7); g.arc(x + s, y + s, 9, 0, 7); g.fill(); } } });
  const walls = [['#2f62a8', '#e8eef8', 0], ['#f3e6c8', '#2a6aa8', 1], ['#e9a08a', '#ffffff', 2], ['#f6efe2', '#1f8a6c', 0], ['#ffd27a', '#a84a2a', 1], ['#9cc9b0', '#ffffff', 2], ['#f2b8b0', '#2a4a8a', 0], ['#d0e4f4', '#2f62a8', 2]];
  const wallMats = walls.map(([b, i, k]) => { const t = tileTex(b, i, k); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 5); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); });
  const shops = [['PASTELARIA LUA', '#ffd23f', '#5a2a10'], ['CAFÉ AZUL', '#1f3d5a', '#ffe9a8'], ['LIVRARIA', '#6b3e1e', '#ffffff'], ['FLORES', '#e63946', '#ffffff'], ['SARDINHA', '#2a6a8a', '#ffffff'], ['GELADOS', '#ff7fb4', '#ffffff'], ['FARMÁCIA', '#1f8a4c', '#ffffff']];
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a4c, roughness: 0.15, metalness: 0.5 }), litM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.3, emissive: 0xffb860, emissiveIntensity: 1.1 });
  const trimM = M(0xf6efe2, 0.7), ironM = M(0x2a2e33, 0.5, 0.4);
  { let x = SX0 + 2, k = 0; const B = Builder(); while (x < SX1 - 4) { const w = 6 + R() * 3, floors = 3 + (k % 3 === 1 ? 1 : 0), FH = 3.1, Hh = 3.8 + (floors - 1) * FH, dpt = 8, cx = x + w / 2, z = -7;
      B.add(BX(w, Hh, dpt), wallMats[(k * 3) % wallMats.length], cx, Hh / 2, z - dpt / 2); B.add(BX(w + 0.3, 0.3, 0.5), trimM, cx, Hh, z - 0.1); B.add(BX(w + 0.1, 0.18, 0.3), trimM, cx, 3.8, z);
      const shM = M([0x2f7d6a, 0x9a3b2f, 0x1d3f6e, 0x3a6ea5, 0x7a5a2e][k % 5], 0.6); const nW = Math.max(2, Math.round(w / 2.4)), sp = w / nW;
      for (let f = 1; f < floors; f++) { const y = 3.8 + (f - 1) * FH + 1.5; for (let i = 0; i < nW; i++) { const wx = cx - w / 2 + sp * (i + 0.5); const lit = R() < 0.4;
          B.add(BX(1.0, 1.7, 0.06), trimM, wx, y, z + 0.03); B.add(BX(0.8, 1.5, 0.05), lit ? litM : glassM, wx, y, z + 0.07);
          B.add(RB(0.36, 1.55, 0.06, 0.02), shM, wx - 0.6, y, z + 0.06); B.add(RB(0.36, 1.55, 0.06, 0.02), shM, wx + 0.6, y, z + 0.06);
          if ((i + k + f) % 2 === 0) { B.add(BX(1.3, 0.1, 0.6), M(0xd8cfc0, 0.8), wx, y - 0.9, z + 0.3); B.add(BX(1.3, 0.5, 0.04), ironM, wx, y - 0.6, z + 0.58); } } }
      B.add(BX(w * 0.78, 2.5, 0.05), litM, cx, 1.45, z + 0.03); B.add(BX(w * 0.84, 0.12, 1.2), M([0xe63946, 0x2a6a5a, 0xffd23f, 0x3a7bd5][k % 4], 0.7), cx, 3.15, z + 0.6, 0.25, 0, 0);
      const rh = 2.4; for (const s2 of [-1, 1]) B.add(BX(w + 0.4, 0.22, Math.hypot(dpt / 2 + 0.3, rh)), M([0xb0553a, 0x8a3a2a, 0xa8603a][k % 3], 0.8), cx, Hh + rh / 2, z - dpt / 2 + s2 * (dpt / 4 + 0.15), -s2 * Math.atan2(rh, dpt / 2 + 0.3), 0, 0);
      const s = shops[k % shops.length]; const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, 0.6), signMat([s[0]], s[1], s[2], 512, 100)); sg.position.set(cx, 3.5, z + 0.09); street.add(sg);
      x += w + 0.08; k++; }
    B.build(street); }
  // cafe tables, lamps, trees on the far sidewalk
  { const B = Builder(); for (const x of [10.5, 14.5, 46, 50]) { B.add(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), M(0xf2f2f2, 0.4), x, 0.75, -5.4); B.add(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), ironM, x, 0.37, -5.4);
      B.add(new THREE.ConeGeometry(1.3, 0.45, 12), M([0xe63946, 0x1f8a6c][x > 40 ? 1 : 0], 0.7), x, 2.45, -5.4); B.add(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), ironM, x, 1.2, -5.4);
      for (const dx of [-0.65, 0.65]) { B.add(RB(0.42, 0.06, 0.42, 0.02), M(0x3a6ea5, 0.6), x + dx, 0.45, -5.4); B.add(BX(0.42, 0.5, 0.05), M(0x3a6ea5, 0.6), x + dx * 1.4, 0.7, -5.4, 0, Math.PI / 2, 0); } }
    for (let x = -26; x < SX1; x += 13) { B.add(new THREE.CylinderGeometry(0.07, 0.11, 4.2, 10), ironM, x + 4, 2.1, -4.7); B.add(RB(0.34, 0.5, 0.34, 0.06), ironM, x + 4, 4.35, -4.7); }
    for (let x = -18; x < SX1; x += 22) { B.add(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 8), M(0x6a4a30, 0.9), x, 1.1, -4.8); B.add(new THREE.IcosahedronGeometry(1.3, 1), M(0x4f8a3a, 0.9), x, 3.0, -4.8, 0, 0, 0, [1, 0.9, 1]); B.add(new THREE.IcosahedronGeometry(0.9, 1), M(0x5f9a44, 0.9), x + 0.6, 3.6, -4.6); }
    B.build(street);
    for (let x = -26; x < SX1; x += 13) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a0, toneMapped: false })); b.position.set(x + 4, 4.3, -4.7); street.add(b); } }
  // the yellow tram (leaving the stop at 2 s, 4 m/s)
  const tram = new THREE.Group(); { const B = Builder(); const y = M(0xffc21a, 0.4), wh = M(0xf6efe2, 0.5);
    B.add(RB(9, 2.3, 2.3, 0.35), y, 0, 1.55, 0); B.add(RB(9.05, 0.5, 2.35, 0.2), wh, 0, 0.55, 0); B.add(RB(8.4, 0.25, 2.1, 0.1), wh, 0, 2.8, 0);
    for (let i = 0; i < 6; i++) B.add(BX(1.1, 0.9, 2.36), glassM, -3.6 + i * 1.45, 1.95, 0); B.add(BX(0.05, 1.4, 0.05), ironM, 0, 3.6, 0, 0.5, 0, 0);
    for (const x of [-3, 3]) for (const z of [-0.9, 0.9]) B.add(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 14).rotateX(Math.PI / 2), M(0x222222, 0.6), x, 0.35, z);
    B.build(tram); const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.45), signMat(['28  BAIXA'], '#111111', '#ffd23f', 512, 104)); sg.position.set(0, 2.55, 1.17); tram.add(sg); tram.position.z = -3.0; A.add(tram); }
  // river, far shore, the rail bridge (bullet train)
  const waveTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#3f7f9a'; g.fillRect(0, 0, w, h); const r = rng(5); for (let k = 0; k < 900; k++) { const x = r() * w, y = r() * h, l = 10 + r() * 40; g.strokeStyle = r() < 0.5 ? 'rgba(220,240,255,0.4)' : 'rgba(20,60,80,0.35)'; g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); } });
  waveTex.wrapS = waveTex.wrapT = THREE.RepeatWrapping; waveTex.repeat.set(400, 400);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ map: waveTex, roughness: 0.15, metalness: 0.3, color: 0xbfe0ee })); water.rotation.x = -Math.PI / 2; water.position.y = -1.2; water.receiveShadow = true; water.name = 'water'; A.add(water);
  const shore = new THREE.Group(); { const B = Builder(); for (let i = 0; i < 40; i++) { const h = 30 + R() * 90, w = 120 + R() * 200; B.add(new THREE.ConeGeometry(w, h, 7), M([0x7a8a6a, 0x8a8a70, 0x9a8a72][i % 3], 1), -2000 + i * 160 + R() * 60, h / 2 - 2, -900 - R() * 200); }
    for (let i = 0; i < 60; i++) { const h = 8 + R() * 14; B.add(BX(10 + R() * 14, h, 10), M([0xf1d9a8, 0xe9a08a, 0xf6efe2][i % 3], 0.9), -1500 + i * 55, h / 2 - 1, -780 - R() * 40); } B.build(shore, false); A.add(shore); }
  const bridge = new THREE.Group(); { const B = Builder(); const st = M(0xc8442a, 0.6, 0.3); B.add(BX(4000, 1.2, 6), st, 2000 + SX1, 7.4, 0); B.add(BX(4000, 0.3, 0.3), st, 2000 + SX1, 9.2, 3); B.add(BX(4000, 0.3, 0.3), st, 2000 + SX1, 9.2, -3);
    for (let x = SX1 + 20; x < SX1 + 4000; x += 60) B.add(BX(2.5, 9, 5), M(0xb8aa92, 0.8), x, 2.6, 0); B.build(bridge, false); bridge.position.set(0, -4, -40); A.add(bridge); }
  const train = new THREE.Group(); { const B = Builder(); const wm = M(0xf4f6f8, 0.3, 0.2), bl = M(0x1f5fb0, 0.4);
    for (let i = 0; i < 3; i++) { B.add(RB(24, 3.2, 3.2, 0.9), wm, -i * 25, 0, 0); B.add(BX(23, 0.35, 3.25), bl, -i * 25, -0.6, 0); B.add(BX(20, 0.7, 3.26), glassM, -i * 25, 0.6, 0); }
    B.add(new THREE.SphereGeometry(1.6, 20, 14), wm, 12, 0, 0, 0, 0, 0, [5, 1, 1]); B.build(train, false); train.position.set(0, 5.6, -40); A.add(train); }

  // ---------------- characters ----------------
  const P = makePerson(THREE, { shirt: 0xf2994a, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0x3a2a1e, seed: 5, hairStyle: 'short' }); P.group.rotation.order = 'YXZ';
  const hero = new THREE.Group(); hero.add(P.group); A.add(hero);   // hero group is moved between scenes A and B
  // backpack + Mittens peeking out over your left shoulder (camera side)
  const pack = new THREE.Mesh(RB(0.4, 0.46, 0.22, 0.07), M(0x2a6a5a, 0.7)); pack.position.set(0, 1.18, -0.24); P.group.add(pack);
  const mit = makeCat(THREE, 0xf0a040); mit.position.set(-0.1, 1.02, -0.3); mit.scale.setScalar(0.85); mit.rotation.order = 'XYZ'; P.group.add(mit); const MC = mit.userData.cat;
  // the coffee (in your left hand, camera side): cup + sleeve + lid, kept upright; steam
  const cup = new THREE.Group(); { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.14, 18), M(0xffffff, 0.4)); cup.add(c); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.05, 0.06, 18), M(0x9a6a3a, 0.8)); cup.add(s); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.058, 0.025, 18), M(0x3a2a1e, 0.5)); l.position.y = 0.08; cup.add(l); cup.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
  A.add(cup);
  const steamM = new THREE.SpriteMaterial({ map: softTex(THREE, 64), color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }); const STEAM = []; for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(steamM.clone()); A.add(s); STEAM.push(s); }
  // THE PIGEON: walks into your path, you trip over him, he watches you go
  function makePigeon() { const pg = new THREE.Group(); const gm = M(0x8d94a0, 0.6), nk = new THREE.MeshStandardMaterial({ color: 0x5f8a7a, roughness: 0.4, metalness: 0.3 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), gm); b.scale.set(0.85, 0.8, 1.25); b.position.y = 0.12; pg.add(b);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.02, 0.12, 2, 0.01), M(0x4a4f58, 0.6)); tl.position.set(0, 0.12, -0.15); tl.rotation.x = 0.4; pg.add(tl);
    const hp = new THREE.Group(); hp.position.set(0, 0.2, 0.08); pg.add(hp); const h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), nk); h.position.set(0, 0.04, 0.03); hp.add(h);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 8).rotateX(Math.PI / 2), M(0xd9a05a, 0.5)); bk.position.set(0, 0.035, 0.1); hp.add(bk);
    for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M(0xff7a1a, 0.3)); ey.position.set(sx * 0.04, 0.06, 0.06); hp.add(ey); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M(0x111111, 0.3)); pu.position.set(sx * 0.047, 0.062, 0.07); hp.add(pu);
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), M(0xe06a6a, 0.6)); lg.position.set(sx * 0.03, 0.03, 0.02); pg.add(lg); }
    pg.userData.head = hp; pg.traverse(o => { if (o.isMesh) o.castShadow = true; }); return pg; }
  const pigeon = makePigeon(); pigeon.scale.setScalar(1.6); A.add(pigeon);
  // THE FILMER: at the cafe table, phone up, films instead of helping
  const fil = makePerson(THREE, { shirt: 0x8e5bb5, pants: 0x2b2f3a, hair: 0xd8b060, skin: 0xd8a47e, shoe: 0x222222, seed: 23, hairStyle: 'long' }); fil.group.rotation.order = 'YXZ'; street.add(fil.group);
  const phone = new THREE.Mesh(RB(0.08, 0.15, 0.012, 0.008), [M(0x111111, 0.3, 0.2)][0]); street.add(phone); const phoneScr = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.13), new THREE.MeshBasicMaterial({ color: 0x9fd8ff })); phone.add(phoneScr); phoneScr.position.z = -0.008; phoneScr.rotation.y = Math.PI;
  // racers: Usain Bolt, a cheetah
  const bolt = makePerson(THREE, { shirt: 0xffd23f, pants: 0x1f8a4c, hair: 0x111111, skin: 0x6a4028, shoe: 0xffd23f, seed: 31, hairStyle: 'bald' }); bolt.group.rotation.order = 'YXZ'; A.add(bolt.group);
  const chee = makeCat(THREE, 0xe8b04a); chee.scale.setScalar(3.0); A.add(chee); const CC = chee.userData.cat;
  { const spotM = M(0x3a2a1a, 0.8); for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), spotM); s.position.set((R() - 0.5) * 0.24, 0.22 + (R() - 0.3) * 0.2, (R() - 0.5) * 0.42); s.position.x = Math.sign(s.position.x || 1) * 0.128; s.scale.set(0.3, 1, 1); CC.body.parent.add(s); } }
  // sound barrier: vapour cone + ring; Mach 5: hot glow at your front
  const vcone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 1, side: THREE.DoubleSide, depthWrite: false })); vcone.rotation.z = -Math.PI / 2; A.add(vcone);
  const ringM = new THREE.MeshBasicMaterial({ map: softTex(THREE, 128), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }); const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), ringM); ring.rotation.y = Math.PI / 2; A.add(ring);
  const glowM = new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xff8a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }); const glow = new THREE.Sprite(glowM); A.add(glow);

  // =====================================================================================================
  // SCENE B: space. You stay near the origin flying +x; Earth (km units, radius 6371) falls away behind-below.
  // =====================================================================================================
  const B2 = new THREE.Scene(); B2.background = new THREE.Color(0x03061a); const camB = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e6);
  B2.add(new THREE.HemisphereLight(0xbfd4ff, 0x30304a, 0.7)); const sunB = new THREE.DirectionalLight(0xffe2b8, 3.0); sunB.position.set(0.7, 0.4, 0.6); B2.add(sunB, sunB.target);
  const earth = makeEarth(THREE, 6371, 9); B2.add(earth);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xffe9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sunSpr.scale.setScalar(80000); sunSpr.position.set(-6e5, 3e5, -9e5); B2.add(sunSpr);
  // star streaks (aberration: they crowd ahead as you near light speed)
  const NS = 2600; const SD = []; { const r = rng(17); for (let i = 0; i < NS; i++) { const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); SD.push([u, s * Math.cos(th), s * Math.sin(th), 0.4 + r() * 0.6]); } }
  const starPos = new Float32Array(NS * 6), starCol = new Float32Array(NS * 6); const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const starL = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, fog: false })); starL.frustumCulled = false; B2.add(starL);
  const starP = new THREE.Points(sg, new THREE.PointsMaterial({ vertexColors: true, size: 2.4 * (window.RES || 1), sizeAttenuation: false })); starP.frustumCulled = false; B2.add(starP);
  // Parker Solar Probe (heat shield + body + panels)
  const parker = new THREE.Group(); { const Bp = Builder(); Bp.add(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 24).rotateZ(Math.PI / 2), M(0xf2f2f2, 0.6), 0.6, 0, 0); Bp.add(BX(0.9, 0.7, 0.7), M(0xd8a030, 0.4, 0.6), 0, 0, 0); Bp.add(BX(0.05, 0.4, 1.8), M(0x2a3a7a, 0.3, 0.5), -0.1, 0, 0); Bp.add(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6).rotateZ(Math.PI / 2), M(0xaaaaaa, 0.4, 0.6), -0.8, 0.2, 0); Bp.build(parker, false); B2.add(parker); }
  // light pulse racing you
  const lightM = new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xcfe8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); const lightS = new THREE.Sprite(lightM); B2.add(lightS); const lightCore = new THREE.Sprite(lightM.clone()); lightCore.material.color.set(0xffffff); B2.add(lightCore);
  // the Moon (racing past, not to scale)
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 40, 28), new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#bdb8ae'; g.fillRect(0, 0, w, h); const r = rng(4); for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(80,76,70,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 10, 0, 7); g.fill(); } }), roughness: 0.95 })); B2.add(moon);
  // the Milky Way (spiral sprite disc you fly across)
  const galTex = canvasTex(2048, 2048, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); const r = rng(77); const cx = w / 2, cy = h / 2;
    const cg = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.14); cg.addColorStop(0, 'rgba(255,250,240,0.9)'); cg.addColorStop(0.3, 'rgba(220,210,255,0.35)'); cg.addColorStop(1, 'rgba(160,170,255,0)'); g.fillStyle = cg; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 40000; k++) { const arm = k % 2, tt = r() ** 0.8 * 3.2, a = tt * 2.1 + arm * Math.PI + (r() - 0.5) * 0.5, rr = (0.05 + tt * 0.14) * w * 0.98 * (0.92 + r() * 0.16);
      const x = cx + Math.cos(a) * rr * 0.5, y = cy + Math.sin(a) * rr * 0.5; const s = 0.5 + r() * 1.3; g.fillStyle = r() < 0.2 ? `rgba(255,150,200,${0.25 + r() * 0.3})` : `rgba(${190 + r() * 60},${210 + r() * 40},255,${0.25 + r() * 0.4})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } });
  const galaxy = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: galTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); galaxy.rotation.x = -Math.PI / 2 + 0.25; B2.add(galaxy);

  await document.fonts.ready;

  const milIdx = (tt) => { let k = -1; for (let i = 0; i < MT.length; i++) if (tt >= MT[i] - 0.05) k = i; return k; };
  // poses
  function runPose(Q, t, amp = 0.85) { const s = Math.sin(t * 13); Q.legL.rotation.set(s * amp, 0, 0); Q.legR.rotation.set(-s * amp, 0, 0); Q.armR.rotation.set(-s * amp * 0.9, 0, 0.1); Q.armL.rotation.set(-1.25, 0, -0.15); Q.torso.rotation.set(0.12, 0, 0); }
  function flyPose(Q, t, k = 1) { Q.legL.rotation.set(0.06 * Math.sin(t * 9), 0, 0.06); Q.legR.rotation.set(-0.06 * Math.sin(t * 9), 0, -0.06); Q.armR.rotation.set(lerp(-1.2, -3.0, k), 0, 0.15); Q.armL.rotation.set(lerp(-1.25, -2.55, k), 0, -0.2); Q.torso.rotation.set(0, 0, 0); }
  function sitPose(Q) { Q.legL.rotation.set(-1.45, 0, -0.08); Q.legR.rotation.set(-1.45, 0, 0.08); Q.armL.rotation.set(-0.6, 0, -0.2); Q.armR.rotation.set(-0.6, 0, 0.2); Q.torso.rotation.set(0, 0, 0); }
  const MOODS = ['shock', 'scared', 'annoyed', 'shock', 'annoyed', 'unimpressed', 'shock', 'unimpressed', 'annoyed', 'unimpressed', 'shock', 'annoyed', 'unimpressed', 'shock', 'smug', 'sleepy', 'unimpressed', 'sleepy', 'sleepy'];
  const altA = (tt) => tt < TRIP ? 0 : lerp(0, 0.75, smooth(TRIP, TRIP + 0.45, tt)) + 3.2 * smooth(8.6, 10.5, tt) + 7 * smooth(11.5, 14.4, tt);
  // racers: [object, milestone index, speed m/s, side offset z, ahead offset]
  function racerX(tt, i, vms, ahead = 0.6) { const tm = MT[i]; return xh(tm) + vms * (tt - tm) + ahead; }

  function update(tt0) {
    const teaser = tt0 < TEASER; const tt = teaser ? TOT - 0.04 : tt0;
    const out = { tt, tt0, teaser, tk: tt0 / TEASER, bloom: 0.25, bloomThreshold: 0.9, env: 0.35, exposure: 1.0, sat: 1.25, contrast: 1.05, voff: 0 };
    const mi = milIdx(tt); out.mi = mi; out.kmh = kmh(tt); out.beta = beta(tt); out.k9 = ninesK(tt);
    const mood = mi >= 0 ? MOODS[mi] : (tt > TRIP ? 'shock' : 'annoyed');
    const x = xh(tt), fly = smooth(TRIP, TRIP + 0.45, tt), alt = altA(tt);
    // ---------------- you ----------------
    const G = P.group; G.position.set(0, 0, 0);
    if (tt < TRIP) { runPose(P, tt); G.rotation.set(0, Math.PI / 2, 0); G.position.y = Math.abs(Math.sin(tt * 13)) * 0.06; }
    else { flyPose(P, tt, fly); G.rotation.set(lerp(0.12, Math.PI / 2 - 0.12, fly), Math.PI / 2, 0); G.position.y = 0.2 * fly + 0.04 * Math.sin(tt * 3); }
    let face, head = [0, 0, 0];
    if (tt < 2.6) { face = { brows: 'worried', eyes: 1.1, mouth: 'grit', look: [0.6, 0] }; head = [0, 0.1, 0]; }
    else if (tt < 3.7) { face = { brows: 'up', eyes: 1.1, mouth: 'open', open: 0.9, look: [0.8, 0] }; head = [0, 0.2, 0]; }
    else if (tt < TRIP + 0.6) { face = { brows: 'up', eyes: 1.5, mouth: 'o', look: [0, -0.8] }; head = [0.4, 0, 0]; }
    else if (tt < 31.3) { const k = mi % 3; face = [{ brows: 'up', eyes: 1.45, mouth: 'open', open: 1.3, look: [0.6, 0.3] }, { brows: 'worried', eyes: 1.2, mouth: 'grit', look: [0.4, 0.2] }, { brows: 'up', eyes: 1.3, mouth: 'o', look: [0.7, 0.4] }][(k + 3) % 3]; }
    else face = { brows: tt > 38 ? 'neutral' : 'up', eyes: tt > 38 ? 1.0 : 1.2, mouth: tt > 38 ? 'smile' : 'o', look: [0.6, 0.3] };
    if (tt >= TRIP) head = [-1.38 * fly + 0.05 * Math.sin(tt * 2), 0.25 * fly, 0];
    P.headPivot.rotation.set(...head); setFace(P, face); life(P, tt, 0.7);
    // Mittens in the backpack
    { let m = 'annoyed'; if (tt > 3.3 && tt < TRIP) m = 'unimpressed'; if (tt >= TRIP) m = mood; if (tt >= TRIP && tt < TRIP + 0.8) m = 'shock';
      MC.headPivot.rotation.set(0, 0.35 * Math.sin(tt * 0.9) + (m === 'unimpressed' ? 0.45 : 0.15), 0); MC.legs.forEach((l, i) => { l.rotation.x = i % 2 ? 0.6 : -0.6; });
      setCatFace(mit, m, 0.25); catLife(mit, tt, 1); out.catMood = m; mit.rotation.set(-G.rotation.x, 0, 0); mit.position.set(lerp(-0.36, -0.1, fly), lerp(1.2, 1.12, fly), lerp(-0.28, -0.33, fly)); if (tt < TRIP) MC.headPivot.rotation.y = -0.75 + 0.2 * Math.sin(tt * 1.3); MC.tail.rotation.x -= 0.6 * fly;
      // wind flattens the ears once you fly fast
      const wind = smooth(6, 9, tt) * (tt < 38 ? 1 : 0.4); MC.ears.forEach(ea => { ea.rotation.x -= 0.9 * wind; }); }
    hero.updateMatrixWorld(true);
    let scene = A, camera = cam;
    if (tt < CUT) {
      // ---------------- scene A ----------------
      if (hero.parent !== A) A.add(hero); hero.position.set(x, alt, 0.5);
      street.visible = x < SX1 + 400; tram.visible = x < 400; shore.position.x = x * 0.9;   // far shore drifts slowly (it is very far away)
      water.position.set(x, -1.2, 0); waveTex.offset.set((x / 20) % 1, 0);
      { const tx = 0.5 + 4.2 * Math.max(0, tt - 1.2); tram.position.set(tx, 0, -3.0); }
      // the Pigeon walks into your path (x = X4 + 0.4)
      { const px = X4 + 0.45, wk = smooth(2.6, 3.9, tt); pigeon.position.set(px, 0, lerp(-1.6, 0.45, wk)); pigeon.rotation.set(0, wk < 1 ? 0.1 : lerp(0, -2.2, smooth(4.1, 4.8, tt)), 0); const hp = pigeon.userData.head; hp.rotation.y = 0.4 * Math.sin(Math.floor(tt * 1.6) * 2.1); hp.position.z = 0.08 + 0.02 * Math.sin(tt * 9) * (wk < 1 ? 1 : 0); pigeon.visible = tt < 12; }
      // the Filmer at the cafe table films you
      { const F = fil.group; F.position.set(12.4, 0, -5.45); F.rotation.set(0, 0.4 + 0.9 * smooth(4.2, 5.4, tt), 0); sitPose(fil); fil.armL.rotation.set(-1.7, 0, -0.35); fil.armR.rotation.set(-1.7, 0, 0.35); setFace(fil, { brows: tt > 4.4 ? 'up' : 'neutral', eyes: tt > 4.4 ? 1.3 : 1, mouth: tt > 4.4 ? 'open' : 'smile', look: [0, 0] }); life(fil, tt, 0.6);
        F.updateMatrixWorld(true); fil.armL.userData.end.getWorldPosition(tv); const a = tv.clone(); fil.armR.userData.end.getWorldPosition(tv); street.worldToLocal(a.add(tv).multiplyScalar(0.5)); phone.position.copy(a).add(v.set(0, 0.08, 0)); phone.rotation.set(0, F.rotation.y, 0); }
      // Usain Bolt (12.42 m/s) and the cheetah (29 m/s) race you, then fall behind
      { const bx = racerX(tt, 0, 12.42, 0.4), on = tt > 5.0 && tt < 7.3; bolt.group.visible = on && !teaser; bolt.group.position.set(bx, 0, -1.0); bolt.group.rotation.set(0.15, Math.PI / 2, 0); runPose(bolt, tt * 1.15, 1.0); bolt.armL.rotation.set(Math.sin(tt * 15) * 0.9, 0, -0.1); setFace(bolt, { brows: 'up', eyes: 1.2, mouth: 'o', look: [-0.8, 0] }); bolt.headPivot.rotation.set(0, -0.5, 0); life(bolt, tt, 0.5); }
      { const cx = racerX(tt, 1, 29, 0.2), on = tt > 6.4 && tt < 8.4; chee.visible = on && !teaser; chee.position.set(cx, 0, -2.4); chee.rotation.set(0, Math.PI / 2, 0); const s = Math.sin(tt * 16); CC.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? 1 : -1) * s * 0.9; }); setCatFace(chee, 'shock', 0.3); catLife(chee, tt, 1); CC.headPivot.rotation.y = -0.5; }
      // bullet train (88.9 m/s) on the bridge
      { const trx = racerX(tt, 2, 88.9, 8); train.visible = tt > 8.0 && tt < 10.4; bridge.visible = tt < 10.6; train.position.x = trx; }
      // sound barrier + Mach 5
      { const sb = smooth(MT[3] - 0.15, MT[3], tt) * (1 - smooth(MT[3] + 0.7, MT[3] + 1.6, tt)); vcone.visible = sb > 0.01; vcone.material.opacity = 0.32 * sb; vcone.position.set(x + 1.15, alt + 0.3, 0.5); vcone.scale.set(1 + 0.05 * Math.sin(tt * 40), 1, 1);
        const ra = clamp((tt - MT[3]) / 1.2); ring.visible = ra > 0 && ra < 1; ring.position.set(x + 1.2 - ra * 6, alt + 0.3, 0.5); ring.scale.setScalar(1 + ra * 30); ringM.opacity = 0.7 * (1 - ra);
        const hot = smooth(MT[4] - 0.4, MT[4] + 0.3, tt); glow.visible = hot > 0.01; glow.position.set(x + 2.0, alt + 0.3, 0.5); glow.scale.setScalar(1.8 + 0.2 * Math.sin(tt * 30)); glowM.opacity = 0.75 * hot; }
      // camera: beside-and-ahead, looking back at you; a little further out as you speed up
      const run = 1 - fly; const dist = lerp(1, 1.1, smooth(9, 14, tt)); const fk = smooth(TRIP, TRIP + 0.8, tt);
      const tgt = [x + lerp(-0.45, 0.85, fk), alt + lerp(1.0, 0.3, fk), lerp(0.45, 0.45, fk)];
      const off = [lerp(2.1, 2.3, fk) * dist, lerp(0.35, 0.25, fk) * dist + 0.04 * Math.sin(tt * 1.3), lerp(3.9, 4.3, fk) * dist];
      cam.position.set(tgt[0] + off[0], tgt[1] + off[1], tgt[2] + off[2]); cam.lookAt(tgt[0], tgt[1] - 0.15, tgt[2]); out.lookT = [tgt[0], tgt[1] - 0.15, tgt[2]]; cam.fov = 50; cam.near = 0.05; cam.updateProjectionMatrix();
      out.dof = 0.06; out.focusY = 0.52; out.focusH = 0.26; out.interior = false;
      sun.target.position.set(x, 0, 0); sun.position.copy(SUND).multiplyScalar(60).add(sun.target.position); { const c = sun.shadow.camera; c.left = -20; c.right = 20; c.top = 20; c.bottom = -20; c.near = 5; c.far = 150; c.updateProjectionMatrix(); }
      A.fog.density = lerp(0.004, 0.0009, smooth(9, 11, tt));
      out.shake = 0.35 * pulse(tt, MT[3], 0.5) + 0.12 * pulse(tt, TRIP, 0.3);
    } else {
      // ---------------- scene B: space ----------------
      scene = B2; camera = camB; out.space = true; out.dof = 0; out.bloom = 0.35; out.bloomThreshold = 0.8; out.vignette = 0.4; out.env = 0.5;
      if (hero.parent !== B2) B2.add(hero); hero.position.set(0, 0, 0); hero.updateMatrixWorld(true);
      // distance from Earth: low orbit (350 km) until escape, then the real distance travelled
      const esc = MT[6]; const dkm = tt < esc ? 2600 : 2600 + (xh(tt) - xh(esc)) / 1000;
      const dirE = new THREE.Vector3(-0.42, -0.78, -0.46).normalize(); earth.position.copy(dirE).multiplyScalar(6371 + dkm); earth.rotation.set(0.3, -tt * (tt < esc ? 0.05 : 0.02), 0.2); earth.visible = dkm < 3e7;
      // stars: aberration + streaks
      const b = Math.min(out.beta, 0.55), sp = Math.log10(Math.max(10, out.kmh)) / 9, str = clamp((sp - 0.45) * 1.5) + 0.6 * smooth(29.7, 34, tt);
      for (let i = 0; i < NS; i++) { const [cx0, cy0, cz0, br] = SD[i]; const ct = (cx0 + b) / (1 + b * cx0); const st = Math.sqrt(Math.max(0, 1 - ct * ct)); const sn = Math.hypot(cy0, cz0) || 1; const dx = ct, dy = cy0 / sn * st, dz = cz0 / sn * st; const Rr = 4000;
        const L = 30 + 900 * str * (0.4 + 0.6 * st); const dop = Math.sqrt((1 + b) / (1 - b)) ** (ct); const hue = clamp(0.62 - 0.12 * Math.log10(dop) * 0.4, 0.45, 0.75);
        col.setHSL(b > 0.3 ? (ct > 0 ? 0.6 : 0.02) : 0.6, b > 0.3 ? 0.7 : 0.15, clamp(0.45 + 0.4 * br + (b > 0.3 ? 0.15 * ct : 0), 0.2, 0.95));
        starPos.set([dx * Rr, dy * Rr, dz * Rr, dx * Rr - L, dy * Rr, dz * Rr], i * 6); starCol.set([col.r, col.g, col.b, col.r * 0.1, col.g * 0.1, col.b * 0.1], i * 6); }
      sg.attributes.position.needsUpdate = true; sg.attributes.color.needsUpdate = true;
      // Parker Solar Probe races you
      { const tm = MT[8]; const rel = 0.6 - 3.2 * (tt - tm); parker.visible = tt > tm - 1.0 && tt < tm + 1.2; parker.position.set(rel, -0.2, -1.6); parker.rotation.set(tt * 0.3, 0, 0); }
      // light pulses: 1%, 10%, 50% (zoom past), then just ahead of you forever
      { let lx = 1e6; for (const [i, bb] of [[10, 0.01], [12, 0.1], [13, 0.5]]) { const tm = MT[i]; if (tt > tm - 0.5 && tt < tm + 1.6) lx = -8 + 60 * (1 - bb) * (tt - tm + 0.4); }
        if (tt >= 30.6) lx = lerp(-8 + 60 * 0.5 * (30.6 - MT[13] + 0.4), 2.4, smooth(30.6, 31.6, tt)) + 0.03 * (tt - 31.6);
        lightS.visible = lightCore.visible = lx < 200; lightS.position.set(lx + 0.8, 0.9, -0.8); lightCore.position.copy(lightS.position); lightS.scale.set(4.5, 1.1, 1); lightCore.scale.set(1.4, 0.45, 1); out.lightX = lx; }
      // the Moon whizzes past (not to scale)
      { const tm = MT[11]; const mx = 5 - 9 * (tt - tm + 0.5); moon.visible = tt > tm - 0.7 && tt < tm + 0.9; moon.position.set(mx, -3.2, -4); moon.scale.setScalar(0.55); moon.rotation.y = tt; }
      // the Milky Way: you fly across it
      { const g0 = 34.6; const gx = lerp(900, -500, smooth(g0, TOT + 2.2, tt) ** 1.0); galaxy.visible = tt > g0; galaxy.position.set(gx * 3, -260, -900); galaxy.scale.setScalar(4200); galaxy.material.opacity = smooth(g0, g0 + 1.2, tt); galaxy.rotation.z = tt * 0.01; }
      // camera: beside-and-ahead of you; pulls out a bit and drifts in space
      const pull = smooth(CUT, CUT + 1.2, tt); const orb = 0.25 * Math.sin(tt * 0.21);
      camB.position.set(0.85 + lerp(2.0, 2.4, pull) + 0.4 * orb, 0.3 + lerp(0.6, 0.3, pull), lerp(3.8, 4.4, pull)); camB.lookAt(0.85, 0.15, 0); out.lookT = [0.85, 0.15, 0]; camB.fov = lerp(50, 48, smooth(30, TOT, tt)); camB.updateProjectionMatrix();
      out.flash = 0.35 * pulse(tt, CUT, 0.35) + 0.2 * pulse(tt, MT[6], 0.3); out.shake = 0.12 * pulse(tt, MT[6], 0.4) + 0.06 * smooth(36, TOT, tt) * Math.abs(Math.sin(tt * 7));
    }
    // the coffee stays in your hand and upright; steam
    { hero.updateMatrixWorld(true); P.armL.userData.end.getWorldPosition(tv); if (cup.parent !== scene) scene.add(cup); cup.position.copy(tv).add(v.set(0.02, 0.06, 0.03)); cup.rotation.set(0, 0, tt >= TRIP ? -0.25 : 0);
      STEAM.forEach((s, i) => { if (s.parent !== scene) scene.add(s); const u = ((tt * 0.8 + i / STEAM.length) % 1); s.position.copy(cup.position).add(v.set(-u * (tt > TRIP ? 0.6 : 0.05), 0.1 + u * 0.25, 0)); s.scale.setScalar(0.05 + u * 0.12); s.material.opacity = 0.45 * (1 - u); }); }
    // teaser: sudden ZOOM on your face
    if (teaser) { const zk = smooth(0.22, 0.36, tt0); const cmr = camera; P.headPivot.getWorldPosition(tv); const lk = tv.clone(); const dir = cmr.position.clone().sub(lk); cmr.position.copy(lk.clone().add(dir.multiplyScalar(lerp(1, 0.5, zk)))); const LT = out.lookT; cmr.lookAt(lerp(LT[0], lk.x, zk), lerp(LT[1], lk.y, zk), lerp(LT[2], lk.z, zk)); cmr.fov = lerp(cmr.fov, 30, zk); cmr.updateProjectionMatrix(); out.zk = zk; out.shake = 0.3 * pulse(tt0, 0.3, 0.3); }
    out.scene = scene; out.camera = camera; out.focus = hero;
    return out;
  }

  // ---------------- on-screen text (no narrator today: these lines carry the story) ----------------
  const CAP = [[2.6, 4.3, 'Your tram is leaving. You just want to go faster.'], [4.35, 5.85, 'A normal trip stops you in a second.'], [5.9, 7.6, 'This one doubles your speed. Every second.'],
    [7.65, 9.4, "You tripped over a pigeon. He's not sorry."], [9.45, 10.9, 'Nothing slows you down. Not even air.'], [11.0, 12.9, 'That bang? You broke the sound barrier.'],
    [13.3, 15.2, "You could let go of the coffee. You don't."], [15.5, 17.3, 'Earth curves away faster than you fall.'], [20.1, 21.8, 'Faster than anything humans ever built.'],
    [25.2, 27.2, 'The Moon is now one minute away.'], [29.7, 31.2, 'But nothing can go faster than light.'], [31.3, 32.9, 'So you just get closer. Forever.'],
    [33.0, 34.9, 'Time slows down for you. Not for Earth.'], [38.15, 40.0, 'Cross the whole galaxy before your coffee cools.'], [40.05, 41.4, 'Well. You wanted to go faster.']];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function topText(ctx, W, t, a, b, txt, size = 56, y = 240) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.12, (b - t) / 0.12));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 700 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.86).forEach((l, i) => { ctx.strokeText(l, W / 2, y + i * size * 1.25); ctx.fillText(l, W / 2, y + i * size * 1.25); }); ctx.restore(); }
  function proj(pos, camO) { tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1 || tv.z < -1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  function mileLabel(ctx, p, title, sub, a = 1, num = '') { if (a <= 0 || !p) return; let [x, y] = p; x = clamp(x, 300, 1040); y = clamp(y, 1060, 1560);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 42px ${FONT}`; const tw = ctx.measureText(title).width; ctx.font = `700 26px ${FONT}`; const sw = sub ? ctx.measureText(sub).width : 0; const w = Math.max(tw, sw) + 36, h = sub ? 98 : 68;
    const lx = clamp(x - w / 2, 40, 1060 - w), ly = y - h - 26; ctx.fillStyle = 'rgba(10,12,16,0.84)'; ctx.beginPath(); ctx.roundRect(lx, ly, w, h, 16); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(clamp(x, lx + 20, lx + w - 20), ly + h); ctx.lineTo(x, y - 4); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `900 42px ${FONT}`; ctx.fillText(title, lx + 18, ly + 35); if (sub) { ctx.font = `700 26px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(sub, lx + 18, ly + 76); } ctx.restore(); }
  function fmtV(st) { const tt = st.tt; if (tt > 29.69 + 0.05) { const k = st.k9; if (k < 2) return [(100 * (1 - Math.pow(10, -k))).toFixed(1) + '%', 'OF LIGHT SPEED']; const nn = Math.max(0, Math.floor(k) - 2); return [(nn ? '99.' + '9'.repeat(nn) : '99') + '%', 'OF LIGHT SPEED']; }
    const v = st.kmh; if (v < 1e6) return [Math.floor(v).toLocaleString('en-US'), 'KM/H']; return [(v / 1e6 < 100 ? (v / 1e6).toFixed(1) : Math.floor(v / 1e6).toLocaleString('en-US')) + ' MILLION', 'KM/H']; }
  // speedometer gauge (left): log dial 1 km/h -> light speed, needle, ticks at each milestone
  const LG = Math.log10(C_KMH);
  function dialF(st) { if (st.tt > 29.69) return 0.94 + 0.06 * (1 - 1 / (1 + st.k9 / 4)); return 0.94 * clamp(Math.log10(Math.max(1, st.kmh)) / LG); }
  function gauge(ctx, st) { const tt = st.tt, mi = st.mi; const cx = 200, cy = 520, r = 135, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25; const f = dialF(st); const ang = lerp(a0, a1, f);
    ctx.save(); ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.arc(cx, cy, r + 26, 0, 7); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
    const gr = ctx.createLinearGradient(cx - r, 0, cx + r, 0); gr.addColorStop(0, '#7dff9a'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#ff4a3a'); ctx.strokeStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, a0, ang); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < MT.length; i++) { const sti = { tt: MT[i], kmh: kmh(MT[i]), k9: ninesK(MT[i]) }; const aa = lerp(a0, a1, dialF(sti)); ctx.beginPath(); ctx.moveTo(cx + Math.cos(aa) * (r - 26), cy + Math.sin(aa) * (r - 26)); ctx.lineTo(cx + Math.cos(aa) * (r - 14), cy + Math.sin(aa) * (r - 14)); ctx.stroke(); }
    { const aa = a1; ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(aa) * (r - 30), cy + Math.sin(aa) * (r - 30)); ctx.lineTo(cx + Math.cos(aa) * (r + 12), cy + Math.sin(aa) * (r + 12)); ctx.stroke();
      ctx.font = `900 22px ${FONT}`; ctx.fillStyle = '#ff8a7a'; ctx.textAlign = 'center'; ctx.fillText('LIGHT', cx + Math.cos(aa) * (r - 4) - 8, cy + Math.sin(aa) * (r - 4) + 34); }
    const jit = tt > 30 ? 0.004 * Math.sin(tt * 47) : 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang + jit) * (r - 22), cy + Math.sin(ang + jit) * (r - 22)); ctx.stroke(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.fill();
    ctx.font = `800 26px ${FONT}`; ctx.fillStyle = '#7dd3ff'; ctx.textAlign = 'center'; ctx.fillText('SPEED', cx, cy + 62);
    ctx.restore();
    const [num, unit] = fmtV(st); const bump = mi >= 0 ? pulse(tt, MT[mi], 0.4) : 0;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.save(); ctx.translate(62, 768); ctx.scale(1 + bump * 0.1, 1 + bump * 0.1); let fs = 84; ctx.font = `900 ${fs}px ${FONT}`; while (ctx.measureText(num).width > 600 && fs > 40) { fs -= 2; ctx.font = `900 ${fs}px ${FONT}`; }
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,0.88)'; ctx.strokeText(num, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(num, 0, 0); ctx.restore();
    ctx.font = `900 38px ${FONT}`; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.88)'; const sec = tt < TRIP ? 'RUNNING' : 'SECOND ' + Math.floor(tt - TRIP); const lab = unit + '  ·  ' + sec; ctx.strokeText(lab, 64, 818); ctx.fillStyle = '#ffd23f'; ctx.fillText(lab, 64, 818);
    let txt = '', colr = '#bfe3ff'; const just = mi >= 0 && tt < MT[mi] + 0.7; if (just) { txt = 'PASSED: ' + MIL[mi][2]; colr = '#7dff9a'; } else if (mi + 1 < MIL.length) txt = 'NEXT: ' + MIL[mi + 1][1] + ' = ' + MIL[mi + 1][2]; else txt = 'STILL SPEEDING UP';
    ctx.font = `800 30px ${FONT}`; while (ctx.measureText(txt).width > 900) ctx.font = `800 ${parseInt(ctx.font.split(' ')[1]) - 2}px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(txt, 64, 864); ctx.fillStyle = colr; ctx.fillText(txt, 64, 864);
    if (tt > TRIP) { ctx.font = `700 24px ${FONT}`; ctx.lineWidth = 5; const rl = tt > 29.69 ? 'CAN\'T PASS LIGHT - ONLY CLOSER' : 'SPEED DOUBLES EVERY SECOND'; ctx.strokeText(rl, 64, 902); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillText(rl, 64, 902); }
    ctx.restore(); }
  // speed lines over the frame (street + river part)
  function speedFX(ctx, tt, amt) { if (amt <= 0) return; ctx.save(); ctx.globalAlpha = 0.5 * amt; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath();
    const r = rng(7); for (let i = 0; i < 70; i++) { const y = 380 + r() * 1400, sp = 3000 + r() * 2000, ph = r(), len = 120 + r() * 260 * amt; const x = 1300 - ((tt * sp / 1080 + ph) % 1) * 1600; if (Math.abs(y - 1000) < 220 && Math.abs(x - 540) < 260) continue; ctx.moveTo(x, y); ctx.lineTo(x + len, y); } ctx.stroke(); ctx.restore(); }
  function hud(ctx, tt0, st) { const W = 1080, Hh = 1920; const tt = st.tt; const camO = st.camera;
    if (!st.space) speedFX(ctx, tt0, smooth(6.5, 10, tt) * 0.9);
    const title = (x) => drawTitleTimed(ctx, W, Hh, [{ text: 'WHAT IF YOU TRIPPED AND YOUR', size: 70 }, { text: 'SPEED DOUBLED EVERY SECOND?', size: 76, accent: true }], x, '#ffd23f', { start: 0, wps: 1000, outAt: 2.5, y: 0.115 });
    if (st.teaser) { title(tt0 + 0.01); drawTeaser(ctx, W, Hh, 'zoom', st.zk || 0); return; }
    gauge(ctx, st);
    title(tt0);
    for (const [a, b, txt] of CAP) topText(ctx, W, tt, a, b, txt);
    if (tt >= 41.45) topText(ctx, W, tt, 41.45, 1e9, 'What speed would you stop at?', 58);
    if (!camO) return;
    // name tags + bubbles (human part)
    if (!st.space && tt < 6.0) { P.headPivot.getWorldPosition(tv); const ph = proj([tv.x, tv.y + 0.5, tv.z], camO); MC.headPivot.getWorldPosition(tv); const pm = proj([tv.x, tv.y + 0.25, tv.z], camO);
      const pg = proj([pigeon.position.x, 0.6, pigeon.position.z], camO); fil.headPivot.getWorldPosition(tv); const pf = proj([tv.x, tv.y + 0.45, tv.z], camO);
      if (ph) drawTag(ctx, ph[0] + 60, ph[1] - 40, 'YOU (LATE)', tt - 1.25, { dur: 1.6, bg: '#7dd3ff' });
      if (pm) drawTag(ctx, pm[0] - 40, pm[1] + 70, 'MITTENS', tt - 1.25, { dur: 1.6 });
      { tram.updateMatrixWorld(true); const pt = proj([tram.position.x - 2, 4.2, -3], camO); if (pt && pt[0] > 80 && pt[0] < 1000) drawTag(ctx, pt[0], pt[1], 'YOUR TRAM', tt - 1.5, { dur: 2.6, bg: '#ffd23f' }); }
      if (pg) drawTag(ctx, pg[0], pg[1] + 70, 'THE PIGEON', tt - 2.9, { dur: 1.8, bg: '#c9f0c0' });
      if (pf) drawTag(ctx, pf[0], pf[1], 'THE FILMER', tt - 4.1, { dur: 1.8, bg: '#f2c0f0' });
      if (pf) drawBubble(ctx, pf[0], pf[1] - 50, "HOLD STILL, I'M FILMING!", tt - 4.5, { dur: 1.4, size: 40 }); }
    // milestone labels next to the thing you just raced
    const show = (i) => { const end = i === MIL.length - 1 ? 1e9 : Math.min(MT[i] + 1.5, (MT[i + 1] ?? 1e9) - 0.1); return tt > MT[i] - 0.25 && tt < end ? smooth(MT[i] - 0.25, MT[i], tt) * (i === MIL.length - 1 ? 1 : 1 - smooth(end - 0.25, end, tt)) : 0; };
    for (let i = 0; i < MIL.length; i++) { const a = show(i); if (a <= 0) continue; let p = null;
      if (i === 0) { bolt.headPivot.getWorldPosition(tv); p = proj([tv.x, tv.y + 0.4, tv.z], camO); }
      else if (i === 1) { chee.updateMatrixWorld(true); CC.headPivot.getWorldPosition(tv); p = proj([tv.x, tv.y + 0.6, tv.z], camO); }
      else if (i === 2) p = proj([train.position.x + 6, 8, -40], camO);
      else if (i === 7 || i === 9) p = earth.visible ? proj([earth.position.x, earth.position.y + 6371 * 0.7, earth.position.z], camO) : null;
      else if (i === 8) p = proj([parker.position.x, parker.position.y + 0.9, parker.position.z], camO);
      else if (i === 11) p = proj([moon.position.x, moon.position.y + 1.8, moon.position.z], camO);
      else if ((i === 10 || i === 12 || i === 13) && st.lightX < 60) p = proj([Math.min(st.lightX, 6) + 0.8, 1.2, -0.8], camO);
      else if (i >= 17) p = proj([0.2, -0.6, 0.6], camO);
      else { P.headPivot.getWorldPosition(tv); p = proj([tv.x, tv.y - 0.5, tv.z], camO); if (p) p[1] += 330; }
      if (p) mileLabel(ctx, p, MIL[i][1] + ' = ' + MIL[i][2], MIL[i][3], a); }
    // 'LIGHT' tag on the light pulse in the nines part
    if (st.space && tt > 31.6 && st.lightX < 20) { const p = proj([st.lightX + 0.8, 1.3, -0.8], camO); if (p) { ctx.save(); ctx.font = `900 30px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText('LIGHT', p[0], p[1] - 30); ctx.fillStyle = '#cfe8ff'; ctx.fillText('LIGHT', p[0], p[1] - 30); ctx.restore(); } }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
