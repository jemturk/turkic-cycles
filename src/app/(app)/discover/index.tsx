import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { DiscoverDeck } from "@/components/DiscoverDeck";
import { useWideLayout } from "@/hooks/useWideLayout";

// Global Discover: anyone who's discoverable, not just your circles' members. Who
// shows up, and in what order, is decided server-side (list_global_discover_candidates).
export default function GlobalDiscover() {
  const { t } = useTranslation();
  const wide = useWideLayout();
  // replace, not push -- see goToProfile in connections/index.tsx.
  const openProfile = (userId: string) => router.replace(`/(app)/user/${userId}?fromDiscover=true`);

  // Desktop web: a large title over the card grid (DiscoverDeck -> DiscoverGrid).
  if (wide) {
    return (
      <View className="flex-1 gap-5 bg-primary-50 px-20 pt-9 dark:bg-ink-950">
        <Text className="font-display text-4xl text-ink-900 dark:text-ink-50">{t("tabs.discover")}</Text>
        <DiscoverDeck circleId={null} emptyLabel={t("discover.globalEmpty")} onOpenProfile={openProfile} />
      </View>
    );
  }

  return (
    // No bottom edge: the tab bar below already covers the phone's bottom inset,
    // and padding for it again would make the gap under the buttons uneven.
    // Spacing (keep in step with lib/discoverCard.ts): 16 at the sides, 16 between
    // the buttons and the tab bar -- the same as between the card and the buttons.
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <View className="flex-1 px-4 pb-4">
        <DiscoverDeck
          circleId={null}
          emptyLabel={t("discover.globalEmpty")}
          onOpenProfile={openProfile}
        />
      </View>
    </SafeAreaView>
  );
}
