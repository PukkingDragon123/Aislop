// ============================================================================
//  The Doomscroll — a phone-style feed of live, procedurally-generated brainrot
//  posts. New "AI content" streams in continuously; like/view counters tick up;
//  tapping a post boosts engagement for a little Hype + cash. Pure dopamine.
// ============================================================================

import { el } from './dom.js';
import { fmt, money } from '../core/format.js';
import { bus } from '../core/events.js';
import { state } from '../core/state.js';
import { getRates } from '../sim/economy.js';
import { randomMeme, memeFromChar, drawMeme } from '../sim/brainrot.js';
import { ROSTER_BY_ID, RARITIES } from '../core/config.js';

const MAX_POSTS = 16;
const HANDLES = ['slopfactory', 'ai_overlord', 'brainrot.inc', 'tung_enjoyer', 'memewhale',
  'crocodilo_fan', 'feedgoblin', 'p99_andy', 'dataslop', 'viralpilled', 'doomscroller', 'no.thoughts'];

let fab, panel, scroll, badge;
let posts = [];
let unread = 0;
let streamTimer = 2;
let open = false;

export function initFeed(container) {
  fab = el('button', { class: 'feed-fab', onclick: toggle }, [
    el('span', { text: '📱' }),
  ]);
  badge = el('span', { class: 'feed-badge hidden', text: '0' });
  fab.appendChild(badge);

  scroll = el('div', { class: 'feed-scroll' });
  panel = el('div', { class: 'feed-panel hidden' }, [
    el('div', { class: 'feed-phone' }, [
      el('div', { class: 'feed-head' }, [
        el('div', { class: 'feed-brand', html: '✨ <b>For You</b>' }),
        el('button', { class: 'feed-close', text: '✕', onclick: toggle }),
      ]),
      scroll,
    ]),
  ]);

  container.append(fab, panel);

  // React to sim events.
  bus.on('discovered', ({ char }) => addPost(memeFromChar(char), { kind: 'new', char }));
  bus.on('viral', () => addPost(randomMeme(), { kind: 'viral' }));
  bus.on('trend', (t) => { const c = ROSTER_BY_ID[t.id]; if (c) addPost(memeFromChar(c), { kind: 'trend' }); });

  // Seed a few posts so the feed isn't empty on open.
  for (let i = 0; i < 4; i++) addPost(randomMeme(), { kind: 'ambient', silent: true });
}

function toggle() {
  open = !open;
  panel.classList.toggle('hidden', !open);
  requestAnimationFrame(() => panel.classList.toggle('show', open));
  fab.classList.toggle('active', open);
  if (open) { unread = 0; badge.classList.add('hidden'); }
}

