// netlify/functions/create-checkout-session.js
// Creates a Stripe HOSTED checkout session. Returns a URL the page redirects to.
// Stripe-hosted = mobile-friendly (Apple Pay / Google Pay one-tap), trusted, zero embed gotchas.

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
    const { tier, ref } = JSON.parse(event.body || '{}');
    const refCode = ref ? String(ref).trim().slice(0, 40) : null;
    const priceId = PRICE_IDS[tier];

    if (!priceId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Unknown or missing tier' }) };
    }

    const siteUrl = process.env.URL || 'https://thepuntersden.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // Collect the mobile number so we can SMS the tips
      phone_number_collection: { enabled: true },
      // Store the tier on the session so the webhook knows what they bought
      metadata: { tier },
      // Referral: carry the referrer's code through so the webhook can attribute it
      ...(refCode ? { client_reference_id: refCode } : {}),
      subscription_data: {
        metadata: refCode ? { tier, ref: refCode } : { tier },
        trial_period_days: 7,   // 7-day free trial on every tier (card required)
      },
      success_url: `${siteUrl}/checkout-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#pricing`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not start checkout' }) };
  }
};
