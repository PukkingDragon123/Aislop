// ============================================================================
//  Procedural low-poly furniture & decorations.
//  Everything is built from primitives so the game ships with zero art assets
//  yet still reads as a charming, colourful isometric office.
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { DESK_TIERS, STATION_BY_ID } from '../core/config.js';

// --- material / geometry caches (shared, big perf win with many workers) ----
const matCache = new Map();
export function mat(color, opts = {}) {
  const env = opts.env ?? 0.5; // soft image-based reflections from the sky
  const key = `${color}|${opts.rough ?? 0.7}|${opts.metal ?? 0}|${opts.emissive ?? 0}|${opts.ei ?? 0}|${opts.opacity ?? 1}|${env}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.7,
    metalness: opts.metal ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.ei ?? 1,
    transparent: (opts.opacity ?? 1) < 1,
    opacity: opts.opacity ?? 1,
  });
  m.envMapIntensity = env;
  matCache.set(key, m);
  return m;
}

export function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.castShadow = opts.noShadow ? false : true;
  m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 12), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function sphere(r, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, opts.detail ?? 1), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function at(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

// ---------------------------------------------------------------------------
//  Office chair (shared across desks; colour varies by tier).
// ---------------------------------------------------------------------------
function chair(color, accent) {
  const g = new THREE.Group();
  g.add(at(box(0.62, 0.12, 0.6, color, { rough: 0.6 }), 0, 0.5, 0));
  g.add(at(box(0.62, 0.7, 0.12, color, { rough: 0.6 }), 0, 0.85, -0.26));
  g.add(at(cyl(0.06, 0.06, 0.5, accent, { metal: 0.6, rough: 0.4 }), 0, 0.25, 0));
  const base = at(cyl(0.3, 0.3, 0.06, accent, { metal: 0.6, rough: 0.4, seg: 5 }), 0, 0.05, 0);
  g.add(base);
  return g;
}

function monitor(w, h, screenColor, ei = 0.6) {
  const g = new THREE.Group();
  g.add(at(box(w, h, 0.06, 0x222831), 0, h / 2, 0));
  const scr = at(box(w * 0.88, h * 0.8, 0.02, screenColor, { emissive: screenColor, ei }), 0, h / 2, 0.04);
  scr.castShadow = false;
  g.add(scr);
  g.add(at(cyl(0.05, 0.07, 0.18, 0x333333), 0, 0.09, -0.02)); // stand
  g.userData.screen = scr;
  return g;
}

// ---------------------------------------------------------------------------
//  Desks, one builder per tier. Returns a Group facing +Z (worker sits at -Z).
//  group.userData.screens collects emissive screens for flicker animation.
// ---------------------------------------------------------------------------
export function buildDesk(tierIndex) {
  const t = DESK_TIERS[tierIndex];
  const g = new THREE.Group();
  g.userData.screens = [];
  const accent = 0x3a3f44;

  if (tierIndex === 0) {
    // Folding desk + laptop.
    g.add(at(box(1.4, 0.07, 0.72, t.color, { rough: 0.85 }), 0, 0.72, 0));
    for (const dx of [-0.6, 0.6]) for (const dz of [-0.28, 0.28]) {
      const leg = at(box(0.06, 0.72, 0.06, 0x8a8a8a, { metal: 0.4 }), dx, 0.36, dz);
      g.add(leg);
    }
    const lidColor = 0xb8c0cc;
    const base = at(box(0.5, 0.04, 0.34, lidColor), 0, 0.78, 0.05);
    const lid = at(box(0.5, 0.34, 0.03, lidColor), 0, 0.95, -0.1);
    lid.rotation.x = -0.35;
    const scr = at(box(0.46, 0.3, 0.01, 0x6cc6ff, { emissive: 0x6cc6ff, ei: 0.5 }), 0, 0.95, -0.08);
    scr.rotation.x = -0.35; scr.castShadow = false;
    g.add(base); g.add(lid); g.add(scr);
    g.userData.screens.push(scr);
    g.add(at(chair(0x6b7785, accent), 0, 0, 0.7));
  } else if (tierIndex === 1) {
    // Dual-monitor workstation.
    g.add(at(box(1.7, 0.09, 0.85, t.color, { rough: 0.6 }), 0, 0.74, 0));
    for (const dx of [-0.75, 0.75]) {
      g.add(at(box(0.08, 0.74, 0.7, 0x6b7280, { metal: 0.3 }), dx, 0.37, 0));
    }
    for (const dx of [-0.42, 0.42]) {
      const mon = monitor(0.66, 0.42, 0x163b66, 0.7);
      at(mon, dx, 0.79, -0.18);
      g.add(mon); g.userData.screens.push(mon.userData.screen);
    }
    g.add(at(box(0.6, 0.03, 0.22, 0x2b2f36), 0, 0.8, 0.2)); // keyboard
    g.add(at(chair(0x394150, accent), 0, 0, 0.78));
  } else if (tierIndex === 2) {
    // Premium creator setup: RGB desk, big screen + mic.
    const top = at(box(1.9, 0.1, 0.95, t.color, { rough: 0.35, metal: 0.1 }), 0, 0.76, 0);
    g.add(top);
    g.add(at(box(1.94, 0.04, 0.99, t.glow, { emissive: t.glow, ei: 0.8, noShadow: true }), 0, 0.7, 0)); // RGB underglow
    g.add(at(box(0.12, 0.76, 0.9, 0x4a3f6b, { metal: 0.2 }), -0.85, 0.38, 0));
    g.add(at(box(0.12, 0.76, 0.9, 0x4a3f6b, { metal: 0.2 }), 0.85, 0.38, 0));
    const mon = monitor(1.1, 0.6, 0x2a1c4a, 0.9);
    at(mon, 0, 0.82, -0.22); g.add(mon); g.userData.screens.push(mon.userData.screen);
    // Mic boom.
    const boom = at(cyl(0.03, 0.03, 0.7, 0x222222, { metal: 0.6 }), 0.7, 1.1, 0.1);
    boom.rotation.z = 0.6; g.add(boom);
    g.add(at(sphere(0.1, 0x111111, { detail: 1 }), 0.5, 1.25, 0.18));
    g.add(at(chair(0x5a3f7a, 0x2a1c4a), 0, 0, 0.85));
  } else if (tierIndex === 3) {
    // Futuristic AI workstation: floating glowing panels.
    g.add(at(box(2.0, 0.08, 1.0, t.color, { rough: 0.2, metal: 0.5 }), 0, 0.78, 0));
    g.add(at(cyl(0.5, 0.6, 0.1, t.glow, { emissive: t.glow, ei: 1.1, noShadow: true }), 0, 0.1, 0));
    g.add(at(box(0.2, 0.7, 0.4, 0x2a4a55, { metal: 0.6 }), 0, 0.4, 0.1));
    for (const dx of [-0.55, 0, 0.55]) {
      const scr = at(box(0.5, 0.45, 0.03, t.glow, { emissive: t.glow, ei: 1.0 }), dx, 1.05, -0.2);
      scr.rotation.y = -dx * 0.4; scr.castShadow = false;
      g.add(scr); g.userData.screens.push(scr);
    }
    g.add(at(chair(0x2a6675, t.glow), 0, 0, 0.9));
  } else {
    // Holographic office: desk made of light.
    const holo = at(box(2.1, 0.06, 1.1, t.glow, { emissive: t.glow, ei: 1.2, opacity: 0.55, noShadow: true }), 0, 0.8, 0);
    g.add(holo);
    const ped = at(cyl(0.35, 0.45, 0.8, 0xeaffff, { emissive: t.glow, ei: 0.4, opacity: 0.5 }), 0, 0.4, 0);
    g.add(ped);
    for (const dx of [-0.7, 0, 0.7]) {
      const scr = at(box(0.6, 0.7, 0.02, t.glow, { emissive: t.glow, ei: 1.3, opacity: 0.8, noShadow: true }), dx, 1.3, -0.15);
      scr.rotation.y = -dx * 0.45; scr.castShadow = false;
      g.add(scr); g.userData.screens.push(scr);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 24), mat(t.glow, { emissive: t.glow, ei: 1.4, opacity: 0.9 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; ring.castShadow = false;
    g.userData.spin = ring; g.add(ring);
  }

  return g;
}

// ---------------------------------------------------------------------------
//  Decorations.
// ---------------------------------------------------------------------------
export function buildDecoration(id) {
  const g = new THREE.Group();
  switch (id) {
    case 'plant': {
      g.add(at(cyl(0.22, 0.28, 0.35, 0xcf7b53, { rough: 0.8 }), 0, 0.17, 0));
      const f = at(sphere(0.42, 0x4caf6e, { detail: 1 }), 0, 0.72, 0); f.scale.y = 1.3; g.add(f);
      g.add(at(sphere(0.26, 0x5fbf7e), -0.18, 0.55, 0.1));
      break;
    }
    case 'poster': {
      g.add(at(box(0.06, 1.5, 0.06, 0x6b5a45), 0, 0.75, 0)); // easel pole
      const f = at(box(0.9, 1.1, 0.08, 0xffffff), 0, 1.1, 0);
      g.add(f);
      g.add(at(box(0.78, 0.95, 0.02, 0xff7aa8, { emissive: 0xff7aa8, ei: 0.25 }), 0, 1.1, 0.05));
      break;
    }
    case 'coffee': {
      g.add(at(box(0.7, 0.5, 0.6, 0xe8e8ee, { rough: 0.4 }), 0, 0.55, 0)); // counter unit
      g.add(at(box(0.6, 0.55, 0.5, 0x3a3f44, { metal: 0.3 }), 0, 1.05, 0));
      g.add(at(box(0.4, 0.18, 0.05, 0x6cc6ff, { emissive: 0x6cc6ff, ei: 0.5 }), 0, 1.25, 0.26));
      g.add(at(cyl(0.08, 0.08, 0.14, 0xffffff), 0, 0.85, 0.28)); // cup
      break;
    }
    case 'vending': {
      g.add(at(box(0.85, 1.7, 0.7, 0xd94f5c, { rough: 0.4 }), 0, 0.85, 0));
      g.add(at(box(0.55, 1.2, 0.05, 0x223, { emissive: 0x88d8ff, ei: 0.4 }), 0, 1.0, 0.36));
      for (let i = 0; i < 3; i++)
        g.add(at(box(0.42, 0.06, 0.02, 0xffd166, { emissive: 0xffd166, ei: 0.5 }), 0, 0.7 + i * 0.32, 0.39));
      break;
    }
    case 'janitor': {
      g.add(at(cyl(0.3, 0.36, 0.5, 0x49c5d6, { metal: 0.3 }), 0, 0.25, 0)); // bot body
      g.add(at(cyl(0.36, 0.36, 0.08, 0x2b2f36), 0, 0.04, 0));               // wheel base
      const head = at(sphere(0.26, 0xeef3fb, { detail: 2, rough: 0.3 }), 0, 0.78, 0); g.add(head);
      g.add(at(sphere(0.06, 0x223, { emissive: 0x6cc6ff, ei: 0.8 }), -0.1, 0.8, 0.2));
      g.add(at(sphere(0.06, 0x223, { emissive: 0x6cc6ff, ei: 0.8 }), 0.1, 0.8, 0.2));
      const pole = at(cyl(0.03, 0.03, 0.85, 0x8a5a2b), 0.34, 0.5, 0.22); pole.rotation.z = 0.42; g.add(pole);
      g.add(at(box(0.3, 0.16, 0.14, 0xffd166, { rough: 0.7 }), 0.6, 0.16, 0.3)); // broom head
      break;
    }
    case 'sofa': {
      g.add(at(box(1.7, 0.4, 0.8, 0x6c8cff, { rough: 0.85 }), 0, 0.3, 0));
      g.add(at(box(1.7, 0.5, 0.2, 0x5b7af0, { rough: 0.85 }), 0, 0.6, -0.3));
      g.add(at(box(0.2, 0.45, 0.8, 0x5b7af0, { rough: 0.85 }), -0.85, 0.5, 0));
      g.add(at(box(0.2, 0.45, 0.8, 0x5b7af0, { rough: 0.85 }), 0.85, 0.5, 0));
      break;
    }
    case 'arcade': {
      g.add(at(box(0.8, 1.7, 0.8, 0x2b2f55, { rough: 0.5 }), 0, 0.85, 0));
      g.add(at(box(0.62, 0.5, 0.05, 0x120a2a, { emissive: 0xff4fd8, ei: 0.7 }), 0, 1.25, 0.36));
      g.add(at(box(0.6, 0.2, 0.4, 0x1a1d3a), 0, 0.95, 0.3)); // control deck
      g.add(at(cyl(0.05, 0.05, 0.18, 0xff4fd8, { emissive: 0xff4fd8, ei: 0.8 }), -0.12, 1.05, 0.42));
      g.add(at(sphere(0.07, 0xffd166, { emissive: 0xffd166, ei: 0.8 }), 0.15, 1.0, 0.42));
      break;
    }
    case 'art': {
      g.add(at(box(0.7, 0.8, 0.7, 0xf2ede4), 0, 0.4, 0)); // pedestal
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.1, 64, 8), mat(0xff6f91, { metal: 0.3, rough: 0.3, emissive: 0xff6f91, ei: 0.25 }));
      knot.position.y = 1.15; knot.castShadow = true; g.userData.spin = knot;
      g.add(knot);
      break;
    }
    case 'mascot': {
      g.add(at(cyl(0.55, 0.65, 0.4, 0xcfd8e3, { rough: 0.5 }), 0, 0.2, 0)); // pedestal
      const body = at(sphere(0.5, 0xeef3fb, { detail: 2, rough: 0.3 }), 0, 0.95, 0); body.scale.y = 1.1; g.add(body);
      const head = at(sphere(0.36, 0xffffff, { detail: 2, rough: 0.3 }), 0, 1.55, 0); g.add(head);
      g.add(at(sphere(0.07, 0x223, { emissive: 0x6cc6ff, ei: 0.8 }), -0.13, 1.6, 0.3));
      g.add(at(sphere(0.07, 0x223, { emissive: 0x6cc6ff, ei: 0.8 }), 0.13, 1.6, 0.3));
      g.add(at(box(0.5, 0.06, 0.06, 0x6cc6ff, { emissive: 0x6cc6ff, ei: 0.6 }), 0, 1.95, 0)); // antenna bar
      break;
    }
    case 'server': {
      g.add(at(box(0.9, 1.9, 0.8, 0x2c3038, { metal: 0.4, rough: 0.5 }), 0, 0.95, 0));
      g.userData.blinkers = [];
      for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
        const col = [0x49e07d, 0x6cc6ff, 0xffd166][c];
        const led = at(box(0.06, 0.06, 0.02, col, { emissive: col, ei: 0.8, noShadow: true }), -0.2 + c * 0.2, 0.35 + r * 0.28, 0.41);
        g.add(led); g.userData.blinkers.push(led);
      }
      break;
    }
    case 'core': {
      const orb = at(sphere(0.6, 0x66f2ff, { detail: 3, emissive: 0x33e0ff, ei: 1.3, rough: 0.1 }), 0, 1.1, 0);
      g.userData.pulse = orb; g.add(orb);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 10, 32), mat(0x33e0ff, { emissive: 0x33e0ff, ei: 1.1 }));
      ring.position.y = 1.1; ring.castShadow = false; g.userData.spin = ring; g.add(ring);
      const ring2 = ring.clone(); ring2.rotation.x = Math.PI / 2; g.userData.spin2 = ring2; g.add(ring2);
      g.add(at(cyl(0.5, 0.7, 0.5, 0x223a44, { metal: 0.5 }), 0, 0.25, 0));
      const light = new THREE.PointLight(0x33e0ff, 2.2, 8, 2);
      light.position.y = 1.1; g.add(light);
      break;
    }
    case 'food': {
      g.add(at(box(1.2, 0.5, 0.6, 0xe8c9a0, { rough: 0.7 }), 0, 0.55, 0)); // counter
      g.add(at(box(1.2, 0.1, 0.6, 0x8a5a2b), 0, 0.82, 0));
      g.add(at(sphere(0.16, 0x8a5a2b), -0.3, 0.95, 0)); // burger bun
      g.add(at(cyl(0.17, 0.17, 0.06, 0x6abf4a), -0.3, 0.9, 0)); // lettuce
      g.add(at(box(0.1, 0.5, 0.1, 0xffd166, { emissive: 0xffd166, ei: 0.4 }), 0.4, 0.95, 0.2)); // fries
      break;
    }
    case 'whip': {
      g.add(at(cyl(0.32, 0.4, 0.5, 0x44506a, { metal: 0.5 }), 0, 0.25, 0)); // base
      const bodyW = at(box(0.5, 0.6, 0.4, 0xff5d8f, { rough: 0.4 }), 0, 0.8, 0); g.add(bodyW);
      g.add(at(sphere(0.2, 0xffe0bd), 0, 1.2, 0)); // head
      g.add(at(sphere(0.06, 0x223, { emissive: 0x6cc6ff, ei: 0.8 }), -0.08, 1.24, 0.16));
      g.add(at(sphere(0.06, 0x223, { emissive: 0x6cc6ff, ei: 0.8 }), 0.08, 1.24, 0.16));
      const arm = at(cyl(0.05, 0.05, 0.6, 0x2b2f36), 0.35, 0.95, 0.1); arm.rotation.z = 0.7;
      g.userData.swing = arm; g.add(arm); // bully arm (swings)
      g.add(at(box(0.18, 0.12, 0.04, 0x111), 0.6, 1.2, 0.1)); // glove
      break;
    }
    case 'dino': {
      const body = at(sphere(0.55, 0x4caf6e, { detail: 2, rough: 0.6 }), 0, 0.8, 0); body.scale.set(1.1, 1, 1.4); g.add(body);
      const head = at(sphere(0.34, 0x57bd78, { detail: 2 }), 0, 1.25, 0.55); g.add(head);
      g.add(at(box(0.4, 0.12, 0.2, 0xffffff), 0, 1.16, 0.78)); // snout/teeth
      g.add(at(sphere(0.07, 0x111), -0.13, 1.34, 0.78)); g.add(at(sphere(0.07, 0x111), 0.13, 1.34, 0.78));
      const tail = at(cyl(0.05, 0.28, 0.9, 0x4caf6e), 0, 0.7, -0.7); tail.rotation.x = 1.1; g.add(tail);
      for (const dx of [-0.25, 0.25]) g.add(at(cyl(0.12, 0.16, 0.5, 0x3f9c60), dx, 0.25, 0.1));
      g.userData.bob = body;
      break;
    }
    case 'tnt': {
      const crate = at(cyl(0.45, 0.45, 0.8, 0xd23b3b, { rough: 0.6 }), 0, 0.4, 0); g.add(crate);
      g.add(at(cyl(0.46, 0.46, 0.16, 0xf2e9d8), 0, 0.55, 0));
      g.add(at(cyl(0.46, 0.46, 0.16, 0xf2e9d8), 0, 0.2, 0));
      const fuse = at(cyl(0.03, 0.03, 0.3, 0x3a3a3a), 0.1, 0.95, 0); fuse.rotation.z = -0.3; g.add(fuse);
      const spark = at(sphere(0.08, 0xffd166, { emissive: 0xffd166, ei: 1.2, noShadow: true }), 0.22, 1.08, 0);
      g.userData.spark = spark; g.add(spark);
      break;
    }
    case 'printer': {
      g.add(at(box(0.8, 0.5, 0.6, 0xdfe3ec, { rough: 0.5 }), 0, 0.45, 0));
      g.add(at(box(0.72, 0.12, 0.52, 0x2b2f36), 0, 0.74, 0));
      const paper = at(box(0.5, 0.4, 0.02, 0xffffff), 0, 0.96, 0.2); paper.rotation.x = -0.3; g.add(paper);
      g.add(at(box(0.42, 0.22, 0.01, 0x16c172, { emissive: 0x16c172, ei: 0.4 }), 0, 1.0, 0.23));
      break;
    }
    case 'billboard': {
      g.add(at(cyl(0.09, 0.11, 1.6, 0x6b7280, { metal: 0.3 }), 0, 0.8, 0));
      g.add(at(box(1.5, 0.95, 0.1, 0x1b2138), 0, 1.75, 0));
      const sign = at(box(1.3, 0.75, 0.02, 0xff5db1, { emissive: 0xff5db1, ei: 0.55, noShadow: true }), 0, 1.75, 0.06); g.add(sign);
      g.userData.pulse = sign;
      break;
    }
    default:
      g.add(at(box(0.6, 0.6, 0.6, 0xcccccc), 0, 0.3, 0));
  }
  return g;
}

// ---------------------------------------------------------------------------
//  Stations — chunky "machines" you tap to run. `userData.glow` is the front
//  panel office.js lights up while the station is active.
// ---------------------------------------------------------------------------
export function buildStation(id) {
  const s = STATION_BY_ID[id];
  const col = s ? s.color : '#8aa0c8';
  const g = new THREE.Group();
  g.add(at(box(1.2, 1.35, 0.92, 0x2c3550, { rough: 0.6, metal: 0.2 }), 0, 0.7, 0)); // cabinet
  g.add(at(box(1.3, 0.16, 1.0, 0x222a40), 0, 1.42, 0));                              // top cap
  const panel = at(box(0.92, 0.66, 0.05, col, { emissive: col, ei: 0.2 }), 0, 0.85, 0.47);
  panel.castShadow = false; g.add(panel);
  const lights = [];
  for (let i = 0; i < 3; i++) {
    const led = at(box(0.1, 0.1, 0.03, col, { emissive: col, ei: 0.35, noShadow: true }), -0.3 + i * 0.3, 1.22, 0.48);
    led.castShadow = false; g.add(led); lights.push(led);
  }
  g.add(at(cyl(0.12, 0.16, 0.5, 0x39406a, { metal: 0.3 }), 0.44, 1.62, -0.1)); // funnel
  g.userData.stationId = id;
  g.userData.glow = panel;
  g.userData.lights = lights;
  return g;
}

// A small pile of floor trash. Tap it (or let a janitor) to clear it.
export function buildTrash() {
  const g = new THREE.Group();
  const cols = [0x8a8f9c, 0xb08d57, 0x6f7a4a, 0xc56b6b];
  const c = cols[(Math.random() * cols.length) | 0];
  g.add(at(box(0.4, 0.26, 0.4, c, { rough: 0.95 }), 0, 0.13, 0));
  g.add(at(box(0.22, 0.2, 0.22, 0xe4ddcc, { rough: 0.95 }), 0.15, 0.3, 0.06)); // crumpled paper
  const can = at(cyl(0.08, 0.1, 0.2, 0x6fae5a, { rough: 0.8 }), -0.14, 0.2, 0.12); can.rotation.z = 0.5; g.add(can);
  g.scale.setScalar(0.9 + Math.random() * 0.4);
  g.rotation.y = Math.random() * Math.PI * 2;
  return g;
}
