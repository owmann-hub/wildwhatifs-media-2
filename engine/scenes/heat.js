import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, drawTitle, drawCounter, drawCaption, makeSkyDome, makeVoxelHouse, makeBurst } from './lib.js';

// beat start times (line starts)
export const B = { hook: 0.2, h2: 3.6, l0: 6.75, l1: 10.05, l2: 13.75, l3: 17.8, l4: 21.95, l5: 25.65, l6: 29.75, l7: 34.4, pay: 38.8, close: 41.3 };
const TOTAL = 43.2;
const TK = [[0, 37], [3.6, 38], [B.l0, 45], [B.l1, 100], [B.l2, 233], [B.l3, 525], [B.l4, 660], [B.l5, 1538], [B.l6, 3422], [B.l7, 5500], [38.6, 5560], [TOTAL, 5620]];
export function tempAt(t) { for (let i = 0; i < TK.length - 1; i++) { const [a, x] = TK[i], [b, y] = TK[i + 1]; if (t <= b) { const u = clamp((t - a) / (b - a)); return lerp(x, y, 1 - Math.pow(1 - u, 2)); } } return TK[TK.length - 1][1]; }
// approximate blackbody colour (rgb 0..1) for temperature in Celsius
function bb(T) { const K = T + 273; const t = K / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(Math.max(t, 1)) - 161.12; b = t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.1 * Math.pow(t - 60, -0.0755); b = 255; }
  return [clamp(r / 255), clamp(g / 255), clamp(b / 255)]; }

