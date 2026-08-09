// Prices are defined in USD. Colombia pays via Bold in COP, so the COP charge is
// derived here: USD -> COP at the live rate, then rounded to a clean thousands
// value ending in 5 or 9 (ties round up to the 5). Same rounding the storefront
// shows, so what a Colombian sees is exactly what Bold charges.
//
// The rate is cached module-scope (survives warm invocations); a sane constant
// backs it up so a rate hiccup never blocks a sale.

let cache = { at: 0, rate: null };
const TTL_MS = 6 * 60 * 60 * 1000;   // 6h
const FALLBACK_USD_COP = 4000;

async function usdToCop() {
  const now = Date.now();
  if (cache.rate && now - cache.at < TTL_MS) return cache.rate;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const j = await r.json();
    const rate = j && j.rates && Number(j.rates.COP);
    if (rate && isFinite(rate)) { cache = { at: now, rate }; return rate; }
  } catch (e) { /* fall through */ }
  return cache.rate || FALLBACK_USD_COP;
}

// nearest thousands value whose thousands digit ends in 5 or 9; tie -> the 5.
// e.g. 356000 -> 355000, 358000 -> 359000, 362000 -> 365000.
function roundCOP59(cop) {
  const T = Math.round(cop / 1000);
  const d = Math.floor(T / 10) * 10;
  const cands = [d - 1, d + 5, d + 9, d + 15];   // …9, …5, …9, …5
  let best = cands[0], bestDist = Infinity;
  for (const c of cands) {
    const dist = Math.abs(c - T);
    if (dist < bestDist - 1e-9 || (Math.abs(dist - bestDist) < 1e-9 && c % 10 === 5)) {
      best = c; bestDist = dist;
    }
  }
  return Math.max(0, best) * 1000;
}

async function copFor(usd) {
  return roundCOP59(Number(usd) * (await usdToCop()));
}

module.exports = { usdToCop, roundCOP59, copFor };
