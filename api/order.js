// Read-only order status for the thank-you page. Given a reference, returns just
// what the buyer may see: whether it's confirmed and the tracking (carrier /
// number / URL) once the shipment exists. Never returns the address, amounts, or
// anything else stored on the order — those stay server-side.

const store = require("../lib/store.js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const reference = String((req.query && req.query.reference) || "").trim();
  if (!reference) return res.status(400).json({ error: "missing_reference" });

  try {
    const order = await store.getOrder(reference);
    if (!order) return res.status(200).json({ found: false });

    const t = order.tracking || null;
    // whether the buyer has already left their shipping details (a boolean only —
    // never the details themselves), so the thank-you page shows the form or the
    // confirmation accordingly
    const hasShipping = Boolean(order.address && (order.address.name || order.address.city));
    return res.status(200).json({
      found: true,
      status: order.status || (t ? "shipped" : "pending"),
      hasShipping: hasShipping,
      tracking: t ? {
        carrier: t.carrier || null,
        number: t.trackingNumber || null,
        url: t.trackUrl || null,
      } : null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
