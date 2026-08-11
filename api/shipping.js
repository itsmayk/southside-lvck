// Collects the buyer's shipping details AFTER payment, from the thank-you page.
// Bold doesn't hand us a usable address and we no longer ask before checkout, so
// this is where name + city + WhatsApp land. Keyed by the order reference that
// rode in the Bold callback URL; merges onto the saved order (never exposes it).
//
// The exact street address is still confirmed later over WhatsApp — this is the
// minimum to reach out and dispatch.

const store = require("../lib/store.js");

function clean(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max || 120);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
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

  const reference = clean(body.reference, 120);
  const name = clean(body.name, 120);
  const city = clean(body.city, 120);
  const whatsapp = clean(body.whatsapp, 40);
  if (!reference) return res.status(400).json({ error: "missing_reference" });
  if (!name || !city || !whatsapp) return res.status(400).json({ error: "incomplete" });

  try {
    const order = await store.getOrder(reference);
    // no store, or an unknown reference: nothing to attach to
    if (!order) return res.status(404).json({ error: "unknown_reference" });

    order.address = Object.assign({}, order.address, {
      name: name, city: city, whatsapp: whatsapp,
      country: (order.country || "CO"),
    });
    order.shippingAt = Date.now();
    await store.saveOrder(reference, order);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
