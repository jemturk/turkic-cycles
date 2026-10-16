import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { HeaderAvatar } from "@/components/HeaderAvatar";
import { useWideLayout } from "@/hooks/useWideLayout";
import { useSearchOverlay } from "@/stores/searchOverlay";

const ICON_HEIGHT = 34;
// Compact bar: a 44 row (fits the 34 avatar and the search icon, whose tap area
// hitSlop extends) with 6 below -- and 6 above when there is no status bar inset.
const HEADER_PADDING_BOTTOM = 6;
export const HEADER_ICON_HEIGHT = ICON_HEIGHT;

// Custom rather than react-navigation's built-in header: native-stack doesn't
// let you set the built-in header's height on every platform, and it came out
// taller than this compact title + avatar bar needs. Same surface color as the tab
// bar (see (app)/_layout.tsx) unless a screen passes its own background class.
// The left side is the page title (the screen's `title` option -- see
// useStackScreenOptions); detail screens can replace it with their own (e.g. a
// back button and name), keeping the same height, shadow, search icon and avatar.
// iconColor is for headers on a fixed light background (e.g. CircleHeader's topic
// color), where the default theme-following color would vanish in dark mode.
export function AppHeader({
  title,
  left,
  bgClassName,
  iconColor,
}: {
  title?: string;
  left?: ReactNode;
  bgClassName?: string;
  iconColor?: string;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const openSearch = useSearchOverlay((s) => s.setOpen);
  const wide = useWideLayout();

  return (
    <View
      className={bgClassName}
      style={{
        // Clears the status bar when the header extends under it (native). With no
        // top inset (a browser, where the address bar sits above the page) it gets
        // the same padding as the bottom instead, so the title and icons sit centred in
        // the white band rather than hugging its top edge.
        paddingTop: insets.top > 0 ? insets.top : HEADER_PADDING_BOTTOM,
        paddingBottom: HEADER_PADDING_BOTTOM,
        ...(bgClassName ? null : { backgroundColor: colorScheme === "dark" ? "#352C27" : "#FFFFFF" }),
        // Soft shadow along the bottom edge (same values as the chat input bar).
        // zIndex keeps it drawn over the screen content below instead of under it.
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        zIndex: 1,
      }}
    >
      <View className="h-11 flex-row items-center justify-between gap-3 px-4">
        {left ?? (
          <Text className="flex-1 font-display text-2xl text-ink-900 dark:text-ink-50" numberOfLines={1}>
            {title}
          </Text>
        )}
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("tabs.search")}
            hitSlop={8}
            onPress={() => openSearch(true)}
          >
            <Ionicons name="search-outline" size={24} color={iconColor ?? (colorScheme === "dark" ? "#F5F1EE" : "#2B2320")} />
          </Pressable>
          {/* Desktop web: your profile is at the foot of the sidebar instead. */}
          {wide ? null : <HeaderAvatar size={ICON_HEIGHT} />}
        </View>
      </View>
    </View>
  );
}
