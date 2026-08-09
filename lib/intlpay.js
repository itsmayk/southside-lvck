// International payments — the ONE place the storefront talks to the non-Colombian
// processor. Colombia stays on Bold (lib/bold.js); this handles everyone else.
//
// It exposes a tiny, provider-agnostic interface so the processor can be swapped
// (PayPal today, Stripe/Mercado Pago tomorrow) without touching the API routes:
//     isConfigured()                      -> boolean
//     createOrder({ amount, currency, description, reference, returnUrl, cancelUrl })
//                                         -> { id, approveUrl }
//     capture(orderId)                    -> { ok, reference }
//     verifyWebhook(rawBody, headers)     -> { ok, reason? }
//
// Default provider is PayPal (Orders v2). Like lib/bold.js, it is INERT until the
// keys exist: isConfigured() returns false, and the API routes fall back to the
// current Colombia-only flow. Nothing here runs while shipping-config.intlEnabled
// is false.

const PROVIDER = process.env.INTLPAY_PROVIDER || "paypal";

/* ---------------- PayPal (Orders API v2) ---------------- */
const paypal = (function () {
  function env() {
    return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
  }
  function base() {
    return env() === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  }
  function creds() {
    return { id: process.env.PAYPAL_CLIENT_ID, secret: process.env.PAYPAL_SECRET };
  }
  function isConfigured() {
    const c = creds();
    return Boolean(c.id && c.secret);
  }

  async function token() {
    const c = creds();
    const auth = Buffer.from(c.id + ":" + c.secret).toString("base64");
    const res = await fetch(base() + "/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const json = await res.json();
    if (!res.ok || !json.access_token) {
      const err = new Error("PayPal auth failed");
      err.status = res.status;
      throw err;
    }
    return json.access_token;
  }

  async function createOrder({ amount, currency, description, reference, returnUrl, cancelUrl }) {
    const t = await token();
    const res = await fetch(base() + "/v2/checkout/orders", {
      method: "POST",
      headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          // our order reference rides in custom_id so the webhook can find the order
          custom_id: reference,
          description: String(description || "").slice(0, 127),
          amount: { currency_code: currency || "USD", value: Number(amount).toFixed(2) },
        }],
        application_context: {
          brand_name: "LVCK · South Side",
          user_action: "PAY_NOW",
          shipping_preference: "GET_FROM_FILE",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.id) {
      const err = new Error("PayPal order create failed");
      err.status = res.status;
      err.detail = JSON.stringify(json).slice(0, 400);
      throw err;
    }
    const approve = (json.links || []).find((l) => l.rel === "approve");
    return { id: json.id, approveUrl: approve && approve.href };
  }

  async function capture(orderId) {
    const t = await token();
    const res = await fetch(base() + "/v2/checkout/orders/" + orderId + "/capture", {
      method: "POST",
      headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
    });
    const json = await res.json();
    const unit = json.purchase_units && json.purchase_units[0];
    const reference = unit && (unit.custom_id || (unit.payments && unit.payments.captures && unit.payments.captures[0] && unit.payments.captures[0].custom_id));
    return { ok: res.ok && json.status === "COMPLETED", reference: reference || null, raw: json };
  }

  // PayPal verifies webhooks server-side via an API call using the configured
  // webhook id. Inert until PAYPAL_WEBHOOK_ID is set (fails closed).
  async function verifyWebhook(rawBody, headers) {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return { ok: false, reason: "no-webhook-id" };
    let body;
    try { body = JSON.parse(rawBody); } catch (e) { return { ok: false, reason: "unparseable" }; }
    const t = await token();
    const res = await fetch(base() + "/v1/notifications/verify-webhook-signature", {
      method: "POST",
      headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: body,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: json.verification_status === "SUCCESS", reason: json.verification_status || "verify-failed" };
  }

  return { isConfigured, createOrder, capture, verifyWebhook };
})();

/* ---------------- provider registry (add Stripe / Mercado Pago here) ---------------- */
const PROVIDERS = { paypal: paypal };

function active() {
  return PROVIDERS[PROVIDER] || paypal;
}

module.exports = {
  provider: PROVIDER,
  isConfigured: () => active().isConfigured(),
  createOrder: (opts) => active().createOrder(opts),
  capture: (orderId) => active().capture(orderId),
  verifyWebhook: (raw, headers) => active().verifyWebhook(raw, headers),
};
