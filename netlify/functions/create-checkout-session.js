// netlify/functions/create-checkout-session.js
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  bronze: process.env.STRIPE_PRICE_BRONZE,
  silver: process.env.STRIPE_PRICE_SILVER,
  gold:   process.env.STRIPE_PRICE_GOLD,
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { tier } = JSON.parse(event.body || '{}');
    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Unknown or missing tier' }) };
    }
    const siteUrl = process.env.URL || 'https://thepuntersden.com';
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      phone_number_collection: { enabled: true },
      metadata: { tier },
      subscription_data: { metadata: { tier } },
      return_url: `${siteUrl}/checkout-complete?session_id={CHECKOUT_SESSION_ID}`,
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: session.client_secret }),
    };
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not start checkout' }) };
  }
};
