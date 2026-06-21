// ============================================================================
//  "AI" brainrot meme generator.
//  Procedurally invents Italian-brainrot characters and draws meme images to a
//  <canvas> in real time — no external AI / image assets. Fully self-contained:
//  callers pass in roster characters; ambient memes are invented from scratch.
// ============================================================================

// --- seeded RNG so a given meme always draws the same way --------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- name fragments — combine into plausible brainrot names ------------------
const NAME_A = ['Tralalero', 'Bombardiro', 'Tung Tung', 'Brr Brr', 'Lirilì', 'Cappuccino',
  'Frigo', 'Glorbo', 'Trippi', 'Chimpanzini', 'Bombombini', 'Ballerina', 'Boneca',
  'Spioniro', 'Trulimero', 'Bananita', 'Crocodilo', 'Saturnino', 'Pufferino', 'Zibra'];
const NAME_B = ['Tralala', 'Crocodilo', 'Sahur', 'Patapim', 'Larilà', 'Assassino', 'Camelo',
  'Fruttodrillo', 'Troppi', 'Bananini', 'Gusini', 'Cappuccina', 'Ambalabu', 'Golubiro',
  'Trulic海', 'Dinosauro', 'Pizzeria', 'Robloxini', 'Spaghettini', 'Mariposa'];

const EMOJIS = ['🦈', '🐊', '🐵', '🍌', '☕', '🩰', '✈️', '🌵', '🐘', '🪿', '🐱', '🦐', '🧊',
  '🐫', '🐸', '🛞', '🍉', '🚜', '🐙', '🦒', '🐋', '🎧', '🕊️', '📷', '🍕', '🤖', '🐡', '🎮',
  '🦖', '🪵', '🥥', '🦅', '🐧', '🍄', '👟', '🚀'];

const PALETTES = [
  ['#ff2e9a', '#7a1bff', '#00e1ff'], ['#ff6a00', '#ff0080', '#7d00ff'],
  ['#00ffa3', '#00b3ff', '#0050ff'], ['#fffb00', '#ff7b00', '#ff0048'],
  ['#ff00d4', '#00fff0', '#fbff00'], ['#12c2e9', '#c471ed', '#f64f59'],
  ['#08f', '#0fa', '#f0f'], ['#ff5e62', '#ff9966', '#ffd200'],
  ['#a8ff00', '#00ffd5', '#9d00ff'], ['#ff1361', '#fff200', '#44107a'],
];

const CAPTIONS = [
  'he\'s just like me fr 💀', 'POV: the algorithm at 3am', 'no thoughts only vibes',
  'this is so brainrot 😭', '0 to 10M speedrun any%', 'why is he like this',
  'real ones know 🔥', 'the lore is insane', 'tung tung tung tung tung',
  'sigma grindset unlocked', 'certified hood classic', 'it\'s giving everything',
  'closing the laptop forever', 'new fear unlocked', 'roblox players rise up 🎮',
  'me explaining the meta to my mom', 'caffeine: yes. sleep: no.', 'absolute cinema 🎬',
];

const TAGS = ['#brainrot', '#fyp', '#aislop', '#italianbrainrot', '#viral', '#trending',
  '#meme', '#sigma', '#roblox', '#realtime', '#aigen', '#nosleep'];

let _uid = 1;

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

/** Invent a fresh ambient meme (not part of the collectible roster). */
export function randomMeme(rng = Math.random) {
  const seed = Math.floor((typeof rng === 'function' ? rng() : Math.random()) * 1e9);
  const r = mulberry32(seed);
  const name = `${pick(r, NAME_A)} ${pick(r, NAME_B)}`;
  const e1 = pick(r, EMOJIS);
  let e2 = pick(r, EMOJIS); if (e2 === e1) e2 = pick(r, EMOJIS);
  return {
    id: 'm' + (_uid++), name, emoji: [e1, e2],
    rarity: 'common', palette: pick(r, PALETTES), seed,
    caption: pick(r, CAPTIONS), tag: pick(r, TAGS),
  };
}

