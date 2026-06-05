// netlify/functions/test-sms.js
// Fire a TEST welcome SMS to your own phone, straight from the browser - no purchase needed.
//
// SETUP (one-time):
//   1. In Netlify env vars, set TEST_SMS_SECRET to any long random phrase only you know,
//      e.g. TEST_SMS_SECRET = punters-den-test-8741-koala
//      (plus the usual MOBILE_MESSAGE_API_USERNAME / _PASSWORD / SMS_SENDER)
//   2. Redeploy, then visit in your browser:
//      https://thepuntersden.com/.netlify/functions/test-sms?to=04XXXXXXXX&secret=YOUR_SECRET
//
// It sends the real welcome template with a dummy link, and shows you Mobile Message's
// response (including your remaining credit-relevant status) as JSON in the browser.
//
// SECURITY: refuses to run unless TEST_SMS_SECRET is set AND matches. Once you've
// finished testing, delete this file from netlify/functions/ (or unset TEST_SMS_SECRET).

const MM_API = 'https://api.mobilemessage.com.au/v1';

function welcomeText(tier, link) {
  const tierName = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '';
  const hello = tierName ? `Welcome to The Punters Den (${tierName})!` : 'Welcome to The Punters Den!';
  return `${hello} Your private tips link - save it:\n${link}\n\nFresh tips drop each week. 18+ Gamble responsibly 1800 858 858.{optout}`;
}

exports.handler = async (event) => {
  const json = (code, obj) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj, null, 2),
  });

  const secret = process.env.TEST_SMS_SECRET;
  if (!secret) {
    return json(403, { error: 'TEST_SMS_SECRET is not set in Netlify env vars. Set it first (any long random phrase), redeploy, then retry.' });
  }
  const params = event.queryStringParameters || {};
  if (params.secret !== secret) {
    return json(403, { error: 'Wrong or missing secret.' });
  }
  if (!process.env.MOBILE_MESSAGE_API_USERNAME || !process.env.MOBILE_MESSAGE_API_PASSWORD || !process.env.SMS_SENDER) {
    return json(500, { error: 'SMS env vars missing. Set MOBILE_MESSAGE_API_USERNAME, MOBILE_MESSAGE_API_PASSWORD and SMS_SENDER in Netlify.' });
  }
  const to = (params.to || '').replace(/\s+/g, '');
  if (!/^(\+?61|0)4\d{8}$/.test(to)) {
    return json(400, { error: 'Provide an Australian mobile as ?to=04XXXXXXXX' });
  }

  const tier = ['bronze', 'silver', 'gold'].includes(params.tier) ? params.tier : 'gold';
  const link = 'https://thepuntersden.com/tips?key=TEST-PREVIEW-LINK';

  try {
    const creds = `${process.env.MOBILE_MESSAGE_API_USERNAME}:${process.env.MOBILE_MESSAGE_API_PASSWORD}`;
    const res = await fetch(`${MM_API}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(creds).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          to,
          message: welcomeText(tier, link),
          sender: process.env.SMS_SENDER,
          custom_ref: 'test-welcome',
        }],
        max_parts: 3,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return json(res.ok ? 200 : 502, {
      sent_to: to,
      tier_template_used: tier,
      sender_used: process.env.SMS_SENDER,
      mobile_message_response: data,
      note: res.ok
        ? 'Check your phone! If nothing arrives, check the response above and that SMS_SENDER exactly matches a sender in your Mobile Message account.'
        : 'Mobile Message rejected the send - see response above (commonly: wrong credentials, unknown sender, or no credits).',
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
