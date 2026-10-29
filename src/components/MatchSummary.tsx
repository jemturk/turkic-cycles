import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import type { MatchInfo } from "@/api/discover";

// On a Discover card: "Strong match" when the matching model says so, and the top
// reasons ("3 shared interests · Nearby"). Never a country or an exact distance --
// heritage is just "Shared heritage", distance just "Nearby".
export function MatchSummary({ match, className = "" }: { match: MatchInfo | undefined; className?: string }) {
  const { t } = useTranslation();
  if (!match || match.score === null) return null;
  const reasons = match.reasons
    .slice(0, 2)
    .map((reason) => t(`discover.reasons.${reason.criterion}`, { count: reason.count ?? 0 }));

  return (
    <View className={`flex-row flex-wrap items-center gap-2 ${className}`}>
      {match.strong ? (
        // Solid light gold, so it stands out on the card's dark photo overlay.
        <View className="flex-row items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1">
          <Ionicons name="sparkles" size={12} color="#9C7A28" />
          <Text className="text-xs font-bold text-ink-900">{t("discover.strongMatch")}</Text>
        </View>
      ) : null}
      {reasons.length > 0 ? <Text className="text-sm text-white">{reasons.join(" · ")}</Text> : null}
    </View>
  );
}
