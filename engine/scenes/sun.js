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
  const U = { uO: { value: new THREE.Vector2(HX, HZ0) }, uBreak: { value: 0 }, uK: { value: 0.5 }, uNight: { value: 0 } };
  const bMat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 });
  bMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vOn = normal; vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\n vWp = (modelMatrix * wp4).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn; uniform vec2 uO; uniform float uBreak; uniform float uK; uniform float uNight;').replace('#include <color_fragment>', `#include <color_fragment>
      if (abs(vOn.y) < 0.5) { float uu = abs(vOn.x) > 0.5 ? vWp.z : vWp.x; vec2 c = vec2(uu / 3.2, vWp.y / 3.6); vec2 f = fract(c); vec2 id = floor(c);
        float hh = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
        float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.8);
        vec3 glass = mix(vec3(0.08, 0.13, 0.2), vec3(0.5, 0.68, 0.85), hh * hh);
        if (vWp.y < 4.8) { float fy = vWp.y / 4.8; win = step(0.06, f.x) * step(f.x, 0.94) * step(0.12, fy) * step(fy, 0.78); glass = mix(vec3(1.0, 0.86, 0.55), vec3(0.16, 0.2, 0.26), step(0.55, hh)); }
        float d = distance(vWp.xz, uO); float broken = step(d + vWp.y * uK, uBreak) * step(0.2, hh);
        glass = mix(glass, vec3(0.015, 0.015, 0.02), broken);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, win);
        float lit = vWp.y < 4.8 ? 1.0 : step(0.42, hh); totalEmissiveRadiance += win * lit * uNight * mix(vec3(1.0, 0.8, 0.5), vec3(0.75, 0.85, 1.0), step(0.8, hh)) * 0.42; }`); };
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
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: softTex(THREE, 128), color: 0xffffff, size: 70, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true, fog: false })); pts.frustumCulled = false; A.add(pts); A.userData.clouds = pts; }

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
  trafficLight(21.2, 15, Math.PI); trafficLight(-1.2, -61, 0); trafficLight(21.2, 75, Math.PI);
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

  // ---------------- night rig ----------------
  const nightDome = new THREE.Mesh(new THREE.SphereGeometry(60000, 24, 12), new THREE.MeshBasicMaterial({ color: 0x02030a, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false })); nightDome.renderOrder = -9; nightDome.visible = false; A.add(nightDome);
  const NS = 1800, sp = new Float32Array(NS * 3); for (let k = 0; k < NS; k++) { const a = R() * Math.PI * 2, y = R() * 0.98 + 0.02, r = Math.sqrt(1 - y * y); sp.set([Math.cos(a) * r * 40000, y * 40000, Math.sin(a) * r * 40000], k * 3); }
  const sG = new THREE.BufferGeometry(); sG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sG, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false })); stars.frustumCulled = false; stars.visible = false; A.add(stars);
  const MD = new THREE.Vector3(0.03, 0.5, -0.865).normalize();
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1100, 24, 16), new THREE.MeshBasicMaterial({ color: 0xdfe8f2, fog: false })); moon.position.copy(MD).multiplyScalar(40000); A.add(moon);
  const JD = new THREE.Vector3(0.08, 0.36, -0.93).normalize(); const jup = new THREE.Mesh(new THREE.SphereGeometry(170, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1cf, fog: false })); jup.position.copy(JD).multiplyScalar(40000); jup.visible = false; A.add(jup);
  const glow = new THREE.PointLight(0xffc98a, 0, 14, 1.6); glow.position.set(-2.2, 2.6, -6.2); A.add(glow);
  const carH = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.16, 0.08).translate(0, 0.72, 2.27), new THREE.MeshBasicMaterial({ color: 0xfff4d0, toneMapped: false }), NC);
  const carR = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.14, 0.08).translate(0, 0.74, -2.27), new THREE.MeshBasicMaterial({ color: 0xff2a22, toneMapped: false }), NC); [carH, carR].forEach(m => { m.frustumCulled = false; A.add(m); });
  const phP = new Float32Array(NP * 3), phG = new THREE.BufferGeometry(); phG.setAttribute('position', new THREE.BufferAttribute(phP, 3));
  const phones = new THREE.Points(phG, new THREE.PointsMaterial({ map: softTex(THREE), color: 0xdfeaff, size: 0.45, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false })); phones.frustumCulled = false; A.add(phones);

  plane.visible = false;
  const EV = 7.0, SLOW = 6, RET = EV + 5 * SLOW, CARDT = RET + 6, TOT = CARDT + 6;
  const hero = { x: HX, y: 0.15, z: HZ0 }; const tv = new THREE.Vector3();
  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.35, bloomThreshold: 0.9, shake: 0, flash: 0, t };
    const night = t >= EV && t < RET; const story = clamp((t - EV) / SLOW, 0, 5); out.night = night; out.story = story;
    const tm = t < EV ? t : t < RET ? EV + story : EV + 5 + (t - RET);
    // world time for moving things: they brake to a stop in the dark, then carry on
    const move = (k) => t < EV ? t : EV + k * (1 - Math.exp(-story * 1.6)) + Math.max(0, t - RET);
    hemi.intensity = night ? 0.09 : 1.0; hemi.color.set(night ? 0x90a8ff : 0xcfe4ff); sun.intensity = night ? 0 : 2.0; A.fog.color.set(night ? 0x04060c : 0xbfd6ea);
    nightDome.visible = night; stars.visible = night; jup.visible = night; U.uNight.value = night ? 1 : 0; glow.intensity = night ? 2.0 : 0;
    moon.visible = night ? story < 1.45 : !(t >= RET && t < RET + 1.3); moon.material.color.set(night ? 0xffffff : 0xdfe8f2);
    A.userData.clouds.visible = !night; if (night) { out.bloom = 0.5; out.bloomThreshold = 0.8; }
    // hero + vendor look up
    const lu = night ? smooth(0.15, 0.9, story) : t >= RET ? 1 - smooth(RET + 1.5, RET + 3, t) : 0;
    const G = P.group; G.position.set(HX, 0.15, HZ0); G.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0);
    P.headPivot.rotation.set(-0.6 * lu, 0, 0); P.armL.rotation.set(-0.15, 0, -0.12); P.armR.rotation.set(-0.15 - 0.5 * lu, 0, 0.12);
    setFace(P, lu > 0.3 ? { brows: 'up', eyes: 1.5, mouth: 'o', look: [0, 1] } : { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.4, 0] }); life(P, tm, 1);
    const V = vendor; V.group.position.set(-4.75, 0.15, -5.0); V.group.rotation.set(0, 1.9, 0); V.armL.rotation.set(-0.5, 0, -0.1); V.armR.rotation.set(-0.9, 0, 0.1); V.headPivot.rotation.set(-0.55 * lu, 0, 0);
    setFace(V, lu > 0.3 ? { brows: 'worried', eyes: 1.5, mouth: 'open', open: 1.5, look: [0, 1] } : { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.6, 0] }); life(V, tm, 1);
    cart.position.set(...CART0); cart.rotation.set(0, 0, 0);
    mittens.position.set(CART0[0], 0.15 + 1.1, CART0[2] - 0.35); mittens.rotation.set(0, 2.6 + Math.sin(tm * 0.8) * 0.15, 0); mittens.scale.setScalar(night ? 1.3 * (1 + 0.35 * Math.exp(-story * 2)) : 1.3);
    pigeons.forEach(pg => { const a = tm - EV - 0.03; if (a < 0) { pg.g.position.set(pg.b[0], pg.b[1] + Math.max(0, Math.sin(t * 5 + pg.ph)) * 0.04, pg.b[2]); pg.g.rotation.y = pg.ph; pg.g.visible = true; } else { pg.g.position.set(pg.b[0] + pg.d[0] * a * 0.5, pg.b[1] + pg.d[1] * a * 0.5 + Math.sin(tm * 30 + pg.ph) * 0.1, pg.b[2] + pg.d[2] * a * 0.5); pg.g.visible = a < 5; } });
    const tc = move(1.3), tp = move(0.45);
    cars.forEach((c, i) => { const x = c.x, z = c.still ? c.z0 : wrap(c.z0 + c.sp * tc, -250, 254);
      m4.compose(v.set(x, 0.02, z), q.setFromEuler(e.set(0, c.ry, 0, 'XYZ')), sc.set(1, 1, 1)); carB.setMatrixAt(i, m4); carT.setMatrixAt(i, m4); carH.setMatrixAt(i, m4); carR.setMatrixAt(i, m4); if (c.c !== 0xf5c518) m4.compose(v.set(0, -20, 0), q, sc.set(0.001, 0.001, 0.001)); carL.setMatrixAt(i, m4); });
    [carB, carT, carL, carH, carR].forEach(m => m.instanceMatrix.needsUpdate = true);
    const phOn = night ? smooth(1.2, 2.4, story) : 0;
    peds.forEach((p, i) => { const x = p.x, z = wrap(p.z0 + p.dir * p.sp * tp, -200, 200), walking = !night || story < 0.5; const y = 0.15 + (walking ? Math.abs(Math.sin(tp * 8 + p.ph)) * 0.05 : 0);
      m4.compose(v.set(x, y, z), q.setFromEuler(e.set(night ? -0.12 * lu : 0, p.dir > 0 ? 0 : Math.PI, 0, 'YXZ')), sc.set(p.s, p.s, p.s)); pB.setMatrixAt(i, m4); pH.setMatrixAt(i, m4); pL.setMatrixAt(i, m4);
      phP.set(i % 3 === 0 ? [x + 0.25, 1.95 * p.s, z] : [0, -50, 0], i * 3); });
    pB.instanceMatrix.needsUpdate = pH.instanceMatrix.needsUpdate = pL.instanceMatrix.needsUpdate = true; phG.attributes.position.needsUpdate = true; phones.material.opacity = 0.95 * phOn;
    // ---- camera: one continuous move, two cuts ----
    let c, g, fov = 45, shC = [HX, HZ0, 70]; const A0 = [0.7, 1.7, 3.2], A1 = [0.7, 1.7, 1.2];
    const moonAt = (p) => [p[0] + MD.x * 200, p[1] + MD.y * 200, p[2] + MD.z * 200];
    if (t < EV) { const u = t / EV; c = [A0[0], A0[1], lerp(A0[2], A1[2], u)]; g = [HX, 1.5, HZ0]; }
    else if (t < 19) { const u = easeInOut(clamp((t - EV - 0.4) / 6.5)); c = A1; const m = moonAt(A1); g = [lerp(HX, m[0], u), lerp(1.5, m[1], u), lerp(HZ0, m[2], u)]; fov = lerp(45, 52, u); }
    else if (t < 31) { const u = easeInOut((t - 19) / 12); c = [lerp(A1[0], 10, smooth(0, 0.25, u)), lerp(A1[1], 310, u), lerp(A1[2], -140, u)]; const m = moonAt(A1); g = [lerp(m[0], 10, u), lerp(m[1], 30, u), lerp(m[2], -720, u)]; fov = lerp(52, 58, u); shC = [10, -300, 900]; }
    else if (t < RET) { const u = (t - 31) / (RET - 31); c = [-1.75, 1.5, HZ0 + lerp(2.6, 2.2, u)]; g = [HX, 1.74, HZ0]; fov = 40; }
    else { const u = easeInOut(clamp((t - RET - 0.6) / 4.5)); c = [lerp(-1.75, A0[0], u), lerp(1.5, A0[1], u), lerp(HZ0 + 2.2, A0[2], u)]; g = [HX, lerp(1.74, 1.5, u), HZ0]; fov = lerp(40, 45, u); }
    if ((new URLSearchParams(location.search).get('dbg') || '').includes('V')) { c = [0.7, 14, 10]; g = [0, 0, -2]; fov = 60; }
    setShadow(...shC); cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix();
    out.flash = 0.9 * pulse(t, RET, 0.35);
    return out;
  }
  const FS = 'Georgia, "Times New Roman", serif';
  const lines = [[0.8, 3.6, "You're in Midtown, New York. 12:01 PM."], [3.9, 6.8, "The Sun went dark 8 minutes ago. You can't know yet."], [7.6, 10.6, 'The whole sky switches off at once.'], [10.9, 13.4, 'No sunset. No warning.'], [13.8, 15.6, 'The Moon is still shining.'], [15.9, 18.6, 'Its last light takes one more second to run out.'],
    [19.4, 22.6, 'The stars were there all along.'], [23.0, 26.4, 'Eight billion people look up.'], [26.8, 30.4, "Jupiter keeps glowing. It won't notice for an hour."], [31.2, 33.8, 'The air has no time to cool.'], [34.1, 36.8, 'Then the light that was 5 seconds late arrives.'], [37.6, 40.2, 'Nothing broke. Nothing burned.'], [40.5, 43.0, 'The sky just blinked.']];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function hud(ctx, t, st) { const W = 1080, H = 1920;
    if (t < CARDT + 0.6) {
      drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF THE SUN SWITCHED OFF', size: 80 }, { text: 'FOR 5 SECONDS?', size: 96, accent: true }], t, '#ffd23f', { start: 0.3, outAt: 6.0 });
      const yC = lerp(H * 0.268, H * 0.105, smooth(6.0, 6.6, t)); const f3 = (x) => `0:0${Math.max(0, x).toFixed(3)}`;
      const o = t < EV ? { label: 'DARKNESS ARRIVES IN', value: f3(EV - t), color: '#ffd23f' } : t < RET ? { label: 'SUNLIGHT RETURNS IN', value: f3(5 - st.story), color: '#8fb4ff' } : { label: 'SUNLIGHT', value: 'BACK', color: '#ffd23f' };
      drawSideCounter(ctx, W, H, { y: yC, ...o, note: t < EV ? 'real time' : t < RET ? 'slow motion · 6x' : '', bump: Math.max(pulse(t, EV, 0.4), pulse(t, RET, 0.4)), glow: o.color });
      for (const [a, b, txt] of lines) { if (t < a || t > b) continue; const al = clamp(Math.min((t - a) / 0.3, (b - t) / 0.3)); ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 50px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
        wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * 0.70 + i * 64); ctx.fillText(l, W / 2, H * 0.70 + i * 64); }); ctx.restore(); }
      if (st.night && st.story > 2.6) { tv.copy(jup.position); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); tv.project(cam); if (tv.z < 1 && Math.abs(tv.x) < 0.9 && Math.abs(tv.y) < 0.9) { ctx.save(); ctx.font = `700 24px ${FONT}`; ctx.fillStyle = 'rgba(255,241,207,0.9)'; ctx.textAlign = 'left'; ctx.fillText('JUPITER', (tv.x * 0.5 + 0.5) * 1080 + 16, (1 - (tv.y * 0.5 + 0.5)) * 1920 + 8); ctx.restore(); } }
    }
    if (t >= CARDT) { const a = smooth(CARDT, CARDT + 0.6, t); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `500 62px ${FS}`; ctx.fillText('What if the Sun switched off', W / 2, H * 0.40); ctx.fillStyle = '#ffd23f'; ctx.fillText('for 5 seconds?', W / 2, H * 0.40 + 80);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `600 24px ${FONT}`; ctx.fillText('SUNLIGHT TAKES 8 MIN 20 S TO REACH EARTH  ·  MOONLIGHT 1.3 S', W / 2, H * 0.40 + 170);
      ctx.fillStyle = '#fff'; ctx.font = `italic 600 46px ${FS}`; ctx.fillText('What should we try next?', W / 2, H * 0.60); ctx.fillStyle = '#ffd23f'; ctx.font = `800 30px ${FONT}`; ctx.fillText('TELL US IN THE COMMENTS', W / 2, H * 0.60 + 66); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
