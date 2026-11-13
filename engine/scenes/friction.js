import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, makeSkyDome, makeCat, softTex, setFace, life, drawSideCounter, drawTitleTimed, RoundedBoxGeometry } from './lib.js';
import { makeStreetLife } from './streetlife.js';

// Nov 14 episode — format_v5 structure (same countdown / slow-motion / end-card skeleton as the approved sun prototype),
// but its own place, stake, consequences, lines and transformation:
// PLACE: a pavement cafe outside a bakery on a late-afternoon avenue (not the balcony, not the hot-dog cart corner).
// STAKE: you are crouched tying a shoelace; the knot is the thing friction takes away, and the lace is paid off at the end.
// TRANSFORMATION: every surface in the city turns mirror-slick - the road goes glassy, and everything that was moving
// simply keeps going: the taxi, the coffee, the pedestrians, Mittens on her chair, and a sand pile that flows flat.
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;

const EV = 7.0, SLOW = 6, RET = EV + 5 * SLOW, CARDT = 45.6, TOT = 51.8;
const HX = -2.6, HZ0 = -8;

export async function create({ THREE, W, H }) {
  const R = rng(141);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e5);
  A.fog = new THREE.FogExp2(0xd8c8ac, 0.00014);
  const hemi = new THREE.HemisphereLight(0xdce9ff, 0x7a6a52, 0.95); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd8a4, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; A.add(sun, sun.target);
  const SUN = new THREE.Vector3(0.82, 0.38, 0.28).normalize();
  function setShadow(cx, cz, size) { sun.target.position.set(cx, 0, cz); sun.position.set(cx + SUN.x * 1500, SUN.y * 1500, cz + SUN.z * 1500); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 10; c.far = 3500; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 200 ? 2 : 0.05; }
  A.add(makeSkyDome(THREE, 0x3f7fd0, 0xf6dcb4, [SUN.x, SUN.y, SUN.z]));

  // ---------------- the city (channel's locked New-York look) ----------------
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshStandardMaterial({ color: 0x2e5f7f, roughness: 0.22, metalness: 0.35 })); water.rotation.x = -Math.PI / 2; water.position.y = -1.5; A.add(water);
  const I0 = -6, I1 = 5, J0 = -22, J1 = 24;
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x3f4248, roughness: 0.95 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1224, 2, 2838), slabMat); slab.position.set(10, -1, 97); slab.receiveShadow = true; A.add(slab);
  const U = { uO: { value: new THREE.Vector2(HX, HZ0) }, uBreak: { value: 0 }, uK: { value: 0.5 }, uNight: { value: 0 } };
  const bMat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 });
  bMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vOn = normal; vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\n vWp = (modelMatrix * wp4).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn; uniform vec2 uO; uniform float uBreak; uniform float uK; uniform float uNight;').replace('#include <color_fragment>', `#include <color_fragment>
      if (abs(vOn.y) < 0.5) { float uu = abs(vOn.x) > 0.5 ? vWp.z : vWp.x; vec2 c = vec2(uu / 3.2, vWp.y / 3.6); vec2 f = fract(c); vec2 id = floor(c);
        float hh = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
        float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.8);
        vec3 glass = mix(vec3(0.1, 0.14, 0.2), vec3(0.62, 0.72, 0.84), hh * hh);
        if (vWp.y < 4.8) { float fy = vWp.y / 4.8; win = step(0.06, f.x) * step(f.x, 0.94) * step(0.12, fy) * step(fy, 0.78); glass = mix(vec3(1.0, 0.9, 0.62), vec3(0.18, 0.22, 0.28), step(0.55, hh)); }
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, win);
        float lit = vWp.y < 4.8 ? 1.0 : step(0.42, hh); totalEmissiveRadiance += win * lit * uNight * vec3(1.0, 0.82, 0.52) * 0.42; }`); };
  const pal = [0x9a5b46, 0xb08968, 0xc9b79c, 0x8d8f94, 0xa39a8c, 0xd9d2c5, 0x7c4a3a, 0xb7a58f], glassPal = [0x4a5f74, 0x6f8fa8, 0x55707f, 0x8aa6b8, 0x3f4d5c];
  const blds = [], walks = [], tanks = [], spires = [];
  const inPark = (i, j) => i >= 0 && i <= 2 && j >= 9 && j <= 20;
  for (let i = I0; i <= I1; i++) for (let j = J0; j <= J1; j++) {
    const bx0 = 100 * i + 20, bz0 = 60 * j + 14, cx = bx0 + 40, cz = bz0 + 23;
    if (inPark(i, j) || (i === 0 && j === -3)) continue;   // one empty block = the construction lot
    walks.push([cx, cz]);
    const mid = Math.abs(cz) < 520 && Math.abs(cx - 10) < 380, down = cz < -850, nearPark = i >= -1 && i <= 3 && j >= 8 && j <= 21;
    const n = R() < 0.45 ? 2 : 3; let x = bx0 + 5; const wTot = 70 - (n - 1);
    const cuts = []; for (let k = 0; k < n; k++) cuts.push(0.7 + R()); const sum = cuts.reduce((a, b) => a + b, 0);
    for (let k = 0; k < n; k++) { const w = wTot * cuts[k] / sum; const r = R();
      let h = mid ? 70 + 190 * r * r : down ? 60 + 210 * r * r : nearPark ? 40 + 70 * r : 22 + 50 * r;
      if (i === -1 && j === -1) h = 48 + 18 * r; if (i === 0 && j === 0 && k === 0) h = 230; if (i === 0 && j === -1 && k === 0) h = 160; if (i === -1 && j === 0) h = 110 + 60 * r;
      const glassy = h > 110 && R() < 0.75; const c = glassy ? glassPal[Math.floor(R() * glassPal.length)] : pal[Math.floor(R() * pal.length)];
      const d = 36 - (R() < 0.3 ? 6 : 0);
      blds.push([x + w / 2, 0.15, cz, w, h, d, c]);
      if (h > 150) { blds.push([x + w / 2, 0.15 + h, cz, w * 0.62, h * 0.22, d * 0.62, c]); if (h > 236) spires.push([x + w / 2, 0.15 + h * 1.22, cz, h * 0.13]); }
      else if (h < 80 && Math.abs(cx) < 500 && Math.abs(cz) < 500 && R() < 0.6) tanks.push([x + w / 2 + (R() - 0.5) * w * 0.4, 0.15 + h, cz + (R() - 0.5) * 14]);
      x += w + 1; }
  }
  const shoreM = new THREE.MeshStandardMaterial({ color: 0x5a6356, roughness: 1 });
  for (const [x0, x1] of [[1000, 6000], [-6000, -960]]) { const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 2, 9000), shoreM); s.position.set((x0 + x1) / 2, -1, 0); s.receiveShadow = true; A.add(s);
    for (let k = 0; k < 420; k++) { const bx = x0 + 30 + R() * R() * 2200 * (x0 > 0 ? 1 : 0) + (x0 < 0 ? (x1 - x0 - 30 - R() * R() * 2200) : 0), bz = -3000 + R() * 6000; const r = R(); blds.push([bx, 0, bz, 30 + R() * 40, 10 + 55 * r * r * r + (R() < 0.04 ? 80 : 0), 30 + R() * 30, pal[Math.floor(R() * pal.length)]]); } }
  const boxG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const bMesh = new THREE.InstancedMesh(boxG, bMat, blds.length);
  blds.forEach(([x, y, z, w, h, d, c], k) => { m4.compose(v.set(x, y, z), q.identity(), sc.set(w, h, d)); bMesh.setMatrixAt(k, m4); bMesh.setColorAt(k, col.set(c)); });
  bMesh.castShadow = bMesh.receiveShadow = true; bMesh.frustumCulled = false; A.add(bMesh);
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xbfbbb0, roughness: 0.95, metalness: 0.0 });
  const wMesh = new THREE.InstancedMesh(boxG, walkMat, walks.length);
  walks.forEach(([x, z], k) => { m4.compose(v.set(x, 0, z), q.identity(), sc.set(80, 0.15, 46)); wMesh.setMatrixAt(k, m4); }); wMesh.receiveShadow = true; wMesh.frustumCulled = false; A.add(wMesh);
  const spM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.4, metalness: 0.5 }), Math.max(1, spires.length));
  spires.forEach(([x, y, z, h], k) => { m4.compose(v.set(x, y, z), q.identity(), sc.set(h * 0.25, h, h * 0.25)); spM.setMatrixAt(k, m4); }); spM.castShadow = true; spM.frustumCulled = false; A.add(spM);
  const tkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.6, 1.6, 3.4, 10).translate(0, 3.2, 0), new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.9 }), Math.max(1, tanks.length));
  tanks.forEach(([x, y, z], k) => { m4.compose(v.set(x, y, z), q.identity(), sc.set(1, 1, 1)); tkM.setMatrixAt(k, m4); }); tkM.castShadow = true; tkM.frustumCulled = false; A.add(tkM);
  { const lawn = new THREE.Mesh(new THREE.BoxGeometry(300, 0.3, 734), new THREE.MeshStandardMaterial({ color: 0x4f8f3f, roughness: 1 })); lawn.position.set(160, 0, 60 * 9 + 367); lawn.receiveShadow = true; A.add(lawn);
    const nT = 380; const tr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1).translate(0, 1.3, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), nT);
    for (let k = 0; k < nT; k++) { const x = 15 + R() * 290, z = 545 + R() * 724; const s = 4 + R() * 4; m4.compose(v.set(x, 0, z), q.identity(), sc.set(s, s * 1.2, s)); tr.setMatrixAt(k, m4); tr.setColorAt(k, col.setHSL(0.25 + R() * 0.07, 0.5, 0.24 + R() * 0.12)); }
    tr.castShadow = true; tr.frustumCulled = false; A.add(tr); }
  // suspension bridge (Brooklyn Bridge stand-in, labelled during the rise)
  const BRIDGE = [810, 55, -950];
  { const bm = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.8 }); const deck = new THREE.Mesh(new THREE.BoxGeometry(400, 2.5, 18), bm); deck.position.set(810, 40, -950); deck.castShadow = true; A.add(deck);
    for (const x of [720, 900]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(12, 100, 22), bm); tw.position.set(x, 48, -950); tw.castShadow = true; A.add(tw); }
    for (const z of [-958, -942]) { const curve = new THREE.CatmullRomCurve3([[612, 41], [720, 97], [810, 50], [900, 97], [1008, 41]].map(([x, y]) => new THREE.Vector3(x, y, z))); A.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.7, 5), bm)); } }
  // construction lot with a sand pile that flows flat when friction goes (labelled)
  const SAND = [60, 0.2, -143];
  const sandPile = new THREE.Mesh(new THREE.ConeGeometry(17, 13, 24), new THREE.MeshStandardMaterial({ color: 0xd9bd86, roughness: 1 }));
  sandPile.position.set(SAND[0], SAND[1], SAND[2]); sandPile.castShadow = sandPile.receiveShadow = true; A.add(sandPile);
  { const lot = new THREE.Mesh(new THREE.BoxGeometry(72, 0.2, 48), new THREE.MeshStandardMaterial({ color: 0x8d7d63, roughness: 1 })); lot.position.set(SAND[0], 0.18, SAND[2]); lot.receiveShadow = true; A.add(lot);
    const fenceM = new THREE.MeshStandardMaterial({ color: 0xe0762a, roughness: 0.7 });
    for (let k = -4; k <= 4; k++) { const p = new THREE.Mesh(new RoundedBoxGeometry(7, 1.8, 0.3, 3, 0.1), fenceM); p.position.set(SAND[0] + k * 8, 1.1, SAND[2] + 24); p.castShadow = true; A.add(p); } }

  // ---------------- street level: the avenue + the pavement cafe ----------------
  const white = new THREE.MeshBasicMaterial({ color: 0xe9e9e4 });
  { const marks = []; for (const x of [5, 10, 15]) for (let z = -300; z < 300; z += 9) { if (wrap(z, 0, 60) < 15) continue; marks.push([x, z + 2, 0.22, 3.2]); }
    for (const zc of [-58.5, -47.5, 1.5, 12.5, 61.5, 72.5]) for (let x = 1.5; x < 19; x += 1.7) marks.push([x, zc, 0.8, 2.6]);
    const mk = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), white, marks.length); marks.forEach(([x, z, w, l], k) => { m4.compose(v.set(x, 0.03, z), q.identity(), sc.set(w, 1, l)); mk.setMatrixAt(k, m4); }); mk.frustumCulled = false; A.add(mk); }
  const dark = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.4 });
  function trafficLight(x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0.15, z); g.rotation.y = ry; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 6.2, 10), dark); pole.position.y = 3.1; g.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.5, 8), dark); arm.rotation.z = Math.PI / 2; arm.position.set(2.75, 6.0, 0); g.add(arm);
    const box = new THREE.Mesh(new RoundedBoxGeometry(0.4, 1.15, 0.35, 3, 0.08), new THREE.MeshStandardMaterial({ color: 0xd8a514, roughness: 0.6 })); box.position.set(4.9, 5.35, 0); g.add(box);
    [[0xff3b30, 0.36], [0xffcc00, 0], [0x34d058, -0.36]].forEach(([c, y], k) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshBasicMaterial({ color: k === 2 ? c : new THREE.Color(c).multiplyScalar(0.25) })); l.position.set(4.9, 5.35 + y, 0.19); g.add(l); });
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); return g; }
  trafficLight(21.2, 15, Math.PI); trafficLight(-1.2, -61, 0);
  // street furniture near the hero: lamp posts, planters, a bike rack, a litter bin
  function lamp(x, z) { const g = new THREE.Group(); g.position.set(x, 0.15, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 10), dark); p.position.y = 2.7; g.add(p);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), dark); arm.rotation.z = 1.2; arm.position.set(0.45, 5.3, 0); g.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.4, emissive: 0x3a2a10 })); head.position.set(0.9, 5.2, 0); g.add(head);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); }
  lamp(-0.8, -3.5); lamp(-0.8, -24); lamp(-0.8, 16);
  { const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.28, 0.95, 14), new THREE.MeshStandardMaterial({ color: 0x3d4a3c, roughness: 0.8 })); bin.position.set(-0.95, 0.63, -13.5); bin.castShadow = true; A.add(bin);
    const rack = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8f969c, roughness: 0.4, metalness: 0.6 })); rack.position.set(-1.0, 0.15, -16.5); rack.rotation.y = Math.PI / 2; rack.castShadow = true; A.add(rack); }
  // bakery front: awning, window, planters, A-board, tables
  const BX = -5.0; // building face
  { const awn = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.22, 7.4, 4, 0.1), new THREE.MeshStandardMaterial({ color: 0x1f6b4a, roughness: 0.75 })); awn.position.set(BX + 1.0, 3.25, -8.6); awn.rotation.z = -0.12; awn.castShadow = true; A.add(awn);
    for (let k = 0; k < 10; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.74), new THREE.MeshStandardMaterial({ color: k % 2 ? 0xf2efe6 : 0x1f6b4a })); s.position.set(BX + 1.92, 3.02, -12.2 + k * 0.74); A.add(s); }
    // bakery sign
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#17241f'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#f3dca0'; g.font = `900 72px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAKERY', 256, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); sg.position.set(BX + 0.33, 4.3, -8.6); sg.rotation.y = Math.PI / 2; A.add(sg);
    const glassW = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.3), new THREE.MeshStandardMaterial({ color: 0xbfd8dd, roughness: 0.08, metalness: 0.5 })); glassW.position.set(BX + 0.32, 1.6, -8.6); glassW.rotation.y = Math.PI / 2; A.add(glassW);
    const frameM = new THREE.MeshStandardMaterial({ color: 0x27332c, roughness: 0.7 });
    for (const z of [-11.7, -8.6, -5.5]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), frameM); f.position.set(BX + 0.3, 1.5, z); f.castShadow = true; A.add(f); }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 6.4), frameM); sill.position.set(BX + 0.42, 0.42, -8.6); sill.castShadow = true; A.add(sill);
    for (const z of [-11.4, -5.9]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0xa8603c, roughness: 0.9 })); pot.position.set(BX + 0.75, 0.4, z); pot.castShadow = true; A.add(pot);
      for (let k = 0; k < 6; k++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshStandardMaterial({ color: 0x3f8c45, roughness: 0.85 })); lf.position.set(BX + 0.75 + (R() - 0.5) * 0.4, 0.78 + R() * 0.4, z + (R() - 0.5) * 0.4); lf.castShadow = true; A.add(lf); } } }
  // cafe tables (two) + chairs; the hero's table holds the coffee
  function table(x, z) { const g = new THREE.Group(); g.position.set(x, 0.15, z);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 20), new THREE.MeshStandardMaterial({ color: 0x8c5a33, roughness: 0.55 })); top.position.y = 0.76; g.add(top);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.76, 10), dark); stem.position.y = 0.38; g.add(stem);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 14), dark); base.position.y = 0.03; g.add(base);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); return g; }
  function chair(x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0.15, z); g.rotation.y = ry;
    const seat = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.06, 0.42, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0x1f6b4a, roughness: 0.6 })); seat.position.y = 0.45; g.add(seat);
    const back = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.06, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0x1f6b4a, roughness: 0.6 })); back.position.set(0, 0.68, -0.18); g.add(back);
    for (const sx of [-0.17, 0.17]) for (const sz of [-0.17, 0.17]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.5 })); l.position.set(sx, 0.225, sz); g.add(l); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); return g; }
  const T1 = table(-4.0, -9.4), T2 = table(-4.05, -6.2);
  const CH1 = chair(-4.45, -7.3, 0.5), CH2 = chair(-3.3, -6.1, -2.2), CH3 = chair(-3.4, -10.1, -1.5);
  const CH1_0 = [-4.45, -7.3];
  // the coffee cup on the hero's table
  const cup = new THREE.Group(); { const body = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, 0.15, 14), new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.5 })); cup.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.028, 14), new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.5 })); lid.position.y = 0.085; cup.add(lid);
    const slv = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.06, 14), new THREE.MeshStandardMaterial({ color: 0xc79a66, roughness: 0.85 })); cup.add(slv);
    cup.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(cup); }
  const CUP0 = [-3.84, 0.15 + 0.79 + 0.075, -9.3];
  // a croissant plate stays put on the table until the slide
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0xf0efe9, roughness: 0.4 })); plate.castShadow = true; A.add(plate);
  const croissant = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.032, 10, 16, 3.6), new THREE.MeshStandardMaterial({ color: 0xd9a05a, roughness: 0.85 }));
  croissant.rotation.x = -Math.PI / 2; croissant.castShadow = true; plate.add(croissant); croissant.position.y = 0.035;

  // taxis & cars on the avenue (one-way uptown) + a queue at the red light
  const NC = 30, cars = []; for (let k = 0; k < NC; k++) { if (k < 24) cars.push({ x: [3.4, 7.8, 12.2, 16.6][k % 4], z0: -250 + (Math.floor(k / 4) + R() * 0.7) * 84 + (k % 4) * 17, sp: 9 + R() * 4, ry: 0, c: R() < 0.7 ? 0xf5c518 : [0x1d1f22, 0xf2f2f2, 0x2d6fd6, 0xb3261e][Math.floor(R() * 4)] });
    else { const e2 = k % 2; const n = Math.floor((k - 24) / 2); cars.push({ x: e2 ? 27 + n * 6.5 : -8 - n * 6.5, z0: e2 ? 3.6 : 10.4, sp: 0, ry: e2 ? -Math.PI / 2 : Math.PI / 2, c: n === 1 ? 0x9aa3ad : 0xf5c518, still: true }); } }
  const carBodyG = new RoundedBoxGeometry(1.9, 0.85, 4.5, 5, 0.3).translate(0, 0.72, 0);
  const carTopG = new RoundedBoxGeometry(1.66, 0.62, 2.3, 5, 0.24).translate(0, 1.4, -0.2);
  const carB = new THREE.InstancedMesh(carBodyG, new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.28 }), NC);
  const carT = new THREE.InstancedMesh(carTopG, new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.18, metalness: 0.5 }), NC);
  const wheelG = new THREE.CylinderGeometry(0.37, 0.37, 0.24, 16).rotateZ(Math.PI / 2);
  const carW = []; for (let i = 0; i < 4; i++) carW.push(new THREE.InstancedMesh(wheelG, new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.85 }), NC));
  const carL = new THREE.InstancedMesh(new RoundedBoxGeometry(0.5, 0.2, 0.25, 2, 0.06).translate(0, 1.82, -0.2), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), NC);
  const carR2 = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.14, 0.08).translate(0, 0.74, -2.27), new THREE.MeshBasicMaterial({ color: 0xff2a22, toneMapped: false }), NC);
  cars.forEach((c, k) => carB.setColorAt(k, col.set(c.c)));
  [carB, carT, carL, carR2, ...carW].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });
  const WOFF = [[-0.93, 1.45], [0.93, 1.45], [-0.93, -1.45], [0.93, -1.45]];
  // the hero taxi that tries to brake right in front of the cafe
  const taxi = new THREE.Group(); { const b = new THREE.Mesh(carBodyG, new THREE.MeshStandardMaterial({ color: 0xf5c518, roughness: 0.3, metalness: 0.3 })); taxi.add(b);
    const tp = new THREE.Mesh(carTopG, new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.18, metalness: 0.5 })); taxi.add(tp);
    for (const [wx, wz] of WOFF) { const w = new THREE.Mesh(wheelG, new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.85 })); w.position.set(wx, 0.37, wz); taxi.add(w); }
    const sign = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.18, 0.28, 3, 0.06), new THREE.MeshStandardMaterial({ color: 0xfff0b0, roughness: 0.4, emissive: 0x3a3010 })); sign.position.set(0, 1.78, -0.2); taxi.add(sign);
    for (const sx of [-0.78, 0.78]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2a22 })); l.position.set(sx, 0.76, -2.26); taxi.add(l); }
    taxi.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(taxi); }
  const taxiDriver = makePerson(THREE, { shirt: 0x2f6f8f, pants: 0x222222, hair: 0x1a1a1a, skin: 0xb5835a, seed: 31 }); taxiDriver.group.scale.setScalar(0.92); A.add(taxiDriver.group);

  // pedestrians (instanced background crowd, they glide when friction goes)
  const NP = 170, peds = []; const shirts = [0xc94f4f, 0x3a7bd5, 0xf2c14e, 0x4caf7a, 0x8e5bb5, 0xeeeeee, 0x333333, 0xf28c38, 0x2bb3b1], skins = [0xf1c6a5, 0xd8a47e, 0xb5835a, 0x8d5a3b, 0x5c3a24];
  const pB = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.78, 5, 12).translate(0, 0.95, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), NP);
  const pH = new THREE.InstancedMesh(new THREE.SphereGeometry(0.165, 16, 12).translate(0, 1.72, 0), new THREE.MeshStandardMaterial({ roughness: 0.7 }), NP);
  const pL = new THREE.InstancedMesh(new RoundedBoxGeometry(0.28, 0.42, 0.18, 3, 0.06).translate(0, 0.21, 0), new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 }), NP);
  for (let k = 0; k < NP; k++) { const west = R() < 0.5; const dir = R() < 0.5 ? 1 : -1, sp = 1.1 + R() * 0.6;
    let z0 = -200 + R() * 400; if (west && z0 > -46 && z0 < 30) z0 += (z0 > -8 ? 76 : -76);   // leave the cafe block clear for the camera
    peds.push({ x: west ? -4.2 + R() * 3.6 : 20.6 + R() * 3.8, z0, dir, sp, s: 0.88 + R() * 0.22, ph: R() * 6.28, spin: (R() - 0.5) * 2.2, side: (R() - 0.5) * 0.9 });
    pB.setColorAt(k, col.set(shirts[Math.floor(R() * shirts.length)])); pH.setColorAt(k, col.set(skins[Math.floor(R() * skins.length)])); }
  [pB, pH, pL].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });

  // ---------------- hero, Mittens, the lace ----------------
  const P = makePerson(THREE, { shirt: 0xc2413b, pants: 0x35526b, hair: 0x3b2416, seed: 2 }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const waiter = makePerson(THREE, { shirt: 0xf6f4ee, pants: 0x232a2e, hair: 0x4a2f1c, skin: 0xd8a47e, seed: 7 });
  { const apron = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.55, 0.06, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0x1f6b4a, roughness: 0.8 })); apron.position.set(0, 1.0, 0.18); waiter.group.add(apron); } A.add(waiter.group);
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.025, 18), new THREE.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 0.6 })); tray.castShadow = true; A.add(tray);
  const mittens = makeCat(THREE, 0xf0a040); mittens.scale.setScalar(1.25); A.add(mittens);
  // shoelace bow on the hero's right shoe: two loops + two ends; it slides open when friction goes
  const laceGrp = new THREE.Group(); A.add(laceGrp);
  const laceMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.75 });
  const loopL = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.019, 10, 18), laceMat); loopL.rotation.y = 0.9; laceGrp.add(loopL);
  const loopR = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.019, 10, 18), laceMat); loopR.rotation.y = -0.9; laceGrp.add(loopR);
  const endL = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.2, 3, 8), laceMat); laceGrp.add(endL);
  const endR = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.2, 3, 8), laceMat); laceGrp.add(endR);
  laceGrp.traverse(o => { if (o.isMesh) o.castShadow = true; });

  // the lively street (dog walker, jogger, cyclist, kid with balloon, busker, delivery van, phone, coffee)
  const SL = makeStreetLife(THREE, A, { seed: 14, z: HZ0, dogX: -3.9, dogZ: -2, dogDir: -1, jogX: -0.6, jogZ: -16, bikeX: 1.7, bikeZ: -150, kidX: -3.2, kidZ: 46, kidDir: -1, musX: -4.5, musZ: 2, vanX: 1.3, vanZ: 34, phX: 21.5, phZ: 6, cofX: 22.3, cofZ: -4, balloonColor: 0xffd23f, vanColor: 0xeef1f4, vanStripe: 0x1f6b4a, dogColor: 0xb8863f });

  // slick-surface sheen: a thin mirror-ish sheet that fades in over the road and pavements during the slide
  const slickMat = new THREE.MeshStandardMaterial({ color: 0xcfe2f0, roughness: 0.04, metalness: 0.85, transparent: true, opacity: 0 });
  const slick = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), slickMat); slick.rotation.x = -Math.PI / 2; slick.position.set(10, 0.06, -60); A.add(slick);
  // glide streaks that trail the sliding things
  const NSTR = 180, strP = new Float32Array(NSTR * 3), strG = new THREE.BufferGeometry(); strG.setAttribute('position', new THREE.BufferAttribute(strP, 3));
  const streaks = new THREE.Points(strG, new THREE.PointsMaterial({ map: softTex(THREE), color: 0xeaf4ff, size: 0.5, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false })); streaks.frustumCulled = false; A.add(streaks);

  await document.fonts.ready;

  const tv = new THREE.Vector3();
  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.34, bloomThreshold: 0.88, shake: 0, flash: 0, t };
    const slip = t >= EV && t < RET;                      // the five frictionless seconds
    const story = clamp((t - EV) / SLOW, 0, 5);           // story seconds 0..5
    out.story = story; out.slip = slip;
    const tm = t < EV ? t : t < RET ? EV + story : EV + 5 + (t - RET);   // story clock for idle motion
    // world clock for anything that was moving: it never brakes while friction is gone
    const glide = t < EV ? t : t < RET ? EV + story : EV + 5 + (t - RET);
    const sl = slip ? smooth(0, 0.45, story) : t >= RET ? 1 - smooth(RET, RET + 0.5, t) : 0;   // slickness 0..1
    slickMat.opacity = 0.5 * sl; slick.visible = sl > 0.01;
    walkMat.roughness = lerp(0.95, 0.12, sl); walkMat.metalness = lerp(0.0, 0.55, sl);
    slabMat.roughness = lerp(0.95, 0.1, sl); slabMat.metalness = lerp(0.0, 0.6, sl);
    hemi.intensity = lerp(0.95, 1.15, sl); out.bloom = lerp(0.34, 0.62, sl); out.sat = lerp(1.14, 1.02, sl);
    streaks.material.opacity = 0.75 * sl;
    // sand pile flows flat (friction is what piles it up at ~34 degrees)
    const flow = slip ? smooth(1.6, 4.6, story) : t >= RET ? 1 : 0;
    sandPile.scale.set(1 + 2.0 * flow, 1 - 0.86 * flow, 1 + 2.0 * flow);

    // ---- hero: crouched tying the lace, then stands when it slips, then ties it again ----
    const G = P.group; const stand = slip ? smooth(0.9, 2.6, story) : t >= RET ? 1 - smooth(RET + 2.6, RET + 4.2, t) : 0;
    G.position.set(HX, 0.15, HZ0); G.rotation.set(0, 1.95, 0);
    const crouch = 1 - stand;
    // down on one knee: the body drops, the right leg lies along the pavement, the left stays folded under
    G.position.y = 0.15 - 0.34 * crouch;
    P.torso.rotation.set(0.6 * crouch, 0, 0); P.legR.rotation.set(1.15 * crouch, 0, 0.14 * crouch); P.legL.rotation.set(0.8 * crouch, 0, -0.22 * crouch);
    const reach = crouch * (t < EV ? 1 : 1 - smooth(0.1, 0.7, story));
    P.armL.rotation.set(-0.12 - 0.34 * reach, 0, -0.14 - 0.08 * reach); P.armR.rotation.set(-0.12 - 0.4 * reach, 0, 0.14 + 0.1 * reach);
    // while sliding, arms go out for balance and the body drifts a little
    const balance = slip ? smooth(1.2, 2.4, story) * (1 - smooth(4.2, 5, story)) : 0;
    P.armL.rotation.x += -0.9 * balance; P.armL.rotation.z += -0.75 * balance; P.armR.rotation.x += -0.9 * balance; P.armR.rotation.z += 0.75 * balance;
    G.position.x += 0.42 * (slip ? smooth(1.0, 5, story) : t >= RET ? 1 : 0) * 1.0;
    G.position.z += 0.9 * (slip ? smooth(1.0, 5, story) : t >= RET ? 1 : 0);
    G.rotation.y += 0.5 * balance;
    P.headPivot.rotation.set(crouch * 0.45 - 0.5 * stand * (slip ? 1 : 0.2), 0.1, 0);
    setFace(P, slip ? (story < 1.2 ? { brows: 'up', eyes: 1.5, mouth: 'o', look: [0, -0.6] } : { brows: 'worried', eyes: 1.6, mouth: 'open', open: 1.5, look: [0.2, 0.4] })
      : t >= RET + 3.6 ? { brows: 'up', eyes: 1.3, mouth: 'smile', look: [0, -0.4] } : { brows: 'neutral', eyes: 1.0, mouth: 'flat', look: [0, -0.7] });
    life(P, tm, 0.8);
    // the lace: knotted (bow) → open (loops gone, ends splayed) → knotted again, tighter
    P.group.updateMatrixWorld(true);
    const shoe = P.legR.userData.end; shoe.getWorldPosition(tv);
    const open = slip ? smooth(0.1, 1.1, story) : t >= RET ? 1 - smooth(RET + 3.9, RET + 4.6, t) : 0;
    out.shoe = [tv.x, tv.y + 0.09, tv.z]; laceGrp.position.set(tv.x, tv.y + 0.09, tv.z); laceGrp.rotation.set(0, G.rotation.y, 0);
    const lo = 1 - open; loopL.scale.setScalar(lo + 0.001); loopR.scale.setScalar(lo + 0.001);
    loopL.position.set(-0.07 * lo, 0.01, 0.03); loopR.position.set(0.07 * lo, 0.01, 0.03);
    endL.position.set(-0.03 - 0.1 * open, -0.02 - 0.02 * open, 0.02 + 0.06 * open); endL.rotation.set(1.3 + 0.3 * open, 0, 0.8 - 0.6 * open);
    endR.position.set(0.03 + 0.1 * open, -0.02 - 0.02 * open, 0.02 + 0.06 * open); endR.rotation.set(1.3 + 0.3 * open, 0, -0.8 + 0.6 * open);
    const tight = t >= RET + 4.2 ? pulse(t, RET + 4.2, 0.5) : 0; laceGrp.scale.setScalar(1 + 0.35 * tight);

    // ---- waiter with the tray; everything on the tray slides off ----
    const WX = -4.5, WZ = -11.3;
    waiter.group.position.set(WX + 0.5 * (slip ? smooth(0.6, 5, story) : t >= RET ? 1 : 0), 0.15, WZ + 1.3 * (slip ? smooth(0.6, 5, story) : t >= RET ? 1 : 0));
    waiter.group.rotation.set(0, 1.5 + 0.9 * (slip ? smooth(1.2, 4.4, story) : t >= RET ? 1 : 0), 0);
    waiter.torso.rotation.set(0.1 - 0.3 * balance, 0, 0); waiter.armL.rotation.set(-1.5, 0, -0.25 - 0.5 * balance); waiter.armR.rotation.set(-0.2, 0, 0.22 + 0.5 * balance);
    waiter.legL.rotation.set(0, 0, -0.1); waiter.legR.rotation.set(0, 0, 0.1);
    waiter.headPivot.rotation.set(0.1 - 0.35 * (slip ? 1 : 0), -0.3, 0);
    setFace(waiter, slip ? { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.6 } : { brows: 'neutral', eyes: 1, mouth: 'smile', look: [-0.4, 0] }); life(waiter, tm, 1);
    waiter.group.updateMatrixWorld(true); waiter.armL.userData.end.getWorldPosition(tv); tray.position.copy(tv).add(new THREE.Vector3(0, 0.06, 0)); tray.rotation.set(0.05 * Math.sin(tm) + 0.5 * balance, 0, 0.1 * balance);

    // ---- the coffee cup: sits on the table, then leaves it ----
    const cs = slip ? story : t >= RET ? 5 : 0;
    if (cs <= 0.0001) { cup.position.set(...CUP0); cup.rotation.set(0, 0, 0); }
    else { const d = Math.min(cs, 5); const x = CUP0[0] + 0.55 * d, z = CUP0[2] + 1.55 * d;
      const fall = clamp((d - 0.35) / 0.3); cup.position.set(x, lerp(CUP0[1], 0.26, fall), z); cup.rotation.set(0.9 * fall, 0, 0.5 * Math.sin(d * 2.2) * fall); }
    plate.position.set(CUP0[0] - 0.18 - 0.42 * (slip ? Math.min(story, 5) : t >= RET ? 5 : 0) * 0.9, cs > 0.5 ? 0.21 : CUP0[1] - 0.06, CUP0[2] + 0.22 + 1.1 * (slip ? Math.min(story, 5) : t >= RET ? 5 : 0) * 0.9);
    plate.rotation.set(cs > 0.5 ? 0 : 0, 0, cs > 0.5 ? 0.2 : 0);

    // ---- Mittens: asleep on the chair in the opening, rides it down the pavement, grumpy in the aftermath ----
    const ride = slip ? smooth(0.5, 5, story) : t >= RET ? 1 : 0;
    const chx = CH1_0[0] + 1.1 * ride, chz = CH1_0[1] + 7.0 * ride;
    CH1.position.set(chx, 0.15, chz); CH1.rotation.set(0, 0.5 + 1.9 * ride, 0);
    mittens.position.set(chx, 0.15 + 0.5, chz + 0.02);
    mittens.rotation.set(0, 0.5 + 1.9 * ride + (slip ? 0.3 * Math.sin(story * 3) : 0), 0);
    const mPop = slip ? smooth(0.5, 1.1, story) : 0; mittens.scale.setScalar(1.25 * (1 + 0.18 * mPop * (1 - smooth(2.4, 3.2, story))));
    out.chair = [chx, chz];
    CH2.position.set(-3.3 + 0.3 * ride, 0.15, -6.1 + 1.6 * ride); CH2.rotation.y = -2.2 + 0.8 * ride;
    CH3.position.set(-3.4 + 0.2 * ride, 0.15, -10.1 + 1.1 * ride); CH3.rotation.y = -1.5 + 0.5 * ride;
    T1.position.set(-4.0 + 0.12 * ride, 0.15, -9.4 + 0.5 * ride); T2.position.set(-4.05 + 0.1 * ride, 0.15, -6.2 + 0.4 * ride);

    // ---- the taxi: brakes at 50 km/h and simply keeps going 70 m ----
    const V = 13.9;                               // 50 km/h
    const TZ_BRAKE = -34;                         // where the driver hits the brakes
    let tz, brakeOn = 0;
    if (t < EV) { tz = TZ_BRAKE - V * (EV - t); }
    else { const d = slip ? story : 5 + Math.max(0, t - RET); // frictionless metres, then the real stop
      if (slip) { tz = TZ_BRAKE + V * story; brakeOn = 1; }
      else { const over = Math.max(0, t - RET); const stopT = 1.75; const u = clamp(over / stopT); tz = TZ_BRAKE + V * 5 + V * stopT * (u - u * u / 2); brakeOn = u < 1 ? 1 : 0; } }
    taxi.position.set(5.2, 0.02, tz); taxi.rotation.set(0, 0, 0);
    taxi.children.forEach(ch => { if (ch.geometry === wheelG) ch.rotation.x = slip ? taxi.userData.wr || 0 : (taxi.userData.wr = tz / 0.37); });
    taxiDriver.group.position.set(4.75, 0.52, tz + 0.55); taxiDriver.group.rotation.set(0, 0, 0);
    taxiDriver.torso.rotation.set(0.15 + 0.25 * (slip ? 1 : 0), 0, 0); taxiDriver.armL.rotation.set(-1.5, 0, -0.3); taxiDriver.armR.rotation.set(-1.5, 0, 0.3);
    taxiDriver.legL.rotation.set(1.3, 0, 0); taxiDriver.legR.rotation.set(1.3, 0, 0); taxiDriver.headPivot.rotation.set(0.05, 0, 0);
    setFace(taxiDriver, slip ? { brows: 'worried', eyes: 1.6, mouth: 'open', open: 1.7 } : { brows: 'neutral', eyes: 1, mouth: 'flat' }); life(taxiDriver, tm, 0.6);

    // ---- background traffic: never slows while friction is gone ----
    cars.forEach((c, i) => { const z = c.still ? c.z0 + (slip ? 1.6 * story : t >= RET ? 8 : 0) * (c.x > 20 ? -1 : 1) * 0.6 : wrap(c.z0 + c.sp * glide, -250, 254);
      const x = c.still ? c.x : c.x;
      const ry = c.ry + (c.still ? 0.22 * (slip ? smooth(0.4, 5, story) : t >= RET ? 1 : 0) : 0.05 * (slip ? smooth(0.6, 5, story) : t >= RET ? 1 : 0));
      m4.compose(v.set(x, 0.02, z), q.setFromEuler(e.set(0, ry, 0, 'XYZ')), sc.set(1, 1, 1)); carB.setMatrixAt(i, m4); carT.setMatrixAt(i, m4); carR2.setMatrixAt(i, m4);
      if (c.c !== 0xf5c518) m4.compose(v.set(0, -40, 0), q, sc.set(0.001, 0.001, 0.001)); carL.setMatrixAt(i, m4);
      WOFF.forEach(([wx, wz], j) => { const spin = slip ? 0 : glide * c.sp / 0.37; m4.compose(v.set(x, 0.02, z), q.setFromEuler(e.set(0, ry, 0, 'XYZ')), sc.set(1, 1, 1));
        const mm = m4.clone().multiply(new THREE.Matrix4().makeTranslation(wx, 0.37, wz)).multiply(new THREE.Matrix4().makeRotationX(spin)); carW[j].setMatrixAt(i, mm); }); });
    [carB, carT, carL, carR2, ...carW].forEach(m => m.instanceMatrix.needsUpdate = true);

    // ---- the lively street: gaits freeze while friction is gone, so they glide on ----
    SL.update(glide, { look: slip ? smooth(0.5, 1.6, story) : t >= RET ? 1 - smooth(RET + 1.6, RET + 3.4, t) : 0, stop: slip ? smooth(0.1, 0.6, story) : 0 });

    // ---- background crowd: feet stop, bodies keep travelling and turn slowly ----
    const frozen = slip ? smooth(0.1, 0.6, story) : 0;
    let si = 0;
    peds.forEach((p, i) => { const z = wrap(p.z0 + p.dir * p.sp * glide * 0.45, -200, 200);
      const drift = slip ? smooth(0.2, 5, story) : t >= RET ? 1 : 0;
      const x = p.x + p.side * drift; const y = 0.15 + (frozen > 0.5 ? 0 : Math.abs(Math.sin(glide * 0.45 * 8 + p.ph)) * 0.05);
      const ry = (p.dir > 0 ? 0 : Math.PI) + p.spin * drift;
      m4.compose(v.set(x, y, z), q.setFromEuler(e.set(-0.1 * frozen, ry, 0.07 * p.spin * drift, 'YXZ')), sc.set(p.s, p.s, p.s));
      pB.setMatrixAt(i, m4); pH.setMatrixAt(i, m4); pL.setMatrixAt(i, m4);
      if (slip && i % 4 === 0 && si < NSTR) { for (let k = 0; k < 2 && si < NSTR; k++) strP.set([x - p.side * drift * k * 0.5, 0.2 + k * 0.1, z - p.dir * (0.5 + k * 0.6)], si++ * 3); } });
    while (si < NSTR) strP.set([0, -80, 0], si++ * 3);
    pB.instanceMatrix.needsUpdate = pH.instanceMatrix.needsUpdate = pL.instanceMatrix.needsUpdate = true; strG.attributes.position.needsUpdate = true;

    // ---------------- camera: one continuous move, two cuts ----------------
    let c, g, fov = 45, shC = [HX, HZ0, 70], focusY = 0.56, focusH = 0.2;
    const hx = G.position.x, hz = G.position.z;     // the hero drifts a little; the camera keeps him framed
    const cz2 = out.chair[1], cx2 = out.chair[0];
    if (t < EV) {                                   // 1. from the kerb: the hero crouched at the cafe front
      const u = easeInOut(t / EV); c = [lerp(2.4, 1.5, u), lerp(1.9, 1.4, u), hz + lerp(4.4, 3.2, u)]; g = [hx + 0.1, lerp(1.05, 0.8, u), hz]; fov = lerp(48, 42, u); focusY = 0.58;
    } else if (t < 12.6) {                          // 2. down to the shoe: the knot slides itself open
      const u = easeInOut((t - EV) / 5.6); const sh = out.shoe || [hx + 0.4, 0.22, hz + 0.3];
      c = [lerp(1.5, sh[0] + 1.15, u), lerp(1.4, 0.74, u), hz + lerp(3.2, 2.5, u)]; g = [lerp(hx + 0.12, sh[0], u), lerp(0.8, sh[1] + 0.02, u), lerp(hz - 0.05, sh[2], u)]; fov = lerp(42, 38, u); focusY = lerp(0.58, 0.62, u); focusH = 0.17;
    } else if (t < 23.2) {                          // 3. out into the avenue: the taxi glides straight at us
      const u = easeInOut((t - 12.6) / 10.6); c = [lerp(1.0, 9.6, u), lerp(0.95, 3.2, u), hz + lerp(2.4, 17.0, u)]; g = [lerp(hx + 0.12, 4.4, u), lerp(0.33, 1.25, u), lerp(hz - 0.05, hz - 7.0, u)]; fov = lerp(37, 56, u); shC = [HX + 4, HZ0 - 6, 90]; focusY = 0.55; focusH = lerp(0.2, 0.32, u);
    } else if (t < 27.4) {                          // 4. cut: Mittens riding the chair down the pavement
      const u = easeInOut((t - 23.2) / 4.2); c = [lerp(0.9, 0.4, u), lerp(1.5, 1.25, u), cz2 + lerp(4.6, 3.6, u)]; g = [cx2 + 0.1, 0.75, cz2]; fov = lerp(46, 42, u); focusY = 0.57; focusH = 0.2;
    } else if (t < 34.2) {                          // 5. rise over the city: the sand pile flows flat, the bridge
      const u = easeInOut((t - 27.4) / 6.8); c = [lerp(0.4, 14, u), lerp(1.25, 330, u), lerp(cz2 + 3.6, 55, u)]; g = [lerp(cx2 + 0.1, 56, u), lerp(0.75, 2, u), lerp(cz2, -150, u)]; fov = lerp(42, 56, u); shC = [50, -240, 800]; focusY = 0.5; focusH = lerp(0.24, 0.45, u);
    } else if (t < RET) {                           // 6. straight back down to the hero for the return
      const u = easeInOut((t - 34.2) / (RET - 34.2)); c = [lerp(14, 1.8, u), lerp(330, 1.65, u), lerp(55, hz + 3.7, u)]; g = [lerp(56, hx + 0.1, u), lerp(2, 1.3, u), lerp(-150, hz, u)]; fov = lerp(62, 44, u); focusY = 0.56; focusH = lerp(0.45, 0.2, u);
    } else {                                        // 7. aftermath: hold on the hero and Mittens, then down to the lace
      const u = easeInOut(clamp((t - RET - 3.0) / 3.6)); c = [lerp(1.8, 1.05, u), lerp(1.65, 0.68, u), hz + lerp(3.7, 2.4, u)]; g = [hx + 0.11, lerp(1.3, 0.33, u), hz - 0.05]; fov = lerp(44, 37, u); focusY = lerp(0.56, 0.63, u); focusH = lerp(0.2, 0.17, u);
    }
    if ((new URLSearchParams(location.search).get('dbg') || '').includes('V')) { c = [0.7, 16, 10]; g = [-2, 0, -6]; fov = 60; }
    setShadow(...shC); cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix();
    out.focusY = focusY; out.focusH = focusH;
    out.flash = 0.55 * pulse(t, RET, 0.3); out.shake = 0.5 * pulse(t, RET, 0.45);
    out.label = { taxi: [5.2, 1.9, tz], sand: [SAND[0], 5, SAND[2]], block: [10, 2, -230] };
    return out;
  }

  // ---------------- on-screen text ----------------
  const lines = [
    [0.55, 3.55, "You're crouched outside the bakery, tying your shoelace."],
    [4.1, 5.85, 'One more pull and it holds.'],
    [7.5, 10.6, 'Friction is gone. The knot slides itself open.'],
    [11.0, 13.55, "Your coffee leaves the table like it's on a rink."],
    [14.0, 16.75, 'The taxi hits the brakes. The brakes do nothing.'],
    [16.95, 20.0, 'It needed twelve metres to stop. It gets seventy.'],
    [20.2, 24.35, 'Nobody can walk, either. You push, and the street just lets you go.'],
    [24.6, 27.3, 'Mittens is having the fastest nap of her life.'],
    [27.6, 31.1, 'Every screw, nail and knot in the city is quietly letting go.'],
    [31.3, 34.55, 'Out there, hillsides and sand dunes would flow like water.'],
    [35.0, 36.95, 'Then it all comes back at once.'],
    [37.9, 41.2, 'Everything that was gliding stops exactly where it is.'],
    [41.7, 43.85, 'Your lace pulls tight on the first try.'],
  ];
  const CARD_LINE = [45.9, 50.0, 'The strangest part? Your knees never noticed.'];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function italic(ctx, W, H, t, a, b, txt, y = 0.70) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.3, (b - t) / 0.3));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 50px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * y + i * 64); ctx.fillText(l, W / 2, H * y + i * 64); }); ctx.restore(); }
  // small world-anchored label with a real name and a real number
  function worldLabel(ctx, st, pos, title, num) { if (!pos) return; tv.set(pos[0], pos[1], pos[2]); cam.updateMatrixWorld(); tv.project(cam);
    if (tv.z > 1 || Math.abs(tv.x) > 0.84 || tv.y < -0.30 || tv.y > 0.80) return;
    const x = (tv.x * 0.5 + 0.5) * 1080, y = (1 - (tv.y * 0.5 + 0.5)) * 1920;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    const lx = Math.min(x + 14, 1080 - w - 24), ly = clamp(y, 150, 1150); ctx.translate(lx - (x + 14), ly - y);
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x + 14, y - 34, w, 68, 14); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 26, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 26, y + 16);
    ctx.strokeStyle = 'rgba(255,210,63,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke(); ctx.restore(); }

  function hud(ctx, t, st) { const W = 1080, H = 1920;
    if (t < CARDT) {
      drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF FRICTION DISAPPEARED', size: 78 }, { text: 'FOR 5 SECONDS?', size: 96, accent: true }], t, '#ffd23f', { start: 0.3, outAt: 6.0 });
      const yC = lerp(H * 0.268, H * 0.105, smooth(6.0, 6.6, t)); const f3 = (x) => `0:0${Math.max(0, x).toFixed(3)}`;
      const o = t < EV ? { label: 'FRICTION GONE IN', value: f3(EV - t), color: '#ffd23f' }
        : t < RET ? { label: 'FRICTION RETURNS IN', value: f3(5 - st.story), color: '#7fe0c8' }
          : { label: 'FRICTION', value: 'BACK', color: '#ffd23f' };
      drawSideCounter(ctx, W, H, { y: yC, ...o, note: t < EV ? 'real time' : t < RET ? 'slow motion · 6x' : '', bump: Math.max(pulse(t, EV, 0.4), pulse(t, RET, 0.4)), glow: o.color });
      for (const [a, b, txt] of lines) italic(ctx, W, H, t, a, b, txt);
      // labels: the taxi's stopping distance, the sand pile, the bridge
      if (t > 14.2 && t < 20.2) worldLabel(ctx, st, st.label && st.label.taxi, 'TAXI · 50 km/h', 'needs 12 m to stop · gets 70 m');
      if (t > 31.6 && t < 34.3) worldLabel(ctx, st, st.label && st.label.sand, 'SAND PILE', 'friction piles it at 34°');
      if (t > 28.8 && t < 31.3) worldLabel(ctx, st, st.label && st.label.block, 'MANHATTAN BLOCK', '80 m × 274 m');
    }
    if (t >= CARDT) { const a = smooth(CARDT, CARDT + 0.6, t); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `500 62px ${FS}`; ctx.fillText('What if friction disappeared', W / 2, H * 0.38); ctx.fillStyle = '#ffd23f'; ctx.fillText('for 5 seconds?', W / 2, H * 0.38 + 80);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `600 23px ${FONT}`; ctx.fillText('DRY TYRE GRIP μ ≈ 0.8  ·  ICE ≈ 0.1  ·  YOUR JOINTS ≈ 0.002', W / 2, H * 0.38 + 168);
      ctx.restore();
      italic(ctx, W, H, t, CARD_LINE[0], CARD_LINE[1], CARD_LINE[2] + " They're smoother than ice.", 0.52);
      ctx.save(); ctx.globalAlpha = smooth(CARDT + 4.4, CARDT + 5.0, t); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.font = `italic 600 46px ${FS}`; ctx.fillText('What should we try next?', W / 2, H * 0.66);
      ctx.fillStyle = '#ffd23f'; ctx.font = `800 30px ${FONT}`; ctx.fillText('TELL US IN THE COMMENTS', W / 2, H * 0.66 + 66); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
