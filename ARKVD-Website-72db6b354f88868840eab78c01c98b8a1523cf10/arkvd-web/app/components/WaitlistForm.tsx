"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { EMAIL_RE, REFERRAL_OPTIONS } from '../lib/waitlist-fields';

type Variant = 'hero' | 'footer';
type Signup = { email: string; token?: string; active: Variant; step: 'details' | 'done'; saved: boolean };
type Ctx = { signup: Signup | null; joining: boolean; setJoining: (value: boolean) => void; joined: (email: string, token: string | undefined, active: Variant) => void; finish: (saved: boolean) => void };
const WaitlistContext = createContext<Ctx | null>(null);

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [signup, setSignup] = useState<Signup | null>(null);
  const [joining, setJoining] = useState(false);
  return <WaitlistContext.Provider value={{ signup, joining, setJoining,
    joined: (email, token, active) => setSignup({ email, token, active, step: token ? 'details' : 'done', saved: false }),
    finish: saved => setSignup(current => current ? { ...current, token: undefined, step: 'done', saved } : null),
  }}>{children}</WaitlistContext.Provider>;
}

export function WaitlistForm({ variant, cta }: { variant: Variant; cta: string }) {
  const ctx = useContext(WaitlistContext)!;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [heardAbout, setHeardAbout] = useState('');
  const [heardAboutDetail, setHeardAboutDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const prefix = `waitlist-${variant}`;
  const signup = ctx.signup;
  const active = signup?.active === variant;

  useEffect(() => {
    if (active && signup) title.current?.focus({ preventScroll: true });
  }, [active, signup?.step]);

  async function onJoin(event: FormEvent) {
    event.preventDefault();
    if (ctx.joining) return;
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized) || normalized.length > 320) {
      setError("That email doesn't look right.");
      emailInput.current?.focus();
      return;
    }
    ctx.setJoining(true);
    setError('');
    try {
      const response = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, source: variant }), signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error();
      ctx.joined(normalized, typeof result.token === 'string' ? result.token : undefined, variant);
    } catch { setError("Couldn't join right now. Please try again."); }
    finally { ctx.setJoining(false); }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (saving || !signup?.token) return;
    if (!firstName.trim() && !lastName.trim() && !heardAbout) { ctx.finish(false); return; }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/waitlist', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: signup.token, firstName, lastName, heardAbout, ...(heardAbout === 'Other' ? { heardAboutDetail } : {}) }),
        signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        setError(response.status === 401 ? 'Your email is saved. This details session has expired; you can skip for now.' : "Your email is saved. We couldn't save these details. Try again or skip for now.");
        return;
      }
      ctx.finish(true);
    } catch { setError("Your email is saved. We couldn't save these details. Try again or skip for now."); }
    finally { setSaving(false); }
  }

  if (signup) {
    const showDetails = active && signup.step === 'details';
    return <div className={`success${showDetails ? ' signup-details' : ''}`}>
      <div role="status">
        <h2 className="success-title" ref={title} tabIndex={-1}><span className="dot" aria-hidden="true" />You're on the list</h2>
        <div className="signup-confirmation">We'll email {signup.email} when your invite is ready.</div>
        {signup.saved && <div className="signup-saved">Details saved. See you on the floor.</div>}
      </div>
      {showDetails && <form id={`${prefix}-details`} className="details-form" aria-label="Optional signup details" onSubmit={onSave}>
        <div className="details-intro">Tell us a little about yourself.<span>Everything below is optional.</span></div>
        <div className="name-fields">
          <label htmlFor={`${prefix}-first`}>First name<input id={`${prefix}-first`} className="input" name="given-name" autoComplete="given-name" maxLength={80} value={firstName} onChange={e => setFirstName(e.target.value)} disabled={saving} /></label>
          <label htmlFor={`${prefix}-last`}>Last name<input id={`${prefix}-last`} className="input" name="family-name" autoComplete="family-name" maxLength={80} value={lastName} onChange={e => setLastName(e.target.value)} disabled={saving} /></label>
        </div>
        <fieldset className="referral-options" disabled={saving}>
          <legend>How did you hear about ARKVD?</legend>
          <div className="referral-choices">{REFERRAL_OPTIONS.map(option => <label className="referral-choice" key={option}>
            <input type="radio" name={`${prefix}-referral`} value={option} checked={heardAbout === option} onChange={() => setHeardAbout(option)} /><span>{option}</span>
          </label>)}</div>
        </fieldset>
        {heardAbout === 'Other' && <label className="other-referral" htmlFor={`${prefix}-other`}>Where did you find us? <span className="optional-note">(optional)</span><input id={`${prefix}-other`} className="input" maxLength={160} value={heardAboutDetail} onChange={e => setHeardAboutDetail(e.target.value)} disabled={saving} /></label>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="details-actions"><button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button><button className="skip-button" type="button" disabled={saving} onClick={() => ctx.finish(false)}>Skip for now</button></div>
      </form>}
    </div>;
  }

  return <form className="form" onSubmit={onJoin} noValidate aria-label="Join the ARKVD waitlist">
    <div className="form-row">
      <input ref={emailInput} id={`${prefix}-email`} className="input" type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={320}
        placeholder="you@email.com" aria-label="Email" aria-invalid={!!error} aria-describedby={error ? `${prefix}-error` : undefined}
        value={email} onChange={e => { setEmail(e.target.value); setError(''); }} disabled={ctx.joining} />
      <button className="btn" type="submit" disabled={ctx.joining}>{ctx.joining ? 'Joining…' : cta}</button>
    </div>
    {error && <div className="form-error" id={`${prefix}-error`} role="alert">{error}</div>}
    {variant === 'hero' && <div className="label">One email when your invite is ready. Nothing else.</div>}
  </form>;
}
