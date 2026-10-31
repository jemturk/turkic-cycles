import { LegalPage } from "@/components/LegalPage";
import { CHILD_SAFETY } from "@/constants/legal";

// Public, no account needed: joinhalka.com/child-safety is the CSAE standards page
// given to Google Play (Child safety standards).
export default function ChildSafety() {
  return <LegalPage document={CHILD_SAFETY} />;
}
