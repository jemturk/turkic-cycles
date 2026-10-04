import { useEffect } from "react";
import { Tabs, router, usePathname } from "expo-router";
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
import { AppMark } from "@/components/AppMark";
import { useSearchOverlay } from "@/stores/searchOverlay";
import { alertCoverRequired, useHasCover } from "@/hooks/useCoverGuard";

// The only screen reachable while the cover slot is empty: their own profile,
// where the gallery lives.
const COVER_SETUP_PATH = "/me";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  discover: { active: "sparkles", inactive: "sparkles-outline" },
  connections: { active: "people", inactive: "people-outline" },
  chat: { active: "chatbubble", inactive: "chatbubble-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

// Circles' icon is the app logo, in its own colors rather than the tint -- so
// it's dimmed instead of recolored when another tab is active. AppMark's circles
// fill only ~65% of its viewBox height, hence the larger size than other icons.
const LOGO_ICON_SIZE = 40;

export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation();
  const { session } = useSession();
  usePushNotifications(session?.user.id);
  const searchOpen = useSearchOverlay((s) => s.open);
  const setSearchOpen = useSearchOverlay((s) => s.setOpen);

  // No cover photo = no Discover card, so the profile is the only place to be
  // until one is set. Catches every way out at once -- tab bar, deep links, the
  // browser's back button -- by bouncing back; the tab bar and the profile's own
  // back button also refuse up front (below, and in me/index.tsx) so there's no
  // flash of another screen.
  const hasCover = useHasCover(session?.user.id);
  const pathname = usePathname();
  const coverMissing = hasCover === false;
  useEffect(() => {
    if (coverMissing && pathname !== COVER_SETUP_PATH) router.replace("/(app)/me");
  }, [coverMissing, pathname]);

  return (
    <>
      <Tabs
        backBehavior="history"
        screenListeners={{
          tabPress: (e) => {
            if (coverMissing) {
              e.preventDefault();
              alertCoverRequired(t);
            }
          },
        }}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#127A87",
          tabBarInactiveTintColor: isDark ? "#8A7C76" : "#A99C95",
          // Icons only; each tab's title still reaches screen readers as its label.
          tabBarShowLabel: false,
          // Otherwise Android pushes the tab bar up on top of the keyboard while
          // typing (in Chat, Edit profile, ...), eating into the visible form.
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: 60 + insets.bottom,
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
            if (route.name === "circles") {
              return (
                <View style={{ opacity: focused ? 1 : 0.45 }}>
                  <AppMark size={LOGO_ICON_SIZE} />
                </View>
              );
            }
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
        <Tabs.Screen name="discover" options={{ title: t("tabs.discover") }} />
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
