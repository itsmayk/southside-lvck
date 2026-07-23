// Bold payments helper. Everything specific to talking to Bold lives here so
// the API routes stay about our own logic.
//
// One account, two separate identity keys — a test one and a production one.
// BOLD_ENV picks which; both hit the same base URL (Bold's own choice). We
// start in "test", where Bold simulates outcomes from the amount alone:
//   1.000 – 2.000.000  approved
//   111.111            rejected (insufficient funds)
//   333.333            rejected (expired card)
//   444.444            rejected (network)   ...etc.
// The real prices ($269.000 / $300.000) fall in the approved range, so a live
// price is itself a valid "approved" test.

const crypto = require("crypto");

const BASE = "https://integrations.api.bold.co";
const LINK_ENDPOINT = BASE + "/online/link/v1";

function env() {
  return process.env.BOLD_ENV === "production" ? "production" : "test";
}

function apiKey() {
  // set both in Vercel; BOLD_ENV chooses. Never hardcoded, never sent to the client.
  return env() === "production"
    ? process.env.BOLD_API_KEY_PROD
    : process.env.BOLD_API_KEY_TEST;
}

function isConfigured() {
  return Boolean(apiKey());
}

/* Create a single-use payment link.
   amountCOP is whole Colombian pesos (no cents — the sandbox's magic amounts
   like 111.111 are pesos, which tells us the field's unit). If a first live
   test shows Bold expects cents, this is the ONE line to change. */
async function createLink({ amountCOP, description, reference, callbackUrl }) {
  const res = await fetch(LINK_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: "x-api-key " + apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount_type: "CLOSE",
      amount: { currency: "COP", total_amount: amountCOP, tip_amount: 0 },
      description: description,
      reference: reference,
      callback_url: callbackUrl,
      payment_methods: ["CREDIT_CARD", "PSE", "NEQUI", "BOTON_BANCOLOMBIA"],
    }),
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* leave null */ }

  if (!res.ok || !json) {
    const err = new Error("Bold rejected the link request");
    err.status = res.status;
    err.detail = text.slice(0, 400);
    throw err;
  }
  // field names are confirmed from the logged response, not assumed
  const payload = json.payload || json.data || json;
  const url = payload.url || payload.link_url || payload.checkout_url || json.url;
  const id = payload.payment_link || payload.link_id || payload.id || json.payment_link;
  return { id: id, url: url, raw: json };
}

/* Verify a webhook genuinely came from Bold.
   Confirmed against a real sandbox delivery (not guessed): Bold signs the
   base64 of the raw body with the identity key interpreted as HEX BYTES, and
   sends the HMAC-SHA256 hex digest in `x-bold-signature`. The signing key is
   the same identity key used for the API — the one the webhook config asked
   for — so no separate secret exists. Fails closed if the key is missing. */
function signingKey() {
  // the identity key doubles as the webhook signing key
  return apiKey();
}

function verifySignature(rawBody, headers) {
  const key = signingKey();
  if (!key) return { ok: false, reason: "no-key" };

  const received = headers["x-bold-signature"];
  if (!received) return { ok: false, reason: "no-signature-header" };

  const keyBytes = Buffer.from(key, "hex");
  const b64Body = Buffer.from(rawBody, "utf8").toString("base64");
  const expected = crypto.createHmac("sha256", keyBytes).update(b64Body, "utf8").digest("hex");

  const a = Buffer.from(String(received));
  const b = Buffer.from(expected);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return { ok: true };
  return { ok: false, reason: "signature-mismatch" };
}

module.exports = { env, isConfigured, createLink, verifySignature };
