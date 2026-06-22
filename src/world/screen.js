// ============================================================================
//  The giant lobby screen — a wall-mounted display rendering live company
//  stats via a CanvasTexture: follower count, revenue/sec, trending products,
//  and a big "VIRAL!" takeover during spikes.
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { fmt, money } from '../core/format.js';
import { drawMeme as paintMeme } from '../sim/brainrot.js';

export class BigScreen {
  constructor(width = 7, height = 3.4) {
    this.w = width; this.h = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; this.canvas.height = 500;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;

    const group = new THREE.Group();
    // Bezel.
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.5, height + 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.5, metalness: 0.3 }));
    frame.castShadow = true; frame.receiveShadow = true;
    group.add(frame);
    // Screen surface.
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }));
    panel.position.z = 0.18;
    group.add(panel);
    this.group = group;
    this._t = 0;
    this.draw({ followers: 0, perSec: 0, money: 0, products: [], viral: false });
  }

  // Paint a live brainrot meme across the whole screen (with a "now trending" bar).
  drawMeme(meme, t = 0) {
    paintMeme(this.canvas, meme, t);
    const ctx = this.ctx, W = this.canvas.width;
    ctx.fillStyle = 'rgba(8,12,24,0.42)';
    ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = '#7bffb0';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('● AI SLOP.CO  ·  NOW TRENDING', 22, 26);
    this.tex.needsUpdate = true;
  }

  draw(data) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    // Background gradient.
    const g = ctx.createLinearGradient(0, 0, W, H);
    if (data.viral) { g.addColorStop(0, '#ff4d8d'); g.addColorStop(1, '#7a1f5a'); }
    else { g.addColorStop(0, '#3a1f7a'); g.addColorStop(0.5, '#1a2a6c'); g.addColorStop(1, '#0a1030'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Subtle grid.
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

    if (data.viral) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 150px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🔥 VIRAL 🔥', W / 2, H / 2 - 20);
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText('the feed belongs to you', W / 2, H / 2 + 90);
      this.tex.needsUpdate = true;
      return;
    }

    // Header.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#7bffd0';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText('🦠 BRAINROT ZOO  ·  LIVE', 40, 60);
    if (data.level != null) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'right'; ctx.fillText('Lv ' + data.level, W - 40, 60); ctx.textAlign = 'left';
    }

    // Follower hero number (with glow).
    ctx.save();
    ctx.shadowColor = '#6cc6ff'; ctx.shadowBlur = 28;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 120px system-ui, sans-serif';
    ctx.fillText(fmt(data.followers), 40, 190);
    ctx.restore();
    ctx.fillStyle = '#9fb3d1';
    ctx.font = '30px system-ui, sans-serif';
    ctx.fillText('followers', 44, 230);

    // Revenue.
    ctx.save();
    ctx.shadowColor = '#49e07d'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#7bffb0';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText(`${money(data.perSec)}/s`, 44, 300);
    ctx.restore();
    ctx.fillStyle = '#9fb3d1';
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(`${money(data.money)} in the bank`, 44, 338);

    // Trending products as bars on the right.
    const items = data.products.slice(0, 6);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    let y = 90;
    ctx.fillStyle = '#cdd9ee';
    ctx.fillText('TRENDING', 620, 60);
    const max = Math.max(1, ...items.map((p) => p.v));
    for (const p of items) {
      const bw = 300 * (p.v / max);
      ctx.fillStyle = p.color || '#6cc6ff';
      roundRect(ctx, 620, y, bw, 28, 8); ctx.fill();
      ctx.fillStyle = '#e7eefb';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(`${p.icon} ${p.name}`, 624, y + 22);
      y += 46;
    }

    // Ticker.
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, H - 46, W, 46);
    ctx.fillStyle = '#9fb3d1';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(data.ticker || '📈 followers up · 💸 revenue flowing · 🤖 slop levels nominal', 40, H - 16);

    this.tex.needsUpdate = true;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
