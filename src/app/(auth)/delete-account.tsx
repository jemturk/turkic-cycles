import { LegalPage } from "@/components/LegalPage";
import { DELETE_ACCOUNT } from "@/constants/legal";

// Public, no account needed: turek.expo.app/delete-account is the deletion page given
// to Google Play (Data safety). Deleting itself is in Settings, in the app or on the web.
export default function DeleteAccount() {
  return <LegalPage document={DELETE_ACCOUNT} />;
}
