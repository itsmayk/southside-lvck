// Localised share preview (Open Graph).
//
// WhatsApp / Meta / Twitter fetch the shared URL server-side and read the
// <meta> tags WITHOUT running the page's JavaScript — so the client-side
// language detection can never reach them, and a static page can only ever
// carry ONE language of preview. This function serves the OG/Twitter meta in
// the requested language, then redirects real visitors on to the actual page
// (which still localises itself by IP as usual). Clean URLs — /es, /en, /pt
// (and /es/shop …) — map here through vercel.json rewrites, so each language
// is its own shareable link with its own cached preview.

const BASE = "https://southside-lvck.vercel.app";

const OG = {
  es: { title: "SouthSide — LVCK", desc: "LVCK vuelve con SouthSide — el drop que marca nuestro nuevo capítulo. 15 AGO 2026.", locale: "es_CO" },
  en: { title: "SouthSide — LVCK", desc: "LVCK returns with SouthSide — the drop that marks our new chapter. 15 AUG 2026.", locale: "en_US" },
  pt: { title: "SouthSide — LVCK", desc: "A LVCK volta com SouthSide — o drop que marca nosso novo capítulo. 15 AGO 2026.", locale: "pt_BR" }
};
const DEST = { home: "/", shop: "/shop.html" };

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const lang = OG[q.lang] ? q.lang : "es";
  const toKey = DEST[q.to] ? q.to : "home";
  const dest = DEST[toKey];
  const og = OG[lang];
  const img = BASE + "/og-image.png?v=2";
  const shareUrl = BASE + "/" + lang + (toKey === "shop" ? "/shop" : "");

  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(og.title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="SouthSide">
<meta property="og:title" content="${esc(og.title)}">
<meta property="og:description" content="${esc(og.desc)}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${shareUrl}">
<meta property="og:locale" content="${og.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(og.title)}">
<meta name="twitter:description" content="${esc(og.desc)}">
<meta name="twitter:image" content="${img}">
<meta http-equiv="refresh" content="0; url=${dest}">
<link rel="canonical" href="${BASE}${dest}">
</head>
<body style="background:#0A0A0A;margin:0">
<script>location.replace(${JSON.stringify(dest)});</script>
<noscript><meta http-equiv="refresh" content="0; url=${dest}"></noscript>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(html);
};
