import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;

  // No provider configured: accept and log (visible in Vercel → Logs).
  if (!key || !audience) {
    console.log("[waitlist]", email, body.source ?? "");
    return NextResponse.json({ ok: true });
  }

  const res = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false }),
  });

  // Resend returns 409/422 for duplicates — treat as success so repeat signups don't error.
  if (!res.ok && res.status !== 409 && res.status !== 422) {
    console.error("[waitlist] resend error", res.status, await res.text());
    return NextResponse.json({ error: "Could not join" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
