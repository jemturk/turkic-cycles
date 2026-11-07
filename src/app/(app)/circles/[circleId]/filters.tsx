import { useLocalSearchParams } from "expo-router";

import { MatchingPreferencesScreen } from "@/components/MatchingPreferencesScreen";

// Matching preferences opened from a circle's Discover deck, which they filter too;
// Back and Save return to that deck.
export default function CircleDiscoverFilters() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  return <MatchingPreferencesScreen parent={`/(app)/circles/${circleId}/discover`} />;
}
