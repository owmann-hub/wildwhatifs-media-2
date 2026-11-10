import { clamp, lerp, smooth, easeOut, easeInOut, pulse, rng, makePerson, drawCaption, makeCat, makeShockwave, makeBurst, setFace, life, drawBubble, drawSideCounter, drawTitleTimed, drawPunch, drawTag, softTex } from './lib.js';

// Wild What Ifs — "What if you never stopped shrinking?" (part 2 of grow)
// The hero stays 1.8 units tall at the origin; every world "set" k is built for hero = 1.8 m × 10^-k and is
// scaled by 10^(z-k) about the hero's feet, so shrinking = the world swelling around you.
export const B = { hook: 0.1, h2: 1.75, l1: 4.15, l2: 7.8, l3: 10.55, l4: 14.45, l5: 18.4, l6: 22.05, l7: 25.35, l8: 28.15, close: 31.9 };
const TOTAL = 35.3, COLD = 0.55;
const STEPS = [[B.l1, 1], [B.l2, 2], [B.l3, 4], [B.l4, 5], [B.l5, 6], [B.l6, 7], [B.l7, 9], [B.l8, 10]];
export function zAt(t) { // log10 shrink factor; always creeping so the counter never stops
  const CR = 0.035; let base = 0, tprev = 0;
  for (const [tb, lv] of STEPS) { const ts = tb - 0.12; if (t < ts) break; const from = base + (ts - tprev) * CR; const u = easeInOut(clamp((t - ts) / 0.75));
    if (u < 1) return lerp(from, lv, u); base = lv; tprev = ts + 0.75; }
  return base + Math.max(0, t - tprev) * (base >= 10 ? 0.012 : CR);
}
function fmtH(z) { const m = 1.8 * Math.pow(10, -z);
  const u = m >= 1 ? [1, 'm'] : m >= 0.01 ? [100, 'cm'] : m >= 0.001 ? [1000, 'mm'] : m >= 1e-6 ? [1e6, 'µm'] : [1e9, 'nm'];
  const v = m * u[0]; const d = v >= 100 ? 0 : v >= 10 ? 1 : v >= 1 ? 2 : 3; return v.toFixed(d) + ' ' + u[1]; }

