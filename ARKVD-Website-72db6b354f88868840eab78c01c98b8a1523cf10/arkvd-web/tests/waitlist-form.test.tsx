// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaitlistProvider, WaitlistForm } from '../app/components/WaitlistForm';

const provider = vi.fn<typeof fetch>();
function page() {
  render(<WaitlistProvider><WaitlistForm variant="hero" cta="Join the list" /><WaitlistForm variant="footer" cta="Get early access" /></WaitlistProvider>);
  return userEvent.setup();
}
async function join(user: ReturnType<typeof userEvent.setup>, footer = false) {
  await user.type(screen.getAllByRole('textbox', { name: 'Email' })[footer ? 1 : 0], 'fan@example.com');
  await user.click(screen.getByRole('button', { name: footer ? 'Get early access' : 'Join the list' }));
}
beforeEach(() => { vi.stubGlobal('fetch', provider); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

it('saves email before offering optional names and one-tap referral choices', async () => {
  provider.mockResolvedValueOnce(Response.json({ ok: true, token: 'signed-test-token' }));
  provider.mockResolvedValueOnce(Response.json({ ok: true }));
  const user = page();
  await join(user);
  const firstName = await screen.findByRole('textbox', { name: 'First name' });
  expect(provider).toHaveBeenCalledTimes(1);
  expect(firstName.hasAttribute('required')).toBe(false);
  await user.type(firstName, 'Paul');
  await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'Karounos');
  await user.click(screen.getByRole('radio', { name: 'Instagram' }));
  await user.click(screen.getByRole('button', { name: 'Save details' }));
  expect(JSON.parse(provider.mock.calls[1][1]!.body as string)).toMatchObject({ token: 'signed-test-token', firstName: 'Paul', lastName: 'Karounos', heardAbout: 'Instagram' });
  expect(provider.mock.calls[1][1]!.method).toBe('PATCH');
  expect(screen.queryByRole('textbox', { name: 'First name' })).toBeNull();
  expect(screen.getAllByText('Details saved. See you on the floor.')).toHaveLength(2);
});

it('skip keeps the saved email without making another request', async () => {
  provider.mockResolvedValueOnce(Response.json({ ok: true, token: 'signed-test-token' }));
  const user = page();
  await join(user);
  await user.click(await screen.findByRole('button', { name: 'Skip for now' }));
  expect(provider).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('textbox', { name: 'First name' })).toBeNull();
  expect(screen.getAllByText(/when your invite is ready/).length).toBeGreaterThan(0);
});

it('profile failure preserves inputs, confirms email is saved, and allows skipping', async () => {
  provider.mockResolvedValueOnce(Response.json({ ok: true, token: 'signed-test-token' }));
  provider.mockResolvedValueOnce(Response.json({ error: 'provider failure' }, { status: 502 }));
  const user = page();
  await join(user);
  await user.type(await screen.findByRole('textbox', { name: 'First name' }), 'Paul');
  await user.click(screen.getByRole('button', { name: 'Save details' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Your email is saved');
  expect((screen.getByRole('textbox', { name: 'First name' }) as HTMLInputElement).value).toBe('Paul');
  await user.click(screen.getByRole('button', { name: 'Skip for now' }));
  expect(screen.queryByRole('textbox', { name: 'First name' })).toBeNull();
});

it('failed email save stays retryable and does not show a false confirmation', async () => {
  provider.mockResolvedValueOnce(Response.json({ error: 'Not configured' }, { status: 503 }));
  const user = page();
  await join(user);
  expect((await screen.findByRole('alert')).textContent).toMatch(/try again/i);
  expect(screen.queryByRole('textbox', { name: 'First name' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Join the list' })).toBeTruthy();
});

it('opens details only in the footer when the footer was used', async () => {
  provider.mockResolvedValueOnce(Response.json({ ok: true, token: 'signed-test-token' }));
  const user = page();
  await join(user, true);
  const form = await screen.findByRole('form', { name: 'Optional signup details' });
  expect(form.id).toContain('footer');
  expect(within(form).getByRole('textbox', { name: 'First name' })).toBeTruthy();
  expect(screen.getAllByRole('textbox', { name: 'First name' })).toHaveLength(1);
});

it('existing contacts get a confirmation without an editable profile', async () => {
  provider.mockResolvedValueOnce(Response.json({ ok: true }));
  const user = page();
  await join(user);
  expect(screen.queryByRole('button', { name: 'Save details' })).toBeNull();
  expect(screen.getAllByText("You're on the list")).toHaveLength(2);
});
