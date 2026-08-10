// Shipping quote for the international flow. Given a destination, returns the
// shipping cost + duties note for its zone. Uses Envia live rates when the key
// exists; otherwise falls back to the flat rate in shipping-config.json.
//
// This endpoint does NOT touch checkout or inventory — it only prices shipping.
// It refuses when international is turned off (shipping-config.intlEnabled), so
// while the feature is dormant it can't be used.

const shipCfg = require("../shipping-config.json");
const envia = require("../lib/envia.js");

function zoneFor(country) {
  const cc = String(country || "").toUpperCase();
  if (cc === "CO") return { key: "CO", domestic: true };
  const zones = shipCfg.zones || {};
  for (const key of Object.keys(zones)) {
    const z = zones[key];
    if (z.enabled && (z.countries || []).indexOf(cc) !== -1) return { key: key, zone: z };
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!shipCfg.intlEnabled) {
    return res.status(503).json({ error: "international_disabled" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const lang = ["es", "en", "pt"].indexOf(body.lang) !== -1 ? body.lang : "es";
    const found = zoneFor(body.country);
    if (!found) return res.status(400).json({ error: "zone_unavailable", country: body.country });

    // Colombia: domestic flat (kept in COP; Colombia never leaves the Bold flow)
    if (found.domestic) {
      return res.status(200).json({
        zone: "CO",
        currency: "COP",
        shipping: Number(shipCfg.domestic.flatCOP) || 0,
        note: null,
        source: "flat",
      });
    }

    const z = found.zone;
    const note = (z.note && (z.note[lang] || z.note.es)) || null;

    // Live rate from Envia when configured; otherwise the zone's flat fallback.
    if (envia.isConfigured() && body.address) {
      try {
        const rate = await envia.quote({
          origin: shipCfg.origin,
          to: body.address,
          parcel: shipCfg.parcelDefaults,
          currency: shipCfg.currencyIntl || "USD",
        });
        return res.status(200).json({
          zone: found.key,
          currency: rate.currency,
          shipping: rate.amount,
          carrier: rate.carrier,
          etaDays: rate.etaDays,
          rateId: rate.rateId,
          note: note,
          source: "envia",
        });
      } catch (e) {
        // fall through to flat if Envia hiccups, so a quote is always returned
      }
    }

    return res.status(200).json({
      zone: found.key,
      currency: shipCfg.currencyIntl || "USD",
      shipping: Number(z.flatUSD) || 0,
      note: note,
      source: "flat",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
