import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useSettings";

export default function BlockedUsers() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: blocked } = useBlockedUsers(userId);
  const unblockUser = useUnblockUser(userId);

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">
          {t("settings.blockedUsersScreen.heading")}
        </Text>

        {!blocked || blocked.length === 0 ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("settings.blockedUsersScreen.empty")}</Text>
        ) : (
          blocked.map((user) => (
            <View
              key={user.userId}
              className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3"
            >
              <Text className="text-base text-ink-900 dark:text-ink-50">{user.displayName}</Text>
              <Pressable onPress={() => unblockUser.mutate(user.userId)}>
                <Text className="text-sm font-medium text-coral-600">
                  {t("settings.blockedUsersScreen.unblock")}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
