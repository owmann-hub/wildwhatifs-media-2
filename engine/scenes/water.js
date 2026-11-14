import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, makeSkyDome, makeCat, softTex, setFace, life, drawSideCounter, drawTitleTimed, RoundedBoxGeometry, carGeos, pedGeos, stars } from './lib.js';
import { makeStreetLife } from './streetlife.js';

// Nov 15 episode — format_v5 structure (countdown / 6x slow-motion / end card, as the approved sun prototype),
// with its own place, stake, consequences, lines and transformation:
// PLACE: the East River esplanade in Manhattan, late morning (not the hot-dog corner, not the bakery cafe).
// STAKE: you are about to break your stone-skipping record (best: four). The stone never touches water; paid off when
//        the next stone skips five times after the water returns.
// TRANSFORMATION: the blue drains out of the world — the river empties into a 12 m mud canyon, boats and fish drop,
//        every cloud is gone, the harbour becomes a valley (Liberty on a hill), and from space the planet is brown.
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) { const X = Math.floor(x), Z = Math.floor(z), fx = x - X, fz = z - Z, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash2(X, Z), hash2(X + 1, Z), sx), lerp(hash2(X, Z + 1), hash2(X + 1, Z + 1), sx), sz); }
function fbm(x, z) { let n = 0, a = 0.5, f = 1; for (let o = 0; o < 4; o++) { n += vnoise(x * f + 17 * o, z * f - 9 * o) * a; a *= 0.5; f *= 2.03; } return n / 0.9375; }

const EV = 7.0, SLOW = 6, RET = EV + 5 * SLOW, CARDT = 45.6, TOT = 53.6;
const WL = -1.5, G = 9.81;
const HX = 33.0, HZ = 0;                  // hero at the esplanade railing
const LX = -1250, LZ = -3100;             // Liberty Island
const GX = 180, GZ = -1750;               // Governors Island
const BZ = -650;                          // Brooklyn Bridge
function bedY(x, z) {
  let d;
  if (x > 34 && x < 460 && z > -1250) { const u = (x - 34) / 426; d = 9.6 + 4.4 * Math.pow(Math.sin(Math.PI * u), 0.5); }
  else { d = 11 + 5 * fbm(x * 0.0015, z * 0.0015); if (z < -4300) d += (-z - 4300) * 0.016; if (x < -1000 && x > -1500 && z > -2600) d = 13 + 2 * fbm(x * 0.01, z * 0.01); }
  d += 1.6 * (fbm(x * 0.035, z * 0.035) - 0.5) + 0.12 * Math.sin(x * 1.3 + z * 0.4);
  let y = WL - d;
  const r1 = Math.hypot(x - LX, z - LZ); if (r1 < 300) y = lerp(y, 2.0, smooth(300, 95, r1));
  const r2 = Math.hypot((x - GX) * 0.8, z - GZ); if (r2 < 380) y = lerp(y, 1.6, smooth(380, 230, r2));
  return y;
}

