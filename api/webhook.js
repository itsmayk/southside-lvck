// Bold calls this when a payment settles. A confirmed sale decrements the
// size; a rejected or expired one releases the hold. This is the only place
// stock actually goes down, so it must trust ONLY genuine Bold requests —
// hence the signature check. Without it, anyone who guessed the URL could post
// a fake "approved" and drain the drop.

const bold = require("../lib/bold.js");
const store = require("../lib/store.js");

// Bold isn't parsed by Vercel here: the signature is over the exact bytes, so
// a reserialized body would never match. Read the raw stream ourselves.
function readRaw(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === "string") return resolve(req.body);
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString("utf8"));
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Bold's event vocabulary — the exact strings are confirmed against the first
// sandbox delivery; both spellings are accepted so a naming difference doesn't
// silently drop a sale.
const APPROVED = ["SALE_APPROVED", "APPROVED", "PAYMENT_APPROVED"];
const FAILED = ["SALE_REJECTED", "REJECTED", "VOIDED", "SALE_EXPIRED", "EXPIRED"];

function classify(payload) {
  const type = String(payload.type || payload.event || payload.status || "").toUpperCase();
  if (APPROVED.some((t) => type.includes(t.replace(/^SALE_/, "")))) return "approved";
  if (FAILED.some((t) => type.includes(t.replace(/^SALE_/, "")))) return "failed";
  return "other";
}

function extractReference(payload) {
  const d = payload.data || payload;
  return d.reference || d.metadata_reference || payload.reference || null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const raw = await readRaw(req);

  /* First sandbox delivery reveals the real signature format. In test we log
     the header names and the payload shape once so we can lock verifySignature
     to exactly what Bold sends — then this logging comes out. Never logs in
     production. */
  if (bold.env() === "test") {
    console.log("[bold webhook] headers:", JSON.stringify(Object.keys(req.headers)));
    console.log("[bold webhook] raw:", raw.slice(0, 600));
  }

  const check = bold.verifySignature(raw, req.headers);
  if (!check.ok) {
    // fail closed once a secret exists / in production; open only while we are
    // still reading the first sandbox payload
    console.warn("[bold webhook] rejected:", check.reason);
    return res.status(401).json({ error: "bad signature", reason: check.reason });
  }

  let payload;
  try { payload = JSON.parse(raw || "{}"); }
  catch (e) { return res.status(400).json({ error: "bad json" }); }

  const reference = extractReference(payload);
  const kind = classify(payload);

  // Always answer 200 quickly on anything we recognise, so Bold doesn't retry
  // a delivery we actually handled.
  try {
    if (!reference) return res.status(200).json({ ignored: "no reference" });

    if (kind === "approved") {
      const result = await store.confirm(reference);
      return res.status(200).json({ ok: true, confirmed: result.ok, size: result.slug || null });
    }
    if (kind === "failed") {
      await store.release(reference);
      return res.status(200).json({ ok: true, released: true });
    }
    return res.status(200).json({ ignored: kind });
  } catch (err) {
    // 500 lets Bold retry, which is what we want if the store hiccuped
    console.error("[bold webhook] store error:", err.message);
    return res.status(500).json({ error: "store error" });
  }
};
