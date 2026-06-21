// ============================================================================
//  Particle juice: floating "+$" text, confetti bursts and viral shockwaves.
//  Everything is pooled / capped so a long binge never tanks the framerate.
// ============================================================================

import * as THREE from '../vendor/three.module.js';

const CONFETTI_COLORS = [0xff6f91, 0xffd166, 0x6cc6ff, 0x49e07d, 0xc3a6ff, 0xff9f45];
const MAX_CONFETTI = 600;
const MAX_FLOATERS = 24;

let scene = null;
let confetti = [];
let floaters = [];
let rings = [];
let projectiles = [];
let shakeAmt = 0;
let confettiGeo, confettiMats, throwGeo;
const THROW_COLORS = [0x8a5a2b, 0xff6f91, 0x6cc6ff, 0x3a3f44, 0xffd166, 0x9bf6a0];

export function initEffects(sceneRef) {
  scene = sceneRef;
  confettiGeo = new THREE.PlaneGeometry(0.16, 0.24);
  confettiMats = CONFETTI_COLORS.map((c) =>
    new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, side: THREE.DoubleSide, roughness: 0.6 }));
  throwGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
}

// Camera shake — accumulated, decayed each frame; scene reads getShake().
export function screenShake(a = 0.5) { shakeAmt = Math.min(3, shakeAmt + a); }
export function getShake() {
  if (shakeAmt <= 0.001) return null;
  const a = shakeAmt * 0.12;
  return { x: (Math.random() - 0.5) * a, y: (Math.random() - 0.5) * a };
}

// A chaotic thrown object that arcs from -> to and tumbles to the floor.
export function throwProjectile(from, to) {
  if (!scene || projectiles.length > 40) return;
  const m = new THREE.Mesh(throwGeo, new THREE.MeshStandardMaterial({ color: THROW_COLORS[(Math.random() * THROW_COLORS.length) | 0], roughness: 0.7 }));
  m.position.set(from.x, from.y ?? 1, from.z); m.castShadow = true; scene.add(m);
  const dx = to.x - from.x, dz = to.z - from.z;
  projectiles.push({
    mesh: m,
    vel: new THREE.Vector3(dx * 0.55, 4 + Math.random() * 2.5, dz * 0.55),
    spin: new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18),
    age: 0, life: 3,
  });
}

export function confettiBurst(pos, count = 80, power = 1) {
  count = Math.min(count, MAX_CONFETTI - confetti.length);
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(confettiGeo, confettiMats[i % confettiMats.length]);
    m.position.copy(pos);
    m.castShadow = false;
    const ang = Math.random() * Math.PI * 2;
    const up = (3.5 + Math.random() * 4) * power;
    const out = (1.5 + Math.random() * 3) * power;
    confetti.push({
      mesh: m,
      vel: new THREE.Vector3(Math.cos(ang) * out, up, Math.sin(ang) * out),
      spin: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
      life: 1.8 + Math.random() * 1.4,
      age: 0,
    });
    scene.add(m);
  }
}

export function viralBurst(pos) {
  confettiBurst(pos, 220, 1.4);
  // Expanding glowing ring on the floor.
  const geo = new THREE.RingGeometry(0.3, 0.5, 48);
  const matr = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geo, matr);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.05, pos.z);
  scene.add(ring);
  rings.push({ mesh: ring, age: 0, life: 1.1 });
}

export function floatingText(pos, text, color = '#ffffff') {
  if (floaters.length >= MAX_FLOATERS) {
    const old = floaters.shift();
    cleanupFloater(old);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(20,24,40,0.85)';
  ctx.strokeText(text, 128, 50);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const matr = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(matr);
  sprite.scale.set(2.6, 0.98, 1);
  sprite.position.copy(pos);
  sprite.renderOrder = 999;
  scene.add(sprite);
  floaters.push({ sprite, tex, age: 0, life: 1.5 });
}

function cleanupFloater(f) {
  scene.remove(f.sprite);
  f.tex.dispose();
  f.sprite.material.dispose();
}

export function updateEffects(dt) {
  // Confetti.
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i];
    p.age += dt;
    if (p.age >= p.life) { scene.remove(p.mesh); confetti.splice(i, 1); continue; }
    p.vel.y -= 9.8 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += p.spin.x * dt;
    p.mesh.rotation.y += p.spin.y * dt;
    p.mesh.rotation.z += p.spin.z * dt;
    if (p.mesh.position.y < 0.02) { p.mesh.position.y = 0.02; p.vel.set(0, 0, 0); p.spin.set(0, 0, 0); }
  }
  // Floating text.
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.age += dt;
    if (f.age >= f.life) { cleanupFloater(f); floaters.splice(i, 1); continue; }
    f.sprite.position.y += dt * 1.4;
    const k = f.age / f.life;
    f.sprite.material.opacity = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
  }
  // Rings.
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.age += dt;
    if (r.age >= r.life) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); rings.splice(i, 1); continue; }
    const k = r.age / r.life;
    r.mesh.scale.setScalar(1 + k * 14);
    r.mesh.material.opacity = 0.9 * (1 - k);
  }
  // Thrown objects (chaos).
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.age += dt;
    if (p.age >= p.life) { scene.remove(p.mesh); p.mesh.material.dispose(); projectiles.splice(i, 1); continue; }
    p.vel.y -= 12 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.z += p.spin.z * dt;
    if (p.mesh.position.y < 0.12) { p.mesh.position.y = 0.12; p.vel.y *= -0.45; p.vel.x *= 0.6; p.vel.z *= 0.6; p.spin.multiplyScalar(0.6); }
  }
  // Decay camera shake.
  shakeAmt = Math.max(0, shakeAmt - dt * 4);
}
