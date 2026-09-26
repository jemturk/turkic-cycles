import { z } from "zod";

import type { ConnectionType } from "@/constants/connectionTypes";
import { romanticAnswersSchema } from "./romantic";
import { businessAnswersSchema } from "./business";
import { mentorAnswersSchema } from "./mentor";

// Branching questionnaire: only mounts/validates the question sets for the
// connection types the user actually selected in step 1. `friend` has no
// question set at all, so a friend-only selection contributes no keys.
export function buildStep4Schema(connectionTypes: ConnectionType[]) {
  return z.object({
    romantic: connectionTypes.includes("romantic")
      ? romanticAnswersSchema
      : z.undefined().optional(),
    business: connectionTypes.includes("business")
      ? businessAnswersSchema
      : z.undefined().optional(),
    business_mentor: connectionTypes.includes("business_mentor")
      ? mentorAnswersSchema
      : z.undefined().optional(),
    academic_mentor: connectionTypes.includes("academic_mentor")
      ? mentorAnswersSchema
      : z.undefined().optional(),
    spiritual_mentor: connectionTypes.includes("spiritual_mentor")
      ? mentorAnswersSchema
      : z.undefined().optional(),
  });
}

export type Step4Answers = z.infer<ReturnType<typeof buildStep4Schema>>;
