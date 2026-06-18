// ============================================================================
//  Worker entity — a small expressive character that types at a desk and walks
//  errands across the office (delivering glowing "project" tokens to the next
//  department, or grabbing a coffee). Color-coded by department for readability.
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { box, sphere, cyl } from './furniture.js';

const SKINS = [0xf6c79b, 0xe0a86f, 0xc68642, 0x8d5524, 0xffe0bd, 0xb07a48];
const HAIRS = [0x2b2b2b, 0x5b3a29, 0xe0c068, 0x3a3a55, 0xa03030, 0x6b6b6b, 0xff7aa8];

let _id = 0;

export class Worker {
  constructor(opts) {
    this.id = _id++;
    this.deptId = opts.deptId;
    this.color = opts.color;            // department shirt colour
    this.home = { x: opts.x, z: opts.z };
    this.facing = opts.facing ?? 0;     // radians, the "working" orientation
    this.requestErrand = opts.requestErrand || (() => null);

    this.state = 'work';
    this.workTimer = 0;
    this.errandCooldown = 3 + Math.random() * 6;
    this.path = [];
    this.speed = 2.6 + Math.random() * 0.6;
    this.phase = Math.random() * Math.PI * 2; // desync animations
    this.carry = false;

    this._build(opts);
    this.group.position.set(this.home.x, 0, this.home.z);
    this.group.rotation.y = this.facing;
  }

  _build(opts) {
    const g = new THREE.Group();
    const shirt = this.color;
    const skin = SKINS[Math.floor(Math.random() * SKINS.length)];
    const hair = HAIRS[Math.floor(Math.random() * HAIRS.length)];

    // Body pivot — everything that bobs/leans hangs off here.
    const body = new THREE.Group();
    g.add(body);
    this.body = body;

    // Legs (dark trousers) — pivot at hip for walk swing.
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.legL.position.set(-0.12, 0.42, 0); this.legR.position.set(0.12, 0.42, 0);
    const legMesh = () => box(0.16, 0.44, 0.18, 0x3a4a5a, { rough: 0.8 });
    const lm = legMesh(); lm.position.y = -0.22; this.legL.add(lm);
    const rm = legMesh(); rm.position.y = -0.22; this.legR.add(rm);
    body.add(this.legL, this.legR);

    // Torso.
    const torso = box(0.4, 0.46, 0.26, shirt, { rough: 0.6 });
    torso.position.y = 0.66; body.add(torso);

    // Head + hair.
    const head = sphere(0.18, skin, { detail: 2, rough: 0.5 });
    head.position.y = 1.02; head.scale.set(1, 1.05, 0.95); body.add(head);
    const cap = sphere(0.2, hair, { detail: 2, rough: 0.7 });
    cap.position.y = 1.07; cap.scale.set(1, 0.7, 1); body.add(cap);

    // Arms — pivot at shoulder for typing / walk swing.
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.armL.position.set(-0.24, 0.84, 0); this.armR.position.set(0.24, 0.84, 0);
    const armMesh = () => { const a = box(0.12, 0.4, 0.12, shirt, { rough: 0.6 }); a.position.y = -0.2; return a; };
    const handL = sphere(0.08, skin, { detail: 1 }); handL.position.y = -0.42;
    const handR = sphere(0.08, skin, { detail: 1 }); handR.position.y = -0.42;
    this.armL.add(armMesh(), handL); this.armR.add(armMesh(), handR);
    body.add(this.armL, this.armR);

    // Carried project token (hidden until on an errand).
    const token = new THREE.Group();
    const slate = box(0.26, 0.34, 0.03, 0xffffff, { rough: 0.4, noShadow: true });
    const glow = box(0.2, 0.26, 0.01, opts.color, { emissive: opts.color, ei: 0.7, noShadow: true });
    glow.position.z = 0.02; token.add(slate, glow);
    token.position.set(0, 0.7, 0.28);
    token.visible = false;
    body.add(token);
    this.token = token;

    g.scale.setScalar(0.92);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.group = g;
  }

  // ---- high-level behaviour ----------------------------------------------
  update(dt, t) {
    if (this.state === 'walk') this._updateWalk(dt, t);
    else this._updateWork(dt, t);
  }

  _updateWork(dt, t) {
    // Smoothly settle to home pose.
    const g = this.group;
    g.position.x += (this.home.x - g.position.x) * Math.min(1, dt * 6);
    g.position.z += (this.home.z - g.position.z) * Math.min(1, dt * 6);
    this._turnTo(this.facing, dt);

    // Typing animation: hands tap, torso bobs gently.
    const p = t * 9 + this.phase;
    this.armL.rotation.x = -1.1 + Math.sin(p) * 0.25;
    this.armR.rotation.x = -1.1 + Math.sin(p + 1.5) * 0.25;
    this.body.position.y = Math.sin(t * 2 + this.phase) * 0.015;
    this.legL.rotation.x = this.legR.rotation.x = 0;
    this.token.visible = false;

    // Occasionally head off on an errand to keep the office alive.
    this.errandCooldown -= dt;
    if (this.errandCooldown <= 0) {
      this.errandCooldown = 8 + Math.random() * 14;
      const errand = this.requestErrand(this);
      if (errand) {
        this.carry = !!errand.carry;
        this._startWalk([errand, this.home]);
      }
    }
  }

  _startWalk(points) {
    this.path = points.map((p) => ({ x: p.x, z: p.z, pause: p.pause || 0 }));
    this.state = 'walk';
    this._pause = 0;
    this.token.visible = this.carry;
  }

  _updateWalk(dt, t) {
    const g = this.group;
    if (this._pause > 0) {
      this._pause -= dt;
      this._idlePose(t);
      return;
    }
    const next = this.path[0];
    if (!next) { this.state = 'work'; this.carry = false; return; }

    const dx = next.x - g.position.x;
    const dz = next.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.06) {
      g.position.x = next.x; g.position.z = next.z;
      this._pause = next.pause;
      this.path.shift();
      if (this.path.length === 0) { this.state = 'work'; this.carry = false; }
      return;
    }
    const step = Math.min(dist, this.speed * dt);
    g.position.x += (dx / dist) * step;
    g.position.z += (dz / dist) * step;
    this._turnTo(Math.atan2(dx, dz), dt);

    // Walk cycle.
    const p = t * 10 + this.phase;
    const swing = Math.sin(p) * 0.6;
    this.legL.rotation.x = swing; this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.7; this.armR.rotation.x = swing * 0.7;
    this.body.position.y = Math.abs(Math.sin(p)) * 0.05;
    this.token.visible = this.carry;
  }

  _idlePose(t) {
    const p = t * 9 + this.phase;
    this.armL.rotation.x = -1.0 + Math.sin(p) * 0.2;
    this.armR.rotation.x = -1.0 + Math.sin(p + 1.2) * 0.2;
    this.legL.rotation.x = this.legR.rotation.x = 0;
    this.body.position.y = Math.sin(t * 2 + this.phase) * 0.02;
  }

  _turnTo(target, dt) {
    let cur = this.group.rotation.y;
    let diff = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
    this.group.rotation.y = cur + diff * Math.min(1, dt * 9);
  }

  dispose() {
    this.group.removeFromParent();
  }
}
