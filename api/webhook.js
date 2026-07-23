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

// Bold's event vocabulary, confirmed from a real sandbox delivery: the event
// is in `type`, e.g. "SALE_APPROVED" / "SALE_REJECTED".
const APPROVED = ["SALE_APPROVED"];
const FAILED = ["SALE_REJECTED", "VOIDED", "SALE_EXPIRED"];

function classify(payload) {
  const type = String(payload.type || "").toUpperCase();
  if (APPROVED.includes(type)) return "approved";
  if (FAILED.includes(type)) return "failed";
  return "other";
}

// Confirmed shape: our reference rides in data.metadata.reference. The others
// are kept as defensive fallbacks in case Bold nests it differently elsewhere.
function extractReference(payload) {
  const d = payload.data || {};
  return (d.metadata && d.metadata.reference) || d.reference || payload.reference || null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // When a webhook URL is saved, Bold pings it to check it's reachable. That
  // ping may be a GET or carry no transaction body — answer it 200 so the save
  // succeeds instead of looking like a dead endpoint.
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(200).json({ ok: true, endpoint: "bold-webhook" });
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const raw = await readRaw(req);

  // an empty verification POST is not a real event — acknowledge and move on
  if (!raw || !raw.trim()) {
    return res.status(200).json({ ok: true, note: "empty body acknowledged" });
  }

  const check = bold.verifySignature(raw, req.headers);
  if (!check.ok) {
    // fails closed: a request we can't prove came from Bold never touches stock
    console.warn("[bold webhook] rejected:", check.reason);
    return res.status(401).json({ error: "bad signature", reason: check.reason });
  }

  let payload;
  // a body we can't parse isn't a real sale — acknowledge (200) rather than
  // 400, so a probe with an odd payload doesn't read as a broken endpoint
  try { payload = JSON.parse(raw); }
  catch (e) { return res.status(200).json({ ok: true, note: "unparseable body ignored" }); }

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
