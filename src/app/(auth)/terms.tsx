import { LegalPage } from "@/components/LegalPage";
import { TERMS_OF_SERVICE } from "@/constants/legal";

// Public, no account needed: turek.expo.app/terms is the address given to the stores.
export default function TermsOfService() {
  return <LegalPage document={TERMS_OF_SERVICE} />;
}
