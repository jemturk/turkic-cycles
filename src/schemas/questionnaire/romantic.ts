import { z } from "zod";

export const romanticAnswersSchema = z.object({
  relationshipIntent: z.enum(["casual", "long_term", "marriage", "not_sure"]),
  wantsKids: z.enum(["yes", "no", "open", "has_kids_already"]),
  sharedReligionImportance: z.enum(["not_important", "somewhat", "very_important"]),
  sharedCultureImportance: z.enum(["not_important", "somewhat", "very_important"]),
});
export type RomanticAnswers = z.infer<typeof romanticAnswersSchema>;
