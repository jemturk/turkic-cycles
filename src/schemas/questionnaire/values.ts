import { z } from "zod";

import type { ConnectionType } from "@/constants/connectionTypes";
import { PROFESSIONAL_VALUES_QUESTIONS, VALUES_QUESTIONS, type ValuesQuestion } from "@/constants/matching";

// 1-5, or 0 for "prefer not to say" (skipped in scoring).
const answer = z.number().int().min(0).max(5);

// Which values questions someone answers: all five with Friend or Romantic, otherwise
// just social energy and pace (Mentor and Business); none with no type chosen.
export function valuesQuestionsFor(connectionTypes: ConnectionType[]): readonly ValuesQuestion[] {
  if (connectionTypes.includes("friend") || connectionTypes.includes("romantic")) return VALUES_QUESTIONS;
  return connectionTypes.length > 0 ? PROFESSIONAL_VALUES_QUESTIONS : [];
}

export function buildValuesSchema(connectionTypes: ConnectionType[]) {
  const asked = valuesQuestionsFor(connectionTypes);
  const pick = (q: ValuesQuestion) => (asked.includes(q) ? answer : answer.optional());
  return z
    .object({
      family: pick("family"),
      faith: pick("faith"),
      social: pick("social"),
      pace: pick("pace"),
      heritage: pick("heritage"),
      consentFaith: z.boolean().optional(),
    })
    // How important faith is counts as religious belief (special category data under
    // GDPR): answering 1-5 needs explicit consent; "prefer not to say" doesn't.
    .refine((v) => !v.faith || v.consentFaith === true, { path: ["consentFaith"], message: "consentRequired" });
}