export async function create({ THREE, W, H }) {
  const R = rng(77);
  const A = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 4e4);
  A.background = new THREE.Color(0x2a1d16); A.fog = new THREE.FogExp2(0x2a1d16, 0.03);
  const hemi = new THREE.HemisphereLight(0xffe2c0, 0x3a2a22, 1.0); A.add(hemi);
  const key = new THREE.DirectionalLight(0xffb070, 2.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); A.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fb8ff, 0.8); A.add(rim, rim.target);
  const soft = softTex(THREE, 64);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.8, metalness: o.m ?? 0, flatShading: o.flat ?? true, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}), ...(o.tr ? { transparent: true, opacity: o.tr, depthWrite: false } : {}) });
  const sets = []; const mkSet = (k, z0, z1) => { const g = new THREE.Group(); g.userData = { k, z0, z1 }; A.add(g); sets.push(g); return g; };
  const shadowAll = (g) => g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const canvasTex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

  // ================= SET 0: living room (hero = 1.8 m) =================
  const S0 = mkSet(0, -1, 1.62);
  const woodT = canvasTex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28,${38 + (i % 3) * 6}%,${30 + ((i * 37) % 9)}%)`; g.fillRect(0, i * 64, w, 64); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * 64, w, 3); g.fillRect(((i * 173) % 400), i * 64, 3, 64); }
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(60,30,10,${0.05 + (k % 5) * 0.02})`; g.fillRect((k * 97) % w, (k * 53) % h, 40 + (k % 7) * 10, 1.5); } });
  woodT.wrapS = woodT.wrapT = THREE.RepeatWrapping; woodT.repeat.set(6, 6);
  const floor0 = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: woodT, roughness: 0.6 })); floor0.rotation.x = -Math.PI / 2; floor0.position.y = -0.004; floor0.receiveShadow = true; S0.add(floor0);
  const rugT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8c2f2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8c27a'; g.lineWidth = 18; g.strokeRect(30, 30, w - 60, h - 60); g.strokeStyle = '#2b3d6b'; g.lineWidth = 10; g.strokeRect(70, 70, w - 140, h - 140);
    g.fillStyle = '#e8c27a'; for (let i = 0; i < 6; i++) { g.save(); g.translate(w / 2, h / 2); g.rotate(i * Math.PI / 3); g.beginPath(); g.ellipse(0, 90, 30, 70, 0, 0, 7); g.fill(); g.restore(); } g.fillStyle = '#2b3d6b'; g.beginPath(); g.arc(w / 2, h / 2, 50, 0, 7); g.fill(); });
  const rug = new THREE.Mesh(new THREE.BoxGeometry(5, 0.012, 3.6), new THREE.MeshStandardMaterial({ map: rugT, roughness: 1 })); rug.position.set(0, 0.0, 0.2); rug.receiveShadow = true; S0.add(rug);
  const wallM = M(0x9fb7a6, { r: 0.95 }); const back = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 0.2), wallM); back.position.set(0, 2, -4.2); S0.add(back);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 12), wallM); side.position.set(-5.5, 2, 0); S0.add(side);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), new THREE.MeshBasicMaterial({ color: 0xffc98a })); win.position.set(1.8, 2.1, -4.09); S0.add(win);
  for (const [x, y, w, h] of [[1.8, 3.05, 2.8, 0.1], [1.8, 1.15, 2.8, 0.1], [0.45, 2.1, 0.1, 1.9], [3.15, 2.1, 0.1, 1.9], [1.8, 2.1, 0.06, 1.8]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), M(0xf4efe6)); f.position.set(x, y, -4.05); S0.add(f); }
  const sofa = new THREE.Group(); { const sm = M(0x34507a); const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.1), sm); base.position.y = 0.4; sofa.add(base);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 0.3), sm); bk.position.set(0, 0.95, -0.42); sofa.add(bk); for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 1.1), sm); a.position.set(s * 1.7, 0.55, 0); sofa.add(a); }
    for (const s of [-0.8, 0.8]) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.9), M(0x4a6a9a)); c.position.set(s, 0.72, 0.05); sofa.add(c); }
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.15), M(0xe8b04a)); pil.position.set(-1.1, 1.0, -0.2); pil.rotation.z = 0.2; sofa.add(pil); }
  sofa.position.set(-1.2, 0, -3.2); S0.add(sofa);
  const table = new THREE.Group(); { const tm = M(0x7a4a2a, { r: 0.5 }); const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.8), tm); top.position.y = 0.45; table.add(top);
    for (const [x, z] of [[-0.7, -0.32], [0.7, -0.32], [-0.7, 0.32], [0.7, 0.32]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), tm); l.position.set(x, 0.22, z); table.add(l); }
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 12), M(0xf2f2f2, { flat: false })); mug.position.set(0.3, 0.545, 0.1); table.add(mug); }
  table.position.set(2.1, 0, -1.1); S0.add(table);
  const lampG = new THREE.Group(); { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), M(0x222222)); p.position.y = 0.8; lampG.add(p);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 0.4, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd08a, emissiveIntensity: 1.2, side: THREE.DoubleSide })); sh.position.y = 1.7; lampG.add(sh); }
  lampG.position.set(-3.4, 0, -3.3); S0.add(lampG); const lampL = new THREE.PointLight(0xffc27a, 3, 12, 1.5); lampL.position.set(-3.4, 1.6, -3.2); S0.add(lampL);
  const shelf = new THREE.Group(); { const sm = M(0x5a3a22); const fr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 1.6), sm); fr.position.y = 1.2; shelf.add(fr);
    for (let r = 0; r < 4; r++) for (let b = 0; b < 6; b++) { if (R() < 0.2) continue; const bk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3 + R() * 0.12, 0.12 + R() * 0.06), M(new THREE.Color().setHSL(R(), 0.5, 0.45))); bk.position.set(0.12, 0.35 + r * 0.55, -0.6 + b * 0.22); shelf.add(bk); } }
  shelf.position.set(-5.2, 0, 0.4); S0.add(shelf);
  const plant = new THREE.Group(); { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 10), M(0xc26a3a)); pot.position.y = 0.2; plant.add(pot); for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.9, 4), M(0x2f7a3a)); lf.position.set(Math.cos(i) * 0.12, 0.8, Math.sin(i) * 0.12); lf.rotation.set(Math.sin(i * 2) * 0.5, 0, Math.cos(i * 2) * 0.5); plant.add(lf); } }
  plant.position.set(3.9, 0, -3.4); S0.add(plant);
  const sunbeam = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 7), new THREE.MeshBasicMaterial({ map: soft, color: 0xffb46a, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); sunbeam.position.set(1.4, 1.4, -1.5); sunbeam.rotation.set(-0.9, 0.0, 0.2); S0.add(sunbeam);
  shadowAll(S0); floor0.castShadow = false;
  // Mittens (recurring cat) lives in set-0 coordinates
  const cat = makeCat(THREE, 0xf0a040); cat.scale.setScalar(0.62); S0.add(cat);
  const catHead = cat.children[1];
  const whisk = new THREE.Group(); for (const s of [-1, 1]) for (const a of [-0.15, 0.05, 0.25]) { const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.003, 0.003), new THREE.MeshBasicMaterial({ color: 0xffffff })); w2.position.set(s * 0.08, 0.37, 0.37); w2.rotation.z = s * a; whisk.add(w2); } cat.add(whisk);
  const catNose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M(0xe0707a)); catNose.position.set(0, 0.375, 0.375); cat.add(catNose);

  // ================= SET 2: carpet jungle (hero = 1.8 cm) =================
  const S2 = mkSet(2, 1.0, 3.35);
  const g2 = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: 0x5e1d1a, roughness: 1 })); g2.rotation.x = -Math.PI / 2; g2.position.y = -0.003; g2.receiveShadow = true; S2.add(g2); g2.userData.win = [1.45, 3.4];
  const NF = 2600; const fiberG = new THREE.CylinderGeometry(0.05, 0.09, 1, 5, 3).translate(0, 0.5, 0);
  const fibers = new THREE.InstancedMesh(fiberG, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), NF); const fdat = [];
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
    const pal = [[0.01, 0.55, 0.32], [0.02, 0.6, 0.26], [0.1, 0.62, 0.6], [0.62, 0.42, 0.3], [0.0, 0.5, 0.38]];
    for (let i = 0; i < NF; i++) { let x, z; do { const r = 0.9 + Math.pow(R(), 0.7) * 26, a = R() * 6.283; x = Math.cos(a) * r; z = Math.sin(a) * r; } while (z > 0.75 && Math.abs(x) < 1.7 && z < 9);
      const h = 1.3 + R() * 1.4; const lean = [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5]; fdat.push({ x, z, h, lean, ph: R() * 6 });
      m4.compose(v.set(x, 0, z), q.setFromEuler(e.set(lean[0], R() * 3, lean[1])), s.set(1, h, 1)); fibers.setMatrixAt(i, m4); const p = pal[Math.floor(R() * pal.length)]; fibers.setColorAt(i, c.setHSL(p[0], p[1], p[2] + (R() - 0.5) * 0.08)); } }
  fibers.castShadow = true; fibers.receiveShadow = true; S2.add(fibers);
  const crumbM = M(0xb07a3a, { r: 1 }); const crumbs = [];
  for (const [x, z, s] of [[2.2, -1.4, 0.7], [-2.6, -2.2, 0.9], [1.0, 3.6, 0.45], [-1.3, 1.6, 0.35], [3.4, 1.0, 0.5]]) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), crumbM); c.position.set(x, s * 0.6, z); c.rotation.set(R() * 3, R() * 3, 0); c.castShadow = true; S2.add(c); crumbs.push(c);
    for (let k = 0; k < 4; k++) { const ch = new THREE.Mesh(new THREE.BoxGeometry(s * 0.25, s * 0.18, s * 0.25), M(0x3a2010)); ch.position.set(x + (R() - 0.5) * s, s * 0.6 + (R() - 0.3) * s * 0.8, z + (R() - 0.5) * s); S2.add(ch); } }
  // a giant sugar crystal (glitters)
  const sugar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 })); sugar.position.set(-1.6, 0.3, -0.6); sugar.rotation.set(0.3, 0.6, 0.1); S2.add(sugar);

  // ================= SET 4: dust world (hero = 180 µm) =================
  const S4 = mkSet(4, 3.0, 5.35);
  const dustT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7c6c5c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${150 + (i % 60)},${130 + (i % 50)},${110 + (i % 40)},0.25)`; g.beginPath(); g.arc((i * 73) % w, (i * 151) % h, 1 + (i % 4), 0, 7); g.fill(); } });
  dustT.wrapS = dustT.wrapT = THREE.RepeatWrapping; dustT.repeat.set(60, 60);
  const g4 = new THREE.Mesh(new THREE.CircleGeometry(300, 48), new THREE.MeshStandardMaterial({ map: dustT, roughness: 1 })); g4.rotation.x = -Math.PI / 2; g4.position.y = -0.007; g4.receiveShadow = true; S4.add(g4); g4.userData.win = [3.4, 5.7];
  const lintM = [M(0xd8d0c4, { r: 1 }), M(0x8fa6c8, { r: 1 }), M(0xc9a0a0, { r: 1 }), M(0xe8e2d0, { r: 1 })];
  for (let i = 0; i < 22; i++) { const pts = []; const a = R() * 6.28, r0 = 3 + R() * 14; let p = new THREE.Vector3(Math.cos(a) * r0 - 15, 0.3 + R() * 2.5, Math.sin(a) * r0 - 6); const d = new THREE.Vector3(R() - 0.5, (R() - 0.5) * 0.2, R() - 0.5).normalize();
    for (let k = 0; k < 9; k++) { pts.push(p.clone()); d.add(new THREE.Vector3((R() - 0.5) * 0.6, (R() - 0.5) * 0.25, (R() - 0.5) * 0.6)).normalize(); p = p.clone().addScaledVector(d, 4); p.y = clamp(p.y, 0.2, 4); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(q => q.add(new THREE.Vector3(15, 0, 6)))), 60, 0.18 + R() * 0.25, 7), lintM[i % 4]); tube.castShadow = tube.receiveShadow = true;
    if (tube.geometry.boundingSphere || true) { tube.geometry.computeBoundingBox(); } S4.add(tube); }
  // keep the hero's spot clear of lint: push tubes that cross origin away
  S4.children.forEach(o => { if (o.geometry && o.geometry.type === 'TubeGeometry') { const bb = o.geometry.boundingBox; if (bb.min.x < 1.5 && bb.max.x > -1.5 && bb.min.z < 1.5 && bb.max.z > -1.5) o.position.z -= 4; } });
  // the dust mite (~2.7 units long = 270 µm vs your 180 µm)
  const mite = new THREE.Group(); const mm = new THREE.MeshStandardMaterial({ color: 0xead9bf, roughness: 0.45, flatShading: false, emissive: 0x2a1a10, emissiveIntensity: 0.4 });
  { const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mm); body.scale.set(0.95, 0.68, 1.35); body.position.y = 1.0; mite.add(body);
    for (let i = 0; i < 10; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.8, 4), M(0x8a6a4a)); h.position.set((R() - 0.5) * 1.2, 1.5 + R() * 0.2, (R() - 0.5) * 1.8); h.rotation.set((R() - 0.5) * 1.5, 0, (R() - 0.5) * 1.5); mite.add(h); }
    const stripe = new THREE.Mesh(new THREE.SphereGeometry(1.002, 24, 8, 0, 6.283, 0.25, 0.25), new THREE.MeshStandardMaterial({ color: 0xc9a878, roughness: 0.6, transparent: true, opacity: 0.7 })); stripe.scale.copy(body.scale); stripe.position.copy(body.position); mite.add(stripe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), M(0xb88a5a, { flat: false })); head.position.set(0, 0.85, 1.35); head.scale.set(1, 0.8, 1.1); mite.add(head);
    const eW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }), eK = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.2 });
    mite.userData.pupils = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), eW); e.position.set(s * 0.27, 1.28, 1.15); mite.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), eK); p.position.set(s * 0.27, 1.28, 1.33); mite.add(p); mite.userData.pupils.push(p); }
    mite.userData.legs = []; for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1, j = i % 4; const leg = new THREE.Group(); leg.position.set(s * 0.7, 0.85, 0.9 - j * 0.55);
      const u = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.8, 6), M(0xc8a070)); u.rotation.z = s * 1.0; u.position.set(s * 0.33, 0.12, 0); leg.add(u);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.95, 6), M(0xb08858)); l.rotation.z = -s * 0.35; l.position.set(s * 0.82, -0.3, 0); leg.add(l); mite.add(leg); mite.userData.legs.push([leg, s, j]); } }
  shadowAll(mite); S4.add(mite);
  // ================= SET 5: dead-skin flakes + a hair (hero = 18 µm) =================
  const S5 = mkSet(5, 3.9, 6.25);
  const flakeT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f0dcc8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,110,90,0.5)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { g.beginPath(); let x = (i * 61) % w, y = (i * 97) % h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.sin(i * 7 + k) * 40); y += (Math.cos(i * 3 + k) * 40); g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(200,150,130,${0.1 + (i % 4) * 0.05})`; g.beginPath(); g.arc((i * 37) % w, (i * 113) % h, 2 + i % 5, 0, 7); g.fill(); } });
  const mkFlake = (r, seed) => { const RR = rng(seed); const sh = new THREE.Shape(); const n = 7; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + RR() * 0.3, rr = r * (0.75 + RR() * 0.35); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? sh.lineTo(x, y) : sh.moveTo(x, y); } sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.02, bevelSegments: 1 }); g.rotateX(Math.PI / 2); g.translate(0, 0, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (r * 2) + 0.5, uv.getY(i) / (r * 2) + 0.5);
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: flakeT, color: 0xffffff, roughness: 0.7, transparent: true, opacity: 0.93, emissive: 0x3a2018, emissiveIntensity: 0.25 })); };
  const heroFlake = mkFlake(1.8, 5); heroFlake.position.set(0, 0.0, 0); S5.add(heroFlake); // top at y=0 (extruded downward)
  const flakes = [heroFlake]; for (let i = 0; i < 14; i++) { const f = mkFlake(1.4 + R() * 0.7, 10 + i); const a = R() * 6.28, r = 4 + R() * 12; f.position.set(Math.cos(a) * r, -0.02 + R() * 0.6, Math.sin(a) * r); f.rotation.set((R() - 0.5) * 0.6, R() * 3, (R() - 0.5) * 0.6); S5.add(f); flakes.push(f); }
  flakes.forEach(f => { f.castShadow = f.receiveShadow = true; });
  const hairT = canvasTex(64, 512, (g, w, h) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 22) { g.fillStyle = 'rgba(30,15,5,0.6)'; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + 8 + Math.sin(x * 0.3 + y) * 4); g.lineTo(w, y + 12); g.lineTo(0, y + 12); g.fill(); g.fillStyle = 'rgba(160,110,70,0.35)'; g.fillRect(0, y + 13, w, 3); } });
  hairT.wrapS = hairT.wrapT = THREE.RepeatWrapping; hairT.repeat.set(2, 14);
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 140, 40, 1, true), new THREE.MeshStandardMaterial({ map: hairT, roughness: 0.45, metalness: 0.1 })); hair.rotation.set(0, 0.35, Math.PI / 2); hair.position.set(0, 3.3, -9.5); hair.castShadow = hair.receiveShadow = true; S5.add(hair);
  // ================= SET 6: skin surface with bacteria (hero = 1.8 µm) =================
  const S6 = mkSet(6, 5.2, 6.75);
  const cellT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e6c2a8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = (i * 131) % w, y = (i * 211) % h, r = 30 + (i % 5) * 8; const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,230,210,0.7)'); gr.addColorStop(0.8, 'rgba(200,150,130,0.25)'); gr.addColorStop(1, 'rgba(150,100,90,0.6)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
  cellT.wrapS = cellT.wrapT = THREE.RepeatWrapping; cellT.repeat.set(30, 30);
  const g6 = new THREE.Mesh(new THREE.CircleGeometry(200, 48), new THREE.MeshStandardMaterial({ map: cellT, roughness: 0.65, emissive: 0x301810, emissiveIntensity: 0.3 })); g6.rotation.x = -Math.PI / 2; g6.position.y = 0.001; g6.receiveShadow = true; S6.add(g6); g6.userData.win = [5.6, 6.75];
  const bacts = []; const bPal = [0x7ad36a, 0xb48ae0, 0x5ac8d8, 0xf0b44a, 0xe07a9a];
  for (let i = 0; i < 16; i++) { const g = new THREE.Group(); const rod = i % 3 !== 2; const col = bPal[i % bPal.length]; const bm = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: 0.18, transparent: true, opacity: 0.92 });
    if (rod) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.3, 6, 14), bm); b.rotation.z = Math.PI / 2; g.add(b); const fl = []; for (let k = 0; k < 4; k++) { const pts = []; for (let j = 0; j < 12; j++) pts.push(new THREE.Vector3(-1.0 - j * 0.12, Math.sin(j * 0.9 + k) * 0.1, (k - 1.5) * 0.12)); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col })); g.add(ln); fl.push(ln); } g.userData.fl = fl; }
    else { for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), bm); s.position.set((k % 2) * 0.8 - 0.4, Math.floor(k / 2) * 0.75 - 0.2, (R() - 0.5) * 0.3); g.add(s); } }
    const a = R() * 6.28, r = 2.5 + R() * 9; g.userData = { ...g.userData, x: Math.cos(a) * r, z: -Math.abs(Math.sin(a)) * r - 1.5, y: 0.4 + R() * 1.8, ph: R() * 6, sp: 0.2 + R() * 0.3 }; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); S6.add(g); bacts.push(g); }
  // the friendly one, with a face
  const buddy = new THREE.Group(); { const bm = new THREE.MeshStandardMaterial({ color: 0x8fe07a, roughness: 0.3, emissive: 0x3a8a2a, emissiveIntensity: 0.3 }); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.6, 8, 16), bm); b.rotation.z = Math.PI / 2; buddy.add(b);
    const eW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }), eK = new THREE.MeshStandardMaterial({ color: 0x111111 }); buddy.userData.eyes = [];
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), eW); e.position.set(1.22, 0.18, s * 0.2); buddy.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), eK); p.position.set(1.37, 0.18, s * 0.2); buddy.add(p); buddy.userData.eyes.push(e); }
    const sm = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12, Math.PI), eK); sm.rotation.set(0, Math.PI / 2, Math.PI); sm.position.set(1.33, -0.1, 0); buddy.add(sm);
    for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff8aa0 })); ch.position.set(1.26, -0.04, s * 0.3); buddy.add(ch); }
    const fl = []; for (let k = 0; k < 5; k++) { const pts = []; for (let j = 0; j < 14; j++) pts.push(new THREE.Vector3(-1.2 - j * 0.13, 0, (k - 2) * 0.15)); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8fe07a })); buddy.add(ln); fl.push(ln); } buddy.userData.fl = fl; }
  buddy.traverse(o => { if (o.isMesh) o.castShadow = true; }); S6.add(buddy);
  // ================= SET 7: x-ray world, light waves + viruses (hero = 180 nm) =================
  const S7 = mkSet(7, 6.3, 8.0);
  const grid = new THREE.GridHelper(200, 200, 0x3ad0ff, 0x1a5a9a); grid.material.transparent = true; grid.material.opacity = 0.45; grid.material.depthWrite = false; S7.add(grid); grid.userData.win = [6.6, 7.6];
  const waves = []; const wcols = [0xff3040, 0xff9a20, 0xffe040, 0x40ff70, 0x30b0ff, 0x8a50ff];
  wcols.forEach((c, i) => { const lam = 7 - i * 0.6; const n = 700; const pos = new Float32Array(n * 3); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ln = new THREE.Points(geo, new THREE.PointsMaterial({ map: soft, color: c, size: 0.32, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); ln.frustumCulled = false; S7.add(ln);
    waves.push({ ln, pos, lam, z: -3.5 + i * 1.1, y: 1.6 + (i % 3) * 0.9, amp: 0.9 + (i % 2) * 0.4, ph: i * 1.3 }); });
  const virusM = new THREE.MeshStandardMaterial({ color: 0x7fffd0, emissive: 0x20c090, emissiveIntensity: 0.8, wireframe: true });
  const viruses = []; for (let i = 0; i < 9; i++) { const v = new THREE.Group(); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), virusM); v.add(core);
    for (let k = 0; k < 14; k++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4), virusM); const d = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(); sp.position.copy(d.clone().multiplyScalar(0.58)); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); v.add(sp); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), virusM); tip.position.copy(d.clone().multiplyScalar(0.72)); v.add(tip); }
    const a = R() * 6.28, r = 2.5 + R() * 8; v.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r - 1, y: 0.8 + R() * 3, ph: R() * 6 }; S7.add(v); viruses.push(v); }
  // ================= SET 8: DNA double helix (hero = 1.8 nm) =================
  const S8 = mkSet(9, 7.9, 9.6);
  const dna = new THREE.Group(); { const NB = 360, pitch = 3.4, rr = 1.0; const bbG = new THREE.SphereGeometry(0.16, 10, 8);
    const bbA = new THREE.InstancedMesh(bbG, new THREE.MeshStandardMaterial({ color: 0x9ad8ff, emissive: 0x2a7ac0, emissiveIntensity: 0.35, roughness: 0.3 }), NB);
    const bbB = new THREE.InstancedMesh(bbG, new THREE.MeshStandardMaterial({ color: 0xffa8e0, emissive: 0xc02a8a, emissiveIntensity: 0.35, roughness: 0.3 }), NB);
    const rung = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), new THREE.MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.12, emissive: 0xffffff }), NB);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color(); const bp = [0xff5a5a, 0xffd23f, 0x4ad07a, 0x4a8aff];
    for (let i = 0; i < NB; i++) { const x = (i - NB / 2) * 0.34, a = x / pitch * 6.283; const y1 = Math.cos(a) * rr, z1 = Math.sin(a) * rr, y2 = Math.cos(a + 2.4) * rr, z2 = Math.sin(a + 2.4) * rr;
      m4.makeTranslation(x, y1, z1); bbA.setMatrixAt(i, m4); m4.makeTranslation(x, y2, z2); bbB.setMatrixAt(i, m4);
      const p1 = new THREE.Vector3(x, y1, z1), p2 = new THREE.Vector3(x, y2, z2); const mid = p1.clone().add(p2).multiplyScalar(0.5); const d = p2.clone().sub(p1); q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      m4.compose(mid, q, s.set(1, d.length(), 1)); rung.setMatrixAt(i, m4); c.set(bp[Math.floor((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 4)]); rung.setColorAt(i, c); }
    dna.add(bbA, bbB, rung); dna.userData.rung = rung; }
  dna.position.set(0, 1.0, -1.9); S8.add(dna);
  const dna2 = dna.clone(); dna2.position.set(-6, 3, -14); dna2.rotation.set(0.4, 0.9, 0.2); S8.add(dna2);
  // ================= SET 9: a single atom (hero = 0.18 nm) =================
  const S9 = mkSet(10, 9.3, 11.5);
  const mkAtom = (rad, col, n, seed) => { const g = new THREE.Group(); const RR = rng(seed); const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = RR() * 2 - 1, th = RR() * 6.283, s = Math.sqrt(1 - u * u); const r = rad * Math.pow(RR(), 0.5) * (0.6 + 0.4 * RR()); pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const cloud = new THREE.Points(geo, new THREE.PointsMaterial({ map: soft, color: col, size: 0.08 * rad, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(cloud);
    const nuc = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xfff2c0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); nuc.scale.setScalar(rad * 0.22); g.add(nuc);
    const core = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); g.add(core);
    const orbs = []; for (let k = 0; k < 3; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rad * 0.85, rad * 0.012, 6, 80), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.set(k * 1.05, k * 0.7, 0); g.add(ring);
      const el = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xaef0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); el.scale.setScalar(rad * 0.18); ring.add(el); orbs.push(el); }
    g.userData = { cloud, orbs, rad }; return g; };
  const atom = mkAtom(1.1, 0x4ab8ff, 2600, 3); atom.position.set(1.15, 1.25, -0.5); S9.add(atom);
  const atoms = [atom]; for (let i = 0; i < 10; i++) { const a = mkAtom(0.8 + R() * 0.6, [0x4ab8ff, 0xff6ab0, 0x7aff9a, 0xffc04a][i % 4], 900, 20 + i); const an = R() * 6.28, r = 7 + R() * 9; a.position.set(Math.cos(an) * r - 2, (R() - 0.3) * 6, -Math.abs(Math.sin(an) * r) - 4); S9.add(a); atoms.push(a); }
  // ================= hero (constant 1.8 units at the origin) =================
  const hero = makePerson(THREE, { shirt: 0xf2b632, pants: 0x2d3e63, hair: 0x1c1410, skin: 0xc98f66, seed: 4 }); A.add(hero.group);
  const heroMats = []; hero.group.traverse(o => { if (o.isMesh && o.material.emissive) { o.material = o.material.clone(); heroMats.push(o.material); } });
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 12, Math.PI), heroMats.find(m => m.color.getHex() === 0xf2b632)); hood.position.set(0, -0.02, -0.1); hood.rotation.x = Math.PI / 2 + 0.3; hero.headPivot.add(hood);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0x4ad0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(0, 1.0, 0); halo.scale.set(2.6, 3.4, 1); A.add(halo);
  // ---------- shrink ripple at each step (expanding scale ring) ----------
  const rip = STEPS.map(([t0], i) => { const w = makeShockwave(THREE, { seed: 90 + i, n: 300, size: 0.22, sizeR: 2, opacity: 0.28, color: 0x6fe0ff, dustColor: 0xbff4ff, ringColor: 0x7fe8ff }); A.add(w); return { w, t0 }; });
  // floating motes around the camera (always subtle)
  const NM = 260, motePos = new Float32Array(NM * 3), moteSeed = []; for (let i = 0; i < NM; i++) moteSeed.push([R() * 12 - 6, R() * 5, R() * 12 - 6, R() * 6.28]);
  const moteG = new THREE.BufferGeometry(); moteG.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteG, new THREE.PointsMaterial({ map: soft, color: 0xffe6b0, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); motes.frustumCulled = false; A.add(motes);
  const sparkle = makeBurst(THREE, 160, { origin: () => [0, 1.0, 0], dir: (r) => { const a = r() * 6.283, b = r() * 2 - 1; return [Math.cos(a) * Math.sqrt(1 - b * b), b, Math.sin(a) * Math.sqrt(1 - b * b)]; }, speed: [1, 3], life: [0.3, 0.8], size: 7, color: 0xbff4ff, additive: true, seed: 5, drag: 3 }); A.add(sparkle);

  // per-level look (index = level 0..9)
  const LOOK = [
    { bg: 0x2a1d16, fog: 0.018, hemi: [0xffe2c0, 0x3a2a22, 1.0], key: [0xffb070, 2.4], exp: 1.0 },
    { bg: 0x2a1d16, fog: 0.004, hemi: [0xffe2c0, 0x3a2a22, 1.0], key: [0xffb070, 2.4], exp: 1.0 },
    { bg: 0x2a0f12, fog: 0.07, hemi: [0xffd0b0, 0x40141a, 0.9], key: [0xffb070, 2.6], exp: 1.05 },
    { bg: 0x2a1a16, fog: 0.04, hemi: [0xffd8b8, 0x3a2420, 0.9], key: [0xffc090, 2.2], exp: 1.05 },
    { bg: 0x51463c, fog: 0.045, hemi: [0xfff0d8, 0x4a3a30, 1.1], key: [0xffd0a0, 1.8], exp: 1.05 },
    { bg: 0x6a4a44, fog: 0.035, hemi: [0xffe8e0, 0x6a3a34, 1.1], key: [0xffe0c8, 1.8], exp: 1.05 },
    { bg: 0x16393a, fog: 0.05, hemi: [0xcff8ff, 0x4a2a2a, 1.1], key: [0xfff0e0, 1.6], exp: 1.1 },
    { bg: 0x050a24, fog: 0.03, hemi: [0x7fcfff, 0x0a1030, 0.7], key: [0x9fe0ff, 0.8], exp: 1.15 },
    { bg: 0x060a20, fog: 0.026, hemi: [0x8fc8ff, 0x0a0c28, 0.7], key: [0xb0dcff, 0.8], exp: 1.15 },
    { bg: 0x050718, fog: 0.022, hemi: [0x9fb8ff, 0x100820, 0.7], key: [0xc0d8ff, 0.8], exp: 1.15 },
    { bg: 0x02030c, fog: 0.02, hemi: [0x8fb0ff, 0x050510, 0.6], key: [0xa0c8ff, 0.6], exp: 1.2 },
  ];
  const cA = new THREE.Color(), cB = new THREE.Color(); const lc = (a, b, u) => cA.set(a).lerp(cB.set(b), u).clone();
  function look(z) { const i = clamp(Math.floor(z), 0, 9), u = clamp(z - i), a = LOOK[i], b = LOOK[i + 1];
    return { bg: lc(a.bg, b.bg, u), fog: lerp(a.fog, b.fog, u), hs: lc(a.hemi[0], b.hemi[0], u), hg: lc(a.hemi[1], b.hemi[1], u), hi: lerp(a.hemi[2], b.hemi[2], u), kc: lc(a.key[0], b.key[0], u), ki: lerp(a.key[1], b.key[1], u), exp: lerp(a.exp, b.exp, u) }; }

  const tv = new THREE.Vector3(), hv = new THREE.Vector3();
  let lastZ = 0;
  function update(t_) {
    const cold = t_ < COLD; const t = cold ? 33.2 + t_ * 1.2 : t_; // cold open = the atom ending (and the loop target)
    const z = zAt(t); lastZ = z; const out = { scene: A, camera: cam, bloom: 0.55, bloomThreshold: 0.82, bloomRadius: 0.4, shake: 0, flash: 0, z, cold };
    for (const S of sets) { const k = S.userData.k; const s = Math.pow(10, z - k); S.scale.setScalar(s); S.visible = z > S.userData.z0 && z < S.userData.z1;
      S.children.forEach(o => { if (o.userData.win) o.visible = z > o.userData.win[0] && z < o.userData.win[1]; }); }
    const L = look(z); A.background.copy(L.bg); A.fog.color.copy(L.bg); hemi.color.copy(L.hs); hemi.groundColor.copy(L.hg); hemi.intensity = L.hi; key.color.copy(L.kc); key.intensity = L.ki; out.exposure = L.exp;
    const xray = smooth(6.45, 7.1, z); out.bloom = 0.5 + xray * 0.3; out.bloomThreshold = lerp(0.85, 0.72, xray);
    heroMats.forEach(m => { m.emissive.setRGB(0.15 * xray, 0.55 * xray, 0.9 * xray); m.emissiveIntensity = 0.35 * xray; });
    halo.material.opacity = xray * 0.28 + pulse(t, B.l8, 1.2) * 0.3;
    motes.material.color.set(z > 6.5 ? 0x9fe8ff : z > 5.5 ? 0xd8ffe8 : 0xffe6b0);
    for (let i = 0; i < NM; i++) { const [x, y, zz, ph] = moteSeed[i]; motePos.set([x + Math.sin(t * 0.3 + ph) * 0.4, y + Math.sin(t * 0.21 + ph * 2) * 0.3 + (t * 0.05) % 1 * 0.2, zz + Math.cos(t * 0.27 + ph) * 0.4], i * 3); } moteG.attributes.position.needsUpdate = true;
    // shrink moments: ripple, sparkle, flash, shake
    rip.forEach(({ w, t0 }) => { const age = t - t0 + 0.1; w.position.set(0, 0.02, 0); w.userData.set(0.3 + easeOut(clamp(age / 1.0)) * 7, age >= 0 ? age / 1.1 : -1, 1.2); });
    let lastStep = -9; for (const [tb] of STEPS) if (t >= tb - 0.2) lastStep = tb; sparkle.userData.update(t, lastStep - 0.05);
    STEPS.forEach(([tb], i) => { out.flash = Math.max(out.flash, pulse(t, tb + 0.15, 0.3) * 0.22); out.shake = Math.max(out.shake, pulse(t, tb, 0.5) * 0.25); });
    const shrinking = STEPS.some(([tb]) => t > tb - 0.12 && t < tb + 0.63); out.shrinking = shrinking;
    // ---------- set animation ----------
    // Mittens: naps, notices you, leans in to sniff (giant), boops
    { const C = cat; C.rotation.set(0, 0, 0); catHead.rotation.set(0, 0, 0);
      if (t < B.l1) { C.position.set(-1.2, 0, 0.9); C.rotation.y = 1.9 + Math.sin(t * 0.8) * 0.1; }
      else { const u = smooth(B.l1 + 0.3, B.l1 + 1.6, t); C.position.set(lerp(-1.2, -0.42, u), 0, lerp(0.9, 0.38, u)); C.rotation.y = lerp(1.9, 2.25, u); const sniff = Math.sin(t * 14) * 0.006 * smooth(B.l1 + 1.4, B.l1 + 1.8, t); C.position.y = 0; catNose.scale.setScalar(1 + Math.abs(sniff) * 60); catHead.rotation.x = 0.25 * u; }
      whisk.rotation.y = Math.sin(t * 9) * 0.05; }
    // fibers sway
    if (S2.visible) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler(); for (let i = 0; i < 700; i++) { const f = fdat[i]; m4.compose(v.set(f.x, 0, f.z), q.setFromEuler(e.set(f.lean[0] + Math.sin(t * 1.3 + f.ph) * 0.04, f.ph, f.lean[1] + Math.cos(t * 1.1 + f.ph) * 0.04)), s.set(1, f.h, 1)); fibers.setMatrixAt(i, m4); } fibers.instanceMatrix.needsUpdate = true; }
    // dust mite walks in from the left and stops to stare
    { const u = smooth(B.l3 + 0.2, B.l3 + 2.0, t); mite.position.set(lerp(-9, -2.3, u), 0, lerp(-3.5, -1.4, u)); mite.rotation.y = lerp(1.25, 0.95, u) + Math.sin(t * 0.7) * 0.04;
      if (t > B.l4) { const w = smooth(B.l4 + 0.4, B.l4 + 3.5, t); mite.position.set(lerp(-2.3, -3.6, w), 0, lerp(-1.4, 2.4, w)); mite.rotation.y = lerp(0.95, 0.2, w); }
      const walking = (u > 0 && u < 1) || (t > B.l4 + 0.4 && t < B.l4 + 3.5); mite.userData.legs.forEach(([lg, s, j]) => { const ph = t * 9 + j * 1.6 + (s > 0 ? 3.14 : 0); lg.rotation.set(0, walking ? Math.sin(ph) * 0.35 : 0, walking ? Math.max(0, Math.cos(ph)) * 0.25 * s : 0); });
      mite.position.y = walking ? Math.abs(Math.sin(t * 9)) * 0.04 : 0; mite.userData.pupils.forEach((p, i) => { p.scale.setScalar(t > B.l3 + 2.4 && t < B.l4 ? 0.7 : 1); }); }
    // bacteria drift, flagella wiggle; buddy swims up and snuggles
    if (S6.visible) { bacts.forEach((b, i) => { const d = b.userData; b.position.set(d.x + Math.sin(t * d.sp + d.ph) * 1.2, d.y + Math.sin(t * 0.8 + d.ph) * 0.2, d.z + Math.cos(t * d.sp * 0.8 + d.ph) * 1.0); b.rotation.set(Math.sin(t * 0.5 + d.ph) * 0.3, t * d.sp + d.ph, Math.sin(t * 0.6 + d.ph) * 0.2);
        (d.fl || []).forEach((ln, k) => { const p = ln.geometry.attributes.position; for (let j = 0; j < p.count; j++) p.setY(j, Math.sin(j * 0.9 - t * 12 + k) * 0.1 * (j / p.count) * 1.5); p.needsUpdate = true; }); });
      const u = smooth(B.l5 + 0.3, B.l5 + 1.9, t); const hug = smooth(B.l5 + 1.9, B.l5 + 2.3, t); buddy.scale.setScalar(0.72); buddy.position.set(lerp(5.5, 1.0 - hug * 0.25, u), lerp(2.2, 1.5, u) + Math.sin(t * 3) * 0.06 * (1 - hug), lerp(-3, 0.05, u)); buddy.rotation.set(0, lerp(2.4, Math.PI + 0.9, u), Math.sin(t * 4) * 0.08 + hug * 0.25);
      buddy.userData.eyes.forEach(e => e.scale.set(1, t > B.l5 + 1.9 ? 0.35 : 1, 1));
      buddy.userData.fl.forEach((ln, k) => { const p = ln.geometry.attributes.position; for (let j = 0; j < p.count; j++) p.setY(j, Math.sin(j * 0.8 - t * 16 + k) * 0.12 * (j / p.count) * 1.6); p.needsUpdate = true; }); }
    // light waves roll past; viruses tumble
    if (S7.visible) { waves.forEach(w => { const n = w.pos.length / 3; for (let j = 0; j < n; j++) { const x = -18 + j * 36 / n; const k = 6.283 / w.lam; w.pos.set([x, w.y + Math.sin(k * x - t * 6 + w.ph) * w.amp, w.z], j * 3); } w.ln.geometry.attributes.position.needsUpdate = true; });
      viruses.forEach(v => { const d = v.userData; v.position.set(d.x + Math.sin(t * 0.4 + d.ph) * 0.6, d.y + Math.sin(t * 0.7 + d.ph) * 0.3, d.z); v.rotation.set(t * 0.5 + d.ph, t * 0.3, 0); }); }
    if (S8.visible) { dna.rotation.x = t * 0.25; dna2.rotation.x = 0.4 + t * 0.2; }
    if (S9.visible) atoms.forEach((a, i) => { a.userData.orbs.forEach((el, k) => { const an = t * (2.2 + k * 0.7) + k * 2 + i; el.position.set(Math.cos(an) * a.userData.rad * 0.85, Math.sin(an) * a.userData.rad * 0.85, 0); }); a.userData.cloud.rotation.y = t * 0.3 + i; const br = 1 + Math.sin(t * 3 + i) * 0.04; a.userData.cloud.scale.setScalar(br); });
    // ---------- hero pose + face ----------
    const P = hero; P.group.position.set(0, 0, 0); P.group.rotation.set(0, 0, 0); P.headPivot.rotation.set(0, 0, 0);
    P.armR.rotation.set(0, 0, 0.12); P.armL.rotation.set(0, 0, -0.12); P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0); P.group.scale.set(1, 1, 1);
    const floating = z > 7.4;
    let f = { brows: 'neutral', eyes: 1, mouth: 'smile' };
    if (t < B.l1) { f = { brows: 'up', eyes: 1.1, mouth: 'smile', look: [0.4, 0] }; P.group.rotation.y = 0.2; }
    if (t > B.h2 + 0.9 && t < B.l1) { f = { brows: 'worried', eyes: 1.3, mouth: 'o', look: [0, -1] }; P.headPivot.rotation.x = 0.35; P.armL.rotation.set(-0.9, 0, 0.2); P.armR.rotation.set(-0.9, 0, -0.2); }
    if (t > B.l1) { const u = smooth(B.l1 + 0.8, B.l1 + 1.3, t); f = { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.5, look: [-1, 0.5] }; P.group.rotation.y = lerp(0, -0.7, u); P.headPivot.rotation.x = -0.35 * u; P.armL.rotation.set(-0.3, 0, -1.2 * u); P.armR.rotation.set(-0.3, 0, 1.2 * u); }
    if (t > B.l1 + 2.2 && t < B.l2) { f = { brows: 'worried', eyes: 1.4, mouth: 'grit', look: [-1, 0.6] }; P.group.position.x = smooth(B.l1 + 2.2, B.l2, t) * 0.4; }
    if (t > B.l2) { f = { brows: 'up', eyes: 1.25, mouth: 'o', look: [0.5, 0.6] }; P.group.rotation.y = 0.5 + Math.sin(t * 0.8) * 0.4; P.headPivot.rotation.x = -0.25; }
    if (t > B.l3) { f = { brows: 'worried', eyes: 1.5, mouth: 'flat', look: [-1, 0.2] }; P.group.rotation.y = -0.6; P.armL.rotation.set(-0.5, 0, -0.3); P.armR.rotation.set(-0.5, 0, 0.3); P.headPivot.rotation.y = -0.3; }
    if (t > B.l3 + 2.4 && t < B.l4) { f = { brows: 'worried', eyes: 1.65, mouth: 'grit', look: [-1, 0.3] }; P.group.position.x = 0.15 * smooth(B.l3 + 2.4, B.l3 + 2.7, t); P.group.rotation.z = -0.06; }
    if (t > B.l4) { const u = smooth(B.l4 + 0.6, B.l4 + 1.2, t); f = { brows: 'squint', eyes: 0.8, mouth: 'grit', look: [0, -1] }; P.headPivot.rotation.x = 0.45 * u; P.armR.rotation.set(-0.6 * u, 0, 0.3); P.armL.rotation.set(-0.2, 0, -0.9 * u); }
    if (t > B.l4 + 2.0 && t < B.l5) { f = { brows: 'angry', eyes: 0.7, mouth: 'grit', look: [0.6, -0.5] }; P.armL.rotation.set(-1.6, 0, -0.2); P.headPivot.rotation.y = 0.5; }
    if (t > B.l5) { f = { brows: 'up', eyes: 1.3, mouth: 'o', look: [1, 0.3] }; P.group.rotation.y = 0.6; }
    if (t > B.l5 + 1.9 && t < B.l6) { f = { brows: 'worried', eyes: 1.0, mouth: 'grit', look: [1, 0] }; P.group.rotation.y = 0.4; P.armR.rotation.set(-1.2, 0, 0.4); P.armL.rotation.set(-0.4, 0, -0.5); P.group.rotation.z = 0.12; }
    if (t > B.l6) { f = { brows: 'up', eyes: 1.5, mouth: 'open', open: 1.2, look: [0, 1] }; P.headPivot.rotation.x = -0.4; P.armL.rotation.set(-0.2, 0, -0.6); P.armR.rotation.set(-2.2 + Math.sin(t * 2) * 0.2, 0, 0.3); }
    if (floating) { const fl = t - B.l7; P.group.position.y = 0.25 + Math.sin(t * 1.4) * 0.08; P.group.rotation.z = Math.sin(t * 0.9) * 0.08; P.legL.rotation.set(0.25 + Math.sin(t * 2) * 0.15, 0, -0.12); P.legR.rotation.set(-0.2 - Math.sin(t * 2) * 0.15, 0, 0.12);
      if (t > B.l7 && t < B.l8) { f = { brows: 'up', eyes: 1.3, mouth: 'smile', look: [0.3, 0.3] }; P.group.rotation.y = 0.35; P.armR.rotation.set(-2.5, 0, 0.1); P.armL.rotation.set(-0.3, 0, -0.9); }
      if (t > B.l8) { f = { brows: 'up', eyes: 1.6, mouth: 'open', open: 1.4, look: [1, 0.2] }; P.group.rotation.y = -0.3; P.armL.rotation.set(-0.3, 0, -1.4); P.armR.rotation.set(-0.3, 0, 1.4); }
      if (t > B.close) { f = { brows: 'up', eyes: 1.0, mouth: 'smile', look: [0, 0] }; P.group.rotation.y = 0.1; P.armR.rotation.set(0, 0, 2.6 + Math.sin(t * 9) * 0.25); P.armL.rotation.set(-0.2, 0, -0.5); } }
    if (shrinking) { const sq = STEPS.reduce((m, [tb]) => Math.max(m, Math.sin(clamp((t - tb + 0.12) / 0.75) * Math.PI)), 0); P.group.scale.set(1 + sq * 0.12, 1 - sq * 0.14, 1 + sq * 0.12); f = { brows: 'up', eyes: 0.15, mouth: 'grit' }; P.armL.rotation.set(-0.2, 0, 0.5 * sq); P.armR.rotation.set(-0.2, 0, -0.5 * sq); }
    setFace(P, f); life(P, t, 1);
    const pov = !cold && t > COLD && t < B.h2 - 0.05; P.headPivot.visible = !pov;
    if (pov) { P.armR.rotation.set(-1.3, 0, -0.35); P.armL.rotation.set(-1.25, 0, 0.35); P.group.rotation.y = 0; }
    // ---------- cameras (a new shot / big move every ~2 s) ----------
    let c, g, fov = 50; const seg = (a, b) => clamp((t - a) / (b - a));
    if (cold) { const u = t_ / COLD; c = [lerp(2.6, 2.3, u), lerp(1.7, 1.6, u), lerp(3.6, 3.3, u)]; g = [0.5, 1.1, -0.2]; fov = 50; }
    else if (t < B.h2 - 0.05) { const u = seg(COLD, B.h2); c = [0, 1.72, 0.12]; g = [0, lerp(0.9, 0.6, u), lerp(1.2, 1.0, u)]; fov = 70; }
    else if (t < 3.0) { const u = easeInOut(seg(B.h2, 3.0)); c = [lerp(3.2, 2.6, u), lerp(1.9, 1.5, u), lerp(4.8, 4.0, u)]; g = [-0.4, 0.8, -0.2]; fov = 52; }
    else if (t < B.l1) { const u = seg(3.0, B.l1); c = [lerp(0.9, 0.7, u), lerp(1.1, 1.0, u), lerp(2.7, 2.3, u)]; g = [0, 1.0, 0]; fov = 52; }
    else if (t < 5.9) { const u = easeInOut(seg(B.l1, 5.9)); c = [lerp(1.4, 2.4, u), lerp(1.0, 0.6, u), lerp(1.2, 0.4, u)]; g = [lerp(-0.3, -2.6, u), lerp(1.0, 2.0, u), lerp(0.2, 2.4, u)]; fov = 60; }
    else if (t < B.l2) { const u = seg(5.9, B.l2); c = [lerp(2.2, 2.6, u), 1.3, lerp(-0.6, -0.9, u)]; g = [-1.0, 1.4, 0.6]; fov = 55; }
    else if (t < 9.2) { const u = seg(B.l2, 9.2); c = [lerp(-0.9, -0.5, u), lerp(0.5, 0.7, u), lerp(5.5, 3.4, u)]; g = [0, 1.0, 0]; fov = 55; }
    else if (t < B.l3) { const u = easeInOut(seg(9.2, B.l3)); c = [lerp(1.4, 3.5, u), lerp(2.6, 6.5, u), lerp(2.6, 5.5, u)]; g = [0, 0.8, 0]; fov = 55; }
    else if (t < 12.3) { const u = seg(B.l3, 12.3); c = [lerp(3.0, 2.6, u), lerp(1.1, 1.3, u), lerp(4.6, 4.2, u)]; g = [-1.4, 1.0, -0.6]; fov = 55; }
    else if (t < B.l4) { const u = seg(12.3, B.l4); c = [lerp(1.4, 1.2, u), 1.6, lerp(1.6, 1.4, u)]; g = [-1.4, 1.2, -0.7]; fov = 48; }
    else if (t < 16.3) { const u = easeInOut(seg(B.l4, 16.3)); const a = lerp(0.9, 0.1, u); c = [Math.sin(a) * 4.2, lerp(1.6, 2.6, u), Math.cos(a) * 4.2]; g = [0, 0.7, 0]; fov = 54; }
    else if (t < B.l5) { const u = seg(16.3, B.l5); c = [lerp(-1.6, -2.6, u), lerp(0.7, 1.0, u), lerp(5.6, 6.4, u)]; g = [0.4, 2.4, -3]; fov = 62; }
    else if (t < 20.1) { const u = easeInOut(seg(B.l5, 20.1)); c = [lerp(-2.8, -2.0, u), lerp(1.8, 1.3, u), lerp(4.4, 3.4, u)]; g = [1.0, 1.1, -0.4]; fov = 55; }
    else if (t < B.l6) { const u = seg(20.1, B.l6); c = [lerp(-1.1, -0.8, u), 1.45, lerp(3.2, 2.8, u)]; g = [0.5, 1.15, -0.2]; fov = 52; }
    else if (t < 23.7) { const u = easeInOut(seg(B.l6, 23.7)); c = [lerp(-4.2, -3.2, u), lerp(0.6, 1.0, u), lerp(5.5, 6.5, u)]; g = [0, 1.8, -1]; fov = 60; }
    else if (t < B.l7) { const u = seg(23.7, B.l7); c = [lerp(0.9, 1.0, u), lerp(1.2, 1.1, u), lerp(2.7, 2.4, u)]; g = [0, 1.55, 0]; fov = 52; }
    else if (t < 26.7) { const u = easeInOut(seg(B.l7, 26.7)); c = [lerp(-3.5, 2.5, u), lerp(2.0, 1.6, u), lerp(3.5, 4.2, u)]; g = [0, 1.1, -1.2]; fov = 58; }
    else if (t < B.l8) { const u = seg(26.7, B.l8); c = [lerp(1.5, 1.3, u), 1.7, lerp(1.9, 1.6, u)]; g = [-0.1, 1.4, -0.6]; fov = 52; }
    else if (t < 29.9) { const u = easeInOut(seg(B.l8, 29.9)); c = [lerp(-1.2, 0.2, u), lerp(1.5, 1.4, u), lerp(2.6, 3.4, u)]; g = [0.6, 1.2, -0.3]; fov = 55; }
    else if (t < B.close) { const u = easeInOut(seg(29.9, B.close)); const a = lerp(-0.6, 0.9, u); c = [0.5 + Math.sin(a) * 4.5, lerp(2.6, 1.9, u), -0.2 + Math.cos(a) * 4.5]; g = [0.5, 1.1, -0.2]; fov = 50; }
    else { const u = easeInOut(seg(B.close, TOTAL)); c = [lerp(1.4, 2.6, u), lerp(1.5, 1.7, u), lerp(2.6, 3.6, u)]; g = [lerp(0.2, 0.5, u), 1.1, -0.2]; fov = 50; }
    if (shrinking) fov *= 1 + STEPS.reduce((m, [tb]) => Math.max(m, Math.sin(clamp((t - tb + 0.12) / 0.75) * Math.PI)), 0) * 0.18;
    cam.position.set(...c); cam.lookAt(...g); cam.fov = fov; cam.updateProjectionMatrix();
    A.fog.density = L.fog;
    tv.set(...g); key.target.position.copy(tv); key.position.copy(tv).add(new THREE.Vector3(6, 9, -5)); rim.target.position.copy(tv); rim.position.copy(tv).add(new THREE.Vector3(-6, 4, 6));
    const sc_ = key.shadow.camera; sc_.left = -8; sc_.right = 8; sc_.top = 8; sc_.bottom = -8; sc_.near = 0.5; sc_.far = 40; sc_.updateProjectionMatrix(); key.shadow.bias = -0.0005;
    return out;
  }
  // ---------- HUD ----------
  const NOTES = [[0, 'normal you', 'HUMAN'], [0.5, 'smaller than a toddler', 'HUMAN'], [0.95, 'pencil-sized', 'TOY'], [1.9, 'smaller than a paperclip', 'BUG'], [2.9, 'flea-sized', 'FLEA'], [3.9, 'smaller than a dust mite', 'SPECK'], [4.9, 'half a skin flake', 'CELL'],
    [5.9, 'bacteria-sized', 'MICROBE'], [6.9, 'shorter than light waves', 'NANO'], [7.9, 'smaller than a virus', 'VIRUS'], [8.9, 'as wide as DNA', 'MOLECULE'], [9.9, 'one atom', 'ATOM']];
  const PLACE = [[0, 'LIVING ROOM'], [1.5, 'THE RUG'], [3.4, 'A DUST BUNNY'], [4.5, 'A FLAKE OF YOUR SKIN'], [5.6, 'SKIN SURFACE'], [6.5, 'NANO-WORLD'], [8.2, 'INSIDE A SKIN CELL'], [9.5, 'ONE CARBON ATOM']];
  const caps = [[B.l1 + 1.5, 'MITTENS?!', 1.5], [B.l2 + 1.0, 'CARPET JUNGLE', 1.5], [B.l3 + 2.6, "IT'S STARING", 1.4], [B.l4 + 1.4, 'YOUR DEAD SKIN', 1.6], [B.l5 + 2.0, 'NEW BEST FRIEND', 1.5], [B.l6 + 1.3, 'TOO SMALL FOR COLOR', 1.8], [B.l7 + 1.0, 'DNA', 1.3], [B.l8 + 1.6, 'ONE ATOM', 1.6]];
  const tprj = new THREE.Vector3();
  const prj = (x, y, z) => { tprj.set(x, y, z); cam.updateMatrixWorld(); tprj.project(cam); return tprj.z < 1 && Math.abs(tprj.x) < 0.98 && Math.abs(tprj.y) < 0.98 ? [(tprj.x * 0.5 + 0.5) * 1080, (1 - (tprj.y * 0.5 + 0.5)) * 1920] : null; };
  function hud(ctx, t_, st) { const W = 1080, H = 1920; const cold = st.cold; const t = cold ? 33.2 + t_ * 1.2 : t_; const z = cold ? lerp(7.6, st.z, easeOut(t_ / COLD)) : st.z;
    // speed lines while shrinking (rushing outward)
    if (st.shrinking) { ctx.save(); ctx.translate(W / 2, H * 0.55); const RR = rng(Math.floor(t * 20)); ctx.strokeStyle = 'rgba(200,245,255,0.35)'; ctx.lineWidth = 4; for (let i = 0; i < 40; i++) { const a = RR() * 6.283, r0 = 260 + RR() * 300, r1 = r0 + 120 + RR() * 260; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); } ctx.restore(); }
    if (cold) drawPunch(ctx, W, H, 'ATOM-SIZED.', t_, { dur: COLD, size: 150, color: '#8fe8ff', y: 0.62 });
    drawTitleTimed(ctx, W, H, [{ text: 'WHAT IF YOU NEVER', size: 86 }, { text: 'STOPPED SHRINKING?', size: 92, accent: true }], t_, '#5ad8ff', { start: 0.12, outAt: 3.8, wps: 8 });
    let bump = 0; STEPS.forEach(([tb]) => bump = Math.max(bump, pulse(t, tb + 0.5, 0.35)));
    let note = '', tier = ''; for (const [v, n, tr] of NOTES) if (z >= v) { note = n; tier = tr; } let where = ''; for (const [v, n] of PLACE) if (z >= v) where = n;
    const tiny = smooth(5, 9, z); const yC = cold ? H * 0.268 : lerp(H * 0.268, H * 0.105, smooth(3.8, 4.4, t_));
    drawSideCounter(ctx, W, H, { y: yC, label: `YOUR HEIGHT  ·  ${tier}`, value: fmtH(z), note, bump, color: tiny > 0.5 ? '#7ae8ff' : '#ffd23f', glow: `rgba(${Math.round(lerp(255, 80, tiny))},${Math.round(lerp(200, 220, tiny))},255,0.9)` });
    const mins = 12 + Math.floor(t / 12);
    ctx.save(); ctx.font = '800 26px "Inter Display", Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.fillText(`${where}  ·  4:${String(mins).padStart(2, '0')} PM`, 58, yC + 196); ctx.restore();
    // 10x ladder on the left edge: 10 pips, filled as you go
    ctx.save(); for (let i = 0; i <= 10; i++) { const y = yC + 250 + i * 32; const on = z >= i - 0.02; ctx.fillStyle = on ? (i >= 6 ? '#7ae8ff' : '#ffd23f') : 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(70, y, on && Math.abs(z - i) < 0.5 ? 11 : 7, 0, 7); ctx.fill(); } ctx.restore();
    if (cold) return;
    for (const [at, txt, dur] of caps) drawCaption(ctx, W, H, txt, t - at, { dur, color: txt === 'MITTENS?!' ? '#ffd23f' : '#ffffff', y: H * 0.69, size: 88 });
    hero.headPivot.getWorldPosition(hv); const hp = prj(hv.x, hv.y + 0.45, hv.z);
    const say = (p, at, txt, dur) => { if (p) drawBubble(ctx, p[0], p[1], txt, t - at, { dur }); };
    say(hp, B.h2 + 0.55, 'wait... huh?', 1.2);
    if (t > B.l1 && t < B.l2) { const cp = new THREE.Vector3(); catNose.getWorldPosition(cp); const q = prj(cp.x, cp.y + 0.9, cp.z); say(q, B.l1 + 0.9, 'mrrp?', 0.95); }
    say(hp, B.l1 + 2.3, 'MITTENS, NO!', 1.3);
    say(hp, B.l2 + 1.6, 'cool... jungle.', 1.2);
    if (t > B.l3 && t < B.l4) { const mp = new THREE.Vector3(); mite.getWorldPosition(mp); say(prj(mp.x, mp.y + 2.0 * S4.scale.x, mp.z), B.l3 + 2.3, '...hi.', 1.3); }
    say(hp, B.l3 + 3.0, 'nope.', 0.9);
    say(hp, B.l4 + 2.2, 'that was MINE?!', 1.6);
    if (t > B.l5 && t < B.l6) { const bp = new THREE.Vector3(); buddy.getWorldPosition(bp); say(prj(bp.x, bp.y + 0.5, bp.z), B.l5 + 1.7, 'BESTIE!!', 1.3); }
    say(hp, B.l5 + 2.7, 'personal space!', 1.0);
    say(hp, B.l6 + 2.2, 'whoa...', 1.0);
    say(hp, B.l8 + 2.3, 'am I... carbon?', 1.3);
    if (t > B.h2 && t < B.l1) { const cp = new THREE.Vector3(); cat.getWorldPosition(cp); const q = prj(cp.x, cp.y + 0.55 * S0.scale.x, cp.z); if (q) drawTag(ctx, q[0], q[1], 'MITTENS', t - (B.h2 + 0.1), { dur: 2.0 }); }
  }
  return { scene: A, camera: cam, update, hud, info: { TOTAL } };
}
