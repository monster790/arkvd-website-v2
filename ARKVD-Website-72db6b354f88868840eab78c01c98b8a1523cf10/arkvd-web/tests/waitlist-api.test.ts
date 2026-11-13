import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST, PATCH } from '../app/api/waitlist/route';

const contactId = '479e3145-dd38-476b-932c-529ceb705947';
const provider = vi.fn<typeof fetch>();
const request = (body: unknown, method = 'POST') => new Request('https://arkvd.com/api/waitlist', {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const json = (body: unknown, status = 200) => Response.json(body, { status });
function newContact() {
  provider.mockResolvedValueOnce(json({ name: 'not_found', message: 'Contact not found' }, 404));
  provider.mockResolvedValueOnce(json({ object: 'contact', id: contactId }));
}

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', 'test-only-provider-key');
  vi.stubEnv('RESEND_SEGMENT_ID', 'test-segment');
  vi.stubGlobal('fetch', provider);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe('waitlist signup', () => {
  it('fails closed when storage is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect((await POST(request({ email: 'fan@example.com' }))).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });
  it.each([null, [], { email: 12 }, { email: 'wrong' }, { email: 'a'.repeat(321) + '@example.com' }])('rejects malformed input %j', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
  it('normalizes email, saves to the waitlist segment, then issues an update token', async () => {
    newContact();
    const response = await POST(request({ email: '  Fan@Example.com ', source: 'footer' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, token: expect.any(String) });
    expect(provider.mock.calls[0][0]).toBe('https://api.resend.com/contacts/fan%40example.com');
    const [url, options] = provider.mock.calls[1];
    expect(url).toBe('https://api.resend.com/contacts');
    expect(JSON.parse(options!.body as string)).toEqual({ email: 'fan@example.com', segments: [{ id: 'test-segment' }] });
  });
  it('does not overwrite an existing contact or re-subscribe them', async () => {
    provider.mockResolvedValueOnce(json({ object: 'contact', id: contactId, unsubscribed: true }));
    provider.mockResolvedValueOnce(json({ object: 'contact_segment', contact_id: contactId, segment_id: 'test-segment' }));
    const response = await POST(request({ email: 'fan@example.com' }));
    expect(await response.json()).toEqual({ ok: true });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider.mock.calls[1][0]).toBe('https://api.resend.com/contacts/fan%40example.com/segments/test-segment');
    expect(provider.mock.calls[1][1]!.method).toBe('POST');
    expect(provider.mock.calls[1][1]!.body).toBeUndefined();
  });
  it('treats only a confirmed duplicate conflict as a completed repeat signup', async () => {
    provider.mockResolvedValueOnce(json({}, 404));
    provider.mockResolvedValueOnce(json({ name: 'validation_error' }, 422));
    expect((await POST(request({ email: 'fan@example.com' }))).status).toBe(502);
  });
  it('handles a concurrent signup conflict without allowing a profile overwrite', async () => {
    provider.mockResolvedValueOnce(json({}, 404));
    provider.mockResolvedValueOnce(json({ name: 'conflict', message: 'Contact already exists' }, 409));
    provider.mockResolvedValueOnce(json({ object: 'contact_segment', contact_id: contactId, segment_id: 'test-segment' }));
    expect(await (await POST(request({ email: 'fan@example.com' }))).json()).toEqual({ ok: true });
  });
  it('does not hide provider lookup failures', async () => {
    provider.mockResolvedValueOnce(json({}, 401));
    expect((await POST(request({ email: 'fan@example.com' }))).status).toBe(502);
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it('handles network errors without claiming signup success', async () => {
    provider.mockRejectedValueOnce(new Error('offline'));
    expect((await POST(request({ email: 'fan@example.com' }))).status).toBe(502);
  });
});

describe('optional details', () => {
  it('saves names and referral against only the contact named in the signed token', async () => {
    newContact();
    const { token } = await (await POST(request({ email: 'fan@example.com' }))).json();
    provider.mockResolvedValueOnce(json({ object: 'contact', id: contactId }));
    const response = await PATCH(request({ token, firstName: '  Zoë ', lastName: ' O’Neill ', heardAbout: 'Other', heardAboutDetail: ' A poster ' }, 'PATCH'));
    expect(response.status).toBe(200);
    const [url, options] = provider.mock.calls[2];
    expect(url).toBe(`https://api.resend.com/contacts/${contactId}`);
    expect(options!.method).toBe('PATCH');
    expect(JSON.parse(options!.body as string)).toEqual({ first_name: 'Zoë', last_name: 'O’Neill', properties: { heard_about: 'Other', heard_about_detail: 'A poster' } });
  });
  it('does not clear omitted fields when saving partial details', async () => {
    newContact();
    const { token } = await (await POST(request({ email: 'fan@example.com' }))).json();
    provider.mockResolvedValueOnce(json({ id: contactId }));
    expect((await PATCH(request({ token, firstName: 'Paul', lastName: '' }, 'PATCH'))).status).toBe(200);
    expect(JSON.parse(provider.mock.calls[2][1]!.body as string)).toEqual({ first_name: 'Paul' });
  });
  it.each(['fake', '', undefined])('rejects unsigned profile updates', async token => {
    expect((await PATCH(request({ token, firstName: 'Intruder' }, 'PATCH'))).status).toBe(401);
    expect(provider).not.toHaveBeenCalled();
  });
  it('rejects a tampered token and expired token', async () => {
    newContact();
    const { token } = await (await POST(request({ email: 'fan@example.com' }))).json();
    expect((await PATCH(request({ token: token + 'x', firstName: 'Intruder' }, 'PATCH'))).status).toBe(401);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 31 * 60 * 1000);
    expect((await PATCH(request({ token, firstName: 'Late' }, 'PATCH'))).status).toBe(401);
    vi.restoreAllMocks();
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid names and referral values before contacting the provider', async () => {
    newContact();
    const { token } = await (await POST(request({ email: 'fan@example.com' }))).json();
    for (const fields of [{ firstName: 12 }, { lastName: 'a'.repeat(81) }, { heardAbout: 'forged' }, { heardAboutDetail: 'x'.repeat(161) }]) {
      expect((await PATCH(request({ token, ...fields }, 'PATCH'))).status).toBe(400);
    }
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it('does not report a failed profile save as success', async () => {
    newContact();
    const { token } = await (await POST(request({ email: 'fan@example.com' }))).json();
    provider.mockResolvedValueOnce(json({}, 429));
    expect((await PATCH(request({ token, firstName: 'Paul' }, 'PATCH'))).status).toBe(502);
  });
});

it('does not confirm an existing contact if waitlist membership could not be saved', async () => {
  provider.mockResolvedValueOnce(json({ object: 'contact', id: contactId }));
  provider.mockResolvedValueOnce(json({ name: 'rate_limit_exceeded' }, 429));
  expect((await POST(request({ email: 'fan@example.com' }))).status).toBe(502);
});
