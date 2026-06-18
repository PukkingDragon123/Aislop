// Number + time formatting helpers for the HUD and panels.
// Idle games live or die on readable big numbers, so this is shared everywhere.

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/**
 * Format a number compactly: 1234 -> "1.23K", 5_400_000 -> "5.40M".
 * Keeps small numbers exact-ish so early game reads naturally.
 */
export function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  const neg = n < 0;
  n = Math.abs(n);
  if (n < 1000) {
    // Show up to 1 decimal under 100, integers above.
    const v = n < 100 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
    return (neg ? '-' : '') + v;
  }
  let tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) tier = SUFFIXES.length - 1;
  const scaled = n / Math.pow(1000, tier);
  const str = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(2);
  return (neg ? '-' : '') + str + SUFFIXES[tier];
}

/** Money flavour of fmt(). */
export function money(n) {
  return '$' + fmt(n);
}

/** Per-second rate, e.g. "$12.3/s". */
export function rate(n, prefix = '$') {
  return prefix + fmt(n) + '/s';
}

/** Humanised duration from seconds: "1h 4m", "32s". */
export function duration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Round to a sensible precision for display without compounding float noise. */
export function clean(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
