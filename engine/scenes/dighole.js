import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, makeCatCam, makeEarth, makeBurst, softTex, setFace, life, drawSideCounter, drawTitleTimed, drawTag, RoundedBoxGeometry, stars, carGeos } from './lib.js';
import { makeStreetLife } from './streetlife.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 18 episode — RUNAWAY FORMAT: "What if you dug a hole straight down and never stopped?"
// PLACE: a back garden behind a town house in Madrid (new: not the kitchen table, not the museum plaza). Late-afternoon golden light.
// STAKE: you only had to dig a 30 cm hole for a tiny lemon tree. Payoff: you come out in New Zealand and the tree is still in its pot.
// LOOK: the garden sits on a cut-away block of ground (an "ant-farm" cross-section facing the camera), so the hole, the layers and
//       the hero at the bottom are always readable; the camera pulls back as the hole deepens (m -> km -> 100 km), then one cut to a
//       cut-away Earth (2,900 km -> centre -> other side), one cut to a sheep field near Weber, NZ, and back to the garden for the payoff.
// CAST: THE FILMER (neighbour over the fence, films instead of helping, loves the lighting once the rock glows), THE PIGEON (guards the tree).
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;

// ---------------- timeline (step lengths from the real narration durations, audio/dighole_dur.json) ----------------
const T1 = 3.2; const STEPS = [4.0, 4.0, 4.84, 4.33, 4.14, 5.12, 4.38, 5.08, 4.5, 6.02, 4.0, 4.0];
const STS = [T1]; for (const s of STEPS) STS.push(+(STS[STS.length - 1] + s).toFixed(3));
const ST = (k) => STS[k - 1]; const NSTEP = 12; const PUNCH = STS[12], ASK = PUNCH + 1.92, TOT = 62.44;
const CUTB = ST(10), CUTC = ST(12) + 1.35;
const DEPTHS = [0.06, 0.3, 2, 60, 350, 2300, 4000, 12262, 35000, 100000, 2890000, 6371000, 12742000];
const stepOf = (t) => { if (t < T1) return 0; for (let k = NSTEP; k >= 1; k--) if (t >= ST(k)) return k; return 0; };
function depthAt(t) {
  const k = stepOf(t); if (k === 0) return lerp(0.0, 0.06, smooth(0.8, T1, t));
  const a = DEPTHS[k - 1], b = DEPTHS[k]; const roll = k === 12 ? 1.25 : k === 1 ? 2.4 : 1.35; const u = easeInOut((t - ST(k) - 0.1) / roll);
  return Math.exp(lerp(Math.log(a), Math.log(b), u));
}
// approximate temperature (C) at depth (checked anchor points, log-interpolated; symmetric on the way out)
const TEMP = [[0.01, 15], [60, 16], [350, 22], [2300, 48], [4000, 62], [12262, 180], [35000, 500], [100000, 1400], [2890000, 4000], [6371000, 5200]];
function tempAt(d) { if (d > 6371000) d = Math.max(0.01, 12742000 - d); if (d <= TEMP[0][0]) return 15; for (let i = 1; i < TEMP.length; i++) if (d <= TEMP[i][0]) { const [d0, c0] = TEMP[i - 1], [d1, c1] = TEMP[i]; return lerp(c0, c1, (Math.log(d) - Math.log(d0)) / (Math.log(d1) - Math.log(d0))); } return 5200; }
export { ST, TOT, PUNCH, ASK, CUTB, CUTC, depthAt };

