import { clamp, lerp, smooth, easeOut, pulse, rng, makePerson, makeSkyDome, makeCat, setCatFace, catLife, softTex, setFace, life, drawTitleTimed, drawTag, drawBubble, drawTeaser, RoundedBoxGeometry, stars, makeEarth } from './lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Nov 26 episode: "What if Earth's spin doubled every 2 seconds?"  (Nov 20 STANDARD)
// HUMAN PART (a beach on the equator at sunset): you watch the sunset with Mittens. Spin factor k = 2^((t-2)/2).
//   You get lighter (centrifugal force grows with k^2): you hop higher and higher, weightless at x17 (10.2 s), the sea floats up and
//   flies off at escape speed (x24, 11.2 s); you grab the palm tree, Mittens grabs your shoe. Cast: THE PIGEON (judges, then floats off
//   flapping) and THE UNBOTHERED PERSON (keeps eating his sandwich in his deckchair while it floats away).
// BIG PART (clean, 12 s on): Earth in space, the same framing, spinning faster and faster, the sea spraying off its equator in a
//   growing spiral; spin speed gauge + milestones; hero cam inset (you hanging 'up' from the palm tree, Mittens on your shoe, the sky
//   flicking from day to night faster and faster). Ends at 96% of light speed. Teaser = FREEZE on the last frame (loop).
const FONT = '"Inter Display", Inter, sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const TEASER = 1.2, TOT = 40.4, CUT = 12.0, T0 = 2.0;
const V0 = 465.1, C = 299792458;
const kAt = (t) => (t <= T0 ? 1 : Math.pow(2, (t - T0) / 2));
const tOf = (k) => T0 + 2 * Math.log2(k);
// [k, title, sub, icon]
const MIL0 = [[2, 'FASTER THAN A BULLET', 'you: 930 m/s · rifle bullet ~900 m/s', 'bullet'], [8, '22% LIGHTER', 'the spin flings you outward', 'feather'],
  [12, 'HALF YOUR WEIGHT', '1 day = 2 hours', 'feather'], [17, 'WEIGHTLESS', '7.9 km/s = orbit speed', 'float'], [24.05, 'ESCAPE SPEED', '11.2 km/s: the sea flies off', 'rocket'],
  [64, 'FASTER THAN EARTH ORBITS', 'Earth goes round the Sun at 29.8 km/s', 'orbit'], [90.5, 'COULD LEAVE THE SUN', '42 km/s escapes the Solar System', 'sun'],
  [144, '1 DAY = 10 MINUTES', 'spin ×144', 'clock'], [287, '1 DAY = 5 MINUTES', 'spin ×287', 'clock'], [412, 'FASTER THAN ANY SPACECRAFT', 'record: Parker Solar Probe, 192 km/s', 'probe'],
  [720, '1 DAY = 2 MINUTES', 'spin ×720', 'clock'], [1183, 'COULD LEAVE THE MILKY WAY', 'galaxy escape speed ~550 km/s', 'galaxy'], [2880, '1 DAY = 30 SECONDS', 'spin ×2,880', 'clock'],
  [6446, '1% LIGHT SPEED', '3,000 km/s', 'light'], [14400, '1 DAY = 6 SECONDS', 'spin ×14,400', 'clock'], [28800, '1 DAY = 3 SECONDS', 'a sunset every 3 s', 'clock'],
  [86400, '1 DAY = 1 SECOND', '40,200 km/s = 13% of light', 'clock'], [161180, '25% LIGHT SPEED', '75,000 km/s', 'light'], [322360, 'HALF LIGHT SPEED', '150,000 km/s', 'light'], [580230, '90% LIGHT SPEED', '270,000 km/s', 'light']];
const MIL = MIL0.map(([k, a, b, ic]) => [k, tOf(k), a, b, ic]);
export { TOT, MIL };

