// Lively-street actors for format_v5 (owner, Nov 11: "more cars driving and people doing specific things").
// Avenue layout used by the NYC-style scenes: road x 0..20 (traffic along z), west sidewalk x -5..0, east sidewalk x 20..25.
// Each actor is a real makePerson character with its own little job. update(tw, o) takes WORLD time (can be braked / slow-mo)
// and o = { look: 0..1 (everyone looks up), crouch: 0..1 (pressed down, e.g. heavy gravity), stop: 0..1 (actors halt) }.
import { clamp, lerp, rng, makePerson, setFace, life } from './lib.js';

const wrap = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;

function makeDog(THREE, color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true }), k = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.62), m); body.position.y = 0.42; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.26), m); head.position.set(0, 0.6, 0.38); g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.14), m); snout.position.set(0, 0.55, 0.55); g.add(snout);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.04), k); nose.position.set(0, 0.58, 0.62); g.add(nose);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.08), k); ear.position.set(s * 0.1, 0.7, 0.34); ear.rotation.z = s * 0.3; g.add(ear); }
  const legs = []; for (const [x, z] of [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.22], [0.09, -0.22]]) { const p = new THREE.Group(); p.position.set(x, 0.32, z); const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.07), m); l.position.y = -0.16; p.add(l); g.add(p); legs.push(p); }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.26), m); tail.position.set(0, 0.55, -0.4); tail.rotation.x = 0.7; g.add(tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return { g, legs, tail, head };
}
function line(THREE, color) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color })); l.frustumCulled = false; return l; }
function setLine(l, a, b) { const p = l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; }

// walking pose; ph = gait phase, amp = stride
function walk(P, ph, amp = 0.5) { const s = Math.sin(ph); P.legL.rotation.set(s * amp, 0, 0); P.legR.rotation.set(-s * amp, 0, 0); P.armL.rotation.set(-s * amp * 0.8, 0, -0.08); P.armR.rotation.set(s * amp * 0.8, 0, 0.08); P.torso.rotation.set(0, 0, 0); }
// pressed down (heavy) on top of any pose
function press(P, c) { if (c <= 0) return; P.group.position.y -= 0.1 * c; P.group.scale.y *= 1 - 0.08 * c; P.torso.rotation.x += 0.45 * c; P.headPivot.rotation.x += 0.3 * c;
  P.legL.rotation.set(lerp(P.legL.rotation.x, 0, c), 0, -0.3 * c); P.legR.rotation.set(lerp(P.legR.rotation.x, 0, c), 0, 0.3 * c); P.armL.rotation.x = lerp(P.armL.rotation.x, -0.35, c); P.armR.rotation.x = lerp(P.armR.rotation.x, -0.35, c); }

