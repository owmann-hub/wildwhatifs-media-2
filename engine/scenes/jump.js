import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeEarth, softTex, setFace, life, drawSideCounter, drawTitleTimed, RoundedBoxGeometry, pedGeos, stars } from './lib.js';
import { buildCity } from './city5.js';
import { makeStreetLife } from './streetlife.js';

// Nov 16 episode — format_v5 structure (countdown / slow motion / end card, as the approved sun prototype),
// with its own place, stake, consequences, lines and transformation:
// PLACE: a bus stop outside an ice-cream parlour on a busy avenue, early afternoon (not the esplanade, not the bakery cafe).
// STAKE: you just bought a three-scoop ice cream. Don't drop it. Paid off after landing: the top scoop slides off, Mittens gets it.
// TRANSFORMATION: nobody on Earth is touching the ground — you, the street, every sidewalk and rooftop, then the whole planet
//        (the jump lasts 0.6 s of story time, shown at 50x slow motion = bullet time).
// CAST: THE UNBOTHERED PERSON (keeps reading his paper, turns a page mid-air), THE PIGEON (judges, does not jump),
//       THE SALESMAN ("I JUMPED" T-shirts, seconds after landing). Mittens did not jump: Mittens is not a person.
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;

const G = 9.81, AIR = 0.6, V0 = G * AIR / 2;          // 0.6 s in the air -> take-off 2.94 m/s, peak 0.44 m
const EV = 7.0, SLOW = 50, RET = EV + AIR * SLOW, CARDT = 45.6, TOT = 53.6;   // RET = 37
const HX = -2.6, HZ = -8.2;
const jumpY = (ts) => (ts <= 0 || ts >= AIR) ? 0 : V0 * ts - 0.5 * G * ts * ts;
const ESB = [160, -323];

