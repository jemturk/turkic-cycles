import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import type { MatchInfo } from "@/api/discover";

// On a Discover card: "Strong match" when the matching model says so, and the top
// reasons ("3 shared interests · Nearby"). Never a country or an exact distance --
// heritage is just "Shared heritage", distance just "Nearby".
export function MatchSummary({ match }: { match: MatchInfo | undefined }) {
  const { t } = useTranslation();
  if (!match || match.score === null) return null;
  const reasons = match.reasons
    .slice(0, 2)
    .map((reason) => t(`discover.reasons.${reason.criterion}`, { count: reason.count ?? 0 }));

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {match.strong ? (
        <View className="rounded-full bg-gold-400 px-3 py-1">
          <Text className="text-xs font-semibold text-ink-900">{t("discover.strongMatch")}</Text>
        </View>
      ) : null}
      {reasons.length > 0 ? <Text className="text-sm text-white">{reasons.join(" · ")}</Text> : null}
    </View>
  );
}
