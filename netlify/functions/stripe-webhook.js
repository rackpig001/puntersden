// netlify/functions/stripe-webhook.js
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const members = getStore('members');
  const byCustomer = getStore('by-customer');

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const tier = session.metadata?.tier || 'unknown';
        const customerId = session.customer;
        const phone = session.customer_details?.phone || null;
        const token = crypto.randomBytes(24).toString('hex');
        const record = { customerId, tier, phone, createdAt: new Date().toISOString() };
        await members.setJSON(token, record);
        if (customerId) await byCustomer.setJSON(customerId, { token });
        console.log(`New ${tier} member. Token: ${token}. Phone: ${phone}`);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object;
        const customerId = sub.customer;
        const map = await byCustomer.get(customerId, { type: 'json' });
        if (map?.token) {
          await members.delete(map.token);
          await byCustomer.delete(customerId);
          console.log(`Revoked access for customer ${customerId}`);
        }
        break;
      }
      default: break;
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('Webhook handler error:', err);
    return { statusCode: 500, body: 'Webhook handler failed' };
  }
};
