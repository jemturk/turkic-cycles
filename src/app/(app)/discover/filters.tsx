import { MatchingPreferencesScreen } from "@/components/MatchingPreferencesScreen";

// Matching preferences opened from Discover (the header's filter icon, or the empty
// deck), so Back and Save return to the deck rather than to Settings.
export default function DiscoverFilters() {
  return <MatchingPreferencesScreen parent="/(app)/discover" />;
}
