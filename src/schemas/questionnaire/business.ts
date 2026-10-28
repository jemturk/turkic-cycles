import { z } from "zod";

import { BUSINESS_ROLES } from "@/constants/connectionTypes";
import { EXPERIENCE_LEVELS } from "@/constants/experience";
import { EXPERTISE, GOALS, INDUSTRIES, SELECTION_LIMITS } from "@/constants/matching";

// industry, goals and expertise are the matching model's tags (src/constants/matching.ts);
// industry was free text before, so an older answer has to be picked again.
export const businessAnswersSchema = z
  .object({
    roles: z.array(z.enum(BUSINESS_ROLES)).min(1),
    industry: z.enum(INDUSTRIES),
    experienceLevel: z.enum(EXPERIENCE_LEVELS.map((l) => l.value) as [string, ...string[]]),
    goals: z.array(z.enum(GOALS.business)).min(SELECTION_LIMITS.goals.min).max(SELECTION_LIMITS.goals.max),
    expertiseOffered: z.array(z.enum(EXPERTISE)).max(SELECTION_LIMITS.expertise.max),
    expertiseSought: z.array(z.enum(EXPERTISE)).max(SELECTION_LIMITS.expertise.max),
  })
  // Scored on what one offers and the other seeks, so at least one of the two.
  .refine((a) => a.expertiseOffered.length + a.expertiseSought.length > 0, {
    path: ["expertiseOffered"],
    message: "expertiseRequired",
  });
export type BusinessAnswers = z.infer<typeof businessAnswersSchema>;
