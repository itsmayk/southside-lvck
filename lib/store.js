// Real inventory, backed by Upstash Redis (installed through the Vercel
// Marketplace, which injects UPSTASH_REDIS_REST_URL / _TOKEN). Bold payment
// links are single-use — unlike the old Stripe links that deactivated
// themselves — so nothing tracks stock for us. This does.
//
// The model, per size slug:
//   stock:sold:<slug>   integer  confirmed sales (permanent)
//   resv:<slug>         zset     open reservations, scored by expiry epoch-ms
//   ref:<reference>     string   which size(s) a payment reference belongs to —
//                                a plain slug (single item) or a JSON array of
//                                slugs (a cart with several lines)
//   done:<reference>    string   marker so a repeated webhook can't double-count
//
// available = configured stock − sold − reservations that haven't expired.
// Reserving at checkout (not at payment) is what stops two people buying the
// last piece in the gap between clicking Buy and finishing the Bold checkout.

const { Redis } = require("@upstash/redis");

let client = null;
function redis() {
  if (client) return client;
  // The Vercel Upstash integration injects these under the KV_* names (its
  // legacy naming), NOT the UPSTASH_* ones Redis.fromEnv() looks for — so the
  // client is built explicitly. Both spellings are accepted in case the
  // integration is reconnected under the newer names later.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  // Not provisioned yet: callers treat null as "no store", so the shop keeps
  // working (everything reads as in stock) instead of crashing.
  if (!url || !token) return null;
  client = new Redis({ url: url, token: token });
  return client;
}

function isReady() {
  return redis() !== null;
}

// drop reservations whose hold has lapsed before any read or write
async function purge(r, slug) {
  await r.zremrangebyscore("resv:" + slug, 0, Date.now());
}

// The slug(s) a reference owns. Older single-item references stored a bare slug
// string; cart references store a JSON array. Upstash may hand back the array
// already parsed (object) or as a string, so tolerate every shape.
function parseSlugs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [String(raw)];
  } catch (e) {
    return [String(raw)];   // a bare slug like "boxi-fit-m" isn't valid JSON
  }
}

// how many of each size are still available, given each size's configured total
async function availability(sizes) {
  const r = redis();
  if (!r) return null; // no store — caller falls back to "all available"
  const out = {};
  for (const s of sizes) {
    await purge(r, s.slug);
    const sold = Number(await r.get("stock:sold:" + s.slug)) || 0;
    const held = Number(await r.zcard("resv:" + s.slug)) || 0;
    out[s.slug] = Math.max(0, Number(s.stock) - sold - held);
  }
  return out;
}

// Hold one unit for `reference` for ttlSec. Returns false if nothing is left,
// so the caller never sends someone to a checkout for a sold-out size.
async function reserve(slug, total, reference, ttlSec) {
  const r = redis();
  if (!r) return true; // no store yet: don't block buying during setup
  await purge(r, slug);
  const sold = Number(await r.get("stock:sold:" + slug)) || 0;
  const held = Number(await r.zcard("resv:" + slug)) || 0;
  if (Number(total) - sold - held <= 0) return false;

  const expiry = Date.now() + ttlSec * 1000;
  await r.zadd("resv:" + slug, { score: expiry, member: reference });
  await r.set("ref:" + reference, slug, { ex: ttlSec + 3600 });
  return true;
}

// Hold one unit of EACH line for `reference` (a cart checkout). All or nothing:
// if any line is sold out, the units already held for this reference are handed
// back and { ok:false, soldOut:<slug> } is returned, so a cart never half-books.
// `lines` is [{ slug, total }]; the reference maps to the whole list of slugs.
async function reserveMany(lines, reference, ttlSec) {
  const r = redis();
  if (!r) return { ok: true, slugs: (lines || []).map((l) => l.slug) }; // no store yet
  const held = [];
  for (const line of lines) {
    await purge(r, line.slug);
    const sold = Number(await r.get("stock:sold:" + line.slug)) || 0;
    const open = Number(await r.zcard("resv:" + line.slug)) || 0;
    if (Number(line.total) - sold - open <= 0) {
      for (const s of held) await r.zrem("resv:" + s, reference);   // roll back
      return { ok: false, soldOut: line.slug };
    }
    const expiry = Date.now() + ttlSec * 1000;
    await r.zadd("resv:" + line.slug, { score: expiry, member: reference });
    held.push(line.slug);
  }
  await r.set("ref:" + reference, JSON.stringify(held), { ex: ttlSec + 3600 });
  return { ok: true, slugs: held };
}

async function referenceSize(reference) {
  const r = redis();
  if (!r) return null;
  return parseSlugs(await r.get("ref:" + reference))[0] || null;
}

// Confirm a paid reference exactly once. The NX marker makes a resent webhook
// a no-op, so a size is never decremented twice for one order. Handles a cart
// reference (several slugs) as well as a single-item one.
async function confirm(reference) {
  const r = redis();
  if (!r) return { ok: false, reason: "no-store" };
  const slugs = parseSlugs(await r.get("ref:" + reference));
  if (!slugs.length) return { ok: false, reason: "unknown-reference" };

  const fresh = await r.set("done:" + reference, "1", { nx: true, ex: 60 * 60 * 24 * 90 });
  if (fresh === null) return { ok: true, slug: slugs[0], slugs, duplicate: true };

  for (const slug of slugs) {
    await r.incr("stock:sold:" + slug);
    await r.zrem("resv:" + slug, reference);
  }
  return { ok: true, slug: slugs[0], slugs };
}

// Payment failed or the link expired: give the held unit(s) back.
async function release(reference) {
  const r = redis();
  if (!r) return;
  const slugs = parseSlugs(await r.get("ref:" + reference));
  for (const slug of slugs) await r.zrem("resv:" + slug, reference);
}

// --- orders: buyer/shipping details attached to a reference ---------------
// The checkout collects who + where (short for Colombia, full for intl) so the
// order can actually be shipped. Stored as one JSON blob under order:<reference>
// for 90 days. Best-effort: with no store the shop still sells (just no record).
const ORDER_TTL = 60 * 60 * 24 * 90;

async function saveOrder(reference, data) {
  const r = redis();
  if (!r) return false;
  await r.set("order:" + reference, JSON.stringify(data || {}), { ex: ORDER_TTL });
  return true;
}

async function getOrder(reference) {
  const r = redis();
  if (!r) return null;
  const raw = await r.get("order:" + reference);
  if (!raw) return null;
  // Upstash may hand back an already-parsed object or a JSON string
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

// Merge tracking (carrier / number / URL / label) onto a saved order after the
// shipment is created. No-op if the order was never stored.
async function saveTracking(reference, tracking) {
  const r = redis();
  if (!r) return false;
  const order = (await getOrder(reference)) || {};
  order.tracking = Object.assign({}, order.tracking, tracking, { at: Date.now() });
  await r.set("order:" + reference, JSON.stringify(order), { ex: ORDER_TTL });
  return true;
}

module.exports = { isReady, availability, reserve, reserveMany, referenceSize, confirm, release, saveOrder, getOrder, saveTracking };
