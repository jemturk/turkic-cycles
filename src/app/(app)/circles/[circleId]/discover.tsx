import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { DiscoverDeck } from "@/components/DiscoverDeck";

export default function Discover() {
  const { t } = useTranslation();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <View className="flex-1 px-6 pt-6">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <Text className="mt-4 font-display text-2xl text-ink-900 dark:text-ink-50">{t("discover.title")}</Text>

        <DiscoverDeck
          circleId={circleId}
          emptyLabel={t("discover.empty")}
          onOpenProfile={(userId) => router.replace(`/(app)/user/${userId}?circleId=${circleId}&fromDiscover=true`)}
        />
      </View>
    </SafeAreaView>
  );
}
