// ============================================================================
//  Procedural 3D brainrot creatures — hand-tuned low-poly "blob mascots".
//  Each roster character becomes a charming little guy: rounded bean body in a
//  cohesive per-rarity palette, a soft belly, blushing cheeks, big shiny googly
//  eyes, a smile, stubby waving arms + feet, and seed-driven flair (ears / fin /
//  antenna / tail). Rare tiers get crowns; mythic/diamond get a glowing halo.
//  Animation hooks live in userData and are driven by office.updatePets().
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { RARITIES } from '../core/config.js';
import { sphere, cyl, box, mat } from './furniture.js';

// Cohesive, hand-picked palette per rarity (body / soft belly / accent / cheek).
const SKIN = {
  common:    { body: 0xc2cde0, belly: 0xeef2fb, accent: 0x97a6c6, cheek: 0xffb3c1, ei: 0.0 },
  rare:      { body: 0x5aa6ff, belly: 0xcbe6ff, accent: 0x2f7fe0, cheek: 0xff9ec4, ei: 0.05 },
  epic:      { body: 0xb06bff, belly: 0xe7d6ff, accent: 0x8a3fe0, cheek: 0xff8fd0, ei: 0.12 },
  legendary: { body: 0xffb02e, belly: 0xffe6b3, accent: 0xe07f12, cheek: 0xff8a63, ei: 0.16, crown: true },
  mythic:    { body: 0xff4d8d, belly: 0xffc9dc, accent: 0xe0246e, cheek: 0xffd7e4, ei: 0.22, halo: true },
  gold:      { body: 0xffcf33, belly: 0xfff0aa, accent: 0xd9a300, cheek: 0xffdc8a, ei: 0.18, metal: 0.9, crown: true },
  diamond:   { body: 0x86e4ff, belly: 0xe6faff, accent: 0x2bd0ff, cheek: 0xc4f1ff, ei: 0.34, metal: 0.5, halo: true },
};

