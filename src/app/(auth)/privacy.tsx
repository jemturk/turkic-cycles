import { LegalPage } from "@/components/LegalPage";
import { PRIVACY_POLICY } from "@/constants/legal";

// Public, no account needed: joinhalka.com/privacy is the address given to the stores.
export default function PrivacyPolicy() {
  return <LegalPage document={PRIVACY_POLICY} />;
}
