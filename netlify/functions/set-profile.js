// netlify/functions/set-profile.js
// The members page POSTs { key, handle } to set a member's public leaderboard name.
// Validates the token (member must exist = active; cancelled members are deleted),
// sanitises + checks the handle, enforces uniqueness (case-insensitive), and saves it.
// Returns { ok:true, handle } or { ok:false, error } so the page can show a message.

const { getStore } = require('@netlify/blobs');

function store(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN,
  });
}

function cleanHandle(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/\s+/g, ' ');
}

// Light, sensible rules. Luke can still manually clear a bad handle if one slips through.
const BANNED_SUBSTRINGS = [
  'admin', 'official', 'moderator', 'staff', 'support', 'punters den', 'thepuntersden',
  'fuck', 'shit', 'cunt', 'bitch', 'slut', 'nigg', 'fagg', 'rape', 'paedo', 'pedo',
];
function handleError(h) {
  if (h.length < 3) return 'Pick at least 3 characters.';
  if (h.length > 20) return 'Keep it to 20 characters or fewer.';
  if (!/^[A-Za-z0-9 _-]+$/.test(h)) return 'Letters, numbers, spaces, _ and - only.';
  const lower = h.toLowerCase();
  if (BANNED_SUBSTRINGS.some(b => lower.includes(b))) return "That name isn't available — try another.";
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }
  const token = body.key;
  const handle = cleanHandle(body.handle);

  if (!token) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing access key.' }) };

  try {
    const members = store('members');
    const rec = await members.get(token, { type: 'json' });
    if (!rec) {
      // No record = not an active member (cancelled members are removed).
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Your membership link isn\'t active.' }) };
    }

    // LOCKED: a leaderboard name can only be set once. If one already exists, refuse changes.
    if (rec.handle) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, locked: true, handle: rec.handle, error: "Your leaderboard name is locked in and can't be changed." }) };
    }

    const err = handleError(handle);
    if (err) return { statusCode: 200, body: JSON.stringify({ ok: false, error: err }) };

    const byHandle = store('by-handle');     // lowercased handle -> token (uniqueness)
    const lower = handle.toLowerCase();
    const existing = await byHandle.get(lower, { type: 'json' }).catch(() => null);
    if (existing && existing.token !== token) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "That name's taken — try another." }) };
    }

    rec.handle = handle;
    await members.setJSON(token, rec);
    await byHandle.setJSON(lower, { token });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, handle }) };
  } catch (err) {
    console.error('set-profile error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Something went wrong — try again.' }) };
  }
};
