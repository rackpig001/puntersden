// netlify/functions/leaderboard.js
// Public — returns the referral leaderboard: members who've set a username.
// Privacy: ONLY handle, tier and referral counts leave this function — never the
// token, customer id, phone or any personal detail. Ranked client-side per tab.
//
// Scale note: this lists every member record on each call, which is fine at launch
// scale (tens of members). If the member base grows large, swap to a cached index
// updated when referrals change, rather than listing on every request.

const { getStore } = require('@netlify/blobs');

function store(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN,
  });
}

exports.handler = async () => {
  try {
    const members = store('members');
    const listed = await members.list();
    const keys = (listed && listed.blobs ? listed.blobs : []).map(b => b.key);

    const rows = [];
    for (const key of keys) {
      const rec = await members.get(key, { type: 'json' }).catch(() => null);
      if (!rec || !rec.handle) continue;            // only opted-in members (have a username)
      const ref = rec.referrals || { allTime: 0, season: 0 };
      rows.push({
        handle: rec.handle,
        tier: rec.tier || null,
        allTime: ref.allTime || 0,
        season: ref.season || 0,
        joinedAt: rec.createdAt || null,            // used only as a tiebreak, not shown
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({ count: rows.length, members: rows }),
    };
  } catch (err) {
    console.error('leaderboard error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error', members: [] }) };
  }
};
