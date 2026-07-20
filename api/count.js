// Public subscriber count for the social-proof line under the signup form.
// Reads the group's active_count from MailerLite. The API key stays server-side;
// only the bare number is ever exposed.

const GROUP_ID = "193091730480825821"; // same group as api/subscribe.js
const ML_GROUPS = "https://connect.mailerlite.com/api/groups?limit=100";

// A cold function instance would hit MailerLite on every request, so cache in
// module scope (survives warm invocations) and let the CDN hold it too.
let cache = { at: 0, count: null };
const TTL_MS = 5 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  if (cache.count !== null && now - cache.at < TTL_MS) {
    return res.status(200).json({ count: cache.count, cached: true });
  }

  const key = process.env.MAILERLITE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
    const mlRes = await fetch(ML_GROUPS, {
      headers: { Authorization: "Bearer " + key, Accept: "application/json" },
    });
    if (!mlRes.ok) {
      return res.status(502).json({ error: "MailerLite unavailable", status: mlRes.status });
    }

    const json = await mlRes.json();
    const group = (json && json.data || []).find(function (g) { return String(g.id) === GROUP_ID; });
    if (!group) {
      return res.status(502).json({ error: "Group not found" });
    }

    const count = Number(group.active_count);
    if (!Number.isFinite(count)) {
      return res.status(502).json({ error: "No count in response" });
    }

    cache = { at: now, count: count };
    return res.status(200).json({ count: count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
