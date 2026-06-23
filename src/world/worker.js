// ============================================================================
//  Worker — a 3D potato employee. Lumpy oval body + big stupid googly eyes +
//  stubby legs. No arms, no nose — just a wobbly drunk potato. Spring-damped
//  sway that overshoots, random stumbles, ragdoll tip-overs and fights.
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { sphere, cyl } from './furniture.js';

let _id = 0;

export class Worker {
  constructor(opts) {
    this.id = _id++;
    this.deptId = opts.deptId;
    this.home = { x: opts.x, z: opts.z };
    this.facing = opts.facing ?? Math.PI;
    this.requestErrand = opts.requestErrand || (() => null);

    this.state = 'work';
    this.errandCooldown = 4 + Math.random() * 8;
    this.path = [];
    this.speed = 2.0 + Math.random() * 0.9;
    this.phase = Math.random() * Math.PI * 2;

    this.sway = 0; this.swayV = 0; this.lean = 0; this.bob = 0; this.squash = 0;
    this.stumbleTimer = 2 + Math.random() * 4;
    this.eyeJ = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

    this._build(opts.color);
    this.group.position.set(this.home.x, 0, this.home.z);
    this.group.rotation.y = this.facing;
  }

  _build(color) {
    const g = new THREE.Group();
    const rig = new THREE.Group(); g.add(rig); this.rig = rig;

    // Potato body — lumpy oval.
    const body = sphere(0.44, color, { detail: 1, rough: 0.7 });
    body.scale.set(1.05, 1.32, 0.95); body.position.y = 0.6;
    rig.add(body); this.body = body; body.userData.worker = this;

    // Stubby legs.
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.legL.position.set(-0.16, 0.3, 0); this.legR.position.set(0.16, 0.3, 0);
    const leg = () => { const m = cyl(0.09, 0.11, 0.32, 0x3a4a5a); m.position.y = -0.16; return m; };
    this.legL.add(leg()); this.legR.add(leg()); rig.add(this.legL, this.legR);

    // Big stupid googly eyes.
    this.pupils = [];
    for (const dx of [-0.17, 0.17]) {
      const eye = sphere(0.15, 0xffffff, { detail: 2, rough: 0.2 });
      eye.position.set(dx, 0.8, 0.34); eye.scale.z = 0.7; rig.add(eye);
      const pupil = sphere(0.07, 0x101014, { detail: 1 });
      pupil.position.set(dx, 0.8, 0.46); rig.add(pupil);
      this.pupils.push({ p: pupil, bx: dx });
    }

    g.scale.setScalar(0.96);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.group = g;
  }

  update(dt, t) {
    if (this.state === 'walk') this._walk(dt, t);
    else if (this.state === 'ragdoll') this._ragdoll(dt, t);
    else if (this.state === 'fight') this._fight(dt, t);
    else this._work(dt, t);
    this._googly(dt);
  }

  _springSway(target, dt, stiff = 60, damp = 8) {
    this.swayV += (target - this.sway) * stiff * dt;
    this.swayV *= Math.max(0, 1 - damp * dt);
    this.sway += this.swayV * dt;
  }
  _applyRig() {
    this.rig.rotation.z = this.sway;
    this.rig.rotation.x = this.lean;
    this.rig.position.y = this.bob;
    const sq = 1 + this.squash;
    this.body.scale.set(1.05 / Math.sqrt(sq), 1.32 * sq, 0.95 / Math.sqrt(sq));
  }
  _googly(dt) {
    for (let i = 0; i < 2; i++) {
      const j = this.eyeJ[i];
      j.x += (Math.random() - 0.5) * dt * 1.6; j.y += (Math.random() - 0.5) * dt * 1.6;
      j.x = clamp(j.x, -0.05, 0.05); j.y = clamp(j.y, -0.05, 0.05);
      const pu = this.pupils[i];
      pu.p.position.x = pu.bx + j.x; pu.p.position.y = 0.8 + j.y;
    }
  }

  _work(dt, t) {
    const g = this.group;
    g.position.x += (this.home.x - g.position.x) * Math.min(1, dt * 5);
    g.position.z += (this.home.z - g.position.z) * Math.min(1, dt * 5);
    this._turnTo(this.facing, dt);
    this._springSway(Math.sin(t * 1.5 + this.phase) * 0.12, dt, 40, 7);
    this.lean += (0 - this.lean) * Math.min(1, dt * 5);
    this.bob += (Math.sin(t * 2 + this.phase) * 0.02 - this.bob) * Math.min(1, dt * 6);
    this.squash += (0 - this.squash) * Math.min(1, dt * 6);
    this.legL.rotation.x = this.legR.rotation.x = 0;
    this._applyRig();
    this.stumbleTimer -= dt;
    if (this.stumbleTimer <= 0) { this.stumbleTimer = 3 + Math.random() * 5; this.swayV += (Math.random() - 0.5) * 8; }
    this.errandCooldown -= dt;
    if (this.errandCooldown <= 0) {
      this.errandCooldown = 7 + Math.random() * 12;
      const e = this.requestErrand(this);
      if (e) this._startWalk([e, this.home]);
    }
  }

