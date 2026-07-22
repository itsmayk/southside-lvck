const Stripe = require("stripe");
const config = require("../shop-config.json");

// the catalog is grouped by product; stock is reported per size, keyed by the
// same slug the storefront puts on each size button
const variants = config.products.flatMap((p) => p.sizes);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const entries = await Promise.all(
      variants.map(async (item) => {
        const link = await stripe.paymentLinks.retrieve(item.paymentLinkId);
        return [item.slug, link.active];
      })
    );
    res.status(200).json(Object.fromEntries(entries));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
