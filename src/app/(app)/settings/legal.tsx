import { useLocalSearchParams } from "expo-router";

import { LegalPage } from "@/components/LegalPage";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/constants/legal";

// The Privacy Policy (?doc=privacy) or Terms of Service (?doc=terms) from Settings,
// inside its stack so Back returns there.
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  return <LegalPage document={doc === "terms" ? TERMS_OF_SERVICE : PRIVACY_POLICY} />;
}
