// Mints a payment link the moment a shopper picks a size and hits Buy, then
// hands back the checkout URL. Runs on Vercel; keys stay server-side.
//
// Routing by destination:
//   Colombia (CO)   -> Bold, charged in COP (product COP + flat domestic shipping)
//   international    -> the intl processor via lib/intlpay.js (PayPal), in USD
//                       (product USD + quoted shipping). DORMANT until
//                       shipping-config.intlEnabled AND the keys exist.
//
// Either way we reserve the size first (so nobody pays for a sold-out piece)
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

  try {
    const found = findSize(body.product, body.size);
    if (!found) return res.status(400).json({ error: "Unknown product or size" });

    const { product, size } = found;
    const reference = newReference(size.slug);
    const name = (product.name && (product.name.es || product.name.en)) || product.slug;
    const description = (name + " · " + size.size).slice(0, 100);

    // hold one unit; refuse if the size is gone so nobody pays for nothing
    const held = await store.reserve(size.slug, size.stock, reference, HOLD_SECONDS);
    if (!held) return res.status(409).json({ error: "sold_out", size: size.size });

    // ---------------- Colombia -> Bold (COP) ----------------
    if (isCO) {
      // product COP (USD -> COP, rounded 5/9) + flat domestic shipping
      const productCOP = await fx.copFor(activeUsd(product));
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
        await store.release(reference); // give the held unit back on failure
        return res.status(502).json({ error: "Bold unavailable", status: err.status || null });
      }

      await store.saveOrder(reference, {
        method: "bold", country: "CO",
        product: product.slug, name: name, size: size.size, sizeSlug: size.slug,
        address: address, // short: { name, city, whatsapp }
        amounts: { productCOP: productCOP, shipCOP: shipCOP, totalCOP: totalCOP, currency: "COP" },
        createdAt: Date.now(),
      });

      return res.status(200).json({ url: link.url, reference: reference });
    }

    // ---------------- International -> intl processor (USD) ----------------
    const productUSD = Number(activeUsd(product));
    const shippingUSD = Number(body.shippingAmount) || 0; // quoted earlier by /api/quote
    const totalUSD = productUSD + shippingUSD;

    let order;
    try {
      order = await intlpay.createOrder({
        amount: totalUSD, currency: "USD",
        description: description, reference: reference,
        returnUrl: origin(req) + "/gracias.html?reference=" + encodeURIComponent(reference),
        cancelUrl: origin(req) + "/producto.html?p=" + encodeURIComponent(product.slug),
      });
    } catch (err) {
      await store.release(reference);
      return res.status(502).json({ error: "intl_pay_unavailable", status: err.status || null });
    }

    await store.saveOrder(reference, {
      method: intlpay.provider || "paypal", country: country,
      product: product.slug, name: name, size: size.size, sizeSlug: size.slug,
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
