import { useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
// Not part of expo-router's public API (no top-level @react-navigation/elements
// dependency exists in this project -- it's vendored inside expo-router itself),
// but the only way to reach the tab bar's underlying Pressable to kill the default
// Android ripple below. This path mirrors react-navigation's own package layout, so
// it's very unlikely to move within this SDK's lifetime.
import { PlatformPressable } from "expo-router/build/react-navigation/elements/PlatformPressable";

import { useSession } from "@/hooks/useSession";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { SearchOverlay } from "@/components/SearchOverlay";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  circles: { active: "sparkles", inactive: "sparkles-outline" },
  connections: { active: "people", inactive: "people-outline" },
  search: { active: "search", inactive: "search-outline" },
  chat: { active: "chatbubble", inactive: "chatbubble-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation();
  const { session } = useSession();
  usePushNotifications(session?.user.id);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <Tabs
        backBehavior="history"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#D9663D",
          tabBarInactiveTintColor: isDark ? "#8A7C76" : "#A99C95",
          tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontWeight: "600", marginTop: 2 },
          tabBarStyle: {
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
            // Inline styles, not classNames -- React Navigation's tabBarStyle isn't
            // resolved through NativeWind, so dark mode has to be handled here in JS.
            backgroundColor: isDark ? "#352C27" : "#FFFFFF",
            borderTopWidth: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            // Same soft shadow as AppHeader's bottom edge, cast upward instead.
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          },
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" };
            return (
              <View className="items-center justify-center" style={{ width: 40, height: 28 }}>
                <Ionicons name={focused ? icons.active : icons.inactive} size={size - 2} color={color} />
              </View>
            );
          },
          // Kills the default gray Android ripple blob behind whichever tab is
          // pressed -- web has no equivalent effect, and the plain instant icon-color
          // swap (no ripple) is the preferred look on native too.
          tabBarButton: (props) => <PlatformPressable {...props} pressColor="transparent" />,
        })}
      >
        <Tabs.Screen name="circles" options={{ title: t("tabs.circles") }} />
        <Tabs.Screen name="connections" options={{ title: t("tabs.connections") }} />
        {/* Opens the floating SearchOverlay over the current screen instead of
            switching tabs -- see search.tsx for why the route exists at all. */}
        <Tabs.Screen
          name="search"
          options={{ title: t("tabs.search") }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setSearchOpen(true);
            },
          }}
        />
        <Tabs.Screen name="chat" options={{ title: t("tabs.chat") }} />
        <Tabs.Screen name="settings" options={{ title: t("tabs.settings") }} />
        {/* Viewing someone else's profile from Circles/Connections/Chat -- kept in its
            own directory (see user/_layout.tsx) rather than alongside your own profile
            in settings/, so it doesn't push onto that tab's Stack: a route living inside
            another tab's folder stays on that tab's history even after you switch away,
            leaving THEIR profile showing the next time you opened that tab. href: null
            keeps it reachable via router.push without a tab bar button of its own. */}
        <Tabs.Screen name="user" options={{ href: null }} />
        {/* Your own profile, opened from the header avatar on any tab or from
            Settings -- hidden for the same reason as "user" above. */}
        <Tabs.Screen name="me" options={{ href: null }} />
      </Tabs>
      <SearchOverlay visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
