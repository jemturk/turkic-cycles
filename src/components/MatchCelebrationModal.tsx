import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/Button";

type MatchCelebrationModalProps = {
  matchedName: string | null;
  onDismiss: () => void;
};

// A real overlay View rather than RN's Alert.alert: Alert is a no-op on web
// (react-native-web doesn't implement it), and this needs to be visible and
// testable on every platform this app targets, web included.
export function MatchCelebrationModal({ matchedName, onDismiss }: MatchCelebrationModalProps) {
  const { t } = useTranslation();
  if (!matchedName) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/50 px-8">
      <View className="w-full items-center gap-4 rounded-2xl bg-white dark:bg-ink-800 p-6">
        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{t("discover.itsAMatch")}</Text>
        <Text className="text-center text-base text-ink-700 dark:text-ink-200">
          {t("discover.bothLiked", { name: matchedName })}
        </Text>
        <Button label={t("discover.keepExploring")} onPress={onDismiss} />
      </View>
    </View>
  );
}
