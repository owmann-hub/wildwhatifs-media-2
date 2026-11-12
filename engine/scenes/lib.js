// shared helpers for all scenes
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { RoundedBoxGeometry };
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
  // polished toy look (owner, Nov 12): rounded smooth-shaded body, capsule limbs, round head, soft materials
  const M = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const skin = M(o.skin ?? 0xe0a882, 0.62), shirt = M(o.shirt ?? 0x2f7de1, 0.72), pants = M(o.pants ?? 0x2b2f3a, 0.8), shoe = M(o.shoe ?? 0xf2f2f2, 0.5), hair = M(o.hair ?? 0x3b2416, 0.85);
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
  const g = new THREE.Group();
  const mats = { skin, shirt, pants, shoe, hair };
  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.64, 0.28, 5, 0.12), shirt); torso.position.y = 1.18; g.add(torso);
  const hips = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.24, 0.26, 4, 0.1), pants); hips.position.y = 0.87; g.add(hips);
  const headPivot = new THREE.Group(); headPivot.position.y = 1.5; headPivot.scale.setScalar(o.headScale ?? 1.16); g.add(headPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12), skin); neck.position.y = 1.5; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), skin); head.position.y = 0.14; head.scale.set(1.04, 1.1, 1.02); headPivot.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.174, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.43), hair); hairM.position.set(0, 0.14, -0.004); hairM.scale.set(1.05, 1.12, 1.05); hairM.rotation.x = -0.42; headPivot.add(hairM);
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), hair); fringe.position.set(0, 0.292, 0.062); fringe.scale.set(1.0, 0.34, 0.72); fringe.rotation.x = 0.35; headPivot.add(fringe);
  for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), skin); ear.position.set(sx * 0.165, 0.13, 0); ear.scale.set(0.5, 1, 0.8); headPivot.add(ear); }
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const eyeG = new THREE.SphereGeometry(0.034, 16, 12), pupG = new THREE.SphereGeometry(0.018, 12, 10);
  const eyeL = new THREE.Mesh(eyeG, white); eyeL.position.set(-0.062, 0.17, 0.135); headPivot.add(eyeL);
  const eyeR = new THREE.Mesh(eyeG, white); eyeR.position.set(0.062, 0.17, 0.135); headPivot.add(eyeR);
  const pL = new THREE.Mesh(pupG, dark); pL.position.set(0, 0, 0.026); eyeL.add(pL);
  const pR = new THREE.Mesh(pupG, dark); pR.position.set(0, 0, 0.026); eyeR.add(pR);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), skin); nose.scale.set(0.9, 0.9, 1.3); nose.position.set(0, 0.11, 0.158); headPivot.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.01), dark); mouth.position.set(0, 0.05, 0.158); headPivot.add(mouth);
  const es = o.eyeScale ?? 1.35; eyeL.scale.setScalar(es); eyeR.scale.setScalar(es); eyeL.userData.s = eyeR.userData.s = es;
  eyeL.position.y = eyeR.position.y = 0.175; eyeL.position.x = -0.066; eyeR.position.x = 0.066;
  const browG = new RoundedBoxGeometry(0.075, 0.018, 0.02, 2, 0.008);
  const browL = new THREE.Mesh(browG, hair); browL.position.set(-0.066, 0.238, 0.146); headPivot.add(browL);
  const browR = new THREE.Mesh(browG, hair); browR.position.set(0.066, 0.238, 0.146); headPivot.add(browR);
  const mouthO = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3a0d0d, roughness: 0.6 })); mouthO.position.set(0, 0.05, 0.146); mouthO.scale.set(1, 0.6, 0.35); mouthO.visible = false; headPivot.add(mouthO);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 16, Math.PI), dark); smile.rotation.z = Math.PI; smile.position.set(0, 0.068, 0.155); smile.visible = false; headPivot.add(smile);
  const mkLimb = (len, r, mat, endMat, endSize, hand) => {
    const p = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 1.6, 5, 12), mat); m.position.y = -len / 2; p.add(m);
    if (endMat) { const e = new THREE.Mesh(hand ? new THREE.SphereGeometry(0.062, 14, 12) : new RoundedBoxGeometry(endSize[0] + 0.02, endSize[1] + 0.02, endSize[2], 3, 0.045), endMat); e.position.set(0, -len - endSize[1] / 2 + (hand ? 0.035 : 0.02), endSize[2] * 0.25 * (hand ? 0 : 1)); p.add(e); p.userData.end = e; }
    return p;
  };
  const armL = mkLimb(0.6, 0.062, shirt, skin, [0.08, 0.1, 0.08], true); armL.position.set(-0.27, 1.45, 0); g.add(armL);
  const armR = mkLimb(0.6, 0.062, shirt, skin, [0.08, 0.1, 0.08], true); armR.position.set(0.27, 1.45, 0); g.add(armR);
  const legL = mkLimb(0.78, 0.085, pants, shoe, [0.12, 0.09, 0.27]); legL.position.set(-0.1, 0.82, 0); g.add(legL);
  const legR = mkLimb(0.78, 0.085, pants, shoe, [0.12, 0.09, 0.27]); legR.position.set(0.1, 0.82, 0); g.add(legR);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, torso, headPivot, head, armL, armR, legL, legR, mouth, eyeL, eyeR, pL, pR, browL, browR, mouthO, smile, mats, seed: o.seed ?? 1 };
}
// rounded car + crowd geometries shared by the city scenes (polish standard)
export function carGeos(THREE) {
  const body = new RoundedBoxGeometry(1.9, 0.85, 4.5, 5, 0.3).translate(0, 0.72, 0);
  const parts = [new RoundedBoxGeometry(1.66, 0.62, 2.3, 5, 0.24).translate(0, 1.4, -0.2)];
  for (const x of [-0.93, 0.93]) for (const z of [-1.45, 1.45]) parts.push(new THREE.CylinderGeometry(0.37, 0.37, 0.24, 16).rotateZ(Math.PI / 2).translate(x, 0.37, z));
  return { body, top: mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)) };
}
export function pedGeos(THREE) { return { body: new THREE.CapsuleGeometry(0.2, 0.78, 5, 12).translate(0, 0.95, 0), head: new THREE.SphereGeometry(0.165, 16, 12).translate(0, 1.72, 0) }; }

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
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
  const w = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), k = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.22, 0.47, 4, 0.1), m); body.position.y = 0.22; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 16), m); head.position.set(0, 0.38, 0.25); g.add(head);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 10), m); ear.position.set(s * 0.07, 0.5, 0.25); g.add(ear);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), w); e.position.set(s * 0.05, 0.4, 0.36); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), k); p.position.set(s * 0.05, 0.4, 0.385); g.add(p);
    for (const z of [-0.15, 0.15]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.09, 3, 8), m); leg.position.set(s * 0.07, 0.07, z); g.add(leg); } }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.32, 3, 8), m); tail.position.set(0, 0.38, -0.3); tail.rotation.x = -0.6; g.add(tail);
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

