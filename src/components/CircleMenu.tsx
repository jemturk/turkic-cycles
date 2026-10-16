import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";

// A circle page's ⋯ menu: Leave circle, behind a confirmation shown in the menu
// itself (Alert.alert does nothing on web). Only for circles you're in; joining is
// the Join button. Like the profile's ⋯, it opens under the button.
export function CircleMenu({
  circleName,
  onLeave,
  leaving,
}: {
  circleName: string;
  onLeave: () => void;
  leaving: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  return (
    <View className="z-10">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.more")}
        aria-expanded={open}
        onPress={() => (open ? close() : setOpen(true))}
        className="h-10 w-10 items-center justify-center rounded-full bg-white web:hover:bg-primary-100/40 dark:bg-ink-800"
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#4A3F3A" />
      </Pressable>
      {open ? (
        <View
          className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl bg-white dark:bg-ink-800"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 }}
        >
          {confirming ? (
            <View className="gap-3 p-4">
              <Text className="text-sm text-ink-900 dark:text-ink-50">
                {t("circles.leaveConfirm", { name: circleName })}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  className="h-10 flex-1 items-center justify-center rounded-full border border-ink-100 dark:border-ink-700"
                >
                  <Text className="text-sm font-semibold text-ink-700 dark:text-ink-200">{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={leaving}
                  onPress={() => {
                    onLeave();
                    close();
                  }}
                  className="h-10 flex-1 items-center justify-center rounded-full bg-accent-500"
                >
                  <Text className="text-sm font-semibold text-white">{t("circles.leave")}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="menuitem"
              onPress={() => setConfirming(true)}
              className="flex-row items-center gap-3 px-4 py-3 web:hover:bg-accent-50 dark:web:hover:bg-ink-700"
            >
              <Ionicons name="exit-outline" size={18} color="#C1440E" />
              <Text className="text-sm text-accent-600">{t("circles.leaveCircle")}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
