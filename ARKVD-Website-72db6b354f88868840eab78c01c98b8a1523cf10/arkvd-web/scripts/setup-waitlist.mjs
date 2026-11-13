// Run once after configuring the server-side Resend API key.
// This creates property definitions, never contacts or emails.
const key = process.env.RESEND_API_KEY;
if (!key) { console.error('Set RESEND_API_KEY in the environment first.'); process.exit(1); }
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
async function call(path, options = {}) {
  const response = await fetch(`https://api.resend.com${path}`, { ...options, headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Resend request failed (${response.status}). Check API access and configuration.`);
  return response.json();
}
try {
  const existing = new Map();
  let after;
  do {
    const result = await call(`/contact-properties?limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`);
    for (const property of result.data) existing.set(property.key, property.type);
    if (result.has_more && !result.data.length) throw new Error('Could not paginate contact properties.');
    after = result.has_more ? result.data.at(-1).id : undefined;
  } while (after);
  for (const name of ['heard_about', 'heard_about_detail']) {
    if (existing.has(name)) {
      if (existing.get(name) !== 'string') throw new Error(`${name} must be a string property. Correct its configuration before deploying.`);
      console.log(`${name}: already configured`);
      continue;
    }
    await call('/contact-properties', { method: 'POST', body: JSON.stringify({ key: name, type: 'string' }) });
    console.log(`${name}: created`);
  }
  console.log('Waitlist properties ready. No contacts or emails were created.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