// side gauge (left edge — right edge is covered by TikTok/Reels/Shorts buttons)
// p: 0..1 current position; ticks: [{p,label}] ; value: big readout ; label: small header
export function drawGauge(ctx, W, H, o) {
  const x = o.x ?? 84, y0 = o.top ?? H * 0.60, y1 = o.bottom ?? H * 0.25; // y0 = bottom of scale
  const col = o.color ?? '#ffd23f', p = clamp(o.p), bump = o.bump || 0;
  const yy = (q) => lerp(y0, y1, q);
  ctx.save(); ctx.textBaseline = 'middle';
  // track
  ctx.fillStyle = 'rgba(8,10,20,0.55)'; ctx.beginPath(); ctx.roundRect(x - 16, y1 - 16, 32, y0 - y1 + 32, 16); ctx.fill();
  // fill
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, o.colorLow ?? col); g.addColorStop(1, o.colorHigh ?? col);
  ctx.fillStyle = g; ctx.shadowColor = o.glow ?? col; ctx.shadowBlur = 18 + bump * 30;
  ctx.beginPath(); ctx.roundRect(x - 9, yy(p), 18, Math.max(18, y0 - yy(p) + 9), 9); ctx.fill(); ctx.shadowBlur = 0;
  // ticks
  for (const tk of o.ticks || []) {
    const ty = yy(tk.p), passed = p >= tk.p - 1e-3;
    ctx.fillStyle = passed ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.fillRect(x + 20, ty - 2, 16, 4);
    if (tk.label) { ctx.font = `800 ${o.tickSize ?? 36}px ${FONT}`; ctx.textAlign = 'left';
      strokeText(ctx, tk.label, x + 44, ty, passed ? '#ffffff' : 'rgba(255,255,255,0.55)', 'rgba(0,0,0,0.85)', 6); }
  }
  // marker bubble with live value
  const my = yy(p); const s = 1 + bump * 0.22;
  ctx.translate(x, my); ctx.scale(s, s);
  ctx.font = `900 ${o.size ?? 58}px ${FONT}`; const vw = ctx.measureText(o.value).width;
  ctx.font = `800 24px ${FONT}`; const lw = ctx.measureText(o.label || '').width;
  const bw = Math.max(vw, lw) + 76, bh = (o.size ?? 58) + (o.label ? 54 : 30);
  ctx.fillStyle = 'rgba(8,10,20,0.78)'; ctx.strokeStyle = col; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-30, -bh / 2, bw, bh, 22); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.textAlign = 'left';
  if (o.label) { ctx.font = `800 24px ${FONT}`; ctx.fillStyle = col; ctx.fillText(o.label, 24, -bh / 2 + 26); }
  ctx.font = `900 ${o.size ?? 58}px ${FONT}`; ctx.shadowColor = o.glow ?? col; ctx.shadowBlur = 16 + bump * 30;
  ctx.fillStyle = '#fff'; ctx.fillText(o.value, 24, o.label ? 14 : 2);
  ctx.restore();
}

