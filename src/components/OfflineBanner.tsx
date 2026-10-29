import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { useIsOnline } from "@/hooks/useIsOnline";

// A small pill floating under the status bar while the device is offline, so taps
// that can't reach the server don't seem to do nothing. It floats rather than taking
// a row, so no screen's layout moves; touches pass through it. top places it inside
// something other than the whole screen (a conversation's message area).
export function OfflineBanner({ label, top }: { label?: string; top?: number }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  if (online) return null;
  return (
    <View
      pointerEvents="none"
      className="absolute left-0 right-0 items-center"
      style={{ top: top ?? insets.top + 6, zIndex: 50, elevation: 6 }}
    >
      <View accessibilityRole="alert" className="flex-row items-center gap-1.5 rounded-full bg-ink-900/90 px-3 py-1.5 dark:bg-ink-100/90">
        <Ionicons name="cloud-offline-outline" size={14} className="text-white dark:text-ink-900" />
        <Text className="text-xs font-semibold text-white dark:text-ink-900">{label ?? t("offline.banner")}</Text>
      </View>
    </View>
  );
}
