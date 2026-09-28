import type { Ionicons } from "@expo/vector-icons";

export const CIRCLE_TOPICS = ["culture", "business", "newcomers", "family", "creative"] as const;
export type CircleTopic = (typeof CIRCLE_TOPICS)[number];

export const CIRCLE_TOPIC_ICONS: Record<CircleTopic, keyof typeof Ionicons.glyphMap> = {
  culture: "people-outline",
  business: "briefcase-outline",
  newcomers: "compass-outline",
  family: "home-outline",
  creative: "musical-notes-outline",
};

export const CIRCLE_TOPIC_COLORS: Record<CircleTopic, { bg: string; fg: string }> = {
  culture: { bg: "bg-teal-50", fg: "#2C8B80" },
  business: { bg: "bg-coral-50", fg: "#D9663D" },
  newcomers: { bg: "bg-teal-50", fg: "#2C8B80" },
  family: { bg: "bg-coral-50", fg: "#D9663D" },
  creative: { bg: "bg-teal-50", fg: "#2C8B80" },
};

// A distinct variant for the circles list's small icon badges specifically: the pale
// -50 tints above all read as near-white on that screen's white cards, and culture/
// newcomers/creative (as well as business/family) share the exact same tint, so nothing
// there actually distinguished 5 topics from each other. This gives all 5 their own
// visibly different color, without touching CIRCLE_TOPIC_COLORS (still used as-is for
// the circle detail page's header band).
export const CIRCLE_TOPIC_BADGE_COLORS: Record<CircleTopic, { bg: string; fg: string }> = {
  culture: { bg: "bg-teal-50", fg: "#206E65" },
  business: { bg: "bg-coral-100", fg: "#C24F2A" },
  newcomers: { bg: "bg-gold-100", fg: "#9C7A28" },
  family: { bg: "bg-ink-100", fg: "#4A3F3A" },
  creative: { bg: "bg-teal-100", fg: "#206E65" },
};

export const RSVP_STATUSES = [
  { value: "going", label: "Going" },
  { value: "interested", label: "Interested" },
  { value: "not_going", label: "Not going" },
] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number]["value"];
