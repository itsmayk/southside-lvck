// Collects the buyer's full shipping details AFTER payment, from the thank-you
// page. Bold doesn't hand us a usable address and we no longer ask before
// checkout, so this is where name + phone + email + address (with postal code) +
// city/country land. Keyed by the order reference that rode in the Bold callback
// URL; merges onto the saved order (never exposes it).

const store = require("../lib/store.js");

function clean(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max || 160);
}
function isEmail(v) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
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
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 160);
  const address = clean(body.address, 300);   // street + postal code, one field
  const city = clean(body.city, 160);         // city / country, one field
  if (!reference) return res.status(400).json({ error: "missing_reference" });
  if (!name || !phone || !email || !address || !city) return res.status(400).json({ error: "incomplete" });
  if (!isEmail(email)) return res.status(400).json({ error: "bad_email" });

  try {
    const order = await store.getOrder(reference);
    // no store, or an unknown reference: nothing to attach to
    if (!order) return res.status(404).json({ error: "unknown_reference" });

    order.address = Object.assign({}, order.address, {
      name: name, phone: phone, email: email, address: address, city: city,
      country: (order.country || "CO"),
    });
    order.shippingAt = Date.now();
    await store.saveOrder(reference, order);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