// ---------- character life ----------
// face: brows 'neutral'|'up'|'worried'|'angry'|'squint', eyes 0..1.6 open, mouth 'flat'|'o'|'open'|'smile'|'grit', look [x,y] pupils
export function setFace(P, f = {}) {
  const b = f.brows ?? 'neutral'; const by = { neutral: 0.238, up: 0.262, worried: 0.25, angry: 0.226, squint: 0.222 }[b];
  const br = { neutral: 0, up: 0.08, worried: 0.32, angry: -0.38, squint: -0.15 }[b];
  P.browL.position.y = P.browR.position.y = by; P.browL.rotation.z = -br; P.browR.rotation.z = br;
  const e = (f.eyes ?? 1) * P.eyeL.userData.s; P.eyeL.scale.set(P.eyeL.userData.s, e, P.eyeL.userData.s); P.eyeR.scale.set(P.eyeR.userData.s, e, P.eyeR.userData.s);
  const m = f.mouth ?? 'flat'; P.mouth.visible = m === 'flat' || m === 'grit'; P.mouth.scale.set(m === 'grit' ? 1.4 : 1, m === 'grit' ? 2.2 : 1, 1);
  P.mouthO.visible = m === 'o' || m === 'open'; P.mouthO.scale.set(m === 'o' ? 0.7 : 1.15, m === 'o' ? 0.9 : (f.open ?? 1.3), 0.35);
  P.smile.visible = m === 'smile';
  const lk = f.look ?? [0, 0]; P.pL.position.set(lk[0] * 0.012, lk[1] * 0.012, 0.026); P.pR.position.copy(P.pL.position);
}
// additive idle motion: breathing, blink, head micro-motion, weight shift. call AFTER poses.
export function life(P, t, amt = 1, o = {}) {
  const sd = P.seed * 1.37;
  P.torso.scale.y = 1 + 0.025 * Math.sin(t * 2.3 + sd) * amt;
  P.headPivot.rotation.x += 0.03 * Math.sin(t * 1.7 + sd) * amt;
  P.headPivot.rotation.y += 0.07 * Math.sin(t * 0.9 + sd * 2) * amt;
  P.headPivot.rotation.z += 0.03 * Math.sin(t * 1.3 + sd) * amt;
  P.armL.rotation.z += 0.04 * Math.sin(t * 2.3 + sd) * amt; P.armR.rotation.z -= 0.04 * Math.sin(t * 2.3 + sd) * amt;
  P.group.rotation.z += 0.012 * Math.sin(t * 0.8 + sd) * amt;
  if (!o.noBlink) { const ph = (t + sd * 0.7) % 3.3; if (ph < 0.13) { const k = 1 - Math.sin(ph / 0.13 * Math.PI); P.eyeL.scale.y *= Math.max(0.08, k); P.eyeR.scale.y *= Math.max(0.08, k); } }
  if (!o.noDart) { const dx = Math.sin(Math.floor(t / 1.1 + sd) * 12.9898) * 0.5; P.pL.position.x += dx * 0.006; P.pR.position.x += dx * 0.006; }
}
// speech bubble anchored at screen point (x,y in 1080x1920 space)
export function drawBubble(ctx, x, y, text, age, o = {}) {
  const dur = o.dur ?? 1.6; if (age < 0 || age > dur) return;
  const pop = age < 0.15 ? 0.5 + 0.5 * easeOut(age / 0.15) + 0.1 * Math.sin(age / 0.15 * Math.PI) : 1; const a = clamp((dur - age) / 0.2);
  ctx.save(); ctx.font = `900 ${o.size ?? 52}px ${FONT}`; const w = ctx.measureText(text).width + 56, h = (o.size ?? 52) + 40;
  const cx = clamp(x, w / 2 + 30, 1080 - w / 2 - 30); ctx.globalAlpha = a; ctx.translate(cx, y); ctx.scale(pop, pop);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h - 26, w, h, 26); ctx.moveTo(-14, -28); ctx.lineTo(0, 0); ctx.lineTo(16, -28); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-12, -34, 26, 12);
  ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, -h / 2 - 26);
  ctx.restore();
}
// reference-style small counter on the left: tiny label, big number, sub note
export function drawSideCounter(ctx, W, H, o) {
  const x = o.x ?? 56, y = o.y ?? H * 0.268, bump = o.bump || 0;
  ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `800 34px ${FONT}`; strokeText(ctx, o.label, x, y, o.color ?? '#ffd23f', 'rgba(0,0,0,0.8)', 6);
  ctx.translate(x, y + 86); ctx.scale(1 + bump * 0.15, 1 + bump * 0.15);
  ctx.font = `900 ${o.size ?? 84}px ${FONT}`; ctx.shadowColor = o.glow ?? 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10 + bump * 30;
  strokeText(ctx, o.value, 0, 0, '#ffffff', 'rgba(0,0,0,0.85)', 9); ctx.shadowBlur = 0;
  if (o.note) { ctx.font = `700 italic 40px ${FONT}`; strokeText(ctx, o.note, 2, 58, 'rgba(255,255,255,0.92)', 'rgba(0,0,0,0.8)', 6); }
  ctx.restore();
}

