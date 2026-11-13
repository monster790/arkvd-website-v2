export const REFERRAL_OPTIONS = ['Instagram', 'TikTok', 'Friend', 'Event / DJ', 'Other'] as const;
export type Referral = typeof REFERRAL_OPTIONS[number];
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