// --------------------------------------------------------------------------
//  Posts
// --------------------------------------------------------------------------
function addPost(meme, { kind = 'ambient', char = null, silent = false } = {}) {
  const viral = kind === 'viral';
  const isNew = kind === 'new';
  const isTrend = kind === 'trend';

  const base = viral ? 80000 : isNew ? 12000 : isTrend ? 26000 : 200 + Math.random() * 4000;
  const data = {
    likes: base * (0.6 + Math.random() * 0.4),
    views: base * (6 + Math.random() * 8),
    comments: base * 0.05,
    reposts: base * 0.08,
    lps: (viral ? 9000 : isNew ? 2500 : isTrend ? 4000 : 30 + Math.random() * 400), // likes/sec
    boosted: 0,
  };

  const handle = '@' + HANDLES[Math.floor(Math.random() * HANDLES.length)];
  const rarityColor = (char && RARITIES[char.rarity]) ? RARITIES[char.rarity].color : '#9aa6c0';

  const img = el('canvas', { class: 'post-img', width: 300, height: 300 });
  drawMeme(img, meme, Math.random() * 10);

  const likeBtn = el('button', { class: 'pa like' }, [el('span', { text: '🤍' }), el('b', { text: fmt(data.likes) })]);
  const viewsEl = el('b', { text: fmt(data.views) });
  const commentsEl = el('b', { text: fmt(data.comments) });
  const repostsEl = el('b', { text: fmt(data.reposts) });

  const tagBits = [];
  if (isNew) tagBits.push(el('span', { class: 'post-flag new', text: '✦ NEW DISCOVERY' }));
  if (viral) tagBits.push(el('span', { class: 'post-flag viral', text: '🔥 GOING VIRAL' }));
  if (isTrend) tagBits.push(el('span', { class: 'post-flag trend', text: '📈 TRENDING NOW' }));

  const node = el('div', { class: 'post' + (viral ? ' is-viral' : '') }, [
    el('div', { class: 'post-head' }, [
      el('div', { class: 'post-av', text: meme.emoji[0], style: { boxShadow: `0 0 0 2px ${rarityColor}` } }),
      el('div', { class: 'post-who' }, [
        el('div', { class: 'post-handle', text: handle }),
        el('div', { class: 'post-meta', text: `${(Math.random() * 9 + 1) | 0}m · 🌍 Public` }),
      ]),
      ...tagBits,
    ]),
    img,
    el('div', { class: 'post-actions' }, [
      likeBtn,
      el('button', { class: 'pa', }, [el('span', { text: '💬' }), commentsEl]),
      el('button', { class: 'pa' }, [el('span', { text: '🔁' }), repostsEl]),
      el('div', { class: 'pa views' }, [el('span', { text: '👁' }), viewsEl]),
    ]),
    el('div', { class: 'post-cap' }, [
      el('b', { text: meme.name + ' ' }),
      el('span', { text: meme.caption + ' ' }),
      el('span', { class: 'post-tag', text: meme.tag }),
    ]),
  ]);

  const post = { node, data, refs: { likes: likeBtn.querySelector('b'), views: viewsEl, comments: commentsEl, reposts: repostsEl }, likeBtn };
  const boost = () => doBoost(post, likeBtn);
  img.addEventListener('click', boost);
  likeBtn.addEventListener('click', boost);

  scroll.prepend(node);
  posts.unshift(post);
  requestAnimationFrame(() => node.classList.add('in'));

  while (posts.length > MAX_POSTS) {
    const old = posts.pop();
    old.node.remove();
  }

  if (!silent && !open) {
    unread = Math.min(99, unread + 1);
    badge.textContent = String(unread);
    badge.classList.remove('hidden');
  }
}

// Tap-to-boost: a small, juicy active reward layered on top of idle income.
function doBoost(post, likeBtn) {
  const rates = getRates();
  const hypeGain = Math.max(0.5, rates.hype * 4);
  const cashGain = Math.max(1, rates.money * 3);
  state.hype += hypeGain;
  state.money += cashGain;
  post.data.likes += Math.max(50, post.data.lps * 0.5);
  post.data.boosted += 1;

  likeBtn.firstChild.textContent = '❤️';
  likeBtn.classList.add('liked');

  const pop = el('div', { class: 'boost-pop', html: `+${money(cashGain)} · +${fmt(hypeGain)}⚡` });
  post.node.appendChild(pop);
  requestAnimationFrame(() => pop.classList.add('go'));
  setTimeout(() => pop.remove(), 900);
}

// --------------------------------------------------------------------------
//  Per-frame: tick counters and stream new ambient posts.
// --------------------------------------------------------------------------
export function updateFeed(dt) {
  // Stream ambient content even when closed (so the feed feels alive on open).
  streamTimer -= dt;
  if (streamTimer <= 0) {
    streamTimer = 3 + Math.random() * 3.5;
    addPost(randomMeme(), { kind: 'ambient' });
  }

  if (!open) return; // only animate counters while visible
  for (const p of posts) {
    p.data.likes += p.data.lps * dt;
    p.data.views += p.data.lps * (7 + 3) * dt;
    p.data.comments += p.data.lps * 0.04 * dt;
    p.data.reposts += p.data.lps * 0.06 * dt;
    p.data.lps *= 1 - 0.04 * dt; // engagement slowly cools off
    p.refs.likes.textContent = fmt(p.data.likes);
    p.refs.views.textContent = fmt(p.data.views);
    p.refs.comments.textContent = fmt(p.data.comments);
    p.refs.reposts.textContent = fmt(p.data.reposts);
  }
}
