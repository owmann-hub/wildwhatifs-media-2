import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, drawCaption, makeSkyDome, makeBurst, makeCat, makeShockwave, softTex, setFace, life, drawBubble, drawSideCounter, drawTitleTimed, drawTag } from './lib.js';

// EXAMPLE (not an official upload): sneeze, short cut, set in a New-York-style city.
export const S = [6.9, 9.6, 14.6, 19.4, 22.6];           // sneeze moments
const TOTAL = 27.0, HOOK = 3.2, CARD = 3.85, LAUNCH = S[4] + 0.25;
const speeds = [160, 1600, 16000, 160000, 1600000];
const mults = ['x1', 'x10', 'x100', 'x1,000', 'x10,000'];
const notes = ['a normal sneeze', 'faster than sound', 'faster than a bullet', "escapes Earth's gravity", '0.15% of light speed'];
const HX = -2.5, HZ0 = -8;
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
const FONT = '"Inter Display", Inter, sans-serif';

// flight path after sneeze five (ft = seconds since launch)
function flight(ft) {
  return [lerp(HX, 10, smooth(0, 0.3, ft)) - 140 * smooth(3.4, 6.8, ft), 1.2 + 300 * smooth(0, 2.2, ft) - 170 * smooth(4.2, 6.8, ft), HZ0 - 3.5 - 380 * ft];
}

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
  // clouds the flight punches through
  { const n = 70, pos = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const ft = 1.5 + R() * 6.5; const p = flight(ft); pos.set([p[0] + (R() - 0.5) * 260, p[1] + (R() - 0.3) * 120, p[2] + (R() - 0.5) * 80], k * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: softTex(THREE, 128), color: 0xffffff, size: 70, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true, fog: false })); pts.frustumCulled = false; A.add(pts); }

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
  board('GESUNDHEIT|COLA', '#b3122f', '#ffffff', 24.7, 24, 80, 16, 11, -Math.PI / 2);
  // taxis & cars on the avenue (one-way uptown) + queues at the red light
  const NC = 30, cars = []; for (let k = 0; k < NC; k++) { if (k < 24) cars.push({ x: [3.4, 7.8, 12.2, 16.6][k % 4], z0: -250 + (Math.floor(k / 4) + R() * 0.7) * 84 + (k % 4) * 17, sp: 9 + R() * 4, ry: 0, c: R() < 0.72 ? 0xf5c518 : [0x1d1f22, 0xf2f2f2, 0x2d6fd6, 0xb3261e][Math.floor(R() * 4)] });
    else { const e2 = k % 2; const n = Math.floor((k - 24) / 2); cars.push({ x: e2 ? 27 + n * 6.5 : -8 - n * 6.5, z0: e2 ? 3.6 : 10.4, sp: 0, ry: e2 ? -Math.PI / 2 : Math.PI / 2, c: n === 1 ? 0x9aa3ad : 0xf5c518, still: true }); } }
  const carB = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 0.85, 4.5).translate(0, 0.7, 0), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25 }), NC);
  const carT = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.6, 2.3).translate(0, 1.4, -0.2), new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.2, metalness: 0.5 }), NC);
  const carL = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.2, 0.25).translate(0, 1.82, -0.2), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), NC);
  cars.forEach((c, k) => carB.setColorAt(k, col.set(c.c))); [carB, carT, carL].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });
  // pedestrians
  const NP = 190, peds = []; const shirts = [0xc94f4f, 0x3a7bd5, 0xf2c14e, 0x4caf7a, 0x8e5bb5, 0xeeeeee, 0x333333, 0xf28c38, 0x2bb3b1], skins = [0xf1c6a5, 0xd8a47e, 0xb5835a, 0x8d5a3b, 0x5c3a24];
  const pB = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.17, 1.15, 7).translate(0, 0.95, 0), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), NP);
  const pH = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.15, 1).translate(0, 1.7, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), NP);
  const pL = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.42, 0.18).translate(0, 0.21, 0), new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 }), NP);
  for (let k = 0; k < NP; k++) { const west = R() < 0.5; const dir = R() < 0.5 ? 1 : -1, sp = 1.1 + R() * 0.6; let z0; do { z0 = -200 + R() * 400; } while (west && Math.abs(wrap(z0 + dir * sp * 7, -200, 200) + 7) < 14);
    peds.push({ x: west ? -4.2 + R() * 3.6 : 20.6 + R() * 3.8, z0, dir, sp, s: 0.88 + R() * 0.22, ph: R() * 6.28 }); pB.setColorAt(k, col.set(shirts[Math.floor(R() * shirts.length)])); pH.setColorAt(k, col.set(skins[Math.floor(R() * skins.length)])); }
  [pB, pH, pL].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });
  // hot-dog cart, vendor, Mittens, pigeons
  const cart = new THREE.Group(); { const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.3, metalness: 0.6 }); const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 1.7), steel); b.position.y = 0.72; cart.add(b);
    for (const z of [-0.6, 0.6]) for (const x of [-0.52, 0.52]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.24, z); cart.add(w); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), dark); pole.position.y = 1.8; cart.add(pole);
    const um = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true, vertexColors: true })); { const g = um.geometry.toNonIndexed(); const n = g.attributes.position.count; const cs = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const a = Math.atan2(g.attributes.position.getZ(k - k % 3 + 1) + g.attributes.position.getZ(k - k % 3 + 2), g.attributes.position.getX(k - k % 3 + 1) + g.attributes.position.getX(k - k % 3 + 2)); const red = Math.floor((a + Math.PI) / (Math.PI / 4) + 0.01) % 2; cs.set(red ? [0.9, 0.12, 0.12] : [1, 0.85, 0.1], k * 3); } g.setAttribute('color', new THREE.BufferAttribute(cs, 3)); g.computeVertexNormals(); um.geometry = g; } um.position.y = 2.7; cart.add(um);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 1.2), new THREE.MeshStandardMaterial({ color: 0xe8262a })); sign.position.set(0.52, 0.8, 0); cart.add(sign);
    cart.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(cart); }
  const CART0 = [-3.6, 0.15, -4.6];
  const P = makePerson(THREE, { shirt: 0xe9a72b, pants: 0x30405a, hair: 0x2a1a10, seed: 1 }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const vendor = makePerson(THREE, { shirt: 0xf4f4f0, pants: 0x222222, hair: 0x555555, skin: 0xc98e65, seed: 5 }); { const hat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.11, 0.2), new THREE.MeshStandardMaterial({ color: 0xffffff })); hat.position.y = 0.36; vendor.headPivot.add(hat); const ap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0xd8342c })); ap.position.set(0, 1.05, 0.2); vendor.group.add(ap); } A.add(vendor.group);
  const mittens = makeCat(THREE, 0xf0a040); mittens.scale.setScalar(1.3); A.add(mittens);
  const pigeons = []; { const pm = new THREE.MeshStandardMaterial({ color: 0x8c93a0, roughness: 0.8, flatShading: true }); for (let k = 0; k < 12; k++) { const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), pm); g.scale.set(1, 0.9, 1.5); const b = [-3.9 + R() * 3.4, 0.26, -6.6 + R() * 5.2]; if (Math.hypot(b[0] - CART0[0], b[2] - CART0[2]) < 1.3) b[0] = -1.0; pigeons.push({ g, b, d: [(R() - 0.5) * 6, 5 + R() * 5, 4 + R() * 7], ph: R() * 6 }); g.castShadow = true; A.add(g); } }
  const plane = new THREE.Group(); { const wm = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 }); const f = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 36, 10), wm); f.rotation.z = Math.PI / 2; plane.add(f); const n = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 10), wm); n.rotation.z = -Math.PI / 2; n.position.x = 20.5; plane.add(n);
    const w = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 34), wm); w.position.x = 1; plane.add(w); const t1 = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 0.5), new THREE.MeshStandardMaterial({ color: 0x1f5fd0 })); t1.position.set(-16, 4, 0); plane.add(t1); const t2 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 12), wm); t2.position.set(-16, 1, 0); plane.add(t2);
    for (let k = 0; k < 12; k++) { const wi = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x223344, side: THREE.DoubleSide })); wi.position.set(-12 + k * 2.2, 0.6, -2.02); plane.add(wi); } A.add(plane); }

  // ---------------- effects ----------------
  const puff = makeBurst(THREE, 60, { origin: () => [0, 0, 0], dir: (r) => [(r() - 0.5) * 0.5, (r() - 0.3) * 0.4, 1], speed: [1, 5], life: [0.3, 0.8], size: 9, color: 0xffffff, seed: 2, drag: 3 }); A.add(puff);
  const gust = makeBurst(THREE, 500, { origin: (r) => [(r() - 0.5) * 3, 0.2 + r() * 2.2, 0], dir: (r) => [(r() - 0.5) * 0.35, (r() - 0.2) * 0.2, 1], speed: [40, 150], life: [0.5, 1.5], size: 14, color: 0xe9eef2, opacity: 0.6, seed: 3, drag: 0.9, delay: 0.25 }); A.add(gust);
  const glassF = makeBurst(THREE, 1400, { origin: (r) => [r() < 0.5 ? -5 + r() * 3 : 22 + r() * 3, 8 + r() * 170, -30 + r() * 330], dir: (r) => [(r() - 0.5) * 1.2, -0.2 - r(), (r() - 0.3) * 1.0], speed: [3, 14], life: [1.6, 3.6], size: 3.2, color: 0xdff4ff, square: true, seed: 4, gravity: 16, delay: 1.3, floor: 0.2 }); A.add(glassF);
  const sw2 = makeShockwave(THREE, { seed: 2, n: 700, size: 9, sizeR: 40, opacity: 0.5, color: 0xe8f6ff }); A.add(sw2);
  const sw3 = makeShockwave(THREE, { seed: 3, n: 1200, size: 16, sizeR: 90, opacity: 0.45, color: 0xdff1ff }); A.add(sw3);
  const sw4 = makeShockwave(THREE, { seed: 4, n: 2600, size: 60, sizeR: 500, opacity: 0.35, color: 0xfff0d8, dustColor: 0xd9cdb8 }); A.add(sw4);
  const sw5 = makeShockwave(THREE, { seed: 5, n: 600, size: 8, sizeR: 30, opacity: 0.25, color: 0xffffff }); A.add(sw5);
  const wring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 128), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); wring.rotation.x = -Math.PI / 2; wring.position.set(HX, -1.2, HZ0); A.add(wring);
  const NTR = 90, trPos = new Float32Array(NTR * 3), trG = new THREE.BufferGeometry(); trG.setAttribute('position', new THREE.BufferAttribute(trPos, 3));
  const trail = new THREE.Points(trG, new THREE.PointsMaterial({ map: softTex(THREE), color: 0xffffff, size: 5, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true, fog: false })); trail.frustumCulled = false; A.add(trail);
  const trJ = Array.from({ length: NTR }, () => [(R() - 0.5), (R() - 0.5), (R() - 0.5)]);

  const hero = { x: HX, y: 0.15, z: HZ0 }; const tv = new THREE.Vector3();
  function update(t_) {
    const hook = t_ < HOOK; const t = hook ? TOTAL + t_ : t_;
    const out = { scene: A, camera: cam, bloom: 0.35, bloomThreshold: 0.9, shake: 0, flash: 0, hook, t };
    let k = -1; S.forEach((s, i) => { if (t >= s) k = i; }); const age = k >= 0 ? t - S[k] : 99; const nextS = S.find(s => s > t) ?? 1e9; const wind = clamp(1 - (nextS - t) / 0.75);
    out.k = k; out.age = age;
    const ft = t - LAUNCH; const flying = ft > 0;
    // ---- hero ----
    const rec = [0, 0.5, 1.7, 4.2, 4.2]; const recoil = k < 0 ? 0 : lerp(rec[Math.max(0, k - 1)] * (k > 0 ? 1 : 0), rec[k], easeOut(age / 0.5));
    hero.x = HX; hero.y = 0.15; hero.z = HZ0 - recoil;
    const G = P.group; G.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0);
    const snap = Math.exp(-age * 6);
    P.headPivot.rotation.set(-0.55 * wind + 0.75 * snap, 0, 0); G.rotation.x = -0.14 * wind + 0.32 * snap;
    P.armL.rotation.set(-0.2 - 1.5 * wind - 0.6 * snap, 0, -0.15 - 0.5 * wind); P.armR.rotation.set(-0.2 - 1.7 * wind - 0.6 * snap, 0, 0.15 + 0.5 * wind);
    if (k >= 1 && age < 0.6) { P.legL.rotation.x = 0.5 * (1 - age / 0.6); P.legR.rotation.x = -0.3 * (1 - age / 0.6); }
    if (flying) { const p = flight(ft); hero.x = p[0]; hero.y = p[1]; hero.z = p[2]; G.rotation.set(-1.25 + 0.2 * Math.sin(t * 3), 2.6 + ft * 2.4, 0.2 * Math.sin(t * 2.3));
      P.armL.rotation.set(-2.2 + Math.sin(t * 14) * 0.6, 0, -0.9); P.armR.rotation.set(-2.2 + Math.cos(t * 13) * 0.6, 0, 0.9); P.legL.rotation.set(0.5 + Math.sin(t * 12) * 0.6, 0, -0.2); P.legR.rotation.set(0.5 + Math.cos(t * 12) * 0.6, 0, 0.2); P.headPivot.rotation.set(0.3, 0, 0); }
    G.position.set(hero.x, hero.y, hero.z);
    let f = { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.4, 0] };
    if (wind > 0.02) f = { brows: wind > 0.5 ? 'worried' : 'up', eyes: lerp(1, 0.3, wind), mouth: 'open', open: lerp(0.8, 1.9, wind), look: [0, 0.6] };
    else if (age < 0.35) f = { brows: 'squint', eyes: 0.08, mouth: 'open', open: 2.0 };
    else if (k === 0) f = { brows: 'up', eyes: 1.1, mouth: 'smile', look: [-0.6, 0] };
    else if (k === 1) f = { brows: 'up', eyes: 1.6, mouth: 'o', look: [0, 0] };
    else if (k === 2) f = { brows: 'worried', eyes: 1.5, mouth: 'grit', look: [0, 1] };
    else if (k === 3) f = { brows: 'worried', eyes: 1.6, mouth: 'open', open: 1.3, look: [0, 0.4] };
    if (flying) f = { brows: 'up', eyes: 1.6, mouth: 'open', open: 2.3, look: [0, -0.4] };
    setFace(P, f); life(P, t, flying ? 0 : 1, { noBlink: f.eyes < 0.5 });
    // ---- vendor, cart, Mittens, pigeons ----
    const V = vendor; V.group.position.set(-4.75, 0.15, -5.0); V.group.rotation.set(0, 1.9, 0); V.armL.rotation.set(-0.5, 0, -0.1); V.armR.rotation.set(-0.9, 0, 0.1); V.headPivot.rotation.set(0, 0, 0);
    let vf = { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.6, 0] };
    if (k === 0) { V.armR.rotation.set(-2.5, 0, 0.3 + Math.sin(t * 11) * 0.2); vf = { brows: 'up', eyes: 1.1, mouth: 'smile', look: [0.8, 0] }; }
    if (k >= 1) { V.group.rotation.y = 0.5; V.armL.rotation.set(-2.6, 0, -0.5); V.armR.rotation.set(-2.6, 0, 0.5); V.headPivot.rotation.y = -0.3; vf = { brows: 'worried', eyes: 1.6, mouth: 'open', open: 2, look: [0, 0.3] }; }
    setFace(V, vf); life(V, t, 1);
    { const a2 = t - S[1] - 0.05; if (a2 < 0) { cart.position.set(...CART0); cart.rotation.set(0, 0, 0); } else { const a = 1 - Math.exp(-a2 * 0.9); cart.position.set(CART0[0] + 3 * a, 0.15 + Math.max(0, 7 * Math.sin(Math.min(a2, 2.4) / 2.4 * Math.PI)), CART0[2] + 85 * a); cart.rotation.set(a2 * 5, a2 * 2, a2 * 3); } }
    { const M = mittens, tp = S[1] + 0.05; M.rotation.set(0, 0, 0); M.scale.setScalar(1.3);
      if (t < S[0]) { M.position.set(CART0[0], 0.15 + 1.1, CART0[2] - 0.35); M.rotation.y = 2.6 + Math.sin(t * 0.8) * 0.15; }
      else if (t < tp) { const pf = Math.exp(-(t - S[0]) * 2.5); M.position.set(CART0[0], 0.15 + 1.1 + 0.25 * Math.sin(Math.min((t - S[0]) / 0.3, 1) * Math.PI), CART0[2] - 0.35); M.rotation.y = 2.6; M.scale.set(1.3 * (1 + 0.5 * pf), 1.3 * (1 + 0.6 * pf), 1.3); }
      else { const u = clamp((t - tp) / 0.7); M.position.set(lerp(CART0[0], 1.4, u), lerp(1.3, 5.72, u) + Math.sin(u * Math.PI) * 2.5, lerp(CART0[2], -1.0, u)); M.rotation.set(u < 1 ? -u * 6 : -1.35 + Math.sin(t * 9) * 0.06, 0, u < 1 ? 0 : Math.sin(t * 2.2) * 0.25); M.scale.set(1.5, 1.5, 1.5); if (u >= 1) M.position.y = 5.5; } }
    pigeons.forEach(pg => { const a = t - S[0] - 0.05; if (a < 0) { pg.g.position.set(pg.b[0], pg.b[1] + Math.max(0, Math.sin(t * 5 + pg.ph)) * 0.04, pg.b[2]); pg.g.rotation.y = pg.ph; pg.g.visible = true; } else { pg.g.position.set(pg.b[0] + pg.d[0] * a, pg.b[1] + pg.d[1] * a + Math.sin(t * 30 + pg.ph) * 0.1, pg.b[2] + pg.d[2] * a); pg.g.visible = a < 3; } });
    // ---- traffic & people ----
    const tb = S[1]; const hz0 = HZ0 - 0.5;
    cars.forEach((c, i) => { const tt = Math.min(t, tb + 0.5); let x = c.x, z = c.still ? c.z0 : wrap(c.z0 + c.sp * tt, -250, 254), y = 0.02, rx = 0, ry = c.ry, rz = 0;
      const d = Math.hypot(x - HX, z - hz0); const th = tb + d / 240; const front = z > hz0 - 1 && Math.abs(x - HX) < 26 + d * 0.3;
      if (front && d < 250 && t > th) { const a2 = t - th, st = clamp(1.15 - d / 250), a = 1 - Math.exp(-a2 * 1.1); z += (40 + 70 * st) * a; x += (x - HX) * 0.5 * a * st + (i % 3 - 1) * 6 * a; y += Math.max(0, (3 + 9 * st) * Math.sin(Math.min(a2, 2) / 2 * Math.PI)) + (a2 > 2 ? 0.5 : 0); rx = Math.min(a2, 2.0) * 3.3 * st; rz = Math.min(a2, 2.0) * 2.1 * st; ry += a2 * 0.8; }
      m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, 'XYZ')), sc.set(1, 1, 1)); carB.setMatrixAt(i, m4); carT.setMatrixAt(i, m4); if (c.c !== 0xf5c518) m4.compose(v.set(0, -20, 0), q, sc.set(0.001, 0.001, 0.001)); carL.setMatrixAt(i, m4); });
    carB.instanceMatrix.needsUpdate = carT.instanceMatrix.needsUpdate = carL.instanceMatrix.needsUpdate = true;
    peds.forEach((p, i) => { const tt = Math.min(t, tb + 0.2); let x = p.x, z = wrap(p.z0 + p.dir * p.sp * tt, -200, 200), y = 0.15 + (t < tb + 0.2 ? Math.abs(Math.sin(t * 8 + p.ph)) * 0.05 : 0), rx = 0, ry = p.dir > 0 ? 0 : Math.PI;
      const d = Math.hypot(x - HX, z - hz0); const th = tb + d / 240; const front = z > hz0 + 0.5;
      if (front && d < 220 && t > th) { const a2 = t - th, st = clamp(1.1 - d / 220), a = 1 - Math.exp(-a2 * 1.6); z += (6 + 26 * st) * a; x += (i % 5 - 2) * 0.8 * a; y = 0.15 + Math.max(0, (0.8 + 2.4 * st) * Math.sin(Math.min(a2, 1.1) / 1.1 * Math.PI)) + (a2 > 1.1 ? 0.2 : 0); rx = Math.PI / 2 * Math.min(1, a2 * 2.5); ry = (i % 7) * 0.9; }
      else if (t > tb + 0.2) ry = Math.atan2(HX - x, hero.z - z);
      m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, 0, 'YXZ')), sc.set(p.s, p.s, p.s)); pB.setMatrixAt(i, m4); pH.setMatrixAt(i, m4); pL.setMatrixAt(i, m4); });
    pB.instanceMatrix.needsUpdate = pH.instanceMatrix.needsUpdate = pL.instanceMatrix.needsUpdate = true;
    // ---- effects ----
    puff.position.set(HX, 1.72, hero.z + 0.25); puff.userData.update(t, S[0]);
    gust.position.set(HX, 0.15, HZ0 + 0.5); gust.userData.update(t, S[1]);
    glassF.userData.update(t, S[2] + 0.15);
    sw2.position.set(HX, 0.1, HZ0); sw2.userData.set(1 + easeOut(clamp((t - S[1]) / 2)) * 170, t >= S[1] ? (t - S[1]) / 2.2 : -1, 0.5);
    sw3.position.set(HX, 0.1, HZ0); sw3.userData.set(1 + easeOut(clamp((t - S[2]) / 3)) * 520, t >= S[2] ? (t - S[2]) / 3.2 : -1, 0.8);
    const r4 = 5 + easeOut(clamp((t - S[3]) / 3.4)) * 2600; sw4.position.set(HX, 0.1, HZ0); sw4.userData.set(r4, t >= S[3] ? (t - S[3]) / 3.6 : -1, 0.5);
    sw5.position.set(HX, 0.1, HZ0 - 4); sw5.userData.set(1 + easeOut(clamp((t - S[4]) / 1.2)) * 90, t >= S[4] && t < S[4] + 1.3 ? (t - S[4]) / 1.3 : -1, 0.6);
    wring.scale.setScalar(Math.max(1, r4 * 1.05)); wring.material.opacity = t >= S[3] ? 0.55 * clamp(1 - (t - S[3]) / 4.2) : 0;
    U.uBreak.value = t < S[2] ? 0 : t < S[3] ? easeOut(clamp((t - S[2]) / 3)) * 560 : 560 + easeOut(clamp((t - S[3]) / 3.2)) * 3200;
    trail.visible = flying; if (flying) { for (let i = 0; i < NTR; i++) { const p = flight(Math.max(0, ft - i * 0.012)); const j = trJ[i], w = i * 0.035; trPos.set([p[0] + j[0] * w, p[1] + j[1] * w, p[2] + j[2] * w], i * 3); } trG.attributes.position.needsUpdate = true; }
    { const pp = flight(2.75); plane.position.set(pp[0] - 34 + (ft - 2.75) * 70, pp[1] - 7, pp[2] - 6); plane.visible = flying && ft < 6; }
    // ---- cameras ----
    let c, g, fov = 50; const hd = [hero.x, hero.y + 1.6, hero.z]; const seg = (a, b) => clamp((t - a) / (b - a)); let shC = [HX, HZ0, 70];
    if (flying && t >= 23.65) { const ox = 3.4 * smooth(1.9, 2.8, ft), up = 0.8 + 0.5 * Math.sin(t * 0.9); c = [hero.x + ox + 0.6, hero.y + up, hero.z - 5.8]; g = [hero.x, hero.y + 0.5, hero.z]; fov = 58; out.shake = 5; shC = [10, -700, 1500]; }
    else if (t < 6.5) { const u = easeInOut(seg(HOOK, 6.5)); c = [lerp(10, 9, u), lerp(430, 4.2, u), lerp(540, 13, u)]; g = [lerp(10, HX, u), lerp(40, 1.5, u), lerp(-120, HZ0, u)]; fov = lerp(60, 50, u); shC = u < 0.6 ? [10, 100, 900] : [HX, HZ0, 80]; }
    else if (t < 7.75) { const u = seg(6.5, 7.75); c = [-1.6, 1.72, hd[2] + lerp(2.5, 2.2, u)]; g = [hd[0], 1.72, hd[2]]; fov = 40; }
    else if (t < 9.15) { const u = seg(7.75, 9.15); c = [lerp(2.6, 2.2, u), 1.9, lerp(-1.6, -2.0, u)]; g = [-3.3, 1.35, -6.2]; fov = 50; }
    else if (t < S[1]) { c = [-1.9, 1.3, hd[2] + 2.0]; g = [hd[0], 1.7, hd[2]]; fov = 42; }
    else if (t < 11.5) { const u = seg(S[1], 11.5); c = [lerp(-4.0, -3.6, u), lerp(2.5, 3.4, u), lerp(-12.8, -14.5, u)]; g = [3, 2.2, 40]; fov = 60; out.shake = 12 * Math.exp(-(t - S[1]) * 2); }
    else if (t < 12.75) { const u = seg(11.5, 12.75); c = [14, lerp(15, 19, u), lerp(-34, -30, u)]; g = [8, 2, 55]; fov = 55; }
    else if (t < 14.2) { const u = seg(12.75, 14.2); c = [lerp(4.6, 4.2, u), 4.6, 2.4]; g = [1.4, 5.75, -1.0]; fov = 34; }
    else if (t < S[2]) { c = [-1.8, 1.25, hd[2] + 2.1]; g = [hd[0], 1.7, hd[2]]; fov = 42; }
    else if (t < 16.7) { const u = seg(S[2], 16.7); c = [10, 1.6, lerp(-16, -20, u)]; g = [9, lerp(30, 120, easeOut(u)), 110]; fov = 68; out.shake = 14 * Math.exp(-(t - S[2]) * 1.5); shC = [10, 60, 200]; }
    else if (t < 19.0) { const u = easeInOut(seg(16.7, 19.0)); c = [10, lerp(40, 250, u), lerp(-70, -260, u)]; g = [10, lerp(60, 40, u), lerp(80, 150, u)]; fov = 58; shC = [10, 100, 700]; }
    else if (t < S[3]) { c = [-1.8, 1.25, hd[2] + 2.1]; g = [hd[0], 1.7, hd[2]]; fov = 42; }
    else if (t < 21.3) { const u = seg(S[3], 21.3); c = [lerp(900, 1050, u), lerp(1150, 1300, u), lerp(-1700, -1850, u)]; g = [10, 0, 60]; fov = 50; out.shake = 8 * Math.exp(-(t - S[3]) * 1.5); shC = [10, 97, 1500]; }
    else if (t < 22.25) { const u = seg(21.3, 22.25); c = [lerp(1180, 1150, u), 28, lerp(-560, -600, u)]; g = [150, 120, -520]; fov = 52; shC = [10, -400, 1100]; }
    else if (t < S[4]) { c = [-1.8, 1.25, hd[2] + 2.1]; g = [hd[0], 1.7, hd[2]]; fov = 42; }
    else { c = [9, 1.5, 22]; g = [hero.x, hero.y + 1, hero.z]; fov = lerp(55, 30, smooth(S[4] + 0.3, 23.65, t)); out.shake = 14 * Math.exp(-(t - S[4]) * 2); shC = [10, -150, 300]; }
    setShadow(...shC);
    cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix();
    for (let i = 1; i < 5; i++) out.flash = Math.max(out.flash, 0.55 * pulse(t, S[i], 0.18));
    return out;
  }

  const prj = (x, y, z) => { tv.set(x, y, z); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); tv.project(cam); return tv.z < 1 && Math.abs(tv.x) < 0.9 && Math.abs(tv.y) < 0.9 ? [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920] : null; };
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const caps = [[S[1] + 1.2, 'SONIC BOOM', 1.6], [S[2] + 1.6, '40 FLOORS. GONE.', 1.8], [S[3] + 0.9, 'ALL OF MANHATTAN', 1.8]];
  function hud(ctx, t_, st) { const W = 1080, H = 1920; const t = st.t, k = st.k, age = st.age;
    if (!st.hook) drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF EVERY SNEEZE', size: 86 }, { text: 'WAS 10x STRONGER?', size: 92, accent: true }], t_, '#7fe3ff', { start: 3.95, outAt: 6.6 });
    const titleOn = !st.hook && t_ > 3.5 && t_ < 7.0; const yC = lerp(H * 0.105, H * 0.268, titleOn ? 1 - smooth(6.6, 7.0, t_) : 0);
    const kk = Math.max(0, k); const prev = k > 0 ? speeds[k - 1] : 0; const val = k < 0 ? 0 : lerp(prev, speeds[k], easeOut(age / 0.35));
    const danger = clamp(kk / 4); const colr = `rgb(${Math.round(lerp(127, 255, danger))},${Math.round(lerp(227, 70, danger))},${Math.round(lerp(255, 50, danger))})`;
    drawSideCounter(ctx, W, H, { y: yC, label: k < 0 ? 'SNEEZE SPEED' : `SNEEZE #${k + 1}  ·  ${mults[kk]}`, value: `${fmt(val)} km/h`, note: k < 0 ? 'charging...' : notes[kk], bump: k >= 0 ? Math.max(0, 1 - age / 0.35) : 0, color: colr, glow: colr });
    const where = k >= 4 ? 'NEW YORK AIRSPACE' : k === 3 ? 'ALL OF MANHATTAN' : 'MIDTOWN, NYC';
    ctx.save(); ctx.font = `800 26px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.fillText(`${where}  ·  12:0${Math.max(1, k + 1)} PM`, 58, yC + 196); ctx.restore();
    if (t_ >= HOOK - 0.05 && t_ < CARD) { const a = clamp(Math.min((t_ - HOOK + 0.05) / 0.1, (CARD - t_) / 0.12)); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, H * 0.44, W, 190); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 66px ${FONT}`; ctx.fillText('25 SECONDS EARLIER', W / 2 + 75, H * 0.44 + 97);
      ctx.beginPath(); for (const dx of [0, 44]) { ctx.moveTo(118 + dx + 40, H * 0.44 + 62); ctx.lineTo(118 + dx, H * 0.44 + 96); ctx.lineTo(118 + dx + 40, H * 0.44 + 130); } ctx.fill(); ctx.restore(); }
    for (const [at, txt, dur] of caps) drawCaption(ctx, W, H, txt, t - at, { dur });
    const say = (p, at, txt, dur) => { if (p) drawBubble(ctx, p[0], p[1], txt, t - at, { dur }); };
    const hp = prj(hero.x, hero.y + 2.1, hero.z);
    vendor.headPivot.getWorldPosition(tv); const vp = prj(tv.x, tv.y + 0.5, tv.z);
    say(vp, S[0] + 0.85, 'bless you!', 1.3); say(vp, S[1] + 0.5, 'MY CART!!', 1.3); say(hp, S[2] + 4.45, 'oh no.', 0.4); say(hp, S[3] - 0.45, 'not again', 0.45); say(hp, S[4] - 0.4, 'sorry!!', 0.4);
    const mp = mittens.position; const mt = prj(mp.x, mp.y + 0.95, mp.z); if (mt) { drawTag(ctx, mt[0], mt[1], 'MITTENS', t - 7.8, { dur: 1.3 }); say(mt, 13.0, 'mrrow!!', 1.1); }
    if (st.hook || t > 24.2) say(hp, st.hook ? TOTAL + 0.3 : 24.3, 'AAAAAAA!', st.hook ? 2.6 : 2.6);
    if (plane.visible) { const pl = prj(plane.position.x, plane.position.y + 5, plane.position.z); say(pl, LAUNCH + 2.3, '?!', 0.9); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL } };
}