// ---------- realistic-ish suburb seen from above ----------
// lots on a block grid with two-way streets, gable roofs, driveways, lawns, trees, cars, pools.
// returns { group, houses:[{x,z,w,d,h,roofIdx,bodyIdx}], trees:[{x,z,s,idx}], wave(origin, r, width, t) }
export function makeSuburb(THREE, o = {}) {
  const R = rng(o.seed ?? 21); const L = o.lot ?? 22; const nx = o.nx ?? 60, nz0 = o.nz0 ?? -100, nz1 = o.nz1 ?? 30;
  const skip = o.skip ?? (() => false); const detail = o.detail ?? (() => true); const OX = o.ox ?? 0, OZ = o.oz ?? 0;
  const G = new THREE.Group();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const lots = [];
  const BX = 5, BZ = 3; // lots per block
  const streetX = [], streetZ = [];
  for (let gx = -nx; gx <= nx; gx++) { if (gx % BX === 0) { streetX.push(gx * L + OX); continue; }
    for (let gz = nz0; gz <= nz1; gz++) { if (gz % BZ === 0) { if (gx === -nx + 1) streetZ.push(gz * L + OZ); continue; }
      const x = gx * L + OX, z = gz * L + OZ; if (skip(x, z)) continue; lots.push({ x, z, gx, gz, r: R(), r2: R(), r3: R(), det: detail(x, z) }); } }
  // ground: lawns tinted per lot
  const lawn = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), lots.length);
  lots.forEach((l, i) => { m4.compose(v.set(l.x, 0.01, l.z), q.identity(), sc.set(L - 0.6, 1, L - 0.6)); lawn.setMatrixAt(i, m4); lawn.setColorAt(i, col.setHSL(0.24 + l.r3 * 0.06, 0.38 + l.r2 * 0.15, 0.30 + l.r * 0.1)); });
  lawn.receiveShadow = true; G.add(lawn);
  // streets + sidewalks + center dashes
  const roadM = new THREE.MeshStandardMaterial({ color: 0x4d5056, roughness: 0.95 }), walkM = new THREE.MeshStandardMaterial({ color: 0xbdb8ae, roughness: 1 });
  const spanX = (2 * nx + 1) * L, z0 = nz0 * L + OZ, z1 = nz1 * L + OZ, spanZ = z1 - z0 + L;
  for (const x of streetX) { const r = new THREE.Mesh(new THREE.PlaneGeometry(9, spanZ), roadM); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.03, (z0 + z1) / 2); G.add(r);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2, spanZ), walkM); w.rotation.x = -Math.PI / 2; w.position.set(x + s * 5.6, 0.04, (z0 + z1) / 2); G.add(w); } }
  for (const z of streetZ) { const r = new THREE.Mesh(new THREE.PlaneGeometry(spanX, 9), roadM); r.rotation.x = -Math.PI / 2; r.position.set(OX, 0.035, z); G.add(r);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(spanX, 2), walkM); w.rotation.x = -Math.PI / 2; w.position.set(OX, 0.045, z + s * 5.6); G.add(w); } }
  const dashes = []; for (const x of streetX) if (Math.abs(x) < 900) for (let z = z0; z < z1; z += 9) dashes.push([x, z, 0]); for (const z of streetZ) for (let x = -900; x < 900; x += 9) dashes.push([x, z, 1]);
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.25, 3.5), new THREE.MeshBasicMaterial({ color: 0xe8d36a }), dashes.length);
  dashes.forEach(([x, z, r], i) => { m4.compose(v.set(x, 0.06, z), q.setFromEuler(e.set(-Math.PI / 2, 0, r ? Math.PI / 2 : 0)), sc.set(1, 1, 1)); dash.setMatrixAt(i, m4); }); G.add(dash);
  // houses: body + gable roof (triangular prism), facing nearest x-street
  const wallPal = [0xf2efe8, 0xe9dfcc, 0xd9d4cb, 0xc9d6df, 0xe8d2b8, 0xf4e8d0, 0xb8c4b0, 0xd8c3b5, 0xa7b5c2];
  const roofPal = [0x4a4d52, 0x5a3b2e, 0x7a3a2a, 0x3d4650, 0x6b5f55, 0x2f3338, 0x8a4b35];
  const bodyG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const roofG = new THREE.CylinderGeometry(0.62, 0.62, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0.31, 0); // gable prism along x, apex up
  const body = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.85 }), lots.length);
  const roof = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), lots.length);
  const drive = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.06, 1), walkM, lots.length);
  const houses = [];
  lots.forEach((l, i) => { const w = 9 + l.r * 4, d = 8 + l.r2 * 3, h = 3.2 + (l.r3 > 0.7 ? 2.8 : 0) + l.r * 0.5; const rot = l.r3 > 0.5 ? 0 : Math.PI / 2;
    const hx = l.x + (l.r2 - 0.5) * 3, hz = l.z - 2 + (l.r - 0.5) * 2;
    m4.compose(v.set(hx, 0, hz), q.setFromEuler(e.set(0, rot, 0)), sc.set(w, h, d)); body.setMatrixAt(i, m4); body.setColorAt(i, col.set(wallPal[Math.floor(l.r * 97) % wallPal.length]));
    const rh = 2.2 + l.r2 * 1.2;
    m4.compose(v.set(hx, h, hz), q.setFromEuler(e.set(0, rot, 0)), sc.set(w * 1.08, rh * 0.8, d * 0.93)); roof.setMatrixAt(i, m4); roof.setColorAt(i, col.set(roofPal[Math.floor(l.r2 * 89) % roofPal.length]));
    m4.compose(v.set(hx + w * 0.35, 0.02, l.z + L * 0.3), q.identity(), sc.set(3.2, 1, L * 0.42)); drive.setMatrixAt(i, m4);
    houses.push({ x: hx, z: hz, w, d, h, rh, rot, i, col: roofPal[Math.floor(l.r2 * 89) % roofPal.length] }); });
  body.castShadow = roof.castShadow = true; body.receiveShadow = true; G.add(body, roof, drive);
  // trees, cars, pools only on detail lots
  const tl = [], cl = [], pl = [];
  lots.forEach(l => { if (!l.det) return; const n = 1 + Math.floor(l.r * 3.2); for (let k = 0; k < n; k++) { const a = R(), b = R(); tl.push([l.x + (a - 0.5) * L * 0.85, l.z + (b > 0.5 ? 1 : -1) * (6 + R() * 3.5), 1.6 + R() * 1.6, R()]); }
    if (l.r2 > 0.55) cl.push([l.x + 4.5 + (l.r - 0.5), l.z + L * 0.32, Math.PI / 2, R()]); if (l.r3 > 0.86) pl.push([l.x - 4, l.z + 6.5]); });
  for (const x of streetX) for (let z = z0; z < z1; z += 13) { if (Math.abs(x) > 700 || R() > 0.35) continue; cl.push([x + (R() > 0.5 ? 2.2 : -2.2), z + R() * 6, 0, R()]); }
  const crownG = new THREE.IcosahedronGeometry(1, 1).translate(0, 2.4, 0);
  const trees = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), tl.length);
  const tdat = tl.map(([x, z, s, r], i) => { m4.compose(v.set(x, 0, z), q.identity(), sc.set(s, s * (0.9 + r * 0.4), s)); trees.setMatrixAt(i, m4); trees.setColorAt(i, col.setHSL(0.25 + r * 0.08, 0.45, 0.22 + r * 0.12)); return { x, z, s, r, i }; });
  trees.castShadow = true; G.add(trees);
  const carPal = [0xd8342c, 0x2d6fd6, 0xf2f2f2, 0x1d1f22, 0x9aa3ad, 0xe0b84a, 0x3c7a4a];
  const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(4.3, 1.4, 1.9).translate(0, 0.7, 0), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.2 }), cl.length);
  const cdat = cl.map(([x, z, ry, r], i) => { m4.compose(v.set(x, 0, z), q.setFromEuler(e.set(0, ry, 0)), sc.set(1, 1, 1)); cars.setMatrixAt(i, m4); cars.setColorAt(i, col.set(carPal[Math.floor(r * 70) % carPal.length])); return { x, z, ry, r, i }; });
  cars.castShadow = true; G.add(cars);
  const pools = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 0.08, 3), new THREE.MeshStandardMaterial({ color: 0x3fb6e0, roughness: 0.1, metalness: 0.1, emissive: 0x0a3a50 }), Math.max(1, pl.length));
  pl.forEach(([x, z], i) => { m4.compose(v.set(x, 0.06, z), q.identity(), sc.set(1, 1, 1)); pools.setMatrixAt(i, m4); }); G.add(pools);
  // ----- shockwave response: roofs rip off and tumble outward, trees flatten, cars slide -----
  const tmp = new THREE.Vector3();
  function wave(ox, oz, r, width = 60, power = 1) {
    for (const hs of houses) { const dx = hs.x - ox, dz = hs.z - oz, d = Math.hypot(dx, dz); const past = r - d; if (d > r + 2 || d < 1) { if (hs.moved && r <= 0) { hs.moved = false; } continue; }
      const u = clamp(past / width); const age = past / Math.max(1, width) * 1.2; const ux = dx / d, uz = dz / d; const strength = power * clamp(1 - d / (o.waveFade ?? 1400));
      if (strength < 0.15) continue; hs.moved = true;
      const fly = age * 28 * strength, up = Math.sin(clamp(age, 0, 1) * Math.PI) * 10 * strength + age * 4 * strength;
      m4.compose(v.set(hs.x + ux * fly, hs.h + up, hs.z + uz * fly), q.setFromEuler(e.set(age * 2.2 * uz * strength, hs.rot + age * 1.5 * strength, -age * 2.2 * ux * strength)), sc.set(hs.w * 1.08, hs.rh * 0.8, hs.d * 0.93));
      roof.setMatrixAt(hs.i, m4); }
    for (const tr of tdat) { const dx = tr.x - ox, dz = tr.z - oz, d = Math.hypot(dx, dz); if (d > r + 2 || d < 1) continue; const strength = power * clamp(1 - d / (o.waveFade ?? 1400)); const u = clamp((r - d) / 20) * strength;
      m4.compose(v.set(tr.x, 0, tr.z), q.setFromEuler(e.set(dz / d * u * 1.2, 0, -dx / d * u * 1.2)), sc.set(tr.s, tr.s * (0.9 + tr.r * 0.4), tr.s)); trees.setMatrixAt(tr.i, m4); }
    for (const c of cdat) { const dx = c.x - ox, dz = c.z - oz, d = Math.hypot(dx, dz); if (d > r + 2 || d < 1) continue; const strength = power * clamp(1 - d / (o.waveFade ?? 1400)); const age = (r - d) / width;
      const fly = age * 18 * strength; m4.compose(v.set(c.x + dx / d * fly, Math.sin(clamp(age, 0, 1) * Math.PI) * 4 * strength, c.z + dz / d * fly), q.setFromEuler(e.set(age * 3 * strength, c.ry + age * 2 * strength, 0)), sc.set(1, 1, 1)); cars.setMatrixAt(c.i, m4); }
    roof.instanceMatrix.needsUpdate = trees.instanceMatrix.needsUpdate = cars.instanceMatrix.needsUpdate = true;
  }
  // night windows: small glowing quads on house fronts (lit when o.night)
  let winMesh = null;
  if (o.windows) { const wl = []; houses.forEach(hs => { const n = hs.h > 5 ? 4 : 2; for (let k = 0; k < n; k++) { if (R() < 0.3) continue; const fx = (k % 2 ? 0.25 : -0.25) * hs.w, fy = (k < 2 ? 0.45 : 0.75) * hs.h; wl.push([hs, fx, fy, R()]); } });
    winMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), wl.length);
    wl.forEach(([hs, fx, fy, r], i) => { const c = Math.cos(hs.rot), sn = Math.sin(hs.rot); const off = hs.d / 2 + 0.03; const x = hs.x + fx * c + off * sn, z = hs.z - fx * sn + off * c;
      m4.compose(v.set(x, fy, z), q.setFromEuler(e.set(0, hs.rot, 0)), sc.set(1, 1, 1)); winMesh.setMatrixAt(i, m4); winMesh.setColorAt(i, col.setHSL(0.1 + r * 0.04, 0.8, 0.55 + r * 0.2)); });
    G.add(winMesh); }
  // heat front: lawns brown and trees scorch inside radius r (call every frame with growing r)
  const lawnBase = lots.map(l => [0.24 + l.r3 * 0.06, 0.38 + l.r2 * 0.15, 0.30 + l.r * 0.1]);
  function tint(ox, oz, r, width = 60) { lots.forEach((l, i) => { const d = Math.hypot(l.x - ox, l.z - oz); const u = clamp((r - d) / width); const b = lawnBase[i];
      col.setHSL(lerp(b[0], 0.08, u), lerp(b[1], 0.45, u), lerp(b[2], 0.22, u)); lawn.setColorAt(i, col); }); lawn.instanceColor.needsUpdate = true;
    tdat.forEach(tr => { const d = Math.hypot(tr.x - ox, tr.z - oz); const u = clamp((r - d) / width); col.setHSL(lerp(0.25 + tr.r * 0.08, 0.05, u), lerp(0.45, 0.7, u), lerp(0.22 + tr.r * 0.12, 0.3, u)); trees.setColorAt(tr.i, col); }); trees.instanceColor.needsUpdate = true; }
  return { group: G, houses, trees: tdat, cars: cdat, wave, tint, winMesh, streetX, streetZ };
}

