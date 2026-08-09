// Live FX rates so the storefront can show a reference price in the visitor's
// currency. Base is COP (our prices live in COP); each rate is "how much 1 COP
// is worth in X", so amountX = priceCOP * rates[X].
//
// Source: open.er-api.com — free, no key, CORS-enabled, refreshed daily. Cached
// in module scope (survives warm invocations) + at the CDN for a day. Never
// throws to the client: on any failure it returns { rates: null } so the front
// falls back to showing COP only.

const SRC = "https://open.er-api.com/v6/latest/COP";

let cache = { at: 0, rates: null };
const TTL_MS = 24 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=172800");

  const now = Date.now();
  if (cache.rates && now - cache.at < TTL_MS) {
    return res.status(200).json({ base: "COP", rates: cache.rates, cached: true });
  }

  try {
    const r = await fetch(SRC);
    const json = await r.json();
    if (!r.ok || !json || json.result !== "success" || !json.rates) {
      // don't 500 — a missing rate set just means "show COP"
      return res.status(200).json({ base: "COP", rates: cache.rates });
    }
    cache = { at: now, rates: json.rates };
    return res.status(200).json({ base: "COP", rates: json.rates });
  } catch (err) {
    return res.status(200).json({ base: "COP", rates: cache.rates });
  }
};
