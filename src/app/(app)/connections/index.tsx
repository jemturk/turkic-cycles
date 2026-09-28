import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useNewConnections } from "@/hooks/useChat";

export default function Connections() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { data: connections } = useNewConnections(session?.user.id);

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-8" contentContainerClassName="gap-4 pb-10">
        <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">{t("connections.title")}</Text>

        <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("connections.newConnections")}</Text>

        {!connections || connections.length === 0 ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("connections.empty")}</Text>
        ) : (
          <View className="flex-row flex-wrap gap-4">
            {connections.map((connection) => (
              <Pressable
                key={connection.matchId}
                className="items-center gap-1"
                style={{ width: 72 }}
                onPress={() => router.push(`/(app)/chat/${connection.matchId}`)}
              >
                <View className="h-14 w-14 items-center justify-center rounded-full bg-coral-500">
                  <Text className="text-lg font-semibold text-white">
                    {connection.otherDisplayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-xs text-ink-700 dark:text-ink-200" numberOfLines={1}>
                  {connection.otherDisplayName}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
