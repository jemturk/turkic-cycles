import { z } from "zod";

import { MENTOR_ROLES } from "@/constants/connectionTypes";
import { EXPERIENCE_LEVELS } from "@/constants/experience";
import { EXPERTISE, GOALS, LOCATION_PREFS, SELECTION_LIMITS } from "@/constants/matching";

// Business and academic mentorship, scored as the matching model's Mentor: years of
// experience (mentors need 3+ more than their mentee), expertise (what a mentor offers,
// what a mentee is after), goals and where the other should be. experienceLevel stays
// optional for answers given before years were asked.
export const mentorAnswersSchema = z.object({
  role: z.enum(MENTOR_ROLES),
  field: z.string().min(1),
  experienceLevel: z.enum(EXPERIENCE_LEVELS.map((l) => l.value) as [string, ...string[]]).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(50),
  expertise: z.array(z.enum(EXPERTISE)).min(1).max(SELECTION_LIMITS.expertise.max),
  goals: z.array(z.enum(GOALS.mentor)).min(SELECTION_LIMITS.goals.min).max(SELECTION_LIMITS.goals.max),
  locationPref: z.enum(LOCATION_PREFS),
});
export type MentorAnswers = z.infer<typeof mentorAnswersSchema>;

// Spiritual mentorship: no professional fit, so just the role, field, level and where.
export const spiritualMentorAnswersSchema = z.object({
  role: z.enum(MENTOR_ROLES),
  field: z.string().min(1),
  experienceLevel: z.enum(EXPERIENCE_LEVELS.map((l) => l.value) as [string, ...string[]]),
  locationPref: z.enum(LOCATION_PREFS),
});

export type MentorRole = (typeof MENTOR_ROLES)[number];

export const MENTOR_ROLE_LABELS: Record<MentorRole, string> = {
  seeking: "Seeking a mentor",
  offering: "Offering mentorship",
};