export function makeStreetLife(THREE, A, o = {}) {
  const R = rng(o.seed ?? 11); const zc = o.z ?? 0; const actors = []; const tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
  const mk = (opt) => { const P = makePerson(THREE, opt); P.group.rotation.order = 'YXZ'; A.add(P.group); return P; };
  const want = new Set(o.only ?? ['dog', 'jogger', 'cyclist', 'kid', 'musician', 'van', 'phone', 'coffee']);

  // 1) dog walker on the west sidewalk, walking toward the camera side
  if (want.has('dog')) { const P = mk({ shirt: 0xd9822b, pants: 0x3b3b46, hair: 0xd9c38a, skin: 0xf1c6a5, seed: 21 }); const D = makeDog(THREE, o.dogColor ?? 0x9b6b3c); A.add(D.g); const leash = line(THREE, 0xd03030); A.add(leash);
    const x = o.dogX ?? -1.6, z0 = zc + (o.dogZ ?? 40), sp = 1.1, dir = o.dogDir ?? -1;
    actors.push((tw, s) => { const go = tw * sp * (1 - s.stop * 0.0); const z = z0 + dir * go; P.group.position.set(x, 0.15, z); P.group.scale.set(1, 1, 1); P.group.rotation.set(0, dir > 0 ? 0 : Math.PI, 0);
      walk(P, tw * 7.5, 0.45 * (1 - s.stop)); P.armR.rotation.set(-0.7, 0, 0.15); P.headPivot.rotation.set(-0.6 * s.look, 0, 0); press(P, s.crouch);
      setFace(P, s.look > 0.3 || s.crouch > 0.3 ? { brows: 'up', eyes: 1.5, mouth: 'o', look: [0, 1] } : { brows: 'neutral', eyes: 1, mouth: 'smile', look: [0.3, 0] }); life(P, tw, 1);
      const dz = z + dir * 1.6; D.g.position.set(x + 0.55, 0.15, dz); D.g.rotation.set(0, dir > 0 ? 0 : Math.PI, 0); D.g.scale.y = 1 - 0.15 * s.crouch; D.g.position.y -= 0.12 * s.crouch;
      D.legs.forEach((l, i) => l.rotation.x = Math.sin(tw * 11 + (i % 2 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * 0.5 * (1 - s.stop) * (1 - s.crouch)); D.tail.rotation.y = Math.sin(tw * 14) * 0.6 * (1 - s.crouch); D.head.rotation.x = -0.5 * s.look;
      P.group.updateMatrixWorld(true); P.armR.userData.end.getWorldPosition(tv); tv2.set(x + 0.55, 0.15 + 0.55 - 0.12 * s.crouch, dz + dir * 0.32); setLine(leash, tv, tv2); }); }

  // 2) jogger in bright kit, running along the east edge of the west sidewalk, away from camera
  if (want.has('jogger')) { const P = mk({ shirt: 0xff4fa0, pants: 0x1d1f22, hair: 0x2a1a10, skin: 0xb5835a, shoe: 0x45e0ff, seed: 22 });
    const x = o.jogX ?? -0.9, z0 = zc + (o.jogZ ?? -8), sp = 3.4;
    actors.push((tw, s) => { const z = wrap(z0 + tw * sp, zc - 60, zc + 140); P.group.position.set(x, 0.15 + Math.abs(Math.sin(tw * 6)) * 0.12 * (1 - s.crouch), z); P.group.scale.set(1, 1, 1); P.group.rotation.set(0.12, 0, 0);
      walk(P, tw * 12, 0.9 * (1 - 0.7 * s.crouch)); P.armL.rotation.z = -0.2; P.armR.rotation.z = 0.2; P.headPivot.rotation.set(-0.12 - 0.5 * s.look, 0, 0); press(P, s.crouch);
      setFace(P, s.crouch > 0.3 ? { brows: 'worried', eyes: 1.4, mouth: 'grit' } : s.look > 0.3 ? { brows: 'up', eyes: 1.5, mouth: 'o' } : { brows: 'neutral', eyes: 1, mouth: 'flat' }); life(P, tw, 0.5); }); }

  // 3) cyclist in the curb lane (northbound like the traffic)
  if (want.has('cyclist')) { const P = mk({ shirt: 0xf2c14e, pants: 0x30405a, hair: 0x111111, skin: 0x8d5a3b, seed: 23 }); const bike = new THREE.Group(); const fm = new THREE.MeshStandardMaterial({ color: 0x2d9cdb, roughness: 0.4, metalness: 0.3 }), tm = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
    const wheels = []; for (const z of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 16), tm); w.rotation.y = Math.PI / 2; w.position.set(0, 0.35, z); bike.add(w); wheels.push(w); }
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.0), fm); f1.position.set(0, 0.68, 0); f1.rotation.x = -0.25; bike.add(f1); const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), fm); f2.position.set(0, 0.6, -0.15); bike.add(f2);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), tm); hb.position.set(0, 1.05, 0.45); bike.add(hb); const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8262a, roughness: 0.4 })); helmet.position.y = 0.2; P.headPivot.add(helmet);
    bike.traverse(m => { if (m.isMesh) m.castShadow = true; }); A.add(bike); const x = o.bikeX ?? 1.6, z0 = zc + (o.bikeZ ?? -30), sp = 5.5;
    actors.push((tw, s) => { const z = wrap(z0 + tw * sp, zc - 70, zc + 150); bike.position.set(x, 0.15, z); wheels.forEach(w => w.rotation.x = tw * sp / 0.33);
      P.group.position.set(x, 0.15 + 0.12 - 0.15 * s.crouch, z - 0.15); P.group.scale.set(1, 1, 1); P.group.rotation.set(0, 0, 0); P.torso.rotation.set(0.45 + 0.25 * s.crouch, 0, 0); P.armL.rotation.set(-1.1, 0, -0.1); P.armR.rotation.set(-1.1, 0, 0.1);
      P.legL.rotation.set(-1.0 + Math.sin(tw * 9) * 0.5, 0, 0); P.legR.rotation.set(-1.0 - Math.sin(tw * 9) * 0.5, 0, 0); P.headPivot.rotation.set(0.25 - 0.6 * s.look, 0, 0);
      setFace(P, s.look > 0.3 || s.crouch > 0.3 ? { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.2 } : { brows: 'neutral', eyes: 1, mouth: 'smile' }); life(P, tw, 0.4); }); }

  // 4) kid with a balloon, holding a parent's hand (balloon string as a line)
  let kidBalloon = null;
  if (want.has('kid')) { const K = mk({ shirt: 0x2bb3b1, pants: 0x30405a, hair: 0x7a4a1a, skin: 0xd8a47e, seed: 24 }); const M = mk({ shirt: 0x8e5bb5, pants: 0x222222, hair: 0x2a1a10, skin: 0xd8a47e, seed: 25 });
    const bal = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: o.balloonColor ?? 0xff2a4a, roughness: 0.25, metalness: 0.05 })); bal.scale.y = 1.18; A.add(bal); const str = line(THREE, 0xffffff); A.add(str); kidBalloon = bal;
    const x = o.kidX ?? -3.0, z0 = zc + (o.kidZ ?? 24), sp = 0.85, dir = o.kidDir ?? -1;
    actors.push((tw, s) => { const z = z0 + dir * tw * sp; K.group.position.set(x + 0.5, 0.15, z); K.group.scale.setScalar(0.62); K.group.rotation.set(0, dir > 0 ? 0 : Math.PI, 0); walk(K, tw * 9, 0.5 * (1 - s.stop)); K.armR.rotation.set(-2.6, 0, 0.1); K.armL.rotation.set(-0.3, 0, 0.3);
      K.headPivot.rotation.set(-0.5 - 0.3 * s.look, 0, 0); press(K, s.crouch); setFace(K, s.look > 0.3 || s.crouch > 0.3 ? { brows: 'up', eyes: 1.6, mouth: 'o', look: [0, 1] } : { brows: 'up', eyes: 1.2, mouth: 'smile', look: [0, 1] }); life(K, tw, 1);
      M.group.position.set(x - 0.15, 0.15, z + dir * 0.1); M.group.scale.set(1, 1, 1); M.group.rotation.set(0, dir > 0 ? 0 : Math.PI, 0); walk(M, tw * 7, 0.4 * (1 - s.stop)); M.armR.rotation.set(-0.2, 0, -0.35); M.headPivot.rotation.set(0.2 - 0.8 * s.look, 0.3 * (1 - s.look), 0); press(M, s.crouch);
      setFace(M, s.look > 0.3 || s.crouch > 0.3 ? { brows: 'worried', eyes: 1.4, mouth: 'open' } : { brows: 'neutral', eyes: 1, mouth: 'smile', look: [-0.4, -0.3] }); life(M, tw, 1);
      K.group.updateMatrixWorld(true); K.armR.userData.end.getWorldPosition(tv); const bp = s.balloon ? s.balloon(tv, tw) : tv2.set(tv.x + Math.sin(tw * 1.3) * 0.15, tv.y + 1.3, tv.z + Math.cos(tw * 1.1) * 0.1);
      bal.position.copy(bp); bal.position.y += 0.3; setLine(str, s.balloonFree ? tv2.copy(bp).setY(bp.y - 0.9) : tv, bp); }); }

  // 5) street musician with a guitar and an open case, by a shop front
  if (want.has('musician')) { const P = mk({ shirt: 0x3a3a3a, pants: 0x4a3426, hair: 0x111111, skin: 0x5c3a24, seed: 26 }); const wood = new THREE.MeshStandardMaterial({ color: 0xc27a35, roughness: 0.6 });
    const gt = new THREE.Group(); const gb = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.1), wood); gt.add(gb); const neck = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.05), new THREE.MeshStandardMaterial({ color: 0x3b2416 })); neck.position.set(0, 0.5, 0); gt.add(neck); gt.position.set(0.02, 1.08, 0.24); gt.rotation.z = 1.0; P.group.add(gt);
    const cs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 1.0), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); const lin = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.9), new THREE.MeshStandardMaterial({ color: 0xa3122f })); lin.position.y = 0.05; cs.add(lin); A.add(cs);
    const x = o.musX ?? -4.3, z = zc + (o.musZ ?? 6); cs.position.set(x + 0.9, 0.2, z); P.group.traverse(m => { if (m.isMesh) m.castShadow = true; });
    actors.push((tw, s) => { P.group.position.set(x, 0.15, z); P.group.scale.set(1, 1, 1); P.group.rotation.set(0, Math.PI / 2, 0); P.legL.rotation.set(0, 0, -0.08); P.legR.rotation.set(0, 0, 0.08); P.torso.rotation.set(0, 0, 0);
      const strum = s.stop > 0.5 ? 0 : Math.sin(tw * 9) * 0.35; P.armR.rotation.set(-0.9 + strum, 0, -0.5); P.armL.rotation.set(-1.4, 0, 0.6); P.headPivot.rotation.set(0.15 * Math.sin(tw * 2.1) - 0.7 * s.look, 0, 0); P.group.rotation.z = 0.04 * Math.sin(tw * 4.5) * (1 - s.stop); press(P, s.crouch);
      setFace(P, s.look > 0.3 || s.crouch > 0.3 ? { brows: 'up', eyes: 1.5, mouth: 'o' } : { brows: 'neutral', eyes: 0.6, mouth: 'smile' }); life(P, tw, 1); }); }

  // 6) delivery van at the curb, back doors open, courier carrying boxes to a shop door
  if (want.has('van')) { const vm = new THREE.MeshStandardMaterial({ color: o.vanColor ?? 0xf4f4f0, roughness: 0.5 }); const van = new THREE.Group(); const bx = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.3, 5.4), vm); bx.position.y = 1.4; van.add(bx);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 1.2), vm); cab.position.set(0, 0.95, 3.2); van.add(cab); const ws = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.05), new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.2 })); ws.position.set(0, 1.35, 3.81); van.add(ws);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.35, 5.0), new THREE.MeshStandardMaterial({ color: o.vanStripe ?? 0xf28c38 })); stripe.position.y = 1.2; van.add(stripe);
    for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.1, 1.0), vm); d.position.set(sx * 1.55, 1.35, -3.15); d.rotation.y = sx * 0.4; van.add(d); }
    for (const [wx, wz] of [[-1, 2.9], [1, 2.9], [-1, -1.8], [1, -1.8]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x151515 })); w.rotation.z = Math.PI / 2; w.position.set(wx * 1.0, 0.38, wz); van.add(w); }
    van.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); A.add(van); const vx = o.vanX ?? 1.3, vz = zc + (o.vanZ ?? 52); van.position.set(vx, 0.02, vz);
    const P = mk({ shirt: 0x7a4a1a, pants: 0x5a3a1a, hair: 0x2a1a10, skin: 0xf1c6a5, seed: 27 }); const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.9 })); box.castShadow = true; A.add(box);
    const stack = []; for (let k = 0; k < 4; k++) { const b = box.clone(); b.position.set(-4.4, 0.35 + k * 0.4, vz - 3.3 + (k % 2) * 0.1); A.add(b); stack.push(b); }
    actors.push((tw, s) => { const cyc = 6.0, u = wrap(tw, 0, cyc) / cyc; const from = vx - 0.2, to = -4.0; const goingOut = u < 0.5; const k = goingOut ? u / 0.5 : (u - 0.5) / 0.5; const xx = goingOut ? lerp(from, to, k) : lerp(to, from, k);
      P.group.position.set(xx, 0.15, vz - 3.6); P.group.scale.set(1, 1, 1); P.group.rotation.set(0, goingOut ? -Math.PI / 2 : Math.PI / 2, 0); walk(P, tw * 8, 0.45 * (1 - s.stop));
      if (goingOut) { P.armL.rotation.set(-1.2, 0, 0.2); P.armR.rotation.set(-1.2, 0, -0.2); } P.headPivot.rotation.set(-0.7 * s.look, 0, 0); press(P, s.crouch);
      setFace(P, s.crouch > 0.3 ? { brows: 'worried', eyes: 1.4, mouth: 'grit' } : s.look > 0.3 ? { brows: 'up', eyes: 1.5, mouth: 'o' } : { brows: 'neutral', eyes: 1, mouth: 'flat' }); life(P, tw, 0.6);
      box.visible = goingOut; P.group.updateMatrixWorld(true); P.armL.userData.end.getWorldPosition(tv); P.armR.userData.end.getWorldPosition(tv2); box.position.set((tv.x + tv2.x) / 2, (tv.y + tv2.y) / 2 + 0.05 - (s.boxDrop || 0), (tv.z + tv2.z) / 2); });
    actors.van = van; }

  // 7) someone pacing on the phone (east sidewalk)
  if (want.has('phone')) { const P = mk({ shirt: 0x0b3a8f, pants: 0x9aa3ad, hair: 0x3b2416, skin: 0xf1c6a5, seed: 28 }); const ph = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.08), new THREE.MeshStandardMaterial({ color: 0x111111 })); ph.position.set(0, -0.62, 0.08); P.armR.add(ph);
    const x = o.phX ?? 21.6, z0 = zc + (o.phZ ?? 10);
    actors.push((tw, s) => { const u = Math.sin(tw * 0.35); const z = z0 + u * 4; const dir = Math.cos(tw * 0.35) > 0 ? 0 : Math.PI; P.group.position.set(x, 0.15, z); P.group.scale.set(1, 1, 1); P.group.rotation.set(0, dir, 0); walk(P, tw * 5, 0.3 * (1 - s.stop));
      P.armR.rotation.set(-2.5, 0, 0.55); P.armL.rotation.x += 0.4 * Math.sin(tw * 3); P.headPivot.rotation.set(-0.6 * s.look, 0.15 * Math.sin(tw * 1.4), 0.2); press(P, s.crouch);
      setFace(P, s.look > 0.3 || s.crouch > 0.3 ? { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.4 } : { brows: 'neutral', eyes: 1, mouth: Math.sin(tw * 7) > 0 ? 'open' : 'flat', open: 0.7 }); life(P, tw, 1); }); }

  // 8) office worker with a coffee and a dog-eared paper, waiting at the corner
  if (want.has('coffee')) { const P = mk({ shirt: 0xeeeeee, pants: 0x222831, hair: 0x6b4a2a, skin: 0xd8a47e, seed: 29 }); const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0xffffff })); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.025, 8), new THREE.MeshStandardMaterial({ color: 0x2a6a3a })); lid.position.y = 0.08; cup.add(lid); cup.position.set(0, -0.66, 0.06); P.armL.add(cup);
    const x = o.cofX ?? 22.4, z = zc + (o.cofZ ?? -3);
    actors.push((tw, s) => { P.group.position.set(x, 0.15, z); P.group.scale.set(1, 1, 1); P.group.rotation.set(0, -Math.PI / 2 + 0.4, 0); P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0);
      const sip = Math.max(0, Math.sin(tw * 0.9)) ** 6; P.armL.rotation.set(-0.7 - 1.2 * sip, 0, -0.3); P.armR.rotation.set(-0.1, 0, 0.1); P.headPivot.rotation.set(0.1 * sip - 0.7 * s.look, 0, 0); press(P, s.crouch);
      setFace(P, s.look > 0.3 || s.crouch > 0.3 ? { brows: 'up', eyes: 1.5, mouth: 'o' } : { brows: 'neutral', eyes: 0.9, mouth: 'flat' }); life(P, tw, 1); }); }

  return { kidBalloon, van: actors.van, update(tw, s = {}) { const st = { look: 0, crouch: 0, stop: 0, ...s }; for (const f of actors) f(tw, st); } };
}
