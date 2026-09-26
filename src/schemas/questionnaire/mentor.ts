import { z } from "zod";

import { MENTOR_ROLES } from "@/constants/connectionTypes";
import { EXPERIENCE_LEVELS } from "@/constants/experience";

// Shared shape for business_mentor / academic_mentor / spiritual_mentor —
// the specific connection_type disambiguates which mentor track this is.
export const mentorAnswersSchema = z.object({
  role: z.enum(MENTOR_ROLES),
  field: z.string().min(1),
  experienceLevel: z.enum(EXPERIENCE_LEVELS.map((l) => l.value) as [string, ...string[]]),
});
export type MentorAnswers = z.infer<typeof mentorAnswersSchema>;
