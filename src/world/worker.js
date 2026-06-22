// ============================================================================
//  Worker — a flat 2D sticker employee (drawn on canvas, billboarded into the
//  3D office, matching the brainrot art style). Procedural JELLY animation:
//  squash-and-stretch, wobble, jiggly googly pupils, ragdoll "lie flat" flops,
//  and fight states. No skeleton — pure sprite transforms.
// ============================================================================

import * as THREE from '../vendor/three.module.js';

const SKINS = ['#f6c79b', '#e0a86f', '#c68642', '#8d5524', '#ffe0bd'];
const HAIRS = ['#2b2b2b', '#5b3a29', '#e0c068', '#3a3a55', '#a03030', '#ff7aa8'];

const texCache = new Map();
let pupilTex = null, shadowTex = null;
let _id = 0;

function hex(n) { return '#' + n.toString(16).padStart(6, '0'); }

// Draw the character once per (shirt, skin, hair) combo → cached CanvasTexture.
function bodyTexture(shirt, skin, hair) {
  const key = `${shirt}|${skin}|${hair}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = 160; c.height = 200;
  const x = c.getContext('2d');
  const cx = 80;
  x.lineJoin = 'round'; x.lineCap = 'round';
  const outline = (w) => { x.lineWidth = w; x.strokeStyle = '#1b1b24'; };

  // Legs.
  x.fillStyle = '#3a4a5a';
  for (const lx of [cx - 22, cx + 22]) { rr(x, lx - 11, 150, 22, 34, 10); x.fill(); outline(6); x.stroke(); }
  // Body blob.
  x.fillStyle = shirt; rr(x, cx - 44, 78, 88, 86, 34); x.fill(); outline(7); x.stroke();
  // Arms.
  x.fillStyle = shirt;
  for (const a of [[cx - 52, 92], [cx + 36, 92]]) { rr(x, a[0], a[1], 18, 52, 9); x.fill(); outline(6); x.stroke(); }
  // Head.
  x.fillStyle = skin; x.beginPath(); x.arc(cx, 56, 40, 0, Math.PI * 2); x.fill(); outline(7); x.stroke();
  // Hair tuft.
  x.fillStyle = hair; x.beginPath(); x.arc(cx, 36, 38, Math.PI, 0); x.fill();
  // Eye whites (pupils are separate jiggly sprites).
  x.fillStyle = '#fff';
  for (const ex of [cx - 16, cx + 16]) { x.beginPath(); x.arc(ex, 54, 15, 0, Math.PI * 2); x.fill(); outline(4); x.stroke(); }
  // Smile.
  x.beginPath(); x.lineWidth = 5; x.strokeStyle = '#1b1b24'; x.arc(cx, 70, 12, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}
function rr(x, px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }

function circleTex(color) {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const x = c.getContext('2d'); x.fillStyle = color; x.beginPath(); x.arc(24, 24, 22, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function softShadowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.34)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}

export class Worker {
  constructor(opts) {
    this.id = _id++;
    this.deptId = opts.deptId;
    this.home = { x: opts.x, z: opts.z };
    this.requestErrand = opts.requestErrand || (() => null);
    this.state = 'work';
    this.stateTimer = 0;
    this.errandCooldown = 4 + Math.random() * 8;
    this.path = [];
    this.speed = 2.2 + Math.random() * 0.9;
    this.phase = Math.random() * Math.PI * 2;
    this.carry = false;
    this.faceDir = 1;
    this.rot = 0; this.drop = 0; this.squash = 0;
    this.eyeJ = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

    if (!pupilTex) pupilTex = circleTex('#101014');
    if (!shadowTex) shadowTex = softShadowTex();

    const g = new THREE.Group();
    const shirt = hex(opts.color);
    const skin = SKINS[(Math.random() * SKINS.length) | 0];
    const hair = HAIRS[(Math.random() * HAIRS.length) | 0];

    // Fake floor shadow.
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(0.9, 0.9, 0.9); g.add(sh); this.shadow = sh;

    // Body billboard.
    this.sx = 1.35; this.sy = 1.78;
    const mat = new THREE.SpriteMaterial({ map: bodyTexture(shirt, skin, hair), transparent: true });
    const body = new THREE.Sprite(mat);
    body.scale.set(this.sx, this.sy, 1); body.position.y = this.sy / 2;
    g.add(body); this.body = body;

    // Jiggly googly pupils.
    this.pupils = [];
    for (const dx of [-0.17, 0.17]) {
      const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: pupilTex, transparent: true, depthTest: false }));
      p.scale.set(0.16, 0.16, 1); p.position.set(dx, this.sy * 0.72, 0.01); p.renderOrder = 5;
      g.add(p); this.pupils.push({ sprite: p, baseX: dx });
    }

    // Carried token (errands).
    const tk = new THREE.Sprite(new THREE.SpriteMaterial({ map: circleTex(shirt), transparent: true }));
    tk.scale.set(0.32, 0.32, 1); tk.position.set(0.4, this.sy * 0.55, 0.02); tk.visible = false;
    g.add(tk); this.token = tk;

    g.position.set(this.home.x, 0, this.home.z);
    this.group = g;
  }

  update(dt, t) {
    if (this.state === 'walk') this._walk(dt, t);
    else if (this.state === 'ragdoll') this._ragdoll(dt, t);
    else if (this.state === 'fight') this._fight(dt, t);
    else this._work(dt, t);
    this._apply(t);
  }

  // Common: push transforms to the sprite + pupils.
  _apply(t) {
    const sx = this.sx * (1 - this.squash * 0.5) * this.faceDir;
    const sy = this.sy * (1 + this.squash);
    this.body.scale.set(sx, sy, 1);
    this.body.position.y = sy / 2 + this.bob - this.drop;
    this.body.material.rotation = this.rot;
    this.shadow.scale.setScalar(0.95 * Math.abs(1 - this.squash * 0.3) * (1 - this.drop * 0.4));
    const showPupils = Math.abs(this.rot) < 0.4 && this.drop < 0.3;
    for (let i = 0; i < 2; i++) {
      const pu = this.pupils[i];
      pu.sprite.visible = showPupils;
      const j = this.eyeJ[i];
      pu.sprite.position.x = pu.baseX * this.faceDir + j.x;
      pu.sprite.position.y = (sy * 0.72) + this.bob - this.drop + j.y;
    }
    this.token.visible = this.carry && this.state === 'walk';
    this.token.position.y = (this.sy * 0.55) + this.bob;
  }

  _googly(dt) {
    for (let i = 0; i < 2; i++) {
      const j = this.eyeJ[i];
      j.x += (Math.random() - 0.5) * dt * 1.4; j.y += (Math.random() - 0.5) * dt * 1.4;
      j.x = clamp(j.x, -0.06, 0.06); j.y = clamp(j.y, -0.06, 0.06);
    }
  }

  _work(dt, t) {
    const g = this.group;
    g.position.x += (this.home.x - g.position.x) * Math.min(1, dt * 6);
    g.position.z += (this.home.z - g.position.z) * Math.min(1, dt * 6);
    const p = t * 4 + this.phase;
    this.squash += (Math.sin(p) * 0.06 - this.squash) * Math.min(1, dt * 8);
    this.bob = Math.abs(Math.sin(p)) * 0.04;
    this.rot += (Math.sin(t * 1.6 + this.phase) * 0.06 - this.rot) * Math.min(1, dt * 6);
    this.drop += (0 - this.drop) * Math.min(1, dt * 8);
    this._googly(dt);
    this.errandCooldown -= dt;
    if (this.errandCooldown <= 0) {
      this.errandCooldown = 7 + Math.random() * 12;
      const e = this.requestErrand(this);
      if (e) { this.carry = !!e.carry; this._startWalk([e, this.home]); }
    }
  }

  _startWalk(points) { this.path = points.map((p) => ({ x: p.x, z: p.z, pause: p.pause || 0 })); this.state = 'walk'; this._pause = 0; }

  _walk(dt, t) {
    const g = this.group;
    if (this._pause > 0) { this._pause -= dt; this._work(0, t); this.state = 'walk'; return; }
    const next = this.path[0];
    if (!next) { this.state = 'work'; this.carry = false; return; }
    const dx = next.x - g.position.x, dz = next.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) { g.position.x = next.x; g.position.z = next.z; this._pause = next.pause; this.path.shift(); if (!this.path.length) { this.state = 'work'; this.carry = false; } return; }
    const step = Math.min(dist, this.speed * dt);
    g.position.x += (dx / dist) * step; g.position.z += (dz / dist) * step;
    if (Math.abs(dx) > 0.02) this.faceDir = dx > 0 ? 1 : -1;
    const p = t * 13 + this.phase;
    this.bob = Math.abs(Math.sin(p)) * 0.16;            // big sloppy hop
    this.squash += ((Math.sin(p) * 0.18) - this.squash) * Math.min(1, dt * 12);
    this.rot += (Math.sin(p) * 0.14 - this.rot) * Math.min(1, dt * 12);
    this.drop += (0 - this.drop) * Math.min(1, dt * 8);
    this._googly(dt);
  }

  ragdoll() {
    if (this.state === 'ragdoll') return;
    this.state = 'ragdoll'; this.stateTimer = 1.5 + Math.random() * 1.3;
    this._rdir = Math.random() < 0.5 ? 1 : -1;
  }
  _ragdoll(dt, t) {
    this.stateTimer -= dt;
    const want = this.stateTimer > 0.5 ? 1 : Math.max(0, this.stateTimer / 0.5);
    this.rot += (this._rdir * 1.45 * want - this.rot) * Math.min(1, dt * 12);
    this.drop += (0.55 * want - this.drop) * Math.min(1, dt * 10);
    this.squash += ((want > 0.4 ? 0.25 : 0) - this.squash) * Math.min(1, dt * 10);
    this.bob = 0;
    if (this.stateTimer <= 0) { this.state = 'work'; }
  }

  fight(partnerPos, dur = 2.2) {
    if (this.state === 'ragdoll') return;
    this.state = 'fight'; this.stateTimer = dur;
    this._ft = partnerPos; this._h0 = { x: this.group.position.x, z: this.group.position.z };
    this.faceDir = (partnerPos.x > this.group.position.x) ? 1 : -1;
  }
  _fight(dt, t) {
    this.stateTimer -= dt;
    const lunge = Math.sin(t * 18 + this.phase) * 0.5 + 0.5;
    const hx = this._h0.x + (this._ft.x - this._h0.x) * 0.16 * lunge;
    const hz = this._h0.z + (this._ft.z - this._h0.z) * 0.16 * lunge;
    this.group.position.x += (hx - this.group.position.x) * Math.min(1, dt * 12);
    this.group.position.z += (hz - this.group.position.z) * Math.min(1, dt * 12);
    this.rot = Math.sin(t * 26) * 0.4;
    this.squash = Math.sin(t * 30) * 0.15;
    this.bob = Math.abs(Math.sin(t * 22)) * 0.1;
    this._googly(dt);
    if (this.stateTimer <= 0) { this.state = 'work'; this.rot = 0; }
  }

  // Quick "got told to work" pop — stretch up then settle.
  workPop() { if (this.state === 'work' || this.state === 'walk') { this.squash = -0.3; this.bob = 0.24; } }

  dispose() { this.group.removeFromParent(); }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
