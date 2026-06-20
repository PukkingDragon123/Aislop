// ============================================================================
//  Mini-game: "Content Sprint" — a 3-round timing QTE. Stop the sweeping marker
//  inside the glowing zone; the better your timing, the bigger the payout (and
//  a perfect run grants a short 2× boost). Quick, juicy, skippable.
// ============================================================================

import { el, clear } from './dom.js';
import { fmt, money } from '../core/format.js';
import { applySprintResult } from '../sim/meta.js';

const ROUNDS = 3;
let overlay, trackWrap, marker, zone, stopBtn, statusEl, roundEl;
let raf = 0, lastT = 0, pos = 0, dir = 1, speed = 1, zc = 0.5, zw = 0.16;
let round = 0, totalQ = 0, active = false;

export function openSprint() {
  round = 0; totalQ = 0; active = true;

  marker = el('div', { class: 'mg-marker' });
  zone = el('div', { class: 'mg-zone' });
  trackWrap = el('div', { class: 'mg-track' }, [zone, marker]);
  statusEl = el('div', { class: 'mg-status', text: 'Tap STOP in the glowing zone!' });
  roundEl = el('div', { class: 'mg-round' });
  stopBtn = el('button', { class: 'mg-stop', text: 'STOP', onclick: hit });

  overlay = el('div', { class: 'mg-overlay' }, [
    el('div', { class: 'mg-card' }, [
      el('div', { class: 'mg-head' }, [
        el('div', { class: 'mg-title', text: '⚡ Content Sprint' }),
        el('button', { class: 'mg-close', text: '✕', onclick: () => finish(true) }),
      ]),
      roundEl,
      trackWrap,
      statusEl,
      stopBtn,
    ]),
  ]);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  startRound();
}

function startRound() {
  speed = 0.85 + round * 0.4;
  zw = 0.17 - round * 0.035;
  zc = 0.2 + Math.random() * 0.6;
  pos = Math.random(); dir = Math.random() < 0.5 ? 1 : -1;
  zone.style.left = `${(zc - zw) * 100}%`;
  zone.style.width = `${zw * 200}%`;
  roundEl.textContent = `Round ${round + 1} / ${ROUNDS}`;
  stopBtn.disabled = false;
  lastT = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  pos += dir * speed * dt;
  if (pos > 1) { pos = 1; dir = -1; }
  if (pos < 0) { pos = 0; dir = 1; }
  marker.style.left = `${pos * 100}%`;
  if (active) raf = requestAnimationFrame(loop);
}

function hit() {
  if (!active) return;
  cancelAnimationFrame(raf);
  stopBtn.disabled = true;
  const q = Math.max(0, 1 - Math.abs(pos - zc) / zw);
  totalQ += q;
  const label = q > 0.9 ? 'PERFECT! ✨' : q > 0.6 ? 'Great! 🔥' : q > 0.25 ? 'Good 👍' : 'Miss 💀';
  statusEl.textContent = label;
  statusEl.className = 'mg-status ' + (q > 0.6 ? 'good' : q > 0.25 ? 'ok' : 'bad');

  round++;
  if (round >= ROUNDS) setTimeout(showResult, 650);
  else setTimeout(startRound, 650);
}

function showResult() {
  active = false;
  const quality = totalQ / ROUNDS;
  const res = applySprintResult(quality);
  clear(overlay.querySelector('.mg-card'));
  const grade = quality > 0.85 ? 'LEGENDARY RUN' : quality > 0.6 ? 'Nice work!' : quality > 0.3 ? 'Not bad' : 'Keep practising';
  overlay.querySelector('.mg-card').append(
    el('div', { class: 'mg-result-grade', text: grade }),
    el('div', { class: 'mg-result-rows' }, [
      el('div', { class: 'mg-reward', html: `<span>💰</span> +${money(res.cash)}` }),
      el('div', { class: 'mg-reward', html: `<span>⚡</span> +${fmt(res.hype)}` }),
      ...(res.boost ? [el('div', { class: 'mg-reward boost', html: `<span>🚀</span> ${res.boost}` })] : []),
    ]),
    el('button', { class: 'mg-stop', text: 'Collect', onclick: () => finish(false) }),
  );
}

function finish() {
  active = false;
  cancelAnimationFrame(raf);
  if (!overlay) return;
  overlay.classList.remove('show');
  const o = overlay; overlay = null;
  setTimeout(() => o.remove(), 280);
}
