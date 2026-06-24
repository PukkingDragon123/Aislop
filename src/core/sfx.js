// ============================================================================
//  Tiny procedural sound — no audio files, just a WebAudio synth. Soft, tonal
//  blips tuned to a pleasant scale so rapid play never grates. Lazily created
//  on the first user gesture (autoplay policy); a no-op where WebAudio is absent
//  (e.g. headless tests). Mute state persists in localStorage.
// ============================================================================

let ctx = null, master = null;
let muted = false;
try { muted = localStorage.getItem('brainrot.muted') === '1'; } catch {}

function ensure() {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.42;
    master.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}

export function unlockAudio() { const c = ensure(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
export function isMuted() { return muted; }
export function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem('brainrot.muted', muted ? '1' : '0'); } catch {}
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.42, ctx.currentTime, 0.02);
}
export function toggleMute() { setMuted(!muted); return muted; }

// semitones from A4 (440) — keeps everything on one tidy scale.
const A = (s) => 440 * Math.pow(2, s / 12);

function note(freq, t0, dur, { type = 'triangle', vol = 0.25, slideTo = null, attack = 0.006 } = {}) {
  const o = ctx.createOscillator(), gain = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gain); gain.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function noise(t0, dur, { vol = 0.2, freq = 1800, q = 0.8 } = {}) {
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = freq; filt.Q.value = q;
  const gain = ctx.createGain(); gain.gain.setValueAtTime(vol, t0); gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(gain); gain.connect(master);
  src.start(t0); src.stop(t0 + dur);
}
function seq(notes) { if (!ensure() || muted) return; const t0 = ctx.currentTime; for (const n of notes) note(n.f, t0 + (n.d || 0), n.dur || 0.12, n); }

export function sClick() { if (!ensure() || muted) return; const t = ctx.currentTime; note(A(7 + (Math.random() * 2 - 1)), t, 0.07, { vol: 0.2, slideTo: A(12) }); }
export function sBuy() { seq([{ f: A(4), dur: 0.1, vol: 0.2 }, { f: A(11), d: 0.07, dur: 0.14, vol: 0.18 }, { f: A(16), d: 0.13, dur: 0.12, vol: 0.1, type: 'sine' }]); }
export function sStation() { seq([{ f: A(0), dur: 0.08, type: 'square', vol: 0.1 }, { f: A(7), d: 0.06, dur: 0.1, type: 'square', vol: 0.1 }, { f: A(12), d: 0.12, dur: 0.14, vol: 0.14 }]); }
export function sPull() { seq([{ f: A(0), dur: 0.08 }, { f: A(5), d: 0.06, dur: 0.08 }, { f: A(9), d: 0.12, dur: 0.1 }]); }
export function sLevel() { seq([{ f: A(0), dur: 0.12 }, { f: A(4), d: 0.1, dur: 0.12 }, { f: A(7), d: 0.2, dur: 0.12 }, { f: A(12), d: 0.3, dur: 0.22, vol: 0.22 }]); }
export function sAchieve() { seq([{ f: A(7), dur: 0.12 }, { f: A(12), d: 0.1, dur: 0.18, vol: 0.2 }]); }
export function sViral() { if (!ensure() || muted) return; const t = ctx.currentTime; note(A(-5), t, 0.5, { type: 'sawtooth', vol: 0.13, slideTo: A(19) }); noise(t + 0.1, 0.4, { vol: 0.1, freq: 3200 }); }
export function sReveal(rank = 0) {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  const ns = [{ f: A(0), dur: 0.12 }, { f: A(4), d: 0.08, dur: 0.12 }, { f: A(7), d: 0.16, dur: 0.14 }];
  if (rank >= 2) ns.push({ f: A(12), d: 0.24, dur: 0.18, vol: 0.2 });
  if (rank >= 4) ns.push({ f: A(16), d: 0.32, dur: 0.22, vol: 0.18, type: 'sine' });
  for (const n of ns) note(n.f, t0 + (n.d || 0), n.dur, n);
  if (rank >= 4) noise(t0 + 0.3, 0.5, { vol: 0.09, freq: 5200 });
}
export function sError() { if (!ensure() || muted) return; const t = ctx.currentTime; note(A(-12), t, 0.16, { type: 'square', vol: 0.14, slideTo: A(-17) }); }
export function sClean() { if (!ensure() || muted) return; const t = ctx.currentTime; noise(t, 0.2, { vol: 0.15, freq: 2600, q: 1.2 }); note(A(10), t, 0.1, { type: 'sine', vol: 0.09, slideTo: A(17) }); }
