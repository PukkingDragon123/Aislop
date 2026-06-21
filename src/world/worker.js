// ============================================================================
//  Worker — a round, googly-eyed, gloriously sloppy little employee.
//  Wobbly walk, jiggly independent googly eyes, ragdoll "lie flat" flops, and
//  chaos states (fight / get knocked over). Squash-and-stretch everywhere.
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { box, sphere, cyl } from './furniture.js';

const SKINS = [0xf6c79b, 0xe0a86f, 0xc68642, 0x8d5524, 0xffe0bd, 0xb07a48];

let _id = 0;

export class Worker {
  constructor(opts) {
    this.id = _id++;
    this.deptId = opts.deptId;
    this.color = opts.color;
    this.home = { x: opts.x, z: opts.z };
    this.facing = opts.facing ?? Math.PI;
    this.requestErrand = opts.requestErrand || (() => null);

    this.state = 'work';
    this.stateTimer = 0;
    this.errandCooldown = 4 + Math.random() * 8;
    this.path = [];
    this.speed = 2.4 + Math.random() * 0.8;
    this.phase = Math.random() * Math.PI * 2;
    this.carry = false;
    this.eyeJ = [{ x: 0, y: 0 }, { x: 0, y: 0 }]; // googly pupil offsets

    this._build(opts);
    this.group.position.set(this.home.x, 0, this.home.z);
    this.group.rotation.y = this.facing;
  }

  _build(opts) {
    const g = new THREE.Group();
    const shirt = this.color;
    const skin = SKINS[(Math.random() * SKINS.length) | 0];

    const body = new THREE.Group(); g.add(body); this.body = body;

    // Stubby legs.
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.legL.position.set(-0.12, 0.34, 0); this.legR.position.set(0.12, 0.34, 0);
    const leg = () => { const m = cyl(0.1, 0.12, 0.34, 0x3a4a5a); m.position.y = -0.17; return m; };
    this.legL.add(leg()); this.legR.add(leg());
    body.add(this.legL, this.legR);

    // Round blobby torso.
    const torso = sphere(0.34, shirt, { detail: 2, rough: 0.55 });
    torso.scale.set(1, 1.1, 0.92); torso.position.y = 0.62; body.add(torso); this.torso = torso;

    // Big round head.
    const head = sphere(0.3, skin, { detail: 2, rough: 0.5 });
    head.position.y = 1.04; body.add(head); this.head = head;

    // Googly eyes — white spheres + jiggly black pupils.
    this.pupils = [];
    for (const dx of [-0.12, 0.12]) {
      const eye = sphere(0.12, 0xffffff, { detail: 2, rough: 0.2 });
      eye.position.set(dx, 1.1, 0.22); eye.scale.z = 0.6; body.add(eye);
      const pupil = sphere(0.055, 0x101014, { detail: 1 });
      pupil.position.set(dx, 1.1, 0.31); body.add(pupil);
      this.pupils.push(pupil);
    }

    // Floppy arms (pivot at shoulder).
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.armL.position.set(-0.32, 0.78, 0); this.armR.position.set(0.32, 0.78, 0);
    const arm = () => { const m = cyl(0.08, 0.09, 0.38, shirt); m.position.y = -0.19; return m; };
    this.armL.add(arm()); this.armR.add(arm());
    body.add(this.armL, this.armR);

    // Carried token (errands).
    const token = new THREE.Group();
    token.add(box(0.24, 0.3, 0.03, 0xffffff, { rough: 0.4, noShadow: true }),
      box(0.18, 0.22, 0.01, opts.color, { emissive: opts.color, ei: 0.7, noShadow: true }));
    token.position.set(0, 0.95, 0.34); token.visible = false; body.add(token); this.token = token;

    g.scale.setScalar(0.96);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.group = g;
  }

  // ---- behaviour ----------------------------------------------------------
  update(dt, t) {
    this._googly(dt);
    if (this.state === 'walk') this._walk(dt, t);
    else if (this.state === 'ragdoll') this._ragdoll(dt, t);
    else if (this.state === 'fight') this._fight(dt, t);
    else this._work(dt, t);
  }

  _googly(dt) {
    // Pupils do a jittery random-walk inside the eyes — peak sloppiness.
    for (let i = 0; i < 2; i++) {
      const j = this.eyeJ[i];
      j.x += (Math.random() - 0.5) * dt * 1.2; j.y += (Math.random() - 0.5) * dt * 1.2;
      j.x = THREE.MathUtils.clamp(j.x, -0.05, 0.05); j.y = THREE.MathUtils.clamp(j.y, -0.05, 0.05);
      const base = i === 0 ? -0.12 : 0.12;
      this.pupils[i].position.x = base + j.x;
      this.pupils[i].position.y = 1.1 + j.y;
    }
  }