const emojiCache = new Map();
function emojiTexture(emoji) {
  if (emojiCache.has(emoji)) return emojiCache.get(emoji);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = '92px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 72);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  emojiCache.set(emoji, t); return t;
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildBrainrot(char) {
  const sk = SKIN[char.rarity] || SKIN.common;
  const rng = mulberry(hash(char.id));
  const variant = hash(char.id) % 5;
  const g = new THREE.Group();
  const bodyOpts = { rough: sk.metal ? 0.28 : 0.5, metal: sk.metal || 0, emissive: sk.ei ? sk.body : 0x000000, ei: sk.ei };

  // ---- bean body (varies a little per character) ----
  const tall = 1.05 + rng() * 0.2;
  const wide = 0.92 + rng() * 0.12;
  const body = sphere(0.5, sk.body, { detail: 3, ...bodyOpts });
  body.scale.set(wide, tall, wide * 0.97); body.position.y = 0.52;
  g.add(body); g.userData.body = body; g.userData.bodyBaseScale = body.scale.clone();

  // ---- lighter belly patch ----
  const belly = sphere(0.5, sk.belly, { detail: 2, rough: 0.6 });
  belly.scale.set(wide * 0.6, tall * 0.6, 0.46); belly.position.set(0, 0.44, wide * 0.5);
  belly.castShadow = false; g.add(belly);

  // ---- blush cheeks ----
  for (const dx of [-1, 1]) {
    const cheek = sphere(0.1, sk.cheek, { detail: 1, rough: 0.7 });
    cheek.scale.set(1, 0.66, 0.4); cheek.position.set(dx * 0.27, 0.62, wide * 0.43);
    cheek.castShadow = false; g.add(cheek);
  }

  // ---- big shiny googly eyes ----
  g.userData.eyes = []; g.userData.pupils = [];
  const eyeY = 0.78 + (tall - 1) * 0.2;
  const eyeGap = 0.16 + rng() * 0.03;
  for (const dx of [-1, 1]) {
    const wrap = new THREE.Group();
    const white = sphere(0.155, 0xffffff, { detail: 2, rough: 0.12 }); white.scale.z = 0.6; wrap.add(white);
    const pupil = sphere(0.08, 0x14161d, { detail: 1, rough: 0.2 }); pupil.position.set(0, 0, 0.12); wrap.add(pupil);
    const shine = sphere(0.03, 0xffffff, { detail: 0, emissive: 0xffffff, ei: 0.7 }); shine.position.set(0.035, 0.045, 0.17); shine.castShadow = false; wrap.add(shine);
    wrap.position.set(dx * eyeGap, eyeY, wide * 0.45);
    g.add(wrap); g.userData.eyes.push(wrap);
    g.userData.pupils.push({ p: pupil, bx: 0, by: 0 });
  }

  // ---- little smile ----
  const mouth = sphere(0.055, 0x35262f, { detail: 1, rough: 0.4 });
  mouth.scale.set(1.5, 0.7, 0.4); mouth.position.set(0, eyeY - 0.21, wide * 0.49); mouth.castShadow = false; g.add(mouth);

  // ---- stubby waving arms ----
  g.userData.arms = [];
  for (const dx of [-1, 1]) {
    const arm = sphere(0.12, sk.body, { detail: 1, ...bodyOpts });
    arm.scale.set(0.66, 1.15, 0.66); arm.position.set(dx * (wide * 0.5 + 0.04), 0.47, 0.05); arm.rotation.z = dx * 0.5;
    g.add(arm); g.userData.arms.push({ m: arm, side: dx });
  }
  // ---- feet ----
  for (const dx of [-1, 1]) {
    const foot = sphere(0.13, sk.accent, { detail: 1, rough: 0.55 });
    foot.scale.set(1.1, 0.55, 1.45); foot.position.set(dx * 0.2, 0.07, 0.1); g.add(foot);
  }

  // ---- seeded silhouette flair ----
  if (variant === 0) { for (const dx of [-1, 1]) { const ear = sphere(0.14, sk.body, { detail: 1, ...bodyOpts }); ear.position.set(dx * 0.3, 0.94 * tall, 0); g.add(ear); } }
  else if (variant === 1) { const st = cyl(0.02, 0.03, 0.34, sk.accent); st.position.set(0, 0.98 * tall, 0); g.add(st); const b = sphere(0.07, sk.cheek, { detail: 1, emissive: sk.cheek, ei: 0.5 }); b.position.set(0, 1.18 * tall, 0); g.add(b); }
  else if (variant === 2) { const fin = box(0.06, 0.27, 0.22, sk.accent); fin.position.set(0, 0.9 * tall, -0.08); g.add(fin); }
  else if (variant === 3) { for (const dx of [-1, 1]) { const ear = cyl(0.012, 0.09, 0.28, sk.body, { ...bodyOpts }); ear.position.set(dx * 0.25, 0.97 * tall, 0); ear.rotation.z = dx * -0.28; g.add(ear); } }
  else { const t1 = sphere(0.09, sk.accent, { detail: 1 }); t1.position.set(0, 1.0 * tall, 0); g.add(t1); const t2 = sphere(0.06, sk.accent, { detail: 1 }); t2.position.set(0.06, 1.09 * tall, 0); g.add(t2); }
  if (rng() > 0.5) { const tail = sphere(0.1, sk.body, { detail: 1, ...bodyOpts }); tail.scale.set(0.7, 0.7, 1.35); tail.position.set(0, 0.4, -wide * 0.56); g.add(tail); }

  // ---- rarity crown / halo ----
  if (sk.crown) {
    const crown = cyl(0.15, 0.19, 0.13, 0xffd23f, { metal: 0.6, rough: 0.25, emissive: 0xffd23f, ei: 0.35 });
    crown.position.set(0, 1.04 * tall, 0); g.add(crown);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 6), mat(0xffe98a, { emissive: 0xffd23f, ei: 0.45, metal: 0.6 })); sp.position.set(Math.cos(a) * 0.16, 1.13 * tall, Math.sin(a) * 0.16); sp.castShadow = false; g.add(sp); }
  }
  if (sk.halo) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 10, 26), new THREE.MeshStandardMaterial({ color: sk.accent, emissive: sk.accent, emissiveIntensity: 1.0, roughness: 0.3 }));
    halo.rotation.x = Math.PI / 2; halo.position.y = 1.14 * tall; halo.castShadow = false; g.add(halo); g.userData.halo = halo;
  }

  // ---- chest emblem: the character's own emoji, as a little badge ----
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.15, 22), new THREE.MeshBasicMaterial({ map: emojiTexture(char.emoji[0]), transparent: true, depthWrite: false }));
  badge.position.set(0, 0.42, wide * 0.5 + 0.02); badge.rotation.x = -0.12; g.add(badge);

  g.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
  g.scale.setScalar(0.92);
  return g;
}
