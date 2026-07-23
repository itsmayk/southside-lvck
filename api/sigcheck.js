// TEMPORARY sandbox tool. Runs where the (write-only, "Sensitive") Bold key
// actually exists, so it can confirm HOW Bold signs webhooks without ever
// exposing the key: it reads the real delivery we stashed, recomputes several
// candidate signatures over that exact body, and reports only WHICH candidate
// matches the x-bold-signature Bold sent. Deleted the moment verification is
// locked. Only runs in test mode.

const crypto = require("crypto");
const store = require("../lib/store.js");

module.exports = async function handler(req, res) {
  if (process.env.BOLD_ENV === "production") return res.status(404).end();

  const key = process.env.BOLD_API_KEY_TEST || "";
  const raw = await store.lastDelivery();
  if (!raw) return res.status(200).json({ error: "no stored delivery yet" });

  const d = typeof raw === "string" ? JSON.parse(raw) : raw;
  const body = d.body;
  const sig = (d.headers || {})["x-bold-signature"] || null;

  const hmacHex = (secret, msg) => crypto.createHmac("sha256", secret).update(msg, "utf8").digest("hex");
  const hmacB64 = (secret, msg) => crypto.createHmac("sha256", secret).update(msg, "utf8").digest("base64");
  const sha = (msg) => crypto.createHash("sha256").update(msg, "utf8").digest("hex");

  const candidates = {
    "hmac(body, key) hex": hmacHex(key, body),
    "hmac(body, key) base64": hmacB64(key, body),
    "sha256(body + key)": sha(body + key),
    "sha256(key + body)": sha(key + body),
    "hmac(key, body) hex (swapped)": hmacHex(body, key),
  };

  const match = Object.entries(candidates).find(function (e) { return e[1] === sig; });

  return res.status(200).json({
    keyPresent: key.length > 0,
    signatureReceived: sig,
    match: match ? match[0] : "NONE MATCHED",
    // show only prefixes so nothing sensitive leaks
    tried: Object.fromEntries(Object.entries(candidates).map(function (e) {
      return [e[0], e[1].slice(0, 16) + "…"];
    })),
    referenceInBody: (function () {
      try { return JSON.parse(body).data.metadata.reference; } catch (e) { return null; }
    })(),
    typeInBody: (function () {
      try { return JSON.parse(body).type; } catch (e) { return null; }
    })(),
  });
};
