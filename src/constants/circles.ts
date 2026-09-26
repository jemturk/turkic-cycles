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

export const RSVP_STATUSES = [
  { value: "going", label: "Going" },
  { value: "interested", label: "Interested" },
  { value: "not_going", label: "Not going" },
] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number]["value"];
