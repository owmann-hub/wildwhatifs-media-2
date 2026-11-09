// shared helpers for all scenes
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const pulse = (t, at, len = 0.3) => (t >= at && t < at + len) ? 1 - (t - at) / len : 0;
// seeded random
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// piecewise keyframes [[t, v], ...] with smooth interpolation
export function keys(k, t, ease = easeInOut) {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, v0] = k[i], [t1, v1] = k[i + 1];
    if (t <= t1) { const u = ease((t - t0) / (t1 - t0)); return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], u)) : lerp(v0, v1, u); }
  }
  return k[k.length - 1][1];
}

// low-poly stylised person, ~1.8 units tall, origin at feet
export function makePerson(THREE, o = {}) {
  const skin = new THREE.MeshStandardMaterial({ color: o.skin ?? 0xe0a882, roughness: 0.7, flatShading: true });
  const shirt = new THREE.MeshStandardMaterial({ color: o.shirt ?? 0x2f7de1, roughness: 0.8, flatShading: true });
  const pants = new THREE.MeshStandardMaterial({ color: o.pants ?? 0x2b2f3a, roughness: 0.9, flatShading: true });
  const shoe = new THREE.MeshStandardMaterial({ color: o.shoe ?? 0xf2f2f2, roughness: 0.6, flatShading: true });
  const hair = new THREE.MeshStandardMaterial({ color: o.hair ?? 0x3b2416, roughness: 0.9, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
  const g = new THREE.Group();
  const mats = { skin, shirt, pants, shoe, hair };
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.62, 8), shirt); torso.position.y = 1.18; g.add(torso);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 8), pants); hips.position.y = 0.86; g.add(hips);
  const headPivot = new THREE.Group(); headPivot.position.y = 1.5; g.add(headPivot);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), skin); head.position.y = 0.14; head.scale.set(1, 1.1, 1); headPivot.add(head);
  const hairM = new THREE.Mesh(new THREE.IcosahedronGeometry(0.168, 1), hair); hairM.position.set(0, 0.235, -0.045); hairM.scale.set(1.04, 0.6, 1.0); headPivot.add(hairM);
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const eyeG = new THREE.SphereGeometry(0.034, 10, 8), pupG = new THREE.SphereGeometry(0.018, 8, 6);
  const eyeL = new THREE.Mesh(eyeG, white); eyeL.position.set(-0.062, 0.17, 0.135); headPivot.add(eyeL);
  const eyeR = new THREE.Mesh(eyeG, white); eyeR.position.set(0.062, 0.17, 0.135); headPivot.add(eyeR);
  const pL = new THREE.Mesh(pupG, dark); pL.position.set(0, 0, 0.026); eyeL.add(pL);
  const pR = new THREE.Mesh(pupG, dark); pR.position.set(0, 0, 0.026); eyeR.add(pR);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 5), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.11, 0.17); headPivot.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.01), dark); mouth.position.set(0, 0.05, 0.155); headPivot.add(mouth);
  const mkLimb = (len, r, mat, endMat, endSize) => {
    const p = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 6), mat); m.position.y = -len / 2; p.add(m);
    if (endMat) { const e = new THREE.Mesh(new THREE.BoxGeometry(...endSize), endMat); e.position.set(0, -len - endSize[1] / 2 + 0.02, endSize[2] * 0.25); p.add(e); p.userData.end = e; }
    return p;
  };
  const armL = mkLimb(0.6, 0.055, shirt, skin, [0.08, 0.1, 0.08]); armL.position.set(-0.26, 1.45, 0); g.add(armL);
  const armR = mkLimb(0.6, 0.055, shirt, skin, [0.08, 0.1, 0.08]); armR.position.set(0.26, 1.45, 0); g.add(armR);
  const legL = mkLimb(0.78, 0.075, pants, shoe, [0.12, 0.09, 0.27]); legL.position.set(-0.1, 0.82, 0); g.add(legL);
  const legR = mkLimb(0.78, 0.075, pants, shoe, [0.12, 0.09, 0.27]); legR.position.set(0.1, 0.82, 0); g.add(legR);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, torso, headPivot, head, armL, armR, legL, legR, mouth, eyeL, eyeR, mats };
}

