import { z } from "zod";

import { BUSINESS_ROLES } from "@/constants/connectionTypes";
import { EXPERIENCE_LEVELS } from "@/constants/experience";

export const businessAnswersSchema = z.object({
  roles: z.array(z.enum(BUSINESS_ROLES)).min(1),
  industry: z.string().min(1),
  experienceLevel: z.enum(EXPERIENCE_LEVELS.map((l) => l.value) as [string, ...string[]]),
});
export type BusinessAnswers = z.infer<typeof businessAnswersSchema>;