export async function create({ THREE, renderer, W, H }) {
  renderer.localClippingEnabled = true;
  const R = rng(1119);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, r);
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function signMat(text, bg, fg, w = 512, h = 112) { return new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = h * 0.56; g.font = `900 ${fs}px ${FONT}`; const mw = g.measureText(text).width; if (mw > w * 0.84) { fs *= w * 0.84 / mw; g.font = `900 ${fs}px ${FONT}`; } g.fillText(text, w / 2, h * 0.54); }) }); }
  const stripeMat = (a, b) => new THREE.MeshStandardMaterial({ roughness: 0.75, map: canvasTex(256, 64, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? a : b; g.fillRect(k * 32, 0, 32, 64); } }) });

  // =====================================================================================================
  // SCENE A — the garden on a cut-away block of ground (metres). Cut face = plane z = 0, ground at z < 0, camera at z > 0.
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(42, W / H, 0.03, 4e6);
  const fogC = new THREE.Color(0xf3dcc0); A.fog = new THREE.FogExp2(fogC.getHex(), 0.0005);
  A.add(new THREE.HemisphereLight(0xdce9ff, 0x9a8466, 1.0));
  const sun = new THREE.DirectionalLight(0xffd9a8, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x7fb0ff, 1.2); rim.position.set(300, 220, -260); A.add(rim);
  const SUN = new THREE.Vector3(-0.42, 0.5, 0.76).normalize();   // ~30 degrees up, from the front-left: lights the cut face and the hero's face
  function setShadow(cx, cy, cz, size) { sun.target.position.set(cx, cy, cz); sun.position.set(cx + SUN.x * size * 6, cy + SUN.y * size * 6, cz + SUN.z * size * 6); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = size * 0.5; c.far = size * 14; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 60 ? 1.5 : 0.02; }
  const sky = makeSkyDome(THREE, 0x6ea6e6, 0xffe6c4, [SUN.x, SUN.y, SUN.z]); A.add(sky); sky.scale.setScalar(3e6);
  const U = { rS: { value: 0.45 }, depth: { value: 0.0 }, zc: { value: -0.45 }, glow: { value: 0 } };

  // shared GLSL: layered ground colour by depth d (m) with log-scale bands so it reads at every zoom level
  const LAYER_GLSL = `
    float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }
    vec3 layerCol(float d, float x, out float em){
      float L = log(d + 0.02); float n1 = vn(vec2(L * 9.0, x / max(d * 0.6, 0.35))), n2 = vn(vec2(L * 31.0 + 4.0, x / max(d * 0.25, 0.2)));
      vec3 c;
      if (d < 0.32) c = mix(vec3(0.30, 0.18, 0.10), vec3(0.36, 0.22, 0.12), n2);                         // topsoil
      else if (d < 3.0) c = mix(vec3(0.58, 0.36, 0.19), vec3(0.66, 0.43, 0.24), n1);                    // clay
      else if (d < 90.0) c = mix(vec3(0.80, 0.62, 0.38), vec3(0.70, 0.50, 0.30), step(0.5, n1));         // sandstone bands
      else if (d < 3000.0) c = mix(vec3(0.62, 0.57, 0.52), vec3(0.52, 0.47, 0.44), step(0.55, n1));      // grey rock
      else if (d < 35000.0) c = mix(mix(vec3(0.66, 0.52, 0.47), vec3(0.58, 0.44, 0.40), step(0.5, n1)), vec3(0.66, 0.36, 0.24), smoothstep(6000.0, 35000.0, d)); // granite, warming
      else c = mix(mix(vec3(0.92, 0.42, 0.14), vec3(0.85, 0.30, 0.10), step(0.5, n1)), vec3(1.0, 0.55, 0.18), smoothstep(40000.0, 250000.0, d)); // mantle
      c *= 0.9 + 0.2 * n2;
      // pebbles in the near layers (fade out by pixel footprint)
      if (d < 120.0) { vec2 pp = vec2(x, -d) * 16.0; float pb = smoothstep(0.86, 0.9, vn(pp)) * clamp(1.0 - fwidth(pp.x) * 2.0, 0.0, 1.0); c = mix(c, c * 0.55 + vec3(0.18, 0.16, 0.14), pb * 0.8); }
      // thin layer boundary lines
      float lnA = abs(d - 35000.0) / max(fwidth(d) * 1.5, 1e-4); c = mix(vec3(1.0, 0.85, 0.5), c, clamp(lnA, 0.0, 1.0));
      em = smoothstep(9000.0, 120000.0, d) * 0.45;
      return c; }`;
  function layerMat(dark) {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.92, color: 0xffffff, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float rS; uniform float depth; uniform float zc; uniform float glow;\n' + LAYER_GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float dd = max(0.0, -vWp.y); float em; ${dark ? '' : 'if (abs(vWp.x) < rS * 0.9 && dd < depth - rS * 0.12) discard;'}
          vec3 lc = layerCol(dd, vWp.x, em); ${dark ? 'lc *= 0.55; float bot = smoothstep(depth * 0.8, depth, dd); lc = mix(lc, lc * 1.5 + vec3(0.25, 0.1, 0.0) * glow, bot);' : ''}
          diffuseColor.rgb = pow(lc, vec3(2.2));`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += diffuseColor.rgb * em * ${dark ? '1.6' : '1.2'};`); };
    m.customProgramCacheKey = () => 'dighole_layer_' + (dark ? 1 : 0);
    return m; }
  // the cut face (huge, the same plane works from 30 cm to 200 km deep)
  const faceG = new THREE.PlaneGeometry(1, 1, 160, 120); { const p = faceG.attributes.position, kx = Math.log(1 + 6e5 / 0.02), ky = Math.log(1 + 4e5 / 0.02);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) - 0.5; p.setX(i, Math.sign(x) * (Math.exp(Math.abs(2 * x) * kx) - 1) * 0.02); p.setY(i, -(Math.exp(-y * ky) - 1) * 0.02); } }   // fine cells near the hole (float precision of the discard edge)
  const face = new THREE.Mesh(faceG, layerMat(false)); face.receiveShadow = true; face.castShadow = true; A.add(face);
  // grass lip along the top edge of the cut
  const lip = new THREE.Mesh(BX(1, 0.08, 0.06), M(0x5fae44, 0.8)); lip.scale.x = 1.2e6; lip.position.set(0, -0.02, -0.03); A.add(lip);
  // shaft (back half of a cylinder) + its floor
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40, 1, true, Math.PI / 2, Math.PI).translate(0, -0.5, 0), layerMat(true)); shaft.receiveShadow = true; A.add(shaft);
  const shaftFloor = new THREE.Mesh(new THREE.CircleGeometry(1, 40, 0, Math.PI).rotateX(-Math.PI / 2), M(0x4a3020, 0.95)); A.add(shaftFloor);
  // dark dug edge framing the opening in the cut face (left, right, bottom), scales with the drawn hole
  const edgeM = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.95 }); const edgeL = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0), edgeM), edgeR = edgeL.clone(), edgeB = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), edgeM); A.add(edgeL, edgeR, edgeB);
  const bottomGlow = new THREE.PointLight(0xffc27a, 0, 6, 1.5); A.add(bottomGlow);
  const lampL = new THREE.PointLight(0xfff0d8, 2.0, 5, 1.6); A.add(lampL);   // warm 'key' near the hero inside the shaft so his face stays the brightest thing

  // the ground beyond the garden: town -> fields (top surface, z < 0), with the hole mouth cut out
  const groundM = new THREE.MeshStandardMaterial({ roughness: 0.95, color: 0xffffff });
  groundM.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWp; uniform float rS; uniform float zc;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p = vWp.xz; if (length(p - vec2(0.0, zc)) < rS) discard; float d = length(p);
        vec2 cell = floor(p / vec2(420.0, 300.0)); float h = hs(cell); float lod = clamp(1.0 - fwidth(p.x) / 120.0, 0.0, 1.0);
        vec3 fld = h < 0.3 ? vec3(0.42, 0.58, 0.2) : h < 0.55 ? vec3(0.74, 0.66, 0.32) : h < 0.8 ? vec3(0.3, 0.46, 0.16) : vec3(0.62, 0.5, 0.32); fld = mix(vec3(0.5, 0.56, 0.28), fld, lod * 0.9);
        fld *= 0.85 + 0.3 * vn(p / 30000.0);
        vec3 cityC = mix(vec3(0.62, 0.52, 0.42), vec3(0.7, 0.6, 0.48), vn(p / 25.0)); float cityR = 6000.0 + 1500.0 * vn(p / 2000.0);
        diffuseColor.rgb = pow(mix(cityC, fld, smoothstep(cityR - 400.0, cityR + 600.0, d)), vec3(2.0));`); };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 8, 8).rotateX(-Math.PI / 2).translate(0, 0, -0.5), groundM); ground.scale.set(1.2e6, 1, 6e5); ground.receiveShadow = true; A.add(ground);
  // lawn of the garden
  const lawnM = new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(256, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#62b246' : '#6fbf4e'; g.fillRect(0, i * 32, 256, 32); } for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${40 + (k * 37) % 60},${120 + (k * 53) % 70},${30 + (k * 17) % 30},0.5)`; g.fillRect((k * 97) % 256, (k * 61) % 256, 2, 5); } }) });
  lawnM.map.wrapS = lawnM.map.wrapT = THREE.RepeatWrapping; lawnM.map.repeat.set(3, 4);
  lawnM.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float rS; uniform float zc;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (length(vWp.xz - vec2(0.0, zc)) < rS) discard;'); };
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 13).rotateX(-Math.PI / 2), lawnM); lawn.position.set(-1.2, 0.012, -6.5); lawn.receiveShadow = true; A.add(lawn);
  // dirt ring around the hole + dirt pile
  const dirtM = M(0x6a4428, 0.95);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.35, 40, 1, 0, Math.PI).rotateX(-Math.PI / 2).rotateY(Math.PI), dirtM); ring.position.y = 0.02; A.add(ring);
  const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dirtM); pile.castShadow = pile.receiveShadow = true; A.add(pile);

  // ---------------- the hero's house (ochre, green shutters, terracotta roof), the neighbour's (pink), the street to the left ----------------
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a4c, roughness: 0.12, metalness: 0.55, emissive: 0x1a1208, emissiveIntensity: 0.4 });
  const litM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, roughness: 0.3, emissive: 0xffb860, emissiveIntensity: 0.9 });
  const iron = M(0x22262c, 0.5, 0.4);
  function house(x, z, ry, w, floors, o) {
    const g = new THREE.Group(); const B = Builder(); const D = 9, FH = 3.1, Hh = 0.5 + floors * FH;
    const wall = M(o.wall, 0.82), trim = M(o.trim ?? 0xf6efe2, 0.7), shut = M(o.shut, 0.6);
    B.add(BX(w, Hh, D), wall, 0, Hh / 2, -D / 2); B.add(BX(w + 0.1, 0.5, 0.1), M(0xb79a7a, 0.9), 0, 0.25, 0.02);
    const nW = w > 8 ? 3 : 2, sp = w / nW;
    for (let f = 0; f < floors; f++) { const y = 0.5 + f * FH + FH * 0.5;
      for (let k = 0; k < nW; k++) { const wx = -w / 2 + sp * (k + 0.5); const door = f === 0 && k === (o.doorK ?? 0);
        if (door) { B.add(RB(1.1, 2.3, 0.12), M(o.door ?? 0x3f7d5a, 0.5), wx, 1.65, 0.05); B.add(RB(1.4, 0.14, 0.3), trim, wx, 2.9, 0.12); B.add(RB(1.6, 0.18, 0.8), M(0xc9a27a, 0.9), wx, 0.55, 0.4); continue; }
        const lit = R() < 0.22; B.add(BX(1.25, 1.9, 0.06), trim, wx, y, 0.02); B.add(BX(1.0, 1.65, 0.05), lit ? litM : glassM, wx, y, 0.06); B.add(BX(0.06, 1.65, 0.05), trim, wx, y, 0.09); B.add(RB(1.45, 0.12, 0.3, 0.03), trim, wx, y - 1.0, 0.14);
        B.add(RB(0.48, 1.75, 0.07, 0.02), shut, wx - 0.9, y, 0.08, 0, 0.3); B.add(RB(0.48, 1.75, 0.07, 0.02), shut, wx + 0.9, y, 0.08, 0, -0.3);
        if (f === 1 && k === nW - 1) { B.add(RB(1.9, 0.14, 0.85, 0.03), trim, wx, y - 1.05, 0.45); B.add(BX(1.9, 0.05, 0.05), iron, wx, y - 0.15, 0.85); for (let b = 0; b < 8; b++) B.add(BX(0.035, 0.85, 0.035), iron, wx - 0.9 + b * 0.257, y - 0.58, 0.85);
          for (let p = 0; p < 3; p++) { B.add(new THREE.CylinderGeometry(0.14, 0.11, 0.25, 12), M(0xc9683f, 0.85), wx - 0.6 + p * 0.6, y - 0.85, 0.6); B.add(new THREE.SphereGeometry(0.19, 12, 10), M([0xff4f7a, 0xffd23f, 0xc86bff][p], 0.7), wx - 0.6 + p * 0.6, y - 0.62, 0.6); } } }
      if (f > 0) B.add(BX(w + 0.08, 0.16, 0.16), trim, 0, 0.5 + f * FH, 0.06); }
    B.add(BX(w + 0.5, 0.36, 0.7), trim, 0, Hh + 0.1, 0.1);
    const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.3, 0); sh.lineTo(w / 2 + 0.3, 0); sh.lineTo(0, 2.6); sh.closePath(); const rg = new THREE.ExtrudeGeometry(sh, { depth: D + 0.4, bevelEnabled: false }); rg.translate(0, 0, -D - 0.2); B.add(rg, M(o.roof ?? 0xb5523b, 0.85), 0, Hh + 0.25, 0.1);
    B.add(RB(0.7, 1.8, 0.7), M(0x9a4a35, 0.9), w * 0.28, Hh + 1.7, -D * 0.5);
    B.build(g); g.position.set(x, 0, z); g.rotation.y = ry; A.add(g); return g; }
  house(-1.0, -13.2, 0, 10.5, 3, { wall: 0xe0a84a, shut: 0x3f7d5a, doorK: 1 });          // yours
  house(9.2, -12.2, 0, 9.5, 3, { wall: 0xf2b8b0, shut: 0x3a6ea5, doorK: 0, roof: 0xc8643a });   // the neighbour's
  house(19.2, -12.6, 0, 9, 4, { wall: 0xa9c8e0, shut: 0xf6efe2, doorK: 1 });
  // across the side street (facing +x, toward the camera side)
  { const cols = [0xf1e3c4, 0xd0714f, 0x4fa39a, 0xd9b13b, 0xc98a6a, 0xf6d6a0]; let z = -2.5; for (let k = 0; k < 10; k++) { const w = 7 + R() * 2; house(-17.5, z - w / 2, Math.PI / 2, w, 3 + (k % 3), { wall: cols[k % cols.length], shut: [0x9a3b2f, 0x1d3f6e, 0x3f7d5a][k % 3], doorK: k % 2 }); z -= w + 0.1; } }
  // garden walls, the wooden fence to the neighbour, the side street (cobbles, pavement, lamps, trees)
  { const B = Builder(); const g = new THREE.Group(); const stucco = M(0xf2dcc0, 0.85), tile = M(0xb5523b, 0.8);
    B.add(RB(0.3, 1.25, 13, 0.04), stucco, -6.1, 0.62, -6.6); B.add(RB(0.42, 0.1, 13.1, 0.03), tile, -6.1, 1.28, -6.6);
    const wood = M(0xc8955a, 0.75), wood2 = M(0xa87442, 0.75);
    for (let k = 0; k < 15; k++) B.add(RB(0.09, 1.2, 0.78, 0.02), k % 2 ? wood : wood2, 3.62, 0.6, -0.45 - k * 0.82);
    for (let k = 0; k < 6; k++) B.add(RB(0.14, 1.36, 0.14, 0.03), M(0x8a5a30, 0.7), 3.62, 0.68, -0.25 - k * 2.4);
    // washing line with clothes, flower bed, a chair, a parked bike by the wall
    B.add(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), M(0xdddddd, 0.4, 0.4), -4.8, 1.1, -8.5); B.add(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), M(0xdddddd, 0.4, 0.4), 2.4, 1.1, -8.5);
    B.add(new THREE.CylinderGeometry(0.008, 0.008, 7.2, 4).rotateZ(Math.PI / 2), M(0xeeeeee, 0.5), -1.2, 2.1, -8.5);
    [[-4.0, 0xff4f7a], [-3.0, 0xffd23f], [-1.9, 0x2bb3b1], [-0.6, 0xffffff], [0.6, 0x3a7bd5], [1.6, 0xff8a3d]].forEach(([x, c], i) => B.add(RB(0.6 + (i % 2) * 0.2, 0.75 + (i % 3) * 0.1, 0.03, 0.02), M(c, 0.85), x, 1.68 - (i % 3) * 0.05, -8.5));
    B.add(RB(9.2, 0.3, 1.0, 0.08), M(0x7a5a3a, 0.9), -1.4, 0.15, -11.9);
    for (let k = 0; k < 14; k++) B.add(new THREE.SphereGeometry(0.22 + R() * 0.1, 12, 10), M([0xff4f7a, 0xffd23f, 0xc86bff, 0xff8a3d, 0x5fae44][k % 5], 0.7), -5.4 + k * 0.62, 0.45, -11.8 + (R() - 0.5) * 0.4);
    const chairC = M(0x2bb3b1, 0.55); B.add(RB(0.5, 0.06, 0.5, 0.02), chairC, -3.9, 0.47, -3.4); B.add(RB(0.5, 0.55, 0.06, 0.02), chairC, -3.9, 0.78, -3.66); for (const [dx, dz] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]]) B.add(RB(0.04, 0.47, 0.04, 0.015), M(0x22262c, 0.5), -3.9 + dx, 0.235, -3.4 + dz);
    B.add(RB(1.2, 0.05, 0.8, 0.02), M(0xf6efe2, 0.6), -4.2, 0.72, -5.2); B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), M(0x22262c, 0.5), -4.2, 0.36, -5.2);
    B.add(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 16), M(0xff4f7a, 0.35), -4.0, 0.8, -5.1);
    // side street
    const cob = new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(256, 256, (g) => { g.fillStyle = '#6d6259'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = `hsl(${25 + (x * 7 + y * 13) % 12}, 14%, ${40 + ((x * 31 + y * 17) % 13)}%)`; g.beginPath(); g.roundRect(x * 32 + 2 + (y % 2) * 16, y * 32 + 2, 28, 28, 7); g.fill(); } }) });
    cob.map.wrapS = cob.map.wrapT = THREE.RepeatWrapping; cob.map.repeat.set(3, 40); const road = new THREE.Mesh(BX(8, 0.08, 160).translate(0, 0, -80), cob); road.position.set(-11.6, 0.04, 0); road.receiveShadow = true; g.add(road);
    const pav = M(0xd9cbb0, 0.85); B.add(BX(1.4, 0.16, 160).translate(0, 0, -80), pav, -6.95, 0.08, 0); B.add(BX(1.8, 0.16, 160).translate(0, 0, -80), pav, -16.5, 0.08, 0);
    B.build(g); A.add(g);
    for (const z of [-6, -26, -46, -66]) { const lg = new THREE.Group(); const LB = Builder(); LB.add(new THREE.CylinderGeometry(0.07, 0.12, 4.4, 14), M(0x1d2a26, 0.5, 0.3), 0, 2.2, 0); LB.build(lg); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: 0.8 })); hd.position.set(0.4, 4.3, 0); lg.add(hd); lg.position.set(-7.3, 0.16, z); A.add(lg); }
    for (const z of [-16, -36, -56]) { const tg = new THREE.Group(); const TB = Builder(); TB.add(new THREE.CylinderGeometry(0.12, 0.18, 3.0, 10), M(0x6a4a30, 0.9), 0, 1.5, 0); for (let k = 0; k < 6; k++) TB.add(new THREE.SphereGeometry(0.9 + R() * 0.35, 16, 12), M(k % 2 ? 0x4c9a3c : 0x6fb84a, 0.85), (R() - 0.5) * 1.2, 3.5 + R() * 0.9, (R() - 0.5) * 1.2); TB.build(tg); tg.position.set(-16.3, 0.16, z); A.add(tg); }
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.7), signMat('PANADERÍA SOL', '#ffd23f', '#5a2a10')); sg.position.set(-17.45, 3.4, -6.5); sg.rotation.y = Math.PI / 2; A.add(sg);
    const sg2 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.7), signMat('FARMACIA', '#1f8a4c', '#ffffff')); sg2.position.set(-17.45, 3.4, -14.5); sg2.rotation.y = Math.PI / 2; A.add(sg2);
    const aw = new THREE.Mesh(BX(1.4, 0.07, 4.5), stripeMat('#ff5fa2', '#ffffff')); aw.position.set(-16.9, 2.8, -22.5); aw.rotation.z = 0.33; A.add(aw); }
  // the rest of the town (instanced blocks with roofs) out to ~5 km, a few towers far away
  { const blk = [], pal = [0xe0a84a, 0xf2b8b0, 0xf1e3c4, 0xd0714f, 0xa9c8e0, 0x4fa39a, 0xd9b13b, 0xe9d2b0, 0xc98a6a, 0xf6d6a0];
    for (let x = -5000; x <= 5000; x += 60) for (let z = -5000; z <= -40; z += 44) { if (Math.hypot(x, z) > 4800 + R() * 900) continue; if (Math.abs(x) < 50 && z > -60) continue; blk.push([x + (R() - 0.5) * 8, z, 44 + R() * 10, 30 + R() * 6, 11 + R() * 9, pal[Math.floor(R() * pal.length)]]); }
    for (let k = 0; k < 14; k++) blk.push([-2500 + R() * 5000, -3500 - R() * 1500, 30 + R() * 25, 30 + R() * 25, 90 + R() * 150, [0x4a5f74, 0x6f8fa8, 0x8aa6b8][k % 3]]);
    const bM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.85 }), blk.length);
    blk.forEach(([x, z, w, d, h, c], k) => { m4.compose(v.set(x, 0, z), q.identity(), sc.set(w, h, d)); bM.setMatrixAt(k, m4); bM.setColorAt(k, col.set(c)); }); bM.castShadow = bM.receiveShadow = true; A.add(bM);
    const rs = new THREE.Shape(); rs.moveTo(-0.5, 0); rs.lineTo(0.5, 0); rs.lineTo(0, 0.5); rs.closePath(); const rM = new THREE.InstancedMesh(new THREE.ExtrudeGeometry(rs, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5), new THREE.MeshStandardMaterial({ roughness: 0.85 }), blk.length - 14);
    blk.slice(0, -14).forEach(([x, z, w, d, h], k) => { m4.compose(v.set(x, h, z), q.identity(), sc.set(w, 6, d)); rM.setMatrixAt(k, m4); rM.setColorAt(k, col.set([0xb5523b, 0xc8643a, 0x9a4a35][k % 3])); }); rM.castShadow = true; A.add(rM); }
  // clouds
  const cloudM = new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xfff6ea, transparent: true, opacity: 0.8, depthWrite: false, fog: true });
  for (let k = 0; k < 90; k++) { const x = (R() - 0.5) * 2.4e5, z = -3000 - R() * 2e5; const s = new THREE.Sprite(cloudM); s.position.set(x, 700 + R() * 500, z); s.scale.set(2200 + R() * 2600, 700 + R() * 500, 1); A.add(s); }
  // cars on the side street
  const CG = carGeos(THREE); const carCols = [0xe63946, 0x2bb3b1, 0xffd23f, 0x3a7bd5, 0xfdfbf5, 0xff8a3d];
  const carB = new THREE.InstancedMesh(CG.body, new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 }), 6), carT = new THREE.InstancedMesh(CG.top, new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.2, metalness: 0.5 }), 6);
  carB.castShadow = carT.castShadow = true; carB.frustumCulled = carT.frustumCulled = false; A.add(carB, carT);
  const cars = []; for (let k = 0; k < 6; k++) { const dir = k % 2 ? 1 : -1; cars.push({ x: dir > 0 ? -10.0 : -13.2, dir, z0: -10 - k * 22, sp: 6 + R() * 3 }); carB.setColorAt(k, col.set(carCols[k])); }
  const SL = makeStreetLife(THREE, A, { seed: 19, z: 0, only: ['dog', 'phone'], dogX: -7.0, dogZ: -72, dogDir: 1, phX: -16.6, phZ: -30, dogColor: 0xd9c38a });

  // ---------------- the water pipe (2 m step) + the spray ----------------
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 16).rotateZ(Math.PI / 2), M(0x8a96a3, 0.35, 0.6)); pipe.position.set(0, -1.0, -0.28); A.add(pipe);
  const sprayIn = makeBurst(THREE, 70, { seed: 5, origin: (r) => [(r() - 0.5) * 0.1, -1.0, -0.4], dir: (r) => [(r() - 0.5) * 0.5, 1, (r() - 0.5) * 0.3], speed: [4.5, 6.5], life: [0.5, 0.9], delay: 0.3, gravity: 9.8, size: 7, color: 0xa8dcff, opacity: 0.9 }); A.add(sprayIn);
  const sprayIn2 = makeBurst(THREE, 70, { seed: 6, origin: (r) => [(r() - 0.5) * 0.1, -1.0, -0.4], dir: (r) => [(r() - 0.5) * 0.5, 1, (r() - 0.5) * 0.3], speed: [4.5, 6.5], life: [0.5, 0.9], delay: 0.3, gravity: 9.8, size: 7, color: 0xcff0ff, opacity: 0.9 }); A.add(sprayIn2);

  // ---------------- scale outlines drawn on the cut face (white line art, real sizes) ----------------
  function outline(w, h, draw, x, yTop) { const tex = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => { g.strokeStyle = 'rgba(255,255,255,0.95)'; g.fillStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = cw * 0.02; g.lineJoin = 'round'; g.setLineDash([]); draw(g, cw, ch); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 })); m.position.set(x, yTop - h / 2, Math.max(0.05, w * 0.01)); m.renderOrder = 3; A.add(m); return m; }
  const bld = outline(20, 60, (g, w, h) => { g.beginPath(); g.rect(w * 0.08, h * 0.01, w * 0.84, h * 0.98); g.fill(); g.stroke(); g.lineWidth = w * 0.006; for (let f = 1; f < 20; f++) { g.beginPath(); g.moveTo(w * 0.08, h * 0.01 + f * h * 0.98 / 20); g.lineTo(w * 0.92, h * 0.01 + f * h * 0.98 / 20); g.stroke(); } }, -16, 0);
  const eif = outline(125, 330, (g, w, h) => { const P = (x, y) => [w * x, h * y]; g.beginPath(); g.moveTo(...P(0.5, 0.0)); g.lineTo(...P(0.56, 0.3)); g.lineTo(...P(0.66, 0.62)); g.lineTo(...P(0.98, 1.0)); g.lineTo(...P(0.72, 1.0)); g.quadraticCurveTo(...P(0.5, 0.8), ...P(0.28, 1.0)); g.lineTo(...P(0.02, 1.0)); g.lineTo(...P(0.34, 0.62)); g.lineTo(...P(0.44, 0.3)); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(...P(0.3, 0.62)); g.lineTo(...P(0.7, 0.62)); g.moveTo(...P(0.42, 0.36)); g.lineTo(...P(0.58, 0.36)); g.stroke(); }, -150, -12);
  const cave = outline(1000, 2300, (g, w, h) => { const r = rng(7); g.beginPath(); let x = w * 0.5, y = 0; g.moveTo(x, y); for (let k = 1; k <= 40; k++) { x = w * (0.5 + 0.32 * Math.sin(k * 0.7) + (r() - 0.5) * 0.12); y = h * k / 40 * 0.96; g.lineTo(x, y); } g.lineWidth = w * 0.03; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke(); for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(w * (0.3 + r() * 0.4), h * (0.2 + k * 0.13), w * 0.08, h * 0.015, 0, 0, 7); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill(); } }, -950, -10);
  const mine = outline(1400, 4200, (g, w, h) => { g.lineWidth = w * 0.014; g.beginPath(); g.moveTo(w * 0.5, h * 0.0); g.lineTo(w * 0.5, h * 0.96); g.stroke(); for (const [y, l, r2] of [[0.3, 0.2, 0.75], [0.55, 0.15, 0.85], [0.78, 0.25, 0.8], [0.95, 0.1, 0.9]]) { g.beginPath(); g.moveTo(w * l, h * y); g.lineTo(w * r2, h * y); g.stroke(); } }, 1150, 0);
  const kola = outline(3000, 12400, (g, w, h) => { g.lineWidth = w * 0.02; g.beginPath(); g.moveTo(w * 0.5, 0); g.lineTo(w * 0.5, h * 0.99); g.stroke(); g.beginPath(); g.arc(w * 0.5, h * 0.99, w * 0.05, 0, 7); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill(); }, -7000, 0);
  const headframe = new THREE.Group(); { const HB = Builder(); const st = M(0x9aa3ad, 0.4, 0.6); HB.add(BX(30, 80, 30).translate(0, 40, 0), M(0xc94b3b, 0.6), 0, 0, 0); HB.add(BX(44, 14, 44).translate(0, 87, 0), st, 0, 0, 0); HB.add(new THREE.CylinderGeometry(6, 6, 50, 16), st, 0, 30, 30); HB.build(headframe); headframe.position.set(1150, 0, -60); A.add(headframe); }
  const rig = new THREE.Group(); { const HB = Builder(); HB.add(new THREE.CylinderGeometry(4, 22, 120, 4).translate(0, 60, 0), M(0xe0a84a, 0.6, 0.3), 0, 0, 0); HB.add(BX(70, 20, 40).translate(0, 10, 0), M(0x3a7bd5, 0.6), 30, 0, 0); HB.build(rig); rig.position.set(-7000, 0, -50); A.add(rig); }

  // ---------------- people: you (with a spade), Mittens, the Filmer, the Pigeon, the tiny lemon tree ----------------
  const P = makePerson(THREE, { shirt: 0x2bb3b1, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xffffff, seed: 5, hairStyle: 'short' }); P.group.rotation.order = 'YXZ';
  const heroG = new THREE.Group(); heroG.add(P.group); A.add(heroG);
  const spade = new THREE.Group(); { const SB = Builder(); SB.add(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 10), M(0xc27a35, 0.6), 0, 0, 0); SB.add(RB(0.2, 0.045, 0.04, 0.01), M(0x22262c, 0.5), 0, 0.53, 0); SB.add(RB(0.2, 0.26, 0.025, 0.02), M(0xb0b8c0, 0.3, 0.7), 0, -0.62, 0.0); SB.build(spade); heroG.add(spade); }
  const dirtA = makeBurst(THREE, 26, { seed: 8, origin: (r) => [(r() - 0.5) * 0.2, 0.2, 0.15], dir: (r) => [(r() - 0.5) * 0.6 - 0.5, 1, (r() - 0.5) * 0.6], speed: [2.6, 4.0], life: [0.6, 0.9], gravity: 9.8, size: 6, color: 0x6a4428, opacity: 1, square: true });
  const dirtB = makeBurst(THREE, 26, { seed: 9, origin: (r) => [(r() - 0.5) * 0.2, 0.2, 0.15], dir: (r) => [(r() - 0.5) * 0.6 + 0.5, 1, (r() - 0.5) * 0.6], speed: [2.6, 4.0], life: [0.6, 0.9], gravity: 9.8, size: 6, color: 0x7a5232, opacity: 1, square: true });
  heroG.add(dirtA, dirtB);
  const mittens = makeCat(THREE, 0xf0a040); mittens.rotation.order = 'YXZ'; mittens.scale.setScalar(0.75); A.add(mittens);
  const mc = makeCatCam(THREE, 0xf0a040, 0xffe3c4);
  const tree = new THREE.Group(); { const TB = Builder(); TB.add(new THREE.CylinderGeometry(0.17, 0.12, 0.3, 18), M(0xc9683f, 0.8), 0, 0.15, 0); TB.add(new THREE.TorusGeometry(0.17, 0.025, 8, 20).rotateX(Math.PI / 2), M(0xc9683f, 0.8), 0, 0.3, 0);
    TB.add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), M(0x4a3020, 0.9), 0, 0.29, 0); TB.add(new THREE.CylinderGeometry(0.015, 0.02, 0.45, 8), M(0x6a4a30, 0.9), 0, 0.5, 0);
    for (let k = 0; k < 7; k++) TB.add(new THREE.SphereGeometry(0.11 + R() * 0.04, 14, 10), M(k % 2 ? 0x3f9a3c : 0x5fb84a, 0.8), (R() - 0.5) * 0.22, 0.78 + R() * 0.15, (R() - 0.5) * 0.22);
    for (let k = 0; k < 3; k++) TB.add(new THREE.SphereGeometry(0.035, 12, 10), M(0xffe03a, 0.4), (R() - 0.5) * 0.25, 0.72 + R() * 0.12, 0.1 + R() * 0.06);
    TB.build(tree); tree.position.set(-1.1, 0.0, -0.75); A.add(tree); }
  const filmer = makePerson(THREE, { shirt: 0xff8a3d, pants: 0x30405a, hair: 0x111111, skin: 0xb5835a, shoe: 0x3a2a1e, seed: 31, hairStyle: 'short' }); filmer.group.rotation.order = 'YXZ'; A.add(filmer.group);
  const phoneM = [M(0x111111, 0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x9fd8ff })];
  const phone = new THREE.Mesh(RB(0.08, 0.15, 0.012, 0.008), phoneM[0]); A.add(phone);
  function makePigeon() { const pg = new THREE.Group(); const gm = M(0x8d94a0, 0.6), nk = new THREE.MeshStandardMaterial({ color: 0x5f8a7a, roughness: 0.4, metalness: 0.3 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), gm); b.scale.set(0.85, 0.8, 1.25); b.position.y = 0.12; pg.add(b);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.02, 0.12, 2, 0.01), M(0x4a4f58, 0.6)); tl.position.set(0, 0.12, -0.15); tl.rotation.x = 0.4; pg.add(tl);
    const hp = new THREE.Group(); hp.position.set(0, 0.2, 0.08); pg.add(hp); const h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), nk); h.position.set(0, 0.04, 0.03); hp.add(h);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 8).rotateX(Math.PI / 2), M(0xd9a05a, 0.5)); bk.position.set(0, 0.035, 0.1); hp.add(bk);
    for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M(0xff7a1a, 0.3)); ey.position.set(sx * 0.04, 0.06, 0.06); hp.add(ey); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M(0x111111, 0.3)); pu.position.set(sx * 0.047, 0.062, 0.07); hp.add(pu);
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), M(0xe06a6a, 0.6)); lg.position.set(sx * 0.03, 0.03, 0.02); pg.add(lg); }
    pg.userData.head = hp; pg.traverse(o => { if (o.isMesh) o.castShadow = true; }); return pg; }
  const pigeon = makePigeon(); A.add(pigeon);
  const blobM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });

  // the Filmer's reaction cam (shown inside the round inset for ~2 s in the 100 km step): his face lit orange from below
  const FC = (() => { const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffd6b0); scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a0c0, 0.9));
    const kL = new THREE.PointLight(0xff7a2a, 6, 4, 1.2); kL.position.set(0, 0.9, 0.9); scene.add(kL); const d = new THREE.DirectionalLight(0xfff0d8, 1.4); d.position.set(1, 3, 2); scene.add(d);
    const p = makePerson(THREE, { shirt: 0xff8a3d, pants: 0x30405a, hair: 0x111111, skin: 0xb5835a, seed: 31, hairStyle: 'short' }); scene.add(p.group);
    const ph = new THREE.Mesh(RB(0.08, 0.15, 0.012, 0.008), M(0x111111, 0.3, 0.2)); scene.add(ph);
    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 20); camera.position.set(0.15, 1.72, 1.55); camera.lookAt(0, 1.62, 0);
    return { scene, camera, update(t) { p.armR.rotation.set(-1.9, 0, 0.35); p.armL.rotation.set(-1.7, 0, -0.35); p.headPivot.rotation.set(0.22, 0, 0); setFace(p, { brows: 'up', eyes: 1.2, mouth: 'smile', look: [0, -0.8] }); life(p, t, 0.8);
      p.group.updateMatrixWorld(true); p.armR.userData.end.getWorldPosition(tv); ph.position.copy(tv).add(v.set(-0.08, 0.08, 0.06)); ph.rotation.set(-0.5, 0, 0); } }; })();

  // =====================================================================================================
  // SCENE B — cut-away Earth (km). Cut plane z = 0; the hole runs straight down the middle from Madrid (top) to New Zealand (bottom).
  // =====================================================================================================
  const B = new THREE.Scene(); B.background = new THREE.Color(0x050a24); const camB = new THREE.PerspectiveCamera(40, W / H, 10, 5e5);
  B.add(stars(THREE, 3000, 2e5, 17)); B.add(new THREE.HemisphereLight(0xcfe0ff, 0x30285a, 0.7)); const sunB = new THREE.DirectionalLight(0xfff3e0, 3.0); sunB.position.set(0.8, 0.5, 0.35); B.add(sunB);
  const RE = 6371; const eTmp = makeEarth(THREE, RE, 18); const eTex = eTmp.userData.earth.material.map;
  const earthB = new THREE.Mesh(new THREE.SphereGeometry(RE, 128, 64, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ map: eTex, roughness: 0.85, side: THREE.DoubleSide })); B.add(earthB);
  const atmB = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.012, 96, 48, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6fb0ff, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); B.add(atmB);
  const UB = { depth: { value: 0 }, w: { value: 60 } };
  const discM = new THREE.ShaderMaterial({ uniforms: UB, side: THREE.DoubleSide,
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
varying vec2 vP; uniform float depth; uniform float w;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }
      void main(){
#include <logdepthbuf_fragment>
        float r = length(vP); float n = vn(vP / 380.0) * 0.6 + vn(vP / 120.0) * 0.4; vec3 c;
        if (r > 6300.0) c = vec3(0.55, 0.38, 0.26);
        else if (r > 3480.0) { float u = (r - 3480.0) / 2820.0; c = mix(vec3(1.0, 0.36, 0.08), vec3(0.78, 0.22, 0.08), u) * (0.85 + 0.3 * n); }
        else if (r > 1220.0) { float u = (r - 1220.0) / 2260.0; c = mix(vec3(1.0, 0.74, 0.22), vec3(1.0, 0.55, 0.1), u) * (0.9 + 0.2 * n); }
        else c = mix(vec3(1.0, 0.9, 0.62), vec3(1.0, 0.84, 0.45), r / 1220.0);
        float edge = min(min(abs(r - 3480.0), abs(r - 1220.0)), abs(r - 6300.0)); c = mix(vec3(1.0, 0.95, 0.8), c, smoothstep(0.0, 18.0 + fwidth(r) * 1.5, edge));
        float dd = 6371.0 - vP.y; if (abs(vP.x) < w && dd < depth) { c = mix(vec3(0.08, 0.04, 0.02), vec3(1.0, 0.9, 0.6), smoothstep(depth - w * 6.0, depth, dd) * 0.0) ; c = vec3(0.07, 0.035, 0.02); }
        if (abs(abs(vP.x) - w) < fwidth(vP.x) * 1.5 && dd < depth) c = vec3(1.0, 0.9, 0.55);
        gl_FragColor = vec4(c, 1.0); }` });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(RE * 0.9995, 160), discM); B.add(disc);
  const markB = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE, 128), color: 0xfff2a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); B.add(markB);
  const heroB = makePerson(THREE, { shirt: 0x2bb3b1, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xffffff, seed: 5, hairStyle: 'short' }); B.add(heroB.group);
  const keyB = new THREE.PointLight(0xfff0d8, 3, 0, 0); B.add(keyB);

  // =====================================================================================================
  // SCENE C — a sheep field near Weber, New Zealand (metres), golden light; you climb out of the hole
  // =====================================================================================================
  const C = new THREE.Scene(); const camC = new THREE.PerspectiveCamera(40, W / H, 0.05, 2e4); C.fog = new THREE.FogExp2(0xe9e2c8, 0.004);
  C.add(new THREE.HemisphereLight(0xdce9ff, 0x7a8a46, 1.0)); const sunC = new THREE.DirectionalLight(0xffd9a8, 3.0); sunC.position.set(-6, 5, 8); sunC.castShadow = true; sunC.shadow.mapSize.set(2048, 2048); { const c = sunC.shadow.camera; c.left = c.bottom = -10; c.right = c.top = 10; c.near = 0.5; c.far = 40; } C.add(sunC);
  const rimC = new THREE.DirectionalLight(0x7fb0ff, 1.0); rimC.position.set(5, 4, -6); C.add(rimC);
  const skyC = makeSkyDome(THREE, 0x6ea6e6, 0xffe6c4, [-0.5, 0.35, 0.8]); skyC.scale.setScalar(1e4); C.add(skyC);
  const hillsM = new THREE.MeshStandardMaterial({ roughness: 0.95, color: 0x6fb84a });
  const hillsG = new THREE.PlaneGeometry(4000, 4000, 160, 160).rotateX(-Math.PI / 2); { const p = hillsG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z); p.setY(i, (Math.sin(x / 60) * Math.cos(z / 80) * 9 + Math.sin(x / 23 + z / 31) * 3) * smooth(25, 120, r)); } hillsG.computeVertexNormals(); }
  const hills = new THREE.Mesh(hillsG, hillsM); hills.receiveShadow = true; C.add(hills);
  const cGrass = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.9, map: lawnM.map })); cGrass.position.y = 0.01; cGrass.receiveShadow = true; C.add(cGrass);
  const holeC = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32).rotateX(-Math.PI / 2), M(0x1a0f08, 0.95)); holeC.position.set(0, 0.02, 0); C.add(holeC);
  const ringC = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.85, 32).rotateX(-Math.PI / 2), dirtM); ringC.position.y = 0.025; C.add(ringC);
  const glowC = new THREE.PointLight(0xffa040, 0, 4, 1.5); glowC.position.set(0, 0.3, 0); C.add(glowC);
  { const FB = Builder(); const g = new THREE.Group(); const wd = M(0x9a7a52, 0.8); for (let k = 0; k < 14; k++) FB.add(RB(0.12, 1.1, 0.12, 0.03), wd, -9 + k * 1.6, 0.55, -5); for (const y of [0.45, 0.9]) FB.add(new THREE.CylinderGeometry(0.012, 0.012, 21, 4).rotateZ(Math.PI / 2), M(0xcccccc, 0.4, 0.5), 1.4, y, -5);
    for (let k = 0; k < 4; k++) { const tx = [-14, 9, 18, -22][k], tz = [-18, -24, -10, -8][k]; FB.add(new THREE.CylinderGeometry(0.15, 0.22, 3, 10), M(0x6a4a30, 0.9), tx, 1.5, tz); for (let j = 0; j < 5; j++) FB.add(new THREE.SphereGeometry(1.2 + R() * 0.4, 14, 10), M(j % 2 ? 0x2f7a3a : 0x3f8a3a, 0.85), tx + (R() - 0.5) * 1.5, 3.6 + R(), tz + (R() - 0.5) * 1.5); }
    FB.build(g); C.add(g);
    const sgn = new THREE.Group(); const sb = new THREE.Mesh(RB(1.6, 0.6, 0.06, 0.03), M(0xf6efe2, 0.6)); sgn.add(sb); const st = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), signMat('WEBER', '#1f6a3a', '#ffffff', 512, 170)); st.position.z = 0.035; sgn.add(st); const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), M(0x9a7a52, 0.8)); pst.position.y = -0.9; sgn.add(pst); sgn.position.set(2.6, 1.55, -3.2); sgn.rotation.y = -0.3; C.add(sgn); }
  const sheep = []; { const wool = M(0xf7f3ea, 0.95), face_ = M(0x2a2a2a, 0.6); for (let k = 0; k < 6; k++) { const s = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), wool); b.scale.set(0.95, 0.85, 1.3); b.position.y = 0.62; s.add(b);
      for (let j = 0; j < 5; j++) { const pf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), wool); pf.position.set((R() - 0.5) * 0.5, 0.85 + R() * 0.12, (R() - 0.5) * 0.7); s.add(pf); }
      const hp = new THREE.Group(); hp.position.set(0, 0.78, 0.52); s.add(hp); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), face_); hd.scale.set(0.85, 1, 1.2); hd.position.set(0, 0, 0.08); hp.add(hd);
      for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M(0xffffff, 0.3)); ey.position.set(sx * 0.08, 0.05, 0.2); hp.add(ey); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M(0x111111, 0.3)); pu.position.set(sx * 0.085, 0.05, 0.24); hp.add(pu);
        const er = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), face_); er.scale.set(1.6, 0.6, 0.8); er.position.set(sx * 0.17, 0.06, 0.02); hp.add(er); }
      for (const [lx, lz] of [[-0.18, -0.3], [0.18, -0.3], [-0.18, 0.3], [0.18, 0.3]]) { const lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), face_); lg.position.set(lx, 0.2, lz); s.add(lg); }
      const pos = [[-1.9, 0.6], [1.7, -0.6], [-0.6, -2.4], [2.9, 1.3], [-3.4, -1.6], [0.9, -3.6]][k]; s.position.set(pos[0], 0, pos[1]); s.rotation.y = Math.atan2(-pos[0], -pos[1]) + (R() - 0.5) * 0.3; s.userData.hp = hp;
      s.traverse(o => { if (o.isMesh) o.castShadow = true; }); C.add(s); sheep.push(s); } }
  const heroC = makePerson(THREE, { shirt: 0x2bb3b1, pants: 0x1d3f6e, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xffffff, seed: 5, hairStyle: 'short' }); heroC.group.rotation.order = 'YXZ'; C.add(heroC.group);
  const spadeC = spade.clone(); C.add(spadeC);
  const dustC = makeBurst(THREE, 60, { seed: 12, origin: (r) => [(r() - 0.5) * 0.6, 0.1, (r() - 0.5) * 0.6], dir: (r) => { const a = r() * 6.28; return [Math.cos(a), 0.8 + r(), Math.sin(a)]; }, speed: [1.5, 3.2], life: [0.7, 1.3], gravity: 5, size: 9, color: 0x8a6a48, opacity: 0.8 }); C.add(dustC);

  await document.fonts.ready;

  // ---------------- poses ----------------
  // digging cycle: ph 0..1 (0-0.45 push the spade in, 0.45-0.7 lift, 0.7-0.85 toss over the shoulder, 0.85-1 back)
  function digPose(Q, sp, ph, amp = 1) { const push = smooth(0, 0.4, ph) * (1 - smooth(0.45, 0.7, ph)), lift = smooth(0.45, 0.7, ph) * (1 - smooth(0.85, 1, ph)), toss = pulse(ph, 0.7, 0.2);
    Q.torso.rotation.set(0.25 + 0.35 * push * amp - 0.15 * toss, 0.2 * toss, 0); Q.armL.rotation.set(-0.9 - 0.5 * push - 0.9 * lift, 0, -0.18); Q.armR.rotation.set(-0.7 - 0.4 * push - 1.2 * lift, 0, 0.2);
    Q.legL.rotation.set(-0.3 * push, 0, -0.06); Q.legR.rotation.set(0.15 * push, 0, 0.06); Q.headPivot.rotation.set(0.15 + 0.2 * push - 0.25 * lift, 0, 0);
    Q.group.position.y -= 0.08 * push;
    sp.position.set(0.02, 1.0 - 0.45 * push + 0.35 * lift, 0.42 + 0.1 * lift); sp.rotation.set(0.35 - 0.3 * push - 0.9 * lift + 0.8 * toss, 0, 0.1); }

  const MOODS = ['neutral', 'sleepy', 'unimpressed', 'annoyed', 'unimpressed', 'shock', 'annoyed', 'scared', 'smug', 'shock', 'unimpressed', 'scared', 'shock'];
  const sp = (a, b, c, d, u) => { const u2 = u * u, u3 = u2 * u; return 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); };

  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.3, bloomThreshold: 0.9, shake: 0, flash: 0, t, env: 0.45, exposure: 1.16, sat: 1.28 };
    const k = stepOf(t); out.step = k; const d = depthAt(t); out.depth = d;
    const mood = t >= ASK ? 'happy' : t >= PUNCH ? 'smug' : MOODS[k];
    mc.update(t, mood);
    let scene = A, camera = cam, dof = 0.3, focusY = 0.52, focusH = 0.22;
    const digPh = (t * 1.45) % 1;
    if (t < CUTB || t >= PUNCH) {
      const fin = t >= PUNCH;
      // ---------- scene A ----------
      const dA = fin ? 0.0 : d; const camDist = fin ? 3 : Math.max(lerp(5.0, 3.6, smooth(ST(2) - 0.3, ST(2) + 0.6, t)), dA * 3.34);   // framing distance (surface ~0.2 H, bottom ~0.59 H)
      const rS = Math.max(0.45, camDist * 0.02); const zc = 0; U.rS.value = fin ? 0.45 : rS; U.depth.value = fin ? 30 : dA; U.zc.value = 0; U.glow.value = smooth(5000, 60000, dA);
      shaft.scale.set(U.rS.value, Math.max(0.01, U.depth.value), U.rS.value); shaft.position.set(0, 0, U.zc.value); shaftFloor.scale.setScalar(U.rS.value); shaftFloor.position.set(0, -U.depth.value + 0.002, U.zc.value);
      { const r_ = U.rS.value, d_ = Math.max(0.01, U.depth.value), w_ = r_ * 0.3; edgeL.scale.set(w_, d_ + r_ * 0.1, 1); edgeL.position.set(-r_ * 0.9 - w_ * 0.5 + w_ * 0.5, 0, 0.004 * Math.max(1, r_)); edgeR.scale.copy(edgeL.scale); edgeR.position.set(r_ * 0.9 - w_ * 0.5 + w_ * 0.5 - 0, 0, edgeL.position.z);
        edgeL.position.x = -r_ * 0.9 + w_ * 0.5 - w_ * 0.35; edgeR.position.x = r_ * 0.9 - w_ * 0.5 + w_ * 0.35; edgeB.scale.set(r_ * 2.2, r_ * 0.4, 1); edgeB.position.set(0, -d_ + r_ * 0.02, edgeL.position.z); }
      ring.scale.setScalar(U.rS.value); ring.position.set(0, 0.02, U.zc.value);
      const pileS = fin ? 0.9 : Math.min(1.4, 0.25 + 0.6 * Math.sqrt(dA)) ; pile.scale.set(pileS * 1.1, pileS * 0.55, pileS * 0.9); pile.position.set(-2.6, 0, -2.4);
      // hero: standing at the hole edge (opening) -> inside the shaft at the bottom, scaled up with the drawn-wider hole
      const hs = rS / 0.45; const inHole = smooth(ST(2) - 0.2, ST(2) + 0.5, t);
      heroG.visible = !fin; spade.visible = !fin;
      if (!fin) { heroG.scale.setScalar(hs); const yIn = -dA + 0.0; heroG.position.set(lerp(0.75, 0.0, inHole) * hs, lerp(0, yIn, inHole), lerp(-0.55, -rS * 0.5, inHole)); heroG.rotation.set(0, lerp(-0.5, -0.25, inHole), 0);
        P.group.position.set(0, 0, 0); P.group.rotation.set(0, 0, 0);
        const digging = (t > 0.8 && !(k === 2 && t > ST(2) + 0.4 && t < ST(2) + 2.4));
        if (digging) digPose(P, spade, digPh, 1); else { P.torso.rotation.set(0, 0, 0); P.armL.rotation.set(-0.4, 0, -0.5); P.armR.rotation.set(-2.4, 0, 0.3); P.legL.rotation.set(0, 0, -0.05); P.legR.rotation.set(0, 0, 0.05); P.headPivot.rotation.set(-0.3, 0, 0); spade.position.set(0.3, 0.6, 0.25); spade.rotation.set(0.2, 0, 0.4); }
        let face = { brows: 'neutral', eyes: 1.0, mouth: 'smile', look: [0, -0.4] };
        if (t < T1) face = { brows: 'neutral', eyes: 1.0, mouth: 'smile', look: [0.2, -0.3] };
        else if (k === 2 && t > ST(2) + 0.4 && t < ST(2) + 2.4) face = { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.5, look: [0, 0.8] };
        else if (k >= 3 && k <= 5) face = { brows: 'squint', eyes: 0.9, mouth: 'grit', look: [0, -0.6] };
        else if (k >= 6) face = { brows: 'worried', eyes: 1.1, mouth: 'open', open: 1.0, look: [0, -0.5] };
        if (k === 9) face = { brows: 'up', eyes: 1.2, mouth: 'smile', look: [0, -0.4] };
        setFace(P, face); life(P, t, 0.8);
        const tossT = Math.floor(t * 1.45) / 1.45 + 0.7 / 1.45; dirtA.userData.update(t, digging ? tossT : -99); dirtB.userData.update(t, digging ? tossT - 1 / 1.45 : -99);
        dirtA.position.set(0, 0.2, 0.4); dirtB.position.copy(dirtA.position); }
      // Mittens next to the hole, the tree, the pigeon (fence post -> on top of the tree at the end)
      mittens.position.set(-0.55, 0.0, -1.35); mittens.rotation.set(fin ? 0.25 : 0, fin ? 0.9 : 0.45 + 0.25 * Math.sin(t * 0.5) * 0, 0); setCatFace(mittens, fin ? (t >= ASK ? 'happy' : 'annoyed') : MOODS[Math.min(k, 3)], 0.25); catLife(mittens, t, 1);
      const pgOnTree = fin; pigeon.position.set(pgOnTree ? -1.1 : 3.62, pgOnTree ? 0.98 : 1.37, pgOnTree ? -0.72 : -0.25); pigeon.rotation.set(0, pgOnTree ? 0.45 : 0.3, 0); pigeon.scale.setScalar(pgOnTree ? 0.8 : 1);
      pigeon.userData.head.position.z = 0.08 + 0.025 * Math.sin(t * 7) * (Math.sin(t * 0.9) > 0 ? 1 : 0); pigeon.userData.head.rotation.y = 0.5 * Math.sin(Math.floor(t * 0.8) * 2.1);
      // the Filmer leans on the fence; phone up from step 3
      { const up = smooth(ST(3) - 0.3, ST(3) + 0.4, t) || (fin ? 1 : 0); const G = filmer.group; G.position.set(4.25, 0, -1.6); G.rotation.set(0, -Math.PI / 2 - 0.3, 0);
        filmer.armR.rotation.set(lerp(-0.2, -1.9, up), 0, lerp(0.1, 0.35, up)); filmer.armL.rotation.set(lerp(-0.2, -1.7, up), 0, lerp(-0.1, -0.35, up)); filmer.headPivot.rotation.set(0.3 * up, 0, 0);
        setFace(filmer, up > 0.5 ? { brows: 'up', eyes: 1.15, mouth: 'smile', look: [0, -0.6] } : { brows: 'up', eyes: 1.3, mouth: 'o', look: [-0.3, -0.5] }); life(filmer, t, 0.9);
        G.updateMatrixWorld(true); filmer.armR.userData.end.getWorldPosition(tv); filmer.armL.userData.end.getWorldPosition(tv2); phone.position.copy(tv).add(tv2).multiplyScalar(0.5).add(v.set(-0.1, 0.06, 0)); phone.rotation.set(0, -Math.PI / 2 - 0.3, -0.1); phone.visible = up > 0.2; }
      // water pipe + spray (step 2 on, fountain keeps going at the surface while the camera is near)
      pipe.visible = dA < 80 && !fin; const sprayOn = t > ST(2) + 0.35 && t < ST(4) && !fin; const st0 = Math.floor(t / 0.45) * 0.45;
      sprayIn.userData.update(t, sprayOn ? st0 : -99); sprayIn2.userData.update(t, sprayOn ? st0 - 0.45 : -99); sprayIn.position.set(0, 0, 0.1); sprayIn2.position.copy(sprayIn.position);
      // lively side street
      SL.update(t, { look: 0, stop: 0 });
      cars.forEach((c, i) => { const z = wrap(c.z0 + c.dir * c.sp * t, -150, -3); m4.compose(v.set(c.x, 0.08, z), q.setFromEuler(e.set(0, c.dir > 0 ? 0 : Math.PI, 0)), sc.set(1, 1, 1)); carB.setMatrixAt(i, m4); carT.setMatrixAt(i, m4); }); carB.instanceMatrix.needsUpdate = carT.instanceMatrix.needsUpdate = true;
      // outlines fade in at their step
      const fade = (k0, a, b) => smooth(ST(k0) + a, ST(k0) + a + 0.5, t) * (1 - smooth(ST(k0 + 1) + b, ST(k0 + 1) + b + 0.6, t));
      bld.material.opacity = fade(3, 1.6, 0.4); eif.material.opacity = fade(4, 0.9, 0.3); cave.material.opacity = fade(5, 0.8, 0.3); mine.material.opacity = fade(6, 0.8, 0.3); kola.material.opacity = fade(7, 0.8, 0.5);
      headframe.visible = mine.material.opacity > 0.01; rig.visible = kola.material.opacity > 0.01;
      // ---------------- camera ----------------
      let look, pos, fov = 42;
      if (fin) { const u = smooth(PUNCH, TOT, t); look = new THREE.Vector3(-0.75, 0.45, -1.0); const az = lerp(1.2, 1.05, u), el = lerp(0.22, 0.27, u), D = lerp(3.2, 2.9, u); pos = new THREE.Vector3(look.x + Math.cos(el) * Math.cos(az) * D, look.y + Math.sin(el) * D, look.z + Math.cos(el) * Math.sin(az) * D); fov = 40; }
      else {
        // depth-following framing: surface near the top, the hero/bottom in the sharp band
        const Dd = camDist; const lookD = new THREE.Vector3(lerp(-0.15, 0, inHole), -dA * inHole + 0.9 * hs * (1 - smooth(1, 60, dA)) + 0.06 * dA * smooth(1, 60, dA), zc);
        const az = lerp(1.2, 1.42, smooth(0.5, 8, dA)), el = lerp(0.26, 0.05, smooth(0.3, 30, dA));
        const posD = new THREE.Vector3(lookD.x + Math.cos(el) * Math.cos(az) * Dd, lookD.y + Math.sin(el) * Dd, lookD.z + Math.cos(el) * Math.sin(az) * Dd);
        // establishing shot before step 1 (wider, garden + house + street), blends into the depth framing
        const est = 1 - smooth(T1 - 0.6, T1 + 0.9, t); const lookE = new THREE.Vector3(0.4, 1.35, -1.5), posE = new THREE.Vector3(3.6, 2.6, 5.4);
        // the Filmer shot (start of step 3): look over to the fence, then dive down the 60 m shaft
        const fl = smooth(ST(3) - 0.2, ST(3) + 0.4, t) * (1 - smooth(ST(3) + 1.6, ST(3) + 2.5, t)); const lookF = new THREE.Vector3(3.9, 1.45, -1.5), posF = new THREE.Vector3(1.3, 2.25, 2.0);
        look = lookD.clone().lerp(lookE, est).lerp(lookF, fl); pos = posD.clone().lerp(posE, est).lerp(posF, fl);
        out.dist = pos.distanceTo(look); }
      cam.position.copy(pos); cam.lookAt(look); cam.fov = fov; cam.updateProjectionMatrix(); out.camPos = pos.toArray();
      const D = cam.position.distanceTo(look); out.D = D;
      A.fog.density = 0.22 / (D + 300); cloudM.opacity = 0.75 * smooth(200, 1500, D);
      if (D < 12) setShadow(0.5, 0.0, -1.5, 8); else setShadow(look.x, Math.max(look.y, -50), look.z, clamp(D * 0.8, 8, 3000));
      bottomGlow.position.set(0, -dA + 0.6 * hs, zc * 0.5); bottomGlow.intensity = 6 * U.glow.value; bottomGlow.distance = 8 * hs;
      lampL.position.set(0.0, -dA * inHole + 1.7 * hs, zc + 1.6 * hs); lampL.distance = 5 * hs; lampL.intensity = 0.0;
      dof = D < 30 ? 0.3 : lerp(0.26, 0.08, smooth(30, 3000, D)); focusY = fin ? 0.55 : lerp(0.52, 0.56, inHole); focusH = 0.24;
      out.exposure = fin ? 1.12 : lerp(lerp(1.14, 0.98, smooth(5, 200, D)), 0.95, U.glow.value); out.bloom = 0.3 + 0.15 * U.glow.value; out.bloomThreshold = lerp(0.9, 0.82, U.glow.value);
      // screen points for the HUD labels
      out.heroTop = [0, -dA * inHole + 2.0 * hs, zc]; out.bldP = [-16, -30, 0]; out.eifP = [-150, -150, 0]; out.caveP = [-950, -1200, 0]; out.mineP = [1150, -2200, 0]; out.kolaP = [-7000, -6200, 0]; out.mohoP = [-dA * 0.6, -35000, 0];
      out.shake = 0.25 * pulse(t, ST(2) + 0.35, 0.5);
    } else if (t < CUTC) {
      // ---------- scene B: the cut-away Earth ----------
      scene = B; camera = camB; dof = 0; out.env = 0.3; out.bloom = 0.3; out.bloomThreshold = 0.88; out.exposure = 1.08; out.vignette = 0.45;
      const dk = d / 1000; UB.depth.value = dk;
      const u10 = smooth(ST(10), ST(11) + 0.2, t), u11 = smooth(ST(11), ST(12), t), u12 = smooth(ST(12), CUTC, t);
      const lookY = lerp(lerp(RE - 1800, RE - 3200, u10), lerp(0, -900, u12), u11); const Dist = lerp(lerp(9000, 14000, u10), lerp(26000, 30000, u12), u11);
      const az = lerp(0.72, 0.55, u11), el = lerp(0.14, 0.06, u11);
      camB.position.set(Math.sin(az) * Math.cos(el) * Dist, lookY + Math.sin(el) * Dist, Math.cos(az) * Math.cos(el) * Dist); camB.lookAt(0, lookY, 0); camB.fov = 40; camB.updateProjectionMatrix();
      UB.w.value = Math.max(25, Dist * 0.006);
      const hy = RE - dk; const hsB = Dist * 0.034 / 1.8; heroB.group.scale.setScalar(hsB); heroB.group.position.set(0, hy, hsB * 0.4); heroB.group.rotation.set(0, 0.2, 0);
      digPose(heroB, new THREE.Object3D(), digPh, 1); setFace(heroB, { brows: k === 11 ? 'up' : 'worried', eyes: 1.2, mouth: 'open', open: 1.0, look: [0, -0.4] }); life(heroB, t, 0.8);
      keyB.position.set(heroB.group.position.x + hsB * 2, hy + hsB * 2, hsB * 3); keyB.intensity = 2.5;
      markB.position.set(0, hy + hsB * 0.9, 40); markB.scale.setScalar(hsB * 3.5); markB.material.opacity = 0.45;
      out.heroTop = [0, hy + hsB * 2.2, 30]; out.madrid = [0, RE, 0]; out.nz = [0, -RE, 0]; out.core = [-2300, -1500, 10]; out.mantle = [3600, 3200, 10]; out.inner = [-450, 300, 10];
      out.flash = 0.35 * pulse(t, CUTB, 0.35) + 0.3 * pulse(t, ST(11) + 1.2, 0.4);
    } else {
      // ---------- scene C: popping out in New Zealand ----------
      scene = C; camera = camC; dof = 0.28; out.exposure = 1.16; focusY = 0.55; focusH = 0.24;
      const up = easeOut((t - CUTC - 0.15) / 0.7); const G = heroC.group; G.position.set(0, lerp(-1.6, 0.0, up) + 0.25 * Math.sin(Math.PI * clamp((t - CUTC - 0.15) / 0.7)), 0.0); G.rotation.set(0, 0.25, 0);
      const look = smooth(CUTC + 0.9, CUTC + 1.6, t);
      heroC.armL.rotation.set(lerp(-2.9, -0.3, look), 0, lerp(-0.3, -0.25, look)); heroC.armR.rotation.set(lerp(-2.9, -2.2, look), 0, lerp(0.3, 0.6, look)); heroC.legL.rotation.set(0, 0, -0.05); heroC.legR.rotation.set(0, 0, 0.05);
      heroC.headPivot.rotation.set(-0.05, 0.6 * Math.sin((t - CUTC) * 1.6) * look, 0); heroC.torso.rotation.set(0, 0, 0);
      setFace(heroC, { brows: 'up', eyes: 1.35, mouth: look > 0.5 ? 'o' : 'open', open: 1.3, look: [0.5 * Math.sin((t - CUTC) * 1.6), 0.1] }); life(heroC, t, 0.9);
      G.updateMatrixWorld(true); heroC.armR.userData.end.getWorldPosition(tv); spadeC.position.copy(tv).add(v.set(0, 0.35, 0)); spadeC.rotation.set(0.1, 0, 0.3);
      dustC.userData.update(t, CUTC + 0.12); glowC.intensity = 4 * (1 - smooth(CUTC, CUTC + 1.5, t));
      sheep.forEach((s, i) => { const hp = s.userData.hp; const turn = smooth(CUTC + 0.3 + i * 0.12, CUTC + 0.8 + i * 0.12, t); hp.rotation.set(-0.3 + 0.35 * turn - 0.04 * Math.sin(t * 3 + i), 0.15 * Math.sin(t * 0.7 + i) * (1 - turn), 0); s.position.y = 0.06 * Math.abs(Math.sin(t * 9 + i)) * pulse(t, CUTC + 0.2 + i * 0.1, 0.6); });
      const u = smooth(CUTC, PUNCH, t); camC.position.set(lerp(2.2, 2.6, u), lerp(1.4, 1.7, u), lerp(4.6, 5.6, u)); camC.lookAt(0.1, 0.95, 0); camC.fov = 40; camC.updateProjectionMatrix();
      out.flash = 0.4 * pulse(t, CUTC, 0.3); out.shake = 0.3 * pulse(t, CUTC + 0.15, 0.4);
    }
    out.scene = scene; out.camera = camera; out.dof = dof; out.focusY = focusY; out.focusH = focusH;
    // round inset: Mittens cam; swapped for the Filmer's face for ~2 s in the 100 km step
    const filmerCam = t > ST(9) + 1.4 && t < ST(9) + 3.7; if (filmerCam) FC.update(t);
    out.inset = filmerCam ? { scene: FC.scene, camera: FC.camera, x: 0.8, y: 0.205, r: 0.14, show: 1, ring: '#ff8a3d' } : { scene: mc.scene, camera: mc.camera, x: 0.8, y: 0.205, r: 0.14, show: smooth(T1 - 0.3, T1 + 0.2, t) };
    out.filmerCam = filmerCam;
    return out;
  }

  // ---------------- on-screen text ----------------
  const LINES = ['This tiny lemon tree needs a hole. Thirty centimetres deep.', "Two metres. You hit the water pipe. That's on you.", 'Sixty metres. Twenty storeys deep. Your neighbour films instead of helping.',
    'Three hundred and fifty metres. The Eiffel Tower would fit inside.', 'Over two kilometres. Deeper than the deepest cave ever explored.', "Four kilometres. The world's deepest mine. The rock is over sixty degrees.",
    'Twelve kilometres. Scientists took nineteen years to drill this deep.', "Thirty-five kilometres. You're through the crust. The tree needed thirty centimetres.", 'A hundred kilometres. The rock glows. Your neighbour loves the lighting.',
    'Almost three thousand kilometres. The core. Liquid metal. About four thousand degrees.', "The centre of the Earth. About as hot as the Sun's surface.", 'Keep going, and you pop out in New Zealand.'];
  const LT = [[0.2, T1 - 0.15, 'What if you dug a hole straight down and never stopped?', 0.7]];
  LINES.forEach((s, i) => LT.push([ST(i + 1) + 0.12, ST(i + 2) - 0.12, s, 0.7]));
  LT.push([PUNCH + 0.08, ASK - 0.05, 'And the tree? Still in its pot.', 0.7]);
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function italic(ctx, W, H, t, a, b, txt, y = 0.70, size = 50) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.25, (b - t) / 0.25));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * y + i * size * 1.28); ctx.fillText(l, W / 2, H * y + i * size * 1.28); }); ctx.restore(); }
  function tag(ctx, x, y, title, num, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26;
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(x, y - 34, w, 68, 14); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, x + 12, y - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, x + 12, y + 16); ctx.restore(); }
  function proj(pos, camO) { if (!pos) return null; tv.set(pos[0], pos[1], pos[2]); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1 || Math.abs(tv.x) > 1.1 || Math.abs(tv.y) > 1.1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920 + 0.09 * 1920 * 0]; }
  function worldLabel(ctx, pos, title, num, camO, a = 1, ring = true) { if (a <= 0) return; const p = proj(pos, camO); if (!p) return; const [x, y] = p;
    ctx.save(); ctx.globalAlpha = a; if (ring) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.stroke(); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 27px ${FONT}`; const w = Math.max(ctx.measureText(title).width, ctx.measureText(num).width) + 26; const lx = clamp(x + 24, 24, 1080 - w - 150), ly = clamp(y, 700, 1200);
    ctx.fillStyle = 'rgba(10,12,16,0.62)'; ctx.beginPath(); ctx.roundRect(lx, ly - 34, w, 68, 14); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillText(title, lx + 12, ly - 14); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `700 25px ${FONT}`; ctx.fillText(num, lx + 12, ly + 16); ctx.restore(); }
  const win = (t, a, b) => smooth(a, a + 0.3, t) * (1 - smooth(b - 0.3, b, t));
  function fmtDepth(m) { if (m < 1) return Math.round(m * 100) + ' cm'; if (m < 1000) return (m < 10 ? m.toFixed(1) : Math.round(m)) + ' m'; const km = m / 1000; return (km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString('en-US')) + ' km'; }
  function fmtTemp(c) { const r = c < 100 ? Math.round(c) : c < 1000 ? Math.round(c / 10) * 10 : Math.round(c / 100) * 100; return '≈ ' + r.toLocaleString('en-US') + ' °C'; }

  function hud(ctx, t, st) { const W = 1080, H = 1920; const k = st.step ?? 0;
    // title (same words as the spoken first line), first seconds only
    drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF YOU DUG A HOLE', size: 80 }, { text: 'STRAIGHT DOWN AND', size: 80 }, { text: 'NEVER STOPPED?', size: 88, accent: true }], t, '#ffd23f', { start: 0.0, outAt: T1 - 0.45, wps: 5 });
    // side counter: depth + temperature, rolls up with the hole
    const d = st.depth ?? 0; const yC = lerp(H * 0.36, H * 0.105, smooth(T1 - 0.5, T1 + 0.2, t)); const bump = Math.max(...STS.slice(0, 12).map(s => pulse(t, s + 0.1, 0.4)));
    const out_ = d > 6371000; const hot = smooth(10000, 100000, d) * (out_ ? 0 : 1);
    drawSideCounter(ctx, W, H, { y: yC, label: out_ ? 'DISTANCE DUG' : 'DEPTH', value: fmtDepth(d), note: fmtTemp(tempAt(d)), color: hot > 0.5 ? '#ff9a3d' : '#ffd23f', bump, glow: hot > 0.5 ? '#ff7a2a' : '#ffd23f' });
    for (const [a, b, txt, y] of LT) italic(ctx, W, H, t, a, b, txt, y);
    // intro name tags
    if (t < T1 + 1.0) { const pc = proj([0.75, 2.15, -0.55], cam), pm = proj([-0.55, 0.75, -1.35], cam); if (pc) drawTag(ctx, pc[0], pc[1] - 10, 'YOU', t - 0.6, { dur: T1 - 0.9 }); if (pm) drawTag(ctx, pm[0], pm[1] - 10, 'MITTENS', t - 1.0, { dur: T1 - 0.2, bg: '#ff9fb0' }); }
    // labels with real names and real numbers (scale drawings, ~2 s each)
    if (st.scene === undefined || st.camera === cam) {
      if (k === 1) tag(ctx, 56, 640, 'LEMON TREE', 'needs a 30 cm hole', win(t, ST(1) + 0.9, ST(2) - 0.2));
      if (k === 3) worldLabel(ctx, st.bldP, '20-STOREY BUILDING', 'about 60 m tall', cam, win(t, ST(3) + 2.4, ST(4) - 0.1));
      if (k === 4) worldLabel(ctx, st.eifP, 'EIFFEL TOWER', '330 m tall', cam, win(t, ST(4) + 1.2, ST(5) - 0.1));
      if (k === 5) worldLabel(ctx, st.caveP, 'VERYOVKINA CAVE (Georgia)', 'deepest known cave · 2,209 m', cam, win(t, ST(5) + 1.0, ST(6) - 0.1));
      if (k === 6) worldLabel(ctx, st.mineP, 'MPONENG MINE (South Africa)', 'deepest mine · over 4 km', cam, win(t, ST(6) + 1.0, ST(7) - 0.1));
      if (k === 7) worldLabel(ctx, st.kolaP, 'KOLA BOREHOLE (Russia)', '12,262 m · drilled 1970–1989', cam, win(t, ST(7) + 1.0, ST(8) - 0.1));
      if (k === 8) worldLabel(ctx, st.mohoP, 'THE MANTLE STARTS HERE', 'about 35 km under continents', cam, win(t, ST(8) + 1.4, ST(9) - 0.1));
      if (k >= 4 && k <= 9) tag(ctx, 56, 640, 'NOT TO SCALE', 'hole and you drawn wider', 0.7 * win(t, ST(4) + 0.6, ST(5) + 0.4));
      if (k >= 4 && k <= 9 && st.heroTop) worldLabel(ctx, st.heroTop, 'YOU', fmtDepth(d) + ' down', cam, 0.0);
    }
    if (st.filmerCam) { ctx.save(); ctx.font = `900 26px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ff8a3d'; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 6; ctx.strokeText('YOUR NEIGHBOUR', 0.8 * W, 0.205 * H + 0.14 * W + 34); ctx.fillText('YOUR NEIGHBOUR', 0.8 * W, 0.205 * H + 0.14 * W + 34); ctx.restore(); }
    if (st.camera === camB) {
      worldLabel(ctx, st.madrid, 'MADRID', 'your garden', camB, win(t, CUTB + 0.3, ST(11) + 0.5));
      if (k === 10) worldLabel(ctx, st.core, 'OUTER CORE', 'liquid iron · starts 2,890 km down', camB, win(t, ST(10) + 2.2, ST(11) - 0.1));
      if (k === 10) worldLabel(ctx, st.mantle, 'MANTLE', 'hot rock', camB, win(t, ST(10) + 0.6, ST(10) + 2.2));
      if (k === 11) worldLabel(ctx, [0, 0, 0], 'CENTRE OF THE EARTH', '6,371 km down', camB, win(t, ST(11) + 1.2, ST(12) - 0.1));
      if (k === 12) worldLabel(ctx, st.nz, 'NEW ZEALAND', 'exactly opposite Madrid', camB, win(t, ST(12) + 0.2, CUTC));
      if (k === 10 || (k === 11 && t < ST(11) + 1.1)) worldLabel(ctx, st.heroTop, 'YOU', 'still digging', camB, win(t, CUTB + 0.2, ST(11) + 1.1) * (t < ST(10) + 0.6 || t > ST(10) + 2.2 ? 1 : 0), false);
    }
    if (st.camera === camC) tag(ctx, 56, 640, 'WEBER, NEW ZEALAND', 'the exact opposite side from Madrid', win(t, CUTC + 0.6, PUNCH));
    // ending: the last shot stays, the narrator asks for ideas, the same line as small text
    if (t >= ASK) { const a = smooth(ASK, ASK + 0.35, t); ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#fff'; ctx.font = `italic 600 46px ${FS}`; ctx.fillText('What should we try next?', W / 2, H * 0.7); ctx.fillStyle = '#ffd23f'; ctx.font = `800 30px ${FONT}`; ctx.fillText('TELL US IN THE COMMENTS', W / 2, H * 0.7 + 62); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
