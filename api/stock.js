// Reports which sizes are still buyable, keyed by slug, exactly as before —
// the storefront's sold-out logic doesn't change. Only the source moved: from
// Stripe payment-link "active" flags to the real Upstash counts. While the
// store isn't provisioned (or during the Stripe→Bold switch) it reports
// everything available rather than wrongly blanking the drop.

const config = require("../shop-config.json");
const store = require("../lib/store.js");

const sizes = (config.products || []).flatMap((p) => p.sizes || []);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const avail = await store.availability(sizes);
    // no store yet: leave every size buyable
    if (!avail) {
      return res.status(200).json(Object.fromEntries(sizes.map((s) => [s.slug, true])));
    }
    // the client only cares true/false; a size is "in stock" if any remain
    const out = {};
    for (const s of sizes) out[s.slug] = (avail[s.slug] || 0) > 0;
    return res.status(200).json(out);
  } catch (err) {
    // storefront must never break over stock: default to available
    return res.status(200).json(Object.fromEntries(sizes.map((s) => [s.slug, true])));
  }
};
