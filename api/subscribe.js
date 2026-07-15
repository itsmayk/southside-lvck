// Registers an email into MailerLite via the official API. The form on the
// landing page POSTs { email, lang } here (same-origin, so no CORS trouble),
// and the secret API key never leaves the server (Vercel env var).
// GitHub Pages can't run this function — the Vercel host is the primary one.

const GROUP_ID = "193091730480825821"; // "SS TEST" group (rename in MailerLite is fine; id stays)
const ML_API = "https://connect.mailerlite.com/api/subscribers";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.MAILERLITE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = (body.email || "").trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const payload = {
      email: email,
      groups: [GROUP_ID],
      status: "active",
    };

    const mlRes = await fetch(ML_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    // 200 = already existed (upsert), 201 = created new; both are success
    if (mlRes.status === 200 || mlRes.status === 201) {
      return res.status(200).json({ ok: true });
    }
    const detail = await mlRes.text();
    return res.status(502).json({ error: "MailerLite rejected", status: mlRes.status, detail: detail.slice(0, 300) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
