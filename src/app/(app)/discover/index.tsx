import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { DiscoverDeck } from "@/components/DiscoverDeck";

// Global Discover: anyone who's discoverable, not just your circles' members. Who
// shows up, and in what order, is decided server-side (list_global_discover_candidates).
export default function GlobalDiscover() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right", "bottom"]}>
      <View className="flex-1 px-6 pb-4 pt-2">
        <DiscoverDeck
          circleId={null}
          emptyLabel={t("discover.globalEmpty")}
          // replace, not push -- see goToProfile in connections/index.tsx.
          onOpenProfile={(userId) => router.replace(`/(app)/user/${userId}?fromDiscover=true`)}
        />
      </View>
    </SafeAreaView>
  );
}
