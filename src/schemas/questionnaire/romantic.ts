import { z } from "zod";

export const romanticAnswersSchema = z.object({
  relationshipIntent: z.enum(["casual", "long_term", "marriage", "not_sure"]),
  wantsKids: z.enum(["yes", "no", "open", "has_kids_already"]),
  sharedReligionImportance: z.enum(["not_important", "somewhat", "very_important"]),
  sharedCultureImportance: z.enum(["not_important", "somewhat", "very_important"]),
});
export type RomanticAnswers = z.infer<typeof romanticAnswersSchema>;

export const RELATIONSHIP_INTENT_LABELS: Record<RomanticAnswers["relationshipIntent"], string> = {
  casual: "Casual",
  long_term: "Long-term",
  marriage: "Marriage",
  not_sure: "Not sure yet",
};

export const WANTS_KIDS_LABELS: Record<RomanticAnswers["wantsKids"], string> = {
  yes: "Yes",
  no: "No",
  open: "Open to it",
  has_kids_already: "I already have kids",
};

export const IMPORTANCE_LABELS: Record<RomanticAnswers["sharedReligionImportance"], string> = {
  not_important: "Not important",
  somewhat: "Somewhat important",
  very_important: "Very important",
};
