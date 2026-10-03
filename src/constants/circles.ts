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

// One color per topic, each genuinely distinct from the others and from a white
// card background -- shared by the circles list's icon badges and the circle detail
// page's header band, so a circle reads as the same color in both places.
export const CIRCLE_TOPIC_COLORS: Record<CircleTopic, { bg: string; fg: string }> = {
  culture: { bg: "bg-teal-50", fg: "#206E65" },
  business: { bg: "bg-accent-50", fg: "#9E370B" },
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
