// Creates a Bold payment link the moment a shopper picks a size and hits Buy,
// then hands back the checkout URL to send them to. Runs on Vercel; the Bold
// key stays server-side.
//
// The old flow pointed each button at a fixed Stripe link. Bold links are
// single-use, so they have to be minted per order — which is also what lets us
// hold the size in inventory while the shopper pays.

const config = require("../shop-config.json");
const bold = require("../lib/bold.js");
const store = require("../lib/store.js");

const products = config.products || [];
const HOLD_SECONDS = 30 * 60; // how long a size is reserved once checkout starts

function findSize(productSlug, sizeSlug) {
  const product = products.find((p) => p.slug === productSlug);
  if (!product) return null;
  const size = (product.sizes || []).find((s) => s.slug === sizeSlug);
  if (!size) return null;
  return { product, size };
}

// ss__<sizeSlug>__<random> — the size lives in a Redis mapping too, so the
// webhook never has to parse this; the shape is just for humans reading logs.
function newReference(sizeSlug) {
  return "ss__" + sizeSlug + "__" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function origin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return proto + "://" + host;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!bold.isConfigured()) {
    return res.status(503).json({ error: "Payments not configured yet" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const found = findSize(body.product, body.size);
    if (!found) return res.status(400).json({ error: "Unknown product or size" });

    const { product, size } = found;
    const reference = newReference(size.slug);

    // hold one unit; refuse if the size is gone so nobody pays for nothing
    const held = await store.reserve(size.slug, size.stock, reference, HOLD_SECONDS);
    if (!held) return res.status(409).json({ error: "sold_out", size: size.size });

    let link;
    try {
      link = await bold.createLink({
        amountCOP: product.priceCOP,
        description: (product.name + " · " + size.size).slice(0, 100),
        reference: reference,
        callbackUrl: origin(req) + "/gracias.html",
      });
    } catch (err) {
      await store.release(reference); // give the held unit back on failure
      return res.status(502).json({ error: "Bold unavailable", status: err.status || null });
    }

    return res.status(200).json({ url: link.url, reference: reference });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