export async function create({ THREE, W, H }) {
  const R = rng(2611);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler(), tv = new THREE.Vector3(), col = new THREE.Color();
  const matCache = new Map(); const M = (c, r = 0.75, mt = 0) => { const k = c + '_' + r + '_' + mt; if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })); return matCache.get(k); };
  function Builder() { const parts = new Map(); return {
    add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, s = null) { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s ? sc.set(...s) : sc.set(1, 1, 1))); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); },
    build(group) { for (const [mat, gs] of parts) { const mm = new THREE.Mesh(mergeGeometries(gs), mat); mm.castShadow = mm.receiveShadow = true; group.add(mm); } return group; } }; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
  const CY = (a, b, h, n = 16) => new THREE.CylinderGeometry(a, b, h, n), SP = (r, a = 20, b = 14) => new THREE.SphereGeometry(r, a, b);
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  const glowT = softTex(THREE, 128);

  // =====================================================================================================
  // SCENE A: a beach on the equator at sunset (metres). Sea at x > 2.6, sun low over the sea (+x, slightly -z).
  // =====================================================================================================
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(46, W / H, 0.05, 3000);
  const SUND = new THREE.Vector3(0.86, 0.11, -0.5).normalize();
  const skyA = makeSkyDome(THREE, 0x5a7fc8, 0xffa860, [SUND.x, SUND.y, SUND.z]); skyA.scale.setScalar(2000); A.add(skyA);
  A.add(new THREE.HemisphereLight(0xffe6c8, 0xc09060, 1.0));
  const sun = new THREE.DirectionalLight(0xffb070, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3; A.add(sun, sun.target);
  { const c = sun.shadow.camera; c.left = -7; c.right = 7; c.top = 7; c.bottom = -7; c.near = 1; c.far = 60; sun.position.copy(SUND).multiplyScalar(25); }
  const faceL = new THREE.PointLight(0xffd8a8, 6, 9, 1.4); A.add(faceL);
  const fillA = new THREE.DirectionalLight(0xffe2c0, 1.1); fillA.position.set(-4, 3, 4); A.add(fillA);
  A.fog = new THREE.Fog(0xffc08a, 60, 900);
  const sandT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e9c98f'; g.fillRect(0, 0, w, h); const r = rng(5); for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${150 + r() * 80},${120 + r() * 60},${70 + r() * 40},${0.25 + r() * 0.3})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } });
  sandT.wrapS = sandT.wrapT = THREE.RepeatWrapping; sandT.repeat.set(60, 60);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: sandT, roughness: 0.95 })); sand.rotation.x = -Math.PI / 2; sand.position.set(-197.4, 0, 0); sand.receiveShadow = true; sand.name = 'sand'; A.add(sand);
  const wetSand = new THREE.Mesh(new THREE.PlaneGeometry(3, 400), new THREE.MeshStandardMaterial({ color: 0xb89a68, roughness: 0.4 })); wetSand.rotation.x = -Math.PI / 2; wetSand.position.set(3.6, -0.01, 0); A.add(wetSand);
  // the sea: near patch with moving waves + far flat sea
  const seaM = new THREE.MeshStandardMaterial({ color: 0x2a86b8, roughness: 0.12, metalness: 0.15 });
  const seaG = new THREE.PlaneGeometry(120, 160, 90, 90); seaG.rotateX(-Math.PI / 2); const seaNear = new THREE.Mesh(seaG, seaM); seaNear.position.set(63.2, 0.02, 0); seaNear.receiveShadow = true; seaNear.name = 'sea'; A.add(seaNear);
  const seaP0 = seaG.attributes.position.array.slice();
  const seaFar = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), seaM); seaFar.rotation.x = -Math.PI / 2; seaFar.position.set(1620, 0.0, 0); A.add(seaFar);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 160), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, transparent: true, opacity: 0.8 })); foam.rotation.x = -Math.PI / 2; foam.position.set(3.3, 0.03, 0); A.add(foam);
  // distant headlands on the horizon
  { const B = Builder(); for (const [x, z, s] of [[420, -330, 1], [520, -250, 0.7], [380, 300, 0.8]]) B.add(new THREE.SphereGeometry(60, 18, 10, 0, 6.3, 0, 1.5), M(0x6a8a6a, 0.95), x, -8, z, 0, 0, 0, [2.2 * s, 0.5 * s, 1.4 * s]); B.build(A); }
  // palm tree (leaning trunk of rings + leaves); grip point on the trunk at y = 2.15
  const PALM = new THREE.Vector3(-1.0, 0, -1.2);
  const palm = new THREE.Group(); const trunkPts = []; { const B = Builder(); const tm = M(0x9a7550, 0.9), tm2 = M(0x7a5a3c, 0.9);
    for (let i = 0; i < 16; i++) { const y = i * 0.3; const x = 0.012 * y * y; trunkPts.push([x, y]); B.add(CY(0.15 - i * 0.004, 0.17 - i * 0.004, 0.31, 12), i % 2 ? tm : tm2, x, y + 0.15, 0, 0, 0, -0.024 * y); }
    B.build(palm); const top = new THREE.Vector3(0.012 * 4.8 * 4.8, 4.8, 0); palm.userData.top = top; A.add(palm); palm.position.copy(PALM); }
  const leaves = []; { const lm = new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.8, side: THREE.DoubleSide }); const lg = new THREE.SphereGeometry(1, 14, 6); lg.scale(1.0, 0.04, 0.22); lg.translate(1.0, 0, 0);
    for (let i = 0; i < 8; i++) { const L = new THREE.Mesh(lg, lm); L.castShadow = true; const p = new THREE.Group(); p.position.copy(palm.userData.top).add(PALM); p.rotation.y = i * 0.785 + 0.2; L.rotation.z = -0.5; p.add(L); A.add(p); leaves.push({ p, L, a: i * 0.785 }); }
    const nut = new THREE.Mesh(SP(0.09, 10, 8), M(0x5a3a20, 0.7)); nut.position.copy(palm.userData.top).add(PALM).add(v.set(0.08, -0.12, 0.05)); A.add(nut); }
  const GRIP = new THREE.Vector3(PALM.x + 0.012 * 2.15 * 2.15 + 0.12, 2.15, PALM.z + 0.24);
  // umbrella, towel, deckchair (THE UNBOTHERED PERSON), beach ball, sandcastle
  const chairG = new THREE.Group(); { const B = Builder(); const wd = M(0xd8b48a, 0.7), cl = M(0x2f9fd0, 0.8), cl2 = M(0xffffff, 0.8);
    B.add(BX(0.6, 0.05, 1.2), wd, 0, 0.3, 0); for (const [x, z] of [[-0.27, -0.55], [0.27, -0.55], [-0.27, 0.55], [0.27, 0.55]]) B.add(CY(0.025, 0.025, 0.3, 8), wd, x, 0.15, z);
    for (let i = 0; i < 5; i++) B.add(BX(0.11, 0.02, 1.15), i % 2 ? cl : cl2, -0.24 + i * 0.12, 0.34, 0); B.add(BX(0.6, 0.85, 0.05), cl, 0, 0.68, -0.62, -0.45, 0, 0); B.build(chairG); A.add(chairG); }
  const umb = new THREE.Group(); { const B = Builder(); B.add(CY(0.025, 0.025, 2.3, 8), M(0xffffff, 0.5), 0, 1.15, 0); const cone = new THREE.ConeGeometry(1.2, 0.45, 12, 1, true); B.build(umb);
    const um = new THREE.Mesh(cone, new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff5a4a'; g.fillRect(i * w / 12, 0, w / 12 + 1, h); } }), roughness: 0.8, side: THREE.DoubleSide })); um.position.y = 2.35; um.castShadow = true; umb.add(um); A.add(umb); }
  const towel = new THREE.Mesh(BX(0.9, 0.01, 1.8), new THREE.MeshStandardMaterial({ map: canvasTex(64, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#ffd23f', '#2fb0a0'][i % 2]; g.fillRect(0, i * h / 8, w, h / 8); } }), roughness: 0.9 })); towel.position.set(0.6, 0.006, -0.9); towel.rotation.y = 0.3; towel.receiveShadow = true; A.add(towel);
  const ball = new THREE.Mesh(SP(0.2, 24, 16), new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (g, w, h) => { const cs = ['#ff4a4a', '#ffffff', '#3a8aff', '#ffffff', '#ffd23f', '#ffffff']; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect(i * w / 6, 0, w / 6 + 1, h); } }), roughness: 0.4 })); ball.castShadow = true; A.add(ball);
  const castle = new THREE.Group(); { const B = Builder(); const sm = M(0xd9b77a, 0.95); B.add(CY(0.22, 0.26, 0.22, 12), sm, 0, 0.11, 0); B.add(CY(0.12, 0.14, 0.2, 10), sm, 0, 0.32, 0); for (const a of [0, 1.57, 3.14, 4.71]) B.add(CY(0.06, 0.07, 0.16, 8), sm, Math.cos(a) * 0.22, 0.3, Math.sin(a) * 0.22); B.build(castle);
    const flag = new THREE.Mesh(BX(0.1, 0.06, 0.005), M(0xff4a4a, 0.7)); flag.position.set(0.05, 0.55, 0); castle.add(flag); const st = new THREE.Mesh(CY(0.005, 0.005, 0.2, 4), M(0xffffff, 0.5)); st.position.set(0, 0.5, 0); castle.add(st); A.add(castle); }
  // the floating sea: blobs of water that lift off the surface after x17
  const NB = 260; const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0x4aa0d0, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }), NB); blobs.frustumCulled = false; A.add(blobs);
  const BL = []; for (let i = 0; i < NB; i++) BL.push({ x: 3.4 + Math.pow(R(), 1.6) * 60, z: -40 + R() * 70, s: 0.08 + R() * 0.45, d: R() * 0.8, w: R() * 6 });
  const grains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M(0xe9c98f, 0.9), 220); grains.frustumCulled = false; A.add(grains);
  const GR = []; for (let i = 0; i < 220; i++) GR.push({ x: -3 + R() * 6, z: -2.5 + R() * 4, s: 0.008 + R() * 0.02, d: R() * 1.5, v: 0.3 + R() });

  // ---------------- characters ----------------
  const heroOpts = { shirt: 0x3fbfa8, pants: 0xf2a03a, hair: 0x5a3a20, skin: 0xf1c6a5, shoe: 0xf2f2f2, seed: 5, hairStyle: 'short' };
  const P = makePerson(THREE, heroOpts); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const mit = makeCat(THREE, 0xf0a040); mit.rotation.order = 'YXZ'; A.add(mit); const MC = mit.userData.cat;
  // THE UNBOTHERED PERSON: bald man in the deckchair, keeps eating his sandwich
  const unb = makePerson(THREE, { shirt: 0xffffff, pants: 0x3a6ad0, hair: 0x2a2018, skin: 0xd8a47e, shoe: 0x8a5a3a, seed: 23, hairStyle: 'bald' }); unb.group.rotation.order = 'YXZ'; A.add(unb.group);
  const sandwich = new THREE.Group(); { const B = Builder(); B.add(RB(0.16, 0.03, 0.12, 0.012), M(0xf0d090, 0.8), 0, 0, 0); B.add(RB(0.17, 0.02, 0.13, 0.008), M(0x5aa040, 0.8), 0, 0.022, 0); B.add(RB(0.16, 0.03, 0.12, 0.012), M(0xf0d090, 0.8), 0, 0.045, 0); B.build(sandwich); A.add(sandwich); }
  // THE PIGEON
  const pig = new THREE.Group(); const pigW = []; { const B = Builder(); const gm = M(0x8a909c, 0.7), dk = M(0x5a606c, 0.7);
    B.add(SP(0.12, 16, 12), gm, 0, 0.16, 0, 0, 0, 0, [1, 0.85, 1.45]); B.add(SP(0.07, 14, 10), dk, 0, 0.29, 0.13); B.add(CY(0.06, 0.075, 0.06, 12), M(0x3a8a7a, 0.4, 0.3), 0, 0.24, 0.1, 0.4);
    B.add(new THREE.ConeGeometry(0.018, 0.06, 8), M(0xe8a040, 0.5), 0, 0.28, 0.21, Math.PI / 2); B.add(BX(0.09, 0.02, 0.12), dk, 0, 0.17, -0.22, -0.3);
    for (const sx of [-1, 1]) { B.add(CY(0.008, 0.008, 0.1, 5), M(0xd86a6a, 0.6), sx * 0.04, 0.05, 0.02); B.add(SP(0.014, 8, 6), M(0xffffff, 0.3), sx * 0.04, 0.31, 0.175); B.add(SP(0.008, 6, 5), M(0x111111, 0.3), sx * 0.045, 0.31, 0.188); }
    B.build(pig); for (const sx of [-1, 1]) { const w = new THREE.Mesh(SP(0.1, 12, 8), gm); w.scale.set(0.25, 0.7, 1.4); const wp = new THREE.Group(); wp.position.set(sx * 0.1, 0.2, -0.02); w.position.set(sx * 0.02, 0, -0.02); wp.add(w); pig.add(wp); pigW.push(wp); } A.add(pig); }

  // =====================================================================================================
  // SCENE B: CLEAN. Earth (radius 1) in space, spinning, spraying its sea off the equator.
  // =====================================================================================================
  const B2 = new THREE.Scene(); const camB = new THREE.PerspectiveCamera(40, W / H, 0.01, 5000); B2.background = new THREE.Color(0x02040c);
  B2.add(new THREE.HemisphereLight(0x9ab0ff, 0x1a1a2a, 0.35));
  const sunB = new THREE.DirectionalLight(0xfff0dc, 3.0); sunB.position.set(5, 1.2, 2.5); B2.add(sunB, sunB.target);
  const starPts = stars(THREE, 5000, 2000, 23); B2.add(starPts);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffd890, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); sunSpr.visible = false;
  const tilt = new THREE.Group(); tilt.rotation.set(0.32, 0, -0.41); B2.add(tilt);
  const earth = makeEarth(THREE, 1, 9); tilt.add(earth); earth.name = 'earth';
  const eMesh = earth.userData.earth;
  // motion-blur shell: the same map smeared along the spin direction, faded in once a day lasts less than ~2 s
  { const cv = eMesh.material.map.image, g = cv.getContext('2d'); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#9fb4c8'; const hh = cv.height; g.fillRect(0, 0, cv.width, hh * 0.105); g.fillRect(0, hh * 0.895, cv.width, hh * 0.105); g.globalCompositeOperation = 'source-over'; eMesh.material.map.needsUpdate = true; }
  const blurT = (() => { const src = eMesh.material.map.image; const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d');
    g.globalAlpha = 1 / 10; for (let i = 0; i < 40; i++) { const dx = (i / 40) * src.width * 0.5; g.drawImage(src, dx, 0); g.drawImage(src, dx - src.width, 0); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const blurM = new THREE.MeshStandardMaterial({ map: blurT, roughness: 1.0, envMapIntensity: 0.2, transparent: true, opacity: 0 }); const blurS = new THREE.Mesh(new THREE.SphereGeometry(1.002, 96, 48), blurM); earth.add(blurS);
  // YOU ARE HERE: a glowing dot on the equator (on the spinning Earth)
  const youDot = new THREE.Mesh(SP(0.022, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe14a, toneMapped: false })); youDot.position.set(0, 0, 1.005); earth.add(youDot);
  const youGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); youGlow.scale.setScalar(0.12); youDot.add(youGlow);
  // the sea spraying off the equator (in the equatorial plane of the tilted group)
  const NS = 6000; const sprG = new THREE.BufferGeometry(); const sprP = new Float32Array(NS * 3), sprC = new Float32Array(NS * 3);
  sprG.setAttribute('position', new THREE.BufferAttribute(sprP, 3)); sprG.setAttribute('color', new THREE.BufferAttribute(sprC, 3));
  const spray = new THREE.Points(sprG, new THREE.PointsMaterial({ map: glowT, size: 0.05, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); spray.frustumCulled = false; tilt.add(spray);
  const SPR = []; for (let i = 0; i < NS; i++) SPR.push({ tb: 10.2 + Math.pow(i / NS, 1.0) * (TOT - 10.2), ph: R() * 6.283, y: (R() - 0.5), s: 0.6 + R() * 0.8, ice: R() < 0.3 });
  const spinAngle = (t) => (t <= T0 ? 0 : (2 * Math.PI / 86400) * (2 / Math.LN2) * (kAt(t) - 1));

  // HERO CAM (big part): you hanging 'up' from the palm tree, Mittens holding your shoe, the sky flicking day/night
  const HC = new THREE.Scene(); HC.background = new THREE.Color(0xffb070); HC.add(new THREE.HemisphereLight(0xffffff, 0x8a6a50, 1.1)); const hcD = new THREE.DirectionalLight(0xffe0b8, 2.0); hcD.position.set(2, 1, 3); HC.add(hcD);
  { const f2 = new THREE.DirectionalLight(0xffe8f0, 1.0); f2.position.set(-2, 1, 3); HC.add(f2); }
  const hcSand = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshStandardMaterial({ color: 0xe9c98f, roughness: 0.95 })); hcSand.rotation.x = -Math.PI / 2; HC.add(hcSand);
  { const B = Builder(); for (let i = 0; i < 18; i++) B.add(CY(0.15, 0.17, 0.31, 12), M(i % 2 ? 0x9a7550 : 0x7a5a3c, 0.9), 0, i * 0.3 + 0.15, 0); const g = new THREE.Group(); B.build(g); HC.add(g); }
  const hcP = makePerson(THREE, heroOpts); hcP.group.rotation.order = 'YXZ'; HC.add(hcP.group); const hcM = makeCat(THREE, 0xf0a040); HC.add(hcM); const HCC = hcM.userData.cat;
  const hcCam = new THREE.PerspectiveCamera(42, 1, 0.05, 60); hcCam.position.set(1.6, 2.7, 2.5); hcCam.lookAt(0.2, 2.6, 0); hcCam.fov = 38; hcCam.updateProjectionMatrix();
  const hcSunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffd070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); hcSunS.scale.setScalar(1.6); HC.add(hcSunS);
  const NDp = 40; const hcDrops = new THREE.InstancedMesh(SP(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7ac0ff, roughness: 0.1 }), NDp); HC.add(hcDrops); const DR = []; for (let i = 0; i < NDp; i++) DR.push({ x: -2.5 + R() * 4, z: -2 + R() * 1.5, o: R() * 10, v: 1 + R() * 2 });

  await document.fonts.ready;
  const milIdx = (tt) => { let k = -1; for (let i = 0; i < MIL.length; i++) if (tt >= MIL[i][1] - 0.05) k = i; return k; };
  const MOODS = ['unimpressed', 'shock', 'annoyed', 'shock', 'scared', 'annoyed', 'unimpressed', 'sleepy', 'annoyed', 'shock', 'unimpressed', 'scared', 'annoyed', 'shock', 'unimpressed', 'annoyed', 'shock', 'scared', 'shock', 'smug'];
  function standPose(Q) { Q.legL.rotation.set(0, 0, 0.03); Q.legR.rotation.set(0, 0, -0.03); Q.armL.rotation.set(0.05, 0, -0.1); Q.armR.rotation.set(0.05, 0, 0.1); Q.torso.rotation.set(0, 0, 0); }
  function sitPose(Q) { Q.legL.rotation.set(-1.35, 0, -0.08); Q.legR.rotation.set(-1.35, 0, 0.08); Q.armL.rotation.set(-0.3, 0, -0.15); Q.armR.rotation.set(-1.9, 0, 0.35); }
  function flutter(Q, t, amt = 1) { const s = Math.sin(t * 6); Q.legL.rotation.set(0.4 * s * amt, 0, -0.15); Q.legR.rotation.set(-0.4 * s * amt, 0, 0.15); }
  // hop height grows as you get lighter: h = h0 / (1 - f), f = 0.00347 k^2
  const fW = (k) => 0.003466 * k * k;
  const TW = tOf(17.0);   // weightless
  function hopY(tt) { if (tt < 6.2) return 0; const per = 0.95; const ph = ((tt - 6.2) % per) / per; const k = kAt(tt - ph * per); const h = 0.07 / Math.max(0.06, 1 - fW(k)); return Math.sin(Math.PI * ph) * Math.min(h, 2.5); }

  function update(tt0) {
    const teaser = tt0 < TEASER; const tt = teaser ? (TOT - 0.04) - 0.5 * (1 - Math.min(1, tt0 / 0.55)) : tt0;   // FREEZE: the last moment plays, then freezes
    const k = kAt(tt); const mi = milIdx(tt); const mood = mi >= 0 ? MOODS[mi] : 'neutral';
    const out = { scene: A, camera: cam, bloom: 0.25, bloomThreshold: 0.88, tt, tt0, teaser, tk: tt0 / TEASER, env: 0.45, exposure: 1.05, sat: 1.25, contrast: 1.05, voff: 0, k, mi };
    const fly = Math.max(0, tt - TW);   // seconds since weightless
    if (tt < CUT) {
      // ---------------- SCENE A: the beach ----------------
      // sea waves (calm, then the surface heaves as it starts to float)
      { const p = seaG.attributes.position.array; const lift = smooth(TW - 0.3, TW + 1.5, tt);
        for (let i = 0; i < p.length; i += 3) { const x = seaP0[i], z = seaP0[i + 2]; p[i + 1] = 0.05 * Math.sin(x * 0.9 + tt * 1.6) + 0.04 * Math.sin(z * 0.7 + x * 0.3 - tt * 1.1) + lift * (0.25 * Math.sin(x * 0.5 + z * 0.4 + tt * 3) + 0.2); }
        seaG.attributes.position.needsUpdate = true; seaG.computeVertexNormals(); }
      foam.position.x = 3.3 + 0.15 * Math.sin(tt * 1.3); foam.material.opacity = 0.7 * (1 - smooth(TW, TW + 0.6, tt));
      // floating water blobs + sand grains
      for (let i = 0; i < NB; i++) { const b = BL[i]; const a = tt - TW - b.d; let s = 0.0001, y = 0;
        if (a > 0) { s = b.s * clamp(a * 2); y = 0.1 + 0.25 * a * a + Math.max(0, tt - tOf(24)) ** 2 * 3.2 * (0.6 + b.s); }
        m4.compose(v.set(b.x + 0.2 * Math.sin(tt + b.w), y, b.z), q.setFromEuler(e.set(tt * 0.7 + b.w, tt * 0.5, 0)), sc.set(s, s * (0.8 + 0.2 * Math.sin(tt * 4 + b.w)), s)); blobs.setMatrixAt(i, m4); } blobs.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < GR.length; i++) { const g = GR[i]; const a = tt - (TW - 1.0) - g.d * 0.8; let s = 0.0001, y = 0; if (a > 0) { s = g.s; y = 0.02 + g.v * 0.4 * a * a; }
        m4.compose(v.set(g.x, y, g.z), q.setFromEuler(e.set(a * 3, a * 2, 0)), sc.setScalar(s)); grains.setMatrixAt(i, m4); } grains.instanceMatrix.needsUpdate = true;
      // palm leaves: droop normally, then stream upward once 'down' flips
      const flip = smooth(TW, tOf(24) + 0.3, tt);
      for (const L of leaves) { L.L.rotation.z = lerp(-0.5, 0.9, flip) + 0.06 * Math.sin(tt * 2 + L.a); }
      // YOU: watching the sunset, hopping higher and higher, then float up and grab the palm tree; flip so you hang 'up' from it
      { const G = P.group; const base = new THREE.Vector3(0.1, 0, 0.1); const faceYaw = 0.05;
        if (tt < TW) { standPose(P); const hy = hopY(tt); G.rotation.set(0, faceYaw, 0); G.position.set(base.x, hy, base.z);
          if (hy > 0.01) { P.legL.rotation.x = -0.35; P.legR.rotation.x = -0.25; P.armL.rotation.set(-0.3, 0, -0.6); P.armR.rotation.set(-0.3, 0, 0.6); }
          if (tt < 6.2) { P.armR.rotation.set(-0.15, 0, 0.12); } }
        else { // float to the tree (TW..TW+0.8) then swing up around your hands (TW+0.8..TW+1.8)
          const u = smooth(TW, TW + 0.8, tt), sw = smooth(TW + 0.7, TW + 1.8, tt);
          P.armL.rotation.set(-Math.PI + 0.15, 0, -0.12); P.armR.rotation.set(-Math.PI + 0.15, 0, 0.12); flutter(P, tt, 1.2);
          const rz = sw * Math.PI * 0.94; const hand = new THREE.Vector3(0, 2.12, 0.0);
          const rot = new THREE.Euler(0, faceYaw * (1 - u) + 0.35 * u, rz, 'YXZ'); const off = hand.clone().applyEuler(rot);
          const pGrip = GRIP.clone().sub(off); const pFloat = new THREE.Vector3(base.x, hopY(TW - 0.01) + fly * 0.8, base.z);
          G.position.copy(pFloat.lerp(pGrip, u)); G.rotation.copy(rot); }
        const f = tt < 4 ? { brows: 'neutral', eyes: 1.0, mouth: 'smile', look: [0.5, 0.1] } : tt < 6.2 ? { brows: 'up', eyes: 1.1, mouth: 'flat', look: [0.3, -0.3] } : tt < TW ? { brows: 'up', eyes: 1.25, mouth: 'o', look: [0.2, -0.5] } : { brows: 'worried', eyes: 1.4, mouth: 'o', look: [0.4, 0.5] };
        P.headPivot.rotation.set(0, 0, 0); setFace(P, f); life(P, tt, 0.5); }
      // Mittens: beside you on the sand, hops with you, floats, grabs your shoe
      { let mm = 'neutral'; if (tt > 4.0) mm = 'unimpressed'; if (tt > 6.4) mm = 'annoyed'; if (tt > 8.0) mm = 'shock'; if (tt > 9.2) mm = 'scared'; if (tt > TW) mm = 'shock'; if (tt > TW + 1.2) mm = 'annoyed';
        const hy = tt < TW ? hopY(tt + 0.25) * 0.9 : 0; const p0 = new THREE.Vector3(0.75, hy, 0.75);
        P.group.updateMatrixWorld(true); P.legL.userData.end.getWorldPosition(tv); const shoe = tv.clone().add(v.set(0, 0.05, 0.08));
        const u = smooth(TW + 0.2, TW + 1.0, tt); const pf = p0.clone().add(v.set(0, fly * 0.7, 0)); mit.position.copy(pf.lerp(shoe, u));
        mit.rotation.set(u * 0.6, -0.5 + u * 1.2, P.group.rotation.z * u * 0.9); mit.scale.setScalar(0.95);
        MC.headPivot.rotation.y = 0.35 * Math.sin(tt * 0.8) + (mm === 'unimpressed' ? 0.4 : 0); MC.headPivot.rotation.x = 0.1; setCatFace(mit, mm, 0.3); catLife(mit, tt, 1); out.catMood = mm; }
      // THE PIGEON: judges you from the sand, then floats off flapping
      { const a = Math.max(0, tt - TW + 0.2); pig.position.set(-0.75 - a * 0.3, a * a * 0.8 + 0.4 * a, 1.9); pig.rotation.set(0, 0.6 + 0.3 * Math.sin(tt * 0.9) + (tt > 4 && tt < 5 ? 0.6 : 0), Math.sin(a * 3) * 0.3 * clamp(a));
        const fl = a > 0 ? Math.sin(tt * 26) * 0.9 : 0; pigW[0].rotation.z = 0.2 + fl; pigW[1].rotation.z = -0.2 - fl; pig.children[0] && (pig.scale.setScalar(1.15)); }
      // THE UNBOTHERED PERSON: deckchair under the umbrella; keeps eating while it floats away
      { const a = Math.max(0, tt - TW - 0.1); chairG.position.set(1.5, a * a * 0.5, -3.4); chairG.rotation.set(-0.05 * a, 0.5, 0.04 * a);
        umb.position.set(2.2, a > 0 ? a * a * 0.9 : 0, -4.0); umb.rotation.set(0.1 * a, 0, -0.25 * a);
        const G = unb.group; chairG.updateMatrixWorld(true); G.position.copy(v.set(0, 0.36 - 0.48, -0.15).applyMatrix4(chairG.matrixWorld)); G.rotation.set(-0.35 - 0.05 * a, 0.5, 0.04 * a); sitPose(unb);
        const chew = Math.sin(tt * 9) > 0.3; setFace(unb, { brows: 'neutral', eyes: 0.7, mouth: chew ? 'flat' : 'o', look: [0.4, 0] }); life(unb, tt, 0.3); unb.headPivot.rotation.x += -0.1;
        G.updateMatrixWorld(true); unb.armR.userData.end.getWorldPosition(tv); sandwich.position.copy(tv).add(v.set(0, 0.04, 0.05)); sandwich.rotation.set(0.3, 0.5, 0); }
      // beach ball + sandcastle float too
      { const a = Math.max(0, tt - TW + 0.4); ball.position.set(-0.3, 0.2 + a * a * 0.9, 1.3); ball.rotation.set(tt, tt * 0.7, 0); const c2 = Math.max(0, tt - TW - 0.4); castle.position.set(1.0, c2 * c2 * 0.6, -0.5); castle.rotation.set(c2 * 0.8, 0, c2 * 0.5); }
      // camera: medium shot of you + Mittens with the sun over the sea; pulls back and tilts up as everything floats
      const pb = smooth(TW - 0.6, CUT, tt);
      const cp = [lerp(-3.3, -5.6, pb) + 0.35 * smooth(1.2, 9, tt), lerp(1.55, 2.4, pb), lerp(5.6, 8.2, pb) - 0.5 * smooth(1.2, 9, tt)]; const cl = [lerp(0.35, 0.0, pb), lerp(1.45, 3.0, pb), lerp(-0.4, -0.8, pb)];
      cam.position.set(cp[0] + 0.03 * Math.sin(tt * 0.6), cp[1] + 0.02 * Math.sin(tt * 0.9), cp[2]); cam.lookAt(...cl); cam.fov = 46; cam.updateProjectionMatrix();
      faceL.position.set(cp[0] * 0.6 + 0.3, 1.9, cp[2] * 0.6); faceL.position.y += P.group.position.y * 0.5;
      out.dof = 0.04; out.focusY = 0.55; out.focusH = 0.3; out.focus = P.group;
      out.flash = 0.25 * pulse(tt, TW, 0.3); out.shake = 0.06 * pulse(tt, 8.0, 0.3) + 0.1 * pulse(tt, TW, 0.4) + 0.14 * pulse(tt, tOf(24), 0.5);
    } else {
      // ---------------- SCENE B: Earth in space ----------------
      const th = spinAngle(tt); const rev = k / 86400; // revolutions per second
      earth.rotation.y = -0.35 + th; const bo = smooth(0.35, 2.2, rev); blurM.opacity = bo; eMesh.visible = bo < 0.98;
      youDot.visible = tt < CUT + 3.0; youGlow.material.opacity = 0.6 + 0.4 * Math.sin(tt * 6);
      // spray
      for (let i = 0; i < NS; i++) { const p = SPR[i]; const age = tt - p.tb; let x = 0, y = 0, z = 0, b = 0;
        if (age > 0) { const kb = kAt(p.tb); const vr = kb < 24 ? 0.03 : Math.min(1.6, 0.16 * (1 + 0.32 * Math.log2(kb / 24)));
          const r = 1.02 + Math.min(3.2, vr * age * p.s + 0.02 * age); const phi = p.ph + spinAngle(p.tb) + Math.min(3, 0.9 * age / r) * (0.5 + 0.5 * p.s);
          x = Math.cos(phi) * r; z = Math.sin(phi) * r; y = p.y * (0.02 + 0.06 * (r - 1)); b = clamp(age * 4) * clamp(1.2 - (r - 1) / 2.6) * (1 - smooth(4, 9, age)) * (p.ice ? 0.6 : 0.5); }
        sprP[i * 3] = x; sprP[i * 3 + 1] = y; sprP[i * 3 + 2] = z; const c = p.ice ? [0.9, 0.95, 1] : [0.35, 0.65, 1]; sprC[i * 3] = c[0] * b; sprC[i * 3 + 1] = c[1] * b; sprC[i * 3 + 2] = c[2] * b; }
      sprG.attributes.position.needsUpdate = true; sprG.attributes.color.needsUpdate = true; spray.material.size = 0.1;
      // camera: one framing, slowly pulling back and orbiting; a little faster in the last seconds
      const u = smooth(CUT, TOT, tt); const yaw = -0.25 + 0.45 * u + 0.5 * smooth(35.5, TOT + 0.5, tt) + 0.04 * Math.sin(tt * 0.5); const dist = lerp(6.0, 7.8, Math.pow(u, 0.8));
      const lookY = 0.3 + 0.12 * u; camB.position.set(Math.sin(yaw) * dist, 1.1 + 0.35 * u, Math.cos(yaw) * dist); camB.lookAt(0, lookY, 0); camB.updateProjectionMatrix();
      starPts.position.copy(camB.position);
      out.scene = B2; out.camera = camB; out.dof = 0; out.focus = earth; out.clean = true; out.vignette = 0.4; out.space = true; out.bloom = 0.3; out.bloomThreshold = 0.92; out.exposure = 1.08;
      out.flash = 0.35 * pulse(tt, CUT, 0.3); out.shake = 0.1 * pulse(tt, MIL[11][1], 0.4) + 0.1 * pulse(tt, MIL[13][1], 0.4) + 0.12 * pulse(tt, MIL[16][1], 0.4) + 0.14 * pulse(tt, MIL[18][1], 0.5);
      out.anchorWorld = new THREE.Vector3(0.85, 0.75, 0.2);
    }
    // HERO CAM (big part)
    { const show = tt > CUT ? smooth(CUT + 0.2, CUT + 0.6, tt) : 0; const th = spinAngle(tt); const rev = k / 86400;
      // day/night: sunlit when cos(th) > 0 ... gentle flicker (contrast fades once it's faster than ~1.5 Hz: no harsh strobing)
      const ca = Math.cos(th * 1.0 + 0.0); const dayF = smooth(-0.25, 0.35, ca); const amp = 1 - 0.85 * smooth(1.2, 3.0, rev); const dd = lerp(0.45, dayF, amp);
      HC.background.set(0x0a1230).lerp(col.set(0xffa860), dd); hcD.intensity = lerp(0.5, 2.2, dd);
      const sa = th % (2 * Math.PI); hcSunS.position.set(-3 + 6 * ((sa / Math.PI) % 2), 4.0 + 1.2 * Math.sin(sa), -4); hcSunS.visible = rev < 1.2 && ca > -0.1; hcSunS.material.opacity = dayF;
      const G = hcP.group; G.rotation.set(0, 0.25, Math.PI * 0.97 + 0.04 * Math.sin(tt * 3)); G.updateMatrixWorld(true);
      const gripH = new THREE.Vector3(0.17, 1.55, 0.1); const off = new THREE.Vector3(0, 2.12, 0).applyEuler(G.rotation); G.position.copy(gripH).sub(off);
      hcP.armL.rotation.set(-Math.PI + 0.12, 0, -0.1); hcP.armR.rotation.set(-Math.PI + 0.12, 0, 0.1); flutter(hcP, tt, 1.4 + 0.6 * smooth(30, 40, tt));
      const fk = Math.max(0, mi) % 3; setFace(hcP, [{ brows: 'worried', eyes: 1.4, mouth: 'o', look: [0.5, 0.2] }, { brows: 'up', eyes: 1.5, mouth: 'grit', look: [0.6, -0.3] }, { brows: 'worried', eyes: 1.2, mouth: 'open', open: 1.0, look: [-0.2, -0.4] }][fk]); hcP.headPivot.rotation.set(0, 0.2, 0); life(hcP, tt, 0.6);
      G.updateMatrixWorld(true); hcP.torso.getWorldPosition(tv); hcM.position.copy(tv).add(v.set(0.2, -0.05, 0.2)); hcM.rotation.set(0.15, 0.55, 0.35 + 0.08 * Math.sin(tt * 3)); hcM.scale.setScalar(1.15);
      setCatFace(hcM, mood, 0.3); catLife(hcM, tt, 1.2); HCC.headPivot.rotation.y = 0.25 * Math.sin(tt * 0.9) + (mood === 'unimpressed' ? -0.4 : 0);
      for (let i = 0; i < NDp; i++) { const d = DR[i]; const y = ((tt * d.v * (1 + 0.3 * smooth(20, 40, tt)) + d.o) % 6); m4.compose(v.set(d.x, y, d.z), q.identity(), sc.setScalar(1)); hcDrops.setMatrixAt(i, m4); } hcDrops.instanceMatrix.needsUpdate = true;
      out.inset = { scene: HC, camera: hcCam, x: 0.215, y: 0.855, r: 0.17, show, ring: '#7dd3ff' }; out.mcMood = mood; }
    return out;
  }

  // ---------------- on-screen text ----------------
  const VO = [['n1', 2.45], ['n2', 4.0], ['n3', 6.2], ['n4', 9.15], ['n5', 11.55], ['n6', 14.1], ['n7', 16.6], ['n8', 19.0], ['n9', 21.35], ['n10', 23.3], ['n11', 26.75], ['n12', 28.6], ['n13', 30.2], ['n14', 33.0], ['n15', 36.1]];
  const TXT = { n1: 'You just want a slow sunset.', n2: 'Earth already spins you faster than sound.', n3: 'Spin flings you outward. Faster spin, lighter you.', n4: 'Seventeen times faster. You weigh nothing.',
    n5: 'So does the sea. It flies off into space.', n6: 'A real Earth would rip apart. Ours holds.', n7: 'You grab a palm tree. Mittens grabs you.', n8: 'Now faster than any spacecraft ever built.', n9: 'Fast enough to leave the Milky Way.',
    n10: 'You wanted a slow sunset. A day now lasts 30 seconds.', n11: 'One percent of the speed of light.', n12: "You could let go. You don't.", n13: 'Sunrise. Sunset. Every three seconds.', n14: 'One day. One second. Mittens is still holding on.', n15: 'Well. You did get a lot of sunsets.' };
  const DUR = { n1: 1.49, n2: 2.11, n3: 2.79, n4: 2.28, n5: 2.41, n6: 2.39, n7: 2.26, n8: 2.22, n9: 1.77, n10: 3.29, n11: 1.69, n12: 1.45, n13: 2.58, n14: 2.92, n15: 1.79 };
  const CAP = VO.map(([id, t], i) => [t, Math.min(t + DUR[id] + 0.25, i + 1 < VO.length ? VO[i + 1][1] - 0.05 : 1e9), TXT[id]]);
  const ASK = 38.1;
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function topText(ctx, W, t, a, b, txt, size = 54, y = 250) { if (t < a || t > b) return; const al = clamp(Math.min((t - a) / 0.15, (b - t) / 0.15));
    ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 700 ${size}px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff';
    wrapText(ctx, txt, W * 0.86).forEach((l, i) => { ctx.strokeText(l, W / 2, y + i * size * 1.22); ctx.fillText(l, W / 2, y + i * size * 1.22); }); ctx.restore(); }
  function proj(p3, camO) { tv.copy(p3); camO.updateMatrixWorld(); tv.project(camO); if (tv.z > 1) return null; return [(tv.x * 0.5 + 0.5) * 1080, (1 - (tv.y * 0.5 + 0.5)) * 1920]; }
  function icon(ctx, type, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.lineWidth = 5; ctx.strokeStyle = '#ffd23f'; ctx.fillStyle = '#ffd23f'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (type === 'bullet') { ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.18); ctx.lineTo(s * 0.15, -s * 0.18); ctx.quadraticCurveTo(s * 0.5, -s * 0.18, s * 0.55, 0); ctx.quadraticCurveTo(s * 0.5, s * 0.18, s * 0.15, s * 0.18); ctx.lineTo(-s * 0.5, s * 0.18); ctx.closePath(); ctx.fill(); }
    else if (type === 'feather' || type === 'float') { ctx.beginPath(); ctx.ellipse(0, 0, s * 0.16, s * 0.45, 0.6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.4); ctx.lineTo(s * 0.25, -s * 0.35); ctx.stroke(); if (type === 'float') { ctx.beginPath(); ctx.moveTo(s * 0.4, s * 0.1); ctx.lineTo(s * 0.4, -s * 0.4); ctx.lineTo(s * 0.28, -s * 0.28); ctx.moveTo(s * 0.4, -s * 0.4); ctx.lineTo(s * 0.52, -s * 0.28); ctx.stroke(); } }
    else if (type === 'rocket') { ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.quadraticCurveTo(s * 0.22, -s * 0.2, s * 0.15, s * 0.3); ctx.lineTo(-s * 0.15, s * 0.3); ctx.quadraticCurveTo(-s * 0.22, -s * 0.2, 0, -s * 0.5); ctx.fill(); ctx.fillStyle = '#ff7a3a'; ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.32); ctx.lineTo(0, s * 0.55); ctx.lineTo(s * 0.1, s * 0.32); ctx.fill(); }
    else if (type === 'orbit' || type === 'sun') { ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.22, -0.3, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.14, 0, 7); ctx.fill(); ctx.fillStyle = '#7dd3ff'; ctx.beginPath(); ctx.arc(s * 0.45, -s * 0.12, s * 0.07, 0, 7); ctx.fill(); if (type === 'sun') { ctx.strokeStyle = '#7dd3ff'; ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.15); ctx.lineTo(s * 0.75, -s * 0.4); ctx.stroke(); } }
    else if (type === 'clock') { ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.28); ctx.moveTo(0, 0); ctx.lineTo(s * 0.2, s * 0.08); ctx.stroke(); }
    else if (type === 'probe') { ctx.fillRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24); ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.3); ctx.lineTo(s * 0.25, -s * 0.3); ctx.stroke(); ctx.strokeRect(-s * 0.5, -s * 0.06, s * 0.3, s * 0.12); ctx.strokeRect(s * 0.2, -s * 0.06, s * 0.3, s * 0.12); }
    else if (type === 'galaxy') { ctx.beginPath(); for (let a = 0; a < 9; a += 0.2) { const r = s * 0.05 * a; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.55); } ctx.stroke(); ctx.beginPath(); for (let a = 0; a < 9; a += 0.2) { const r = s * 0.05 * a; ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * r * 0.55); } ctx.stroke(); }
    else if (type === 'light') { ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.5); ctx.lineTo(-s * 0.2, s * 0.05); ctx.lineTo(0, s * 0.05); ctx.lineTo(-s * 0.1, s * 0.5); ctx.lineTo(s * 0.22, -s * 0.08); ctx.lineTo(s * 0.02, -s * 0.08); ctx.closePath(); ctx.fill(); }
    ctx.restore(); }
  function mileLabel(ctx, p, title, sub, ic, a = 1) { if (a <= 0 || !p) return; let [x, y] = p; x = clamp(x, 120, 1000); y = clamp(y, 820, 1560);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 44px ${FONT}`; const tw = ctx.measureText(title).width; ctx.font = `700 28px ${FONT}`; const sw = sub ? ctx.measureText(sub).width : 0; const w = Math.min(1020, Math.max(tw, sw) + 36 + 86), h = sub ? 104 : 72;
    const lx = clamp(x - w / 2, 30, 1050 - w), ly = y - h - 26; ctx.fillStyle = 'rgba(10,12,16,0.84)'; ctx.beginPath(); ctx.roundRect(lx, ly, w, h, 16); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(clamp(x, lx + 20, lx + w - 20), ly + h); ctx.lineTo(x, y - 4); ctx.stroke();
    icon(ctx, ic, lx + 50, ly + h / 2, 62);
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `900 44px ${FONT}`; ctx.fillText(title, lx + 100, ly + 37, w - 112); if (sub) { ctx.font = `700 28px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(sub, lx + 100, ly + 80, w - 112); } ctx.restore(); }
  const comma = (x) => Math.round(x).toLocaleString('en-US');
  function fmtV(vms) { if (vms < 11000) return comma(Math.round(vms * 3.6 / 10) * 10) + ' KM/H'; const kms = vms / 1000; return (kms < 100 ? kms.toFixed(1) : comma(kms)) + ' KM/S'; }
  function fmtDay(s) { if (s >= 3600) { const h = Math.floor(s / 3600), m = Math.round((s - h * 3600) / 60); return m >= 60 ? (h + 1) + ' H' : (m ? `${h} H ${m} MIN` : `${h} H`); } if (s >= 90) return Math.round(s / 60) + ' MIN'; if (s >= 10) return Math.round(s) + ' S'; return s.toFixed(s < 1 ? 2 : 1) + ' S'; }
  const GMAX = Math.log2(C / V0);
  function gauge(ctx, tt, st) { const k = st.k ?? 1, mi = st.mi ?? -1; const vms = V0 * k; const f = clamp(Math.log2(k) / GMAX);
    const cx = 175, cy = 545, r = 118, a0 = Math.PI * 0.85, a1 = Math.PI * 2.15; const af = lerp(a0, a1, f);
    ctx.save(); ctx.fillStyle = 'rgba(10,12,16,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, r + 26, 0, 7); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
    const gr = ctx.createLinearGradient(cx - r, 0, cx + r, 0); gr.addColorStop(0, '#7dd3ff'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#ff4a6a'); ctx.strokeStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, a0, Math.max(a0 + 0.02, af)); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; for (const m of MIL) { const a = lerp(a0, a1, Math.log2(m[0]) / GMAX); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18)); ctx.lineTo(cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30)); ctx.stroke(); }
    ctx.font = `800 22px ${FONT}`; ctx.fillStyle = '#ff9aa8'; ctx.textAlign = 'center'; ctx.fillText('LIGHT', cx + Math.cos(a1) * (r - 48) - 4, cy + Math.sin(a1) * (r - 48) + 26);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(af) * (r - 14), cy + Math.sin(af) * (r - 14)); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill();
    ctx.font = `900 30px ${FONT}`; ctx.fillStyle = '#ffd23f'; ctx.fillText('×' + (k < 10 ? k.toFixed(1) : comma(k)), cx, cy - 34); ctx.restore();
    const num = fmtV(vms); const bump = mi >= 0 ? pulse(tt, MIL[mi][1], 0.4) : 0; const X = 330;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.font = `800 29px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#7dd3ff'; ctx.strokeText('YOUR SPEED (EARTH\'S SPIN)', X, 448); ctx.fillText('YOUR SPEED (EARTH\'S SPIN)', X, 448);
    ctx.save(); ctx.translate(X, 532); ctx.scale(1 + bump * 0.12, 1 + bump * 0.12); let fs = 84; ctx.font = `900 ${fs}px ${FONT}`; while (ctx.measureText(num).width > 720 && fs > 40) { fs -= 4; ctx.font = `900 ${fs}px ${FONT}`; }
    ctx.lineWidth = 10; ctx.strokeText(num, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(num, 0, 0); ctx.restore();
    const pc = vms / C; let sub = '1 DAY = ' + fmtDay(86400 / k) + (pc >= 0.01 ? '  ·  ' + Math.floor(pc * 100) + '% LIGHT' : '  ·  ×2 EVERY 2 S');
    ctx.font = `800 33px ${FONT}`; if (ctx.measureText(sub).width > 720) ctx.font = `800 ${Math.floor(33 * 720 / ctx.measureText(sub).width)}px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(sub, X + 2, 582); ctx.fillStyle = '#7dd3ff'; ctx.fillText(sub, X + 2, 582);
    let txt = '', colr = '#ffe9b0'; const justPassed = mi >= 0 && tt < MIL[mi][1] + 0.7; if (justPassed) { txt = 'PASSED: ' + MIL[mi][2]; colr = '#7dff9a'; } else if (mi + 1 < MIL.length) txt = 'NEXT: ' + MIL[mi + 1][2]; else txt = 'NEXT: LIGHT SPEED (NEVER)';
    if (txt) { ctx.font = `800 29px ${FONT}`; ctx.lineWidth = 6; const tw = ctx.measureText(txt).width; if (tw > 720) ctx.font = `800 ${Math.floor(29 * 720 / tw)}px ${FONT}`; ctx.strokeText(txt, X + 2, 626); ctx.fillStyle = colr; ctx.fillText(txt, X + 2, 626); }
    ctx.restore(); }
  function hud(ctx, tt0, st) { const W = 1080, Hh = 1920; const tt = st.tt;
    const title = (x) => drawTitleTimed(ctx, W, Hh, [{ text: "WHAT IF EARTH'S SPIN", size: 82 }, { text: 'DOUBLED EVERY 2 SECONDS?', size: 76, accent: true }], x, '#7dd3ff', { start: 0, wps: 1000, outAt: 2.0, y: 0.115 });
    gauge(ctx, tt, st);
    if (st.teaser) { title(tt0 + 0.01); drawTeaser(ctx, W, Hh, 'freeze', st.tk, "Yep. That's you."); return; }
    title(tt0);
    for (const [a, b, txt] of CAP) topText(ctx, W, tt, a, b, txt);
    const camO = st.camera;
    if (tt < CUT && camO) {
      P.group.updateMatrixWorld(true); P.headPivot.getWorldPosition(tv); const ph = proj(tv.clone().add(v.set(0, 0.34, 0)), camO);
      mit.updateMatrixWorld(true); MC.headPivot.getWorldPosition(tv); const pm = proj(tv.clone().add(v.set(0, 0.2, 0)), camO);
      if (ph) drawTag(ctx, ph[0], ph[1] - 10, 'YOU', tt - 1.25, { dur: 2.0, bg: '#7dd3ff' });
      if (pm) drawTag(ctx, pm[0], pm[1] - 10, 'MITTENS', tt - 1.9, { dur: 1.8 });
      pig.updateMatrixWorld(true); pig.getWorldPosition(tv); const pp = proj(tv.clone().add(v.set(0, 0.45, 0)), camO);
      if (pp) { drawTag(ctx, pp[0], pp[1], 'THE PIGEON', tt - 3.4, { dur: 1.6, bg: '#d9c8ff' }); drawBubble(ctx, pp[0], pp[1] - 10, 'COO. (JUDGING)', tt - 8.1, { dur: 1.4, size: 38 }); }
      unb.group.updateMatrixWorld(true); unb.headPivot.getWorldPosition(tv); const pu = proj(tv.clone().add(v.set(0, 0.35, 0)), camO);
      if (pu) { drawTag(ctx, pu[0], Math.max(pu[1], 700), 'THE UNBOTHERED GUY', tt - 5.0, { dur: 1.8, bg: '#c9f0c0' }); drawBubble(ctx, pu[0], Math.max(pu[1], 700) - 14, 'NICE SANDWICH.', tt - (TW + 0.4), { dur: 1.3, size: 38 }); }
      for (let i = 0; i <= 4; i++) { const t1 = MIL[i][1]; const e1 = i < 4 ? Math.min(1.8, MIL[i + 1][1] - t1 - 0.05) : CUT - t1; if (!(tt > t1 - 0.15 && tt < t1 + e1)) continue; const a = smooth(t1 - 0.15, t1, tt) * (1 - smooth(t1 + e1 - 0.15, t1 + e1, tt));
        P.group.getWorldPosition(tv); const p = proj(tv.clone().add(v.set(0.6, 0.6, 0.5)), camO); mileLabel(ctx, p ? [p[0] + 120, Math.max(p[1], 1250)] : null, MIL[i][2], MIL[i][3], MIL[i][4], a); }
    } else if (camO) {
      if (tt < CUT + 2.6) { const yp = new THREE.Vector3(); youDot.getWorldPosition(yp); const p = proj(yp, camO); if (p) drawTag(ctx, p[0], p[1] - 40, 'YOU ARE HERE', tt - CUT - 0.3, { dur: 2.2, bg: '#ffd23f' }); }
      for (let i = 5; i < MIL.length; i++) { const t1 = MIL[i][1]; const e1 = i < MIL.length - 1 ? Math.min(1.9, MIL[i + 1][1] - t1 - 0.05) : 2.0; if (!(tt > t1 - 0.15 && tt < t1 + e1)) continue; const a = smooth(t1 - 0.15, t1, tt) * (1 - smooth(t1 + e1 - 0.15, t1 + e1, tt));
        const p = proj(st.anchorWorld || new THREE.Vector3(0.8, 0.5, 0), camO); mileLabel(ctx, p, MIL[i][2], MIL[i][3], MIL[i][4], a); }
      if (tt < 14 && tt > MIL[4][1]) { const t1 = MIL[4][1]; const a = 1 - smooth(13.6, 14.0, tt); mileLabel(ctx, proj(new THREE.Vector3(0.8, 0.5, 0), camO), MIL[4][2], MIL[4][3], MIL[4][4], a); }
    }
    if (tt >= ASK) topText(ctx, W, tt, ASK, 1e9, 'How long would you hold on?', 54);
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
