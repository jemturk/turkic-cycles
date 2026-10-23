import { Pressable } from "react-native";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useSettings";
import { SubPage, Card, Group, Item } from "@/components/SettingsUI";

export default function BlockedUsers() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: blocked } = useBlockedUsers(userId);
  const unblockUser = useUnblockUser(userId);

  return (
    <SubPage title={t("settings.blockedUsersScreen.heading")}>
      {!blocked || blocked.length === 0 ? (
        <Card>
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("settings.blockedUsersScreen.empty")}</Text>
        </Card>
      ) : (
        <Group>
          {blocked.map((user) => (
            <Item
              key={user.userId}
              icon="ban-outline"
              title={user.displayName}
              right={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => unblockUser.mutate(user.userId)}
                  className="h-9 justify-center rounded-full border border-primary-100 px-4 web:hover:bg-primary-100/40 dark:border-ink-700"
                >
                  <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {t("settings.blockedUsersScreen.unblock")}
                  </Text>
                </Pressable>
              }
            />
          ))}
        </Group>
      )}
    </SubPage>
  );
}
