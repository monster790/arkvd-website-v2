import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL = 30 * 60 * 1000;
function signature(payload: string, key: string) {
  return createHmac('sha256', key).update(`arkvd-waitlist-profile:v1:${payload}`).digest('base64url');
}
export function createProfileToken(contactId: string, key: string) {
  const payload = Buffer.from(JSON.stringify({ contactId, expires: Date.now() + TTL })).toString('base64url');
  return `${payload}.${signature(payload, key)}`;
}
export function readProfileToken(token: unknown, key: string): string | null {
  if (typeof token !== 'string' || token.length > 1024) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signed] = parts;
  const expected = Buffer.from(signature(payload, key));
  const received = Buffer.from(signed);
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.contactId !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(data.contactId)
      || typeof data.expires !== 'number' || data.expires <= Date.now()) return null;
    return data.contactId;
  } catch { return null; }
}