  _startWalk(points) { this.path = points.map((p) => ({ x: p.x, z: p.z, pause: p.pause || 0 })); this.state = 'walk'; this._pause = 0; }

  _walk(dt, t) {
    const g = this.group;
    if (this._pause > 0) { this._pause -= dt; this._work(0, t); this.state = 'walk'; return; }
    const next = this.path[0];
    if (!next) { this.state = 'work'; return; }
    const dx = next.x - g.position.x, dz = next.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1) { g.position.x = next.x; g.position.z = next.z; this._pause = next.pause; this.path.shift(); if (!this.path.length) this.state = 'work'; return; }
    const step = Math.min(dist, this.speed * dt);
    g.position.x += (dx / dist) * step; g.position.z += (dz / dist) * step;
    this._turnTo(Math.atan2(dx, dz), dt * 0.6);
    const p = t * 8 + this.phase;
    this._springSway(Math.sin(p) * 0.35 + Math.sin(t * 0.8 + this.phase) * 0.12, dt, 70, 6);
    this.lean += (0.16 - this.lean) * Math.min(1, dt * 5);
    this.bob += (Math.abs(Math.sin(p)) * 0.13 - this.bob) * Math.min(1, dt * 10);
    this.legL.rotation.x = Math.sin(p) * 0.9; this.legR.rotation.x = -Math.sin(p) * 0.9;
    this.squash += (0 - this.squash) * Math.min(1, dt * 6);
    this._applyRig();
    this.stumbleTimer -= dt;
    if (this.stumbleTimer <= 0) { this.stumbleTimer = 2 + Math.random() * 3; this.swayV += (Math.random() - 0.5) * 12; }
  }

  ragdoll() {
    if (this.state === 'ragdoll') return;
    this.state = 'ragdoll'; this.stateTimer = 1.5 + Math.random() * 1.2;
    this._rdir = Math.random() < 0.5 ? 1 : -1;
  }
  _ragdoll(dt) {
    this.stateTimer -= dt;
    const want = this.stateTimer > 0.5 ? 1 : Math.max(0, this.stateTimer / 0.5);
    this.sway += (this._rdir * 1.5 * want - this.sway) * Math.min(1, dt * 12);
    this.bob += (-0.3 * want - this.bob) * Math.min(1, dt * 10);
    this.squash += ((want > 0.4 ? 0.2 : 0) - this.squash) * Math.min(1, dt * 8);
    this._applyRig();
    if (this.stateTimer <= 0) this.state = 'work';
  }

  fight(partnerPos, dur = 2.2) {
    if (this.state === 'ragdoll') return;
    this.state = 'fight'; this.stateTimer = dur;
    this._ft = partnerPos; this._h0 = { x: this.group.position.x, z: this.group.position.z };
  }
  _fight(dt, t) {
    this.stateTimer -= dt;
    this._turnTo(Math.atan2(this._ft.x - this.group.position.x, this._ft.z - this.group.position.z), dt * 2);
    const lunge = Math.sin(t * 16 + this.phase) * 0.5 + 0.5;
    this.group.position.x += ((this._h0.x + (this._ft.x - this._h0.x) * 0.16 * lunge) - this.group.position.x) * Math.min(1, dt * 12);
    this.group.position.z += ((this._h0.z + (this._ft.z - this._h0.z) * 0.16 * lunge) - this.group.position.z) * Math.min(1, dt * 12);
    this.sway = Math.sin(t * 24) * 0.35;
    this.bob = Math.abs(Math.sin(t * 20)) * 0.12;
    this._applyRig();
    if (this.stateTimer <= 0) this.state = 'work';
  }

  workPop() { if (this.state === 'work' || this.state === 'walk') { this.squash = -0.28; this.swayV += (Math.random() - 0.5) * 4; } }

  _turnTo(target, dt) {
    const cur = this.group.rotation.y;
    let diff = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
    this.group.rotation.y = cur + diff * Math.min(1, dt * 9);
  }
  dispose() { this.group.removeFromParent(); }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
