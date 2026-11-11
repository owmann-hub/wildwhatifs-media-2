import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, drawCaption, makeSkyDome, makeBurst, makeCat, makeShockwave, softTex, setFace, life, drawBubble, drawSideCounter, drawTitleTimed, drawTag, makeEarth, stars } from './lib.js';

// "What if gravity doubled for 5 seconds?" — format_v4 locked NYC look (based on nyc.js).
const TOTAL = 30.0, HOOK = 2.8, CARD = 3.4, T0 = 7.4, SLOW = 2.72, END = T0 + 5 * SLOW, LOOP = 29.4;
export const B = [0, 1, 2, 3, 4].map(s => T0 + s * SLOW);   // beat starts (world second 0..4)
const HX = -2.5, HZ0 = -8;
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
const FONT = '"Inter Display", Inter, sans-serif';
// hook shows world time T0+0.6.. slowed
const hookT = (t_) => T0 + 0.6 + t_ * 0.55;

export async function create({ THREE, W, H }) {
  const R = rng(77);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e5);
  A.fog = new THREE.FogExp2(0xbfd6ea, 0.00013);
  const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x6a6258, 1.0); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; A.add(sun, sun.target);
  const SUN = new THREE.Vector3(0.45, 0.8, -0.35).normalize();
  function setShadow(cx, cz, size) { sun.target.position.set(cx, 0, cz); sun.position.set(cx + SUN.x * 1500, SUN.y * 1500, cz + SUN.z * 1500); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 10; c.far = 3500; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 200 ? 2 : 0.05; }
  A.add(makeSkyDome(THREE, 0x3f86dc, 0xd4e6f5, [SUN.x, SUN.y, SUN.z]));

  // ---------------- the city ----------------
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshStandardMaterial({ color: 0x2f6587, roughness: 0.25, metalness: 0.3 })); water.rotation.x = -Math.PI / 2; water.position.y = -1.5; A.add(water);
  const I0 = -6, I1 = 5, J0 = -22, J1 = 24;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1224, 2, 2838), new THREE.MeshStandardMaterial({ color: 0x3c3e44, roughness: 0.95 })); slab.position.set(10, -1, 97); slab.receiveShadow = true; A.add(slab);
  const U = { uO: { value: new THREE.Vector2(HX, HZ0) }, uBreak: { value: 0 }, uK: { value: 0.5 } };
  const bMat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 });
  bMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vOn = normal; vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\n vWp = (modelMatrix * wp4).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn; uniform vec2 uO; uniform float uBreak; uniform float uK;').replace('#include <color_fragment>', `#include <color_fragment>
      if (abs(vOn.y) < 0.5) { float uu = abs(vOn.x) > 0.5 ? vWp.z : vWp.x; vec2 c = vec2(uu / 3.2, vWp.y / 3.6); vec2 f = fract(c); vec2 id = floor(c);
        float hh = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
        float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.8);
        vec3 glass = mix(vec3(0.08, 0.13, 0.2), vec3(0.5, 0.68, 0.85), hh * hh);
        if (vWp.y < 4.8) { float fy = vWp.y / 4.8; win = step(0.06, f.x) * step(f.x, 0.94) * step(0.12, fy) * step(fy, 0.78); glass = mix(vec3(1.0, 0.86, 0.55), vec3(0.16, 0.2, 0.26), step(0.55, hh)); }
        float d = distance(vWp.xz, uO); float broken = step(d + vWp.y * uK, uBreak) * step(0.2, hh);
        glass = mix(glass, vec3(0.015, 0.015, 0.02), broken);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, win); }`); };
  const pal = [0x9a5b46, 0xb08968, 0xc9b79c, 0x8d8f94, 0xa39a8c, 0xd9d2c5, 0x7c4a3a, 0xb7a58f], glassPal = [0x4a5f74, 0x6f8fa8, 0x55707f, 0x8aa6b8, 0x3f4d5c];
  const blds = [], walks = [], parks = [], tanks = [], spires = [];
  const inPark = (i, j) => i >= 0 && i <= 2 && j >= 9 && j <= 20;
  for (let i = I0; i <= I1; i++) for (let j = J0; j <= J1; j++) {
    const bx0 = 100 * i + 20, bz0 = 60 * j + 14, cx = bx0 + 40, cz = bz0 + 23;
    if (inPark(i, j)) { parks.push([cx, cz]); continue; }
    walks.push([cx, cz]);
    const mid = Math.abs(cz) < 520 && Math.abs(cx - 10) < 380, down = cz < -850, nearPark = i >= -1 && i <= 3 && j >= 8 && j <= 21;
    const n = R() < 0.45 ? 2 : 3; let x = bx0 + 5; const wTot = 70 - (n - 1);
    const cuts = []; for (let k = 0; k < n; k++) cuts.push(0.7 + R()); const sum = cuts.reduce((a, b) => a + b, 0);
    for (let k = 0; k < n; k++) { const w = wTot * cuts[k] / sum; const r = R();
      let h = mid ? 70 + 190 * r * r : down ? 60 + 210 * r * r : nearPark ? 40 + 70 * r : 22 + 50 * r;
      if (i === -1 && j === -1) h = 55 + 20 * r; if (i === 0 && j === 0 && k === 0) h = 210; if (i === 0 && j === -1 && k === 0) h = 150; if (i === -1 && j === 0) h = 120 + 60 * r;
      const glassy = h > 110 && R() < 0.75; const c = glassy ? glassPal[Math.floor(R() * glassPal.length)] : pal[Math.floor(R() * pal.length)];
      const d = 36 - (R() < 0.3 ? 6 : 0);
      blds.push([x + w / 2, 0.15, cz, w, h, d, c]);
      if (h > 150) { blds.push([x + w / 2, 0.15 + h, cz, w * 0.62, h * 0.22, d * 0.62, c]); if (h > 236) spires.push([x + w / 2, 0.15 + h * 1.22, cz, h * 0.13]); }
      else if (h < 80 && Math.abs(cx) < 500 && Math.abs(cz) < 500 && R() < 0.6) tanks.push([x + w / 2 + (R() - 0.5) * w * 0.4, 0.15 + h, cz + (R() - 0.5) * 14]);
      x += w + 1; }
  }
  // far shores (low-rise boroughs across the rivers)
  const shoreM = new THREE.MeshStandardMaterial({ color: 0x56605a, roughness: 1 });
  for (const [x0, x1] of [[1000, 6000], [-6000, -960]]) { const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 2, 9000), shoreM); s.position.set((x0 + x1) / 2, -1, 0); s.receiveShadow = true; A.add(s);
    for (let k = 0; k < 420; k++) { const bx = x0 + 30 + R() * R() * 2200 * (x0 > 0 ? 1 : 0) + (x0 < 0 ? (x1 - x0 - 30 - R() * R() * 2200) : 0), bz = -3000 + R() * 6000; const r = R(); blds.push([bx, 0, bz, 30 + R() * 40, 10 + 55 * r * r * r + (R() < 0.04 ? 80 : 0), 30 + R() * 30, pal[Math.floor(R() * pal.length)]]); } }
  const boxG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const bMesh = new THREE.InstancedMesh(boxG, bMat, blds.length);
  blds.forEach(([x, y, z, w, h, d, c], k) => { m4.compose(v.set(x, y, z), q.identity(), sc.set(w, h, d)); bMesh.setMatrixAt(k, m4); bMesh.setColorAt(k, col.set(c)); });
  bMesh.castShadow = bMesh.receiveShadow = true; bMesh.frustumCulled = false; A.add(bMesh);
  const wMesh = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0xb9b5ac, roughness: 0.95 }), walks.length);
  walks.forEach(([x, z], k) => { m4.compose(v.set(x, 0, z), q.identity(), sc.set(80, 0.15, 46)); wMesh.setMatrixAt(k, m4); }); wMesh.receiveShadow = true; wMesh.frustumCulled = false; A.add(wMesh);
  const spM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.4, metalness: 0.5 }), Math.max(1, spires.length));
  spires.forEach(([x, y, z, h], k) => { m4.compose(v.set(x, y, z), q.identity(), sc.set(h * 0.25, h, h * 0.25)); spM.setMatrixAt(k, m4); }); spM.castShadow = true; spM.frustumCulled = false; A.add(spM);
  const tkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.6, 1.6, 3.4, 8).translate(0, 3.2, 0), new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.9, flatShading: true }), Math.max(1, tanks.length));
  tanks.forEach(([x, y, z], k) => { m4.compose(v.set(x, y, z), q.identity(), sc.set(1, 1, 1)); tkM.setMatrixAt(k, m4); }); tkM.castShadow = true; tkM.frustumCulled = false; A.add(tkM);
  const tkR = new THREE.InstancedMesh(new THREE.ConeGeometry(1.85, 1.3, 8).translate(0, 5.55, 0), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.9, flatShading: true }), Math.max(1, tanks.length)); tkR.castShadow = true; tkR.frustumCulled = false; A.add(tkR);
  const tkL = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.25, 1.25, 1.5, 4, 1, true).translate(0, 0.75, 0), new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide, wireframe: true }), Math.max(1, tanks.length)); tkL.frustumCulled = false; A.add(tkL);
  // the big park
  { const lawn = new THREE.Mesh(new THREE.BoxGeometry(300, 0.3, 734), new THREE.MeshStandardMaterial({ color: 0x4f8f3f, roughness: 1 })); lawn.position.set(160, 0, 60 * 9 + 367); lawn.receiveShadow = true; A.add(lawn);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(48, 24), new THREE.MeshStandardMaterial({ color: 0x3b7ea8, roughness: 0.2 })); pond.rotation.x = -Math.PI / 2; pond.position.set(170, 0.2, 900); pond.scale.set(1, 1.8, 1); A.add(pond);
    const nT = 420; const tr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1).translate(0, 1.3, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), nT);
    for (let k = 0; k < nT; k++) { let x, z; do { x = 15 + R() * 290; z = 545 + R() * 724; } while (Math.hypot((x - 170), (z - 900) / 1.8) < 52); const s = 4 + R() * 4; m4.compose(v.set(x, 0, z), q.identity(), sc.set(s, s * 1.2, s)); tr.setMatrixAt(k, m4); tr.setColorAt(k, col.setHSL(0.26 + R() * 0.07, 0.5, 0.24 + R() * 0.12)); }
    tr.castShadow = true; tr.frustumCulled = false; A.add(tr); }
  // suspension bridge on the east river
  { const bm = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.8 }); const deck = new THREE.Mesh(new THREE.BoxGeometry(400, 2.5, 18), bm); deck.position.set(810, 40, -950); deck.castShadow = true; A.add(deck);
    for (const x of [720, 900]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(12, 100, 22), bm); tw.position.set(x, 48, -950); tw.castShadow = true; A.add(tw); }
    for (const z of [-958, -942]) { const curve = new THREE.CatmullRomCurve3([[612, 41], [720, 97], [810, 50], [900, 97], [1008, 41]].map(([x, y]) => new THREE.Vector3(x, y, z))); A.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.7, 5), bm)); } }
  // statue on its own island in the harbour
  const STAT = [-185, -2300];
  { const g = new THREE.Group(); g.position.set(STAT[0], 0, STAT[1]); const stone = new THREE.MeshStandardMaterial({ color: 0xb9ab95, roughness: 0.9, flatShading: true }), green = new THREE.MeshStandardMaterial({ color: 0x63ab95, roughness: 0.7, flatShading: true });
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(70, 76, 4, 20), new THREE.MeshStandardMaterial({ color: 0x5d8a4a, roughness: 1 })); isl.position.y = 0; g.add(isl);
    const star = new THREE.Mesh(new THREE.CylinderGeometry(34, 36, 8, 11), stone); star.position.y = 6; g.add(star);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(20, 40, 20), stone); ped.position.y = 30; g.add(ped);
    const body = new THREE.Mesh(new THREE.ConeGeometry(9, 38, 9), green); body.position.y = 69; g.add(body);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 1), green); head.position.y = 88; g.add(head);
    for (let k = 0; k < 7; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.6, 4.5, 4), green); const a = -1.2 + k * 0.4; sp.position.set(Math.sin(a) * 3.4, 90.5 + Math.cos(a) * 2.2, 0); sp.rotation.z = -a; g.add(sp); }
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 20, 6), green); arm.position.set(5.5, 92, 0); arm.rotation.z = -0.22; g.add(arm);
    const torch = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 0), new THREE.MeshBasicMaterial({ color: 0xffd060 })); torch.position.set(7.8, 103.5, 0); g.add(torch);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); }
  // ---------------- street level around the hero ----------------
  const white = new THREE.MeshBasicMaterial({ color: 0xe9e9e4 });
  { const marks = []; for (const x of [5, 10, 15]) for (let z = -300; z < 300; z += 9) { if (wrap(z, 0, 60) < 15) continue; marks.push([x, z + 2, 0.22, 3.2]); }
    for (const zc of [-58.5, -47.5, 1.5, 12.5, 61.5, 72.5]) for (let x = 1.5; x < 19; x += 1.7) marks.push([x, zc, 0.8, 2.6]);
    for (const xc of [-1.6, 21.6]) for (let z = 1.5; z < 13; z += 1.7) marks.push([xc, z, 2.6, 0.8]);
    const mk = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), white, marks.length); marks.forEach(([x, z, w, l], k) => { m4.compose(v.set(x, 0.02, z), q.identity(), sc.set(w, 1, l)); mk.setMatrixAt(k, m4); }); mk.frustumCulled = false; A.add(mk); }
  const dark = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.4 });
  function trafficLight(x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0.15, z); g.rotation.y = ry; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 6.2, 8), dark); pole.position.y = 3.1; g.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.5, 6), dark); arm.rotation.z = Math.PI / 2; arm.position.set(2.75, 6.0, 0); g.add(arm);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.15, 0.35), new THREE.MeshStandardMaterial({ color: 0xd8a514, roughness: 0.6 })); box.position.set(4.9, 5.35, 0); g.add(box);
    [[0xff3b30, 0.36], [0xffcc00, 0], [0x34d058, -0.36]].forEach(([c, y], k) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: k === 2 ? c : new THREE.Color(c).multiplyScalar(0.25) })); l.position.set(4.9, 5.35 + y, 0.19); g.add(l); });
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); return g; }
  trafficLight(-1.2, -1.0, 0); trafficLight(21.2, 15, Math.PI); trafficLight(-1.2, -61, 0); trafficLight(21.2, 75, Math.PI);
  { const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xc8281e, roughness: 0.5 })); hyd.position.set(-0.7, 0.5, -11.5); hyd.castShadow = true; A.add(hyd); }
  // billboards
  function board(text, bg, fg, x, y, z, w, h, ry) { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ls = text.split('|'); let fs = c.height / ls.length * 0.72; g.font = `900 ${fs}px ${FONT}`; const mw = Math.max(...ls.map(l => g.measureText(l).width)); if (mw > c.width * 0.9) { fs *= c.width * 0.9 / mw; g.font = `900 ${fs}px ${FONT}`; }
    ls.forEach((l, k) => g.fillText(l, c.width / 2, c.height * (k + 0.5) / ls.length)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = ry; A.add(m);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, h + 0.6, 0.3), dark); fr.position.set(x, y, z); fr.rotation.y = ry; fr.translateZ(-0.2); A.add(fr); }
  await document.fonts.ready;
  board('HOT DOGS|$2', '#e8262a', '#fff3c4', 24.7, 13, 30, 14, 9, -Math.PI / 2);
  board('WOW!', '#ffd400', '#111', 24.7, 26, 30, 14, 12, -Math.PI / 2);
  board('BIG CITY|NEWS', '#0b3a8f', '#ffffff', -5.3 + 0.6, 16, 30, 13, 9, Math.PI / 2);
  board('PIZZA', '#19a354', '#ffffff', -4.7, 30, 48, 13, 7, Math.PI / 2);
  board('TAXI!', '#111', '#ffd400', 24.7, 11, -22, 12, 6, -Math.PI / 2);
  board('HEAVY|COLA', '#b3122f', '#ffffff', 24.7, 24, 80, 16, 11, -Math.PI / 2);
  // taxis & cars on the avenue (one-way uptown) + queues at the red light
  const NC = 90, cars = []; for (let k = 0; k < NC; k++) { if (k < 84) { const ln = k % 4, ix = Math.floor(k / 4); cars.push({ x: [3.4, 7.8, 12.2, 16.6][ln], z0: -250 + (ix + R() * 0.45) * 24, sp: ln === 0 ? 1.2 : 8 + R() * 3, ry: 0, c: R() < 0.72 ? 0xf5c518 : [0x1d1f22, 0xf2f2f2, 0x2d6fd6, 0xb3261e][Math.floor(R() * 4)] }); }
    else { const e2 = k % 2; const n = Math.floor((k - 84) / 2); cars.push({ x: e2 ? 27 + n * 6.5 : -8 - n * 6.5, z0: e2 ? 3.6 : 10.4, sp: 0, ry: e2 ? -Math.PI / 2 : Math.PI / 2, c: n === 1 ? 0x9aa3ad : 0xf5c518, still: true }); } }
  const carB = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 0.85, 4.5).translate(0, 0.7, 0), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25 }), NC);
  const carT = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.6, 2.3).translate(0, 1.4, -0.2), new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.2, metalness: 0.5 }), NC);
  const carL = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.2, 0.25).translate(0, 1.82, -0.2), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), NC);
  cars.forEach((c, k) => carB.setColorAt(k, col.set(c.c))); [carB, carT, carL].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });
  // pedestrians
const CART0 = [-1.4, 0.15, -12.6];
  const NP = 320, peds = []; const shirts = [0xc94f4f, 0x3a7bd5, 0xf2c14e, 0x4caf7a, 0x8e5bb5, 0xeeeeee, 0x333333, 0xf28c38, 0x2bb3b1], skins = [0xf1c6a5, 0xd8a47e, 0xb5835a, 0x8d5a3b, 0x5c3a24];
  const pB = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.17, 1.15, 7).translate(0, 0.95, 0), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), NP);
  const pH = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.15, 1).translate(0, 1.7, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), NP);
  const pL = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.42, 0.18).translate(0, 0.21, 0), new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 }), NP);
  for (let k = 0; k < NP; k++) { const local = k < 70; const west = local ? R() < 0.65 : R() < 0.5; const dir = R() < 0.5 ? 1 : -1; let sp = local ? (R() < 0.4 ? 0 : 0.7 + R() * 0.5) : 1.1 + R() * 0.6; let z0;
    let px = west ? -4.2 + R() * 3.6 : 20.6 + R() * 3.8;
    if (local && west) { let tries = 0; do { px = -4.2 + R() * 3.6; z0 = HZ0 - 14 + R() * 14.5; tries++; } while (tries < 40 && (Math.abs(px - HX) < 1.3 && z0 > HZ0 - 3.5 || Math.hypot(px - HX, z0 - HZ0) < 1.7 || Math.hypot(px - CART0[0], z0 - CART0[2]) < 2.0 || Math.hypot(px - CART0[0] + 1.15, z0 - CART0[2] + 0.4) < 1.0)); sp = 0; }
    else if (local) { z0 = HZ0 - 40 + R() * 50; }
    else do { z0 = -200 + R() * 400; } while (west && Math.abs(wrap(z0 + dir * sp * 7, -200, 200) + 7) < 14);
    peds.push({ x: px, z0, dir, sp, s: 0.88 + R() * 0.22, ph: R() * 6.28 }); pB.setColorAt(k, col.set(shirts[Math.floor(R() * shirts.length)])); pH.setColorAt(k, col.set(skins[Math.floor(R() * skins.length)])); }
  [pB, pH, pL].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });
  // hot-dog cart, vendor, Mittens, pigeons
  const cart = new THREE.Group(); { const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.3, metalness: 0.6 }); const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 1.7), steel); b.position.y = 0.72; cart.add(b);
    for (const z of [-0.6, 0.6]) for (const x of [-0.52, 0.52]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.24, z); cart.add(w); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), dark); pole.position.y = 1.8; cart.add(pole);
    const um = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true, vertexColors: true })); { const g = um.geometry.toNonIndexed(); const n = g.attributes.position.count; const cs = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const a = Math.atan2(g.attributes.position.getZ(k - k % 3 + 1) + g.attributes.position.getZ(k - k % 3 + 2), g.attributes.position.getX(k - k % 3 + 1) + g.attributes.position.getX(k - k % 3 + 2)); const red = Math.floor((a + Math.PI) / (Math.PI / 4) + 0.01) % 2; cs.set(red ? [0.9, 0.12, 0.12] : [1, 0.85, 0.1], k * 3); } g.setAttribute('color', new THREE.BufferAttribute(cs, 3)); g.computeVertexNormals(); um.geometry = g; } um.position.y = 2.7; cart.add(um);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 1.2), new THREE.MeshStandardMaterial({ color: 0xe8262a })); sign.position.set(0.52, 0.8, 0); cart.add(sign);
    cart.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(cart); }
    const P = makePerson(THREE, { shirt: 0xe9a72b, pants: 0x30405a, hair: 0x2a1a10, seed: 1 }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const vendor = makePerson(THREE, { shirt: 0xf4f4f0, pants: 0x222222, hair: 0x555555, skin: 0xc98e65, seed: 5 }); { const hat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.11, 0.2), new THREE.MeshStandardMaterial({ color: 0xffffff })); hat.position.y = 0.36; vendor.headPivot.add(hat); const ap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0xd8342c })); ap.position.set(0, 1.05, 0.2); vendor.group.add(ap); } A.add(vendor.group);
  const mittens = makeCat(THREE, 0xf0a040); mittens.scale.setScalar(1.3); A.add(mittens);
  const pigeons = []; { const pm = new THREE.MeshStandardMaterial({ color: 0x8c93a0, roughness: 0.8, flatShading: true }); for (let k = 0; k < 12; k++) { const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), pm); g.scale.set(1, 0.9, 1.5); const b = [-3.9 + R() * 3.4, 0.26, -6.6 + R() * 5.2]; if (Math.hypot(b[0] - CART0[0], b[2] - CART0[2]) < 1.3) b[0] = -1.0; pigeons.push({ g, b, d: [(R() - 0.5) * 6, 5 + R() * 5, 4 + R() * 7], ph: R() * 6 }); g.castShadow = true; A.add(g); } }
  const plane = new THREE.Group(); { const wm = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 }); const f = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 36, 10), wm); f.rotation.z = Math.PI / 2; plane.add(f); const n = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 10), wm); n.rotation.z = -Math.PI / 2; n.position.x = 20.5; plane.add(n);
    const w = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 34), wm); w.position.x = 1; plane.add(w); const t1 = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 0.5), new THREE.MeshStandardMaterial({ color: 0x1f5fd0 })); t1.position.set(-16, 4, 0); plane.add(t1); const t2 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 12), wm); t2.position.set(-16, 1, 0); plane.add(t2);
    for (let k = 0; k < 12; k++) { const wi = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x223344, side: THREE.DoubleSide })); wi.position.set(-12 + k * 2.2, 0.6, -2.02); plane.add(wi); } A.add(plane); }

  // ---------------- gravity effects (street) ----------------
  const PURP = 0xc9a6ff;
  const gw = makeShockwave(THREE, { seed: 21, n: 700, size: 7, sizeR: 40, opacity: 0.45, color: PURP, dustColor: 0xd9d0c4, ringColor: 0xe6d8ff }); A.add(gw);
  const roofW = makeShockwave(THREE, { seed: 22, n: 1600, size: 30, sizeR: 300, opacity: 0.4, color: 0xffe9c8, dustColor: 0xcdbfa8 }); A.add(roofW);
  const feet = makeBurst(THREE, 260, { origin: (r) => [HX + (r() - 0.5) * 30, 0.2, HZ0 + (r() - 0.5) * 40], dir: (r) => [(r() - 0.5), 0.3 + r() * 0.3, (r() - 0.5)], speed: [1, 3], life: [0.5, 1.2], size: 10, color: 0xd8ccb8, opacity: 0.55, seed: 23, drag: 3 }); A.add(feet);
  // falling dust motes around the hero: drift slowly, rain down when gravity doubles
  const NM = 260, mPos = new Float32Array(NM * 3), mSeed = Array.from({ length: NM }, () => [(R() - 0.5) * 16, R() * 5, (R() - 0.5) * 16, 0.6 + R() * 0.8]);
  const mG = new THREE.BufferGeometry(); mG.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  const motes = new THREE.Points(mG, new THREE.PointsMaterial({ map: softTex(THREE), color: 0xfff2d8, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); motes.frustumCulled = false; A.add(motes);
  // a dropped hot dog
  const dog = new THREE.Group(); { const bun = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), new THREE.MeshStandardMaterial({ color: 0xe0a85a, roughness: 0.8 })); bun.rotation.z = Math.PI / 2; dog.add(bun);
    const sau = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.2, 4, 8), new THREE.MeshStandardMaterial({ color: 0xb0402a, roughness: 0.5 })); sau.rotation.z = Math.PI / 2; sau.position.y = 0.03; dog.add(sau); dog.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(dog); }
  // cracked water tanks: pick the cluster the rooftop shot looks at
  const tankF = tanks.map(() => ({ crack: R() < 0.4, dir: R() < 0.5 ? 1 : -1, d: 0.4 + R() * 0.6 }));
  const TT = tanks.reduce((b, p) => (Math.hypot(p[0] - 60, p[2] - 120) < Math.hypot(b[0] - 60, b[2] - 120) ? p : b), tanks[0]);
  const near = tanks.map((p, k) => [p, k]).filter(([p, k]) => tankF[k].crack && Math.hypot(p[0] - TT[0], p[2] - TT[2]) < 160).slice(0, 14);
  tankF[tanks.indexOf(TT)].crack = true;
  const tankDust = makeBurst(THREE, 700, { origin: (r) => { const p = near.length ? near[Math.floor(r() * near.length)][0] : TT; return [p[0] + (r() - 0.5) * 3, p[1] + 1 + r() * 3, p[2] + (r() - 0.5) * 3]; }, dir: (r) => [(r() - 0.5), r() * 0.6, (r() - 0.5)], speed: [2, 7], life: [0.8, 2.2], size: 16, color: 0xd9cbb2, opacity: 0.6, seed: 24, drag: 1.5, delay: 0.6 }); A.add(tankDust);
  const splash = makeBurst(THREE, 300, { origin: (r) => [TT[0] + (r() - 0.5) * 3, TT[1] + 3, TT[2] + (r() - 0.5) * 3], dir: (r) => [(r() - 0.5) * 1.4, 0.2 + r() * 0.8, (r() - 0.5) * 1.4], speed: [3, 9], life: [0.6, 1.4], size: 7, color: 0x9fd4ff, opacity: 0.8, seed: 25, gravity: 19.6 }); A.add(splash);
  const planks = makeBurst(THREE, 90, { origin: (r) => [TT[0] + (r() - 0.5) * 3, TT[1] + 3.5 + r() * 2, TT[2] + (r() - 0.5) * 3], dir: (r) => [(r() - 0.5) * 2, 0.3 + r(), (r() - 0.5) * 2], speed: [2, 7], life: [0.8, 1.6], size: 5, color: 0x7a5236, square: true, seed: 26, gravity: 19.6, floor: TT[1] + 0.2 }); A.add(planks);
  // ghost plane (where it would be with normal gravity)
  const ALT = 700; const ghost = plane.clone(true); ghost.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: 0x3f9bff, transparent: true, opacity: 0.4, depthWrite: false }); } }); A.add(ghost);
  const pathLine = new THREE.Mesh(new THREE.BoxGeometry(4000, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.5 })); A.add(pathLine);
  const pax = makePerson(THREE, { shirt: 0x3a7bd5, seed: 9 }); pax.group.scale.setScalar(0.42); plane.add(pax.group);

  // ---------------- space ----------------
  const SB = new THREE.Scene(); const camS = new THREE.PerspectiveCamera(50, W / H, 0.0005, 3e6);
  SB.add(new THREE.AmbientLight(0x223344, 0.5)); const sunS = new THREE.DirectionalLight(0xffffff, 3.0); sunS.position.set(1, 0.35, 0.6); SB.add(sunS);
  SB.add(stars(THREE, 6000, 1.5e6, 11));
  const earth = makeEarth(THREE, 6371, 9); earth.userData.earth.rotation.y = 2.1; SB.add(earth);
  const MOON = new THREE.Vector3(30000, 14000, -26000);
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(1737, 4), new THREE.MeshStandardMaterial({ color: 0xbdbab2, roughness: 1, flatShading: true })); moon.position.copy(MOON); SB.add(moon);
  { const cm = new THREE.MeshStandardMaterial({ color: 0x8f8b84, roughness: 1, flatShading: true }); const RM = rng(5); for (let k = 0; k < 18; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(120 + RM() * 260, 8, 6), cm); const u = RM() * 2 - 1, a = RM() * 6.28, s = Math.sqrt(1 - u * u); c.position.set(s * Math.cos(a) * 1700, u * 1700, s * Math.sin(a) * 1700); c.scale.set(1, 1, 0.25); c.lookAt(0, 0, 0); moon.add(c); } }
  const rings = [0, 1, 2].map(k => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float op; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0-abs(dot(vN,vV)), 4.0); gl_FragColor = vec4(vec3(0.75,0.6,1.0)*(0.2+1.8*f), op*f); }' })); SB.add(m); return m; });
  // the ISS (metres, scaled to km)
  function makeISS(ghostMat) { const g = new THREE.Group(); const metal = ghostMat || new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.45, metalness: 0.6 }); const gold = ghostMat || new THREE.MeshStandardMaterial({ color: 0xc8942e, roughness: 0.35, metalness: 0.7, emissive: 0x2a1a05 });
    const truss = new THREE.Mesh(new THREE.BoxGeometry(109, 3, 3), metal); g.add(truss);
    for (const x of [-48, -36, 36, 48]) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.3, 34), gold); p.position.set(x, 0, s * 19); g.add(p); }
    for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 12, 12), metal); c.rotation.x = Math.PI / 2; c.position.set(0, -3, -14 + k * 9); g.add(c); }
    const rad = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 14), metal); rad.position.set(-14, -2, 0); g.add(rad);
    g.scale.setScalar(0.001); return g; }
  const ISS0 = new THREE.Vector3(0, 6371 + 400, 0);
  const iss = makeISS(); SB.add(iss);
  const issG = makeISS(new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.25, depthWrite: false })); issG.position.copy(ISS0); SB.add(issG);
  const field = new THREE.Group(); { const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#2f8f3c'; g.fillRect(0, 0, 128, 512); g.fillStyle = '#b3262e'; g.fillRect(0, 0, 128, 47); g.fillRect(0, 465, 128, 47); g.strokeStyle = '#fff'; g.lineWidth = 3; for (let k = 0; k <= 10; k++) { const y = 47 + k * 41.8; g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.049, 0.1097), new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0.92, side: THREE.DoubleSide })); field.add(m); SB.add(field); }

  // ---------------- timing helpers ----------------
  const heavyAge = (t) => t >= LOOP ? t - LOOP : (t >= T0 && t < END ? t - T0 : -1);
  const heavyT = (t) => clamp(t - T0, 0, END - T0) + Math.max(0, t - LOOP);       // seconds spent heavy
  const worldW = (t) => t >= LOOP ? (t - LOOP) / SLOW : (t - T0) / SLOW;            // world seconds since gravity doubled
  const driveT = (t) => t < T0 ? t : t < END ? T0 + 0.35 * (t - T0) : t < LOOP ? T0 + 0.35 * (END - T0) + (t - END) : T0 + 0.35 * (END - T0) + (LOOP - END) + 0.35 * (t - LOOP);
  const walkT = (t) => t < T0 ? t : t < END ? T0 : t < LOOP ? T0 + (t - END) : T0 + (LOOP - END);
  const camB1 = (u) => { const a = easeInOut(clamp(u / 2.7)); return { c: [HX + lerp(4.6, 3.9, a), lerp(2.0, 1.55, a), HZ0 + lerp(6.8, 5.4, a)], g: [HX - 0.7, lerp(1.0, 0.8, a), HZ0 - 2.5], fov: 52 }; };

  const hero = { x: HX, y: 0.15, z: HZ0 }; const tv = new THREE.Vector3();
  function kneel(Pp, h, hop) { const G = Pp.group; G.rotation.set(0.28 * h, G.rotation.y, 0); G.position.y = 0.15 - 0.5 * h + hop;
    Pp.torso.rotation.set(0, 0, 0); Pp.legL.rotation.set(1.25 * h, 0, -0.1 * h); Pp.legR.rotation.set(1.15 * h, 0, 0.1 * h);
    Pp.armL.rotation.set(-0.55 * h, 0, -0.18 - 0.2 * h); Pp.armR.rotation.set(-0.55 * h, 0, 0.18 + 0.2 * h); Pp.headPivot.rotation.set(-0.32 * h, 0, 0); }

  function update(t_) {
    const hook = t_ < HOOK; const t = hook ? hookT(t_) : t_;
    const out = { scene: A, camera: cam, bloom: 0.35, bloomThreshold: 0.9, shake: 0, flash: 0, hook, t };
    const ha = heavyAge(t), h = ha < 0 ? 0 : easeOut(clamp(ha / 0.45)); const sa = t >= END && t < LOOP ? t - END : -1;
    const hop = sa >= 0 && sa < 0.9 ? 0.55 * Math.sin(sa / 0.9 * Math.PI) : 0; const hop2 = t >= 23.5 && t < 24.4 ? 1.0 * Math.sin((t - 23.5) / 0.9 * Math.PI) : 0;
    let k = -1; B.forEach((s, i) => { if (t >= s && t < END) k = i; }); if (ha >= 0 && t >= LOOP) k = 0; out.k = k; out.h = h; out.sa = sa;
    // ---- hero ----
    P.group.rotation.set(0, 0, 0); kneel(P, h, hop + hop2); P.group.position.x = HX; P.group.position.z = HZ0;
    if (hop2 > 0) { P.armL.rotation.set(-2.7, 0, -0.5); P.armR.rotation.set(-2.7, 0, 0.5); P.legL.rotation.x = 0.4 * hop2; P.legR.rotation.x = -0.4 * hop2; }
    else if (sa >= 0 && sa < 2.4) { P.armL.rotation.set(-2.2 * Math.exp(-sa), 0, -0.4); P.armR.rotation.set(-2.2 * Math.exp(-sa), 0, 0.4); }
    let f = { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.5 * Math.sin(t * 0.7), 0] };
    if (t > T0 - 1.0 && t < T0) f = { brows: 'up', eyes: 1.2, mouth: 'o', look: [0, -0.5] };
    if (h > 0.05) f = ha < 0.35 ? { brows: 'squint', eyes: 0.15, mouth: 'grit' } : { brows: 'worried', eyes: 1.6, mouth: 'open', open: 1.5 + 0.3 * Math.sin(t * 9), look: [0, 0.6] };
    if (sa >= 0) f = sa < 0.4 ? { brows: 'up', eyes: 1.7, mouth: 'o', look: [0, -0.4] } : { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.2, look: [0.3, -0.2] };
    if (t > 25.4 && t < LOOP) f = { brows: 'up', eyes: 1.2, mouth: 'smile', look: [0, 0] };
    if (t > LOOP - 0.9 && t < LOOP) f = { brows: 'worried', eyes: 1.5, mouth: 'o', look: [0, -0.6] };
    setFace(P, f); life(P, t, h > 0.5 ? 0.3 : 1, { noBlink: f.eyes < 0.5 });
    hero.y = P.group.position.y;
    // ---- vendor ----
    const V = vendor; V.group.position.set(CART0[0] - 1.15, 0.15, CART0[2] - 0.4); V.group.rotation.set(0, 1.9, 0); kneel(V, h, hop * 0.8); V.group.rotation.y = 1.9;
    if (h < 0.05 && sa < 0) { V.armR.rotation.set(-1.2, 0, 0.1); }
    setFace(V, h > 0.05 ? { brows: 'worried', eyes: 1.4, mouth: 'grit' } : sa >= 0 ? { brows: 'up', eyes: 1.5, mouth: 'smile' } : { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.6, 0] }); life(V, t, 1);
    { const da = ha < 0 ? -1 : ha; V.headPivot.getWorldPosition(tv); if (da < 0 && t < END) dog.position.set(CART0[0] - 0.8, 1.1, CART0[2] - 0.25); else if (da >= 0 && t < END) { const y = 1.1 - 0.5 * 19.6 * da * da / (SLOW * SLOW); dog.position.set(CART0[0] - 0.8 + 0.1 * da, Math.max(0.2, y), CART0[2] - 0.25); dog.rotation.z = Math.min(1.5, da * 3); } dog.visible = t < LOOP + 1; if (t >= LOOP) { dog.position.set(CART0[0] - 0.8, Math.max(0.2, 1.1 - 0.5 * 19.6 * ha * ha / (SLOW * SLOW)), CART0[2] - 0.25); } }
    // ---- cart, Mittens, pigeons ----
    cart.position.set(CART0[0], CART0[1] - 0.1 * h, CART0[2]); cart.rotation.set(0, 0, 0.02 * h);
    { const M = mittens; M.rotation.set(0, 2.6 + Math.sin(t * 0.8) * 0.15, 0); const base = 0.15 + 1.1 - 0.1 * h; const ms = sa >= 0 && sa < 1.6 ? sa / 1.6 : -1;
      M.position.set(CART0[0], base + (ms >= 0 ? 2.6 * Math.sin(ms * Math.PI) : 0), CART0[2] - 0.35); M.scale.set(1.3 * (1 + 0.35 * h), 1.3 * (1 - 0.5 * h), 1.3 * (1 + 0.25 * h)); if (ms >= 0) M.rotation.x = -ms * 6.28; }
    pigeons.forEach(pg => { const s = sa >= 0 ? clamp(sa / 4.5) : -1; if (s < 0 || s >= 1) { pg.g.position.set(pg.b[0], pg.b[1] - 0.06 * h + (h < 0.05 ? Math.max(0, Math.sin(t * 5 + pg.ph)) * 0.04 : 0), pg.b[2]); pg.g.scale.set(1, 0.9 * (1 - 0.45 * h), 1.5); pg.g.rotation.y = pg.ph; }
      else { const a = Math.sin(s * Math.PI); pg.g.position.set(pg.b[0] + Math.sin(s * 6.28 + pg.ph) * 2 * a, pg.b[1] + pg.d[1] * a, pg.b[2] + Math.cos(s * 6.28 + pg.ph) * 2 * a); pg.g.scale.set(1, 0.9, 1.5); pg.g.rotation.y = pg.ph + s * 6; } });
    // ---- traffic & people ----
    const dt = driveT(t), wt = walkT(t);
    cars.forEach((c, i) => { const x = c.x, z = c.still ? c.z0 : wrap(c.z0 + c.sp * dt, -250, 254);
      m4.compose(v.set(x, 0.02 - 0.22 * h + hop * 0.15, z), q.setFromEuler(e.set(0.03 * h, c.ry, 0, 'XYZ')), sc.set(1, 1 - 0.08 * h, 1)); carB.setMatrixAt(i, m4); carT.setMatrixAt(i, m4); if (c.c !== 0xf5c518) m4.compose(v.set(0, -20, 0), q, sc.set(0.001, 0.001, 0.001)); carL.setMatrixAt(i, m4); });
    carB.instanceMatrix.needsUpdate = carT.instanceMatrix.needsUpdate = carL.instanceMatrix.needsUpdate = true;
    peds.forEach((p, i) => { const z = wrap(p.z0 + p.dir * p.sp * wt, -200, 200), x = p.x; const hi = ha < 0 ? 0 : easeOut(clamp((ha - (i % 5) * 0.05) / 0.45)); const walking = hi < 0.05 && !(sa >= 0 && sa < 0.9);
      const y = 0.15 - 0.22 * hi * p.s + (walking ? Math.abs(Math.sin(t * 8 + p.ph)) * 0.05 : 0) + (sa >= 0 && sa < 0.9 ? (0.35 + (i % 3) * 0.15) * Math.sin(sa / 0.9 * Math.PI) : 0);
      const ry = p.dir > 0 ? 0 : Math.PI; m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0.5 * hi, ry, 0, 'YXZ')), sc.set(p.s * (1 + 0.1 * hi), p.s * (1 - 0.36 * hi), p.s * (1 + 0.1 * hi))); pB.setMatrixAt(i, m4); pH.setMatrixAt(i, m4); pL.setMatrixAt(i, m4); });
    pB.instanceMatrix.needsUpdate = pH.instanceMatrix.needsUpdate = pL.instanceMatrix.needsUpdate = true;
    // ---- water tanks ----
    tanks.forEach(([x, y, z], i) => { const F = tankF[i]; const ca = F.crack ? easeOut(clamp((t - B[1] - 0.3 - F.d * 0.6) / 1.2)) : 0; const perm = t >= B[1] ? ca : 0;
      m4.compose(v.set(x + F.dir * 1.2 * perm, y - 1.6 * perm, z), q.setFromEuler(e.set(0, 0, F.dir * 0.55 * perm, 'XYZ')), sc.set(1 + 0.05 * h, 1 - 0.12 * h - 0.15 * perm, 1 + 0.05 * h)); tkM.setMatrixAt(i, m4); tkR.setMatrixAt(i, m4); tkL.setMatrixAt(i, m4); });
    tkM.instanceMatrix.needsUpdate = tkR.instanceMatrix.needsUpdate = tkL.instanceMatrix.needsUpdate = true;
    // ---- effects ----
    gw.position.set(HX, 0.1, HZ0); gw.userData.set(1 + easeOut(clamp(Math.max(ha, 0) / 1.6)) * 160, ha >= 0 ? ha / 1.8 : -1, 0.25);
    feet.userData.update(t, t >= LOOP ? LOOP : T0);
    roofW.position.set(TT[0], TT[1], TT[2]); roofW.userData.set(2 + easeOut(clamp((t - B[1] - 0.4) / 2.4)) * 420, t >= B[1] + 0.4 ? (t - B[1] - 0.4) / 2.6 : -1, 0.3);
    tankDust.userData.update(t, B[1] + 0.2); splash.userData.update(t, B[1] + 0.9); planks.userData.update(t, B[1] + 0.85);
    { const ht = heavyT(t); for (let i = 0; i < NM; i++) { const s = mSeed[i]; mPos[i * 3] = HX + s[0] + Math.sin(t * 0.3 + i) * 0.2; mPos[i * 3 + 1] = 0.15 + wrap(s[1] - 0.12 * s[3] * t - 2.2 * s[3] * ht, 0, 5); mPos[i * 3 + 2] = HZ0 + s[2]; } mG.attributes.position.needsUpdate = true; }
    // plane: sinks ½·g·w² below its normal-gravity path
    { const w = clamp(worldW(t), 0, 5); const drop = t >= T0 && t < END ? 0.5 * 9.8 * w * w : 0; const px = -260 + 75 * (t - B[2]);
      plane.position.set(px, ALT - drop, 260); plane.rotation.set(0, 0, -0.06 * Math.min(1, drop / 20)); ghost.position.set(px, ALT, 260); ghost.rotation.set(0, 0, 0); pathLine.position.set(0, ALT, 258);
      const vis = t >= B[2] - 0.2 && t < B[3]; plane.visible = ghost.visible = pathLine.visible = vis; ghost.visible = vis && t > B[2] + 0.5; pathLine.visible = ghost.visible;
      pax.group.position.set(6, -0.2, -2.6); pax.group.rotation.set(0, Math.PI, 0); setFace(pax, { brows: 'worried', eyes: 1.7, mouth: 'open', open: 2 }); out.drop = drop; }
    // ---- cameras ----
    let c, g, fov = 50; const seg = (a, b2) => clamp((t - a) / (b2 - a)); let shC = [HX, HZ0, 60];
    if (t >= B[3] && t < END) {   // ---------- SPACE ----------
      out.scene = SB; out.camera = camS; out.bloom = 0.8; out.bloomThreshold = 0.6; out.vignette = 0.7; const w = worldW(t);
      rings.forEach((m, j) => { const a = ((t - B[3]) * 0.55 + j / 3) % 1; m.scale.setScalar(6600 + a * 52000); m.material.uniforms.op.value = 0.55 * (1 - a) * (t < B[4] ? 1 : 0.5); });
      earth.userData.earth.rotation.y = 2.1 + t * 0.01;
      const dropK = 0.5 * 8.7 * w * w / 1000; iss.position.set(ISS0.x, ISS0.y - dropK, ISS0.z); iss.rotation.set(0, 0.5, 0); issG.rotation.copy(iss.rotation);
      field.position.set(ISS0.x + 0.075, ISS0.y - 0.055, ISS0.z + 0.02); field.rotation.set(0, 0.5, 0);
      moon.position.set(MOON.x + Math.sin(t * 40) * 12 * (t < B[3] + 1 ? 1 : 0.2), MOON.y, MOON.z);
      let cs, gs, fv;
      if (t < B[4]) { const u = easeInOut(seg(B[3], B[4])); cs = [lerp(-15000, -12000, u), lerp(-2500, 1500, u), lerp(31000, 28000, u)]; gs = [lerp(9000, 11000, u), 6500, -9000]; fv = 50; issG.visible = iss.visible = field.visible = false; moon.visible = true; }
      else { const u = seg(B[4], END); cs = [ISS0.x + lerp(0.12, 0.09, u), ISS0.y + lerp(0.0, -0.01, u), ISS0.z + lerp(0.42, 0.38, u)]; gs = [ISS0.x + 0.03, ISS0.y - 0.035, ISS0.z]; out.bloom = 0.45; out.bloomThreshold = 0.85; fv = 50; issG.visible = iss.visible = field.visible = true; }
      camS.position.set(...cs); camS.lookAt(...gs); camS.fov = fv; camS.updateProjectionMatrix();
      out.flash = 0.35 * pulse(t, B[3], 0.2) + 0.3 * pulse(t, B[4], 0.2);
      return out; }
    if (t < CARD) { const cb = camB1(t - T0); c = cb.c; g = cb.g; }
    else if (t < 5.4) { const u = easeInOut(seg(CARD, 5.4)); c = [lerp(10, HX + 6, u), lerp(260, 9, u), lerp(420, HZ0 + 22, u)]; g = [lerp(10, HX, u), lerp(60, 1.4, u), lerp(-80, HZ0, u)]; fov = lerp(58, 50, u); shC = u < 0.6 ? [10, 100, 700] : [HX, HZ0, 80]; }
    else if (t < T0) { const u = easeInOut(seg(5.4, T0)); const cb = camB1(0); c = [lerp(HX + 4.6, cb.c[0], u), lerp(2.4, cb.c[1], u), lerp(HZ0 + 8.5, cb.c[2], u)]; g = [lerp(HX - 0.6, cb.g[0], u), lerp(1.2, cb.g[1], u), lerp(HZ0 - 1.5, cb.g[2], u)]; }
    else if (t < B[1]) { const cb = camB1(t - T0); c = cb.c; g = cb.g; out.shake = 9 * Math.exp(-(t - T0) * 2.2); }
    else if (t < B[2]) { const u = easeInOut(seg(B[1], B[2])); c = [TT[0] + lerp(16, 10, u), TT[1] + lerp(14, 10, u), TT[2] + lerp(20, 14, u)]; g = [TT[0] - 1, TT[1] + 1.5, TT[2] - 1]; fov = 50; out.shake = 3 * Math.exp(-(t - B[1]) * 2); shC = [TT[0], TT[2], 200]; }
    else if (t < B[3]) { const u = seg(B[2], B[3]); const p = plane.position; c = [p.x + lerp(-50, -18, u), ALT + 24, p.z + lerp(72, 78, u)]; g = [p.x + 6, ALT - 16, p.z]; fov = 55; shC = [p.x, p.z, 400]; }
    else if (t < 23.4) { const u = easeInOut(seg(END, 23.4)); c = [HX + lerp(7, 6, u), lerp(2.6, 2.0, u), HZ0 + lerp(8.5, 7, u)]; g = [HX - 1.2, 1.2, HZ0 - 2.5]; out.shake = 4 * Math.exp(-(t - END) * 3); }
    else if (t < 25.6) { const u = easeInOut(seg(23.4, 25.6)); c = [HX + lerp(1.9, 1.5, u), lerp(0.55, 0.7, u), HZ0 + lerp(3.4, 3.0, u)]; g = [HX, hero.y + 1.4, HZ0]; fov = 48; }
    else if (t < LOOP) { const u = easeInOut(seg(25.6, LOOP)); const cb = camB1(0); c = [lerp(HX + 1.5, cb.c[0], u), lerp(0.7, cb.c[1], u), lerp(HZ0 + 3.0, cb.c[2], u)]; g = [lerp(HX, cb.g[0], u), lerp(hero.y + 1.4, cb.g[1], u), lerp(HZ0, cb.g[2], u)]; }
    else { const cb = camB1(t - T0 - (LOOP - T0)); c = cb.c; g = cb.g; out.shake = 9 * Math.exp(-(t - LOOP) * 2.2); }
    if (hook) out.shake = 9 * Math.exp(-(t - T0) * 2.2);
    setShadow(...shC);
    cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix();
    out.flash = Math.max(0.45 * pulse(t, T0, 0.2), 0.45 * pulse(t, LOOP, 0.2), 0.3 * pulse(t, END, 0.2), 0.25 * pulse(t, B[1], 0.15), 0.25 * pulse(t, B[2], 0.15));
    out.exposure = 1.3; if (h > 0.05) { out.vignette = 0.55 + 0.2 * h; }
    return out;
  }

  const prj = (cm, x, y, z) => { tv.set(x, y, z); cm.updateMatrixWorld(); cm.matrixWorldInverse.copy(cm.matrixWorld).invert(); tv.project(cm); return tv.z < 1 && Math.abs(tv.x) < 0.95 && Math.abs(tv.y) < 0.95 ? [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920] : null; };
  const fmtT = (s) => `0:0${Math.floor(Math.max(0, s))}.${String(Math.floor((Math.max(0, s) % 1) * 1000)).padStart(3, '0')}`;
  const notes = ['you weigh 2× · coaster-loop force', 'rooftops carry 2× the load', 'planes sink 122 m in 5 s', 'pulled 3 cm closer', 'ISS sinks 109 m'];
  const where = ['MIDTOWN, NYC', 'MANHATTAN ROOFTOPS', 'NYC AIRSPACE · 700 M', 'EARTH & MOON', 'LOW EARTH ORBIT · 400 KM'];
  const TL = [{ text: 'WHAT IF GRAVITY DOUBLED', size: 84 }, { text: 'FOR 5 SECONDS?', size: 104, accent: true }];
  function hud(ctx, t_, st) { const W = 1080, H = 1920; const t = st.t, k = st.k;
    const titleA = t_ < 6.6 + 0.45 || t_ > LOOP - 0.7;
    if (t_ < 7.1) drawTitleTimed(ctx, W, H, TL, t_, '#c9a6ff', { start: -1, outAt: 6.6, wps: 60 });
    if (t_ > LOOP - 0.7) drawTitleTimed(ctx, W, H, TL, t_, '#c9a6ff', { start: LOOP - 0.7, outAt: 99, wps: 14 });
    const yC = t_ < 7.1 ? lerp(H * 0.268, H * 0.105, smooth(6.6, 7.0, t_)) : t_ > LOOP - 0.7 ? lerp(H * 0.105, H * 0.268, smooth(LOOP - 0.7, LOOP - 0.4, t_)) : H * 0.105;
    let label, value, note, colr = '#c9a6ff', bump = 0;
    const ha = heavyAge(t);
    if (ha >= 0) { const w = worldW(t); const kk = Math.max(0, k); const danger = clamp(w / 4); colr = `rgb(255,${Math.round(lerp(200, 70, danger))},${Math.round(lerp(90, 50, danger))})`; label = 'GRAVITY ×2'; value = fmtT(w); note = notes[kk]; bump = Math.max(0, 1 - (t - (t >= LOOP ? LOOP : B[kk])) / 0.35); }
    else if (t >= END && t < 26.6) { label = 'GRAVITY: NORMAL'; value = '0:05.000'; note = 'everyone feels light'; colr = '#7dffa8'; }
    else if (t >= 26.6 && t < LOOP) { label = 'GRAVITY DOUBLES AGAIN IN'; value = fmtT(LOOP - t); note = 'wait, what?'; colr = '#c9a6ff'; }
    else { const rem = t_ < CARD ? 5 : 5 - (t_ - CARD) * 1.25; label = 'GRAVITY DOUBLES IN'; value = fmtT(rem); note = 'a normal Tuesday in NYC'; }
    drawSideCounter(ctx, W, H, { y: yC, label, value, note, bump, color: colr, glow: colr });
    const wh = ha >= 0 ? where[Math.max(0, k)] : 'MIDTOWN, NYC';
    ctx.save(); ctx.font = `800 26px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.fillText(`${wh}  ·  12:00 PM`, 58, yC + 196); ctx.restore();
    if (t_ >= HOOK - 0.05 && t_ < CARD) { const a = clamp(Math.min((t_ - HOOK + 0.05) / 0.1, (CARD - t_) / 0.12)); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, H * 0.44, W, 190); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 66px ${FONT}`; ctx.fillText('6 SECONDS EARLIER', W / 2 + 75, H * 0.44 + 97);
      ctx.beginPath(); for (const dx of [0, 44]) { ctx.moveTo(118 + dx + 40, H * 0.44 + 62); ctx.lineTo(118 + dx, H * 0.44 + 96); ctx.lineTo(118 + dx + 40, H * 0.44 + 130); } ctx.fill(); ctx.restore(); }
    if (st.scene === SB) {
      if (t < B[4]) { const mp = prj(camS, MOON.x, MOON.y - 2300, MOON.z); if (mp) drawTag(ctx, mp[0], mp[1] + 40, '3 cm CLOSER', t - B[3] - 0.7, { dur: 2.0, bg: '#c9a6ff' }); }
      else { const fp = prj(camS, field.position.x, field.position.y - 0.062, field.position.z); if (fp) drawTag(ctx, fp[0], fp[1] + 30, '= 1 FOOTBALL FIELD', t - B[4] - 0.5, { dur: 2.2, bg: '#7dffa8' }); }
      return; }
    drawCaption(ctx, W, H, '2× HEAVIER', t - T0 - 0.25, { dur: 1.4, color: '#ffd23f', y: H * 0.74 });
    const hp = prj(cam, HX, hero.y + 2.05, HZ0);
    if (hp) { drawBubble(ctx, hp[0], hp[1], 'MY LEGS!!', t - T0 - 0.85, { dur: 1.5 }); drawBubble(ctx, hp[0], hp[1], 'WHEEE!', t - 23.55, { dur: 1.3 }); }
    const mp = mittens.position; const mt = prj(cam, mp.x, mp.y + 0.95, mp.z); if (mt) drawTag(ctx, mt[0], mt[1], 'MITTENS', t - 5.6, { dur: 1.2 });
    if (ghost.visible) { const gp = prj(cam, ghost.position.x, ALT + 8, ghost.position.z); if (gp) drawTag(ctx, gp[0], gp[1], 'NORMAL GRAVITY', t - B[2] - 0.6, { dur: 2.0, bg: '#9fe6ff' }); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL } };
}