// ---------- expanding shockwave visual: dust wall ring + translucent shell + ground scorch ring ----------
export function softTex(THREE, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); return t;
}
export function makeShockwave(THREE, o = {}) {
  const G = new THREE.Group(); const R = rng(o.seed ?? 5); const n = o.n ?? 900;
  // dust wall: sprites on a ring, billowing
  const pos = new Float32Array(n * 3), seeds = Array.from({ length: n }, () => [R() * Math.PI * 2, R(), R(), R()]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({ map: softTex(THREE), color: o.dustColor ?? 0xd8cbb5, size: o.size ?? 26, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
  dust.frustumCulled = false; G.add(dust);
  // translucent expanding shell with bright rim
  const shellMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: 0 }, tint: { value: new THREE.Color(o.color ?? 0xdff1ff) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float op; uniform vec3 tint; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0-abs(dot(vN,vV)), 3.0); gl_FragColor = vec4(tint*(0.15+1.6*f), op*(0.08+0.9*f)); }' });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, o.hemi === false ? Math.PI : Math.PI / 2), shellMat); G.add(shell);
  // ground ring flash
  const ringMat = new THREE.MeshBasicMaterial({ map: softTex(THREE, 128), color: o.ringColor ?? 0xfff3d6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 96), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; G.add(ring);
  G.visible = false;
  // r: current radius, age 0..1 life fraction, h: dust height scale
  G.userData.set = (r, life, h = 1) => {
    G.visible = life > 0 && life < 1; if (!G.visible) return;
    const fade = 1 - life;
    for (let i = 0; i < n; i++) { const [a, s1, s2, s3] = seeds[i]; const rr = r * (0.9 + s1 * 0.14) - s2 * r * 0.08 * life; const y = (s3 ** 1.6) * r * 0.16 * h * (0.4 + life);
      pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * rr; }
    geo.attributes.position.needsUpdate = true; dust.material.opacity = (o.opacity ?? 0.9) * Math.min(1, fade * 1.6); dust.material.size = (o.size ?? 26) * (0.6 + r / (o.sizeR ?? 300));
    shell.scale.setScalar(r); shellMat.uniforms.op.value = 0.9 * fade ** 1.5;
    ring.scale.setScalar(r * 1.02); ringMat.opacity = 0.8 * fade;
  };
  return G;
}

// ---------- title that types in word by word, holds, then slides out (owner rule Nov 9) ----------
export function drawTitleTimed(ctx, W, H, lines, t, accent = '#ffd23f', o = {}) {
  const t0 = o.start ?? 0.6, outAt = o.outAt ?? 4.3, outDur = 0.45, wps = o.wps ?? 9; if (t < t0 || t > outAt + outDur) return;
  const words = []; lines.forEach((ln, li) => ln.text.split(' ').forEach(w => words.push({ w, li, accent: ln.accent, size: ln.size })));
  const shown = Math.floor((t - t0) * wps) + 1; const ou = clamp((t - outAt) / outDur);
  ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 1 - ou; ctx.translate(0, -ou * 160);
  const y0 = H * (o.y ?? 0.155);
  lines.forEach((ln, li) => { const s = fitText(ctx, ln.text, W * 0.88, ln.size || 84); const full = ctx.measureText(ln.text).width; let x = (W - full) / 2; const y = y0 + li * s * 1.08;
    const ws = words.filter(w => w.li === li); const before = words.indexOf(ws[0]);
    ws.forEach((w, k) => { const idx = before + k; const tw = ctx.measureText(w.w + ' ').width; if (idx < shown) { const age = (t - t0) - idx / wps; const pop = age < 0.12 ? 0.7 + 0.3 * easeOut(age / 0.12) : 1;
        ctx.save(); ctx.translate(x + tw / 2, y); ctx.scale(pop, pop); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.font = `900 ${s}px ${FONT}`;
        strokeText(ctx, w.w, -tw / 2, 0, ln.accent ? accent : '#ffffff', 'rgba(0,0,0,0.92)', s * 0.16); ctx.restore(); } x += tw; }); });
  ctx.restore();
}
// big punch word for the cold open
export function drawPunch(ctx, W, H, text, age, o = {}) { const dur = o.dur ?? 0.6; if (age < 0 || age > dur) return; const s = o.size ?? 190;
  const pop = age < 0.1 ? 1.4 - 0.4 * easeOut(age / 0.1) : 1; ctx.save(); ctx.globalAlpha = clamp((dur - age) / 0.1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.translate(W / 2, H * (o.y ?? 0.45)); ctx.rotate(-0.06); ctx.scale(pop, pop);
  ctx.font = `900 ${s}px ${FONT}`; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; strokeText(ctx, text, 0, 0, o.color ?? '#ffffff', '#000', s * 0.14); ctx.restore(); }
// small name tag above a character (first appearance only)
export function drawTag(ctx, x, y, text, age, o = {}) { const dur = o.dur ?? 2.2; if (age < 0 || age > dur) return; const a = clamp(Math.min(age / 0.15, (dur - age) / 0.3));
  ctx.save(); ctx.globalAlpha = a; ctx.font = `900 34px ${FONT}`; const w = ctx.measureText(text).width + 36; const cx = clamp(x, w / 2 + 20, 1060 - w / 2);
  ctx.fillStyle = o.bg ?? '#ffd23f'; ctx.beginPath(); ctx.roundRect(cx - w / 2, y - 26, w, 52, 14); ctx.fill(); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, cx, y + 1); ctx.restore(); }

// ---------- cheap instanced crowd: bystanders walk in, stop, raise glowing phones ----------
export function makeCrowd(THREE, n, o = {}) {
  const R = rng(o.seed ?? 31); const G = new THREE.Group();
  const bodyG = new THREE.CylinderGeometry(0.2, 0.17, 1.15, 7).translate(0, 0.95, 0), headG = new THREE.IcosahedronGeometry(0.15, 1).translate(0, 1.7, 0), legG = new THREE.BoxGeometry(0.28, 0.42, 0.18).translate(0, 0.21, 0);
  const body = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), n);
  const head = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), n);
  const legs = new THREE.InstancedMesh(legG, new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 }), n);
  const phone = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: 0xcfe6ff }), n);
  const shirts = [0xc94f4f, 0x3a7bd5, 0xf2c14e, 0x4caf7a, 0x8e5bb5, 0xeeeeee, 0x333333, 0xf28c38, 0x2bb3b1], skins = [0xf1c6a5, 0xd8a47e, 0xb5835a, 0x8d5a3b, 0x5c3a24];
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
  const P = []; for (let i = 0; i < n; i++) { const tgt = o.target(R, i), src = o.source ? o.source(R, i, tgt) : [tgt[0] + (R() - 0.5) * 30, tgt[1] + (R() - 0.5) * 30];
    P.push({ tgt, src, arrive: (o.arrive ? o.arrive(R, i) : R() * 10), speed: 1.3 + R() * 0.6, sc: 0.85 + R() * 0.25, ph: R() * 6.28 });
    body.setColorAt(i, col.set(shirts[Math.floor(R() * shirts.length)])); head.setColorAt(i, col.set(skins[Math.floor(R() * skins.length)])); }
  G.add(body, head, legs, phone); body.castShadow = true; [body, head, legs, phone].forEach(m => m.frustumCulled = false);
  G.userData.update = (t, lookAt = [0, 0]) => {
    for (let i = 0; i < n; i++) { const p = P[i]; const d = Math.hypot(p.tgt[0] - p.src[0], p.tgt[1] - p.src[1]); const walkT = d / p.speed; const t0 = p.arrive - walkT; let u = clamp((t - t0) / walkT);
      const x = lerp(p.src[0], p.tgt[0], u), z = lerp(p.src[1], p.tgt[1], u); const walking = u > 0 && u < 1; const vis = t > t0 - 0.01 || (o.alwaysVisible);
      const ry = walking ? Math.atan2(p.tgt[0] - p.src[0], p.tgt[1] - p.src[1]) : Math.atan2(lookAt[0] - x, lookAt[1] - z);
      const bob = walking ? Math.abs(Math.sin(t * 9 + p.ph)) * 0.06 : 0.01 * Math.sin(t * 2 + p.ph);
      q.setFromEuler(e.set(0, ry, walking ? 0 : 0.03 * Math.sin(t + p.ph))); const sc = vis ? p.sc : 0.0001;
      m4.compose(v.set(x, bob, z), q, s1.set(sc, sc, sc)); body.setMatrixAt(i, m4); head.setMatrixAt(i, m4); legs.setMatrixAt(i, m4);
      const film = !walking && u >= 1 && (o.film ? o.film(t, i) : true);
      if (film) { v.set(x + Math.sin(ry) * 0.32 * sc, 1.55 * sc + bob, z + Math.cos(ry) * 0.32 * sc); m4.compose(v, q, s1.set(sc, sc, sc)); } else m4.compose(v.set(0, -10, 0), q, s1.set(0.0001, 0.0001, 0.0001));
      phone.setMatrixAt(i, m4); }
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = legs.instanceMatrix.needsUpdate = phone.instanceMatrix.needsUpdate = true;
  };
  return G;
}
// cars that actually drive along a straight road (x axis), stop when told
export function makeTraffic(THREE, n, o = {}) {
  const R = rng(o.seed ?? 41); const G = new THREE.Group(); const cars = [];
  const pal = [0xd8342c, 0x2d6fd6, 0xf2f2f2, 0x1d1f22, 0x9aa3ad, 0xe0b84a, 0x3c7a4a];
  for (let i = 0; i < n; i++) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: pal[i % pal.length], roughness: 0.35, metalness: 0.2, flatShading: true });
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.8), m); b.position.y = 0.65; g.add(b); const tp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.6), m); tp.position.set(-0.2, 1.3, 0); g.add(tp);
    const hl = new THREE.MeshBasicMaterial({ color: 0xfff2c4 }); for (const s of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.3), hl); l.position.set(2.11, 0.75, s); g.add(l); }
    const tl = new THREE.MeshBasicMaterial({ color: 0xff2a2a }); for (const s of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.3), tl); l.position.set(-2.11, 0.75, s); g.add(l); }
    g.traverse(x => { if (x.isMesh) x.castShadow = true; }); G.add(g);
    const dir = i % 2 ? 1 : -1; cars.push({ g, dir, lane: o.z + (dir > 0 ? -1.8 : 1.8), x0: (R() - 0.5) * (o.span ?? 160), v: 9 + R() * 5 }); }
  // stopAt(t): time when cars brake to a halt (people get out to look)
  G.userData.update = (t, stopAt = 1e9) => { const span = o.span ?? 160; for (const c of cars) { const tt = t < stopAt ? t : stopAt + Math.min(t - stopAt, 1.2) * (1 - Math.min(t - stopAt, 1.2) / 2.4);
      let x = c.x0 + c.dir * c.v * tt; x = ((x + span / 2) % span + span) % span - span / 2; c.g.position.set(x, 0, c.lane); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI; } };
  return G;
}
