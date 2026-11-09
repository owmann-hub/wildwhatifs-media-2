import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, keys, makePerson, drawTitle, drawCounter, drawCaption, skyTexture, stars } from './lib.js';

export const T0 = 3.5;            // story clock starts
export const TOTAL = 48.0;
const PAY = 42.0, CLOSE = 45.4, KICK = 16.6; // KICK in clock seconds
const hOf = (c) => 1.8 * Math.pow(10, clamp(c, 0, 35) / 5);

export async function create({ THREE, W, H }) {
  const R = rng(42);
  // ================= WORLD A : local, metres =================
  const A = new THREE.Scene();
  const camA = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e7);
  A.fog = new THREE.FogExp2(0xbcd6f0, 0.002);
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a6b3a, 0.9); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); A.add(sun); A.add(sun.target);
  // sky dome
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { zen: { value: new THREE.Color(0x3d7fd6) }, hor: { value: new THREE.Color(0xcfe3f5) }, sunDir: { value: new THREE.Vector3(0.4, 0.5, 0.7).normalize() } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; }`,
    fragmentShader: `uniform vec3 zen; uniform vec3 hor; uniform vec3 sunDir; varying vec3 vP;
      void main(){ float h = clamp(vP.y*1.4+0.05,0.,1.); vec3 c = mix(hor, zen, pow(h,0.6));
      float s = max(dot(normalize(vP), sunDir),0.); c += vec3(1.,0.9,0.7)*pow(s,300.)*4. + vec3(1.,0.8,0.5)*pow(s,8.)*0.25; gl_FragColor = vec4(c,1.); }` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; A.add(sky);
  // ground
  const grass = new THREE.Mesh(new THREE.CircleGeometry(6e6, 64), new THREE.MeshStandardMaterial({ color: 0x6f8f4a, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; A.add(grass);
  const asphalt = new THREE.Mesh(new THREE.CircleGeometry(4200, 64), new THREE.MeshStandardMaterial({ color: 0x7c7f86, roughness: 1 }));
  asphalt.rotation.x = -Math.PI / 2; asphalt.position.y = 0.02; asphalt.receiveShadow = true; A.add(asphalt);
  const park = new THREE.Mesh(new THREE.CircleGeometry(55, 40), new THREE.MeshStandardMaterial({ color: 0x5f9a45, roughness: 1 }));
  park.rotation.x = -Math.PI / 2; park.position.y = 0.04; park.receiveShadow = true; A.add(park);
  // city: instanced buildings
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true });
  const blds = [];
  const palette = [0xd9d4c7, 0xbfc6cf, 0xe8dcc8, 0xa9b3bd, 0xcdb9a0, 0x9aa7b4, 0xe2e2e2];
  const block = 70;
  for (let gx = -60; gx <= 60; gx++) for (let gz = -60; gz <= 60; gz++) {
    const cx = gx * block, cz = gz * block, d = Math.hypot(cx, cz);
    if (d > 4100 || d < 50) continue;
    const down = Math.hypot(cx - 120, cz - 420);
    for (let k = 0; k < 2; k++) {
      const x = cx + (k ? 15 : -15) + (R() - 0.5) * 6, z = cz + (R() - 0.5) * 10;
      if (Math.abs(x - 35) < 34 && z > 50 && z < 3000) continue;
      let h = 8 + R() * 18; if (down < 450) h = 60 + R() * 240 * (1 - down / 450); if (Math.abs(x - 35) < 80 && z > 150 && z < 900) h = 120 + R() * 180; else if (R() < 0.04) h = 40 + R() * 60;
      blds.push({ x, z, w: 22 + R() * 6, dd: 40 + R() * 12, h, d: Math.hypot(x, z), c: palette[Math.floor(R() * palette.length)] });
    }
  }
  // neighbour building with balcony (special)
  const city = new THREE.InstancedMesh(bGeo, bMat, blds.length); city.castShadow = true; city.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
  blds.forEach((b, i) => { m4.compose(v3.set(b.x, 0, b.z), q.identity(), s3.set(b.w, b.h, b.dd)); city.setMatrixAt(i, m4); city.setColorAt(i, col.set(b.c)); });
  A.add(city);
  const crushOrder = blds.map((b, i) => i).sort((a, b) => blds[a].d - blds[b].d);
  let crushed = 0;
  const nb = new THREE.Mesh(new THREE.BoxGeometry(14, 19.2, 24), new THREE.MeshStandardMaterial({ color: 0xc9a27e, roughness: 0.8, flatShading: true }));
  nb.position.set(-23, 9.6, -2); nb.castShadow = nb.receiveShadow = true; A.add(nb);
  // windows on neighbour building
  const winMat = new THREE.MeshStandardMaterial({ color: 0x8fb4d6, emissive: 0x223344, roughness: 0.2 });
  for (let f = 0; f < 6; f++) for (let w = 0; w < 5; w++) { const wm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 2.4), winMat); wm.position.set(-15.95, 1.6 + f * 3.2, -10 + w * 4.6); A.add(wm); }
  const balc = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.25, 4.5), new THREE.MeshStandardMaterial({ color: 0xeeeeee })); balc.position.set(-13.5, 12.8, 2.0); A.add(balc);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 4.5), new THREE.MeshStandardMaterial({ color: 0x333333 })); rail.position.set(-11.1, 13.4, 2.0); A.add(rail);
  const neighbour = makePerson(THREE, { shirt: 0xe0533a, pants: 0x34495e, hair: 0x8a5a2b, skin: 0xc68b62 });
  neighbour.group.position.set(-12.3, 12.93, 2.2); neighbour.group.rotation.y = Math.PI / 2; neighbour.group.scale.setScalar(0.95); A.add(neighbour.group);
  // trees in park
  const trunkG = new THREE.CylinderGeometry(0.25, 0.35, 3, 5); trunkG.translate(0, 1.5, 0);
  const crownG = new THREE.IcosahedronGeometry(2.2, 0); crownG.translate(0, 4.5, 0);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true }), 40);
  const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0x3f8a3a, flatShading: true }), 40);
  for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = 14 + R() * 38; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (x < -12 && Math.abs(z) < 16) { i--; continue; }
    m4.compose(v3.set(x, 0, z), q.identity(), s3.setScalar(0.8 + R() * 0.6)); trunks.setMatrixAt(i, m4); crowns.setMatrixAt(i, m4); }
  trunks.castShadow = crowns.castShadow = true; A.add(trunks, crowns);
  // cars on the ring road
  const cars = [];
  for (let i = 0; i < 10; i++) { const c = new THREE.Group(); const cm = new THREE.MeshStandardMaterial({ color: [0xff4d4d, 0x3d8bff, 0xffd23f, 0xffffff, 0x2ecc71][i % 5], flatShading: true, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 4.2), cm); body.position.y = 0.6; c.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), cm); top.position.set(0, 1.25, -0.2); c.add(top);
    c.traverse(m => m.castShadow = true); c.userData = { a0: R() * 6.28, sp: (0.08 + R() * 0.05) * (i % 2 ? 1 : -1), r: i % 2 ? 60 : 64 }; cars.push(c); A.add(c); }
  // clouds
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const clouds = new THREE.InstancedMesh(puff, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0x334455 }), 2400);
  for (let i = 0; i < 2400; i += 6) { const a = R() * 6.28, r = 1500 + Math.sqrt(R()) * 60000; const cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 1800 + R() * 900; const sz = 300 + R() * 700;
    for (let k = 0; k < 6; k++) { m4.compose(v3.set(cx + (R() - 0.5) * sz * 2.5, cy + (R() - 0.3) * sz * 0.5, cz + (R() - 0.5) * sz * 2), q.identity(), s3.set(sz * (0.6 + R() * 0.6), sz * (0.35 + R() * 0.3), sz * (0.6 + R() * 0.6))); clouds.setMatrixAt(i + k, m4); } }
  A.add(clouds);
  // mountains
  const mtn = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x7d8a74, flatShading: true, roughness: 1 }), 220);
  for (let i = 0; i < 220; i++) { const a = R() * 6.28, r = 25000 + R() * 120000, hgt = 1500 + R() * 4500; m4.compose(v3.set(Math.cos(a) * r, 0, Math.sin(a) * r), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6), s3.set(hgt * 1.6, hgt, hgt * 1.6)); mtn.setMatrixAt(i, m4); }
  A.add(mtn);
  // jets
  const jets = [];
  const jetMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.2, flatShading: true });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x1f6fd1, flatShading: true });
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, fog: false });
  for (let i = 0; i < 3; i++) { const j = new THREE.Group();
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 60, 10), jetMat); fus.rotation.z = Math.PI / 2; j.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(2.5, 10, 6), jetMat); nose.position.x = 30; nose.scale.x = 2.2; j.add(nose);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 58), jetMat); wing.position.x = 2; j.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 0.6), tailMat); tail.position.set(-27, 5, 0); j.add(tail);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 20), jetMat); stab.position.set(-27, 1, 0); j.add(stab);
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 4, 1, 6), trailMat); trail.rotation.z = Math.PI / 2; j.add(trail); j.userData.trail = trail;
    jets.push(j); A.add(j); }
  // dust ring particles at feet
  const dustN = 400; const dustPos = new Float32Array(dustN * 3); const dustSeed = [];
  for (let i = 0; i < dustN; i++) dustSeed.push([R() * 6.28, R(), R()]);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xd8c8a8, size: 6, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false })); dust.frustumCulled = false; A.add(dust);
  // the hero
  const heroA = makePerson(THREE, { shirt: 0x2f7de1 });
  A.add(heroA.group);
  const cupA = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  heroA.armR.userData.end.add(cupA); cupA.position.set(0, -0.05, 0.07);
  const painMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a, fog: false });
  const painA = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), painMat); painA.visible = false; heroA.group.add(painA);
  const painGlowA = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.3, fog: false, depthWrite: false })); painA.add(painGlowA);
  const target = new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: 0x8fc1ee, emissive: 0x16304a, roughness: 0.3, metalness: 0.2, flatShading: true }));
  target.castShadow = true; A.add(target); target.visible = false;

  // ================= WORLD B : planet, km =================
  const B = new THREE.Scene();
  const camB = new THREE.PerspectiveCamera(50, W / H, 0.5, 5e7);
  const RE = 6371;
  B.add(new THREE.AmbientLight(0x223355, 0.35));
  const sunB = new THREE.DirectionalLight(0xffffff, 3.2); sunB.position.set(1, 0.6, 0.8).multiplyScalar(1e5); B.add(sunB);
  // procedural earth texture
  const ec = document.createElement('canvas'); ec.width = 1024; ec.height = 512; const eg = ec.getContext('2d');
  const id = eg.createImageData(1024, 512);
  const perm = []; const R2 = rng(9); for (let i = 0; i < 512; i++) perm.push(R2());
  const vn = (x, y, z) => { const h = (a, b, c) => perm[(Math.abs(Math.floor(a) * 73856093 ^ Math.floor(b) * 19349663 ^ Math.floor(c) * 83492791)) % 512];
    const fx = x - Math.floor(x), fy = y - Math.floor(y), fz = z - Math.floor(z); const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); const L = (a, b, t) => a + (b - a) * t;
    return L(L(L(h(X, Y, Z), h(X + 1, Y, Z), sx), L(h(X, Y + 1, Z), h(X + 1, Y + 1, Z), sx), sy), L(L(h(X, Y, Z + 1), h(X + 1, Y, Z + 1), sx), L(h(X, Y + 1, Z + 1), h(X + 1, Y + 1, Z + 1), sx), sy), sz); };
  for (let y = 0; y < 512; y++) { const lat = (0.5 - y / 512) * Math.PI; for (let x = 0; x < 1024; x++) { const lon = x / 1024 * Math.PI * 2;
    const px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
    let n = 0, a = 1, f = 1.6; for (let o = 0; o < 5; o++) { n += vn(px * f + 10, py * f + 10, pz * f + 10) * a; a *= 0.5; f *= 2.1; } n /= 1.94;
    const ice = Math.abs(lat) > 1.25; let r, g, b;
    if (ice) { r = g = b = 235; } else if (n > 0.52) { const m = (n - 0.52) * 4; r = 70 + m * 90; g = 120 + m * 40; b = 55 + m * 30; if (Math.abs(lat) < 0.45 && n > 0.62) { r = 190; g = 165; b = 110; } }
    else { const m = n / 0.52; r = 10 + m * 20; g = 40 + m * 60; b = 90 + m * 80; }
    const i4 = (y * 1024 + x) * 4; id.data[i4] = r; id.data[i4 + 1] = g; id.data[i4 + 2] = b; id.data[i4 + 3] = 255; } }
  eg.putImageData(id, 0, 0);
  const etex = new THREE.CanvasTexture(ec); etex.colorSpace = THREE.SRGBColorSpace;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 128, 64), new THREE.MeshStandardMaterial({ map: etex, roughness: 0.85 }));
  earth.rotation.y = 2.2; B.add(earth);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RE + 100, 96, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(0.35,0.65,1.0,1.0)*f*1.6; }` }));
  B.add(atm);
  const atm2 = new THREE.Mesh(new THREE.SphereGeometry(RE + 60, 96, 48), new THREE.MeshBasicMaterial({ color: 0x6fb0ff, transparent: true, opacity: 0.12, depthWrite: false })); B.add(atm2);
  const st = stars(THREE, 5000, 3e6); B.add(st);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1737, 48, 24), new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 1, flatShading: true })); moon.position.set(-60000, 30000, -150000); B.add(moon);
  const heroB = makePerson(THREE, { shirt: 0x2f7de1 }); B.add(heroB.group);
  heroB.group.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
  const cupB = cupA.clone(); heroB.armR.userData.end.add(cupB);
  const painB = painA.clone(); heroB.group.add(painB);
  const ctc = document.createElement('canvas'); ctc.width = ctc.height = 256; { const g = ctc.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0,0,256,256); const Rc = rng(5); for (let i = 0; i < 900; i++) { const a = Rc()*6.28, r = Math.pow(Rc(),0.7)*120; g.fillStyle = `rgba(255,${180+Rc()*60|0},90,${0.5+Rc()*0.5})`; g.fillRect(128+Math.cos(a)*r, 128+Math.sin(a)*r, 2+Rc()*4, 2+Rc()*4); } g.strokeStyle='rgba(255,200,120,0.5)'; g.lineWidth=2; for (let k=0;k<12;k++){ g.beginPath(); g.moveTo(128,128); const a=k/12*6.28; g.lineTo(128+Math.cos(a)*125,128+Math.sin(a)*125); g.stroke(); } }
  const cityPatch = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ctc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); cityPatch.rotation.x = -Math.PI / 2; B.add(cityPatch);
  // measuring bars
  const barMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthTest: false });
  const barEarth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), barMat); const barHero = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), barMat.clone()); barHero.material.color.set(0x5fd0ff);
  barEarth.renderOrder = barHero.renderOrder = 10; B.add(barEarth, barHero);

  // ----- pose -----
  function pose(P, c, t, mode) {
    P.armR.rotation.set(-1.15, 0, 0.15); // coffee forward
    P.armL.rotation.set(0.05, 0, -0.08);
    P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0);
    P.headPivot.rotation.set(0, 0, 0);
    P.torso.rotation.set(0, 0, 0);
    const breathe = Math.sin(t * 2.2) * 0.02; P.torso.scale.set(1 + breathe, 1, 1 + breathe);
    if (c > 4.6 && c < 9.5) { // wave at neighbour
      const w = smooth(4.6, 5.2, c) * (1 - smooth(8.8, 9.5, c));
      P.armL.rotation.z = lerp(-0.08, -2.6 + Math.sin(t * 9) * 0.35, w);
      P.headPivot.rotation.y = lerp(0, -0.95, w); P.headPivot.rotation.x = lerp(0, 0.2, w);
    }
    const k = c - KICK; // toe stub
    if (k > -0.6 && k < 1.2) { P.legR.rotation.x = -0.45 * Math.sin(clamp((k + 0.6) / 0.6) * Math.PI / 2) * (k < 0 ? 1 : (1 - smooth(0, 0.5, k))); if (k > 0 && k < 1.2) { P.headPivot.rotation.x = 0.35 * (1 - smooth(0.6, 1.2, k)); P.armL.rotation.z = -0.6 * (1 - smooth(0.6, 1.2, k)); } }
    if (mode === 'look') P.headPivot.rotation.x = 0.45;
    P.mouth.scale.set(1, (k > 0 && k < 1.5) ? 5 : 1, 1);
  }
  // pain dot fraction along nerve path
  const nerve = [[0.1, 0.05, 0.2], [0.1, 0.08, 0.02], [0.1, 0.45, 0.02], [0.1, 0.85, 0], [0, 1.45, 0], [0, 1.7, 0.02]];
  const segL = []; let tot = 0; for (let i = 0; i < nerve.length - 1; i++) { const l = Math.hypot(...nerve[i + 1].map((x, j) => x - nerve[i][j])); segL.push(l); tot += l; }
  function painFrac(c) { if (c < KICK) return -1; let f = 0; for (let x = KICK; x < Math.min(c, 35); x += 0.01) f += 0.01 * 120 / (hOf(x) / 1.8 * tot); return f; }
  function nervePos(f) { let d = f * tot; for (let i = 0; i < segL.length; i++) { if (d <= segL[i]) { const u = d / segL[i]; return nerve[i].map((x, j) => lerp(x, nerve[i + 1][j], u)); } d -= segL[i]; } return nerve[nerve.length - 1]; }

  const cv = new THREE.Vector3(), tv = new THREE.Vector3();
  function update(t) {
    const c = t - T0; const h = hOf(c); const s = h / 1.8;
    const ticks = [0, 5, 10, 15, 20, 25, 30, 35].map(x => x + T0);
    let tickP = 0; ticks.forEach(x => { tickP = Math.max(tickP, pulse(t, x, 0.45)); });
    const out = { shake: tickP * 0.5 + pulse(t, T0 + KICK, 0.5) * 0.6, bloom: 0.55, flash: 0, counterBump: tickP };
    const useB = t < 1.3 || c >= 25;
    if (!useB) {
      // ---------- world A ----------
      out.scene = A; out.camera = camA;
      heroA.group.scale.setScalar(s); pose(heroA, c, t);
      // crush buildings under the feet
      const foot = 0.32 * s;
      while (crushed < crushOrder.length && blds[crushOrder[crushed]].d < foot + 10) { const b = blds[crushOrder[crushed]]; m4.compose(v3.set(b.x, 0, b.z), q.identity(), s3.set(b.w * 1.15, Math.min(b.h, 1.5), b.dd * 1.15)); city.setMatrixAt(crushOrder[crushed], m4); crushed++; city.instanceMatrix.needsUpdate = true; }
      nb.visible = h < 60; balc.visible = rail.visible = neighbour.group.visible = h < 60;
      // neighbour reacts
      neighbour.armR.rotation.set(-1.0, 0, 0); neighbour.armL.rotation.z = c > 5.8 ? -2.4 + Math.sin(t * 8) * 0.3 : -0.1; neighbour.headPivot.rotation.x = -0.5;
      cars.forEach(car => { const a = car.userData.a0 + t * car.userData.sp; car.position.set(Math.cos(a) * car.userData.r, 0, Math.sin(a) * car.userData.r); car.rotation.y = -a + (car.userData.sp > 0 ? 0 : Math.PI); car.visible = h < 200; });
      // dust burst on ticks
      const dp = dust.geometry.attributes.position.array; let last = 0; ticks.forEach(x => { if (t >= x) last = x; }); const age = t - last; const cl = last - T0;
      const sDust = hOf(cl) / 1.8;
      for (let i = 0; i < dustN; i++) { const [a, r1, r2] = dustSeed[i]; const rr = sDust * (0.4 + easeOut(age / 2) * (1.2 + r1 * 2)); dp[i * 3] = Math.cos(a) * rr; dp[i * 3 + 1] = sDust * (0.02 + r2 * 0.25 * easeOut(age / 1.5)); dp[i * 3 + 2] = Math.sin(a) * rr; }
      dust.geometry.attributes.position.needsUpdate = true; dust.material.opacity = 0.7 * (1 - clamp(age / 2.5)); dust.material.size = 9 * (window.RES || 1);
      // pain dot
      const pf = painFrac(c); painA.visible = pf >= 0; if (pf >= 0) { painA.position.set(...nervePos(pf)); painA.scale.setScalar(1 + 0.3 * Math.sin(t * 12)); }
      // target skyscraper for the kick
      target.visible = c > 13 && c < 20; const ts = hOf(KICK) / 1.8; target.position.set(0.1 * ts, 0, 0.56 * ts + 110);
      const kk = c - KICK; const wob = kk > 0 ? Math.sin(kk * 14) * Math.exp(-kk * 2.5) * 0.12 : 0;
      target.scale.set(220, 760, 200); target.rotation.set(wob, 0, wob * 0.6); target.position.y = 0;
      // jets
      jets.forEach((j, i) => { const jt = c - 19.6 - i * 0.35; j.visible = c > 19 && c < 25; j.position.set(-6500 + jt * 1500 + i * 600, 10600 + i * 500, 4200 + i * 1100); j.rotation.set(0, 0, 0.02); j.userData.trail.scale.set(1, 1400, 1); j.userData.trail.position.x = -730; j.scale.setScalar(5); });
      // camera per beat
      let cam, tgt, fov = 50;
      if (c < 5) { // street level, coffee
        const u = clamp((t - 1.3) / (T0 + 5 - 1.3)); const ang = lerp(0.65, 0.15, easeInOut(u));
        const d = lerp(3.4, 2.6, u) * s + 1.6; cam = [Math.sin(ang) * d, 0.5 * s + 0.2, Math.cos(ang) * d]; tgt = [0, 0.95 * s, 0]; fov = 55;
      } else if (c < 7.6) { // balcony shot, look up at face
        cam = [-15.6 + (c - 5) * 0.2, 15.2 + (c - 5) * 0.3, 3.2 + (c - 5) * 0.4]; tgt = [-4, lerp(15.5, 0.7 * h, smooth(5.4, 7.6, c)), 0]; fov = 68;
      } else if (c < 10) { const u = (c - 7.6) / 2.4; cam = [35 + 0.08 * h, 0.2 * h + 3, 2.1 * h * (1 + 0.12 * u)]; tgt = [0, 0.56 * h, 0]; fov = 58; }
      else if (c < 15) { // worm's-eye among skyscrapers
        const u = (c - 10) / 5; cam = [35, lerp(4, 260, easeInOut(u)), lerp(420, 2900, easeInOut(u))]; tgt = [0, 0.6 * h, 0]; fov = 64;
      } else if (c < 20) { // the kick
        const u = (c - 15) / 5; const ks = hOf(KICK) / 1.8; const pull = Math.max(1, s / ks);
        cam = [ks * lerp(3.0, 2.6, u) * pull, ks * lerp(0.22, 0.45, u) * pull, ks * lerp(0.7, 0.9, u) * pull]; tgt = [0.1 * ks, lerp(0.3 * ks, 0.55 * h, smooth(2.5, 5, c - 15)), lerp(0.55, 0.3, u) * ks]; fov = 55;
      } else { // jets past the belly
        const u = (c - 20) / 5; if (c < 22.2) { cam = [-9500 + (c - 20) * 500, 10400, 9500]; tgt = [0, 11000 + (c - 20) * 900, 1500]; fov = 55; }
        else { const v = easeInOut((c - 22.2) / 2.8); cam = [lerp(-8400, -1.3 * h, v), lerp(10400, 0.55 * h, v), lerp(9500, 1.9 * h, v)]; tgt = [0, lerp(14000, 0.55 * h, v), 0]; fov = 55; }
      }
      if (t < 1.3) {}
      camA.fov = fov; camA.position.set(...cam); camA.lookAt(...tgt); camA.updateProjectionMatrix();
      sky.position.copy(camA.position); sky.scale.setScalar(1e6);
      const alt = camA.position.y;
      const space = smooth(9000, 60000, alt);
      skyMat.uniforms.zen.value.set(0x3d7fd6).lerp(new THREE.Color(0x02030a), space);
      skyMat.uniforms.hor.value.set(0xcfe3f5).lerp(new THREE.Color(0x5d8fc8), space * 0.8);
      A.fog.color.set(0xbcd6f0).lerp(new THREE.Color(0x9cc0e6), space);
      const dist = camA.position.distanceTo(tv.set(...tgt));
      A.fog.density = 1 / (Math.max(dist, 8) * 9 + 400 * smooth(9000, 60000, alt) * 0);
      clouds.visible = h > 300;
      // sun & shadows follow
      tv.set(...tgt); sun.target.position.copy(tv); sun.position.copy(tv).add(cv.set(0.5, 0.8, 0.6).multiplyScalar(Math.max(h * 3, 40)));
      const sc = sun.shadow.camera; const ext = Math.max(h * 1.6, 30); sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 0.1; sc.far = Math.max(h * 8, 200); sc.updateProjectionMatrix();
      sun.shadow.bias = -0.0005;
    } else {
      // ---------- world B ----------
      out.scene = B; out.camera = camB;
      const tease = t < 1.3; const hk = tease ? 18000 * (1 - 0.1 * t) : h / 1000; let sk = hk / 1.8;
      let cc = c;
      if (t >= CLOSE) { const u = smooth(CLOSE, CLOSE + 2.4, t); sk = (hOf(35) / 1800) * Math.pow(10, -6 * u); }
      heroB.group.scale.setScalar(sk); heroB.group.position.set(0, RE - 0.02 * sk, 0);
      pose(heroB, tease ? 30 : cc, t, t > PAY && t < CLOSE ? 'look' : null);
      const pf = painFrac(Math.min(c, 35)); painB.visible = pf >= 0 && !tease; if (pf >= 0) { painB.position.set(...nervePos(pf)); painB.scale.setScalar(1 + 0.35 * Math.sin(t * 10)); }
      cityPatch.position.set(0.1 * sk, RE + 2, 0.3 * sk); cityPatch.scale.setScalar(0.12 * sk); cityPatch.visible = c > 29 && c < 36;
      barEarth.visible = barHero.visible = (c > 35.6 && t < PAY - 0.2);
      const bw = 380; barEarth.scale.set(bw, 2 * RE, bw); barEarth.position.set(-RE - 1800, 0, 0);
      barHero.scale.set(bw, 1.8 * sk, bw); barHero.position.set(-0.9 * sk * 0.0 - 1200 + RE * 0, RE + 0.9 * sk, 0); barHero.position.x = 0.9 * sk * 0.55 + 600;
      let cam, tgt, fov = 50;
      if (tease) { const u = t / 1.3; cam = [lerp(52000, 47000, u), RE + 9000, lerp(52000, 47000, u)]; tgt = [0, RE * 0.6 + 9000, 0]; fov = 50; }
      else if (c < 30) { const u = (c - 25) / 5; cam = [hk * (0.9 + 0.3 * u), RE + hk * lerp(0.85, 0.75, u), hk * (1.2 + 0.2 * u)]; tgt = [0, RE + hk * 0.55, 0]; fov = 55; }
      else if (c < 35) { const u = (c - 30) / 5; const k = hOf(30) / 1000 / 1.8; const pull = Math.max(1, sk / k);
        cam = [k * (0.65 + 0.2 * u) * pull, RE + k * 0.28 * pull, k * (0.9 + 0.2 * u) * pull]; tgt = [0.1 * k * pull, RE + 0.05 * k * pull, 0.08 * k * pull]; fov = 55; }
      else if (t < PAY) { const u = easeInOut((t - (T0 + 35)) / (PAY - T0 - 35)); cam = [lerp(24000, 33000, u), RE + 6000, lerp(44000, 58000, u)]; tgt = [0, RE * 0.55 + 7500, 0]; fov = 52; }
      else if (t < CLOSE) { // look at the shin with the pain dot
        const u = easeInOut((t - PAY) / (CLOSE - PAY)); const pp = nervePos(Math.max(pf, 0)); const wx = pp[0] * sk, wy = RE + pp[1] * sk, wz = pp[2] * sk;
        cam = [lerp(wx + 0.9 * sk, wx + 1.3 * sk, u), lerp(wy + 0.05 * sk, RE + 1.0 * sk, u), lerp(wz + 0.6 * sk, 1.4 * sk, u)]; tgt = [lerp(wx, 0, u), lerp(wy, RE + 1.2 * sk, u), lerp(wz, 0, u)]; fov = 45; }
      else { const u = easeInOut((t - CLOSE) / 2.6); cam = [lerp(25000, 2500, u), RE + lerp(14000, 900, u), lerp(32000, 3000, u)]; tgt = [0, RE + lerp(9000, 0, u), 0]; fov = 50; }
      camB.fov = fov; camB.position.set(...cam); camB.lookAt(...tgt); camB.updateProjectionMatrix();
      out.bloom = 0.7; out.bloomThreshold = 0.92;
      if (t >= CLOSE) out.flash = pulse(t, CLOSE + 2.2, 0.4) * 0.9;
    }
    out.flash = Math.max(out.flash, pulse(t, 1.3, 0.25) * 0.85, pulse(t, T0 + 25, 0.3) * 0.7);
    out.c = c; out.h = h;
    return out;
  }

  const fmtH = (h) => h < 100 ? h.toFixed(1) + ' m' : h < 1000 ? Math.round(h) + ' m' : h < 10000 ? (h / 1000).toFixed(2) + ' km' : h < 100000 ? (h / 1000).toFixed(1) + ' km' : Math.round(h / 1000).toLocaleString('en-US') + ' km';
  const caps = [
    [T0 + 6.0, '5TH FLOOR', 1.8], [T0 + 11.2, 'SKYSCRAPER SIZE', 2.0], [T0 + KICK, 'OUCH...', 1.1], [T0 + KICK + 1.3, 'ARRIVES IN 15 s', 2.2],
    [T0 + 21.0, 'BELLY BUTTON ALTITUDE', 2.4], [T0 + 26.2, 'SPACE', 2.0], [T0 + 31.4, '1 SHOE = 1 CITY', 2.2], [T0 + 36.4, 'TALLER THAN EARTH', 2.6],
    [PAY + 1.6, '~2 DAYS', 1.6], [CLOSE + 1.0, 'PART 2: YOU SHRINK', 2.6]
  ];
  function hud(ctx, t, st) { const W = 1080, H = 1920;
    drawTitle(ctx, W, H, [{ text: 'WHAT IF YOU GREW 10x', size: 92 }, { text: 'EVERY 5 SECONDS?', size: 92, accent: true }], t);
    const c = st.c; const clock = clamp(c, 0, 35);
    if (t < PAY || t >= CLOSE) {
      const label = `HEIGHT  •  ${clock < 0 ? '0:00' : '0:' + String(Math.floor(clock)).padStart(2, '0')}`;
      drawCounter(ctx, W, H, label, fmtH(t < 1.3 ? 18000000 : st.h), t, { bump: st.counterBump });
    } else {
      const left = 150000 - (t - PAY) * 1; const hh = Math.floor(left / 3600), mm = Math.floor(left % 3600 / 60), ss = Math.floor(left % 60);
      drawCounter(ctx, W, H, 'TOE PAIN ARRIVES IN', `${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`, t, { color: '#ff5a5a', glow: 'rgba(255,60,60,0.8)', size: 96 });
    }
    for (const [at, txt, dur] of caps) drawCaption(ctx, W, H, txt, t - at, { dur, color: txt.startsWith('~') || txt.startsWith('OUCH') ? '#ff6b6b' : '#ffffff' });
  }
  return { scene: A, camera: camA, update, hud, info: { TOTAL } };
}