export async function create({ THREE, W, H }) {
  const R = rng(415);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e5);
  A.fog = new THREE.FogExp2(0xcfdbe6, 0.00012);
  const hemi = new THREE.HemisphereLight(0xdfeaff, 0x6f6450, 0.95); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.35); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; A.add(sun, sun.target);
  const SUN = new THREE.Vector3(0.62, 0.56, -0.42).normalize();
  function setShadow(cx, cz, size) { sun.target.position.set(cx, 0, cz); sun.position.set(cx + SUN.x * 1500, SUN.y * 1500, cz + SUN.z * 1500); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 10; c.far = 3500; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 200 ? 2 : 0.05; }
  const sky = makeSkyDome(THREE, 0x4a86d4, 0xe2ecf4, [SUN.x, SUN.y, SUN.z]); A.add(sky);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3();

  // ---------------- the river bed / harbour floor (hidden under the water until it goes) ----------------
  { const N = 420, S = 9000, CX = 80, CZ = -10, P = 2.4;
    const geo = new THREE.PlaneGeometry(2, 2, N, N).rotateX(-Math.PI / 2); const pa = geo.attributes.position; const cols = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) { const ux = pa.getX(i), uz = pa.getZ(i);
      const x = CX + S * Math.sign(ux) * Math.pow(Math.abs(ux), P), z = CZ + S * 1.3 * Math.sign(uz) * Math.pow(Math.abs(uz), P); const y = bedY(x, z); pa.setXYZ(i, x, y, z);
      const n = fbm(x * 0.05, z * 0.05), n2 = fbm(x * 0.4, z * 0.4); let r, g, b;
      if (y > WL + 0.6) { const k = smooth(WL + 0.6, WL + 2.5, y); r = lerp(0.5, 0.3, k); g = lerp(0.44, 0.48, k); b = lerp(0.33, 0.22, k); }
      else { const deep = clamp((WL - 11 - y) / 40); r = lerp(0.42, 0.22, n) * (1 - 0.35 * deep); g = lerp(0.35, 0.2, n) * (1 - 0.3 * deep); b = lerp(0.26, 0.17, n) * (1 - 0.2 * deep);
        if (n2 > 0.62) { r += 0.1; g += 0.09; b += 0.06; } if (n < 0.3) { g += 0.05; r -= 0.02; } }   // pale silt, green slime patches
      cols.set([Math.pow(Math.max(r, 0.02), 2.0) * 1.15, Math.pow(Math.max(g, 0.02), 2.0) * 1.15, Math.pow(Math.max(b, 0.02), 2.0) * 1.15], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const bed = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.15 })); bed.receiveShadow = true; bed.castShadow = false; bed.frustumCulled = false; A.add(bed); }
  // rocks and lost things on the river bed near the hero
  const rockM = new THREE.MeshStandardMaterial({ color: 0x5d564c, roughness: 0.8 });
  for (let k = 0; k < 90; k++) { const x = 36 + R() * 120, z = -60 + R() * 110, s = 0.3 + R() * R() * 1.6; const rk = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), rockM); rk.position.set(x, bedY(x, z) + s * 0.3, z); rk.scale.y = 0.6; rk.rotation.set(R() * 3, R() * 3, 0); rk.castShadow = rk.receiveShadow = true; A.add(rk); }
  const tyreM = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.9 });
  for (const [x, z, ry] of [[44, 6, 0.3], [61, -9, 1.2], [70, 14, 2.0], [49, -18, 0.8]]) { const ty = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 12, 24), tyreM); ty.position.set(x, bedY(x, z) + 0.12, z); ty.rotation.set(Math.PI / 2 + 0.2, 0, ry); ty.castShadow = true; A.add(ty); }
  { // an old anchor and a sunken bicycle
    const am = new THREE.MeshStandardMaterial({ color: 0x5a3b28, roughness: 0.7, metalness: 0.5 }); const an = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.8, 10), am); sh.position.y = 0.9; an.add(sh); const cr = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 10, 20, Math.PI), am); cr.rotation.z = Math.PI; cr.position.y = 0.55; an.add(cr);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), am); st.rotation.z = Math.PI / 2; st.position.y = 1.65; an.add(st); an.rotation.set(1.35, 0.4, 0); an.position.set(58, bedY(58, 9) + 0.15, 9); an.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(an);
    const bm = new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.6, metalness: 0.4 }); const bk = new THREE.Group();
    for (const z of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 8, 20), tyreM); w.rotation.y = Math.PI / 2; w.position.set(0, 0.35, z); bk.add(w); }
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), bm); f.rotation.x = Math.PI / 2 - 0.25; f.position.set(0, 0.62, 0); bk.add(f);
    bk.rotation.set(0, 0.7, Math.PI / 2 - 0.15); bk.position.set(47.5, bedY(47.5, -6) + 0.1, -6); bk.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(bk); }

  // ---------------- the water: one sheet that blinks out (noise dissolve) and back ----------------
  const UW = { uGone: { value: 0 } };
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f5f78, roughness: 0.16, metalness: 0.35 });
  waterMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, UW);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWw;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vWw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWw; uniform float uGone;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float nn = 0.55 * vn(vWw.xz * 0.35) + 0.3 * vn(vWw.xz * 1.7) + 0.15 * vn(vWw.xz * 6.0);
      if (nn < uGone * 1.1 - 0.05) discard;
      float edge = smoothstep(uGone * 1.1 + 0.04, uGone * 1.1 - 0.05, nn) * step(0.001, uGone);
      float wv = 0.5 + 0.5 * sin(vWw.x * 0.9 + vWw.z * 0.4) * sin(vWw.z * 0.7 - vWw.x * 0.2);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.25, wv * 0.35);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.97, 1.0), edge);`); };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = WL; A.add(water);

  // ---------------- land: Manhattan, Brooklyn, New Jersey, Governors Island ----------------
  const landM = new THREE.MeshStandardMaterial({ color: 0x45484c, roughness: 0.95 });
  const wallM = new THREE.MeshStandardMaterial({ color: 0x55524c, roughness: 0.9 });
  const slabs = [[-1000, 34, -930, 3200], [460, 6000, -1300, 6000], [-12000, -1500, -14000, 9000]];
  for (const [x0, x1, z0, z1] of slabs) { const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 24, z1 - z0), landM); s.position.set((x0 + x1) / 2, -12, (z0 + z1) / 2); s.receiveShadow = true; A.add(s); }
  // the river wall below the esplanade: stone blocks with a dark wet band and green slime under the waterline
  { const wl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 15, 900), wallM); wl.position.set(33.9, -7.4, 0); wl.receiveShadow = wl.castShadow = true; A.add(wl);
    const slime = new THREE.Mesh(new THREE.BoxGeometry(0.62, 12.5, 900), new THREE.MeshStandardMaterial({ color: 0x2f3a2a, roughness: 0.45, metalness: 0.1 })); slime.position.set(33.91, WL - 6.6, 0); A.add(slime);
    const joints = []; for (let y = -14; y < 0; y += 0.9) for (let z = -120; z < 120; z += 2.4) joints.push([y, z + (Math.round(y / 0.9) % 2) * 1.2]);
    const jm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.64, 0.05, 2.3), new THREE.MeshStandardMaterial({ color: 0x24261f, roughness: 1 }), joints.length);
    joints.forEach(([y, z], k) => { m4.compose(v.set(33.9, y, z), q.identity(), sc.set(1, 1, 1)); jm.setMatrixAt(k, m4); }); jm.frustumCulled = false; A.add(jm);
    // barnacle line / pilings of an old pier
    const pm = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.9 });
    for (let k = 0; k < 14; k++) { const x = 36 + (k % 2) * 3.2, z = -38 - Math.floor(k / 2) * 3.4; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 16, 12), pm); p.position.set(x, -6.5, z); p.castShadow = true; A.add(p); }
    const pier = new THREE.Mesh(new RoundedBoxGeometry(5.0, 0.4, 26, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 0.85 })); pier.position.set(37.6, 1.6, -48); pier.castShadow = pier.receiveShadow = true; A.add(pier); }
  const gov = new THREE.Mesh(new THREE.CylinderGeometry(330, 360, 3.2, 40), new THREE.MeshStandardMaterial({ color: 0x5d7f48, roughness: 1 })); gov.scale.set(1.25, 1, 1); gov.position.set(GX, 0.0, GZ); gov.receiveShadow = true; A.add(gov); gov.material.color.setHex(0x4a6e3a);
  { const nT = 160; const tr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1).translate(0, 1.2, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), nT);
    for (let k = 0; k < nT; k++) { const a = R() * 6.28, r = Math.sqrt(R()) * 300; const s2 = 5 + R() * 5; m4.compose(v.set(GX + Math.cos(a) * r * 1.2, 1.6, GZ + Math.sin(a) * r * 0.9), q.identity(), sc.set(s2, s2 * 1.2, s2)); tr.setMatrixAt(k, m4); tr.setColorAt(k, col.setHSL(0.26 + R() * 0.06, 0.45, 0.22 + R() * 0.1)); }
    tr.castShadow = true; tr.frustumCulled = false; A.add(tr); }

  // city blocks (window shader as the locked New-York look)
  const U = { uNight: { value: 0 } };
  const bMat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 });
  bMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vOn = normal; vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\n vWp = (modelMatrix * wp4).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vOn; uniform float uNight;').replace('#include <color_fragment>', `#include <color_fragment>
      if (abs(vOn.y) < 0.5) { float uu = abs(vOn.x) > 0.5 ? vWp.z : vWp.x; vec2 c = vec2(uu / 3.2, vWp.y / 3.6); vec2 f = fract(c); vec2 id = floor(c);
        float hh = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
        float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.8);
        vec3 glass = mix(vec3(0.1, 0.14, 0.2), vec3(0.62, 0.72, 0.84), hh * hh);
        if (vWp.y < 4.8) { float fy = vWp.y / 4.8; win = step(0.06, f.x) * step(f.x, 0.94) * step(0.12, fy) * step(fy, 0.78); glass = mix(vec3(1.0, 0.9, 0.62), vec3(0.18, 0.22, 0.28), step(0.55, hh)); }
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, win); }`); };
  const pal = [0x9a5b46, 0xb08968, 0xc9b79c, 0x8d8f94, 0xa39a8c, 0xd9d2c5, 0x7c4a3a, 0xb7a58f], glassPal = [0x4a5f74, 0x6f8fa8, 0x55707f, 0x8aa6b8, 0x3f4d5c];
  const blds = [], walks = [], tanks = [];
  for (let i = -9; i <= -1; i++) for (let j = -15; j <= 26; j++) {
    const bx0 = 100 * i + 20, bz0 = 60 * j + 14, cx = bx0 + 40, cz = bz0 + 23; walks.push([cx, cz]);
    const fin = cz < -380, n = R() < 0.45 ? 2 : 3; let x = bx0 + 5; const wTot = 70 - (n - 1);
    const cuts = []; for (let k = 0; k < n; k++) cuts.push(0.7 + R()); const sum = cuts.reduce((a, b) => a + b, 0);
    for (let k = 0; k < n; k++) { const w = wTot * cuts[k] / sum, r = R();
      let h = fin ? 60 + 220 * r * r : i === -1 ? 14 + 22 * r : 24 + 70 * r * r + (i > -3 ? 0 : 30 * r);
      if (i === -5 && j === -13 && k === 0) h = 541;            // the tallest tower in the skyline
      const glassy = h > 110 && R() < 0.75; const c = glassy ? glassPal[Math.floor(R() * glassPal.length)] : pal[Math.floor(R() * pal.length)];
      const d = 36 - (R() < 0.3 ? 6 : 0); blds.push([x + w / 2, 0.15, cz, w, h, d, c]);
      if (h > 150) blds.push([x + w / 2, 0.15 + h, cz, w * 0.62, h * (h > 500 ? 0.06 : 0.2), d * 0.62, c]);
      else if (h < 80 && R() < 0.5) tanks.push([x + w / 2 + (R() - 0.5) * w * 0.4, 0.15 + h, cz + (R() - 0.5) * 14]);
      x += w + 1; } }
  // Brooklyn: low brick + a few downtown towers; New Jersey skyline across the Hudson
  for (let k = 0; k < 900; k++) { const bx = 480 + R() * R() * 2600, bz = -1250 + R() * 4200; const r = R(); const down = bz < -500 && bx < 1400;
    blds.push([bx, 0, bz, 26 + R() * 34, (down ? 30 + 120 * r * r : 10 + 28 * r) + (R() < 0.03 ? 60 : 0), 24 + R() * 30, pal[Math.floor(R() * pal.length)]]); }
  for (let k = 0; k < 500; k++) { const bx = -1530 - R() * R() * 3000, bz = -4000 + R() * 9000; const r = R(); blds.push([bx, 0, bz, 30 + R() * 40, 12 + 50 * r * r * r + (bz > -1800 && bz < -200 && R() < 0.2 ? 120 * R() : 0), 30 + R() * 30, R() < 0.3 ? glassPal[Math.floor(R() * 5)] : pal[Math.floor(R() * pal.length)]]); }
  const boxG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const bMesh = new THREE.InstancedMesh(boxG, bMat, blds.length);
  blds.forEach(([x, y, z, w, h, d, c], k) => { m4.compose(v.set(x, y, z), q.identity(), sc.set(w, h, d)); bMesh.setMatrixAt(k, m4); bMesh.setColorAt(k, col.set(c)); });
  bMesh.castShadow = bMesh.receiveShadow = true; bMesh.frustumCulled = false; A.add(bMesh);
  { const wMesh = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0xbfbbb0, roughness: 0.95 }), walks.length);
    walks.forEach(([x, z], k) => { m4.compose(v.set(x, 0, z), q.identity(), sc.set(80, 0.15, 46)); wMesh.setMatrixAt(k, m4); }); wMesh.receiveShadow = true; wMesh.frustumCulled = false; A.add(wMesh);
    const tkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.6, 1.6, 3.4, 12).translate(0, 3.2, 0), new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.9 }), Math.max(1, tanks.length));
    tanks.forEach(([x, y, z], k) => { m4.compose(v.set(x, y, z), q.identity(), sc.set(1, 1, 1)); tkM.setMatrixAt(k, m4); }); tkM.castShadow = true; tkM.frustumCulled = false; A.add(tkM); }

  // ---------------- the Brooklyn Bridge (towers 84 m above the water; labelled during the rise) ----------------
  const bstoneM = new THREE.MeshStandardMaterial({ color: 0xb5a58c, roughness: 0.85 });
  const cableM = new THREE.MeshStandardMaterial({ color: 0x8c8678, roughness: 0.6, metalness: 0.3 });
  const TW = [70, 424], TOP = WL + 84, DECK = WL + 38.7;
  for (const x of TW) { const by = bedY(x, BZ); const tw = new THREE.Mesh(new RoundedBoxGeometry(14, TOP - by, 34, 3, 0.6), bstoneM); tw.position.set(x, (TOP + by) / 2, BZ); tw.castShadow = tw.receiveShadow = true; A.add(tw);
    for (const z of [-8, 8]) { const ar = new THREE.Mesh(new THREE.BoxGeometry(14.4, 26, 6), new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 })); ar.position.set(x, DECK + 12, BZ + z); A.add(ar);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 14.5, 3, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 })); cap.rotation.z = Math.PI / 2; cap.position.set(x, DECK + 25, BZ + z); A.add(cap); }
    const foot = new THREE.Mesh(new RoundedBoxGeometry(18, 3, 40, 3, 0.8), new THREE.MeshStandardMaterial({ color: 0x5b5045, roughness: 0.6 })); foot.position.set(x, by + 1.5, BZ); A.add(foot); }
  { const deck = new THREE.Mesh(new RoundedBoxGeometry(900, 3, 26, 2, 0.5), new THREE.MeshStandardMaterial({ color: 0x6f665c, roughness: 0.8 })); deck.position.set(247, DECK, BZ); deck.castShadow = true; A.add(deck);
    const sus = [];
    for (const z of [-11, 11]) { const pts = []; const f = (x) => { if (x < TW[0]) return lerp(DECK + 2, TOP - 2, (x + 160) / (TW[0] + 160)); if (x > TW[1]) return lerp(TOP - 2, DECK + 2, (x - TW[1]) / 220); const u = (x - TW[0]) / (TW[1] - TW[0]); return DECK + 2 + (TOP - DECK - 4) * Math.pow(2 * u - 1, 2); };
      for (let x = -160; x <= TW[1] + 220; x += 12) pts.push(new THREE.Vector3(x, f(x), BZ + z));
      const cv = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.55, 8), cableM); cv.castShadow = true; A.add(cv);
      for (let x = -150; x <= TW[1] + 210; x += 6) sus.push(x, f(x), BZ + z, x, DECK + 1.5, BZ + z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sus, 3)); const sl = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0x6e695f })); sl.frustumCulled = false; A.add(sl); }

  // ---------------- the Statue of Liberty on its island (93 m ground to torch; labelled) ----------------
  { const S = new THREE.Group(); S.position.set(LX, 2.0, LZ);
    const fort = new THREE.Mesh(new THREE.CylinderGeometry(44, 48, 10, 11), new THREE.MeshStandardMaterial({ color: 0xa79c86, roughness: 0.9 })); fort.position.y = 5; S.add(fort);
    const ped = new THREE.Mesh(new RoundedBoxGeometry(19, 37, 19, 3, 1), new THREE.MeshStandardMaterial({ color: 0xc2b59c, roughness: 0.85 })); ped.position.y = 10 + 18.5; S.add(ped);
    const cu = new THREE.MeshStandardMaterial({ color: 0x6fae98, roughness: 0.55, metalness: 0.15 });
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 6.2, 30, 20), cu); robe.position.y = 47 + 15; S.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 16), cu); head.position.y = 47 + 32.4; S.add(head);
    for (let k = 0; k < 7; k++) { const a = -1.2 + k * 0.4; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.2, 8), cu); sp.position.set(Math.sin(a) * 2.6, 47 + 34.6, Math.cos(a) * 1.2); sp.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.9); S.add(sp); }
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 11, 6, 12), cu); arm.position.set(3.0, 47 + 34, 0); arm.rotation.z = -0.12; S.add(arm);
    const torch = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.6, 3, 12), cu); torch.position.set(3.7, 47 + 40.4, 0); S.add(torch);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 12), new THREE.MeshStandardMaterial({ color: 0xf1c050, roughness: 0.3, metalness: 0.7, emissive: 0x6a4a10 })); flame.scale.y = 1.5; flame.position.set(3.75, 93 - 2 - 1.3, 0); S.add(flame);
    const tab = new THREE.Mesh(new RoundedBoxGeometry(1.0, 6, 3.6, 2, 0.2), cu); tab.position.set(-3.8, 47 + 22, 1.2); tab.rotation.z = 0.3; S.add(tab);
    S.rotation.y = 0.9; S.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); A.add(S); }

  // ---------------- clouds (they are water too: they evaporate into nothing at the event) ----------------
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.96, emissive: 0x9aa6b4, emissiveIntensity: 0.35, depthWrite: false });
  const clouds = []; { const blobG = new THREE.IcosahedronGeometry(1, 3);
    for (let k = 0; k < 22; k++) { const g = new THREE.Group(); const a = k < 12 ? (R() - 0.5) * 1.6 : k < 17 ? Math.PI + (R() - 0.5) * 1.6 : -Math.PI / 2 + (R() - 0.5) * 1.2; const r = 900 + R() * 2200; g.position.set(HX + Math.cos(a) * r, 380 + R() * 380, Math.sin(a) * r - (k >= 10 ? 1500 : 0));
      const nb = 6 + Math.floor(R() * 6); for (let b = 0; b < nb; b++) { const m = new THREE.Mesh(blobG, cloudMat); const s = 40 + R() * 70; m.scale.set(s * 1.3, s * 0.75, s); m.position.set((R() - 0.5) * 260, (R() - 0.3) * 40, (R() - 0.5) * 120); g.add(m); }
      g.userData.ph = R(); A.add(g); clouds.push(g); } }

  // ---------------- street level: avenue (x 0..20) + the esplanade (x 20..34) ----------------
  const dark = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.4 });
  { const road = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 4000), new THREE.MeshStandardMaterial({ color: 0x34363b, roughness: 0.9 })); road.position.set(10, 0.0, 600); road.receiveShadow = true; A.add(road);
    const espl = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 4000), new THREE.MeshStandardMaterial({ color: 0xcbbfa8, roughness: 0.9 })); espl.position.set(27, 0.0, 600); espl.receiveShadow = true; A.add(espl);
    const tiles = []; for (let z = -300; z < 300; z += 1.8) tiles.push(z);
    const tm = new THREE.InstancedMesh(new THREE.BoxGeometry(14, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: 0x9e937f, roughness: 1 }), tiles.length); tiles.forEach((z, k) => { m4.compose(v.set(27, 0.16, z), q.identity(), sc.set(1, 1, 1)); tm.setMatrixAt(k, m4); }); tm.frustumCulled = false; A.add(tm);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 4000), new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.8 })); curb.position.set(20.1, 0.02, 600); A.add(curb);
    const marks = []; for (const x of [5, 15]) for (let z = -300; z < 300; z += 9) marks.push([x, z, 0.22, 3.2]); for (let z = -300; z < 300; z += 1) marks.push([10, z, 0.14, 0.95]);
    const mk = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe2d98a }), marks.length); marks.forEach(([x, z, w, l], k) => { m4.compose(v.set(x, 0.06, z), q.identity(), sc.set(w, 1, l)); mk.setMatrixAt(k, m4); }); mk.frustumCulled = false; A.add(mk); }
  // parapet along the river with a bronze top rail on posts
  const parM = new THREE.MeshStandardMaterial({ color: 0xa89d88, roughness: 0.85 });
  { const par = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.95, 900, 3, 0.08), parM); par.position.set(33.85, 0.15 + 0.475, 0); par.castShadow = par.receiveShadow = true; A.add(par);
    const capS = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.1, 900, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0xc6bca8, roughness: 0.8 })); capS.position.set(33.85, 1.13, 0); capS.castShadow = true; A.add(capS); }
  // trees, benches, lamps along the esplanade
  { const nT = 60; const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 3.2, 10).translate(0, 1.6, 0), new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 0.9 }), nT);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.9, 2).translate(0, 4.4, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), nT);
    for (let k = 0; k < nT; k++) { const z = -295 + k * 10 + (R() - 0.5) * 2; m4.compose(v.set(22.2, 0.15, z), q.identity(), sc.set(1, 1, 1)); trunk.setMatrixAt(k, m4); m4.compose(v.set(22.2, 0.15, z), q.setFromEuler(e.set(0, R() * 3, 0)), sc.set(1, 0.9 + R() * 0.3, 1)); crown.setMatrixAt(k, m4); crown.setColorAt(k, col.setHSL(0.17 + R() * 0.08, 0.55, 0.3 + R() * 0.1)); }
    [trunk, crown].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); }); }
  function bench(x, z) { const g = new THREE.Group(); g.position.set(x, 0.15, z); const wd = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.75 });
    for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.05, 1.9, 2, 0.02), wd); s.position.set(-0.2 + k * 0.17, 0.46, 0); g.add(s); }
    for (let k = 0; k < 2; k++) { const s = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.13, 1.9, 2, 0.02), wd); s.position.set(-0.33, 0.62 + k * 0.17, 0); g.add(s); }
    for (const zz of [-0.8, 0.8]) { const l = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.46, 0.06, 2, 0.02), dark); l.position.set(-0.1, 0.23, zz); g.add(l); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); }
  for (let z = -120; z < 120; z += 14) if (Math.abs(z - HZ) > 6) bench(30.3, z);
  function lamp(x, z) { const g = new THREE.Group(); g.position.set(x, 0.15, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.4, 10), dark); p.position.y = 2.2; g.add(p);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.4, emissive: 0x3a2a10 })); head.position.y = 4.55; g.add(head);
    const cp = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 12), dark); cp.position.y = 4.85; g.add(cp); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); }
  for (let z = -136; z < 136; z += 17) lamp(32.9, z + 8.5);
  // a coin-operated viewer telescope near the hero
  { const g = new THREE.Group(); g.position.set(32.8, 0.15, HZ - 4.6); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.1, 10), dark); st.position.y = 0.55; g.add(st);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 6, 14), new THREE.MeshStandardMaterial({ color: 0x2f6b8f, roughness: 0.4, metalness: 0.4 })); body.rotation.z = Math.PI / 2 - 0.15; body.position.set(0.05, 1.25, 0); g.add(body);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); }

  // traffic on the riverside drive: southbound in x 3.4/7.8, northbound in x 12.2/16.6
  const CG = carGeos(THREE); const NC = 36, cars = [];
  for (let k = 0; k < NC; k++) { const lane = k % 4; cars.push({ x: [3.4, 7.8, 12.2, 16.6][lane], dir: lane < 2 ? -1 : 1, z0: -260 + Math.floor(k / 4) * 58 + R() * 30 + lane * 13, sp: 11 + R() * 4, c: [0xf5c518, 0x1d1f22, 0xf2f2f2, 0x2d6fd6, 0xb3261e, 0x6b7d8f, 0xf5c518][Math.floor(R() * 7)] }); }
  const carB = new THREE.InstancedMesh(CG.body, new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.28 }), NC), carT = new THREE.InstancedMesh(CG.top, new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.2, metalness: 0.5 }), NC);
  cars.forEach((c, k) => carB.setColorAt(k, col.set(c.c))); [carB, carT].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });
  // background crowd: west sidewalk + esplanade (leaves the hero's stretch of railing clear)
  const PG = pedGeos(THREE); const NP = 150, peds = []; const shirts = [0xc94f4f, 0x3a7bd5, 0xf2c14e, 0x4caf7a, 0x8e5bb5, 0xeeeeee, 0x333333, 0xf28c38, 0x2bb3b1], skins = [0xf1c6a5, 0xd8a47e, 0xb5835a, 0x8d5a3b, 0x5c3a24];
  const pB = new THREE.InstancedMesh(PG.body, new THREE.MeshStandardMaterial({ roughness: 0.8 }), NP), pH = new THREE.InstancedMesh(PG.head, new THREE.MeshStandardMaterial({ roughness: 0.7 }), NP);
  for (let k = 0; k < NP; k++) { const west = R() < 0.4; peds.push({ x: west ? -4.2 + R() * 3.4 : 23.2 + R() * 6.0, z0: -200 + R() * 400, dir: R() < 0.5 ? 1 : -1, sp: 1.0 + R() * 0.6, s: 0.88 + R() * 0.22, ph: R() * 6.28 });
    pB.setColorAt(k, col.set(shirts[Math.floor(R() * shirts.length)])); pH.setColorAt(k, col.set(skins[Math.floor(R() * skins.length)])); }
  [pB, pH].forEach(m => { m.castShadow = true; m.frustumCulled = false; A.add(m); });

  // the lively esplanade: dog walker, jogger, cyclist, kid with a balloon, busker, delivery van, phone call, coffee
  const SL = makeStreetLife(THREE, A, { seed: 15, z: HZ, dogX: 25.5, dogZ: -16, dogDir: 1, jogX: 28.8, jogZ: -26, bikeX: 18.4, bikeZ: -120, kidX: 24.2, kidZ: 14, kidDir: -1, musX: 21.0, musZ: -7, vanX: 1.3, vanZ: 20, phX: 27.0, phZ: 7, cofX: 31.2, cofZ: -9.5, balloonColor: 0x3fb8ff, vanColor: 0xf4f1ea, vanStripe: 0x2a6fb0, dogColor: 0x2a2420 });

  // ---------------- boats: ferry (near), sailboat, tug ----------------
  const white = new THREE.MeshStandardMaterial({ color: 0xf3f4f2, roughness: 0.4 }), navy = new THREE.MeshStandardMaterial({ color: 0x1d3f6e, roughness: 0.45 }), glassD = new THREE.MeshStandardMaterial({ color: 0x1b2633, roughness: 0.12, metalness: 0.6 });
  const ferry = new THREE.Group(); { const hull = new THREE.Mesh(new RoundedBoxGeometry(7.5, 2.4, 27, 5, 0.9), white); hull.position.y = 0.2; ferry.add(hull);
    const band = new THREE.Mesh(new RoundedBoxGeometry(7.6, 0.55, 27.1, 3, 0.25), navy); band.position.y = -0.35; ferry.add(band);
    const cab = new THREE.Mesh(new RoundedBoxGeometry(6.6, 2.3, 17, 4, 0.5), white); cab.position.set(0, 2.5, -1); ferry.add(cab);
    const win = new THREE.Mesh(new RoundedBoxGeometry(6.7, 0.9, 16, 3, 0.3), glassD); win.position.set(0, 2.75, -1); ferry.add(win);
    const wh = new THREE.Mesh(new RoundedBoxGeometry(4.4, 1.5, 4.5, 4, 0.4), white); wh.position.set(0, 4.35, 3.6); ferry.add(wh);
    const whw = new THREE.Mesh(new RoundedBoxGeometry(4.5, 0.6, 4.6, 3, 0.2), glassD); whw.position.set(0, 4.55, 3.6); ferry.add(whw);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.06, 9), dark); rail.position.set(0, 4.55, -5.5); ferry.add(rail);
    for (let k = 0; k < 7; k++) { const p = new THREE.Mesh(PG.body, new THREE.MeshStandardMaterial({ color: shirts[k % 9], roughness: 0.8 })); p.position.set(-2.6 + (k % 4) * 1.6, 3.65, -9 + Math.floor(k / 4) * 2.5 + (k % 2)); ferry.add(p);
      const hd = new THREE.Mesh(PG.head, new THREE.MeshStandardMaterial({ color: skins[k % 5], roughness: 0.7 })); hd.position.copy(p.position); ferry.add(hd); }
    ferry.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); A.add(ferry); }
  const FER = { x: 96, z0: -14, sp: -5.0 };     // heads downriver (south) at 5 m/s
  const sail = new THREE.Group(); { const h = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 6, 6, 14), white); h.rotation.x = Math.PI / 2; h.scale.set(1, 1, 0.55); h.position.y = 0.1; sail.add(h);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 11, 8), dark); mast.position.y = 6; sail.add(mast);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.2, -0.2, 0, 11, 0, 0, 1.2, -3.8], 3)); sg.computeVertexNormals();
    const s1 = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0xfaf6ea, roughness: 0.7, side: THREE.DoubleSide })); sail.add(s1);
    sail.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(sail); }
  const SAIL = { x: 175, z0: 28, sp: 1.6 };
  const tug = new THREE.Group(); { const h = new THREE.Mesh(new RoundedBoxGeometry(6, 2.6, 16, 5, 1.0), new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.5 })); h.position.y = 0.2; tug.add(h);
    const c = new THREE.Mesh(new RoundedBoxGeometry(4, 3, 6, 4, 0.4), white); c.position.set(0, 2.8, 1); tug.add(c); const fn = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0x15171a })); fn.position.set(0, 5, -1); tug.add(fn);
    tug.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(tug); }
  const TUG = { x: 330, z0: -120, sp: 3.0 };
  // fish in the channel, right under the hero's view
  const NF = 34, fish = []; const fishG = new THREE.SphereGeometry(0.22, 14, 10); const tailG = new THREE.ConeGeometry(0.14, 0.24, 8);
  for (let k = 0; k < NF; k++) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: [0xb8c4cc, 0x9aa8b0, 0xd0c49a, 0x7f9a8a][k % 4], roughness: 0.3, metalness: 0.5 });
    const b = new THREE.Mesh(fishG, m); b.scale.set(0.55, 0.8, 1.6); g.add(b); const tl = new THREE.Mesh(tailG, m); tl.rotation.x = -Math.PI / 2; tl.position.z = -0.42; tl.scale.set(1, 0.4, 1); g.add(tl);
    const s = 0.7 + R() * 1.1; g.scale.setScalar(s); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g);
    const x = 37 + R() * 34, z = -16 + R() * 30, y0 = WL - 1.2 - R() * 8.5; fish.push({ g, x, z, y0, by: bedY(x, z) + 0.12 * s, ry: R() * 6.28, ph: R() * 6.28 }); }
  // gulls circling above the river (they do not care)
  const gulls = []; for (let k = 0; k < 6; k++) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 10), white); b.rotation.x = Math.PI / 2; g.add(b);
    const wl = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.04, 0.32, 2, 0.02), white), wr = wl.clone(); wl.position.x = -0.5; wr.position.x = 0.5; g.add(wl, wr); g.userData = { wl, wr, r: 14 + R() * 18, y: 9 + R() * 14, ph: R() * 6.28, cx: 52 + R() * 30, cz: -10 + R() * 20 }; A.add(g); gulls.push(g); }

  // ---------------- hero, Mittens, the stones, the shopping cart ----------------
  const P = makePerson(THREE, { shirt: 0x2f8f6a, pants: 0x34404f, hair: 0x2a1a10, skin: 0xd8a47e, seed: 3 }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const catM = []; const mittens = makeCat(THREE, 0xf0a040); mittens.rotation.order = 'YXZ'; mittens.scale.setScalar(1.3); mittens.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0xf0a040) catM.push(o.material); }); A.add(mittens);
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.55 });
  const stone1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), stoneM); stone1.scale.set(1.2, 0.38, 1); stone1.castShadow = true; A.add(stone1);
  const stone2 = stone1.clone(); A.add(stone2);
  const ST2 = [33.85, 1.2, 0.55];                        // the next stone waits on the parapet
  // stone 1: released at TREL with velocity VREL; ballistic in story time through the event
  const TREL = 6.2, VREL = [11.5, 1.0, -2.6];
  const s1Rel = new THREE.Vector3(HX + 0.45, 1.25, HZ - 0.25);
  function stone1At(ts) { return [s1Rel.x + VREL[0] * ts, s1Rel.y + VREL[1] * ts - 0.5 * G * ts * ts, s1Rel.z + VREL[2] * ts]; }
  // find where it lands (top of the shopping cart placed exactly there)
  let LAND = 0; for (let s = 0; s < 4; s += 0.002) { const p = stone1At(s); if (s > 1.0 && p[1] < bedY(p[0], p[2]) + 0.95) { LAND = s; break; } }
  const LP = stone1At(LAND);
  const cart = new THREE.Group(); { const cm = new THREE.MeshStandardMaterial({ color: 0xa9b0b5, roughness: 0.35, metalness: 0.8 });
    const bars = []; const add = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cm); m.position.set(x, y, z); cart.add(m); };
    for (const x of [-0.3, 0.3]) for (let y = 0.4; y <= 0.95; y += 0.11) add(0.02, 0.02, 0.9, x, y, 0);
    for (const z of [-0.45, 0.45]) for (let y = 0.4; y <= 0.95; y += 0.11) add(0.62, 0.02, 0.02, 0, y, z);
    for (const x of [-0.3, 0.3]) for (const z of [-0.45, 0.45]) add(0.03, 0.6, 0.03, x, 0.65, z);
    add(0.62, 0.02, 0.9, 0, 0.4, 0); add(0.7, 0.04, 0.04, 0, 1.05, 0.55);
    for (const x of [-0.27, 0.27]) for (const z of [-0.4, 0.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12), tyreM); w.rotation.z = Math.PI / 2; w.position.set(x, 0.07, z); cart.add(w); add(0.02, 0.3, 0.02, x, 0.22, z); }
    cart.rotation.set(0.12, 0.6, 0.18); cart.position.set(LP[0], bedY(LP[0], LP[2]) - 0.08, LP[2]); cart.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(cart); }
  const CARTP = [LP[0], bedY(LP[0], LP[2]), LP[2]];
  // stone 2: thrown at T2REL, five skips, then sinks
  const T2REL = 40.6, V2 = [10.0, 0.9, -1.4], s2Rel = new THREE.Vector3(HX + 0.45, 1.25, HZ - 0.2);
  const skips = []; { let p = s2Rel.clone(), vel = new THREE.Vector3(...V2), t0 = T2REL; const ups = [2.9, 2.3, 1.8, 1.35, 0.95];
    for (let i = 0; i <= 5; i++) { const a = -0.5 * G, b = vel.y, c = p.y - WL; const dt = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      skips.push({ t0, p: p.clone(), v: vel.clone(), dt, hit: new THREE.Vector3(p.x + vel.x * dt, WL, p.z + vel.z * dt) });
      p = skips[i].hit.clone(); t0 += dt; vel = new THREE.Vector3(vel.x * 0.8, ups[i] ?? 0, vel.z * 0.8); } }
  function stone2At(t) { for (let i = 0; i < skips.length; i++) { const s = skips[i]; if (t < s.t0 + s.dt || i === skips.length - 1) { const u = Math.min(t - s.t0, s.dt);
        if (i === skips.length - 1 && t > s.t0 + s.dt) return [s.hit.x, WL - Math.min(1.2, (t - s.t0 - s.dt) * 0.8), s.hit.z];
        return [s.p.x + s.v.x * u, s.p.y + s.v.y * u - 0.5 * G * u * u, s.p.z + s.v.z * u]; } } return [0, -50, 0]; }

  // ---------------- splashes (mud and water), ripple rings ----------------
  function makeSplash(n, color, size, seed) { const Rs = rng(seed); const pos = new Float32Array(n * 3), dirs = [];
    for (let k = 0; k < n; k++) { const a = Rs() * 6.28, r = Math.sqrt(Rs()); dirs.push([Math.cos(a) * r, 0.4 + Rs() * 0.8, Math.sin(a) * r, Rs()]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: softTex(THREE), color, size, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true })); pts.frustumCulled = false; A.add(pts);
    return { set(o, age, spread, up, lifeT = 1.4, gk = 1) { if (age < 0 || age > lifeT) { pts.visible = false; return; } pts.visible = true;
      for (let k = 0; k < n; k++) { const d = dirs[k], s = 0.6 + 0.4 * d[3]; pos[k * 3] = o[0] + d[0] * spread * s * age; pos[k * 3 + 1] = Math.max(o[1] - 0.2, o[1] + d[1] * up * s * age - 0.5 * G * gk * age * age); pos[k * 3 + 2] = o[2] + d[2] * spread * s * age; }
      geo.attributes.position.needsUpdate = true; pts.material.opacity = 0.9 * (1 - age / lifeT); } }; }
  const mudFerry = makeSplash(160, 0x4a3a2a, 1.6, 3), mudCart = makeSplash(40, 0x5a4a38, 0.16, 4), wallSplash = makeSplash(260, 0xe8f4ff, 0.32, 5), catShake = makeSplash(50, 0xdff0ff, 0.06, 6), ferrySplash = makeSplash(200, 0xf0f8ff, 1.1, 7);
  const skipFx = []; for (let i = 0; i < 6; i++) { skipFx.push(makeSplash(26, 0xf4fbff, 0.1, 20 + i)); }
  const ringM = []; for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = -Math.PI / 2; A.add(r); ringM.push(r); }

  // ---------------- space: the dry planet ----------------
  const B = new THREE.Scene(); const camB = new THREE.PerspectiveCamera(36, W / H, 10, 3e5);
  const sunB = new THREE.DirectionalLight(0xffffff, 2.6); sunB.position.set(1, 0.35, 0.55); B.add(sunB); B.add(new THREE.AmbientLight(0x404858, 0.35)); B.add(stars(THREE, 3500, 90000, 11));
  const RE = 6371; const earthG = new THREE.Group(); B.add(earthG); let trenchLocal = new THREE.Vector3();
  { const ec = document.createElement('canvas'); ec.width = 1024; ec.height = 512; const eg = ec.getContext('2d'); const id = eg.createImageData(1024, 512);
    const perm = []; const R2 = rng(9); for (let i = 0; i < 512; i++) perm.push(R2());
    const vn = (x, y, z) => { const h = (a, b, c) => perm[(Math.abs(Math.floor(a) * 73856093 ^ Math.floor(b) * 19349663 ^ Math.floor(c) * 83492791)) % 512];
      const fx = x - Math.floor(x), fy = y - Math.floor(y), fz = z - Math.floor(z); const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
      const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); const L = (a, b, t) => a + (b - a) * t;
      return L(L(L(h(X, Y, Z), h(X + 1, Y, Z), sx), L(h(X, Y + 1, Z), h(X + 1, Y + 1, Z), sx), sy), L(L(h(X, Y, Z + 1), h(X + 1, Y, Z + 1), sx), L(h(X, Y + 1, Z + 1), h(X + 1, Y + 1, Z + 1), sx), sy), sz); };
    const NN = new Float32Array(1024 * 512);
    for (let y = 0; y < 512; y++) { const lat = (0.5 - y / 512) * Math.PI; for (let x = 0; x < 1024; x++) { const lon = x / 1024 * Math.PI * 2;
      const px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      let n = 0, a = 1, f = 1.6; for (let o = 0; o < 5; o++) { n += vn(px * f + 10, py * f + 10, pz * f + 10) * a; a *= 0.5; f *= 2.1; } n /= 1.94; NN[y * 1024 + x] = n;
      let r, g, b; const polar = Math.abs(lat) > 1.25;
      if (n > 0.52) { const m = (n - 0.52) * 4; r = 70 + m * 90; g = 112 + m * 40; b = 55 + m * 30; if (Math.abs(lat) < 0.45 && n > 0.62) { r = 190; g = 165; b = 110; } if (polar) { r = 128; g = 118; b = 104; } }
      else { const m = n / 0.52; const sh = smooth(0.84, 0.98, m); r = lerp(lerp(58, 150, smooth(0.25, 0.84, m)), 186, sh); g = lerp(lerp(52, 128, smooth(0.25, 0.84, m)), 164, sh); b = lerp(lerp(52, 104, smooth(0.25, 0.84, m)), 128, sh);
        const rid = Math.abs(Math.sin(n * 90)); r -= 10 * rid; g -= 10 * rid; b -= 8 * rid; if (polar) { r = r * 0.8 + 20; g = g * 0.8 + 18; b = b * 0.8 + 18; } }
      const i4 = (y * 1024 + x) * 4; id.data[i4] = r; id.data[i4 + 1] = g; id.data[i4 + 2] = b; id.data[i4 + 3] = 255; } }
    eg.putImageData(id, 0, 0);
    // a trench: a long dark arc in the dry sea floor beside a coast, at ~11 degrees north
    const row = 225; let c0 = 600; for (let x = 0; x < 1024; x++) { const n = NN[row * 1024 + x], nl = NN[row * 1024 + ((x + 14) % 1024)]; if (n < 0.44 && nl > 0.52) { c0 = x; break; } }
    eg.strokeStyle = 'rgba(22,18,18,0.95)'; eg.lineWidth = 3.2; eg.beginPath(); eg.arc(c0 + 30, row, 30, Math.PI * 0.62, Math.PI * 1.38); eg.stroke();
    eg.strokeStyle = 'rgba(60,50,46,0.6)'; eg.lineWidth = 7; eg.beginPath(); eg.arc(c0 + 30, row, 30, Math.PI * 0.62, Math.PI * 1.38); eg.stroke();
    const tx = c0, phi = tx / 1024 * Math.PI * 2, th = row / 512 * Math.PI; trenchLocal.set(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)).multiplyScalar(RE);
    const etex = new THREE.CanvasTexture(ec); etex.colorSpace = THREE.SRGBColorSpace; etex.anisotropy = 4;
    earthG.add(new THREE.Mesh(new THREE.SphereGeometry(RE, 128, 64), new THREE.MeshStandardMaterial({ map: etex, roughness: 0.9 })));
    earthG.add(new THREE.Mesh(new THREE.SphereGeometry(RE * 1.016, 96, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(0.35,0.65,1.0,1.0)*f*1.4; }` }))); }
  const ALPHA = Math.atan2(trenchLocal.x, trenchLocal.z);

  console.log('TIMES', JSON.stringify({ land: EV + 6 * (LAND - (EV - TREL)), ferry: EV + 6 * Math.sqrt(2 * (WL - bedY(FER.x, FER.z0 + FER.sp * EV) - 1.0) / G), skips: skips.map(s => +(s.t0 + s.dt).toFixed(2)) }));
  await document.fonts.ready;

  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.3, bloomThreshold: 0.9, shake: 0, flash: 0, t, env: 0.3 };
    const gone = t >= EV && t < RET; const story = clamp((t - EV) / SLOW, 0, 5); out.story = story;
    const tm = t < EV ? t : t < RET ? EV + story : EV + 5 + (t - RET);       // world clock (slow-mo inside)
    const ts = t < EV ? 0 : t < RET ? story : 5;                              // seconds without water
    const back = t >= RET ? t - RET : -1;                                     // real seconds since it returned
    // water blinks out over ~0.25 story-seconds, back in ~0.35 real seconds
    UW.uGone.value = gone ? smooth(0, 0.28, story) : t >= RET ? 1 - smooth(0, 0.35, back) : 0;
    water.visible = UW.uGone.value < 0.999;
    // clouds boil away and the air goes clear
    const ev = gone ? smooth(0.08, 0.5, story) : t >= RET ? 1 - smooth(0.2, 1.8, back) : 0;
    cloudMat.opacity = 0.96 * (1 - ev); clouds.forEach((g, k) => { const s = 1 - 0.6 * ev; g.scale.set(s, s * (1 - 0.3 * ev), s); g.position.x += 0; g.visible = ev < 0.999; });
    A.fog.density = lerp(0.00012, 0.00006, ev); sky.material.uniforms.hor.value.setHex(0xe2ecf4).lerp(col.setHex(0xa9c9ee), ev); sky.material.uniforms.zen.value.setHex(0x4a86d4).lerp(col.setHex(0x2f6bc6), ev);

    // ---- traffic + crowd + street life (all slow-mo with the world clock) ----
    cars.forEach((c, i) => { const z = wrap(c.z0 + c.dir * c.sp * tm, -260, 260); m4.compose(v.set(c.x, 0.02, z), q.setFromEuler(e.set(0, c.dir > 0 ? 0 : Math.PI, 0)), sc.set(1, 1, 1)); carB.setMatrixAt(i, m4); carT.setMatrixAt(i, m4); });
    carB.instanceMatrix.needsUpdate = carT.instanceMatrix.needsUpdate = true;
    const look = gone ? smooth(0.4, 1.4, story) * 0.5 : t >= RET ? 0.5 * (1 - smooth(RET + 2, RET + 4, t)) : 0;
    peds.forEach((p, i) => { let z = wrap(p.z0 + p.dir * p.sp * tm, -200, 200); let x = p.x; if (x > 27 && Math.abs(z - HZ) < 7) x -= 4.5;
      const y = 0.15 + Math.abs(Math.sin(tm * 8 * 0.5 + p.ph)) * 0.05; m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0, (p.dir > 0 ? 0 : Math.PI) + (x > 20 ? 0.8 * look : 0), 0)), sc.set(p.s, p.s, p.s)); pB.setMatrixAt(i, m4); pH.setMatrixAt(i, m4); });
    pB.instanceMatrix.needsUpdate = pH.instanceMatrix.needsUpdate = true;
    SL.update(tm, { look, stop: 0 });
    gulls.forEach(g => { const u = g.userData, a = u.ph + tm * 0.35; g.position.set(u.cx + Math.cos(a) * u.r, u.y + Math.sin(tm * 0.7 + u.ph) * 1.2, u.cz + Math.sin(a) * u.r); g.rotation.set(0, -a, Math.sin(a) * 0.2); const fl = Math.sin(tm * 9 + u.ph) * 0.5; u.wl.rotation.z = fl; u.wr.rotation.z = -fl; });

    // ---- boats: float, then free-fall onto the bed, then float back up ----
    function boat(grp, B0, keel, tiltAxis) { const zFree = B0.z0 + B0.sp * tm;   // keeps its momentum while falling
      const by = bedY(B0.x, zFree) + keel; let y = WL, roll = 0, pitch = 0, z = zFree, landed = -1;
      if (t >= EV) { const tl = Math.sqrt(2 * (WL - by) / G); const fall = Math.min(ts, tl); y = WL - 0.5 * G * fall * fall;
        if (ts > tl) { landed = ts - tl; const slide = Math.min(landed, 0.8); z = B0.z0 + B0.sp * (EV + tl) + B0.sp * (slide - slide * slide / 1.6); roll = tiltAxis * smooth(0, 1.2, landed); pitch = -0.03 * smooth(0, 0.6, landed); }
        if (t >= RET) { const zl = B0.z0 + B0.sp * (EV + tl) + B0.sp * 0.4; z = zl + B0.sp * 0.3 * back; const up = easeOut(clamp((back - 0.35) / 2.6)); y = lerp(by + 0, WL, up) + (up > 0.95 ? 0.18 * Math.sin(back * 3) * Math.exp(-(back - 2.6)) : 0); roll = tiltAxis * (1 - up) + 0.05 * Math.sin(back * 2.4) * up; pitch = 0; } }
      grp.position.set(B0.x, y, z); grp.rotation.set(pitch, 0, roll); return { y, z, landed, tl: Math.sqrt(2 * (WL - by) / G), by }; }
    const fs = boat(ferry, FER, 1.0, 0.07); boat(sail, SAIL, 1.0, 0.75); boat(tug, TUG, 1.2, -0.12);
    sail.rotation.y = 0.0; tug.rotation.y = 0;
    mudFerry.set([FER.x, fs.by - 0.5, fs.z], fs.landed >= 0 && t < RET ? fs.landed : -1, 9, 7, 1.6, 0.8);
    ferrySplash.set([FER.x, WL + 0.5, fs.z], back - 1.6, 7, 8, 1.5);
    out.ferry = [FER.x, fs.y + 3, fs.z];
    // fish: hang, fall, flop on the mud, gone (swum off) once the water is back
    fish.forEach((f, k) => { f.g.visible = t >= EV - 0.01 && back < 0.35; const tl = Math.sqrt(2 * (f.y0 - f.by) / G);
      if (ts <= tl) { f.g.position.set(f.x, f.y0 - 0.5 * G * ts * ts, f.z); f.g.rotation.set(0, f.ry + 0.3 * Math.sin(tm * 5 + f.ph), 0.1 * Math.sin(tm * 9 + f.ph)); }
      else { const fl = ts - tl; const hop = Math.abs(Math.sin(fl * 4.2 + f.ph)) * 0.16 * Math.exp(-fl * 0.25); f.g.position.set(f.x, f.by + hop, f.z); f.g.rotation.set(0, f.ry, Math.PI / 2 * 0.92 + 0.5 * Math.sin(fl * 8.4 + f.ph)); } });

    // ---- hero ----
    const Gp = P.group; Gp.position.set(HX, 0.15, HZ); let ry = Math.PI / 2; P.torso.rotation.set(0, 0, 0); P.legL.rotation.set(0, 0, -0.06); P.legR.rotation.set(0, 0, 0.06);
    let aL = [-0.25, 0, -0.12], aR = [-0.55, 0, 0.1], head = [0.12, 0, 0];
    if (t < EV) { const wind = smooth(5.3, 6.0, t), rel = smooth(6.0, 6.35, t), fol = smooth(6.35, 6.9, t);
      ry += -0.55 * wind + 0.75 * rel; P.torso.rotation.y = 0; P.legL.rotation.x = 0.25 * wind; P.legR.rotation.x = -0.3 * wind; Gp.position.y -= 0.06 * wind;
      aR = [lerp(lerp(-0.55 + 0.08 * Math.sin(t * 3.2) * (1 - smooth(3.8, 4.6, t)), 0.7, wind), -1.2, rel), 0, lerp(lerp(0.1, 1.25, wind), 0.55, rel)]; aR[0] = lerp(aR[0], -1.05, fol); aR[2] = lerp(aR[2], 0.2, fol);
      aL = [lerp(-0.25, -0.8, wind), 0, lerp(-0.12, -0.6, wind)]; head = [lerp(0.35, -0.05, smooth(3.6, 4.4, t)), 0, 0]; }
    else if (t < RET) { const lean = smooth(0.25, 1.2, story); Gp.position.x += 0.12 * lean; P.torso.rotation.x = 0.42 * lean; aL = [-1.15 * lean - 0.2, 0, -0.25]; aR = [-1.15 * lean - 0.2, 0, 0.25]; head = [0.55 * lean, 0, 0];
      if (story > 2.15 && story < 2.75) head = [0.3, -0.5 * smooth(2.15, 2.45, story), 0]; }
    else { const flinch = Math.max(0, 1 - Math.abs(back - 0.7) / 0.7); const pick = smooth(1.4, 2.0, back) * (1 - smooth(2.3, 2.8, back));
      const wind = smooth(T2REL - RET - 0.65, T2REL - RET - 0.1, back) * (1 - smooth(T2REL - RET - 0.1, T2REL - RET + 0.15, back)), rel = smooth(T2REL - RET - 0.1, T2REL - RET + 0.2, back);
      const cheer = smooth(43.3 - RET, 43.8 - RET, back);
      Gp.position.x -= 0.25 * flinch; P.torso.rotation.x = -0.15 * flinch + 0.35 * pick; ry += 0.4 * flinch - 0.5 * wind + 0.6 * rel * (1 - cheer);
      aR = [lerp(lerp(lerp(-0.5 - 1.2 * flinch, -1.1, pick), 0.7, wind), -1.15, rel * (1 - wind)), 0, lerp(0.1 + 1.0 * wind, 0.5, rel)]; aL = [-0.3 - 1.4 * flinch, 0, -0.15];
      if (cheer > 0) { aR = [lerp(aR[0], -2.9, cheer), 0, lerp(aR[2], 0.25, cheer)]; aL = [lerp(aL[0], -2.9, cheer), 0, lerp(aL[2], -0.25, cheer)]; Gp.position.y += 0.12 * Math.abs(Math.sin((back - 6.4) * 7)) * cheer; }
      head = [0.15 - 0.2 * flinch + 0.4 * pick, 0, 0]; }
    Gp.rotation.set(0, ry, 0); P.armL.rotation.set(...aL); P.armR.rotation.set(...aR); P.headPivot.rotation.set(...head);
    setFace(P, t < EV ? (t > 5.2 ? { brows: 'angry', eyes: 0.8, mouth: 'grit', look: [0, -0.2] } : { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0, -0.6] })
      : t < RET ? (story < 0.5 ? { brows: 'up', eyes: 1.6, mouth: 'o', look: [0, -0.5] } : { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.6, look: [0, -1] })
        : back < 1.4 ? { brows: 'worried', eyes: 0.4, mouth: 'grit' } : back > 6.6 ? { brows: 'up', eyes: 1.3, mouth: 'open', open: 1.4 } : { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0, -0.3] });
    life(P, tm, 0.8);
    Gp.updateMatrixWorld(true); P.armR.userData.end.getWorldPosition(tv);
    // stone 1
    if (t < TREL) { stone1.position.copy(tv); stone1.rotation.set(0, 0, 0.4); }
    else { const s = t < EV ? t - TREL : (EV - TREL) + Math.min(ts, LAND - (EV - TREL)); const p = stone1At(Math.min(s, LAND)); stone1.position.set(...p); stone1.rotation.set(0, s * 30, 0.1);
      if (t >= RET) stone1.position.set(...LP); }
    mudCart.set([LP[0], LP[1] - 0.2, LP[2]], ts - LAND - 0.0, 1.0, 1.6, 0.9);
    // stone 2: on the parapet, picked up, thrown, skips
    if (t < RET + 2.0) { stone2.position.set(...ST2); stone2.rotation.set(0, 0.7, 0); } else if (t < T2REL) stone2.position.copy(tv); else stone2.position.set(...stone2At(t));
    skips.slice(0, 5).forEach((s, i) => { const age = t - (s.t0 + s.dt); skipFx[i].set([s.hit.x, WL + 0.02, s.hit.z], age, 0.8, 1.5, 0.7); const r = ringM[i]; r.visible = age > 0 && age < 2.2; r.position.set(s.hit.x, WL + 0.03, s.hit.z); r.scale.setScalar(0.15 + age * 1.1); r.material.opacity = 0.7 * (1 - age / 2.2); });
    { const s = skips[5]; const age = t - (s.t0 + s.dt); skipFx[5].set([s.hit.x, WL + 0.02, s.hit.z], age, 0.5, 2.2, 0.8); const r = ringM[5]; r.visible = age > 0 && age < 2.4; r.position.set(s.hit.x, WL + 0.03, s.hit.z); r.scale.setScalar(0.15 + age * 1.2); r.material.opacity = 0.7 * (1 - age / 2.4); }
    out.skipCount = skips.slice(0, 5).filter(s => t >= s.t0 + s.dt).length;

    // ---- Mittens: on the parapet; peeks over the edge delighted; soaked by the returning river; shakes it off ----
    const MX = 33.86, MZ = HZ - 0.95; let my = 1.18, mry = Math.PI / 2 - 0.4, mrx = 0, mrz = 0, msx = 1.3, msy = 1.3;
    if (t < EV) { mry += 0.25 * Math.sin(t * 0.9); mrx = 0.08 * Math.sin(t * 2.1); }
    else if (t < RET) { const peek = smooth(0.4, 1.6, story); mry = Math.PI / 2 - 0.2 * (1 - peek); mrx = 0.55 * peek; const joy = story > 2.05 && story < 2.7 ? Math.abs(Math.sin((story - 2.05) * 6 * 4.8)) : 0; my += 0.12 * joy; mrz = 0.12 * Math.sin(story * 12) * (story > 2.05 && story < 2.7 ? 1 : 0); }
    else { const shake = back > 2.2 && back < 3.0 ? 1 : 0; mrz = 0.35 * Math.sin(back * 55) * shake; msx = 1.3 * (1 - 0.12 * smooth(0.4, 0.7, back) * (1 - smooth(2.2, 3.0, back))); msy = msx; mry = Math.PI / 2 + 0.9 * smooth(0.5, 1.3, back) - 0.6 * smooth(3.0, 4.0, back); }
    mittens.position.set(MX, my, MZ); mittens.rotation.set(mrx, mry, mrz); mittens.scale.set(msx, msy, msx * 1.02);
    const wet = t >= RET ? smooth(0.35, 0.6, back) * (1 - 0.6 * smooth(3.0, 7.0, back)) : 0; catM.forEach(m => m.color.setHex(0xf0a040).lerp(col.setHex(0x8a5a26), wet));
    wallSplash.set([34.2, WL + 0.3, HZ - 0.6], back - 0.05, 2.4, 6.5, 1.5); catShake.set([MX, my + 0.35, MZ], back - 2.2, 2.0, 1.6, 0.9);
    out.cat = [MX, my, MZ];

    // ---------------- camera: one continuous move, three cuts ----------------
    let c, g, fov = 45, shC = [HX, HZ, 60], focusY = 0.56, focusH = 0.2, scene = A, camera = cam, dof = 0.55;
    if (t < EV) {                                         // 1. from over the river: the hero at the railing, the lively esplanade behind
      const u = easeInOut(t / EV); c = [lerp(HX + 5.2, HX + 4.0, u), lerp(2.45, 2.25, u), lerp(HZ + 5.6, HZ + 4.3, u)]; g = [HX - 0.5, lerp(1.35, 1.2, u), lerp(HZ - 1.0, HZ - 0.8, u)]; fov = lerp(44, 40, u); focusY = 0.6; focusH = 0.24;
    } else if (t < 12.4) {                                // 2. rise and turn: out across the river (clouds boil away), then down over the hero's shoulder into the canyon
      const uy = easeInOut(smooth(7.0, 9.4, t)), ux = easeInOut(smooth(8.0, 12.0, t)), ut = easeInOut(smooth(7.0, 9.0, t)), ud = easeInOut(smooth(9.6, 12.2, t));
      c = [lerp(HX + 4.0, HX - 2.2, ux), lerp(2.25, 5.0, uy) - 0.6 * ud, lerp(HZ + 4.3, HZ + 4.2, ux)];
      const gA = [lerp(HX - 0.5, HX + 300, ut), lerp(1.2, 34, ut), lerp(HZ - 0.8, HZ + 40, ut)], gB = [HX + 13, -8.5, HZ - 2.5];
      g = [lerp(gA[0], gB[0], ud), lerp(gA[1], gB[1], ud), lerp(gA[2], gB[2], ud)]; fov = lerp(40, 54, uy); focusY = 0.58; focusH = lerp(0.24, 0.36, uy);
    } else if (t < 17.4) {                                // 3. drift out over the canyon to the falling ferry
      const u = easeInOut((t - 12.4) / 5.0); c = [lerp(HX - 2.0, HX + 18, u), lerp(4.4, 2.0, u), lerp(HZ + 4.6, HZ + 22, u)]; g = [lerp(HX + 15, out.ferry[0], u), lerp(-8.5, out.ferry[1] - 1, u), lerp(HZ - 2, out.ferry[2], u)]; fov = lerp(52, 50, u); shC = [70, -10, 90]; focusY = 0.55; focusH = 0.32;
    } else if (t < 20.1) {                                // 4. down into the channel: your stone, in a shopping cart
      const u = easeInOut((t - 17.4) / 1.4), u2 = (t - 18.8) / 1.3; const cp = CARTP;
      c = [lerp(HX + 18, cp[0] - 2.6, u), lerp(2.0, cp[1] + 2.4, u), lerp(HZ + 22, cp[2] + 3.6, u)]; g = [lerp(out.ferry[0], cp[0], u), lerp(out.ferry[1] - 1, cp[1] + 0.8, u), lerp(out.ferry[2], cp[2], u)];
      if (u2 > 0) { c[0] += 0.4 * u2; c[2] -= 0.5 * u2; } fov = lerp(50, 40, u); shC = [cp[0], cp[2], 40]; focusY = 0.56; focusH = lerp(0.3, 0.2, u);
    } else if (t < 23.0) {                                // 5. cut: Mittens peeking over the railing, delighted
      const u = easeInOut((t - 20.1) / 2.9); c = [MX + lerp(2.9, 2.6, u), lerp(1.95, 1.85, u), MZ + lerp(3.5, 3.1, u)]; g = [MX + 0.3, lerp(0.75, 0.85, u), MZ - 0.1]; fov = lerp(40, 37, u); focusY = 0.58; focusH = 0.2;
    } else if (t < 30.3) {                                // 6. rise over the empty river: the bridge, the harbour valley, Liberty on her hill
      const u1 = easeInOut(clamp((t - 23.0) / 4.0)), u2 = easeInOut(clamp((t - 26.6) / 3.7));
      const cA = [MX + 2.6, 1.85, MZ + 3.1], cB = [170, 210, 60], cC = [-640, 170, -1950];
      c = u2 > 0 ? [lerp(cB[0], cC[0], u2), lerp(cB[1], cC[1], u2) + 60 * Math.sin(Math.PI * u2), lerp(cB[2], cC[2], u2)] : [lerp(cA[0], cB[0], u1), lerp(cA[1], cB[1], u1), lerp(cA[2], cB[2], u1)];
      const gA = [MX + 0.3, 0.85, MZ - 0.1], gB = [230, 10, BZ - 200], gC = [LX, 45, LZ];
      g = u2 > 0 ? [lerp(gB[0], gC[0], u2), lerp(gB[1], gC[1], u2), lerp(gB[2], gC[2], u2)] : [lerp(gA[0], gB[0], u1), lerp(gA[1], gB[1], u1), lerp(gA[2], gB[2], u1)];
      fov = lerp(36, 50, u1); shC = [lerp(150, -700, u2), lerp(-300, -2200, u2), lerp(60, 1800, u1)]; focusY = 0.5; focusH = lerp(0.2, 0.5, u1);
    } else if (t < 34.4) {                                // 7. cut: space. the planet without blue
      const u = (t - 30.3) / 4.1; earthG.rotation.set(0.25, 0.25 - ALPHA - 0.12 * u, 0); const d = lerp(20500, 18200, easeInOut(u));
      camB.position.set(1500, 600 - 500 * u, d); camB.lookAt(0, -1500, 0); camB.updateProjectionMatrix(); scene = B; camera = camB; dof = 0; out.bloom = 0.5; out.bloomThreshold = 0.7; out.env = 0;
      earthG.updateMatrixWorld(true); out.trench = tv2.copy(trenchLocal).applyMatrix4(earthG.matrixWorld).toArray();
    } else {                                              // 8. cut: back on the hero's shoulder for the return, the soaking and the record
      const u = easeInOut(clamp((t - 34.4) / 6)), u2 = easeInOut(clamp((t - 40.4) / 3.2));
      c = [lerp(HX - 3.0, HX - 2.6, u) - 0.5 * u2, lerp(2.8, 2.5, u) + 0.5 * u2, lerp(HZ + 1.1, HZ + 0.9, u) + 0.3 * u2]; g = [lerp(HX + 8, HX + 7, u) + 5 * u2, lerp(-4.5, -1.8, u) - 0.4 * u2, lerp(HZ - 5.2, HZ - 4.6, u) + 1.5 * u2]; fov = lerp(52, 48, u) + 4 * u2; focusY = 0.6; focusH = lerp(0.26, 0.32, u2);
    }
    if (scene === A) { if ((new URLSearchParams(location.search).get('dbg') || '').includes('V')) { c = [HX + 10, 30, 40]; g = [HX + 20, -10, 0]; fov = 60; }
      setShadow(...shC); cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix(); }
    out.scene = scene; out.camera = camera; out.dof = dof; out.focusY = focusY; out.focusH = focusH;
    out.flash = 0.45 * pulse(t, RET, 0.3) + 0.25 * pulse(t, EV, 0.25); out.shake = 0.35 * pulse(t, RET, 0.5) + 0.25 * (fs.landed >= 0 && fs.landed < 0.3 && t < RET && t > 16 ? 1 : 0);
    out.label = { river: [52, -10, 6], bridge: [TW[1], TOP + 2, BZ], liberty: [LX, 95, LZ] };
    return out;
  }

  // ---------------- on-screen text ----------------
  const lines = [
    [0.5, 3.81, "You're by the East River, going for a new stone-skipping record."],
    [4.1, 6.7, 'Your best is four. This one feels like five.'],
    [7.4, 11.99, 'All the water on Earth just vanished. All except the water inside living things.'],
    [12.3, 14.43, 'For a heartbeat, the fish just hang there.'],
    [14.7, 17.3, 'Then everything in the river drops twelve metres.'],
    [17.6, 19.93, 'Your record throw lands in a shopping cart.'],
    [20.3, 22.37, 'Mittens has never liked the river more.'],
    [22.7, 25.62, 'Clouds are water too. Every single one is gone.'],
    [26.0, 29.8, 'New York Harbor is a valley of mud. Lady Liberty stands on a hill.'],
    [30.4, 33.75, 'From space: no blue, no clouds, not even ice caps.'],
    [34.6, 36.35, 'Then it all comes back at once.'],
    [37.8, 40.62, 'The ferry bobs back up. Mittens gets soaked.'],
    [41.3, 44.09, 'Your next stone skips five times. New record.'],
  ];
  const CARD_LINE = [45.9, 52.83, 'The strangest part? Out at sea, every ship just fell 120 metres. Higher than the Statue of Liberty.'];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function italic(ctx, W, H, t, a, b, txt, y = 0.70) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.3, (b - t) / 0.3));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 50px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * y + i * 64); ctx.fillText(l, W / 2, H * y + i * 64); }); ctx.restore(); }
  function worldLabel(ctx, st, pos, title, num, camO) { if (!pos) return; const cm = camO || cam; tv.set(pos[0], pos[1], pos[2]); cm.updateMatrixWorld(); tv.project(cm);
    if (tv.z > 1 || Math.abs(tv.x) > 0.84 || tv.y < -0.30 || tv.y > 0.80) return;
    const x = (tv.x * 0.5 + 0.5) * 1080, y = (1 - (tv.y * 0.5 + 0.5)) * 1920;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    const lx = Math.min(x + 14, 1080 - w - 24), ly = clamp(y, 150, 1150); ctx.translate(lx - (x + 14), ly - y);
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x + 14, y - 34, w, 68, 14); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 26, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 26, y + 16);
    ctx.strokeStyle = 'rgba(255,210,63,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke(); ctx.restore(); }

  function hud(ctx, t, st) { const W = 1080, H = 1920;
    if (t < CARDT) {
      drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF ALL THE WATER ON EARTH', size: 70 }, { text: 'VANISHED FOR 5 SECONDS?', size: 84, accent: true }], t, '#5fd0ff', { start: 0.3, outAt: 6.0 });
      const yC = lerp(H * 0.268, H * 0.105, smooth(6.0, 6.6, t)); const f3 = (x) => `0:0${Math.max(0, x).toFixed(3)}`;
      const o = t < EV ? { label: 'WATER VANISHES IN', value: f3(EV - t), color: '#5fd0ff' } : t < RET ? { label: 'WATER RETURNS IN', value: f3(5 - st.story), color: '#ffd23f' } : { label: 'WATER', value: 'BACK', color: '#5fd0ff' };
      drawSideCounter(ctx, W, H, { y: yC, ...o, note: t < EV ? 'real time' : t < RET ? 'slow motion · 6x' : '', bump: Math.max(pulse(t, EV, 0.4), pulse(t, RET, 0.4)), glow: o.color });
      for (const [a, b, txt] of lines) italic(ctx, W, H, t, a, b, txt);
      if (t > 12.6 && t < 16.6) worldLabel(ctx, st, st.label.river, 'EAST RIVER', '≈ 12 m deep here');
      if (t > 25.3 && t < 27.6) worldLabel(ctx, st, st.label.bridge, 'BROOKLYN BRIDGE', 'towers 84 m above the water');
      if (t > 27.9 && t < 30.2) worldLabel(ctx, st, st.label.liberty, 'STATUE OF LIBERTY', '93 m, ground to torch');
      if (t > 31.0 && t < 34.2 && st.trench) worldLabel(ctx, st, st.trench, 'MARIANA TRENCH', '10,935 m at its deepest', camB);
    }
    if (t >= CARDT) { const a = smooth(CARDT, CARDT + 0.6, t); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `500 58px ${FS}`; ctx.fillText('What if all the water on Earth', W / 2, H * 0.34); ctx.fillStyle = '#5fd0ff'; ctx.fillText('vanished for 5 seconds?', W / 2, H * 0.34 + 76);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `600 23px ${FONT}`; ctx.fillText('EAST RIVER ≈ 12 m  ·  CHALLENGER DEEP 10,935 m  ·  5 s OF FREE FALL ≈ 122 m', W / 2, H * 0.34 + 160);
      ctx.restore();
      italic(ctx, W, H, t, CARD_LINE[0], CARD_LINE[1] + 1, CARD_LINE[2], 0.48);
      ctx.save(); ctx.globalAlpha = smooth(CARDT + 4.6, CARDT + 5.2, t); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.font = `italic 600 46px ${FS}`; ctx.fillText('What should we try next?', W / 2, H * 0.7); ctx.fillStyle = '#ffd23f'; ctx.font = `800 30px ${FONT}`; ctx.fillText('TELL US IN THE COMMENTS', W / 2, H * 0.7 + 66); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
