import { z } from "zod";

import { GENDER_GROUPS, GENDERS, GOALS, SELECTION_LIMITS } from "@/constants/matching";

// Faith is now a values question (how important, never which), so the old "shared
// religion" question stays optional for answers given before.
export const romanticAnswersSchema = z
  .object({
  relationshipIntent: z.enum(["casual", "long_term", "marriage", "not_sure"]),
  wantsKids: z.enum(["yes", "no", "open", "has_kids_already"]),
  sharedReligionImportance: z.enum(["not_important", "somewhat", "very_important"]).optional(),
  sharedCultureImportance: z.enum(["not_important", "somewhat", "very_important"]),
  goals: z.array(z.enum(GOALS.romantic)).min(SELECTION_LIMITS.goals.min).max(SELECTION_LIMITS.goals.max),
  gender: z.enum(GENDERS),
  genderDescription: z.string().max(40).optional(),
  interestedIn: z.array(z.enum(GENDER_GROUPS)).min(1),
  // Only for someone who self-describes: who sees them.
  shownTo: z.array(z.enum(GENDER_GROUPS)).optional(),
  })
  .refine((a) => a.gender !== "self_describe" || (a.shownTo?.length ?? 0) > 0, {
    path: ["shownTo"],
    message: "shownToRequired",
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

export const IMPORTANCE_LABELS: Record<NonNullable<RomanticAnswers["sharedCultureImportance"]>, string> = {
  not_important: "Not important",
  somewhat: "Somewhat important",
  very_important: "Very important",
};