export async function create({ THREE, W, H }) {
  const R = rng(21);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e5);
  A.fog = new THREE.FogExp2(0x2a2440, 0.01);
  const hemi = new THREE.HemisphereLight(0x9fb4ff, 0x3a2a2a, 0.7); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffa868, 1.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); A.add(sun, sun.target);
  const sky = makeSkyDome(THREE, 0x1b2550, 0xff9a5c, [-0.6, 0.05, -0.8]); A.add(sky);
  const heroLight = new THREE.PointLight(0xff5020, 0, 0, 1.25); heroLight.castShadow = false; A.add(heroLight);
  // stars
  { const n = 1500, pos = new Float32Array(n * 3); const R2 = rng(4); for (let i = 0; i < n; i++) { const u = R2() * 0.9 + 0.1, th = R2() * 6.28, s = Math.sqrt(1 - u * u); pos.set([5e4 * s * Math.cos(th), 5e4 * u, 5e4 * s * Math.sin(th)], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthTest: false })); st.renderOrder = -9; A.add(st); A.userData.stars = st; }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30000, 64), new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; A.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(600, 9), new THREE.MeshStandardMaterial({ color: 0x4a4c52, roughness: 0.95 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, 6.5); road.receiveShadow = true; A.add(road);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(600, 0.14, 2.4), new THREE.MeshStandardMaterial({ color: 0xb9b5ad, roughness: 0.9 })); walk.position.set(0, 0.07, 0.6); walk.receiveShadow = true; A.add(walk);
  for (let i = -30; i < 30; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.18), new THREE.MeshBasicMaterial({ color: 0xd8c24a })); d.rotation.x = -Math.PI / 2; d.position.set(i * 5, 0.03, 6.5); A.add(d); }
  // scorch / melt disc under hero
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); scorch.rotation.x = -Math.PI / 2; scorch.position.y = 0.16; A.add(scorch);
  const burnt = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x1a120c, transparent: true, opacity: 0, depthWrite: false })); burnt.rotation.x = -Math.PI / 2; burnt.position.y = 0.15; A.add(burnt);
  // houses: mom's house behind, neighbours across the street
  const home = makeVoxelHouse(THREE, { w: 11, h: 6.5, d: 8, vs: 0.5, wall: 0xe9dcc4, roof: 0x5a3a6e, seed: 2 }); home.mesh.position.set(0, 0, -3.2); A.add(home.mesh);
  const doorLight = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), new THREE.MeshBasicMaterial({ color: 0xffd99a })); doorLight.position.set(0, 1.1 + 0.0, -3.18); A.add(doorLight);
  const across = []; const winLights = [];
  [-24, -12, 0, 12, 24].forEach((x, i) => { const h = makeVoxelHouse(THREE, { w: 10, h: 6, d: 8, vs: 0.5, wall: [0xd9c7a8, 0xc7d3de, 0xdcc0b8, 0xcfdcc4, 0xe0d7bd][i], roof: [0x6e3328, 0x34507a, 0x555555, 0x6a4325, 0x2b5e44][i], seed: 40 + i });
    h.mesh.position.set(x, 0, 14); h.mesh.rotation.y = Math.PI; A.add(h.mesh); across.push(h);
    for (const wx of [-2.8, 2.8]) for (const wy of [1.65, 4.65]) { const wl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.3), new THREE.MeshBasicMaterial({ color: 0x223044 })); wl.position.set(x + wx, wy, 13.95); wl.rotation.y = Math.PI; A.add(wl); winLights.push({ m: wl, x: x + wx, y: wy, on: 0.3 + R() * 0.6 });
      const sil = makePerson(THREE, { shirt: 0x111111, pants: 0x111111, skin: 0x111111, hair: 0x111111, shoe: 0x111111 }); sil.group.scale.setScalar(0.85); sil.group.position.set(x + wx + (R() - 0.5) * 0.6, wy - 1.5, 14.3); sil.group.rotation.y = Math.PI; sil.group.visible = false; A.add(sil.group); winLights[winLights.length - 1].sil = sil; } });
  for (const wx of [-2.8, 2.8]) for (const wy of [1.65, 4.65]) { if (Math.abs(wx) < 1 && wy < 3) continue; const wl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.3), new THREE.MeshBasicMaterial({ color: 0x223044 })); wl.position.set(wx, wy, -3.14); A.add(wl); winLights.push({ m: wl, x: wx, y: wy, on: 0.9 });
    const sil = makePerson(THREE, { shirt: 0x111111, pants: 0x111111, skin: 0x111111, hair: 0x111111, shoe: 0x111111 }); sil.group.scale.setScalar(0.85); sil.group.position.set(wx + (R() - 0.5) * 0.5, wy - 1.5, -3.3); sil.group.visible = false; A.add(sil.group); winLights[winLights.length - 1].sil = sil; }
  // street lamp
  const lamp = new THREE.Group(); { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5, 6), new THREE.MeshStandardMaterial({ color: 0x333840 })); pole.position.y = 2.5; lamp.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), pole.material); arm.position.set(-0.6, 5, 0); lamp.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd38a })); bulb.position.set(-1.15, 4.85, 0); lamp.add(bulb); lamp.userData.bulb = bulb; }
  lamp.position.set(-4.5, 0, 1.6); A.add(lamp);
  const lampLight = new THREE.PointLight(0xffc27a, 6, 16, 1.5); lampLight.position.set(-5.65, 4.7, 1.6); A.add(lampLight);
  // trees
  for (const [x, z] of [[-9, -1.5], [8.5, -1.2], [-17, 0], [16, -0.5], [-6, 12], [6.5, 12.2]]) { const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3, 6), new THREE.MeshStandardMaterial({ color: 0x5a3e25, flatShading: true })); tr.position.y = 1.5; t.add(tr);
    const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 0), new THREE.MeshStandardMaterial({ color: 0x2f6e33, flatShading: true })); cr.position.y = 3.8; t.add(cr); t.position.set(x, 0, z); t.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(t); }
  // voxel car next to hero (for the steel beat)
  const carV = []; const cvs = 0.2; const carCol = new THREE.Color(0x2a74c9), glassC = new THREE.Color(0x203040), tyre = new THREE.Color(0x151515);
  for (let ix = 0; ix < 9; ix++) for (let iy = 0; iy < 7; iy++) for (let iz = 0; iz < 21; iz++) {
    const x = (ix - 4) * cvs, y = (iy + 0.5) * cvs + 0.18, z = (iz - 10) * cvs;
    const body = iy < 4; const cabin = iy >= 4 && iz >= 6 && iz <= 15 && ix >= 1 && ix <= 7; if (!body && !cabin) continue;
    const shell = ix === 0 || ix === 8 || iz === 0 || iz === 20 || iy === 0 || iy === 3 || iy === 6 || (cabin && (ix === 1 || ix === 7 || iz === 6 || iz === 15)); if (!shell) continue;
    let c = carCol; if (cabin && iy >= 4 && iy <= 5 && (ix === 1 || ix === 7 || iz === 6 || iz === 15)) c = glassC;
    carV.push({ x, y, z, c });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let a = 0; a < 8; a++) carV.push({ x: sx * 0.85, y: 0.3 + Math.sin(a / 8 * 6.28) * 0.18, z: sz * 1.3 + Math.cos(a / 8 * 6.28) * 0.18, c: tyre });
  const carMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(cvs * 0.98, cvs * 0.98, cvs * 0.98), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.3, flatShading: true }), carV.length);
  const moltenMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(cvs * 0.9, cvs * 0.9, cvs * 0.9), new THREE.MeshBasicMaterial({ color: 0xffa040 }), carV.length);
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const CAR = [2.2, 0, 0.0]; carMesh.position.set(...CAR); moltenMesh.position.set(...CAR);
  carV.forEach((c, i) => { m4.makeTranslation(c.x, c.y, c.z); carMesh.setMatrixAt(i, m4); carMesh.setColorAt(i, c.c); m4.makeScale(0, 0, 0); moltenMesh.setMatrixAt(i, m4); });
  carMesh.castShadow = carMesh.receiveShadow = true; A.add(carMesh, moltenMesh);
  const contact = [-0.85, 0.95, 0.6]; // car-local contact point for the hand
  const meltOrder = carV.map((c, i) => [Math.hypot(c.x - contact[0], (c.y - contact[1]) * 1.4, c.z - contact[2]), i]).sort((a, b) => a[0] - b[0]);
  // night city (for the aerial)
  const cityB = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x3a3a48, roughness: 1 }), 9000);
  const cityL = []; let ci = 0;
  for (let gx = -60; gx <= 60; gx++) for (let gz = -60; gz <= 60; gz++) { if (ci >= 9000) break; const x = gx * 24 + (R() - 0.5) * 6, z = gz * 24 + (R() - 0.5) * 6; if (Math.abs(x) < 40 && z > -14 && z < 24) continue; if (Math.abs(z - 6.5) < 6 || gz % 5 === 0) continue; if (Math.hypot(x, z) > 1400) continue;
    const w = 8 + R() * 4, h = 5 + R() * 4; m4.compose(v.set(x, 0, z), q.identity(), sc.set(w, h, w * 0.9)); cityB.setMatrixAt(ci++, m4); if (R() < 0.6) cityL.push(x + (R() - 0.5) * w * 0.6, h * 0.4 + R() * h * 0.4, z + w * 0.46); }
  cityB.count = ci; A.add(cityB);
  { const pos = new Float32Array(cityL); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc77a, size: 2.5, sizeAttenuation: false, fog: false })); A.add(pts); A.userData.cityLights = pts; }
  for (let gz = -60; gz <= 60; gz += 5) { const s = new THREE.Mesh(new THREE.PlaneGeometry(3000, 8), road.material); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.01, gz * 24); A.add(s); }
  { const n = 1200, pos = new Float32Array(n * 3); const R3 = rng(8); for (let i = 0; i < n; i++) { const along = (R3() - 0.5) * 2800, gz = Math.round((R3() - 0.5) * 24) * 5 * 24; pos.set([along, 4, gz + 4.5], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); A.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd08a, size: 2.2, sizeAttenuation: false, fog: false }))); }
  // hero + mom
  const hero = makePerson(THREE, { shirt: 0x2fa36b, pants: 0x34405e, hair: 0x231710, skin: 0xd8a47e }); hero.group.position.set(0, 0.14, 0.6); A.add(hero.group);
  const glowMats = []; hero.group.traverse(o => { if (o.isMesh && o.material.emissive) { o.material = o.material.clone(); glowMats.push(o.material); } });
  const hc = document.createElement('canvas'); hc.width = hc.height = 128; { const g = hc.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), color: 0xff6020, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false })); A.add(halo);
  const mom = makePerson(THREE, { shirt: 0xc94f6d, pants: 0x3b3b52, hair: 0x5a3015, skin: 0xe2b08c }); mom.group.position.set(-0.7, 0.0, -2.9); mom.group.scale.setScalar(0.95); mom.group.visible = false; A.add(mom.group);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mom.mats.hair); bun.position.set(0, 0.3, -0.12); mom.headPivot.add(bun);
  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.03), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 })); shades.position.set(0, 0.17, 0.165); mom.headPivot.add(shades);
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.12), new THREE.MeshStandardMaterial({ color: 0x2b4fa8, flatShading: true })); jacket.position.set(0, -0.3, 0.1); mom.armR.userData.end.add(jacket);
  // props
  const cone = new THREE.Group(); { const c = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0xd9a35c, flatShading: true })); c.rotation.x = Math.PI; c.position.y = 0.0; cone.add(c);
    const s1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 1), new THREE.MeshStandardMaterial({ color: 0xff9ec4, flatShading: true })); s1.position.y = 0.09; cone.add(s1); cone.userData.scoop = s1; }
  hero.armR.userData.end.add(cone); cone.position.set(0, -0.02, 0.06);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.005), new THREE.MeshStandardMaterial({ color: 0xf6f6f0, roughness: 0.9 })); hero.armL.userData.end.add(paper); paper.position.set(0, -0.12, 0.09); paper.rotation.x = 0.3;
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xd8262b, metalness: 0.0, roughness: 0.35, emissive: 0x000000 })); hero.armR.userData.end.add(can); can.position.set(0, -0.04, 0.06); can.visible = false;
  // particles
  const handR = new THREE.Vector3(), handL = new THREE.Vector3();
  const drip = makeBurst(THREE, 120, { origin: (r) => [0, 0, 0], dir: (r) => [(r() - 0.5) * 0.3, -0.2, (r() - 0.5) * 0.3], speed: [0.2, 1], life: [0.4, 1.2], size: 6, color: 0xff9ec4, gravity: 9.8, floor: 0.15, seed: 2, delay: 1.2 });
  const steam = makeBurst(THREE, 700, { origin: (r) => [(r() - 0.5) * 0.5, 0.2 + r() * 1.6, 0.6 + (r() - 0.5) * 0.4], dir: (r) => [(r() - 0.5) * 0.4, 1, (r() - 0.5) * 0.4], speed: [0.6, 2.2], life: [1.2, 3.0], size: 18, color: 0xf2f2f2, opacity: 0.35, seed: 3, delay: 3.0 });
  const flames = makeBurst(THREE, 400, { origin: (r) => [(r() - 0.5) * 0.2, (r() - 0.5) * 0.25, 0], dir: (r) => [(r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3], speed: [0.3, 1.2], life: [0.3, 0.9], size: 14, color: 0xff8a20, additive: true, seed: 4, delay: 2.5 });
  const ash = makeBurst(THREE, 160, { origin: (r) => [(r() - 0.5) * 0.2, (r() - 0.5) * 0.25, 0], dir: (r) => [(r() - 0.5), 0.6, (r() - 0.5)], speed: [0.2, 0.8], life: [1.5, 3], size: 5, color: 0x222222, gravity: -0.2, seed: 5, delay: 2.0 });
  const embers = makeBurst(THREE, 600, { origin: (r) => [(r() - 0.5) * 0.6, 0.1 + r() * 1.7, 0.6 + (r() - 0.5) * 0.4], dir: (r) => [(r() - 0.5) * 0.5, 1, (r() - 0.5) * 0.5], speed: [0.5, 2.5], life: [0.8, 2.0], size: 5, color: 0xffa040, additive: true, seed: 6, delay: 20 });
  const silver = makeBurst(THREE, 120, { origin: () => [0, 0, 0], dir: (r) => [(r() - 0.5) * 0.2, -0.1, (r() - 0.5) * 0.2], speed: [0.1, 0.5], life: [0.4, 1.0], size: 6, color: 0xdfe6ee, gravity: 9.8, floor: 0.15, additive: true, seed: 7, delay: 2.4 });
  const sparks = makeBurst(THREE, 300, { origin: () => [CAR[0] + contact[0], contact[1] + 0.1, CAR[2] + contact[2]], dir: (r) => { const a = r() * 6.28; return [Math.cos(a) * 0.7, 0.6 + r(), Math.sin(a) * 0.7]; }, speed: [1, 4], life: [0.4, 1.2], size: 5, color: 0xffd060, gravity: 9.8, floor: 0.1, additive: true, seed: 8, delay: 3.2 });
  [drip, steam, flames, ash, embers, silver, sparks].forEach(p => A.add(p));

  const tv = new THREE.Vector3();
  function update(t) {
    const T = tempAt(t); const out = { scene: A, camera: cam, bloom: 0.6, bloomThreshold: 0.85, shake: 0, flash: 0, T };
    const night = smooth(B.l2, B.l3 + 2, t); // dusk -> night
    sky.material.uniforms.zen.value.set(0x1b2550).lerp(new THREE.Color(0x05060f), night);
    sky.material.uniforms.hor.value.set(0xff9a5c).lerp(new THREE.Color(0x1d1830), night);
    A.fog.color.set(0x5a4a66).lerp(new THREE.Color(0x0b0a14), night);
    hemi.intensity = lerp(1.1, 0.22, night); sun.intensity = lerp(2.2, 0.0, night);
    A.userData.stars.material.opacity = night;
    // hero glow
    const glow = smooth(450, 900, T) * 0.7 + smooth(900, 5500, T) * 1.3; const col = bb(Math.max(T, 600));
    glowMats.forEach(m => { m.emissive.setRGB(col[0], col[1], col[2]); m.emissiveIntensity = glow; if (T > 1500) m.color.lerp(new THREE.Color(1, 1, 1), 0.02); });
    heroLight.color.setRGB(...col); heroLight.intensity = smooth(450, 1000, T) * 2.0 + smooth(1000, 5500, T) * 9; heroLight.position.set(hero.group.position.x, 1.1, hero.group.position.z + 0.2);
    
    out.exposure = 1.0 - smooth(600, 3500, T) * 0.62 - smooth(3500, 5500, T) * 0.12;
    out.bloom = 0.5 + smooth(500, 5500, T) * 0.45; out.bloomThreshold = lerp(0.85, 0.93, smooth(500, 3000, T)); out.bloomRadius = 0.35;
    // ground effects
    scorch.position.set(hero.group.position.x, 0.16, hero.group.position.z); const sr = 0.35 + smooth(500, 5500, T) * 1.4; scorch.scale.setScalar(sr); scorch.material.color.setRGB(1, 0.35 + 0.25 * smooth(1500, 5500, T), 0.08); scorch.material.opacity = smooth(600, 1400, T) * 0.55;
    burnt.position.set(hero.group.position.x, 0.15, hero.group.position.z); burnt.scale.setScalar(0.3 + smooth(60, 600, T) * 1.2 + smooth(600, 5500, T) * 4); burnt.material.opacity = smooth(40, 233, T) * 0.85;
    // pose
    const P = hero; P.armR.rotation.set(-1.0, 0, 0.05); P.armL.rotation.set(-0.75, 0, -0.05); P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0); P.headPivot.rotation.set(0, 0, 0); P.group.rotation.set(0, 0, 0); P.group.position.set(0, 0.14, 0.6);
    P.mouth.scale.set(1, 1, 1); P.eyeL.scale.y = P.eyeR.scale.y = 1;
    if (t > B.h2 && t < B.l0) { const u = smooth(B.h2, B.h2 + 0.5, t) * (1 - smooth(B.l0 - 0.6, B.l0, t)); P.armL.rotation.set(lerp(-0.75, -0.2, u), 0, lerp(-0.05, -0.9, u)); P.headPivot.rotation.z = 0.15 * u; } // shrug-ish
    if (t > B.l0 && t < B.l0 + 3) P.headPivot.rotation.x = 0.35 * smooth(B.l0, B.l0 + 0.4, t); // looks at the ice cream
    if (t > B.l2 && t < B.l3) { P.headPivot.rotation.set(0.3, -0.25, 0); P.eyeL.scale.y = P.eyeR.scale.y = 1.4; P.mouth.scale.set(1.4, 5, 1); }
    if (t > B.l3 && t < B.l4) { const u = smooth(B.l3, B.l3 + 1, t); P.armL.rotation.set(-0.3, 0, -0.4 * u); P.armR.rotation.set(-0.3, 0, 0.4 * u); P.headPivot.rotation.x = 0.4 * u; } // looks at his glowing hands
    if (t > B.l4 && t < B.l5) { P.headPivot.rotation.x = 0.35; P.armL.rotation.set(-0.2, 0, -0.1); }
    if (t > B.l5 && t < B.l6) { const u = smooth(B.l5, B.l5 + 0.6, t); const sink = smooth(B.l5 + 0.8, B.l6, t);
      P.group.rotation.z = -0.22 * u; P.armR.rotation.set(-0.1, 0, lerp(0.05, 0.62, u)); P.group.position.set(lerp(0, 0.15, u), 0.14 - sink * 0.25, 0.6); P.armL.rotation.set(-0.2, 0, -0.15); P.eyeL.scale.y = P.eyeR.scale.y = sink > 0.4 ? 1.5 : 1; P.mouth.scale.set(1.2, sink > 0.4 ? 4 : 1, 1); }
    if (t > B.l6) { P.armL.rotation.set(-0.1, 0, -0.1); P.armR.rotation.set(-0.1, 0, 0.1); }
    if (t > B.pay - 0.1) { P.headPivot.rotation.y = -0.6; P.group.position.set(0.7, 0.14, -1.4); P.group.rotation.y = -0.5; P.armR.rotation.set(0, 0, 0.1); }
    if (t > B.close) { const u = smooth(B.close, B.close + 0.3, t); P.group.position.set(0.3, 0.14, 0.4); P.group.rotation.y = 0; P.headPivot.rotation.y = 0; P.armR.rotation.set(0, 0, lerp(0.1, 2.6, u) + Math.sin(t * 10) * 0.25 * u); }
    // props
    const melt = smooth(B.l0, B.l0 + 1.6, t); cone.userData.scoop.scale.set(1 + melt * 0.6, Math.max(0.05, 1 - melt), 1 + melt * 0.6); cone.userData.scoop.position.y = 0.09 - melt * 0.04; cone.visible = t < B.l2;
    P.group.updateMatrixWorld(true); P.armR.userData.end.getWorldPosition(handR); P.armL.userData.end.getWorldPosition(handL);
    drip.userData.update(t, B.l0 + 0.1); drip.position.copy(handR);
    const paperBurn = smooth(B.l2 + 0.4, B.l2 + 2.6, t); paper.material.color.setRGB(lerp(0.96, 0.08, paperBurn), lerp(0.96, 0.06, paperBurn), lerp(0.94, 0.05, paperBurn)); paper.scale.set(1, Math.max(0.01, 1 - smooth(B.l2 + 1.4, B.l2 + 3.2, t)), 1); paper.visible = t < B.l2 + 3.2;
    flames.userData.update(t, B.l2 + 0.3); flames.position.copy(handL); ash.userData.update(t, B.l2 + 1.0); ash.position.copy(handL);
    steam.userData.update(t, B.l1); steam.position.set(P.group.position.x, 0, P.group.position.z - 0.6);
    embers.userData.update(t, B.l3 - 1); embers.position.set(P.group.position.x, 0, P.group.position.z - 0.6);
    can.visible = t > B.l4 - 0.4 && t < B.l5; const cm = smooth(B.l4 + 0.4, B.l4 + 2.4, t); can.scale.set(1 + cm * 0.5, Math.max(0.1, 1 - cm * 0.9), 1 + cm * 0.5); can.material.color.setRGB(lerp(0.85, 0.9, cm), lerp(0.15, 0.85, cm), lerp(0.17, 0.85, cm)); can.material.emissive.setRGB(cm * 0.9, cm * 0.45, cm * 0.1);
    silver.userData.update(t, B.l4 + 0.5); silver.position.copy(handR);
    // car melt
    const meltN = Math.floor(smooth(B.l5 + 0.8, B.l6 + 1.5, t) * 260);
    for (let j = 0; j < meltOrder.length; j++) { const i = meltOrder[j][1], c = carV[i];
      if (j < meltN) { const age = (meltN - j) / 60; m4.makeScale(0, 0, 0); carMesh.setMatrixAt(i, m4); const y = Math.max(0.08, c.y - age * 1.2); m4.compose(v.set(c.x + (c.x - contact[0]) * age * 0.1, y, c.z + (c.z - contact[2]) * age * 0.1), q.identity(), sc.set(1 + Math.min(age, 1) * 0.6, Math.max(0.3, 1 - age * 0.5), 1 + Math.min(age, 1) * 0.6)); moltenMesh.setMatrixAt(i, m4); }
      else { m4.makeTranslation(c.x, c.y, c.z); carMesh.setMatrixAt(i, m4); m4.makeScale(0, 0, 0); moltenMesh.setMatrixAt(i, m4); } }
    carMesh.instanceMatrix.needsUpdate = true; moltenMesh.instanceMatrix.needsUpdate = true; moltenMesh.material.color.setRGB(1, lerp(0.55, 0.85, smooth(1538, 3422, T)), lerp(0.2, 0.6, smooth(1538, 3422, T)));
    sparks.userData.update(t, B.l5 + 0.8);
    // neighbours react: windows light up, silhouettes appear
    winLights.forEach((w, i) => { const on = smooth(B.l6 + i * 0.07, B.l6 + 0.5 + i * 0.07, t); w.m.material.color.setRGB(lerp(0.13, 1, on * w.on), lerp(0.19, 0.85, on * w.on), lerp(0.27, 0.55, on * w.on)); w.sil.group.visible = on > 0.5 && w.on > 0.55 && t < B.pay; });
    lamp.userData.bulb.material.color.setRGB(1, 0.83, 0.54); lampLight.intensity = 6 * (1 - night * 0.0);
    mom.group.visible = t > B.pay - 0.1 && t < B.close; mom.armR.rotation.set(-1.3, 0, 0); mom.headPivot.rotation.y = 0.5; mom.mouth.scale.set(1, t > B.pay + 1.2 && Math.sin(t * 20) > 0 ? 3 : 1, 1);
    // flashes on milestones
    const ms = [B.l1, B.l2, B.l3, B.l4, B.l5, B.l6, B.l7]; ms.forEach((m, i) => { out.flash = Math.max(out.flash, pulse(t, m, 0.25) * (0.15 + i * 0.06)); out.shake = Math.max(out.shake, pulse(t, m, 0.4) * (0.15 + i * 0.07)); });
    out.flash = Math.max(out.flash, pulse(t, B.pay, 0.2) * 0.4);
    // cameras
    let c, g, fov = 50; const hp = P.group.position;
    if (t < B.h2) { const u = t / B.h2; c = [lerp(0.9, 0.6, u), lerp(1.5, 1.55, u), lerp(3.1, 2.4, u)]; g = [0.05, 1.35, 0.6]; fov = 50; }
    else if (t < B.l0) { const u = (t - B.h2) / (B.l0 - B.h2); const a = lerp(-0.6, 0.2, u); c = [Math.sin(a) * 4.2, 1.2, 0.6 + Math.cos(a) * 4.2]; g = [0, 0.95, 0.6]; fov = 52; }
    else if (t < B.l1) { const u = (t - B.l0) / (B.l1 - B.l0); c = [handR.x + lerp(-0.25, -0.35, u), handR.y + 0.12, handR.z + lerp(0.75, 0.9, u)]; g = [handR.x, handR.y + 0.02, handR.z]; fov = 50; }
    else if (t < B.l2) { const u = (t - B.l1) / (B.l2 - B.l1); c = [lerp(1.6, 2.2, u), lerp(1.0, 1.6, u), lerp(3.6, 4.6, u)]; g = [0, 1.3, 0.6]; fov = 55; }
    else if (t < B.l3) { const u = (t - B.l2) / (B.l3 - B.l2); c = [handL.x + lerp(-0.6, -0.45, u), handL.y + 0.25, handL.z + lerp(0.75, 0.6, u)]; g = [handL.x + 0.05, handL.y + 0.05, handL.z]; fov = 52; }
    else if (t < B.l4) { const u = (t - B.l3) / (B.l4 - B.l3); const a = lerp(-1.0, 0.25, easeInOut(u)); c = [Math.sin(a) * lerp(3.2, 2.6, u), lerp(0.7, 1.1, u), 0.6 + Math.cos(a) * lerp(3.2, 2.6, u)]; g = [0, 1.05, 0.6]; fov = 52; }
    else if (t < B.l5) { const u = (t - B.l4) / (B.l5 - B.l4); c = [handR.x + lerp(0.5, 0.4, u), handR.y + 0.1, handR.z + lerp(0.6, 0.5, u)]; g = [handR.x, handR.y - 0.03, handR.z]; fov = 50; }
    else if (t < B.l6) { const u = (t - B.l5) / (B.l6 - B.l5); c = [lerp(2.8, 3.4, u), lerp(1.7, 2.1, u), lerp(4.6, 5.2, u)]; g = [0.8, 0.9, 0.9]; fov = 52; }
    else if (t < B.l7) { const u = easeInOut((t - B.l6) / (B.l7 - B.l6)); c = [lerp(2.0, 3.5, u), lerp(1.5, 2.8, u), lerp(8.5, 12.5, u)]; g = [0, lerp(1.6, 2.4, u), -0.5]; fov = 56; }
    else if (t < B.pay) { const u = easeInOut((t - B.l7) / (B.pay - B.l7)); c = [lerp(-20, -120, u), lerp(25, 700, u), lerp(60, 600, u)]; g = [0, 1, 0.6]; fov = 55; }
    else if (t < B.close) { const u = (t - B.pay) / (B.close - B.pay); c = [lerp(2.2, 1.9, u), 1.55, lerp(2.4, 2.0, u)]; g = [-0.1, 1.45, -2.0]; fov = 55; }
    else { const u = (t - B.close) / (TOTAL - B.close); out.exposure *= 0.55; c = [0.3, 1.5, lerp(5.6, 5.0, u)]; g = [0.3, 1.3, 0.4]; fov = 50; }
    cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix(); sky.position.copy(cam.position);
    const d = cam.position.distanceTo(tv.set(...g)); A.fog.density = 1 / (Math.max(d, 4) * 14 + 60 + cam.position.y * 6);
    tv.set(...g); sun.target.position.copy(tv); sun.position.copy(tv).add(new THREE.Vector3(-20, 12, -25)); const s_ = sun.shadow.camera; const e = Math.max(8, d); s_.left = -e; s_.right = e; s_.top = e; s_.bottom = -e; s_.far = 200; s_.updateProjectionMatrix(); sun.shadow.bias = -0.0004;
    halo.position.copy(heroLight.position); halo.material.color.setRGB(...col); const hs = smooth(700, 5500, T); halo.scale.set(2.2 + hs * 3, 3.2 + hs * 3.5, 1); const hd = cam.position.distanceTo(halo.position); halo.material.opacity = (smooth(500, 1500, T) * 0.25 + hs * 0.3) * smooth(3.0, 7.0, hd); 
    // brightness of halo seen from far: grow halo at aerial
    if (t > B.l7 && t < B.pay) { const u = (t - B.l7) / (B.pay - B.l7); halo.scale.multiplyScalar(1 + u * 22); halo.material.opacity = 0.7; heroLight.intensity = heroLight.intensity * (1 + u * 60); }
    if (t > B.pay - 0.1 && t < B.close) out.exposure *= 0.75;
    const DBG = new URLSearchParams(location.search).get('dbg') || ''; if (DBG.includes('L')) heroLight.intensity = 0; if (DBG.includes('B')) out.bloom = 0; if (DBG.includes('E')) glowMats.forEach(m => m.emissiveIntensity = 0); if (DBG.includes('S')) { scorch.visible = false; burnt.visible = false; } if (DBG.includes('H')) halo.visible = false; if (DBG.includes('P')) A.children.forEach(o => { if (o.isPoints) o.visible = false; });
    return out;
  }
  const caps = [[B.l1 + 1.4, 'WALKING KETTLE', 1.8], [B.l2 + 2.0, 'HOMEWORK: GONE', 1.7], [B.l3 + 1.6, 'GLOWING', 1.8], [B.l4 + 1.2, 'ALUMINUM MELTS', 1.8], [B.l5 + 1.2, 'STEEL MELTS', 1.8], [B.l6 + 1.4, 'BRIGHTER THAN A BULB', 2.2], [B.l7 + 1.4, 'SURFACE OF THE SUN', 2.2], [B.pay + 1.1, 'BRING A JACKET.', 1.6]];
  function hud(ctx, t, st) { const W = 1080, H = 1920;
    drawTitle(ctx, W, H, [{ text: 'WHAT IF YOUR BODY TEMP', size: 84 }, { text: 'NEVER STOPPED RISING?', size: 88, accent: true }], t, '#ff8a3d');
    const T = st.T; const F = T * 9 / 5 + 32; const ms = [B.l0, B.l1, B.l2, B.l3, B.l4, B.l5, B.l6, B.l7]; let bump = 0; ms.forEach(m => bump = Math.max(bump, pulse(t, m, 0.35)));
    const hot = smooth(400, 3000, T);
    drawCounter(ctx, W, H, `BODY TEMP  •  ${Math.round(F).toLocaleString('en-US')}°F`, `${T < 100 ? T.toFixed(1) : Math.round(T).toLocaleString('en-US')}°C`, t, { bump, color: hot > 0.5 ? '#ffd27a' : '#ff8a3d', glow: `rgba(255,${Math.round(lerp(120, 220, hot))},60,0.9)` });
    for (const [at, txt, dur] of caps) drawCaption(ctx, W, H, txt, t - at, { dur, color: txt === 'BRING A JACKET.' ? '#9fd0ff' : '#ffffff' });
    if (t > B.h2 + 0.4 && t < B.l0 - 0.2) drawCaption(ctx, W, H, 'YOU: FINE', t - B.h2 - 0.4, { dur: 2.4, color: '#b8ffcf' });
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL } };
}
