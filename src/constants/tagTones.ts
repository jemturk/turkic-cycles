// One soft tint per profile section, from the palette's lightest shades (the same
// family as the circle icons), so the sections are easy to tell apart at a glance:
// the pills on a profile (ProfileView) and the selected chips in Edit profile.
export type TagTone = { bg: string; text: string };

export const TAG_TONES = {
  languages: { bg: "bg-primary-100", text: "text-primary-600" },
  interests: { bg: "bg-gold-100", text: "text-gold-600" },
  hobbies: { bg: "bg-accent-50", text: "text-accent-600" },
  travelStyles: { bg: "bg-teal-50", text: "text-teal-600" },
  originCountries: { bg: "bg-ink-100", text: "text-ink-700" },
} as const satisfies Record<string, TagTone>;

export type TagToneName = keyof typeof TAG_TONES;
