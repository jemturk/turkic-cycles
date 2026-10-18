// Spotting contact details in text members write, for safety nudges: a tip in chat
// before sharing a phone number, and a reminder that bios shouldn't carry contact
// details (Terms, Community rules). Only ever advisory -- nothing is blocked.

// A run of digits with the separators people type in phone numbers: +1 (555) 123-4567,
// 0532 123 45 67, 555.123.4567.
const PHONE_CANDIDATE = /\+?\(?\d[\d\s().-]{5,}\d/g;
// Dates and times look like numbers too: 2026-10-17, 17.10.2026, 10/17/26, 7:45.
const DATE_LIKE = /^\d{4}[-./]\d{1,2}[-./]\d{1,2}$|^\d{1,2}[-./]\d{1,2}[-./]\d{2,4}$/;

// Phone numbers have 7 to 15 digits (E.164 allows at most 15).
export function containsPhoneNumber(text: string): boolean {
  for (const match of text.match(PHONE_CANDIDATE) ?? []) {
    const candidate = match.trim();
    if (DATE_LIKE.test(candidate)) continue;
    const digits = candidate.replace(/\D/g, "").length;
    if (digits >= 7 && digits <= 15) return true;
  }
  return false;
}

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;

export function containsEmail(text: string): boolean {
  return EMAIL.test(text);
}
