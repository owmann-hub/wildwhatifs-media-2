import { carGeos, pedGeos } from './lib.js';
// Shared NYC-style city for format_v5 scenes (extracted from the owner-approved sun.js prototype so every episode keeps the locked look).
// buildCity(THREE, A, R, o): o.boards = [[text,bg,fg,x,y,z,w,h,ry],...], o.hero = [x,z] (keep peds clear), o.np = pedestrian count.
import { softTex, makeCat } from './lib.js';
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
const FONT = '"Inter Display", Inter, sans-serif';
export async function buildCity(THREE, A, R, o = {}) {
  const HX = (o.hero || [-2.5, -8])[0], HZ0 = (o.hero || [-2.5, -8])[1];
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
        float lod = clamp(1.0 - max(fwidth(c.x), fwidth(c.y)) * 5.0, 0.0, 1.0);
        if (vWp.y >= 4.8) { float fr = step(0.13, f.x) * step(f.x, 0.87) * step(0.16, f.y) * step(f.y, 0.85) - win;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.22 + 0.05, fr * lod);
          glass *= mix(1.0, mix(0.72, 1.3, (f.y - 0.22) / 0.58), lod);
          glass *= 1.0 - lod * (0.5 * smoothstep(0.68, 0.8, f.y) + 0.3 * smoothstep(0.27, 0.18, f.x));
          glass = mix(glass, diffuseColor.rgb * 1.15, lod * step(abs(f.x - 0.5), 0.02));
          diffuseColor.rgb *= 1.0 - 0.1 * lod * step(f.y, 0.035); }
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
  // high clouds
  { const n = 60, pos = new Float32Array(n * 3); for (let k = 0; k < n; k++) pos.set([-1500 + R() * 3000, 380 + R() * 160, -2500 + R() * 3000], k * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: softTex(THREE, 128), color: 0xffffff, size: 160, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true, fog: false })); pts.frustumCulled = false; A.add(pts); A.userData.clouds = pts; }
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
  function board(text, bg, fg, x, y, z, w, h, ry) { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ls = text.split('|'); let fs = c.height / ls.length * 0.72; g.font = `900 ${fs}px ${FONT}`; const mw = Math.max(...ls.map(l => g.measureText(l).width)); if (mw > c.width * 0.9) { fs *= c.width * 0.9 / mw; g.font = `900 ${fs}px ${FONT}`; }
    ls.forEach((l, k) => g.fillText(l, c.width / 2, c.height * (k + 0.5) / ls.length)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = ry; A.add(m);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, h + 0.6, 0.3), dark); fr.position.set(x, y, z); fr.rotation.y = ry; fr.translateZ(-0.2); A.add(fr); }
  await document.fonts.ready;
  for (const b of (o.boards || [])) board(...b);
  const NC = 30, cars = []; for (let k = 0; k < NC; k++) { if (k < 24) cars.push({ x: [3.4, 7.8, 12.2, 16.6][k % 4], z0: -250 + (Math.floor(k / 4) + R() * 0.7) * 84 + (k % 4) * 17, sp: 9 + R() * 4, ry: 0, c: R() < 0.72 ? 0xf5c518 : [0x1d1f22, 0xf2f2f2, 0x2d6fd6, 0xb3261e][Math.floor(R() * 4)] });
    else { const e2 = k % 2; const n = Math.floor((k - 24) / 2); cars.push({ x: e2 ? 27 + n * 6.5 : -8 - n * 6.5, z0: e2 ? 3.6 : 10.4, sp: 0, ry: e2 ? -Math.PI / 2 : Math.PI / 2, c: n === 1 ? 0x9aa3ad : 0xf5c518, still: true }); } }
  const carB = new THREE.InstancedMesh(carGeos(THREE).body, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25 }), NC);
  const carT = new THREE.InstancedMesh(carGeos(THREE).top, new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.2, metalness: 0.5 }), NC);
  const carL = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.2, 0.25).translate(0, 1.82, -0.2), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), NC);
  cars.forEach((c, k) => carB.setColorAt(k, col.set(c.c))); [carB, carT, carL].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });
  const NP = o.np ?? 190, peds = []; const shirts = [0xc94f4f, 0x3a7bd5, 0xf2c14e, 0x4caf7a, 0x8e5bb5, 0xeeeeee, 0x333333, 0xf28c38, 0x2bb3b1], skins = [0xf1c6a5, 0xd8a47e, 0xb5835a, 0x8d5a3b, 0x5c3a24];
  const pB = new THREE.InstancedMesh(pedGeos(THREE).body, new THREE.MeshStandardMaterial({ roughness: 0.8 }), NP);
  const pH = new THREE.InstancedMesh(pedGeos(THREE).head, new THREE.MeshStandardMaterial({ roughness: 0.7 }), NP);
  const pL = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.42, 0.18).translate(0, 0.21, 0), new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 }), NP);
  for (let k = 0; k < NP; k++) { const west = R() < 0.5; const dir = R() < 0.5 ? 1 : -1, sp = 1.1 + R() * 0.6; let z0; do { z0 = -200 + R() * 400; } while (west && Math.abs(wrap(z0 + dir * sp * 7, -200, 200) - HZ0) < (o.clear ?? 12));
    peds.push({ x: west ? -4.2 + R() * 3.6 : 20.6 + R() * 3.8, z0, dir, sp, s: 0.88 + R() * 0.22, ph: R() * 6.28 }); pB.setColorAt(k, col.set(shirts[Math.floor(R() * shirts.length)])); pH.setColorAt(k, col.set(skins[Math.floor(R() * skins.length)])); }
  [pB, pH, pL].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });
  return { U, bMat, cars, NC, carB, carT, carL, peds, NP, pB, pH, pL, dark, board };
}
