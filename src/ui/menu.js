// ============================================================================
//  Title / main menu — the polished first impression. Neon brainrot hero over
//  the live 3D office, drifting meme emojis, and one big juicy Play button.
// ============================================================================

import { el } from './dom.js';
import { fmt, money } from '../core/format.js';
import { state } from '../core/state.js';

const FLOATERS = ['🦈', '🐊', '☕', '🩰', '🍌', '🪿', '🤖', '🎮', '🔥', '✨', '🐵', '🛞', '🦒', '💎', '📱'];

let overlay;
let dioTimer = null;

export function showMenu({ fresh, onPlay, onTutorial, onReset, onLoad }) {
  overlay = el('div', { class: 'menu' });

  // Drifting meme background.
  const bg = el('div', { class: 'menu-bg' });
  for (let i = 0; i < 16; i++) {
    const f = el('div', { class: 'menu-floater', text: FLOATERS[i % FLOATERS.length] });
    f.style.left = `${Math.random() * 100}%`;
    f.style.fontSize = `${28 + Math.random() * 46}px`;
    f.style.animationDuration = `${9 + Math.random() * 10}s`;
    f.style.animationDelay = `${-Math.random() * 16}s`;
    f.style.opacity = `${0.12 + Math.random() * 0.22}`;
    bg.appendChild(f);
  }

  const playLabel = fresh ? 'Start your empire' : 'Continue';
  const statsRow = fresh ? null : el('div', { class: 'menu-stats' }, [
    menuStat('👥', fmt(state.followers), 'followers'),
    menuStat('💰', money(state.lifetimeMoney), 'earned'),
    menuStat('🏆', fmt(countDiscovered()), 'collected'),
  ]);

  // Little diorama: an employee at a desk watching a brainrot on the monitor.
  const brainrotEl = el('div', { class: 'mdio-brainrot', text: '🦈' });
  const diorama = el('div', { class: 'menu-diorama' }, [
    el('div', { class: 'mdio-monitor' }, [el('div', { class: 'mdio-screen' }, [brainrotEl]), el('div', { class: 'mdio-stand' })]),
    el('div', { class: 'mdio-emp' }, [
      el('div', { class: 'mdio-head' }, [el('div', { class: 'mdio-eye' }), el('div', { class: 'mdio-eye' })]),
      el('div', { class: 'mdio-body' }),
    ]),
    el('div', { class: 'mdio-desk' }),
  ]);
  const ROT = ['🦈', '🐊', '🍌', '🩰', '🦒', '🐋', '☕', '🪿'];
  let ri = 0;
  clearInterval(dioTimer);
  dioTimer = setInterval(() => { ri = (ri + 1) % ROT.length; brainrotEl.textContent = ROT[ri]; }, 1100);

  const card = el('div', { class: 'menu-card' }, [
    diorama,
    el('h1', { class: 'menu-title', html: 'BRAINROT&nbsp;<span>ZOO</span>' }),
    el('p', { class: 'menu-tag', text: 'Generate brainrots. Run the zoo. Get rich. Go feral.' }),
    statsRow,
    el('button', { class: 'menu-play', onclick: () => close(onPlay) }, [
      el('span', { class: 'menu-play-ico', text: fresh ? '🚀' : '▶' }),
      el('span', { text: playLabel }),
    ]),
    el('div', { class: 'menu-links' }, [
      el('button', { class: 'menu-link', text: '❓ How to play', onclick: () => close(onTutorial) }),
      el('button', { class: 'menu-link', text: '📥 Load Save', onclick: () => onLoad && onLoad() }),
      el('button', { class: 'menu-link', text: '🗑 Reset', onclick: () => onReset && onReset() }),
    ]),
    el('div', { class: 'menu-foot', text: 'a cozy idle tycoon · made with Three.js' }),
  ]);

  overlay.append(bg, card);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function close(cb) {
  clearInterval(dioTimer); dioTimer = null;
  if (!overlay) { if (cb) cb(); return; }
  overlay.classList.remove('show');
  overlay.classList.add('out');
  setTimeout(() => { overlay.remove(); overlay = null; if (cb) cb(); }, 480);
}

function menuStat(icon, value, label) {
  return el('div', { class: 'menu-stat' }, [
    el('div', { class: 'menu-stat-ico', text: icon }),
    el('div', { class: 'menu-stat-val', text: value }),
    el('div', { class: 'menu-stat-label', text: label }),
  ]);
}

function countDiscovered() {
  return Object.keys(state.collection).length;
}
