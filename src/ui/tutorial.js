// ============================================================================
//  First-run tutorial — a friendly coachmark tour. Spotlights real UI elements
//  with a mascot bubble; fully skippable; only runs once (saved).
// ============================================================================

import { el } from './dom.js';
import { state, saveState } from '../core/state.js';

const STEPS = [
  { title: 'Welcome to AI Slop.co!', text: 'You run an AI content company. Let\'s take a 20-second tour.' },
  { sel: '.hud-stats', title: 'Your resources', text: 'Money 💰, followers 👥 and Hype ⚡ all flow up here in real time.' },
  { sel: '.tool-btn[data-tab="staff"]', title: 'Hire your team', text: 'Content flows through 5 stages. Hire staff and keep every stage balanced — the slowest one throttles everything.' },
  { sel: '.tool-btn[data-tab="lab"]', title: 'The Meme Lab', text: 'Fuse Hype to discover brainrot characters. Each one you collect boosts all income forever.' },
  { sel: '.feed-fab', title: 'The Doomscroll', text: 'Watch your AI content go viral in the feed — and tap posts to boost them for bonus Hype & cash.' },
  { sel: '.act-store', title: 'Boosts & Store', text: 'Watch a quick ad for a free boost, or spend gems on big multipliers.' },
  { sel: '.quest-chip', title: 'Follow your quests', text: 'Quests guide you and pay out rewards. Tap here anytime to see your goals.' },
  { title: 'You\'re all set! 🚀', text: 'Now go build the world\'s largest AI slop empire.' },
];

export function startTutorial(onDone) {
  let i = 0;
  const root = el('div', { class: 'tut' });
  const hole = el('div', { class: 'tut-hole' });
  root.appendChild(hole);

  const titleEl = el('div', { class: 'tut-title' });
  const textEl = el('div', { class: 'tut-text' });
  const stepEl = el('div', { class: 'tut-step' });
  const nextBtn = el('button', { class: 'tut-next', onclick: next });
  const bubble = el('div', { class: 'tut-bubble' }, [
    el('div', { class: 'tut-mascot', text: '🤖' }),
    el('div', { class: 'tut-body' }, [titleEl, textEl, el('div', { class: 'tut-row' }, [
      stepEl,
      el('button', { class: 'tut-skip', text: 'Skip', onclick: finish }),
      nextBtn,
    ])]),
  ]);

  document.body.append(root, bubble);
  window.addEventListener('resize', render);
  requestAnimationFrame(() => { root.classList.add('show'); bubble.classList.add('show'); render(); });

  function render() {
    const s = STEPS[i];
    titleEl.textContent = s.title;
    textEl.textContent = s.text;
    stepEl.textContent = `${i + 1} / ${STEPS.length}`;
    nextBtn.textContent = i === STEPS.length - 1 ? 'Let\'s go!' : 'Next';

    const target = s.sel ? document.querySelector(s.sel) : null;
    const r = target && target.getBoundingClientRect();
    if (r && r.width > 0) {
      const pad = 8;
      hole.style.display = 'block';
      hole.style.left = `${r.left - pad}px`;
      hole.style.top = `${r.top - pad}px`;
      hole.style.width = `${r.width + pad * 2}px`;
      hole.style.height = `${r.height + pad * 2}px`;
      root.classList.remove('full');
    } else {
      hole.style.display = 'none';
      root.classList.add('full');
    }
  }

  function next() { if (i >= STEPS.length - 1) finish(); else { i++; render(); } }

  function finish() {
    window.removeEventListener('resize', render);
    root.classList.remove('show'); bubble.classList.remove('show');
    setTimeout(() => { root.remove(); bubble.remove(); }, 350);
    state.tutorialDone = true;
    saveState();
    if (onDone) onDone();
  }
}
