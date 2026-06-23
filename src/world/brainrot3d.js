// ============================================================================
//  Procedural 3D brainrot creatures. Every roster character becomes a little
//  low-poly blob — rarity-coloured body, googly eyes, a floating emoji icon so
//  you can tell them apart, and seed-driven flair (ears / fin / horn, plus a
//  crown for gold/legendary and a halo for mythic/diamond). Used for the pets
//  that roam (and brawl across) the office floor.
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { RARITIES } from '../core/config.js';
import { sphere, cyl, box } from './furniture.js';

const emojiCache = new Map();
function emojiTexture(emoji) {
  if (emojiCache.has(emoji)) return emojiCache.get(emoji);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = '96px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 74);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  emojiCache.set(emoji, t); return t;
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
const hex = (str) => new THREE.Color(str).getHex();

export function buildBrainrot(char) {
  const r = RARITIES[char.rarity] || RARITIES.common;
  const g = new THREE.Group();
  const seed = hash(char.id);
  const bodyCol = hex(r.glow);
  const accent = hex(r.color);

  // Round jelly body (varies a touch per character).
  const body = sphere(0.5, bodyCol, { detail: 2, rough: 0.45 });
  body.scale.set(0.92 + (seed % 4) * 0.05, 0.9 + ((seed >> 2) % 4) * 0.06, 0.95);
  body.position.y = 0.5; g.add(body); g.userData.body = body;

  // Belly patch in the rarity accent.
  const tummy = sphere(0.3, accent, { detail: 1, rough: 0.5 });
  tummy.scale.set(1, 1.1, 0.45); tummy.position.set(0, 0.42, 0.34); g.add(tummy);

  // Big googly eyes (jiggle each frame via userData.pupils).
  g.userData.pupils = [];
  for (const dx of [-0.17, 0.17]) {
    const eye = sphere(0.14, 0xffffff, { detail: 2, rough: 0.2 });
    eye.position.set(dx, 0.72, 0.33); eye.scale.z = 0.7; g.add(eye);
    const pupil = sphere(0.06, 0x101014, { detail: 1 });
    pupil.position.set(dx, 0.72, 0.45); g.add(pupil);
    g.userData.pupils.push({ p: pupil, bx: dx, by: 0.72 });
  }

  // Seeded silhouette flair so the species feel distinct.
  const variant = seed % 4;
  if (variant === 0) { for (const dx of [-0.32, 0.32]) { const ear = sphere(0.13, bodyCol, { detail: 1 }); ear.position.set(dx, 0.95, 0); g.add(ear); } }
  else if (variant === 1) { const horn = cyl(0.02, 0.1, 0.32, accent); horn.position.set(0, 1.02, 0); g.add(horn); }
  else if (variant === 2) { for (const dx of [-0.36, 0.36]) { const fin = box(0.06, 0.26, 0.2, accent); fin.position.set(dx, 0.66, 0); fin.rotation.z = dx > 0 ? -0.5 : 0.5; g.add(fin); } }
  else { const tuft = sphere(0.1, accent, { detail: 1 }); tuft.position.set(0, 1.0, 0); g.add(tuft); }

  // Stubby feet.
  for (const dx of [-0.2, 0.2]) { const ft = sphere(0.12, accent, { detail: 1 }); ft.scale.set(1, 0.55, 1.25); ft.position.set(dx, 0.08, 0.08); g.add(ft); }

  // Rarity crowns / halos.
  if (char.rarity === 'legendary' || char.rarity === 'gold') {
    const crown = cyl(0.17, 0.2, 0.13, 0xffcf33, { emissive: 0xffcf33, ei: 0.45, metal: 0.4 });
    crown.position.set(0, 1.04, 0); g.add(crown);
  }
  if (char.rarity === 'mythic' || char.rarity === 'diamond') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 8, 22),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.8, roughness: 0.3 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 1.15; ring.castShadow = false;
    g.add(ring); g.userData.halo = ring;
  }

  // Floating emoji label so you always know who's who.
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(char.emoji[0]), transparent: true, depthWrite: false }));
  icon.scale.set(0.46, 0.46, 0.46); icon.position.set(0, 1.3, 0); g.add(icon); g.userData.icon = icon;

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(0.92);
  return g;
}
