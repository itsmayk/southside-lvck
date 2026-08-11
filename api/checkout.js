// Mints a payment link when a shopper checks out, then hands back the checkout
// URL. Runs on Vercel; keys stay server-side.
//
// One or many lines: the cart posts { items: [{product, size}, …] }; the older
// single-item path { product, size } still works and is treated as a cart of
// one. Bold takes a single total, so a multi-line cart becomes ONE link for the
// summed amount, and every line's size is reserved under the same reference.
//
// Routing by destination:
//   Colombia (CO)   -> Bold, charged in COP (Σ product COP + flat domestic shipping)
//   international    -> the intl processor via lib/intlpay.js (PayPal), in USD
//                       (Σ product USD + quoted shipping). DORMANT until
//                       shipping-config.intlEnabled AND the keys exist.
//
// Either way we reserve every size first (so nobody pays for a sold-out piece)
// and save the order (who + where + amounts) so it can actually be shipped.

const config = require("../shop-config.json");
const shipCfg = require("../shipping-config.json");
const bold = require("../lib/bold.js");
const intlpay = require("../lib/intlpay.js");
const store = require("../lib/store.js");
const fx = require("../lib/fx.js");

const products = config.products || [];
const HOLD_SECONDS = 30 * 60; // how long a size is reserved once checkout starts

// prices are USD-based; postLaunch picks launch vs post-launch
function activeUsd(product) {
  return config.postLaunch ? product.priceUSDPost : product.priceUSD;
}

function findSize(productSlug, sizeSlug) {
  const product = products.find((p) => p.slug === productSlug);
  if (!product) return null;
  const size = (product.sizes || []).find((s) => s.slug === sizeSlug);
  if (!size) return null;
  return { product, size };
}

// ss__<sizeSlug>__<random> — the sizes live in a Redis mapping too, so the
// webhook never has to parse this; the shape is just for humans reading logs.
// For a cart the first line's slug labels the reference (details are in Redis).
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

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (e) { return res.status(400).json({ error: "bad body" }); }

  const address = body.address && typeof body.address === "object" ? body.address : null;
  const country = String(body.country || (address && address.country) || "CO").toUpperCase();
  const isCO = country === "CO";

  // Guard per route BEFORE reserving, so a 503 never holds a unit.
  if (isCO) {
    // Bold not live yet: 503 lets the button fall back to its Stripe href.
    if (!bold.isConfigured()) return res.status(503).json({ error: "Payments not configured yet" });
  } else {
    if (!shipCfg.intlEnabled) return res.status(503).json({ error: "international_disabled" });
    if (!intlpay.isConfigured()) return res.status(503).json({ error: "intl_not_configured" });
  }

  // Accept a cart (items[]) or the legacy single {product, size}. Each line is
  // resolved to its product+size; an unknown line rejects the whole checkout.
  const rawItems = Array.isArray(body.items) && body.items.length
    ? body.items
    : (body.product && body.size ? [{ product: body.product, size: body.size }] : []);
  if (!rawItems.length) return res.status(400).json({ error: "empty cart" });

  const lines = rawItems.map((it) => findSize(it.product, it.size));
  if (lines.some((l) => !l)) return res.status(400).json({ error: "Unknown product or size" });

  try {
    // reference labelled by the first line; the full slug list lives in Redis
    const reference = newReference(lines[0].size.slug);
    const nameOf = (p) => (p.name && (p.name.es || p.name.en)) || p.slug;
    const description = lines
      .map((l) => nameOf(l.product) + " " + l.size.size)
      .join(" + ")
      .slice(0, 100);

    // hold one unit of every line; refuse if any size is gone (all-or-nothing)
    const held = await store.reserveMany(
      lines.map((l) => ({ slug: l.size.slug, total: l.size.stock })),
      reference, HOLD_SECONDS
    );
    if (!held.ok) {
      const gone = lines.find((l) => l.size.slug === held.soldOut);
      return res.status(409).json({ error: "sold_out", size: gone ? gone.size.size : null, slug: held.soldOut });
    }

    // per-line record kept on the order so it can be picked, packed and shipped
    const orderItems = lines.map((l) => ({
      product: l.product.slug, name: nameOf(l.product), size: l.size.size, sizeSlug: l.size.slug,
    }));

    // ---------------- Colombia -> Bold (COP) ----------------
    if (isCO) {
      // Σ product COP (each USD -> COP, rounded 5/9) + one flat domestic shipping
      let productCOP = 0;
      for (const l of lines) productCOP += await fx.copFor(activeUsd(l.product));
      const shipCOP = Number(shipCfg.domestic && shipCfg.domestic.flatCOP) || 0;
      const totalCOP = productCOP + shipCOP;

      let link;
      try {
        link = await bold.createLink({
          amountCOP: totalCOP,
          description: description,
          reference: reference,
          callbackUrl: origin(req) + "/gracias.html?reference=" + encodeURIComponent(reference),
        });
      } catch (err) {
        await store.release(reference); // give the held units back on failure
        return res.status(502).json({ error: "Bold unavailable", status: err.status || null });
      }

      await store.saveOrder(reference, {
        method: "bold", country: "CO",
        items: orderItems,
        address: address, // short: { name, city, whatsapp }
        amounts: { productCOP: productCOP, shipCOP: shipCOP, totalCOP: totalCOP, currency: "COP" },
        createdAt: Date.now(),
      });

      return res.status(200).json({ url: link.url, reference: reference });
    }

    // ---------------- International -> intl processor (USD) ----------------
    let productUSD = 0;
    for (const l of lines) productUSD += Number(activeUsd(l.product));
    const shippingUSD = Number(body.shippingAmount) || 0; // quoted earlier by /api/quote
    const totalUSD = productUSD + shippingUSD;

    let order;
    try {
      order = await intlpay.createOrder({
        amount: totalUSD, currency: "USD",
        description: description, reference: reference,
        returnUrl: origin(req) + "/gracias.html?reference=" + encodeURIComponent(reference),
        cancelUrl: origin(req) + "/shop.html",
      });
    } catch (err) {
      await store.release(reference);
      return res.status(502).json({ error: "intl_pay_unavailable", status: err.status || null });
    }

    await store.saveOrder(reference, {
      method: intlpay.provider || "paypal", country: country,
      items: orderItems,
      address: address, rateId: body.rateId || null,
      amounts: { productUSD: productUSD, shippingUSD: shippingUSD, totalUSD: totalUSD, currency: "USD" },
      payOrderId: order.id || null,
      createdAt: Date.now(),
    });

    return res.status(200).json({ url: order.approveUrl, reference: reference });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