export async function create({ THREE, W, H }) {
  const R = rng(1116);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(45, W / H, 0.05, 2e5);
  A.fog = new THREE.FogExp2(0xcfe2f4, 0.00011);
  // bright look (owner, Nov 15): warm key + cool rim + strong hemisphere fill
  const hemi = new THREE.HemisphereLight(0xe4efff, 0x8a7c66, 1.0); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; A.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x7fb0ff, 1.2); rim.position.set(-300, 200, -400); A.add(rim);
  const SUN = new THREE.Vector3(0.7, 0.62, 0.35).normalize();
  function setShadow(cx, cz, size) { sun.target.position.set(cx, 0, cz); sun.position.set(cx + SUN.x * 1500, SUN.y * 1500, cz + SUN.z * 1500); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 10; c.far = 3500; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 100 ? 1.5 : 0.04; }
  A.add(makeSkyDome(THREE, 0x2f7fe6, 0xd8ecfb, [SUN.x, SUN.y, SUN.z]));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3();

  // ---------------- the city (shared NYC-style build), recoloured: no two neighbours alike ----------------
  const C = await buildCity(THREE, A, R, { hero: [HX, HZ], np: 170, clear: 14, boards: [
    ['GELATO|LAND', '#ff5fa2', '#fff', 24.7, 12, 26, 13, 8, -Math.PI / 2], ['JUMP|SALE!', '#ffd400', '#111', 24.7, 24, 40, 13, 9, -Math.PI / 2],
    ['CITY|BUS', '#0b6fd0', '#fff', -5.3 + 0.6, 17, 34, 12, 8, Math.PI / 2], ['TACOS', '#19a354', '#fff', 24.7, 11, -26, 12, 6, -Math.PI / 2]] });
  A.children.forEach(o => { if (o.isMesh && Math.abs(o.position.x + 0.7) < 0.01 && Math.abs(o.position.z + 11.5) < 0.01) o.visible = false; });
  const bMesh = A.children.find(o => o.isInstancedMesh && o.material === C.bMat);
  const candy = [0xc8553d, 0xf2e3c6, 0x2a9d8f, 0xe9b949, 0xf28fad, 0x9cc9e8, 0xb5654a, 0xe07a5f, 0x81b29a, 0xf4a261, 0xd9cbb0, 0x6c8ebf];
  for (let k = 0; k < bMesh.count; k++) { bMesh.getColorAt(k, col); if (col.b > col.r * 1.08) continue; bMesh.setColorAt(k, col.setHex(candy[Math.floor(R() * candy.length)])); }
  bMesh.instanceColor.needsUpdate = true;
  const dark = C.dark;
  { const AFT = RET - EV - AIR; const pass = [[0, 1.2, 10], [4, 3.6, 11], [8, 5.6, 10], [12, 39.0 - AFT, 10], [16, 42.0 - AFT, 11], [20, 44.6 - AFT, 10]];   // taxis crossing the frame in the near lane
    for (const [k, tc, sp] of pass) { const c = C.cars[k]; c.x = 3.4; c.sp = sp; c.z0 = -7 - sp * tc; } }

  // ---------------- the Empire State Building (443 m to the tip; labelled during the rise) ----------------
  { const stone = new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.7 }); const bx = ESB[0], bz = ESB[1]; const g = new THREE.Group();
    const tiers = [[71, 36.6, 25], [56, 30, 260], [44, 24, 40], [34, 18, 20], [22, 14, 18], [14, 10, 18]]; let y = 0.15;
    for (const [w, d, h] of tiers) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), C.bMat); b.position.set(bx, y, bz); g.add(b); y += h; }
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6, 18, 16), stone); crown.position.set(bx, y + 9, bz); g.add(crown); y += 18;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.2, 443.2 - y, 12), new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.3, metalness: 0.6 })); mast.position.set(bx, (y + 443.2) / 2, bz); g.add(mast);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); A.add(g); }

  // ---------------- the hero's block: six different shop fronts ----------------
  const FX = -4.95;
  { const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.2, 36.2), new THREE.MeshStandardMaterial({ color: 0xb8563f, roughness: 0.85 })); back.position.set(FX - 0.4, 3.1, -22.6); back.receiveShadow = true; A.add(back); }
  function signTex(text, bg, fg, w = 512, h = 128, font = 900) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = h * 0.62; g.font = `${font} ${fs}px ${FONT}`; const mw = g.measureText(text).width; if (mw > w * 0.88) { fs *= w * 0.88 / mw; g.font = `${font} ${fs}px ${FONT}`; } g.fillText(text, w / 2, h * 0.54);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function shop(zc, wz, o) {
    const facadeM = new THREE.MeshStandardMaterial({ color: o.wall, roughness: 0.7 });
    const f = new THREE.Mesh(new RoundedBoxGeometry(0.3, 5.6, wz - 0.12, 2, 0.06), facadeM); f.position.set(FX + 0.1, 2.95, zc); f.castShadow = f.receiveShadow = true; A.add(f);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(wz * 0.62, 2.3), new THREE.MeshStandardMaterial({ color: o.glass ?? 0xcfe7f0, roughness: 0.06, metalness: 0.5, emissive: o.glow ?? 0x302a20, emissiveIntensity: 0.6 })); glass.position.set(FX + 0.27, 1.65, zc - wz * 0.12); glass.rotation.y = Math.PI / 2; A.add(glass);
    const frameM = new THREE.MeshStandardMaterial({ color: o.trim, roughness: 0.6 });
    for (const dz of [-wz * 0.43, wz * 0.19]) { const fr = new THREE.Mesh(new RoundedBoxGeometry(0.16, 2.6, 0.16, 2, 0.04), frameM); fr.position.set(FX + 0.3, 1.6, zc + dz); fr.castShadow = true; A.add(fr); }
    const sill = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.16, wz * 0.66, 2, 0.05), frameM); sill.position.set(FX + 0.4, 0.42, zc - wz * 0.12); sill.castShadow = true; A.add(sill);
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.12, 2.3, 1.1, 2, 0.04), new THREE.MeshStandardMaterial({ color: o.door, roughness: 0.5 })); door.position.set(FX + 0.3, 1.3, zc + wz * 0.33); A.add(door);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(wz * 0.8, 0.85), new THREE.MeshBasicMaterial({ map: signTex(o.name, o.signBg, o.signFg), toneMapped: false })); sg.position.set(FX + 0.27, 4.35, zc); sg.rotation.y = Math.PI / 2; A.add(sg);
    // upper windows with sills
    for (let k = 0; k < 2; k++) { const w2 = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.8, 1.0, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.2, metalness: 0.4 })); w2.position.set(FX + 0.27, 5.25, zc - wz * 0.25 + k * wz * 0.5); A.add(w2); }
    if (o.awn) { const sN = 8, sw = wz * 0.86 / sN; for (let k = 0; k < sN; k++) { const s = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.08, sw, 2, 0.03), new THREE.MeshStandardMaterial({ color: k % 2 ? o.awn[0] : o.awn[1], roughness: 0.7 })); s.position.set(FX + 0.95, 3.35, zc - wz * 0.43 + (k + 0.5) * sw); s.rotation.z = -0.32; s.castShadow = true; A.add(s); } }
    if (o.extra) o.extra(zc, wz); }
  const potM = new THREE.MeshStandardMaterial({ color: 0xc9683f, roughness: 0.85 }), leafM = new THREE.MeshStandardMaterial({ color: 0x3f9a4a, roughness: 0.8 });
  const flowerC = [0xff4f7a, 0xffd23f, 0xff8a3d, 0xc86bff, 0xffffff];
  function planter(x, z, s = 1, flowers = false) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.22 * s, 0.45 * s, 16), potM); p.position.set(x, 0.15 + 0.22 * s, z); p.castShadow = true; A.add(p);
    for (let k = 0; k < 7; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 12, 10), flowers && k > 2 ? new THREE.MeshStandardMaterial({ color: flowerC[k % 5], roughness: 0.6 }) : leafM); lf.position.set(x + (R() - 0.5) * 0.36 * s, 0.15 + (0.5 + R() * 0.35) * s, z + (R() - 0.5) * 0.36 * s); lf.castShadow = true; A.add(lf); } }
  shop(-7.6, 6.0, { name: 'SCOOPS & CO', wall: 0xffc4d8, trim: 0xffffff, door: 0xff5fa2, signBg: '#ff5fa2', signFg: '#fff', awn: [0xffffff, 0xff7fb4], glow: 0x5a3040,
    extra: (zc) => { // serving hatch with a giant cone sign
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 20), new THREE.MeshStandardMaterial({ color: 0xd99a4e, roughness: 0.7 })); cone.rotation.z = Math.PI; cone.position.set(FX + 0.55, 5.0, zc + 2.6); A.add(cone);
      const sc1 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), new THREE.MeshStandardMaterial({ color: 0xff8fb8, roughness: 0.5 })); sc1.position.set(FX + 0.55, 5.6, zc + 2.6); A.add(sc1);
      planter(FX + 0.7, zc - 2.7, 0.8, false); } });
  shop(-13.6, 6.0, { name: 'PHARMACY', wall: 0xf4f1ea, trim: 0x1f8a4c, door: 0x1f8a4c, signBg: '#1f8a4c', signFg: '#fff', glow: 0x203a28,
    extra: (zc) => { const cm = new THREE.MeshBasicMaterial({ color: 0x3dff7a, toneMapped: false }); for (const [w, h] of [[0.18, 0.62], [0.62, 0.18]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, w), cm); b.position.set(FX + 1.05, 3.9, zc + 2.4); A.add(b); }
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), dark); arm.rotation.z = Math.PI / 2; arm.position.set(FX + 0.65, 4.3, zc + 2.4); A.add(arm); } });
  shop(-19.6, 6.0, { name: 'PAGE TURNER', wall: 0x2a9d8f, trim: 0xf2e3c6, door: 0xe9b949, signBg: '#173d39', signFg: '#f2e3c6', awn: [0x173d39, 0xf2e3c6], glow: 0x40301a,
    extra: (zc) => { const rack = new THREE.Mesh(new RoundedBoxGeometry(0.5, 1.0, 1.4, 2, 0.05), new THREE.MeshStandardMaterial({ color: 0x7a4e2d, roughness: 0.7 })); rack.position.set(FX + 0.8, 0.65, zc - 1.0); rack.castShadow = true; A.add(rack);
      for (let k = 0; k < 9; k++) { const bk = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.28, 0.06, 1, 0.01), new THREE.MeshStandardMaterial({ color: [0xe63946, 0x457b9d, 0xf1c453, 0x2a9d8f, 0x8e5bb5][k % 5], roughness: 0.6 })); bk.position.set(FX + 1.06, 0.62 + Math.floor(k / 3) * 0.3, zc - 1.5 + (k % 3) * 0.42); bk.rotation.y = 0.2; A.add(bk); } } });
  shop(-25.6, 6.0, { name: 'SUDS LAUNDRY', wall: 0x9cc9e8, trim: 0xffffff, door: 0x1d5f99, signBg: '#ffffff', signFg: '#1d5f99', glow: 0x203048 });
  shop(-31.6, 6.0, { name: 'PETALS', wall: 0xe9b949, trim: 0x6b3e1e, door: 0x6b3e1e, signBg: '#6b3e1e', signFg: '#ffe9a8', awn: [0x6b3e1e, 0xffe9a8], glow: 0x40301a,
    extra: (zc) => { for (let k = 0; k < 4; k++) planter(FX + 0.75 + (k % 2) * 0.55, zc - 2 + k * 0.9, 0.9, true); } });
  shop(-37.6, 6.0, { name: 'CLIPPERS', wall: 0xc8553d, trim: 0xffffff, door: 0x222222, signBg: '#111111', signFg: '#ffffff', glow: 0x302020,
    extra: (zc) => { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 16), new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); for (let k = -2; k < 8; k++) { g.fillStyle = ['#e63946', '#fff', '#1d5f99', '#fff'][((k % 4) + 4) % 4]; g.beginPath(); g.moveTo(0, k * 16); g.lineTo(64, k * 16 - 32); g.lineTo(64, k * 16 - 16); g.lineTo(0, k * 16 + 16); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.4 }));
      pole.position.set(FX + 0.45, 2.6, zc + 2.4); A.add(pole); } });
  // street furniture: trees in pits, lamps, a bike rack with bikes, a hydrant, bunting over the cross street
  function tree(x, z) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 3.2, 10), new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 })); tr.position.set(x, 1.75, z); tr.castShadow = true; A.add(tr);
    for (let k = 0; k < 5; k++) { const cr = new THREE.Mesh(new THREE.SphereGeometry(0.9 + R() * 0.4, 18, 14), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.25 + R() * 0.07, 0.55, 0.36 + R() * 0.08), roughness: 0.85 })); cr.position.set(x + (R() - 0.5) * 1.2, 3.6 + R() * 0.9, z + (R() - 0.5) * 1.2); cr.castShadow = true; A.add(cr); } }
  tree(-0.9, -20); tree(-0.9, -32); tree(-0.9, 24); tree(21.1, -18);
  function lamp(x, z) { const g = new THREE.Group(); g.position.set(x, 0.15, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.2, 12), dark); p.position.y = 2.6; g.add(p);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.4, emissive: 0x3a2a10 })); head.position.y = 5.3; g.add(head); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); }
  lamp(-0.6, -2.4); lamp(-0.6, -26);
  { const bunt = []; for (let k = 0; k < 18; k++) bunt.push(k); const flagG = new THREE.ConeGeometry(0.22, 0.45, 3);
    for (const zb of [2.2, 11.8]) bunt.forEach(k => { const x = -0.5 + k * 1.2, sag = 7.2 - 0.9 * Math.sin(Math.PI * k / 17); const f = new THREE.Mesh(flagG, new THREE.MeshStandardMaterial({ color: [0xff4f7a, 0xffd23f, 0x2bb3b1, 0x3a7bd5][k % 4], roughness: 0.6, side: THREE.DoubleSide })); f.rotation.x = Math.PI; f.position.set(x, sag, zb); A.add(f); }); }
  { const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 14), new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.45 })); hyd.position.set(-0.7, 0.5, -4.6); hyd.castShadow = true; A.add(hyd); }

  // ---------------- the bus shelter (bench, glass, roof, ad panel) ----------------
  const SHX = -1.15, SHZ = -11.2;
  { const g = new THREE.Group(); g.position.set(SHX, 0.15, SHZ); const fr = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4, metalness: 0.5 });
    for (const dz of [-1.9, 1.9]) for (const dx of [-0.75, 0.75]) { const p = new THREE.Mesh(new RoundedBoxGeometry(0.1, 2.5, 0.1, 2, 0.03), fr); p.position.set(dx, 1.25, dz); g.add(p); }
    const roof = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.12, 4.2, 3, 0.05), fr); roof.position.y = 2.55; g.add(roof);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.9, 3.7), new THREE.MeshStandardMaterial({ color: 0xbfe0f0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.28 })); gl.position.set(-0.75, 1.25, 0); g.add(gl);
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.85), new THREE.MeshBasicMaterial({ map: signTex('SUMMER|SALE', '#ffd23f', '#111', 256, 384), toneMapped: false })); ad.position.set(0, 1.25, 1.88); ad.rotation.y = Math.PI; g.add(ad);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.07, 3.0, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0xc27a35, roughness: 0.6 })); seat.position.set(-0.45, 0.48, 0); g.add(seat);
    for (const dz of [-1.2, 1.2]) { const l = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.45, 0.06, 1, 0.02), fr); l.position.set(-0.45, 0.23, dz); g.add(l); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({ map: signTex('M15 BUS', '#0b6fd0', '#fff', 256, 86), toneMapped: false })); sign.position.set(0.9, 2.3, -1.9); sign.rotation.y = Math.PI / 2; g.add(sign);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); A.add(g); }
  const BENCH_Y = 0.15 + 0.52;

  // ---------------- the wider city's crowd: sidewalks and rooftops (everyone jumps) ----------------
  const PGs = { body: new THREE.CapsuleGeometry(0.2, 0.78, 2, 8).translate(0, 0.95, 0), head: new THREE.SphereGeometry(0.17, 10, 8).translate(0, 1.72, 0) };
  const shirts = [0xff4f7a, 0x3a7bd5, 0xffd23f, 0x4caf7a, 0xa66bd6, 0xffffff, 0xff8a3d, 0x2bb3b1, 0xe63946], skins = [0xf1c6a5, 0xd8a47e, 0xb5835a, 0x8d5a3b, 0x5c3a24];
  const crowd = [];
  for (let i = -4; i <= 3; i++) for (let j = -9; j <= 4; j++) { const cx = 100 * i + 60, cz = 60 * j + 37; if (i === -1 && j >= -2 && j <= 0) continue;
    for (let k = 0; k < 22; k++) { const side = Math.floor(R() * 4); let x, z; if (side < 2) { x = cx + (side ? 37.5 : -37.5) + (R() - 0.5) * 3.6; z = cz + (R() - 0.5) * 44; } else { z = cz + (side === 2 ? 20.5 : -20.5) + (R() - 0.5) * 3.2; x = cx + (R() - 0.5) * 76; }
      crowd.push({ x, y: 0.15, z, ry: R() * 6.28, s: 0.9 + R() * 0.2, d: R() * 0.06 }); } }
  // rooftop people (parties, a yoga class...): find roofs by raycasting down onto the city
  { const rc = new THREE.Raycaster(); bMesh.updateMatrixWorld(true); bMesh.computeBoundingSphere();
    for (let k = 0; k < 260; k++) { const x = -360 + R() * 700, z = -560 + R() * 620; rc.set(v.set(x, 900, z), tv.set(0, -1, 0)); const hit = rc.intersectObject(bMesh, false)[0]; if (!hit || hit.point.y < 8) continue;
      const n = 2 + Math.floor(R() * 5); for (let m = 0; m < n; m++) crowd.push({ x: x + (R() - 0.5) * 6, y: hit.point.y + 0.02, z: z + (R() - 0.5) * 6, ry: R() * 6.28, s: 0.95, d: R() * 0.06, roof: true }); } }
  const NCR = crowd.length;
  const crB = new THREE.InstancedMesh(PGs.body, new THREE.MeshStandardMaterial({ roughness: 0.75 }), NCR), crH = new THREE.InstancedMesh(PGs.head, new THREE.MeshStandardMaterial({ roughness: 0.6 }), NCR);
  const crS = new THREE.InstancedMesh(new THREE.CircleGeometry(0.34, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }), NCR);
  crowd.forEach((p, k) => { crB.setColorAt(k, col.setHex(shirts[k % shirts.length])); crH.setColorAt(k, col.setHex(skins[k % skins.length])); m4.compose(v.set(p.x, p.y + 0.012, p.z), q.identity(), sc.set(p.s, 1, p.s)); crS.setMatrixAt(k, m4); });
  [crB, crH].forEach(m => { m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; A.add(m); }); crS.frustumCulled = false; A.add(crS);
  // contact shadows for the avenue's instanced pedestrians (they stay on the ground when people leave it)
  const pS = new THREE.InstancedMesh(new THREE.CircleGeometry(0.32, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }), C.NP); pS.frustumCulled = false; A.add(pS);

  // ---------------- the lively avenue (dog walker, jogger, cyclist, kid with balloon, busker, van, phone call, coffee) ----------------
  const before = new Set(A.children);
  const SL = makeStreetLife(THREE, A, { seed: 16, z: HZ, dogX: 0.0, dogZ: 7.4, dogDir: -1, jogX: 0.6, jogZ: -26, bikeX: 1.7, bikeZ: -60, kidX: -3.9, kidZ: 6.0, kidDir: -1, musX: -4.3, musZ: -24, vanX: 18.5, vanZ: 20, phX: 21.8, phZ: -12, cofX: 22.4, cofZ: 2, balloonColor: 0xff4f7a, vanColor: 0xfdfbf5, vanStripe: 0xff5fa2, dogColor: 0xd9a066 });
  const slPeople = A.children.filter(o => !before.has(o) && o.isGroup && o.children.some(c => c.isGroup && c.children.length > 8));

  // ---------------- hero + the cone, Mittens, the reader, the pigeon, the salesman ----------------
  const P = makePerson(THREE, { shirt: 0xffb000, pants: 0x2f5d8a, hair: 0x2a1a10, skin: 0xd8a47e, shoe: 0xff4f7a, seed: 4 }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const coneG = new THREE.Group(); { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.2, 18), new THREE.MeshStandardMaterial({ color: 0xd99a4e, roughness: 0.75 })); cn.rotation.x = Math.PI; cn.position.y = 0.1; coneG.add(cn); }
  const scoopM = [0xff8fb8, 0x9be3c3, 0x6b3a22].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
  const scoops = scoopM.map((m, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.064, 20, 16), m); s.castShadow = true; A.add(s); return s; });
  const sprink = []; for (let k = 0; k < 10; k++) { const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.014, 2, 6), new THREE.MeshBasicMaterial({ color: flowerC[k % 5] })); scoops[2].add(s); const a = k * 2.4, b = 0.3 + (k % 3) * 0.35; s.position.set(Math.cos(a) * Math.sin(b) * 0.064, Math.cos(b) * 0.064, Math.sin(a) * Math.sin(b) * 0.064); s.rotation.set(a, b, 0); }
  coneG.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(coneG);
  const mittens = makeCat(THREE, 0xf0a040); mittens.rotation.order = 'YXZ'; mittens.scale.setScalar(1.35); A.add(mittens);
  const MX = SHX - 0.45, MZ = SHZ + 1.15;
  const reader = makePerson(THREE, { shirt: 0x6c8ebf, pants: 0x3a3a3a, hair: 0x9a9a9a, skin: 0xf1c6a5, seed: 9 }); reader.group.rotation.order = 'YXZ'; A.add(reader.group);
  const paper = new THREE.Group(); { const pm = new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#efeadf'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#222'; g.font = `900 24px ${FS}`; g.fillText('THE DAILY', 12, 30); for (let y = 46; y < 150; y += 9) for (let x = 12; x < 240; x += 80) g.fillRect(x, y, 66, 3); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.9, side: THREE.DoubleSide });
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), pm); l.position.x = -0.17; paper.add(l); const r = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), pm); r.position.x = 0.17; paper.add(r);
    const pg = new THREE.Group(); const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), pm); pp.position.x = 0.17; pg.add(pp); paper.add(pg); paper.userData.page = pg; A.add(paper); }
  const RDX = SHX + 0.25, RDZ = SHZ - 0.9;
  // the pigeon on the shelter roof
  const pigeon = new THREE.Group(); { const gm = new THREE.MeshStandardMaterial({ color: 0x8d94a0, roughness: 0.6 }), nk = new THREE.MeshStandardMaterial({ color: 0x5f8a7a, roughness: 0.4, metalness: 0.3 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), gm); b.scale.set(0.85, 0.8, 1.25); b.position.y = 0.14; pigeon.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), nk); h.position.set(0, 0.29, 0.12); pigeon.add(h); pigeon.userData.head = h;
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x3a3030 })); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.28, 0.2); h.add(bk); bk.position.set(0, -0.01, 0.08);
    for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff9a2a, roughness: 0.3 })); ey.position.set(sx * 0.045, 0.02, 0.04); h.add(ey); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0x000000 })); pu.position.set(0, 0, 0.013); ey.add(pu);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), nk); lid.position.copy(ey.position); lid.rotation.x = -0.9; h.add(lid); }
    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.03, 0.16, 2, 0.01), new THREE.MeshStandardMaterial({ color: 0x4a505a })); tail.position.set(0, 0.12, -0.2); tail.rotation.x = 0.3; pigeon.add(tail);
    for (const sx of [-1, 1]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), new THREE.MeshStandardMaterial({ color: 0xd86a6a })); lg.position.set(sx * 0.04, 0.03, 0); pigeon.add(lg); }
    pigeon.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(pigeon); }
  const PGX = SHX + 0.6, PGY = 0.15 + 2.61, PGZ = SHZ + 0.6;
  // the salesman and his rack of "I JUMPED" T-shirts
  const seller = makePerson(THREE, { shirt: 0x19a354, pants: 0x2b2f3a, hair: 0x1a1a1a, skin: 0x8d5a3b, seed: 12 }); seller.group.rotation.order = 'YXZ'; A.add(seller.group);
  const capM = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.6 })); capM.position.set(0, 0.2, 0); seller.headPivot.add(capM);
  const shirtTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(60, 20); g.lineTo(196, 20); g.lineTo(250, 70); g.lineTo(215, 105); g.lineTo(196, 90); g.lineTo(196, 250); g.lineTo(60, 250); g.lineTo(60, 90); g.lineTo(41, 105); g.lineTo(6, 70); g.closePath(); g.fill();
    g.fillStyle = '#ff2a6a'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.fillText('I JUMPED', 128, 130); g.fillStyle = '#1d5f99'; g.font = `800 20px ${FONT}`; g.fillText('8 BILLION TOUR', 128, 165); g.fillText('NOV 16', 128, 192); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const shirtMat = new THREE.MeshBasicMaterial({ map: shirtTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  const SLX = -3.9, SLZ = -3.6;
  { const rk = new THREE.Group(); rk.position.set(SLX - 0.3, 0.15, SLZ - 1.4); const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), dark); bar.rotation.x = Math.PI / 2; bar.position.y = 1.55; rk.add(bar);
    for (const dz of [-0.8, 0.8]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.55, 8), dark); p.position.set(0, 0.78, dz); rk.add(p); }
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), shirtMat); s.position.set(0.05 * k, 1.2, -0.6 + k * 0.3); s.rotation.y = Math.PI / 2 - 0.15; rk.add(s); }
    const sgn = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.32), new THREE.MeshBasicMaterial({ map: signTex('$20', '#ffd23f', '#111', 256, 116), toneMapped: false })); sgn.position.set(0.05, 1.82, 0); sgn.rotation.y = Math.PI / 2; rk.add(sgn);
    rk.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(rk); }
  const heldShirt = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.66), shirtMat); A.add(heldShirt);
  // contact shadows under the hero cast (so the gap under the feet reads in every shot)
  const blobM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });
  const blobs = [P, reader, seller].map(() => { const b = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20).rotateX(-Math.PI / 2), blobM); A.add(b); return b; });
  // the scoop's splat on the bench
  const splat = new THREE.Mesh(new THREE.CircleGeometry(0.09, 18).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6b3a22, roughness: 0.4 })); splat.visible = false; A.add(splat);

  // ---------------- space: the hovering planet ----------------
  const B = new THREE.Scene(); const camB = new THREE.PerspectiveCamera(36, W / H, 10, 3e5);
  const sunB = new THREE.DirectionalLight(0xffffff, 2.8); sunB.position.set(1, 0.3, 0.45); B.add(sunB); B.add(new THREE.AmbientLight(0x4a5468, 0.5)); B.add(stars(THREE, 3500, 90000, 16));
  const RE = 6371; const earthG = makeEarth(THREE, RE, 21); B.add(earthG);
  // people over every continent: points on land, lifted (height exaggerated, labelled as such)
  const landPts = []; { const img = earthG.userData.earth.material.map.image; const gx = img.getContext('2d').getImageData(0, 0, 1024, 512).data;
    for (let k = 0; k < 9000; k++) { const px = Math.floor(R() * 1024), py = 40 + Math.floor(R() * 432); const i4 = (py * 1024 + px) * 4; if (!(gx[i4 + 1] > gx[i4 + 2] + 10)) continue;
      const phi = px / 1024 * Math.PI * 2, th = py / 512 * Math.PI; landPts.push([-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)]); } }
  const lpPos = new Float32Array(landPts.length * 3); const lpG = new THREE.BufferGeometry(); lpG.setAttribute('position', new THREE.BufferAttribute(lpPos, 3));
  const lpts = new THREE.Points(lpG, new THREE.PointsMaterial({ map: softTex(THREE), color: 0xffc860, size: 240, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); lpts.frustumCulled = false; earthG.add(lpts);
  const EQ = new THREE.Quaternion(); { const cen = new THREE.Vector3(); landPts.forEach(p => cen.add(tv.set(...p))); cen.normalize(); EQ.setFromUnitVectors(cen, new THREE.Vector3(0.05, 0.25, 1).normalize()); }
  function setLift(h) { landPts.forEach((p, k) => lpPos.set([p[0] * RE * (1.004 + h), p[1] * RE * (1.004 + h), p[2] * RE * (1.004 + h)], k * 3)); lpG.attributes.position.needsUpdate = true; }
  // the ISS (about 400 km up)
  const iss = new THREE.Group(); { const pm = new THREE.MeshStandardMaterial({ color: 0x2a3f7a, roughness: 0.3, metalness: 0.6, emissive: 0x0a1430 }), wm = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.4 });
    const tr = new THREE.Mesh(new THREE.BoxGeometry(110, 4, 4), wm); iss.add(tr); for (const x of [-48, -30, 30, 48]) for (const z of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 34), pm); p.position.set(x, 0, z * 20); iss.add(p); }
    const mod = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 50, 12), wm); mod.rotation.x = Math.PI / 2; iss.add(mod); iss.scale.setScalar(1.0); const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: 0xfff6dd, blending: THREE.AdditiveBlending, depthWrite: false })); glint.scale.setScalar(5); iss.add(glint); B.add(iss); }

  await document.fonts.ready;

  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.25, bloomThreshold: 0.92, shake: 0, flash: 0, t, env: 0.45, exposure: 1.18, sat: 1.3 };
    const story = clamp((t - EV) / SLOW, 0, AIR); out.story = story;
    const tm = t < EV ? t : t < RET ? EV + story : EV + AIR + (t - RET);       // world clock (bullet time inside)
    const ts = t >= EV && t < RET ? story : -1;
    const back = t >= RET ? t - RET : -1;
    const Y = jumpY(ts);                                                       // everyone's height above the ground
    // everyone dips before the jump and absorbs the landing
    const crouch = t < EV ? smooth(6.35, 6.85, t) * (1 - smooth(6.85, 7.0, t) * 0.7) : t >= RET ? Math.max(0, Math.sin(clamp(back / 0.45) * Math.PI)) : 0;

    // ---- traffic + crowds (bullet time with the world clock) ----
    C.cars.forEach((c, i) => { const z = c.still ? c.z0 : wrap(c.z0 + c.sp * tm, -250, 254); m4.compose(v.set(c.x, 0.02, z), q.setFromEuler(e.set(0, c.ry, 0)), sc.set(1, 1, 1)); C.carB.setMatrixAt(i, m4); C.carT.setMatrixAt(i, m4); C.carL.setMatrixAt(i, m4); });
    C.carB.instanceMatrix.needsUpdate = C.carT.instanceMatrix.needsUpdate = C.carL.instanceMatrix.needsUpdate = true;
    C.peds.forEach((p, i) => { const z = wrap(p.z0 + p.dir * p.sp * tm, -200, 200); const walking = ts < 0; const y = 0.15 + Y - 0.1 * crouch + (walking ? Math.abs(Math.sin(tm * 8 + p.ph)) * 0.05 : 0);
      m4.compose(v.set(p.x, y, z), q.setFromEuler(e.set(0, p.dir > 0 ? 0 : Math.PI, 0)), sc.set(p.s, p.s * (1 - 0.08 * crouch), p.s)); C.pB.setMatrixAt(i, m4); C.pH.setMatrixAt(i, m4); C.pL.setMatrixAt(i, m4);
      m4.compose(v.set(p.x, 0.162, z), q.identity(), sc.set(p.s * (1 - 0.35 * Y), 1, p.s * (1 - 0.35 * Y))); pS.setMatrixAt(i, m4); });
    C.pB.instanceMatrix.needsUpdate = C.pH.instanceMatrix.needsUpdate = C.pL.instanceMatrix.needsUpdate = pS.instanceMatrix.needsUpdate = true;
    crowd.forEach((p, k) => { const y = p.y + Y * (1 + p.d * 4) - 0.1 * crouch; m4.compose(v.set(p.x, y, p.z), q.setFromEuler(e.set(0, p.ry, 0)), sc.set(p.s, p.s * (1 - 0.08 * crouch), p.s)); crB.setMatrixAt(k, m4); crH.setMatrixAt(k, m4); });
    crB.instanceMatrix.needsUpdate = crH.instanceMatrix.needsUpdate = true;
    SL.update(tm, { look: 0, stop: ts >= 0 ? 1 : 0 });
    slPeople.forEach(g => { g.position.y += Y - 0.08 * crouch; if (ts >= 0) { g.rotation.x = 0; } });

    // ---- hero: holding the cone, the crouch, the jump, the landing, the slow slide of the top scoop ----
    const Gp = P.group; Gp.position.set(HX, 0.15 + Y - 0.14 * crouch, HZ); let ry = Math.PI / 2 - 0.35;
    P.torso.rotation.set(0.35 * crouch, 0, 0); P.legL.rotation.set(-0.5 * crouch, 0, -0.05); P.legR.rotation.set(-0.5 * crouch, 0, 0.05);
    let aR = [-1.45, 0.1, -0.38], aL = [-0.15, 0, -0.12], head = [0.1, 0, 0];
    if (t < EV) { const lick = pulse(t, 1.6, 0.9); head = [0.25 * lick + 0.1, -0.2 * lick, 0]; aR = [-1.45 - 0.3 * lick, 0.1, -0.38 - 0.1 * lick]; aL = [-0.15 + 0.9 * crouch, 0, -0.12]; ry += 0.25 * Math.sin(t * 0.6) * (1 - crouch); }
    else if (t < RET) { const up = smooth(0, 0.12, story), fall = smooth(0.42, 0.6, story);
      P.legL.rotation.set(0.45 * up - 0.2 * fall, 0, -0.08); P.legR.rotation.set(-0.35 * up + 0.1 * fall, 0, 0.08); aL = [lerp(-2.7, -1.0, fall) * up, 0, -0.35 * up]; aR = [-1.5 + 0.1 * Math.sin(story * 20), 0.1, -0.38]; head = [-0.15 * up + 0.3 * fall, 0, 0]; }
    else { const relief = smooth(0.5, 1.0, back), slide = smooth(2.3, 2.7, back), sad = smooth(3.4, 4.0, back);
      aL = [-0.3 - 0.8 * crouch, 0, -0.2]; aR = [-1.45 - 0.15 * relief + 0.25 * slide, 0.1, -0.38 + 0.3 * slide]; head = [0.1 + 0.3 * sad, -0.35 * slide * (1 - sad) + 0.4 * sad, 0]; ry -= 0.3 * sad; }
    Gp.rotation.set(0, ry, 0); P.armL.rotation.set(...aL); P.armR.rotation.set(...aR); P.headPivot.rotation.set(...head);
    setFace(P, t < EV ? (t > 6.2 ? { brows: 'angry', eyes: 0.85, mouth: 'grit', look: [0, 0] } : t > 1.6 && t < 2.5 ? { brows: 'up', eyes: 0.6, mouth: 'smile', look: [0, -0.6] } : { brows: 'neutral', eyes: 1.05, mouth: 'smile', look: [0.3, -0.4] })
      : t < RET ? (story < 0.4 ? { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.5, look: [0, 0.5] } : { brows: 'worried', eyes: 1.4, mouth: 'o', look: [0, -0.8] })
        : back < 2.3 ? { brows: 'up', eyes: 1.1, mouth: 'smile', look: [0, -0.8] } : back < 3.4 ? { brows: 'up', eyes: 1.6, mouth: 'o', look: [-0.6, -1] } : { brows: 'worried', eyes: 0.8, mouth: 'flat', look: [-0.5, -0.8] });
    life(P, tm, t >= EV && t < RET ? 0.3 : 0.8);
    Gp.updateMatrixWorld(true); P.armR.userData.end.getWorldPosition(tv);
    coneG.position.set(tv.x, tv.y + 0.02, tv.z); coneG.rotation.set(0, 0, 0.08);
    const sp = [0, 1, 2].map(i => [tv.x, tv.y + 0.235 + i * 0.085, tv.z]);
    if (t >= EV && t < RET) { sp[2][1] += 0.006 * Math.sin(smooth(0, AIR, story) * Math.PI); sp[1][1] += 0.003 * Math.sin(smooth(0, AIR, story) * Math.PI); }
    if (back >= 0) { sp[2][1] -= 0.02 * crouch; }      // squashed by the landing
    // the top scoop: wobbles, slides (back 2.3-2.7), falls onto the bench next to Mittens (lands at back 3.25)
    const SLIDE = 2.3, DROP = 2.7, HIT = 3.25; const benchP = [MX + 0.05, BENCH_Y + 0.05, MZ + 0.55];
    if (back >= SLIDE && back < DROP) { const u = smooth(SLIDE, DROP, back); sp[2][0] += 0.05 * u; sp[2][1] -= 0.03 * u; sp[2][2] -= 0.04 * u; }
    if (back >= DROP) { const u = clamp((back - DROP) / (HIT - DROP)); const s0 = [tv.x + 0.05, tv.y + 0.235 + 0.17 - 0.03, tv.z - 0.04];
      if (u < 1) { sp[2] = [lerp(s0[0], benchP[0], u), lerp(s0[1], benchP[1], u) + 0.25 * Math.sin(Math.PI * u) * 0.4 - 0.0, lerp(s0[2], benchP[2], u)]; } else sp[2] = benchP.slice(); }
    scoops.forEach((s, i) => { s.position.set(...sp[i]); if (i === 2) { s.rotation.set(back >= DROP ? (back - DROP) * 9 * (back < HIT ? 1 : 0) : 0, 0, 0); s.scale.set(1, back >= HIT ? 0.62 : 1, 1); } });
    splat.visible = back >= HIT; splat.position.set(benchP[0], BENCH_Y + 0.01, benchP[2]); splat.scale.setScalar(back >= HIT ? 1 - 0.4 * smooth(HIT + 1.0, HIT + 3.5, back) : 1);
    out.scoop = sp[2]; out.hand = [tv.x, tv.y, tv.z];

    // ---- the reader: jumps without looking up, turns a page mid-air ----
    { const R0 = reader; R0.group.position.set(RDX, 0.15 + Y - 0.12 * crouch, RDZ); R0.group.rotation.set(0, Math.PI / 2 - 0.3, 0); R0.torso.rotation.set(0.25 * crouch, 0, 0);
      R0.legL.rotation.set(-0.45 * crouch + (ts >= 0 ? 0.2 : 0), 0, -0.04); R0.legR.rotation.set(-0.45 * crouch - (ts >= 0 ? 0.15 : 0), 0, 0.04);
      R0.armL.rotation.set(-1.15, 0, 0.35); R0.armR.rotation.set(-1.15, 0, -0.35); R0.headPivot.rotation.set(0.4, 0, 0);
      setFace(R0, { brows: 'neutral', eyes: 0.55, mouth: 'flat', look: [0, -1] }); life(R0, tm, 0.5, { noBlink: false });
      R0.group.updateMatrixWorld(true); R0.armL.userData.end.getWorldPosition(tv); R0.armR.userData.end.getWorldPosition(tv2);
      paper.position.set((tv.x + tv2.x) / 2, (tv.y + tv2.y) / 2 + 0.16, (tv.z + tv2.z) / 2); paper.rotation.set(0, Math.PI / 2 - 0.3, 0); paper.rotateX(-0.5);
      const turn = t >= EV ? smooth(10.3, 11.6, t) : 0; paper.userData.page.rotation.y = -Math.PI * turn; paper.userData.page.position.z = 0.004;
      out.reader = [RDX, 1.6 + Y, RDZ]; }
    // ---- the salesman: arranging shirts; after landing, already holding one up ----
    { const S0 = seller; const walkIn = back >= 0 ? smooth(0.9, 3.0, back) : 0, wk = back > 0.9 && back < 3.0 ? 1 : 0; S0.group.position.set(SLX + 0.6 * walkIn, 0.15 + Y - 0.12 * crouch + 0.04 * wk * Math.abs(Math.sin(back * 8)), lerp(SLZ, -6.7, walkIn)); const sell = back >= 0 ? smooth(1.2, 1.8, back) : 0;
      S0.group.rotation.set(0, lerp(-Math.PI / 2 - 0.4, Math.PI / 2 + 0.5, sell) - 0.9 * wk * (1 - smooth(2.6, 3.0, back)), 0); S0.torso.rotation.set(0.25 * crouch, 0, 0); S0.legL.rotation.set(-0.45 * crouch + (ts >= 0 ? 0.25 : 0) + 0.45 * wk * Math.sin(back * 8), 0, -0.04); S0.legR.rotation.set(-0.45 * crouch - 0.45 * wk * Math.sin(back * 8), 0, 0.04);
      const fold = Math.sin(tm * 3) * 0.2; S0.armL.rotation.set(lerp(-0.9 + fold, -2.7, sell), 0, lerp(0.2, -0.25, sell)); S0.armR.rotation.set(lerp(-0.9 - fold, -2.7, sell), 0, lerp(-0.2, 0.25, sell)); S0.headPivot.rotation.set(lerp(0.3, -0.1, sell), 0, 0);
      setFace(S0, ts >= 0 ? { brows: 'up', eyes: 1.4, mouth: 'open', open: 1.2 } : sell > 0.5 ? { brows: 'up', eyes: 1.2, mouth: 'smile', look: [0.3, 0] } : { brows: 'neutral', eyes: 0.9, mouth: 'flat', look: [0, -0.6] }); life(S0, tm, 0.7);
      S0.group.updateMatrixWorld(true); S0.armL.userData.end.getWorldPosition(tv); S0.armR.userData.end.getWorldPosition(tv2);
      heldShirt.visible = sell > 0.05; heldShirt.position.set((tv.x + tv2.x) / 2, (tv.y + tv2.y) / 2 - 0.3, (tv.z + tv2.z) / 2); heldShirt.rotation.set(0, Math.PI / 2 + 0.3, 0); }
    // contact shadows
    [[HX, HZ], [RDX, RDZ], [seller.group.position.x, seller.group.position.z]].forEach(([x, z], k) => { const b = blobs[k]; const yy = [Gp, reader.group, seller.group][k].position.y - 0.15; b.position.set(x + 0.05, 0.163, z); b.scale.setScalar(1 - 0.45 * yy); });

    // ---- Mittens (did not jump): bored -> unimpressed -> annoyed -> shock at the thud -> happy with the scoop -> smug ----
    { let mood = 'neutral', my = BENCH_Y, mry = Math.PI / 2 - 0.5, mrx = 0;
      if (t < EV) { mood = t > 1.4 && t < 4.5 ? 'happy' : 'sleepy'; mry += 0.2 * Math.sin(t * 0.8); }
      else if (t < RET) { mood = t < 13.2 ? 'unimpressed' : t < 16.0 ? 'unimpressed' : t < 26 ? 'annoyed' : 'unimpressed'; mry = Math.PI / 2 - 0.15; }
      else { mood = back < 0.9 ? 'shock' : back < HIT + 0.2 ? 'annoyed' : back < HIT + 1.3 ? 'happy' : 'smug';
        const hop = back < 0.6 ? Math.sin(clamp(back / 0.6) * Math.PI) * 0.12 : 0; my += hop; mry = back > HIT ? 0.25 : Math.PI / 2 - 0.15; mrx = back > HIT + 0.6 ? 0.35 + 0.12 * Math.sin(back * 9) : 0; }
      mittens.position.set(MX, my, MZ); mittens.rotation.set(mrx, mry, 0); setCatFace(mittens, mood, 0.25); catLife(mittens, t, 1);
      const Cc = mittens.userData.cat; if (back > HIT + 0.6) { Cc.mouthO.visible = Math.sin(back * 9) > 0.2; Cc.mouth.visible = !Cc.mouthO.visible; Cc.smile.visible = false; }
      out.cat = [MX, my + 0.45, MZ]; }
    // ---- the pigeon (did not jump either): head bobs, then a long slow judging turn ----
    { const turn = t >= EV ? smooth(16.0, 17.2, t) : 0; pigeon.position.set(PGX, PGY, PGZ); pigeon.rotation.set(0, Math.PI / 2 + 0.3 - 1.9 * turn + (back > 0 ? 1.2 * smooth(0, 0.3, back) : 0), 0);
      pigeon.userData.head.position.z = 0.12 + (t < EV || back > 0 ? 0.03 * Math.sin(tm * 9) : 0); pigeon.userData.head.rotation.x = back > 0 ? -0.2 : 0.15; }

    // ---------------- camera: one continuous move, three cuts ----------------
    let c, g, fov = 42, shC = [HX + 1, HZ - 2, 14], focusY = 0.56, focusH = 0.2, scene = A, camera = cam, dof = 0.55;
    if (t < EV) {                                         // 1. from the curb: you with the cone, the reader, Mittens, the shops behind
      const u = easeInOut(t / EV); c = [lerp(7.4, 6.6, u), lerp(2.9, 2.6, u), lerp(-0.6, -2.0, u)]; g = [lerp(HX + 0.8, HX + 0.6, u), lerp(1.0, 1.0, u), lerp(HZ - 1.6, HZ - 1.2, u)]; fov = lerp(46, 40, u); focusY = 0.58; focusH = 0.26;
    } else if (t < 12.8) {                               // 2. drop to the pavement: feet off the ground, then glide along to the reader
      const u1 = easeInOut(smooth(7.0, 9.0, t)), u2 = easeInOut(smooth(9.6, 12.4, t));
      const cA = [6.6, 2.6, -2.0], cB = [0.5, 0.38, -4.6], cC = [2.4, 1.3, -11.3];
      c = u2 > 0 ? [lerp(cB[0], cC[0], u2), lerp(cB[1], cC[1], u2), lerp(cB[2], cC[2], u2)] : [lerp(cA[0], cB[0], u1), lerp(cA[1], cB[1], u1), lerp(cA[2], cB[2], u1)];
      const gA = [HX + 0.6, 1.0, HZ - 1.2], gB = [HX + 0.1, 0.75, HZ - 0.4], gC = [RDX, 0.95, RDZ + 0.1];
      g = u2 > 0 ? [lerp(gB[0], gC[0], u2), lerp(gB[1], gC[1], u2), lerp(gB[2], gC[2], u2)] : [lerp(gA[0], gB[0], u1), lerp(gA[1], gB[1], u1), lerp(gA[2], gB[2], u1)];
      fov = lerp(40, 44, u1); focusY = lerp(0.58, 0.6, u2); focusH = 0.26;
    } else if (t < 17.8) {                               // 3. cut: Mittens on the bench (did not jump), tilt up to the pigeon on the roof
      const u = easeInOut(smooth(13.0, 17.5, t)), up = easeInOut(smooth(15.7, 17.0, t));
      c = [MX + lerp(1.9, 1.6, u) + 1.0 * up, lerp(0.95, 1.05, u) + 1.9 * up, MZ + lerp(0.35, 0.2, u) + 0.3 * up]; g = [lerp(MX, PGX, up), lerp(BENCH_Y + 0.35, PGY + 0.2, up), lerp(MZ, PGZ, up)]; fov = lerp(36, 33, u); focusY = 0.56; focusH = 0.2; shC = [MX, MZ, 8];
    } else if (t < 27.0) {                               // 4. rise: the avenue full of hovering people, the rooftops, the Empire State Building
      const u1 = easeInOut(smooth(17.8, 22.0, t)), u2 = easeInOut(smooth(21.6, 26.6, t));
      const cA = [MX + 2.6, 2.95, MZ + 0.5], cB = [12, 34, 24], cC = [-40, 520, 260];
      c = u2 > 0 ? [lerp(cB[0], cC[0], u2), lerp(cB[1], cC[1], u2), lerp(cB[2], cC[2], u2)] : [lerp(cA[0], cB[0], u1), lerp(cA[1], cB[1], u1), lerp(cA[2], cB[2], u1)];
      const gA = [PGX, PGY + 0.2, PGZ], gB = [2, 0, -30], gC = [ESB[0], 330, ESB[1]];
      g = u2 > 0 ? [lerp(gB[0], gC[0], u2), lerp(gB[1], gC[1], u2), lerp(gB[2], gC[2], u2)] : [lerp(gA[0], gB[0], u1), lerp(gA[1], gB[1], u1), lerp(gA[2], gB[2], u1)];
      fov = lerp(40, 50, u1); shC = [lerp(0, 120, u2), lerp(-20, -260, u2), lerp(30, 520, u2)]; focusY = 0.55; focusH = lerp(0.25, 0.5, u1); dof = lerp(0.5, 0.2, u2);
    } else if (t < 33.4) {                               // 5. cut: space. the whole planet is hovering
      const u = (t - 27.0) / 6.4; const lift = easeOut(clamp(story / 0.25)) * (1 - smooth(0.45, 0.6, story)); setLift(0.006 + 0.03 * lift);
      earthG.quaternion.copy(EQ); earthG.rotateY(0.12 * u - 0.06); const d = lerp(44000, 38000, easeInOut(u));
      camB.position.set(1500, 3500 - 600 * u, d); camB.lookAt(0, 600, 0); camB.updateProjectionMatrix(); scene = B; camera = camB; dof = 0; out.bloom = 0.6; out.bloomThreshold = 0.6; out.env = 0; out.exposure = 1.1;
      const a = -0.5 + 0.25 * u; tv2.set(Math.sin(a) * 0.62, 0.62, Math.cos(a) * 0.62 + 0.3).normalize().multiplyScalar(RE + 410); iss.position.copy(tv2); iss.scale.setScalar(25); iss.rotation.set(0.3, a, 0.1);
      out.iss = iss.position.toArray();
    } else {                                             // 6. cut: back to you, coming down; the landing; the scoop; Mittens; the salesman
      const u = easeInOut(clamp((t - 33.4) / 3.6)), u2 = easeInOut(smooth(RET + 1.6, RET + 3.2, t)), u3 = easeInOut(smooth(RET + 5.2, RET + 6.4, t));
      const cA = [0.4, 0.55, -5.4], cB = [1.8, 1.5, -4.4], cC = [0.7, 1.25, -8.0], cD = [2.4, 1.65, -5.2];
      const k = t < RET + 1.6 ? null : 1;
      c = u3 > 0 ? [lerp(cC[0], cD[0], u3), lerp(cC[1], cD[1], u3), lerp(cC[2], cD[2], u3)] : u2 > 0 ? [lerp(cB[0], cC[0], u2), lerp(cB[1], cC[1], u2), lerp(cB[2], cC[2], u2)] : [lerp(cA[0], cB[0], u), lerp(cA[1], cB[1], u), lerp(cA[2], cB[2], u)];
      const gA = [HX, 0.7, HZ - 0.3], gB = [-2.1, 0.95, -9.0], gC = [MX - 0.1, 0.8, MZ + 0.3], gD = [-2.7, 1.1, -7.3];
      g = u3 > 0 ? [lerp(gC[0], gD[0], u3), lerp(gC[1], gD[1], u3), lerp(gC[2], gD[2], u3)] : u2 > 0 ? [lerp(gB[0], gC[0], u2), lerp(gB[1], gC[1], u2), lerp(gB[2], gC[2], u2)] : [lerp(gA[0], gB[0], u), lerp(gA[1], gB[1], u), lerp(gA[2], gB[2], u)];
      fov = lerp(42, 40, u) + 4 * u3; focusY = 0.58; focusH = 0.26;
    }
    if (scene === A) { if ((new URLSearchParams(location.search).get('dbg') || '').includes('V')) { c = [10, 20, 10]; g = [HX, 0, HZ]; fov = 60; }
      setShadow(...shC); cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix(); }
    out.scene = scene; out.camera = camera; out.dof = dof; out.focusY = focusY; out.focusH = focusH;
    out.flash = 0.18 * pulse(t, EV, 0.25) + 0.25 * pulse(t, RET, 0.3); out.shake = 0.45 * pulse(t, RET, 0.55);
    out.label = { esb: [ESB[0], 443, ESB[1]] };
    return out;
  }

  // ---------------- on-screen text ----------------
  const lines = [
    [0.3, 3.3, "You just bought a three-scoop ice cream. Don't drop it."],
    [3.35, 6.95, 'In a few seconds, every person on Earth jumps. At once.'],
    [7.3, 9.75, 'Eight billion people. All off the ground.'],
    [10.0, 12.7, 'The man next to you turns a page. Mid-air.'],
    [13.0, 15.95, 'Mittens did not jump. Mittens is not a person.'],
    [16.1, 17.6, 'Neither is the pigeon.'],
    [18.0, 22.65, 'Every street, every office, every rooftop. Nobody is touching the ground.'],
    [23.0, 26.9, "It's 3 a.m. in Tokyo. Someone had to wake them up for this."],
    [27.3, 29.65, 'From space, the whole planet is hovering.'],
    [30.0, 33.1, "The astronauts can't join in. They're already floating."],
    [33.6, 35.45, 'This was your idea, by the way.'],
    [37.3, 39.4, 'Eight billion people land at once.'],
    [39.6, 40.95, 'So does your top scoop.'],
    [41.4, 43.1, 'Mittens finally joins in.'],
    [43.6, 45.0, 'You had one job.'],
  ];
  const CARD_LINE = [45.9, 52.4, 'The strangest part? We all pushed the planet at once, and Earth moved less than a thousandth of the width of an atom.'];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function italic(ctx, W, H, t, a, b, txt, y = 0.70) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.3, (b - t) / 0.3));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 50px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * y + i * 64); ctx.fillText(l, W / 2, H * y + i * 64); }); ctx.restore(); }
  function worldLabel(ctx, pos, title, num, camO) { if (!pos) return; const cm = camO || cam; tv.set(pos[0], pos[1], pos[2]); cm.updateMatrixWorld(); tv.project(cm);
    if (tv.z > 1 || Math.abs(tv.x) > 0.9 || tv.y < -0.3 || tv.y > 0.85) return;
    const x = (tv.x * 0.5 + 0.5) * 1080, y = (1 - (tv.y * 0.5 + 0.5)) * 1920;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    const lx = Math.min(x + 14, 1080 - w - 24), ly = clamp(y, 560, 1150); ctx.translate(lx - (x + 14), ly - y);
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x + 14, y - 34, w, 68, 14); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 26, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 26, y + 16);
    ctx.strokeStyle = 'rgba(255,210,63,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke(); ctx.restore(); }
  function tag(ctx, x, y, title, num, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x, y - 34, w, 68, 14); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 12, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 12, y + 16); ctx.restore(); }

  function hud(ctx, t, st) { const W = 1080, H = 1920;
    if (t < CARDT) {
      drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF EVERYONE ON EARTH', size: 72 }, { text: 'JUMPED AT THE SAME TIME?', size: 84, accent: true }], t, '#ffd23f', { start: 0.3, outAt: 6.0 });
      const yC = lerp(H * 0.268, H * 0.105, smooth(6.0, 6.6, t)); const f3 = (x) => `0:0${Math.max(0, x).toFixed(3)}`;
      const o = t < EV ? { label: 'EVERYONE JUMPS IN', value: f3(EV - t), color: '#ffd23f' } : t < RET ? { label: 'EVERYONE LANDS IN', value: f3(AIR - st.story), color: '#ff7fb4' } : { label: 'EVERYONE', value: 'LANDED', color: '#ffd23f' };
      drawSideCounter(ctx, W, H, { y: yC, ...o, note: t < EV ? 'real time' : t < RET ? 'slow motion · 50x' : '', bump: Math.max(pulse(t, EV, 0.4), pulse(t, RET, 0.4)), glow: o.color });
      for (const [a, b, txt] of lines) italic(ctx, W, H, t, a, b, txt);
      if (t > 7.6 && t < 10.2) tag(ctx, 56, 470, 'EVERY PERSON ON EARTH', '8.2 billion · about 0.4 m up', smooth(7.6, 7.9, t) * (1 - smooth(9.9, 10.2, t)));
      if (t > 25.0 && t < 26.9) worldLabel(ctx, st.label.esb, 'EMPIRE STATE BUILDING', '443 m to the tip');
      if (t > 23.0 && t < 25.0) tag(ctx, 56, 470, 'TOKYO', '3:00 AM right now', smooth(23.0, 23.3, t) * (1 - smooth(24.7, 25.0, t)));
      if (t > 27.6 && t < 33.2) tag(ctx, 56, 1150, 'HEIGHT NOT TO SCALE', 'the real jump: about 0.4 m', smooth(27.6, 27.9, t) * (1 - smooth(32.9, 33.2, t)));
      if (t > 30.2 && t < 33.0 && st.iss) worldLabel(ctx, st.iss, 'INTERNATIONAL SPACE STATION', 'about 400 km up', camB);
    }
    if (t >= CARDT) { const a = smooth(CARDT, CARDT + 0.6, t); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `500 58px ${FS}`; ctx.fillText('What if everyone on Earth', W / 2, H * 0.32); ctx.fillStyle = '#ffd23f'; ctx.fillText('jumped at the same time?', W / 2, H * 0.32 + 76);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `600 23px ${FONT}`; ctx.fillText('8.2 BILLION PEOPLE  ·  ≈ 0.4 TRILLION kg  ·  EARTH ≈ 6 TRILLION TRILLION kg  ·  0.6 s IN THE AIR', W / 2, H * 0.32 + 160);
      ctx.restore();
      italic(ctx, W, H, t, CARD_LINE[0], CARD_LINE[1] + 1.2, CARD_LINE[2], 0.46);
      ctx.save(); ctx.globalAlpha = smooth(CARDT + 4.6, CARDT + 5.2, t); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.font = `italic 600 46px ${FS}`; ctx.fillText('What should we try next?', W / 2, H * 0.72); ctx.fillStyle = '#ffd23f'; ctx.font = `800 30px ${FONT}`; ctx.fillText('TELL US IN THE COMMENTS', W / 2, H * 0.72 + 66); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