// ---------- HUD ----------
const FONT = '"Inter Display", "Inter", sans-serif';
function fitText(ctx, text, maxW, size, weight = 900) {
  let s = size; ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && s > 20) { s -= 2; ctx.font = `${weight} ${s}px ${FONT}`; }
  return s;
}
function strokeText(ctx, text, x, y, fill, stroke, lw) {
  ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
// Title: two lines max, in the 12%-24% band
export function drawTitle(ctx, W, H, lines, t, accent = '#ffd23f') {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const pop = t < 0.35 ? 0.85 + 0.15 * easeOut(t / 0.35) + 0.06 * Math.sin(t / 0.35 * Math.PI) : 1;
  const y0 = H * 0.155;
  ctx.translate(W / 2, y0); ctx.scale(pop, pop);
  lines.forEach((ln, i) => {
    const s = fitText(ctx, ln.text, W * 0.88, ln.size || 84);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    strokeText(ctx, ln.text, 0, i * s * 1.08, ln.accent ? accent : '#ffffff', 'rgba(0,0,0,0.92)', s * 0.16);
  });
  ctx.restore();
}
// Counter pill: label + big value
export function drawCounter(ctx, W, H, label, value, t, o = {}) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = o.y ?? H * 0.295;
  const bump = o.bump || 0;
  ctx.translate(W / 2, y); ctx.scale(1 + bump * 0.18, 1 + bump * 0.18);
  ctx.font = `800 34px ${FONT}`;
  const vs = fitText(ctx, value, W * 0.8, o.size ?? 120, 900);
  ctx.font = `900 ${vs}px ${FONT}`;
  const vw = Math.max(ctx.measureText(value).width, 300);
  const bw = vw + 90, bh = vs * 1.0 + 92;
  ctx.fillStyle = o.bg ?? 'rgba(8,10,20,0.55)';
  ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 34); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = o.color ?? '#ffd23f'; ctx.globalAlpha = 0.9; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.font = `800 32px ${FONT}`; ctx.fillStyle = o.color ?? '#ffd23f';
  ctx.fillText(label, 0, -bh / 2 + 34);
  ctx.font = `900 ${vs}px ${FONT}`;
  ctx.shadowColor = o.glow ?? 'rgba(255,210,63,0.8)'; ctx.shadowBlur = 24 + bump * 40;
  ctx.fillStyle = '#ffffff'; ctx.fillText(value, 0, 24);
  ctx.restore();
}
// punch caption in the middle-low band (stays above bottom 22%)
export function drawCaption(ctx, W, H, text, age, o = {}) {
  if (!text || age < 0) return;
  const dur = o.dur ?? 2.2; if (age > dur) return;
  const a = Math.min(1, age / 0.08, (dur - age) / 0.25);
  const pop = age < 0.18 ? 0.6 + 0.4 * easeOut(age / 0.18) + 0.12 * Math.sin(age / 0.18 * Math.PI) : 1;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate(W / 2, o.y ?? H * 0.68); ctx.rotate(o.rot ?? -0.03); ctx.scale(pop, pop);
  const s = fitText(ctx, text, W * 0.84, o.size ?? 96);
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 20;
  strokeText(ctx, text, 0, 0, o.color ?? '#ffffff', '#000', s * 0.18);
  ctx.restore();
}
export function drawHandle(ctx, W, H, text) {
  ctx.save(); ctx.globalAlpha = 0.55; ctx.textAlign = 'center'; ctx.font = `700 30px ${FONT}`; ctx.fillStyle = '#fff';
  ctx.fillText(text, W / 2, H * 0.765); ctx.restore();
}

