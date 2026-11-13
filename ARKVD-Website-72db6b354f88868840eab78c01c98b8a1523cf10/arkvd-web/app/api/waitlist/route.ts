import { NextResponse } from 'next/server';
import { EMAIL_RE, REFERRAL_OPTIONS } from '../../lib/waitlist-fields';
import { createProfileToken, readProfileToken } from '../../lib/waitlist-token';

export const runtime = 'nodejs';
const API = 'https://api.resend.com';
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const unavailable = () => reply({ error: 'Signup is temporarily unavailable. Please try again.' }, 503);
const providerError = () => reply({ error: 'Could not save right now. Please try again.' }, 502);

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    // Bound the actual body too, rather than trusting Content-Length.
    const reader = req.body?.getReader();
    if (!reader) return null;
    let text = '';
    let length = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
    const value = JSON.parse(text + decoder.decode());
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
function resend(path: string, key: string, method = 'GET', body?: object) {
  return fetch(`${API}${path}`, {
    method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
}

export async function POST(req: Request) {
  const body = await readBody(req);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) return reply({ error: 'Enter a valid email address.' }, 400);
  const key = process.env.RESEND_API_KEY;
  const segment = process.env.RESEND_SEGMENT_ID;
  if (!key || !segment) return unavailable();
  try {
    // Returning subscribers never grant permission to edit an existing profile.
    const existing = await resend(`/contacts/${encodeURIComponent(email)}`, key);
    const confirmExisting = async () => {
      const membership = await resend(`/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segment)}`, key, 'POST');
      return membership.ok ? reply({ ok: true }) : providerError();
    };
    if (existing.ok) return await confirmExisting();
    if (existing.status !== 404) return providerError();
    const response = await resend('/contacts', key, 'POST', { email, segments: [{ id: segment }] });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (response.status === 409 && error?.name === 'conflict' && /already exists/i.test(error?.message ?? '')) return await confirmExisting();
      return providerError();
    }
    const data = await response.json();
    if (typeof data.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(data.id)) return providerError();
    return reply({ ok: true, token: createProfileToken(data.id, key) });
  } catch { return providerError(); }
}

export async function PATCH(req: Request) {
  const body = await readBody(req);
  if (!body) return reply({ error: 'Invalid details.' }, 400);
  const key = process.env.RESEND_API_KEY;
  if (!key) return unavailable();
  const contactId = readProfileToken(body.token, key);
  if (!contactId) return reply({ error: 'This details session has expired. Your email signup is still saved.' }, 401);
  const update: Record<string, unknown> = {};
  for (const [field, stored] of [['firstName', 'first_name'], ['lastName', 'last_name']] as const) {
    const value = body[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || value.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(value)) return reply({ error: 'Enter a name of 80 characters or fewer.' }, 400);
    if (value.trim()) update[stored] = value.trim();
  }
  const referral = body.heardAbout;
  const detail = body.heardAboutDetail;
  if (referral !== undefined && (typeof referral !== 'string' || (referral !== '' && !REFERRAL_OPTIONS.includes(referral as typeof REFERRAL_OPTIONS[number])))) return reply({ error: 'Choose one of the referral options.' }, 400);
  if (detail !== undefined && (typeof detail !== 'string' || detail.trim().length > 160 || /[\u0000-\u001f\u007f]/.test(detail))) return reply({ error: 'Keep referral details to 160 characters.' }, 400);
  if (referral) update.properties = { heard_about: referral, ...(referral === 'Other' && typeof detail === 'string' && detail.trim() ? { heard_about_detail: detail.trim() } : {}) };
  if (!Object.keys(update).length) return reply({ ok: true });
  try {
    const response = await resend(`/contacts/${encodeURIComponent(contactId)}`, key, 'PATCH', update);
    return response.ok ? reply({ ok: true }) : providerError();
  } catch { return providerError(); }
}
