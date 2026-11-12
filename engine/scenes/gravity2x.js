import { clamp, lerp, smooth, easeInOut, pulse, rng, makePerson, makeSkyDome, makeCat, setFace, life, drawSideCounter, drawTitleTimed } from './lib.js';
import { buildCity } from './city5.js';
import { makeStreetLife } from './streetlife.js';

// format_v5 rebuild: "What if gravity doubled for 5 seconds?" — a Tuesday morning on a west-side avenue.
// Stake: you toss your keys up to Dave on his second-floor balcony. Gravity doubles mid-toss: the keys fall short,
// everyone is pressed down, the kid's balloon escapes (buoyancy doubles too), a jet sinks over the skyline.
// Then gravity lets go, second toss, Dave catches. Last line: the space station fell a football field.
const FONT = '"Inter Display", Inter, sans-serif', FS = 'Georgia, "Times New Roman", serif';
const HX = -2.6, HZ = -25, EV = 7.0, SLOW = 6, RET = EV + 5 * SLOW, CARDT = RET + 6.2, TOT = CARDT + 6;
const TOSS1 = 6.75, TOSS2 = RET + 2.0, V0 = 9.9, VX = -1.9, Y0 = 1.75, G1 = 9.8, G2 = 19.6, FLOOR = 4.6;

// keys: one 1 g toss, gravity doubles 0.25 s later, they peak short of Dave's hand and drop to the pavement
function keysAt(t, story) {
  if (t < TOSS1) return null;
  const te = EV - TOSS1, yE = Y0 + V0 * te - 0.5 * G1 * te * te, vE = V0 - G1 * te, xE = HX + 0.2 + VX * te;
  if (t < EV) { const u = t - TOSS1; return [HX + 0.2 + VX * u, Y0 + V0 * u - 0.5 * G1 * u * u, HZ, u * 14]; }
  if (t < RET + 1.5) { const s = t < RET ? story : 5; const land = (vE + Math.sqrt(vE * vE + 2 * G2 * (yE - 0.2))) / G2; const ss = Math.min(s, land);
    const x = xE + VX * ss, y = Math.max(0.2, yE + vE * ss - 0.5 * G2 * ss * ss); if (t >= RET + 0.6) { const u = smooth(RET + 0.6, RET + 1.5, t); return [lerp(x, HX + 0.3, u), lerp(0.2, 1.0, u), HZ, 0]; } return [x, y, HZ, (te + ss) * 14]; }
  if (t < TOSS2) return null;
  const u = t - TOSS2, ta = V0 / G1; if (u < ta) return [HX + 0.2 + VX * u, Y0 + V0 * u - 0.5 * G1 * u * u, HZ, u * 14];
  return null; // caught
}