// sky gradient texture
export function skyTexture(THREE, stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => gr.addColorStop(p, col));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// starfield points
export function stars(THREE, n = 3000, r = 5000, seed = 7) {
  const R = rng(seed); const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = R() * 2 - 1, th = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false }));
}

// ---------- shared world builders ----------
export function makeSkyDome(THREE, zen = 0x3d7fd6, hor = 0xcfe3f5, sunDir = [0.4, 0.5, 0.7]) {
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { zen: { value: new THREE.Color(zen) }, hor: { value: new THREE.Color(hor) }, sunDir: { value: new THREE.Vector3(...sunDir).normalize() } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 zen; uniform vec3 hor; uniform vec3 sunDir; varying vec3 vP;
      void main(){ float h = clamp(vP.y*1.4+0.05,0.001,1.); vec3 c = mix(hor, zen, pow(h,0.6));
      float s = max(dot(normalize(vP), sunDir),0.); c += vec3(1.,0.9,0.7)*pow(s,300.)*4. + vec3(1.,0.8,0.5)*pow(s,8.)*0.25; gl_FragColor = vec4(c,1.); }` });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10; m.scale.setScalar(1e5);
  return m;
}
export function makeEarth(THREE, RE = 6371, seed = 9) {
  const ec = document.createElement('canvas'); ec.width = 1024; ec.height = 512; const eg = ec.getContext('2d');
  const id = eg.createImageData(1024, 512);
  const perm = []; const R2 = rng(seed); for (let i = 0; i < 512; i++) perm.push(R2());
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
  const g = new THREE.Group();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 128, 64), new THREE.MeshStandardMaterial({ map: etex, roughness: 0.85 })); g.add(earth);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.016, 96, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(0.35,0.65,1.0,1.0)*f*1.6; }` }));
  g.add(atm);
  const atm2 = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.009, 96, 48), new THREE.MeshBasicMaterial({ color: 0x6fb0ff, transparent: true, opacity: 0.12, depthWrite: false })); g.add(atm2);
  g.userData.earth = earth; return g;
}
export function makeCat(THREE, color = 0xf0a040) {
  const m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 });
  const w = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), k = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.45), m); body.position.y = 0.22; g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), m); head.position.set(0, 0.38, 0.25); g.add(head);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), m); ear.position.set(s * 0.07, 0.5, 0.25); g.add(ear);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), w); e.position.set(s * 0.05, 0.4, 0.36); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), k); p.position.set(s * 0.05, 0.4, 0.385); g.add(p);
    for (const z of [-0.15, 0.15]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), m); leg.position.set(s * 0.07, 0.07, z); g.add(leg); } }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 5), m); tail.position.set(0, 0.38, -0.3); tail.rotation.x = -0.6; g.add(tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// voxel house: returns {mesh, vox:[{x,y,z,c}], set(i, matrix)}; origin at front-centre on ground, front faces +z
export function makeVoxelHouse(THREE, o = {}) {
  const Wd = o.w ?? 12, Ht = o.h ?? 7, Dp = o.d ?? 9, vs = o.vs ?? 0.5, R = rng(o.seed ?? 3);
  const wall = new THREE.Color(o.wall ?? 0xe8d8bd), roof = new THREE.Color(o.roof ?? 0xb5473a), win = new THREE.Color(0x9cc8f0), door = new THREE.Color(0x6b4226), trim = new THREE.Color(0xffffff);
  const vox = []; const nx = Math.round(Wd / vs), ny = Math.round(Ht / vs), nz = Math.round(Dp / vs);
  for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) for (let iz = 0; iz < nz; iz++) {
    const shell = ix === 0 || ix === nx - 1 || iz === 0 || iz === nz - 1; if (!shell) continue;
    const x = (ix - nx / 2 + 0.5) * vs, y = (iy + 0.5) * vs, z = -(iz + 0.5) * vs + 0;
    let c = wall.clone().offsetHSL(0, 0, (R() - 0.5) * 0.04);
    const front = iz === 0; const fx = x, fy = y;
    const isWin = (Math.abs(Math.abs(fx) - Wd * 0.28) < Wd * 0.1) && ((fy > 1.0 && fy < 2.3) || (fy > 4.0 && fy < 5.3)) && (front || iz === nz - 1);
    const isDoor = front && Math.abs(fx) < 0.6 && fy < 2.2;
    if (isWin) c = win.clone(); if (isDoor) c = door.clone();
    if (iy === 0 || (front && Math.abs(fy - 3.2) < vs * 0.6)) c = trim.clone();
    vox.push({ x, y, z: z + vs / 2 * 0, c, win: isWin });
  }
  // roof: stepped pyramid
  for (let k = 0; k < Math.round(Wd / vs / 2.2); k++) { const y = Ht + (k + 0.5) * vs; const half = nx / 2 - k;
    for (let ix = -half; ix < half; ix++) for (let iz = -1; iz < nz + 1; iz++) { if (!(ix === -half || ix === half - 1 || iz === -1 || iz === nz)) { if (k < Math.round(Wd / vs / 2.2) - 1) continue; }
      vox.push({ x: (ix + 0.5) * vs, y, z: -(iz + 0.5) * vs, c: roof.clone().offsetHSL(0, 0, (R() - 0.5) * 0.06) }); } }
  const geo = new THREE.BoxGeometry(vs * 0.98, vs * 0.98, vs * 0.98);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true }), vox.length);
  const m4 = new THREE.Matrix4();
  vox.forEach((v, i) => { m4.makeTranslation(v.x, v.y, v.z); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, v.c); });
  mesh.castShadow = mesh.receiveShadow = true;
  return { mesh, vox, vs };
}
// deterministic particle burst: spawn n particles at t0, analytic motion
export function makeBurst(THREE, n, o) {
  const R = rng(o.seed ?? 11); const P = [];
  for (let i = 0; i < n; i++) {
    const d = o.dir(R); const sp = (o.speed[0] + R() * (o.speed[1] - o.speed[0]));
    P.push({ p: o.origin(R), v: [d[0] * sp, d[1] * sp, d[2] * sp], life: o.life[0] + R() * (o.life[1] - o.life[0]), delay: (o.delay ?? 0) * R() });
  }
  const pos = new Float32Array(n * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (!window.__soft) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); window.__soft = new THREE.CanvasTexture(c); }
  const mat = new THREE.PointsMaterial({ map: o.square ? null : window.__soft, color: o.color ?? 0xffffff, size: (o.size ?? 6) * (window.RES || 1) * (o.square ? 1 : 1.6), sizeAttenuation: o.atten ?? false, transparent: true, opacity: o.opacity ?? 0.9, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.visible = false;
  const grav = o.gravity ?? 0, drag = o.drag ?? 0;
  pts.userData.update = (t, t0) => {
    const dt0 = t - t0; if (dt0 < 0 || dt0 > (o.life[1] + (o.delay ?? 0))) { pts.visible = false; return; }
    pts.visible = true; let alive = 0;
    for (let i = 0; i < n; i++) { const q = P[i]; const dt = dt0 - q.delay;
      if (dt < 0 || dt > q.life) { pos[i * 3 + 1] = -1e6; continue; } alive++;
      const k = drag ? (1 - Math.exp(-drag * dt)) / drag : dt;
      let y = q.p[1] + q.v[1] * k - 0.5 * grav * dt * dt; if (o.floor !== undefined && y < o.floor) y = o.floor;
      pos[i * 3] = q.p[0] + q.v[0] * k; pos[i * 3 + 1] = y; pos[i * 3 + 2] = q.p[2] + q.v[2] * k; }
    g.attributes.position.needsUpdate = true;
    mat.opacity = (o.opacity ?? 0.9) * (1 - clamp(dt0 / (o.life[1] + (o.delay ?? 0))) ** 2);
  };
  return pts;
}
