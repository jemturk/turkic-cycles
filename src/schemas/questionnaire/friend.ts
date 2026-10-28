import { z } from "zod";

import { GOALS, SELECTION_LIMITS } from "@/constants/matching";

// Friend had no questions of its own until the matching model's goals.
export const friendAnswersSchema = z.object({
  goals: z.array(z.enum(GOALS.friend)).min(SELECTION_LIMITS.goals.min).max(SELECTION_LIMITS.goals.max),
});
export type FriendAnswers = z.infer<typeof friendAnswersSchema>;
