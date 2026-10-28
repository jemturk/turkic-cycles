import type { ConnectionType } from "@/constants/connectionTypes";
import type { Step4Answers } from "@/schemas/questionnaire/step4";

// consent_records.field_key for the special category answers that need explicit
// consent: Romantic's gender and who they want to meet (sexual orientation), and how
// important faith is (religious belief).
export const ORIENTATION_CONSENT_KEY = "sexual_orientation";
export const FAITH_CONSENT_KEY = "faith";

type Values = { faith?: number; consentFaith?: boolean } & Record<string, unknown>;
type Romantic = { consentSensitive?: boolean } & Record<string, unknown>;

// What to save and which consents to record for a set of branching answers. Consent is
// withdrawn by taking the data away: removing Romantic deletes those answers, and
// "prefer not to say" for faith drops its tick. A withdrawal is only reported when a
// tick is still there, so it's logged once, on the save that removes it.
export function sensitiveConsents(answers: Partial<Step4Answers>, connectionTypes: ConnectionType[]) {
  const saved: Partial<Step4Answers> = { ...answers };
  const granted: string[] = [];
  const revoked: string[] = [];

  const romantic = answers.romantic as Romantic | undefined;
  if (romantic) {
    if (!connectionTypes.includes("romantic")) {
      delete saved.romantic;
      if (romantic.consentSensitive) revoked.push(ORIENTATION_CONSENT_KEY);
    } else if (romantic.consentSensitive) {
      granted.push(ORIENTATION_CONSENT_KEY);
    }
  }

  const values = answers.values as Values | undefined;
  if (values?.consentFaith) {
    if (values.faith) {
      granted.push(FAITH_CONSENT_KEY);
    } else {
      const { consentFaith: _consentFaith, ...rest } = values;
      saved.values = rest as Partial<Step4Answers>["values"];
      revoked.push(FAITH_CONSENT_KEY);
    }
  }

  return { saved, granted, revoked };
}