/** Build a meme descriptor from a fixed roster character (config.ROSTER item). */
export function memeFromChar(char) {
  const seed = hashStr(char.id);
  const r = mulberry32(seed);
  return {
    id: char.id, name: char.name, emoji: char.emoji.slice(0, 2),
    rarity: char.rarity, palette: PALETTES[seed % PALETTES.length], seed,
    caption: char.blurb || pick(r, CAPTIONS), tag: pick(r, TAGS),
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 1e9;
}

const RARITY_LABEL = { common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY', mythic: 'MYTHIC' };
const RARITY_COLOR = { common: '#9aa6c0', rare: '#4fa3ff', epic: '#b06bff', legendary: '#ffb02e', mythic: '#ff4d8d' };

// --------------------------------------------------------------------------
//  Draw a meme into a canvas. Layout is seed-stable; `t` adds gentle wiggle.
// --------------------------------------------------------------------------
export function drawMeme(canvas, meme, t = 0) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const r = mulberry32(meme.seed);
  const [c1, c2, c3] = meme.palette;

  ctx.clearRect(0, 0, W, H);

  // Background diagonal gradient.
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Rotating sunburst rays.
  ctx.save();
  ctx.translate(W / 2, H * 0.52);
  ctx.rotate(t * 0.15 + meme.seed);
  ctx.globalAlpha = 0.10;
  const rays = 16;
  for (let i = 0; i < rays; i++) {
    ctx.rotate((Math.PI * 2) / rays);
    ctx.fillStyle = i % 2 ? '#ffffff' : c3;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(W, -W * 0.12); ctx.lineTo(W, W * 0.12); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // Center radial glow.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const rg = ctx.createRadialGradient(W / 2, H * 0.52, 0, W / 2, H * 0.52, W * 0.6);
  rg.addColorStop(0, c3); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.5; ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Scattered sticker emojis (seed-stable).
  const stickers = ['✨', '🔥', '💀', '⭐', '💥', '🤯'];
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 6; i++) {
    const sx = r() * W, sy = r() * H * 0.9;
    const ss = H * (0.06 + r() * 0.05);
    ctx.font = `${ss}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pick(r, stickers), sx, sy);
  }
  ctx.globalAlpha = 1;

  // Main fused subject: big emoji + overlapping second emoji.
  const cx = W / 2, cy = H * 0.54;
  const wob = Math.sin(t * 2 + meme.seed) * 0.08;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(wob);
  ctx.font = `${H * 0.46}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = H * 0.04; ctx.shadowOffsetY = H * 0.015;
  ctx.fillText(meme.emoji[0], 0, 0);
  ctx.restore();
  if (meme.emoji[1]) {
    ctx.save();
    ctx.translate(cx + W * 0.18, cy + H * 0.12); ctx.rotate(-wob * 1.5);
    ctx.font = `${H * 0.26}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(meme.emoji[1], 0, 0);
    ctx.restore();
  }

  // Googly eyes (the universal brainrot signifier).
  const eyeY = cy - H * 0.12, eyeR = H * 0.066, gap = W * 0.12;
  for (const ex of [cx - gap, cx + gap]) {
    ctx.beginPath(); ctx.fillStyle = '#fff';
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1, H * 0.006); ctx.strokeStyle = '#1b1b1b'; ctx.stroke();
    const px = ex + Math.cos(t * 3 + ex) * eyeR * 0.4;
    const py = eyeY + Math.sin(t * 3.5 + ex) * eyeR * 0.4;
    ctx.beginPath(); ctx.fillStyle = '#101010';
    ctx.arc(px, py, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  // Name caption (impact-style) top.
  drawMemeText(ctx, meme.name.toUpperCase(), W / 2, H * 0.13, H * 0.11, W * 0.94);
  // Tagline bottom.
  drawMemeText(ctx, meme.caption, W / 2, H * 0.9, H * 0.066, W * 0.92);

  // Rarity badge.
  if (meme.rarity && meme.rarity !== 'common') {
    const label = RARITY_LABEL[meme.rarity] || 'RARE';
    const col = RARITY_COLOR[meme.rarity] || '#4fa3ff';
    ctx.font = `bold ${H * 0.05}px system-ui, sans-serif`;
    const tw = ctx.measureText(label).width + H * 0.06;
    const bx = W - tw - H * 0.03, by = H * 0.03;
    ctx.fillStyle = col; roundRect(ctx, bx, by, tw, H * 0.085, H * 0.02); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + tw / 2, by + H * 0.045);
  }

  // Vignette.
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function drawMemeText(ctx, text, x, y, size, maxW) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let fs = size;
  ctx.font = `900 ${fs}px Impact, system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxW && fs > 8) {
    fs -= 1; ctx.font = `900 ${fs}px Impact, system-ui, sans-serif`;
  }
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, fs * 0.16);
  ctx.strokeStyle = 'rgba(10,10,20,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);
}

function roundRect(ctx, x, y, w, h, rad) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Convenience: make a fresh canvas with a meme already drawn. */
export function renderMemeCanvas(size, meme) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  drawMeme(c, meme, 0);
  return c;
}

/**
 * Best available art for a roster character: a real image (e.g. a Higgsfield
 * render set on char.img) when present, otherwise charming procedural art.
 * Returns a DOM element sized to `size`px square.
 */
export function charArt(char, size) {
  if (char && char.img) {
    const im = document.createElement('img');
    im.src = char.img; im.alt = char.name; im.loading = 'lazy';
    im.width = size; im.height = size;
    im.style.width = '100%'; im.style.height = '100%'; im.style.objectFit = 'cover'; im.style.display = 'block';
    return im;
  }
  const cv = renderMemeCanvas(size, memeFromChar(char));
  cv.style.width = '100%'; cv.style.height = '100%'; cv.style.display = 'block';
  return cv;
}