export async function create({ THREE, W, H }) {
  const R = rng(212);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2e5);
  A.fog = new THREE.FogExp2(0xd6dce6, 0.00012);
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x7a7266, 1.15); A.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; A.add(sun, sun.target); const fill = new THREE.DirectionalLight(0xffe6c8, 1.25); fill.position.set(1, 0.55, 0.15); A.add(fill);
  const SUN = new THREE.Vector3(0.4, 0.82, -0.4).normalize();
  function setShadow(cx, cz, size) { sun.target.position.set(cx, 0, cz); sun.position.set(cx + SUN.x * 1500, SUN.y * 1500, cz + SUN.z * 1500); const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 10; c.far = 3500; c.updateProjectionMatrix(); sun.shadow.normalBias = size > 200 ? 2 : 0.05; }
  A.add(makeSkyDome(THREE, 0x4a8be0, 0xf3dcc0, [SUN.x, SUN.y, SUN.z]));
  const C = await buildCity(THREE, A, R, { hero: [HX, HZ], np: 170, clear: 5, boards: [
    ['BAGELS|& CO', '#1a5e3a', '#ffe9a8', -4.7, 10, -52, 10, 6, Math.PI / 2], ['SALE', '#e8262a', '#ffffff', 24.7, 14, -30, 12, 7, -Math.PI / 2],
    ['WEST SIDE|RADIO', '#111', '#ffd400', 24.7, 27, -48, 14, 10, -Math.PI / 2], ['GYM|OPEN 24H', '#0b3a8f', '#ffffff', 24.7, 12, 6, 12, 8, -Math.PI / 2], ['LIGHT|BEER', '#f2f2f2', '#b3122f', -4.7, 30, -60, 13, 8, Math.PI / 2]] });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler(), tv = new THREE.Vector3();
  const wrap = (x, a, b) => ((x - a) % (b - a) + (b - a)) % (b - a) + a;

  // ---- Dave's second-floor balcony ----
  const iron = new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.5, metalness: 0.5 });
  { const slab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 3.2), new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.9 })); slab.position.set(-4.3, FLOOR - 0.08, HZ); slab.castShadow = slab.receiveShadow = true; A.add(slab);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.2), iron); rail.position.set(-3.58, FLOOR + 1.0, HZ); A.add(rail);
    for (const z of [-1.6, 1.6]) { const sr = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), iron); sr.position.set(-4.3, FLOOR + 1.0, HZ + z); A.add(sr); }
    for (let k = 0; k <= 16; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.0, 0.03), iron); p.position.set(-3.58, FLOOR + 0.5, HZ - 1.6 + k * 0.2); p.castShadow = true; A.add(p); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 1.1), new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.8 })); door.position.set(-4.98, FLOOR + 1.1, HZ - 0.6); A.add(door);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0xb5562e, roughness: 0.9 })); pot.position.set(-4.1, FLOOR + 0.17, HZ + 1.25); A.add(pot);
    const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 0.9, flatShading: true })); plant.position.set(-4.1, FLOOR + 0.6, HZ + 1.25); A.add(plant); A.userData.plant = plant;
    const door2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 1.3), new THREE.MeshStandardMaterial({ color: 0x24405e, roughness: 0.6 })); door2.position.set(-4.98, 1.3, HZ + 6.0); A.add(door2); }
  const P = makePerson(THREE, { shirt: 0x2f9e6e, pants: 0x30405a, hair: 0x2a1a10, skin: 0xd8a47e, seed: 3 }); P.group.rotation.order = 'YXZ'; A.add(P.group);
  const D = makePerson(THREE, { shirt: 0xe9e1cf, pants: 0x4a4f5a, hair: 0x8a5a2a, skin: 0xf1c6a5, seed: 7 }); D.group.rotation.order = 'YXZ'; A.add(D.group);
  { const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xffd23f })); mug.position.set(0, -0.66, 0.06); D.armL.add(mug); }
  const mittens = makeCat(THREE, 0xf0a040); A.add(mittens);
  // the keys (ring + two keys + tag)
  const keys = new THREE.Group(); { const gold = new THREE.MeshStandardMaterial({ color: 0xffd36a, roughness: 0.55, metalness: 0.5 }); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 14), gold); keys.add(ring);
    for (const a of [0.4, -0.5]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.008), new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 0.5, roughness: 0.5 })); k.position.set(Math.sin(a) * 0.1, -Math.cos(a) * 0.1, 0); k.rotation.z = a; keys.add(k); }
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0xff3b6b })); tag.position.set(0.0, -0.09, 0.01); keys.add(tag); keys.scale.setScalar(2.6); A.add(keys); }
  const SL = makeStreetLife(THREE, A, { seed: 5, z: HZ, only: ['dog', 'jogger', 'cyclist', 'kid', 'musician', 'phone', 'coffee'], dogX: -1.9, dogZ: 9, jogX: -1.1, jogZ: -10, bikeX: 1.7, bikeZ: -11, kidX: -3.1, kidZ: 10, musX: -4.4, musZ: 3.6, phX: -0.9, phZ: -2.5, cofX: -4.3, cofZ: -3.6, balloonColor: 0xff2a4a });
  // the jet over the river that sinks
  const plane = new THREE.Group(); { const wm = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 }); const f = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 36, 10), wm); f.rotation.z = Math.PI / 2; plane.add(f); const n = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 10), wm); n.rotation.z = -Math.PI / 2; n.position.x = 20.5; plane.add(n);
    const w = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 34), wm); w.position.x = 1; plane.add(w); const t1 = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 0.5), new THREE.MeshStandardMaterial({ color: 0xd8342c })); t1.position.set(-16, 4, 0); plane.add(t1); const t2 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 12), wm); t2.position.set(-16, 1, 0); plane.add(t2);
    plane.scale.setScalar(1.6); A.add(plane); }
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(900, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, fog: false })); A.add(ghost);
  const PL = { x0: -740, y: 430, z: -760, vx: 70 };

  function update(t) {
    const out = { scene: A, camera: cam, bloom: 0.3, bloomThreshold: 0.92, shake: 0, flash: 0, t };
    const heavy = t >= EV && t < RET; const story = clamp((t - EV) / SLOW, 0, 5); out.story = story; out.heavy = heavy;
    const tm = t < EV ? t : t < RET ? EV + story : EV + 5 + (t - RET);
    const move = (k) => t < EV ? t : EV + k * (1 - Math.exp(-story * 1.4)) + Math.max(0, t - RET) * 1.0;
    // press-down: ramps in over the first 0.4 story-seconds, then springs back with a little bounce after the return
    const cr = heavy ? smooth(0, 0.4, story) : t >= RET ? Math.max(0, Math.exp(-(t - RET) * 4) * Math.cos((t - RET) * 9)) * 0.7 : 0;
    const bounce = t >= RET ? Math.max(0, Math.sin(clamp((t - RET) / 0.5) * Math.PI)) * 0.08 : 0;
    // ---- hero ----
    const G = P.group; G.position.set(HX, 0.15 + bounce, HZ); G.scale.set(1, 1, 1); G.rotation.set(0, -Math.PI / 2 + 0.55, 0); P.torso.rotation.set(0, 0, 0); P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0); P.armL.rotation.set(-0.1, 0, -0.12);
    const k = keysAt(t, story);
    const throwArm = (t0) => { const u = t - t0; return u < -0.6 ? -0.4 + 0.25 * Math.sin(t * 6) : u < 0 ? lerp(-0.2, 0.4, smooth(-0.6, 0, u)) : lerp(0.4, -2.9, smooth(0, 0.18, u)); };
    let arm = t < EV ? throwArm(TOSS1) : heavy ? lerp(-2.9, 0.1, smooth(0.15, 0.6, story)) : t < TOSS2 + 0.5 ? (t < RET + 0.6 ? 0.1 : t < RET + 1.5 ? lerp(0.1, -0.6, smooth(RET + 0.6, RET + 1.2, t)) : throwArm(TOSS2)) : lerp(-2.9, -0.2, smooth(TOSS2 + 0.5, TOSS2 + 1.2, t));
    if (heavy && story > 0.6 && story < 1.1) arm = lerp(0.1, -1.2, smooth(0.6, 0.85, story)) * (1 - smooth(0.95, 1.1, story)); // grabs for the falling keys, misses
    P.armR.rotation.set(arm, 0, 0.1); const lookK = k ? clamp((k[1] - 1.7) / 4) : 0;
    P.headPivot.rotation.set(-0.7 * lookK - (t < TOSS1 ? 0.35 : 0), 0, 0);
    if (t >= RET + 0.6 && t < RET + 1.5) { const u = Math.sin(clamp((t - RET - 0.6) / 0.9) * Math.PI); G.position.y -= 0.3 * u; P.torso.rotation.x = 0.6 * u; P.headPivot.rotation.x = 0.4 * u; P.legL.rotation.x = -0.5 * u; }
    if (cr > 0) { G.position.y -= 0.1 * cr; G.scale.y = 1 - 0.08 * cr; P.torso.rotation.x += 0.45 * cr; P.legL.rotation.z = -0.3 * cr; P.legR.rotation.z = 0.3 * cr; P.armL.rotation.x = -0.35 * cr; P.headPivot.rotation.x += 0.2 * cr; }
    const fHero = heavy ? (story < 0.9 ? { brows: 'up', eyes: 1.6, mouth: 'o', look: [0, 1] } : { brows: 'worried', eyes: 1.25, mouth: 'grit', look: [0.2, -0.3] }) : t >= TOSS2 + 0.9 ? { brows: 'up', eyes: 1.3, mouth: 'smile', look: [0, 1] } : t >= RET ? { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.2 } : { brows: 'neutral', eyes: 1.05, mouth: 'smile', look: [0, 1] };
    setFace(P, fHero); life(P, tm, heavy ? 0.4 : 1);
    // ---- Dave on the balcony ----
    const DG = D.group; DG.position.set(-4.05, FLOOR + 0.0 + bounce * 0.6, HZ + 0.2); DG.scale.set(1, 1, 1); DG.rotation.set(0, Math.PI / 2 - 0.35, 0); D.torso.rotation.set(0.15, 0, 0); D.legL.rotation.set(0, 0, 0); D.legR.rotation.set(0, 0, 0);
    const reach = t < EV ? smooth(TOSS1 - 0.4, TOSS1 + 0.2, t) : heavy ? 1 - smooth(0.4, 0.9, story) : t < TOSS2 ? 0 : t < TOSS2 + 1.6 ? smooth(TOSS2 - 0.2, TOSS2 + 0.4, t) : 1 - smooth(TOSS2 + 1.6, TOSS2 + 2.4, t);
    D.armR.rotation.set(lerp(-0.2, -2.7, reach), 0, 0.15); D.armL.rotation.set(-0.9, 0, -0.2); D.headPivot.rotation.set(0.45 * (1 - reach * 0.3), 0, 0);
    if (heavy && story > 0.5) { D.armR.rotation.set(-1.0, 0, 0.3); D.armL.rotation.set(-1.1, 0, -0.3); } // grips the railing
    if (cr > 0) { DG.position.y -= 0.08 * cr; DG.scale.y = 1 - 0.08 * cr; D.torso.rotation.x += 0.45 * cr; D.legL.rotation.z = -0.28 * cr; D.legR.rotation.z = 0.28 * cr; }
    setFace(D, heavy ? (story < 0.8 ? { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.3, look: [0, -1] } : { brows: 'worried', eyes: 1.3, mouth: 'grit', look: [0.3, -0.6] }) : t >= TOSS2 + 0.95 ? { brows: 'up', eyes: 1.3, mouth: 'smile', look: [0, -1] } : { brows: 'neutral', eyes: 1.1, mouth: 'smile', look: [0, -1] });
    life(D, tm, heavy ? 0.4 : 1);
    // ---- keys ----
    if (k) { keys.visible = true; keys.position.set(k[0], k[1], k[2]); keys.rotation.set(k[3] * 0.7, k[3], 0); if (k[1] <= 0.21) keys.rotation.set(-Math.PI / 2, 0.4, 0); }
    else if (t >= TOSS2) { keys.visible = true; DG.updateMatrixWorld(true); D.armR.userData.end.getWorldPosition(tv); keys.position.copy(tv); keys.rotation.set(0, 0, 0.3); }
    else { keys.visible = true; G.updateMatrixWorld(true); P.armR.userData.end.getWorldPosition(tv); keys.position.copy(tv); keys.position.y -= 0.08; keys.rotation.set(0, 0, Math.sin(t * 6) * 0.6); }
    // ---- Mittens on the balcony rail: melts into a loaf ----
    mittens.position.set(-3.7, FLOOR + 1.03 - 0.06 * cr, HZ - 1.1); mittens.rotation.set(0, 1.2 + Math.sin(tm * 0.7) * 0.2, 0); mittens.scale.set(1.2 + 0.3 * cr, 1.2 * (1 - 0.45 * cr), 1.2 + 0.2 * cr);
    A.userData.plant.scale.set(1 + 0.2 * cr, 1 - 0.3 * cr, 1 + 0.2 * cr); A.userData.plant.position.y = FLOOR + 0.6 - 0.1 * cr;
    // ---- street life ----
    const tw = move(1.0);
    const ballOff = heavy ? story > 0.35 : t >= RET; const sB = 0.35;
    SL.update(tw, { stop: heavy ? smooth(0, 0.5, story) : 0, crouch: cr, look: t >= RET ? (1 - smooth(RET + 2, RET + 3.5, t)) * 0.6 : 0, balloonFree: ballOff,
      balloon: ballOff ? (hand) => { const ds = Math.max(0, (t < RET ? story : 5 + (t - RET)) - sB); if (A.userData.bz === undefined) { A.userData.bz = hand.z; A.userData.bx = hand.x; }
        return tv.set(A.userData.bx + ds * 0.35, hand.y + 1.3 + 3.0 * ds, A.userData.bz - ds * 0.4); } : null });
    if (!ballOff) { A.userData.bz = undefined; A.userData.bx = undefined; }
    // instanced pedestrians + traffic get pressed down too
    const tc = t < EV ? t : t < RET ? EV + story : EV + 5 + (t - RET), tp = move(0.5);
    C.cars.forEach((c, i) => { if (c.x > 10) { m4.compose(v.set(0, -50, 0), q.identity(), sc.set(0.001, 0.001, 0.001)); C.carB.setMatrixAt(i, m4); C.carT.setMatrixAt(i, m4); C.carL.setMatrixAt(i, m4); return; } const z = c.still ? c.z0 : wrap(c.z0 + c.sp * tc, -250, 254); m4.compose(v.set(c.x, 0.02 - 0.12 * cr, z), q.setFromEuler(e.set(0, c.ry, 0, 'XYZ')), sc.set(1, 1 - 0.12 * cr, 1)); C.carB.setMatrixAt(i, m4); C.carT.setMatrixAt(i, m4); if (c.c !== 0xf5c518) m4.compose(v.set(0, -20, 0), q, sc.set(0.001, 0.001, 0.001)); C.carL.setMatrixAt(i, m4); });
    [C.carB, C.carT, C.carL].forEach(m => m.instanceMatrix.needsUpdate = true);
    C.peds.forEach((p, i) => { const z = wrap(p.z0 + p.dir * p.sp * tp, -200, 200); const y = 0.15 - 0.15 * cr + (!heavy ? Math.abs(Math.sin(tp * 8 + p.ph)) * 0.05 : 0);
      m4.compose(v.set(p.x, y, z), q.setFromEuler(e.set(0.35 * cr * (p.dir > 0 ? 1 : 1), p.dir > 0 ? 0 : Math.PI, 0, 'YXZ')), sc.set(p.s, p.s * (1 - 0.15 * cr), p.s)); C.pB.setMatrixAt(i, m4); C.pH.setMatrixAt(i, m4); C.pL.setMatrixAt(i, m4); });
    C.pB.instanceMatrix.needsUpdate = C.pH.instanceMatrix.needsUpdate = C.pL.instanceMatrix.needsUpdate = true;
    // ---- the jet: lift stays at 1 g, so it sinks 1/2*g*s^2 (122 m after 5 s) ----
    const ps = t < EV ? 0 : t < RET ? story : 5; const sink = 0.5 * G1 * ps * ps; const pt = t < EV ? t : t < RET ? EV + story : EV + 5 + (t - RET);
    plane.position.set(PL.x0 + PL.vx * pt, PL.y - sink, PL.z); plane.rotation.set(0, 0, -0.04 - 0.12 * smooth(0, 2, ps) * (t < RET ? 1 : 0)); ghost.position.set(PL.x0 + PL.vx * pt, PL.y, PL.z); ghost.visible = heavy && story > 1.5; ghost.material.opacity = 0.45 * smooth(1.5, 2.2, story);
    out.sink = sink; out.planeOn = heavy && story > 1.9 && story < 4.0;
    // ---- camera: street (follow the keys) -> tilt up after the balloon -> rise over the skyline (the jet) -> cut to your face -> back to the street ----
    let c, g, fov = 50, shC = [HX, HZ, 60];
    const S0 = [24.0, 4.5, -14.5], S1 = [23.6, 4.5, -17.0], G0 = [HX - 1.0, 3.0, HZ];
    if (t < EV) { const u = easeInOut(t / EV); c = [lerp(S0[0], S1[0], u), S0[1], lerp(S0[2], S1[2], u)]; g = G0; fov = lerp(34, 31, u); }
    else if (t < 16) { const kk = k ? k[1] : 0.2; const u = smooth(EV, 9, t); c = [S1[0] - 0.1 * (t - EV), S1[1], S1[2]]; g = [G0[0], lerp(3.3, clamp(kk, 2.0, 4.4), u), HZ]; fov = lerp(31, 27, smooth(EV, 15, t)); }
    else if (t < 21) { const u = easeInOut((t - 16) / 5); c = [lerp(S1[0] - 0.9, 12, u), lerp(S1[1], 8.5, u), lerp(S1[2], -18, u)]; const bp = SL.kidBalloon.position; const w = smooth(0, 0.4, u); g = [lerp(G0[0], bp.x, w), lerp(2.0, bp.y + 0.4, w), lerp(HZ, bp.z, w)]; fov = lerp(27, 36, u); }
    else if (t < 31) { const u = easeInOut((t - 21) / 10); const bp = SL.kidBalloon.position; const u1 = easeInOut(clamp((t - 21) / 6)), u2 = smooth(27, 31, t); c = [lerp(12, 10, u1) - 5 * u2, lerp(8.5, 300, u1) + 10 * u2, lerp(-18, 0, u1) - 40 * u2]; g = [lerp(bp.x, -40, u1), lerp(bp.y + 0.4, 320, u1), lerp(bp.z, -760, u1)]; fov = lerp(36, 54, u1); shC = [0, -300, 900]; }
    else if (t < RET + 0.0) { const u = (t - 31) / (RET - 31); c = [HX - 1.45, 1.4, HZ + 1.6 + 0.2 * u]; g = [HX, 1.22, HZ]; fov = lerp(40, 37, u); }
    else { const u = easeInOut(clamp((t - RET - 0.2) / 2.2)); c = [lerp(HX - 1.45, S1[0] + 0.5, u), lerp(1.4, 4.5, u) + 1.5 * Math.sin(Math.PI * u), lerp(HZ + 1.8, S1[2] + 0.5, u)]; g = [lerp(HX, G0[0], u), lerp(1.22, G0[1], u), HZ]; fov = lerp(37, 31, u); }
    if ((new URLSearchParams(location.search).get('dbg') || '').includes('V')) { c = [8, 12, -8]; g = [HX, 2, HZ]; fov = 60; }
    setShadow(...shC); cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix();
    out.flash = 0.55 * pulse(t, RET, 0.3); out.shake = heavy ? 0.25 * pulse(story, 0, 0.25) : t >= RET ? 0.3 * pulse(t, RET, 0.4) : 0;
    return out;
  }
  const lines = [[0.7, 3.7, "You're tossing your keys up to Dave, on the second floor."], [3.8, 7.3, 'In seven seconds, gravity doubles. Everywhere on Earth.'], [7.6, 10.69, 'Your keys stop short… and drop twice as fast.'], [10.9, 13.53, 'You suddenly weigh double. So does everyone.'], [13.9, 16.42, 'Each step feels like carrying a second you.'], [17.0, 20.35, 'Only the balloon wins. It rises even faster.'], [20.6, 22.93, 'Every plane in the sky starts to sink.'], [24.2, 27.9, 'In five seconds, this one drops 120 meters.'], [28.0, 30.63, 'Every bridge and tower holds twice its weight.'], [31.4, 33.81, 'Your heart pushes blood that weighs double.'], [34.3, 36.14, 'Then, gravity lets go.'], [37.6, 39.95, 'Second toss. Dave catches them.'], [40.5, 43.59, 'And the space station? It just fell a football field.']];
  function wrapText(ctx, text, maxW) { const ws = text.split(' '); const ls = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { ls.push(cur); cur = w; } else cur = n; } ls.push(cur); return ls; }
  function hud(ctx, t, st) { const W = 1080, H = 1920;
    if (t < CARDT + 0.6) {
      drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF GRAVITY DOUBLED', size: 84 }, { text: 'FOR 5 SECONDS?', size: 96, accent: true }], t, '#ffd23f', { start: 0.3, outAt: 6.0 });
      const yC = lerp(H * 0.268, H * 0.105, smooth(6.0, 6.6, t)); const f3 = (x) => `0:0${Math.max(0, x).toFixed(3)}`;
      const o = t < EV ? { label: 'GRAVITY DOUBLES IN', value: f3(EV - t), color: '#ffd23f' } : t < RET ? { label: 'NORMAL GRAVITY IN', value: f3(5 - st.story), color: '#ff8a4c' } : { label: 'GRAVITY', value: '1 G', color: '#ffd23f' };
      drawSideCounter(ctx, W, H, { y: yC, ...o, note: t < EV ? 'real time' : t < RET ? 'slow motion · 6x · 2 g' : 'back to normal', bump: Math.max(pulse(t, EV, 0.4), pulse(t, RET, 0.4)), glow: o.color });
      for (const [a, b, txt] of lines) { if (t < a || t > b) continue; const al = clamp(Math.min((t - a) / 0.3, (b - t) / 0.3)); ctx.save(); ctx.globalAlpha = al; ctx.font = `italic 600 50px ${FS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 16; ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
        wrapText(ctx, txt, W * 0.8).forEach((l, i) => { ctx.strokeText(l, W / 2, H * 0.70 + i * 64); ctx.fillText(l, W / 2, H * 0.70 + i * 64); }); ctx.restore(); }
      if (st.planeOn) { tv.copy(plane.position); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); tv.project(cam); if (tv.z < 1 && Math.abs(tv.x) < 0.95 && Math.abs(tv.y) < 0.95) { const px = (tv.x * 0.5 + 0.5) * 1080, py = (1 - (tv.y * 0.5 + 0.5)) * 1920;
        ctx.save(); ctx.font = `800 34px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#ffb070'; const s = `▼ ${Math.round(st.sink)} m`; ctx.strokeText(s, px, py + 70); ctx.fillText(s, px, py + 70); ctx.restore(); } }
    }
    if (t >= CARDT) { const a = smooth(CARDT, CARDT + 0.6, t); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `500 62px ${FS}`; ctx.fillText('What if gravity doubled', W / 2, H * 0.40); ctx.fillStyle = '#ffd23f'; ctx.fillText('for 5 seconds?', W / 2, H * 0.40 + 80);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `600 24px ${FONT}`; ctx.fillText('AT 2 G IN 5 S: A JET SINKS ~120 M  ·  THE SPACE STATION ~110 M', W / 2, H * 0.40 + 170);
      ctx.fillStyle = '#fff'; ctx.font = `italic 600 46px ${FS}`; ctx.fillText('What should we try next?', W / 2, H * 0.60); ctx.fillStyle = '#ffd23f'; ctx.font = `800 30px ${FONT}`; ctx.fillText('TELL US IN THE COMMENTS', W / 2, H * 0.60 + 66); ctx.restore(); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL: TOT } };
}
