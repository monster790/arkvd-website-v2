"use client";

import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";

type Status = "idle" | "loading" | "joined";
type Ctx = { email: string; status: Status; setJoined: (email: string) => void };

const WaitlistContext = createContext<Ctx | null>(null);

// Shares "joined" state so both forms on the page flip together.
export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  return (
    <WaitlistContext.Provider value={{ email, status, setJoined: (e) => { setEmail(e); setStatus("joined"); } }}>
      {children}
    </WaitlistContext.Provider>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm({ variant, cta }: { variant: "hero" | "footer"; cta: string }) {
  const ctx = useContext(WaitlistContext)!;
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (ctx.status === "joined") {
    return (
      <div className="success" role="status">
        <div className="success-title"><span className="dot" />You're on the list</div>
        {variant === "hero" && <div>We'll email {ctx.email} when your invite is ready.</div>}
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const email = value.trim();
    if (!EMAIL_RE.test(email)) return setError("That email doesn't look right.");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: variant }),
      });
      if (!res.ok) throw new Error();
      ctx.setJoined(email);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="form-row">
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@email.com"
          aria-label="Email"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
        />
        <button className="btn" type="submit" disabled={loading}>{loading ? "Joining…" : cta}</button>
      </div>
      {error && <div className="label" role="alert">{error}</div>}
      {variant === "hero" && <div className="label">One email when your invite is ready. Nothing else.</div>}
    </form>
  );
}
