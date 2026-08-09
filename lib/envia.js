// Envia.com — the shipping layer: quote a rate, generate a label + tracking.
// One aggregator, many carriers (DHL / FedEx / local). Everything Envia-specific
// lives here so the API routes stay about our own logic.
//
// INERT until ENVIA_API_KEY exists: isConfigured() returns false, and callers
// fall back (api/quote.js uses the flat rate from shipping-config.json). The
// origin address + parcel defaults come from shipping-config.json, so the only
// secret here is the API key.
//
// Docs: https://docs.envia.com  (base https://api.envia.com)
//   rate     POST /ship/rate/
//   generate POST /ship/generate/   (creates the label + tracking)

const BASE = "https://api.envia.com";

function apiKey() {
  return process.env.ENVIA_API_KEY || null;
}
function isConfigured() {
  return Boolean(apiKey());
}

async function call(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    const err = new Error("Envia request failed: " + path);
    err.status = res.status;
    err.detail = json;
    throw err;
  }
  return json;
}

// origin comes from shipping-config.json; `to` is the buyer's address; `parcel`
// falls back to parcelDefaults. Returns the cheapest rate as a simple shape.
async function quote({ origin, to, parcel }) {
  if (!isConfigured()) throw Object.assign(new Error("envia-not-configured"), { code: "not-configured" });
  const json = await call("/ship/rate/", {
    origin: origin,
    destination: to,
    packages: [{
      content: "Apparel",
      amount: 1,
      type: "box",
      weight: parcel.weightKg,
      weightUnit: "KG",
      lengthUnit: "CM",
      dimensions: { length: parcel.lengthCm, width: parcel.widthCm, height: parcel.heightCm },
    }],
    shipment: { type: 1 },
  });
  const rates = (json && json.data) || [];
  if (!rates.length) throw new Error("envia: no rates");
  const cheapest = rates.reduce((a, b) => (Number(b.totalPrice) < Number(a.totalPrice) ? b : a));
  return {
    amount: Number(cheapest.totalPrice),
    currency: cheapest.currency || "USD",
    carrier: cheapest.carrier,
    service: cheapest.service,
    etaDays: cheapest.deliveryEstimate || null,
    rateId: cheapest.rateId || null,
  };
}

// Called AFTER payment confirms (from the webhook) to mint the label + tracking.
async function createShipment({ origin, to, parcel, reference, rateId }) {
  if (!isConfigured()) throw Object.assign(new Error("envia-not-configured"), { code: "not-configured" });
  const json = await call("/ship/generate/", {
    origin: origin,
    destination: to,
    packages: [{
      content: "Apparel",
      amount: 1,
      type: "box",
      weight: parcel.weightKg,
      weightUnit: "KG",
      lengthUnit: "CM",
      dimensions: { length: parcel.lengthCm, width: parcel.widthCm, height: parcel.heightCm },
    }],
    shipment: { type: 1, rateId: rateId },
    settings: { printFormat: "PDF", comments: reference },
  });
  const d = (json.data && json.data[0]) || {};
  return {
    trackingNumber: d.trackingNumber || null,
    trackUrl: d.trackUrl || null,
    labelUrl: d.label || null,
    carrier: d.carrier || null,
    raw: json,
  };
}

module.exports = { isConfigured, quote, createShipment };
