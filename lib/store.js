// Real inventory, backed by Upstash Redis (installed through the Vercel
// Marketplace, which injects UPSTASH_REDIS_REST_URL / _TOKEN). Bold payment
// links are single-use — unlike the old Stripe links that deactivated
// themselves — so nothing tracks stock for us. This does.
//
// The model, per size slug:
//   stock:sold:<slug>   integer  confirmed sales (permanent)
//   resv:<slug>         zset     open reservations, scored by expiry epoch-ms
//   ref:<reference>     string   which size a payment reference belongs to
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

async function referenceSize(reference) {
  const r = redis();
  if (!r) return null;
  return r.get("ref:" + reference);
}

// Confirm a paid reference exactly once. The NX marker makes a resent webhook
// a no-op, so a size is never decremented twice for one order.
async function confirm(reference) {
  const r = redis();
  if (!r) return { ok: false, reason: "no-store" };
  const slug = await r.get("ref:" + reference);
  if (!slug) return { ok: false, reason: "unknown-reference" };

  const fresh = await r.set("done:" + reference, "1", { nx: true, ex: 60 * 60 * 24 * 90 });
  if (fresh === null) return { ok: true, slug, duplicate: true };

  await r.incr("stock:sold:" + slug);
  await r.zrem("resv:" + slug, reference);
  return { ok: true, slug };
}

// Payment failed or the link expired: give the held unit back.
async function release(reference) {
  const r = redis();
  if (!r) return;
  const slug = await r.get("ref:" + reference);
  if (slug) await r.zrem("resv:" + slug, reference);
}

module.exports = { isReady, availability, reserve, referenceSize, confirm, release };
