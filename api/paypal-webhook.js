// PayPal (the international processor) calls this when an order moves. Mirror of
// the Bold webhook: a confirmed capture decrements the size and mints the Envia
// shipment; anything unverified never touches stock.
//
// DORMANT until the PayPal keys exist: intlpay.verifyWebhook fails closed without
// PAYPAL_WEBHOOK_ID, so every delivery is rejected and nothing runs. The Envia
// shipment step is itself best-effort and only fires when ENVIA_API_KEY is set.

const intlpay = require("../lib/intlpay.js");
const store = require("../lib/store.js");
const shipCfg = require("../shipping-config.json");
const envia = require("../lib/envia.js");

function readRaw(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === "string") return resolve(req.body);
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString("utf8"));
    if (req.body && typeof req.body === "object") return resolve(JSON.stringify(req.body));
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Our order reference rides in custom_id. On a capture event it's on the resource
// directly; on an order-approved event it's inside purchase_units.
function extractReference(event) {
  const r = (event && event.resource) || {};
  if (r.custom_id) return r.custom_id;
  const pu = r.purchase_units && r.purchase_units[0];
  if (pu && pu.custom_id) return pu.custom_id;
  return null;
}

// After a shipment-worthy confirmation, mint the label + tracking (best-effort).
async function fulfil(reference) {
  if (!envia.isConfigured()) return;
  const order = await store.getOrder(reference);
  if (!order || !order.address) return;
  if (order.tracking) return; // already shipped
  if (!(order.address.street || order.address.address1)) return; // need full address
  try {
    const ship = await envia.createShipment({
      origin: shipCfg.origin,
      to: order.address,
      parcel: shipCfg.parcelDefaults,
      reference: reference,
      rateId: order.rateId || null,
    });
    await store.saveTracking(reference, ship);
  } catch (e) {
    console.error("[paypal webhook] envia error:", e.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(200).json({ ok: true, endpoint: "paypal-webhook" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const raw = await readRaw(req);
  if (!raw || !raw.trim()) return res.status(200).json({ ok: true, note: "empty body acknowledged" });

  // fails closed: an unverified request never touches stock
  const check = await intlpay.verifyWebhook(raw, req.headers);
  if (!check.ok) {
    console.warn("[paypal webhook] rejected:", check.reason);
    return res.status(401).json({ error: "bad signature", reason: check.reason });
  }

  let event;
  try { event = JSON.parse(raw); }
  catch (e) { return res.status(200).json({ ok: true, note: "unparseable body ignored" }); }

  const type = String(event.event_type || "").toUpperCase();
  const reference = extractReference(event);

  try {
    if (!reference) return res.status(200).json({ ignored: "no reference" });

    // Buyer approved the order -> capture the funds (which then fires
    // PAYMENT.CAPTURE.COMPLETED). Safe to attempt; capture is idempotent enough
    // and a second call just errors harmlessly.
    if (type === "CHECKOUT.ORDER.APPROVED") {
      const orderId = event.resource && event.resource.id;
      if (orderId) { try { await intlpay.capture(orderId); } catch (e) {} }
      return res.status(200).json({ ok: true, captured: orderId || null });
    }

    if (type === "PAYMENT.CAPTURE.COMPLETED") {
      const result = await store.confirm(reference);
      if (result.ok && !result.duplicate) await fulfil(reference);
      return res.status(200).json({ ok: true, confirmed: result.ok, size: result.slug || null });
    }

    if (type === "PAYMENT.CAPTURE.DENIED" || type === "PAYMENT.CAPTURE.REFUNDED" || type === "CHECKOUT.ORDER.VOIDED") {
      await store.release(reference);
      return res.status(200).json({ ok: true, released: true });
    }

    return res.status(200).json({ ignored: type });
  } catch (err) {
    console.error("[paypal webhook] error:", err.message);
    return res.status(500).json({ error: "handler error" });
  }
};
