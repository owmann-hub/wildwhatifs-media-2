import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, drawTitle, drawCounter, drawGauge, drawCaption, makeSkyDome, makeVoxelHouse, makeBurst, makeCat, makeSuburb, makeShockwave, makeCrowd, makeTraffic, setFace, life, drawBubble, drawSideCounter, drawTitleTimed, drawPunch, drawTag } from './lib.js';

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
  // detailed suburb all around (lit windows at night) — replaces the old box city
  const sub = makeSuburb(THREE, { seed: 33, nx: 40, nz0: -40, nz1: 40, ox: 44, oz: 6.5, windows: true, skip: (x, z) => (Math.abs(x) < 40 && z > -16 && z < 26) || Math.hypot(x, z) > 1500, detail: (x, z) => Math.hypot(x, z) < 900 });
  A.add(sub.group); sub.winMesh.material.color.setRGB(0.15, 0.15, 0.18);
  // bystanders: a few walkers early, then neighbours come out and film (more each beat)
  const walkers = makeCrowd(THREE, 8, { seed: 51, target: (r, i) => [i % 2 ? 70 : -70, i % 2 ? 11.2 : 10.4], source: (r, i, tg) => [-tg[0], tg[1]], arrive: (r, i) => 9 + i * 2.6, film: () => false }); A.add(walkers);
  const NC = 90; const crowd = makeCrowd(THREE, NC, { seed: 52, target: (r, i) => { if (i < 30) return [-14 + r() * 28, 10.2 + r() * 2.2]; if (i < 60) { const sd = r() < 0.5 ? -1 : 1; return [sd * (3.5 + r() * 14), -0.6 + r() * 2.0]; } return [-30 + r() * 60, 9.6 + r() * 4]; },
    source: (r, i, tg) => i < 60 ? [tg[0] + (r() - 0.5) * 6, i < 30 ? 15.5 : -6] : [tg[0] + (r() < 0.5 ? -45 : 45), tg[1]], arrive: (r, i) => i < 12 ? B.l3 + 0.5 + r() * 3.5 : i < 40 ? B.l4 + r() * 6 : B.l6 - 1 + r() * 3.5 }); A.add(crowd);
  const traffic = makeTraffic(THREE, 4, { seed: 61, z: 6.5, span: 180 }); A.add(traffic);
  // Mittens (recurring cat) on the porch
  const mittens = makeCat(THREE, 0xf0a040); mittens.scale.setScalar(1.25); A.add(mittens);
  // heat fronts rolling out from the hero at each milestone
  const hw = [B.l3, B.l4, B.l5, B.l6].map((t0, i) => { const w = makeShockwave(THREE, { seed: 70 + i, n: 500, size: 5, sizeR: 12, opacity: 0.35, color: 0xff7a2a, dustColor: 0xffb070, ringColor: 0xff6a1a }); A.add(w); return { w, t0, R: 14 + i * 10 }; });
  const bigW = makeShockwave(THREE, { seed: 79, n: 1600, size: 40, sizeR: 200, opacity: 0.5, color: 0xffb060, dustColor: 0xff9040, ringColor: 0xffa040 }); A.add(bigW);
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

  const jacketFire = makeBurst(THREE, 260, { origin: (r) => [(r() - 0.5) * 0.35, (r() - 0.5) * 0.4, 0], dir: (r) => [(r() - 0.5) * 0.4, 1, (r() - 0.5) * 0.4], speed: [0.4, 1.6], life: [0.3, 0.9], size: 16, color: 0xff8a20, additive: true, seed: 12, delay: 0 }); A.add(jacketFire);
  const jw = new THREE.Vector3();
  const tv = new THREE.Vector3();
  function update(t_) {
    const cold = t_ < 0.55; const t = cold ? 36.9 + t_ * 1.5 : t_;
    const T = tempAt(t); const out = { scene: A, camera: cam, bloom: 0.6, bloomThreshold: 0.85, shake: 0, flash: 0, T, cold };
    const night = smooth(B.l2, B.l3 + 2, t); // dusk -> night
    sky.material.uniforms.zen.value.set(0x1b2550).lerp(new THREE.Color(0x05060f), night);
    sky.material.uniforms.hor.value.set(0xff9a5c).lerp(new THREE.Color(0x1d1830), night);
    A.fog.color.set(0x5a4a66).lerp(new THREE.Color(0x0b0a14), night);
    hemi.intensity = lerp(1.1, 0.42, night); sun.intensity = lerp(2.2, 0.0, night);
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
    mom.armR.rotation.set(-1.3, 0, 0); mom.headPivot.rotation.y = 0.5; mom.mouth.scale.set(1, t > B.pay + 1.2 && Math.sin(t * 20) > 0 ? 3 : 1, 1);
    // flashes on milestones
    const ms = [B.l1, B.l2, B.l3, B.l4, B.l5, B.l6, B.l7]; ms.forEach((m, i) => { out.flash = Math.max(out.flash, pulse(t, m, 0.25) * (0.15 + i * 0.06)); out.shake = Math.max(out.shake, pulse(t, m, 0.4) * (0.15 + i * 0.07)); });
    out.flash = Math.max(out.flash, pulse(t, B.pay, 0.2) * 0.4);
    // cameras
    // ---- living world ----
    const night2 = smooth(B.l2, B.l3 + 2, t); sub.winMesh.material.color.setRGB(lerp(0.15, 1, night2), lerp(0.15, 0.95, night2), lerp(0.18, 0.8, night2));
    walkers.userData.update(t, [0, 0.6]); crowd.userData.update(t, [0, 0.6]); traffic.userData.update(t, B.l5 + 0.4);
    hw.forEach(({ w, t0, R: RR }) => { const age = t - t0; w.position.set(0, 0.05, 0.6); w.userData.set(0.5 + easeOut(clamp(age / 1.6)) * RR, age >= 0 ? age / 1.9 : -1, 0.6); });
    { const age = t - B.l7; const r = 3 + easeOut(clamp(age / 5.5)) * 650; bigW.position.set(0, 0, 0.6); bigW.userData.set(r, age >= 0 && age < 6 ? age / 6 : -1, 1.2); sub.tint(0, 0.6, age > 0 ? r : 0, 90); }
    // Mittens: sits by you, poofs at 100°C and bolts up the tree, comes back to warm up at the end
    { const M = mittens; M.visible = true; M.rotation.set(0, 0, 0); M.scale.setScalar(1.25);
      const tp = B.l1 + 0.9; const tree = [-9, -1.5];
      if (t < tp) { M.position.set(-0.85, 0.14, 1.0); M.rotation.y = 0.5 + Math.sin(t * 0.7) * 0.15; }
      else if (t < tp + 0.35) { const u = (t - tp) / 0.35; M.position.set(-0.85, 0.14 + Math.sin(u * Math.PI) * 0.6, 1.0); M.scale.set(1.25 * (1 + 0.5 * u), 1.25 * (1 + 0.6 * u), 1.25 * (1 + 0.3 * u)); M.rotation.y = -1.2; }
      else if (t < tp + 1.6) { const u = (t - tp - 0.35) / 1.25; M.position.set(lerp(-0.85, tree[0], u), 0.14 + Math.abs(Math.sin(u * 20)) * 0.15, lerp(1.0, tree[1] + 0.4, u)); M.rotation.y = -1.6; }
      else if (t < B.pay) { const u = clamp((t - tp - 1.6) / 0.7); M.position.set(tree[0], lerp(0.1, 3.0, u), tree[1] + 0.4); M.rotation.set(-1.4 * (1 - u), 1.4, 0); }
      else { M.position.set(0.95, 0.14, 1.25); M.rotation.y = -2.2; M.scale.set(1.25, 1.05, 1.35); }
      if (t > B.l3 + 0.2 && t < B.pay) M.scale.set(1.25 * 1.15, 1.25 * 1.15, 1.25 * 1.15); }
    // ---- faces & life ----
    { let f = { brows: 'neutral', eyes: 1, mouth: 'smile' };
      if (t > B.h2 && t < B.l0) f = { brows: 'up', eyes: 1, mouth: 'smile', look: [0.3, 0] };
      if (t > B.l0 && t < B.l1) f = { brows: 'worried', eyes: 1.35, mouth: 'o', look: [0.4, -1] };
      if (t > B.l1 && t < B.l2) f = { brows: 'up', eyes: 1.3, mouth: 'open', open: 1.2, look: [-0.6, 0] };
      if (t > B.l2 && t < B.l3) f = { brows: 'worried', eyes: 1.5, mouth: 'grit', look: [-0.5, -1] };
      if (t > B.l3 && t < B.l4) f = { brows: 'up', eyes: 1.5, mouth: 'o', look: [0, -1] };
      if (t > B.l4 && t < B.l5) f = { brows: 'neutral', eyes: 0.85, mouth: 'flat', look: [0.5, -1] };
      if (t > B.l5 && t < B.l6) f = { brows: 'worried', eyes: 1.6, mouth: 'grit', look: [1, -0.6] };
      if (t > B.l6 && t < B.l7) f = { brows: 'worried', eyes: 1.2, mouth: 'smile', look: [0, 0] };
      if (t > B.l7) f = { brows: 'up', eyes: 1.4, mouth: 'smile' };
      if (t > B.pay) f = { brows: 'squint', eyes: 0.6, mouth: 'flat', look: [-1, 0.6] };
      setFace(P, f); life(P, t, 1); const pov = (t_ >= 0.55 && t < B.h2) || t > B.close; P.headPivot.visible = !pov;
      if (pov) { P.group.rotation.y = t > B.close ? Math.PI : 0; P.group.position.set(0, 0.14, 0.6); P.armR.rotation.set(-1.4, 0, -0.32); P.armL.rotation.set(-1.35, 0, 0.32); }
      if (t > B.close) { cone.visible = false; }
      const talking = t > B.pay + 0.1 && t < B.pay + 2.3; setFace(mom, t > B.close ? { brows: 'up', eyes: 0.9, mouth: 'o', look: [0, 0] } : { brows: 'angry', eyes: 0.9, mouth: talking && Math.sin(t * 22) > 0 ? 'open' : 'flat', open: 1.0, look: [1, 0] }); life(mom, t, 0.8);
      mom.group.visible = t > B.pay - 0.1;
      if (t > B.close) { mom.group.position.set(-0.1, 0.0, -1.35); mom.group.rotation.y = 0; mom.armR.rotation.set(-1.45, 0, 0.1); mom.headPivot.rotation.set(0, 0, 0); mom.group.updateMatrixWorld(true); jacket.getWorldPosition(jw); jacketFire.position.copy(jw); const burn = smooth(B.close + 0.5, B.close + 1.4, t); jacket.material.color.setRGB(lerp(0.17, 0.05, burn), lerp(0.31, 0.04, burn), lerp(0.66, 0.03, burn)); jacket.scale.setScalar(Math.max(0.05, 1 - smooth(B.close + 1.0, B.close + 1.8, t))); }
      jacketFire.userData.update(t, B.close + 0.45); }
    // ---- cameras: a new angle every ~2 s; first-person at start and end ----
    let c, g, fov = 50; const hp = P.group.position; const eye = [0, 1.8, 0.95]; const mid = [(handR.x + handL.x) / 2, (handR.y + handL.y) / 2, (handR.z + handL.z) / 2];
    const seg = (a, b) => (t - a) / (b - a);
    if (cold) { const u = t_ / 0.55; c = [lerp(-30, -40, u), lerp(40, 55, u), lerp(70, 85, u)]; g = [0, 1, 0.6]; fov = 55; }
    else if (t < B.h2) { const u = seg(0.55, B.h2); c = [eye[0], eye[1], eye[2]]; g = [0, lerp(1.15, 1.6, smooth(0.6, 1, u)), lerp(1.95, 4.5, smooth(0.6, 1, u))]; fov = 66; }
    else if (t < B.l0) { const u = seg(B.h2, B.l0); const a = lerp(-0.6, 0.2, u); c = [Math.sin(a) * 4.2, 1.2, 0.6 + Math.cos(a) * 4.2]; g = [-0.3, 0.95, 0.7]; fov = 52; }
    else if (t < 8.6) { const u = seg(B.l0, 8.6); c = [handR.x + lerp(-0.25, -0.35, u), handR.y + 0.12, handR.z + lerp(0.75, 0.9, u)]; g = [handR.x, handR.y + 0.02, handR.z]; fov = 50; }
    else if (t < B.l1) { const u = seg(8.6, B.l1); c = [0.35, 1.72, lerp(1.6, 1.4, u)]; g = [0, 1.75, 0.6]; fov = 45; }
    else if (t < 11.9) { const u = seg(B.l1, 11.9); c = [lerp(1.6, 2.2, u), lerp(1.0, 1.4, u), lerp(3.6, 4.2, u)]; g = [-0.3, 1.1, 0.6]; fov = 55; }
    else if (t < B.l2) { const u = seg(11.9, B.l2); const mp = mittens.position; c = [mp.x + lerp(1.4, 2.2, u), mp.y + 0.9 + u * 1.5, mp.z + lerp(2.4, 3.2, u)]; g = [mp.x, mp.y + 0.4, mp.z]; fov = 55; }
    else if (t < 15.7) { const u = seg(B.l2, 15.7); c = [handL.x + lerp(-0.6, -0.45, u), handL.y + 0.25, handL.z + lerp(0.75, 0.6, u)]; g = [handL.x + 0.05, handL.y + 0.05, handL.z]; fov = 52; }
    else if (t < B.l3) { const u = seg(15.7, B.l3); c = [-0.3, 1.75, lerp(1.5, 1.3, u)]; g = [0, 1.72, 0.6]; fov = 45; }
    else if (t < 19.9) { const u = seg(B.l3, 19.9); const a = lerp(-1.0, -0.2, easeInOut(u)); c = [Math.sin(a) * 3.0, lerp(0.7, 1.0, u), 0.6 + Math.cos(a) * 3.0]; g = [0, 1.05, 0.6]; fov = 52; }
    else if (t < B.l4) { const u = seg(19.9, B.l4); c = [lerp(-2.5, -1.2, u), 2.7, lerp(12.8, 12.4, u)]; g = [0, 1.2, 0.6]; fov = 50; }
    else if (t < 23.7) { const u = seg(B.l4, 23.7); c = [handR.x + lerp(0.5, 0.4, u), handR.y + 0.1, handR.z + lerp(0.6, 0.5, u)]; g = [handR.x, handR.y - 0.03, handR.z]; fov = 50; }
    else if (t < B.l5) { const u = seg(23.7, B.l5); c = [lerp(-9, -7, u), 2.2, lerp(9, 8, u)]; g = [0, 1.0, 0.6]; fov = 55; }
    else if (t < 27.7) { const u = seg(B.l5, 27.7); c = [lerp(2.8, 3.4, u), lerp(1.7, 2.1, u), lerp(4.6, 5.2, u)]; g = [0.8, 0.9, 0.9]; fov = 52; }
    else if (t < B.l6) { const u = seg(27.7, B.l6); c = [lerp(2.0, 1.8, u), 1.2, 2.2]; g = [1.6, 0.7, 0.4]; fov = 50; }
    else if (t < 32.1) { const u = easeInOut(seg(B.l6, 32.1)); c = [lerp(3, 6, u), lerp(4.5, 9, u), lerp(12.2, 13.0, u)]; g = [0, 0.8, 5]; fov = 60; }
    else if (t < B.l7) { const u = seg(32.1, B.l7); c = [lerp(1.5, 1.0, u), 2.6, lerp(13.0, 12.6, u)]; g = [0, 1.1, 0.6]; fov = 34; }
    else if (t < B.pay) { const u = easeInOut(seg(B.l7, B.pay)); c = [lerp(-20, -120, u), lerp(25, 700, u), lerp(60, 600, u)]; g = [0, 1, 0.6]; fov = 55; }
    else if (t < B.close) { const u = seg(B.pay, B.close); c = [lerp(2.2, 1.9, u), 1.55, lerp(2.4, 2.0, u)]; g = [-0.1, 1.45, -2.0]; fov = 55; }
    else { const u = seg(B.close, TOTAL); c = [0, 1.8, 0.28]; g = [0, lerp(1.35, 1.2, u), -1.6]; fov = 66; }
    if ((new URLSearchParams(location.search).get('dbg') || '').includes('V')) { c = [3, 2.2, 3]; g = [0, 1.2, 0.8]; fov = 50; }
    cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix(); sky.position.copy(cam.position);
    const d = cam.position.distanceTo(tv.set(...g)); A.fog.density = 1 / (Math.max(d, 4) * 14 + 60 + cam.position.y * 6);
    tv.set(...g); sun.target.position.copy(tv); sun.position.copy(tv).add(new THREE.Vector3(-20, 12, -25)); const s_ = sun.shadow.camera; const e = Math.max(8, d); s_.left = -e; s_.right = e; s_.top = e; s_.bottom = -e; s_.far = 200; s_.updateProjectionMatrix(); sun.shadow.bias = -0.0004;
    halo.position.copy(heroLight.position); halo.material.color.setRGB(...col); const hs = smooth(700, 5500, T); halo.scale.set(2.2 + hs * 3, 3.2 + hs * 3.5, 1); const hd = cam.position.distanceTo(halo.position); halo.material.opacity = (smooth(500, 1500, T) * 0.25 + hs * 0.3) * smooth(3.0, 7.0, hd); 
    // brightness of halo seen from far: grow halo at aerial
    if (t > B.l7 && t < B.pay) { const u = (t - B.l7) / (B.pay - B.l7); halo.scale.multiplyScalar(1 + u * 22); halo.material.opacity = 0.7; heroLight.intensity = heroLight.intensity * (1 + u * 60); }
    if (t > B.pay - 0.1 && t < B.close) out.exposure *= 0.75;
    { const dH = cam.position.distanceTo(tv.set(0, 1.1, 0.6)); out.exposure *= lerp(1, 2.0, smooth(4, 14, dH) * smooth(300, 1200, T)); if (t > B.l7 && t < B.pay) { out.exposure = Math.max(out.exposure, 1.3); hemi.intensity = 0.9; } }
    const DBG = new URLSearchParams(location.search).get('dbg') || ''; if (DBG.includes('L')) heroLight.intensity = 0; if (DBG.includes('B')) out.bloom = 0; if (DBG.includes('E')) glowMats.forEach(m => m.emissiveIntensity = 0); if (DBG.includes('S')) { scorch.visible = false; burnt.visible = false; } if (DBG.includes('H')) halo.visible = false; if (DBG.includes('P')) A.children.forEach(o => { if (o.isPoints) o.visible = false; });
    return out;
  }
  const caps = [[B.l1 + 1.4, 'WALKING KETTLE', 1.8], [B.l2 + 2.0, 'HOMEWORK: GONE', 1.7], [B.l3 + 1.6, 'GLOWING', 1.8], [B.l4 + 1.2, 'ALUMINUM MELTS', 1.8], [B.l5 + 1.2, 'STEEL MELTS', 1.8], [B.l6 + 1.4, 'BRIGHTER THAN A BULB', 2.2], [B.l7 + 1.4, 'SURFACE OF THE SUN', 2.2], [B.pay + 1.1, 'BRING A JACKET.', 1.6]];
  const MS = [[38, 'like a fever'], [45, 'hotter than a hot tub'], [100, 'water boils'], [233, 'paper bursts into flames'], [525, 'glowing like a stove'], [660, 'aluminum melts'], [1538, 'steel melts'], [3422, 'light bulb filament'], [5500, "the Sun's surface"]];
  const tprj = new THREE.Vector3();
  const prj = (x, y, z) => { tprj.set(x, y, z); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); tprj.project(cam); return tprj.z < 1 && Math.abs(tprj.x) < 0.95 && Math.abs(tprj.y) < 0.95 ? [(tprj.x * 0.5 + 0.5) * 1080, (1 - (tprj.y * 0.5 + 0.5)) * 1920] : null; };
  const hv = new THREE.Vector3();
  function hud(ctx, t_, st) { const W = 1080, H = 1920; const t = st.cold ? 99 : t_;
    if (st.cold) { drawPunch(ctx, W, H, '5,500°C', t_, { dur: 0.55, size: 170, color: '#ffd27a' }); return; }
    drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF YOUR BODY TEMP', size: 84 }, { text: 'NEVER STOPPED RISING?', size: 88, accent: true }], t_, '#ff8a3d', { start: 0.6, outAt: 3.9 });
    const T = st.T; const F = T * 9 / 5 + 32; const ms = [B.l0, B.l1, B.l2, B.l3, B.l4, B.l5, B.l6, B.l7]; let bump = 0; ms.forEach(m => bump = Math.max(bump, pulse(t, m, 0.35)));
    const hot = smooth(100, 1500, T); let note = ''; for (const [v, n] of MS) if (T >= v - 0.5) note = n;
    const mins = 42 + Math.floor(t / 9); const where = t > B.l7 && t < B.pay ? 'THE WHOLE CITY' : 'MAPLE STREET';
    const yC = lerp(H * 0.268, H * 0.105, smooth(3.9, 4.5, t_));
    const label = t > B.l7 ? `YOU ARE A STAR  ·  ${Math.round(F).toLocaleString('en-US')}°F` : `BODY TEMP  ·  ${Math.round(F).toLocaleString('en-US')}°F`;
    drawSideCounter(ctx, W, H, { y: yC, label, value: `${T.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°C`, note: note, bump, color: hot > 0.5 ? '#ff4a2a' : '#ffb03d', glow: `rgba(255,${Math.round(lerp(160, 40, hot))},40,0.9)` });
    ctx.save(); ctx.font = '800 26px "Inter Display", Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.fillText(`${where}  ·  7:${String(mins).padStart(2, '0')} PM`, 58, yC + 196); ctx.restore();
    for (const [at, txt, dur] of caps) drawCaption(ctx, W, H, txt, t - at, { dur, color: txt === 'BRING A JACKET.' ? '#9fd0ff' : '#ffffff' });
    // speech bubbles & name tag
    hero.headPivot.getWorldPosition(hv); const hpos = prj(hv.x, hv.y + 0.45, hv.z);
    const say = (p, at, txt, dur) => { if (p) drawBubble(ctx, p[0], p[1], txt, t - at, { dur }); };
    say(hpos, B.h2 + 0.4, 'I feel fine.', 1.6); say(hpos, B.l0 + 0.6, 'my ice cream!', 1.3); say(hpos, B.l2 + 2.2, 'MY HOMEWORK!', 1.4); say(hpos, B.l3 + 0.6, '...cool.', 1.2); say(hpos, B.l5 + 2.1, 'sorry, car.', 1.4); say(hpos, B.l7 - 1.8, 'uh... hi?', 1.3);
    say(prj(-3.5, 2.3, 11), B.l6 + 0.5, 'IS HE OK??', 1.4); say(prj(4.5, 2.3, 11.6), B.l6 + 1.4, "he's GLOWING", 1.3);
    if (t > B.pay - 0.1) { mom.headPivot.getWorldPosition(hv); say(prj(hv.x, hv.y + 0.45, hv.z), B.pay + 0.2, 'BRING A JACKET!', 1.8); }
    const mp = mittens.position; const mt = prj(mp.x, mp.y + 0.9, mp.z); if (mt) drawTag(ctx, mt[0], mt[1], 'MITTENS', t - (B.h2 + 0.2), { dur: 2.2 });
    if (t > B.pay) say(mt, B.pay + 1.6, 'mrrp.', 1.2);
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL } };
}
