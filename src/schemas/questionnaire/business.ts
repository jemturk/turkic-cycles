import { z } from "zod";

import { BUSINESS_ROLES } from "@/constants/connectionTypes";

export const businessAnswersSchema = z.object({
  roles: z.array(z.enum(BUSINESS_ROLES)).min(1),
  industry: z.string().min(1),
  experienceLevel: z.enum(["student", "early_career", "mid_career", "senior", "executive"]),
});
export type BusinessAnswers = z.infer<typeof businessAnswersSchema>;
