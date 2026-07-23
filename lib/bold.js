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
  // Bold returns { payment_link: "LNK_...", url: "https://checkout.bold.co/..." }
  return { id: json.payment_link, url: json.url };
}

/* Verify a webhook came from Bold and wasn't forged.
   Bold's own docs say the identity key is what authenticates webhook
   deliveries; the standard construction is HMAC-SHA256 over the exact raw
   body, compared to a signature header. The precise HEADER NAME and whether
   the digest is hex or base64 are the two things their live site wouldn't
   confirm today, so this stays deliberately isolated and observable:
   webhook.js logs the real headers on the first sandbox delivery, and we lock
   this to that format before it ever guards real money. Until a secret is
   set it fails closed in production and open in test (so sandbox testing can
   proceed while we read the first payload). */
function verifySignature(rawBody, headers) {
  const secret = env() === "production"
    ? process.env.BOLD_WEBHOOK_SECRET_PROD
    : process.env.BOLD_WEBHOOK_SECRET_TEST;

  if (!secret) {
    // no secret configured yet
    return { ok: env() === "test", reason: "no-secret", enforced: env() === "production" };
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const candidates = [
    headers["x-bold-signature"],
    headers["bold-signature"],
    headers["x-signature"],
  ].filter(Boolean);

  for (const got of candidates) {
    // timingSafeEqual needs equal-length buffers
    const a = Buffer.from(String(got));
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "signature-mismatch" };
}

module.exports = { env, isConfigured, createLink, verifySignature };
