import { z } from "zod";

import type { ConnectionType } from "@/constants/connectionTypes";
import { romanticAnswersSchema } from "./romantic";
import { businessAnswersSchema } from "./business";
import { mentorAnswersSchema, spiritualMentorAnswersSchema } from "./mentor";
import { buildValuesSchema, valuesQuestionsFor } from "./values";
import { friendAnswersSchema } from "./friend";

// Branching questionnaire: only mounts/validates the question sets for the
// connection types the user actually selected in step 1. Answers for a type that
// isn't selected (Edit profile keeps them after the type is removed) pass unchecked,
// so removing a type never blocks saving.
export function buildStep4Schema(connectionTypes: ConnectionType[]) {
  return z.object({
    values: valuesQuestionsFor(connectionTypes).length ? buildValuesSchema(connectionTypes) : z.unknown().optional(),
    friend: connectionTypes.includes("friend") ? friendAnswersSchema : z.unknown().optional(),
    romantic: connectionTypes.includes("romantic")
      ? romanticAnswersSchema
      : z.unknown().optional(),
    business: connectionTypes.includes("business")
      ? businessAnswersSchema
      : z.unknown().optional(),
    business_mentor: connectionTypes.includes("business_mentor")
      ? mentorAnswersSchema
      : z.unknown().optional(),
    academic_mentor: connectionTypes.includes("academic_mentor")
      ? mentorAnswersSchema
      : z.unknown().optional(),
    spiritual_mentor: connectionTypes.includes("spiritual_mentor")
      ? spiritualMentorAnswersSchema
      : z.unknown().optional(),
  });
}

export type Step4Answers = z.infer<ReturnType<typeof buildStep4Schema>>;