  _work(dt, t) {
    const g = this.group;
    g.position.x += (this.home.x - g.position.x) * Math.min(1, dt * 6);
    g.position.z += (this.home.z - g.position.z) * Math.min(1, dt * 6);
    this._turnTo(this.facing, dt);
    const p = t * 9 + this.phase;
    this.armL.rotation.x = -1.0 + Math.sin(p) * 0.3;
    this.armR.rotation.x = -1.0 + Math.sin(p + 1.6) * 0.3;
    // squishy idle bob
    const s = 1 + Math.sin(t * 3 + this.phase) * 0.04;
    this.torso.scale.set(1 / s, 1.1 * s, 0.92 / s);
    this.body.position.y = Math.sin(t * 3 + this.phase) * 0.02;
    this.body.rotation.z = Math.sin(t * 1.7 + this.phase) * 0.05;
    this.legL.rotation.x = this.legR.rotation.x = 0;
    this.token.visible = false;

    this.errandCooldown -= dt;
    if (this.errandCooldown <= 0) {
      this.errandCooldown = 7 + Math.random() * 12;
      const e = this.requestErrand(this);
      if (e) { this.carry = !!e.carry; this._startWalk([e, this.home]); }
    }
  }

  _startWalk(points) {
    this.path = points.map((p) => ({ x: p.x, z: p.z, pause: p.pause || 0 }));
    this.state = 'walk'; this._pause = 0; this.token.visible = this.carry;
  }

  _walk(dt, t) {
    const g = this.group;
    if (this._pause > 0) { this._pause -= dt; this._work(0, t); this.state = 'walk'; return; }
    const next = this.path[0];
    if (!next) { this.state = 'work'; this.carry = false; return; }
    const dx = next.x - g.position.x, dz = next.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.07) { g.position.x = next.x; g.position.z = next.z; this._pause = next.pause; this.path.shift(); if (!this.path.length) { this.state = 'work'; this.carry = false; } return; }
    const step = Math.min(dist, this.speed * dt);
    g.position.x += (dx / dist) * step; g.position.z += (dz / dist) * step;
    this._turnTo(Math.atan2(dx, dz), dt);
    // Sloppy walk: big bob, flailing arms, side-to-side body lean.
    const p = t * 11 + this.phase;
    const sw = Math.sin(p);
    this.legL.rotation.x = sw * 0.8; this.legR.rotation.x = -sw * 0.8;
    this.armL.rotation.x = -sw * 1.1; this.armR.rotation.x = sw * 1.1;
    this.armL.rotation.z = 0.3; this.armR.rotation.z = -0.3;
    this.body.position.y = Math.abs(sw) * 0.09;
    this.body.rotation.z = sw * 0.18;
    const sq = 1 + Math.abs(sw) * 0.08;
    this.torso.scale.set(1 / sq, 1.1 * sq, 0.92 / sq);
    this.token.visible = this.carry;
  }

  // Get knocked flat, splay, then pop back up.
  ragdoll(impulse = 1) {
    if (this.state === 'ragdoll') return;
    this.state = 'ragdoll'; this.stateTimer = 1.4 + Math.random() * 1.2;
    this._fall = 0; this._fallDir = (Math.random() < 0.5 ? 1 : -1) * impulse;
  }
  _ragdoll(dt, t) {
    this.stateTimer -= dt;
    const down = this.stateTimer > 0.5 ? 1 : Math.max(0, this.stateTimer / 0.5); // get-up ramp
    this._fall += (down - this._fall) * Math.min(1, dt * 10);
    this.group.rotation.z = this._fallDir * 1.45 * this._fall;
    this.body.position.y = -0.15 * this._fall;
    // limbs splay loosely
    this.armL.rotation.z = 0.3 + this._fall * 1.2; this.armR.rotation.z = -0.3 - this._fall * 1.2;
    this.legL.rotation.x = this._fall * 0.8; this.legR.rotation.x = -this._fall * 0.8;
    if (this.stateTimer <= 0) {
      this.group.rotation.z = 0; this.body.position.y = 0;
      this.armL.rotation.z = 0; this.armR.rotation.z = 0;
      this.state = 'work';
    }
  }

  // Square up with a neighbour and flail.
  fight(partnerPos, dur = 2) {
    if (this.state === 'ragdoll') return;
    this.state = 'fight'; this.stateTimer = dur;
    this._fightTarget = partnerPos; this._home0 = { x: this.group.position.x, z: this.group.position.z };
  }
  _fight(dt, t) {
    this.stateTimer -= dt;
    const tp = this._fightTarget;
    this._turnTo(Math.atan2(tp.x - this.group.position.x, tp.z - this.group.position.z), dt * 2);
    const lunge = (Math.sin(t * 16 + this.phase) * 0.5 + 0.5);
    const hx = this._home0.x + (tp.x - this._home0.x) * 0.18 * lunge;
    const hz = this._home0.z + (tp.z - this._home0.z) * 0.18 * lunge;
    this.group.position.x += (hx - this.group.position.x) * Math.min(1, dt * 12);
    this.group.position.z += (hz - this.group.position.z) * Math.min(1, dt * 12);
    this.armL.rotation.x = Math.sin(t * 22) * 1.6; this.armR.rotation.x = Math.cos(t * 22) * 1.6;
    this.body.rotation.z = Math.sin(t * 20) * 0.25;
    if (this.stateTimer <= 0) { this.body.rotation.z = 0; this.state = 'work'; }
  }

  _turnTo(target, dt) {
    const cur = this.group.rotation.y;
    let diff = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
    this.group.rotation.y = cur + diff * Math.min(1, dt * 9);
  }
  dispose() { this.group.removeFromParent(); }
}
