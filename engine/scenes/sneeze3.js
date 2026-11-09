import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, drawTitle, drawCounter, drawGauge, drawCaption, makeSkyDome, makeEarth, makeCat, makeVoxelHouse, makeBurst, makeSuburb, makeShockwave, setFace, life, drawBubble, drawSideCounter } from './lib.js';

export const S = [3.5, 7.75, 12.0, 17.3, 23.1, 28.25, 32.3];
const PAY = 39.4, BLESS = 42.1, CLOSE = 43.9, HIC = 46.0, TOTAL = 46.8;
const LAND = 39.25, LANDZ = -1500;
const speeds = [16, 162, 1620, 16200, 162000, 1620000, 16200000];
const mults = ['x1', 'x10', 'x100', 'x1,000', 'x10,000', 'x100,000', 'x1,000,000'];

export async function create({ THREE, W, H }) {
  const R = rng(7);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e6);
  A.fog = new THREE.FogExp2(0xcfe2f2, 0.004);
  A.add(new THREE.HemisphereLight(0xd6ebff, 0x5d7a3a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); A.add(sun, sun.target);
  const sky = makeSkyDome(THREE, 0x3f86dc, 0xd4e7f6, [0.5, 0.55, 0.6]); A.add(sky);
  const flashLight = new THREE.PointLight(0xcfe8ff, 0, 0, 1.2); A.add(flashLight);
  // ground, street
  const ground = new THREE.Mesh(new THREE.CircleGeometry(20000, 64), new THREE.MeshStandardMaterial({ color: 0x6f9a4c, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; A.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 10), new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.95 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, 15); road.receiveShadow = true; A.add(road);
  for (let i = -20; i < 20; i++) { const dash = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.2), new THREE.MeshBasicMaterial({ color: 0xf2d24a })); dash.rotation.x = -Math.PI / 2; dash.position.set(i * 5, 0.03, 15); A.add(dash); }
  for (const z of [9.3, 20.7]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(400, 0.15, 1.6), new THREE.MeshStandardMaterial({ color: 0xc9c6bf })); sw.position.set(0, 0.075, z); sw.receiveShadow = true; A.add(sw); }
  const path = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 7), new THREE.MeshStandardMaterial({ color: 0xc9c6bf })); path.position.set(0, 0.03, 5); A.add(path);
  // hero house (fine voxels) behind the hero
  const hh = makeVoxelHouse(THREE, { w: 11, h: 6.5, d: 8, vs: 0.25, wall: 0xf1e3c6, roof: 0x4a6fa5, seed: 4 }); hh.mesh.position.set(0, 0, -1.6); A.add(hh.mesh);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 3.2), new THREE.MeshStandardMaterial({ color: 0x9b6b43, roughness: 0.8, flatShading: true })); deck.position.set(0, 0.15, 0); deck.castShadow = deck.receiveShadow = true; A.add(deck);
  const railM = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 0.12), railM); rail.position.set(0, 1.25, 1.5); A.add(rail);
  for (let i = -6; i <= 6; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railM); p.position.set(i * 0.48, 0.77, 1.5); A.add(p); }
  // houses across the street (front faces -z)
  const across = [];
  [-26, -13, 0, 13, 26].forEach((x, i) => { const h = makeVoxelHouse(THREE, { w: 10, h: 6, d: 8, vs: 0.5, wall: [0xf3d9b1, 0xd9e6f2, 0xf2c9c2, 0xe0efd6, 0xf5ecd0][i], roof: [0x8c3b2e, 0x3b5e8c, 0x6b6b6b, 0x7a4b2a, 0x2e6b4a][i], seed: 10 + i });
    h.mesh.position.set(x, 0, 26.5); h.mesh.rotation.y = Math.PI; A.add(h.mesh); across.push(h); });
  // trees
  const trees = [];
  for (const [x, z] of [[-7, 5], [7.5, 6], [-18, 7], [19, 4], [-9, 24], [8, 24.5], [-30, 5], [31, 6]]) { const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true })); tr.position.y = 1.5; t.add(tr);
    const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 0), new THREE.MeshStandardMaterial({ color: 0x3d8b3d, flatShading: true })); cr.position.y = 4; t.add(cr);
    t.position.set(x, 0, z); t.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(t); trees.push(t); }
  // parked cars with hazard lights
  const cars = [];
  for (const [x, z, c] of [[-8, 12, 0xd8342c], [9, 18, 0x2d6fd6], [-21, 18, 0xf2f2f2]]) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.35 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.8), m); b.position.y = 0.65; g.add(b); const tp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.6), m); tp.position.set(-0.2, 1.3, 0); g.add(tp);
    const lm = new THREE.MeshBasicMaterial({ color: 0xff9a1f }); for (const s of [-1, 1]) for (const e of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.3), lm); l.position.set(e * 2.12, 0.8, s * 0.65); g.add(l); }
    g.userData.lm = lm; g.position.set(x, 0, z); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.add(g); cars.push(g); }
  const mailbox = new THREE.Group(); { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), railM); p.position.y = 0.55; mailbox.add(p); const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x2b5fb3, flatShading: true })); b.position.y = 1.2; mailbox.add(b); }
  mailbox.position.set(2.4, 0, 8.3); A.add(mailbox);
  // suburb: realistic block grid (streets both ways, gable roofs, lawns, trees, cars, pools)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const sub = makeSuburb(THREE, { seed: 21, nx: 55, nz0: -95, nz1: 30, ox: 55, oz: 15, skip: (x, z) => (Math.abs(x) < 46 && z > -20 && z < 38) || Math.hypot(x, z - LANDZ) < 34 || Math.hypot(x, z) > 2500,
    detail: (x, z) => Math.abs(x) < 750 && z > -1900 && z < 500, waveFade: 1300 });
  A.add(sub.group);
  // clouds layer
  const clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, emissive: 0x445566 }), 600);
  for (let i = 0; i < 600; i += 6) { const a = R() * 6.28, r = 200 + Math.sqrt(R()) * 6000, cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 700 + R() * 200, s = 60 + R() * 120;
    for (let k = 0; k < 6; k++) { m4.compose(v.set(cx + (R() - 0.5) * s * 2.4, cy + (R() - 0.3) * s * 0.4, cz + (R() - 0.5) * s * 2), q.identity(), sc.set(s * (0.6 + R() * 0.5), s * 0.4, s * (0.6 + R() * 0.5))); clouds.setMatrixAt(i + k, m4); } }
  A.add(clouds);
  // grandma's place
  const gh = makeVoxelHouse(THREE, { w: 9, h: 5.5, d: 8, vs: 0.5, wall: 0xf4d7e3, roof: 0x7b4c8c, seed: 30 }); gh.mesh.position.set(0, 0, LANDZ - 4); A.add(gh.mesh);
  const gdeck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 2.6), deck.material); gdeck.position.set(0, 0.15, LANDZ - 2.6); A.add(gdeck);
  const granny = makePerson(THREE, { shirt: 0x8e5bb5, pants: 0x5b3a7a, hair: 0xdedede, skin: 0xe8b796, shoe: 0x553355 }); granny.group.position.set(1.4, 0.3, LANDZ - 2.6); granny.group.scale.setScalar(0.9); A.add(granny.group);
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x7a5230, flatShading: true })); chair.position.set(1.4, 0.55, LANDZ - 2.95); A.add(chair);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), new THREE.MeshStandardMaterial({ color: 0x2f7d34, flatShading: true })); bush.position.set(-0.4, 0.7, LANDZ + 2.6); bush.scale.set(1.3, 0.8, 1); bush.castShadow = true; A.add(bush);
  // hero, cat
  const hero = makePerson(THREE, { shirt: 0xf2a33a, pants: 0x2d3e63, hair: 0x2b1a10, skin: 0xdba27b }); A.add(hero.group);
  const nose = hero.headPivot; // emitter attached at nose
  const cat = makeCat(THREE); A.add(cat);
  // sneeze effects
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), coneMat); beam.visible = false; A.add(beam);
  const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); beamCore.visible = false; A.add(beamCore);
  const shock = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); shock.visible = false; A.add(shock);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); ring.visible = false; A.add(ring);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2d6, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); dome.visible = false; A.add(dome);
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.05, 1, 8, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); trail.visible = false; A.add(trail);
  // particle bursts per sneeze (positions relative to world; hero nose approx (0, 1.95, 0.2))
  const NZ = [0, 1.95, 0.25];
  const cone = (spread, upBias = 0) => (r) => { const a = (r() - 0.5) * spread, b = (r() - 0.5) * spread * 0.7 + upBias; return [Math.sin(a), Math.sin(b), Math.cos(a) * Math.cos(b)]; };
  const puff1 = makeBurst(THREE, 160, { origin: () => NZ, dir: cone(0.6), speed: [0.6, 2.2], life: [0.6, 1.4], size: 5, color: 0xe8f6ff, drag: 2.5, seed: 1 });
  const wind2 = makeBurst(THREE, 500, { origin: (r) => [NZ[0] + (r() - 0.5) * 0.3, NZ[1] + (r() - 0.5) * 0.3, NZ[2]], dir: cone(0.5), speed: [15, 45], life: [0.8, 2.2], size: 7, color: 0xffffff, drag: 0.6, seed: 2, additive: true });
  const leaves = makeBurst(THREE, 220, { origin: (r) => [(r() - 0.5) * 30, 2 + r() * 4, 2 + r() * 8], dir: (r) => [0.3 + r() * 0.4, 0.2 + r() * 0.3, 1], speed: [6, 14], life: [1.5, 3.5], size: 11, color: 0x3f8f2a, gravity: 1.5, seed: 3, delay: 0.4 });
  const glassB = makeBurst(THREE, 900, { origin: (r) => [[-26, -13, 0, 13, 26][Math.floor(r() * 5)] + (r() - 0.5) * 8, 1 + r() * 4.5, 26.3], dir: (r) => [(r() - 0.5) * 0.8, 0.2 + r() * 0.6, 0.3 + r() * 0.5], speed: [3, 10], life: [0.8, 2.2], size: 6, color: 0xcfeaff, gravity: 9.8, floor: 0.05, seed: 4, additive: true, delay: 0.1 });
  const dust6 = makeBurst(THREE, 160, { origin: (r) => [(r() - 0.5) * 2, r() * 2.5, -1.4], dir: (r) => [(r() - 0.5) * 1.2, r() * 0.5, 0.4 + r()], speed: [1, 4], life: [0.8, 1.8], size: 5, color: 0xe6dccb, drag: 1.2, seed: 6 });
  const debris7 = makeBurst(THREE, 1400, { origin: (r) => [(r() - 0.5) * 11, r() * 7, -1.6 - r() * 8], dir: (r) => { const a = r() * 6.28, b = 0.2 + r() * 1.0; return [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)]; }, speed: [10, 60], life: [2, 4], size: 6, color: 0xf0d9b0, gravity: 9.8, floor: 0.1, seed: 7 });
  const cloudHole = makeBurst(THREE, 500, { origin: (r) => [(r() - 0.5) * 20, 780, (r() - 0.5) * 20], dir: (r) => { const a = r() * 6.28; return [Math.cos(a), 0.1 * (r() - 0.5), Math.sin(a)]; }, speed: [60, 200], life: [1.5, 2.5], size: 14, color: 0xffffff, drag: 1.0, seed: 8 });
  [puff1, wind2, leaves, glassB, dust6, debris7, cloudHole].forEach(p => A.add(p));
  const sw3 = makeShockwave(THREE, { seed: 3, opacity: 0.5, n: 700, size: 9, sizeR: 25, color: 0xe8f6ff }); sw3.position.set(0, 0, 1); A.add(sw3);
  const sw4 = makeShockwave(THREE, { seed: 4, opacity: 0.5, n: 900, size: 10, sizeR: 30, hemi: false, color: 0xdff1ff }); sw4.position.set(0, 1.95, 2); A.add(sw4);
  const sw5 = makeShockwave(THREE, { seed: 5, n: 1400, size: 14, sizeR: 60, color: 0xfff1d8 }); sw5.position.set(0, 0, 0.5); A.add(sw5);
  const sw7 = makeShockwave(THREE, { seed: 7, n: 2200, size: 30, sizeR: 250, color: 0xfff0d0, dustColor: 0xcbb89a }); sw7.position.set(0, 0, -5); A.add(sw7);
  // neighbor across the street (reacts to everything)
  const nb = makePerson(THREE, { shirt: 0x3a9a5b, pants: 0x6b5a45, hair: 0x9b6a2c, skin: 0xc98e65, seed: 4 }); nb.group.position.set(-6.5, 0.15, 22.3); nb.group.rotation.y = Math.PI; A.add(nb.group);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xc23b2b, flatShading: true })); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 14), hat.material); brim.position.y = -0.05; hat.add(brim); A.add(hat);

  // ----- voxel destruction setup -----
  const mid = across[2]; // centre house across the street, world pos (0,0,26.5) rotated: local x -> -x, local z -> -z
  const midWorld = (vx) => [-vx.x, vx.y, 26.5 - vx.z];
  const tunnel = mid.vox.map((vx, i) => { const w = midWorld(vx); return Math.hypot(w[0], w[1] - 1.95) < 1.7 ? i : -1; }).filter(i => i >= 0);
  const winIdx = across.map(h => h.vox.map((vx, i) => vx.win ? i : -1).filter(i => i >= 0));
  const heroHole = hh.vox.map((vx, i) => { const front = vx.z > -0.3; if (!front) return -1; const x = vx.x, y = vx.y - 0.3;
    const body = Math.abs(x) < 0.32 && y > 0.75 && y < 1.55; const legs = (Math.abs(x - 0.2) < 0.13 || Math.abs(x + 0.2) < 0.13) && y > 0 && y < 0.9; const head = Math.hypot(x, y - 1.75) < 0.24; const arms = Math.abs(x) < 1.0 && y > 1.3 && y < 1.55;
    return body || legs || head || arms ? i : -1; }).filter(i => i >= 0);
  const backHole = hh.vox.map((vx, i) => { const back = vx.z < -7.6; return (back && Math.abs(vx.x) < 1.3 && vx.y < 3.2) || (vx.y > 6.4 && Math.abs(vx.x) < 1.6 && vx.z < -3) ? i : -1; }).filter(i => i >= 0);
  const RV = rng(77); const vel = (n, base) => Array.from({ length: n }, () => [base[0] + (RV() - 0.5) * base[3], base[1] + RV() * base[4], base[2] + (RV() - 0.5) * base[5]]);
  const tunnelV = vel(tunnel.length, [0, 3, 1, 8, 6, 30].map((x, i) => i === 2 ? 25 : x));
  const heroV = vel(heroHole.length, [0, 1, -6, 3, 3, 4]);
  const backV = vel(backHole.length, [0, 6, -14, 12, 10, 8]);
  const winV = winIdx.map(ix => vel(ix.length, [0, 1, 4, 3, 3, 4]));
  const tm = new THREE.Matrix4(), tq = new THREE.Quaternion(), te = new THREE.Euler();
  function flyVox(H_, idx, V, t0, t, scaleAfter = 1) {
    for (let k = 0; k < idx.length; k++) { const i = idx[k], vx = H_.vox[i]; const dt = t - t0;
      if (dt < 0) { tm.makeTranslation(vx.x, vx.y, vx.z); }
      else { const vv = V[k]; let y = vx.y + vv[1] * dt - 4.9 * dt * dt; if (y < H_.vs / 2) y = H_.vs / 2; te.set(dt * vv[0], dt * 3, dt * vv[2] * 0.2); tq.setFromEuler(te);
        const s = dt > 3 ? 0.0001 : scaleAfter; tm.compose(v.set(vx.x + vv[0] * dt, y, vx.z + vv[2] * dt), tq, sc.setScalar(s)); }
      H_.mesh.setMatrixAt(i, tm); }
    H_.mesh.instanceMatrix.needsUpdate = true;
  }
  // ----- planet scene for sneeze 5 -----
  const B = new THREE.Scene(); const camB = new THREE.PerspectiveCamera(50, W / H, 1, 5e6);
  B.add(new THREE.AmbientLight(0x223355, 0.4)); const sB = new THREE.DirectionalLight(0xffffff, 3); sB.position.set(1, 0.4, 0.6); B.add(sB);
  const earth = makeEarth(THREE); earth.userData.earth.rotation.y = 1.4; B.add(earth);
  { const R3 = rng(5); const n = 4000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = R3() * 2 - 1, th = R3() * 6.28, s = Math.sqrt(1 - u * u); pos.set([1e6 * s * Math.cos(th), 1e6 * u, 1e6 * s * Math.sin(th)], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); B.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false }))); }
  const beamB = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); B.add(beamB);
  const beamHead = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); B.add(beamHead);
  const UP = new THREE.Vector3(0.35, 0.8, 0.5).normalize(); // launch site direction on the globe
  beamB.visible = false; beamHead.visible = false;
  // atmospheric shock ring racing around the planet + white blast cap + debris plume
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); B.add(ringB);
  const ringB2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 160), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); B.add(ringB2);
  const capB = new THREE.Mesh(new THREE.SphereGeometry(6440, 96, 48, 0, Math.PI * 2, 0, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); B.add(capB);
  const plume = makeShockwave(THREE, { seed: 9, n: 1500, size: 260, sizeR: 3000, hemi: true, color: 0xcfe8ff, dustColor: 0xf2ece0 }); B.add(plume);

  // ---------- hero motion ----------
  const flight = (t) => { // B6 recoil + B7 launch path
    if (t < S[5]) return [0, 0.3, 0];
    if (t < S[6]) { const u = clamp((t - S[5]) / 0.45); return [0, 0.3 + Math.sin(u * Math.PI) * 0.3, lerp(0, -4.2, easeOut(u))]; }
    const u = clamp((t - S[6]) / (LAND - S[6])); const z = lerp(-4.2, LANDZ + 2.6, u); const y = 0.3 + Math.sin(u * Math.PI) * 420 * (1 - 0.15 * u) + (u > 0.97 ? 0 : 0); return [lerp(0, -0.4, u), Math.max(y, u > 0.5 ? 0.9 : 0.3), z];
  };
  function sneezeIdx(t) { let k = -1; S.forEach((s, i) => { if (t >= s) k = i; }); return k; }

  const tv = new THREE.Vector3();
  function update(t) {
    const k = sneezeIdx(t); const age = k >= 0 ? t - S[k] : 99;
    const nextS = S.find(s => s > t) ?? 1e9; const wind = clamp(1 - (nextS - t) / 0.9); // wind-up before each sneeze
    const out = { scene: A, camera: cam, bloom: 0.55, bloomThreshold: 0.82, shake: 0, flash: 0 };
    // ---- hero pose ----
    const P = hero; const fp = flight(t); P.group.position.set(...fp); P.group.rotation.set(0, 0, 0);
    P.armL.rotation.set(0, 0, -0.1); P.armR.rotation.set(0, 0, 0.1); P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0);
    let headX = 0; const lookUp = t > S[4] - 0.9 && t < S[5] - 0.3 ? smooth(S[4] - 0.9, S[4] - 0.3, t) : 0;
    const windT = (t < S[0]) ? smooth(0.4, S[0], t) : wind; headX = -0.45 * windT * (age > 0.25 || k < 0 ? 1 : 0);
    if (age < 0.35) headX = lerp(0.5, 0, age / 0.35); // the CHOO snaps forward
    headX += -1.1 * lookUp;
    P.headPivot.rotation.set(headX, 0, 0); P.group.rotation.x = -0.25 * lookUp + (age < 0.3 ? 0.06 : 0) - windT * 0.05;
    const eyesShut = (windT > 0.6 || age < 0.4) ? 0.15 : 1; P.eyeL.scale.y = P.eyeR.scale.y = eyesShut;
    P.mouth.scale.set(windT > 0.3 ? 1.6 : 1, windT > 0.3 ? 6 : (age < 0.3 ? 3 : 1), 1);
    if (t >= S[5] && t < S[6]) { const u = clamp((t - S[5]) / 0.45); P.armL.rotation.z = -1.55 * u; P.armR.rotation.z = 1.55 * u; P.headPivot.rotation.x = 0; P.eyeL.scale.y = P.eyeR.scale.y = 1.3; }
    if (t >= S[6]) { P.armL.rotation.z = -2.2 + Math.sin(t * 14) * 0.5; P.armR.rotation.z = 2.2 - Math.sin(t * 14) * 0.5; P.legL.rotation.x = Math.sin(t * 11) * 0.6; P.legR.rotation.x = -Math.sin(t * 11) * 0.6; P.group.rotation.x = t < LAND ? -0.6 + (t - S[6]) * 0.5 : 0; P.eyeL.scale.y = P.eyeR.scale.y = 1.4; P.mouth.scale.set(1.5, 7, 1); }
    if (t >= LAND) { // face-down in the bush, legs up
      P.group.position.set(-0.4, 2.55, LANDZ + 2.6); P.group.rotation.set(Math.PI * 0.95, 0, 0.1); P.legL.rotation.x = 0.3 + Math.sin(t * 8) * 0.25; P.legR.rotation.x = -0.2 - Math.sin(t * 8) * 0.25; P.armL.rotation.z = -0.3; P.armR.rotation.z = 0.3;
      if (t > CLOSE) { const u = smooth(CLOSE, CLOSE + 0.6, t); P.group.rotation.set(lerp(Math.PI * 0.95, 0, u), 0, 0); P.group.position.set(lerp(-0.4, 0.4, u), lerp(2.55, 0.0, u) + (t > HIC ? Math.sin(clamp((t - HIC) / 0.6) * Math.PI) * 1.1 : 0), LANDZ + lerp(1.5, 3.2, u)); P.legL.rotation.x = P.legR.rotation.x = 0; P.eyeL.scale.y = P.eyeR.scale.y = t > HIC && t < HIC + 0.5 ? 1.6 : 1; P.mouth.scale.set(1, 1, 1); P.armL.rotation.z = -0.1; P.armR.rotation.z = 0.1; }
    }
    // granny
    granny.group.rotation.x = Math.sin(t * 1.6) * 0.04; granny.armL.rotation.set(-1.2, 0, 0); granny.armR.rotation.set(-1.2, 0, 0); granny.legL.rotation.x = granny.legR.rotation.x = -1.4; granny.group.position.y = 0.05;
    granny.headPivot.rotation.y = t > BLESS - 0.6 ? -0.5 : 0;
    // cat
    if (t < S[1]) { cat.position.set(0.9, 1.31, 1.5); cat.rotation.set(0, Math.PI * 0.9 + (t > S[0] && t < S[0] + 1 ? 0.6 : 0), 0); cat.scale.setScalar(1); }
    else { const u = t - S[1]; cat.position.set(0.9 - u * 3.2, 1.31 + u * 3.2 - u * u * 0.9, 1.5 + u * 2.2); cat.rotation.set(u * 9, u * 5, u * 3); cat.visible = u < 3.5; }
    // trees bend in the hurricane gust
    const gust = k === 1 ? Math.exp(-age * 0.9) * Math.min(1, age * 8) : (k === 2 && age < 1 ? 0.4 * Math.exp(-age * 3) : 0);
    trees.forEach((tr, i) => { tr.rotation.set(0.35 * gust + Math.sin(t * 9 + i) * 0.05 * gust, 0, 0.1 * gust * Math.sin(i)); });
    // car hazards after sonic boom
    cars.forEach(c => { c.userData.lm.color.set(t > S[2] + 0.4 && Math.floor(t * 3) % 2 ? 0xffb030 : 0x553300); if (t > S[2] + 0.4 && t < S[2] + 0.6) c.position.y = 0.15; else c.position.y = 0; });
    // ---- effects ----
    puff1.userData.update(t, S[0]); wind2.userData.update(t, S[1]); leaves.userData.update(t, S[1]); glassB.userData.update(t, S[2] + 1.3); dust6.userData.update(t, S[5] + 0.35); debris7.userData.update(t, S[6]); cloudHole.userData.update(t, S[4] + 0.5);
    // windows shatter
    across.forEach((h, i) => flyVox(h, winIdx[i], winV[i], S[2] + 1.3 + Math.abs(i - 2) * 0.06, t, 0.6));
    flyVox(mid, tunnel, tunnelV, S[3] + 0.08, t, 1);
    flyVox(hh, heroHole, heroV, S[5] + 0.33, t, 1);
    flyVox(hh, backHole, backV, S[6] + 0.05, t, 1);
    // sonic shock sphere (sneeze 3) and ring
    shock.visible = k === 2 && age < 1.7; if (shock.visible) { shock.position.set(...NZ); const r = 0.5 + age * 19.5; shock.scale.setScalar(r); shock.material.opacity = 0.12 * (1 - smooth(1.2, 1.7, age)); }
    ring.visible = (k === 2 && age < 0.9) || (k === 3 && age < 0.6) || (k === 4 && age < 0.6); if (ring.visible) { const kk = k; ring.position.set(NZ[0], NZ[1], NZ[2] + age * (kk === 2 ? 3 : 25)); ring.scale.setScalar(0.5 + age * (kk === 2 ? 30 : 8)); ring.material.opacity = 0.9 * (1 - age / 0.9); ring.rotation.set(0, 0, 0);
      if (k === 4) { ring.position.set(0, 2.2 + age * 60, 0.4); ring.rotation.x = Math.PI / 2; } }
    // beam (sneeze 4 horizontal, sneeze 5 vertical)
    const beamOn = false;
    beam.visible = beamCore.visible = beamOn;
    if (beamOn) { const len = k === 3 ? Math.min(400, age * 2000) : Math.min(3000, age * 4000); const fade = k === 3 ? 1 - smooth(0.8, 1.6, age) : 1 - smooth(1.4, 2.2, age);
      beam.position.set(...NZ); beamCore.position.set(...NZ); if (k === 4) { beam.position.set(0, 2.15, 0.15); beamCore.position.copy(beam.position); }
      beam.rotation.set(k === 4 ? -Math.PI / 2 : 0, 0, 0); beamCore.rotation.copy(beam.rotation);
      beam.scale.set(0.5 + age * 0.6, 0.5 + age * 0.6, len); beamCore.scale.set(0.12, 0.12, len); beam.material.opacity = 0.22 * fade; beamCore.material.opacity = 0.75 * fade; }
    // dome blast (sneeze 7)
    dome.visible = k === 6 && age < 0.9; if (dome.visible) { dome.position.set(0, 0, -5); dome.scale.setScalar(5 + easeOut(age / 2.4) * 260); dome.material.opacity = 0.75 * (1 - age / 0.9); }
    flashLight.position.set(0, 3, 2); flashLight.intensity = (k >= 2 && age < 0.3 ? (1 - age / 0.3) * 60 * (k - 1) : 0);
    // expanding shockwaves
    sw3.userData.set(0.5 + easeOut(clamp(age / 1.6)) * 45, k === 2 ? age / 1.6 : -1, 1);
    sw4.userData.set(0.5 + easeOut(clamp(age / 1.8)) * 70, k === 3 ? age / 1.8 : -1, 1.4);
    sw5.userData.set(1 + easeOut(clamp(age / 2.4)) * 240, k === 4 ? age / 2.4 : -1, 1.6);
    const r7 = k >= 6 ? 4 + easeOut(clamp(age / 3.2)) * 900 : 0;
    sw7.userData.set(r7, k === 6 ? age / 3.4 : -1, 2.2);
    if (k >= 6) sub.wave(0, -5, r7, 70, 1.0); else if (k >= 4) sub.wave(0, 0.5, k === 4 ? 1 + easeOut(clamp(age / 2.4)) * 240 : 241, 40, 0.55);
    // ---- faces & life ----
    {
      let f = { brows: 'neutral', eyes: 1, mouth: 'flat', look: [0, 0] };
      const preT = (nextS - t);
      if (t < S[0]) { const u = smooth(0.3, S[0], t); f = { brows: u > 0.5 ? 'worried' : 'up', eyes: lerp(1, 0.35, u), mouth: 'open', open: lerp(0.8, 1.8, u), look: [0, 0.6] }; }
      else if (age < 0.4) f = { brows: 'squint', eyes: 0.08, mouth: 'open', open: 2.0 };
      else if (preT < 0.9 && t < S[6]) { const u = 1 - preT / 0.9; f = { brows: 'worried', eyes: lerp(1, 0.3, u), mouth: 'open', open: 1 + u, look: [0, 0.5] }; }
      else if (k === 0) f = { brows: 'up', eyes: 1.1, mouth: 'smile', look: [0.3, 0] };
      else if (k === 1) f = { brows: 'up', eyes: 1.55, mouth: 'open', open: 1.6, look: [-0.8, 0.6] };
      else if (k === 2) f = { brows: 'worried', eyes: 1.3, mouth: 'grit', look: [0, 0] };
      else if (k === 3) f = { brows: 'up', eyes: 1.6, mouth: 'o', look: [0, 0] };
      else if (k === 4) f = { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.4, look: [0, 1] };
      else if (k === 5) f = { brows: 'worried', eyes: 1.4, mouth: 'grit' };
      if (t >= S[6] && t < LAND) f = { brows: 'up', eyes: 1.6, mouth: 'open', open: 2.2, look: [0, -0.5] };
      if (t >= LAND && t < CLOSE) f = { brows: 'squint', eyes: 0.2, mouth: 'grit' };
      if (t >= CLOSE) f = { brows: t > HIC ? 'up' : 'worried', eyes: t > HIC && t < HIC + 0.5 ? 1.6 : 0.9, mouth: t > HIC && t < HIC + 0.4 ? 'o' : 'smile', look: [-0.6, 0] };
      setFace(P, f); life(P, t, t >= S[6] && t < CLOSE ? 0 : 1, { noBlink: f.eyes < 0.5 });
      // granny
      setFace(granny, { brows: 'neutral', eyes: t > BLESS - 0.6 ? 0.7 : 1, mouth: t > BLESS - 0.2 ? 'smile' : 'flat', look: [t > BLESS - 0.6 ? -0.8 : 0, 0] }); life(granny, t, 0.7);
      // neighbor: idle watering, then reacts
      const N = nb; N.group.position.set(-6.5, 0.15, 22.3); N.group.rotation.set(0, Math.PI, 0); N.armL.rotation.set(-0.9, 0, -0.1); N.armR.rotation.set(-0.2, 0, 0.15); N.legL.rotation.set(0, 0, 0); N.legR.rotation.set(0, 0, 0); N.headPivot.rotation.set(0, 0, 0); N.torso.rotation.set(0, 0, 0);
      let nf = { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0, 0] };
      if (k === 0 && age < 2.5) { N.armR.rotation.set(-2.6, 0, 0.3 + Math.sin(t * 12) * 0.25); nf = { brows: 'up', eyes: 1.1, mouth: 'smile' }; }
      if (k === 1) { const g = Math.exp(-age * 0.8); N.group.rotation.x = -0.35 * g; N.armL.rotation.set(-2.4 * g, 0, -0.6 * g); N.armR.rotation.set(-2.4 * g, 0, 0.6 * g); nf = { brows: 'worried', eyes: 0.3 + 1.2 * (1 - g), mouth: 'open', open: 1.6 }; }
      if (k === 2) { N.armL.rotation.set(-2.8, 0, 0.9); N.armR.rotation.set(-2.8, 0, -0.9); N.group.position.y = 0.15 - 0.25 * Math.min(1, age * 4); nf = { brows: 'squint', eyes: 0.15, mouth: 'grit' }; }
      if (k >= 3) { const u = clamp((age - 0.4) / 0.5); N.headPivot.rotation.y = k === 3 ? lerp(0, -1.2, u) : -0.4; N.armL.rotation.set(-1.4, 0, -0.5); N.armR.rotation.set(-1.4, 0, 0.5); N.group.position.y = 0.15 + (k === 3 && age > 1.2 && age < 1.6 ? Math.sin((age - 1.2) / 0.4 * Math.PI) * 0.4 : 0); nf = { brows: 'up', eyes: 1.6, mouth: 'open', open: 2.0, look: [k === 3 ? -1 : 0, 0] }; }
      setFace(N, nf); life(N, t, 1);
      // hat: on head until the hurricane gust, then tumbles away
      if (t < S[1] + 0.15) { hat.position.set(-6.5, 0.15 + 1.5 + 0.38, 22.3); hat.rotation.set(0, 0, 0); hat.visible = true; }
      else { const u = t - S[1] - 0.15; hat.position.set(-6.5 + u * 2, 2.03 + u * 5 - u * u * 1.2, 22.3 + u * 9); hat.rotation.set(u * 7, u * 3, u * 5); hat.visible = u < 4; }
      // screen anchors for speech bubbles
      const prj = (o3, dy) => { tv.setFromMatrixPosition(o3.matrixWorld); tv.y += dy; const cam_ = out.camera; cam_.updateMatrixWorld(); cam_.matrixWorldInverse.copy(cam_.matrixWorld).invert(); tv.project(cam_); return tv.z < 1 && Math.abs(tv.x) < 0.95 && Math.abs(tv.y) < 0.95 ? [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920] : null; };
      out.anchors = () => ({ hero: prj(P.headPivot, 0.42), nb: prj(N.headPivot, 0.42), granny: prj(granny.headPivot, 0.4) });
    }
    // trail in flight
    trail.visible = t > S[6] && t < LAND; if (trail.visible) { const p0 = flight(t - 0.5), p1 = flight(t); const d = tv.set(p0[0] - p1[0], p0[1] - p1[1] + 1, p0[2] - p1[2]); trail.position.set(p1[0], p1[1] + 1, p1[2]); trail.scale.set(3, d.length(), 3); trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
    // shake & flash per sneeze
    const shk = [0.05, 0.25, 0.7, 0.8, 0.8, 0.6, 1.0]; if (k >= 0) out.shake = shk[k] * Math.exp(-age * 4);
    if (k >= 0) out.flash = [0, 0, 0.6, 0.5, 0.5, 0.2, 0.95][k] * pulse(t, S[k], 0.35);
    out.flash = Math.max(out.flash, pulse(t, 25.0, 0.25) * 0.7, pulse(t, LAND, 0.2) * 0.5);
    // ---- cameras ----
    let c, g, fov = 50, useB = false;
    if (t < S[0]) { const u = t / S[0]; c = [lerp(0.55, 0.32, u), lerp(1.95, 1.9, u), lerp(1.7, 1.05, u)]; g = [0, 1.92, 0]; fov = 50; }
    else if (t < S[1]) { const u = (t - S[0]) / (S[1] - S[0]); c = [lerp(3.4, 3.0, u), 1.75, lerp(3.2, 3.6, u)]; g = [0.2, 1.45, 0.9]; fov = 52; }
    else if (t < S[2]) { const u = (t - S[1]) / (S[2] - S[1]); c = [lerp(3.3, 3.8, u), lerp(1.9, 2.2, u), lerp(4.6, 5.4, u)]; g = [-0.6, 2.2, 1.6]; fov = 60; }
    else if (t < S[3]) { if (t < S[2] + 0.9) { const u = (t - S[2]) / 0.9; c = [lerp(3.4, 3.8, u), 1.9, lerp(3.4, 4.0, u)]; g = [0.2, 1.8, 1.2]; fov = 55; } else { const u = (t - S[2] - 0.9) / (S[3] - S[2] - 0.9); c = [lerp(-1.6, -2.4, u), lerp(2.0, 2.3, u), lerp(1.6, 0.8, u)]; g = [-2, 3.0, 26]; fov = 62; } }
    else if (t < S[4]) { if (t < S[3] + 2.6) { const u = (t - S[3]) / 2.6; c = [0.75, 2.25, lerp(-1.3, -0.6, u)]; g = [0.1, 2.1, 26]; fov = 48; } else { const u = (t - S[3] - 2.6) / (S[4] - S[3] - 2.6); c = [lerp(0.6, 0.2, u), 2.0, lerp(42, 38, u)]; g = [0, 2.0, 0]; fov = 38; } }
    else if (t < S[5]) { if (t < 25.0) { const u = (t - S[4] + 0.9) / (25.0 - S[4] + 0.9); c = [lerp(55, 70, u), lerp(38, 55, u), lerp(85, 100, u)]; g = [0, lerp(2, 12, smooth(S[4], 25, t)), 0]; fov = 60; } else useB = true; }
    else if (t < S[6]) { const u = (t - S[5]) / (S[6] - S[5]); c = [lerp(3.2, 2.6, u), lerp(1.9, 1.7, u), lerp(7.5, 6.2, u)]; g = [0, 1.6, -1.6]; fov = 50; }
    else if (t < 34.7) { const u = (t - S[6]) / (34.7 - S[6]); c = [lerp(90, 110, u), lerp(70, 95, u), lerp(110, 140, u)]; g = [0, lerp(5, 40, u), -20]; fov = 55; }
    else if (t < LAND) { const p = flight(t); const u = (t - 34.7) / (LAND - 34.7); c = [p[0] + lerp(7, 5, u), p[1] + lerp(3.5, 2.5, u), p[2] + lerp(10, 8, u)]; g = [p[0], p[1] - 0.5, p[2] - 3]; fov = 58; }
    else if (t < CLOSE) { const u = (t - LAND) / (CLOSE - LAND); c = [lerp(3.8, 3.0, u), lerp(2.3, 2.0, u), LANDZ + lerp(9.0, 7.8, u)]; g = [0.4, 1.3, LANDZ + 0.5]; fov = 52; }
    else { const u = (t - CLOSE) / (TOTAL - CLOSE); c = [lerp(2.2, 1.6, u), lerp(1.7, 1.8, u), LANDZ + lerp(7.2, 6.0, u)]; g = [-0.4, 1.5 + (t > HIC ? 0.6 * Math.sin(clamp((t - HIC) / 0.6) * Math.PI) : 0), LANDZ + 3]; fov = 50; }
    if (useB) {
      out.scene = B; out.camera = camB; const u = (t - 25.0) / (S[5] - 25.0); const RE = 6371;
      const L = 200 + Math.pow(u, 1.6) * 60000; const base = UP.clone().multiplyScalar(RE);
      { const al = 0.02 + easeOut(u) * 0.75; const RA = RE + 60; const yax = new THREE.Vector3(0, 0, 1);
        for (const [rg, kk] of [[ringB, 1], [ringB2, 0.92]]) { const a2 = al * kk; rg.position.copy(UP).multiplyScalar(RA * Math.cos(a2)); rg.quaternion.setFromUnitVectors(yax, UP); rg.scale.setScalar(RA * Math.sin(a2)); rg.material.opacity = (kk === 1 ? 0.95 : 0.4) * (1 - u * 0.6); }
        capB.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), UP); capB.scale.setScalar(1); capB.material.opacity = 0.35 * (1 - u); capB.geometry.dispose(); capB.geometry = new THREE.SphereGeometry(RE + 40, 96, 48, 0, Math.PI * 2, 0, al);
        plume.position.copy(base); plume.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), UP); plume.userData.set(300 + easeOut(u) * 2600, Math.min(0.95, u * 0.9 + 0.02), 3.0); }
      beamB.position.copy(base); beamB.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), UP); beamB.scale.set(25 + u * 60, L, 25 + u * 60);
      beamHead.position.copy(UP).multiplyScalar(RE + L); beamHead.scale.setScalar(120 + u * 300);
      const side = new THREE.Vector3().crossVectors(UP, new THREE.Vector3(0, 0, 1)).normalize();
      const cp = UP.clone().multiplyScalar(RE + lerp(7000, 15000, easeInOut(u))).add(side.clone().multiplyScalar(lerp(15000, 21000, u)));
      camB.position.copy(cp); camB.up.copy(UP); camB.lookAt(UP.clone().multiplyScalar(RE + lerp(800, 2500, easeInOut(u)))); camB.fov = 50; camB.updateProjectionMatrix(); out.bloom = 1.0; out.bloomThreshold = 0.7;
    } else {
      cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix();
      sky.position.copy(cam.position);
      const d = cam.position.distanceTo(tv.set(...g)); A.fog.density = 1 / (Math.max(d, 6) * 22 + 200 + cam.position.y * 12);
      tv.set(...g); sun.target.position.copy(tv); sun.position.copy(tv).add(new THREE.Vector3(30, 50, 25)); const sc_ = sun.shadow.camera; const e = Math.max(12, d * 0.8); sc_.left = -e; sc_.right = e; sc_.top = e; sc_.bottom = -e; sc_.far = 300; sc_.updateProjectionMatrix(); sun.shadow.bias = -0.0004;
    }
    out.k = k; out.age = age; return out;
  }

  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const caps = [[S[1] + 0.5, 'HURRICANE FORCE', 1.8], [S[2] + 0.4, 'SONIC BOOM', 1.8], [S[3] + 1.0, 'FASTER THAN A BULLET', 2.0], [S[4] + 2.6, 'BYE, EARTH', 1.8], [S[5] + 1.2, 'RECOIL', 1.4], [S[6] + 0.6, 'TONS OF TNT', 2.0], [HIC, 'HIC!', 0.8]];
  function hud(ctx, t, st) { const W = 1080, H = 1920;
    drawTitle(ctx, W, H, [{ text: 'WHAT IF EVERY SNEEZE', size: 88 }, { text: 'WAS 10x STRONGER?', size: 92, accent: true }], t);
    const k = st.k; const kk = Math.max(0, k);
    const prev = k > 0 ? speeds[k - 1] : 0; const val = k < 0 ? 0 : lerp(prev, speeds[k], easeOut(clamp(st.age / 0.45)));
    { const notes = ["a normal sneeze", "category 5 hurricane", "faster than sound", "faster than a bullet", "escapes Earth's gravity", "Mach 1,300", "1.5% of light speed"]; drawSideCounter(ctx, W, H, { label: k < 0 ? 'SNEEZE SPEED' : `SNEEZE #${k + 1}  ·  ${mults[kk]}`, value: `${fmt(val)} km/h`, note: k >= 0 ? notes[kk] : 'charging...', bump: k >= 0 ? Math.max(0, 1 - st.age / 0.35) : 0, color: '#7fe3ff' }); }
    if (st.anchors) { const an = st.anchors(); const say = (who, at, txt, dur) => { const p = an[who]; if (p) drawBubble(ctx, p[0], p[1], txt, t - at, { dur }); };
      say('hero', S[0] + 0.9, 'excuse me.', 1.3); say('nb', S[1] + 0.5, 'MY HAT!', 1.3); say('hero', S[1] + 2.4, 'MITTENS!!', 1.1);
      say('nb', S[3] + 1.2, 'MY HOUSE!', 1.3); say('hero', S[3] + 3.0, 'sorry Dave...', 1.4); say('hero', S[4] - 1.6, 'oh no. not again.', 1.2);
      say('hero', S[6] + 4.2, 'AAAAAAA!', 1.8); say('granny', BLESS, 'bless you, dear.', 1.7); }
    for (const [at, txt, dur] of caps) drawCaption(ctx, W, H, txt, t - at, { dur, color: txt.startsWith('"') ? '#ffe9a8' : '#ffffff', size: txt.startsWith('"') ? 104 : 96 });
    if (t < S[0]) drawCaption(ctx, W, H, 'ahh...', t - 0.5, { dur: S[0] - 0.5, size: 90, y: H * 0.7, rot: 0 });
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL } };
}
