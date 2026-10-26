import { useEffect } from "react";
import { Tabs, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, useWindowDimensions } from "react-native";
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
import { useMarkDelivered } from "@/hooks/useMarkDelivered";
import { SearchOverlay } from "@/components/SearchOverlay";
import { AppMark } from "@/components/AppMark";
import { CirclesIcon } from "@/components/CirclesIcon";
import { useSearchOverlay } from "@/stores/searchOverlay";
import { alertCoverRequired, useHasCover } from "@/hooks/useCoverGuard";
import { useWideLayout } from "@/hooks/useWideLayout";
import { DesktopSidebar, useSidebarWidth } from "@/components/DesktopSidebar";

// The only screen reachable while the cover slot is empty: their own profile,
// where the gallery lives.
const COVER_SETUP_PATH = "/me";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  discover: { active: "sparkles", inactive: "sparkles-outline" },
  connections: { active: "people", inactive: "people-outline" },
  chat: { active: "chatbubble", inactive: "chatbubble-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

// Circles' icon on the bottom bar is the app logo, in its own colors rather than the
// tint -- so it's dimmed instead of recolored when another tab is active. AppMark's circles
// fill only ~65% of its viewBox height, hence the larger size than other icons.
const LOGO_ICON_SIZE = 40;

// Desktop web: screens are phone-first, so on a wide window they get a readable
// column beside the sidebar rather than stretching edge to edge.
const WIDE_SCENE_MAX_WIDTH = 880;
// Circles (two columns), Connections and Discover (card grids) and Chat (two panes)
// are laid out for desktop, so they fill the space beside the sidebar instead.
const WIDE_GRID_SCENE_MAX_WIDTH = 1600;
// Settings is two columns of rows, against the sidebar like the other screens.
const WIDE_SETTINGS_SCENE_MAX_WIDTH = 1200;


export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width: windowWidth } = useWindowDimensions();
  const sidebarWidth = useSidebarWidth();

  // Every tab's scene fills the whole area beside the sidebar with the page color --
  // the tabs are stacked, and a narrower, transparent-edged scene let the tab behind
  // it show through. The content's width limit is padding instead: centred, or
  // (align "start") kept against the sidebar with the slack on the right.
  function wideScene(maxWidth: number, align: "center" | "start" = "center") {
    const slack = Math.max(0, windowWidth - sidebarWidth - maxWidth);
    return {
      sceneStyle: {
        backgroundColor: isDark ? "#171310" : "#FEF6EC",
        paddingLeft: align === "center" ? slack / 2 : 0,
        paddingRight: align === "center" ? slack / 2 : slack,
      },
    };
  }
  const { t } = useTranslation();
  const { session } = useSession();
  usePushNotifications(session?.user.id);
  useMarkDelivered(session?.user.id);
  const searchOpen = useSearchOverlay((s) => s.open);
  const setSearchOpen = useSearchOverlay((s) => s.setOpen);
  const wide = useWideLayout();

  // No cover photo = no Discover card, so the profile is the only place to be
  // until one is set. Catches every way out at once -- tab bar, deep links, the
  // browser's back button -- by bouncing back; the tab bar and the profile's own
  // back button also refuse up front (below, and in me/index.tsx) so there's no
  // flash of another screen.
  const hasCover = useHasCover(session?.user.id);
  const pathname = usePathname();
  // What shows past the tab bar's rounded corners: an open conversation's lighter
  // cream (chat/[matchId].tsx), else the page color.
  const inConversation = /^\/chat\/[^/]+/.test(pathname);
  const cornerColor = inConversation ? (isDark ? "#2B2320" : "#FFFAF4") : isDark ? "#171310" : "#FEF6EC";
  const coverMissing = hasCover === false;
  useEffect(() => {
    if (coverMissing && pathname !== COVER_SETUP_PATH) router.replace("/(app)/me");
  }, [coverMissing, pathname]);

  return (
    <>
      <Tabs
        backBehavior="history"
        // Wide web windows get a sidebar in place of the bottom tab bar (tabBarPosition
        // "left" below); everything else uses the default bar styled by tabBarStyle.
        tabBar={wide ? (props) => <DesktopSidebar {...props} /> : undefined}
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
          ...(wide
            ? {
                tabBarPosition: "left" as const,
                ...wideScene(WIDE_SCENE_MAX_WIDTH),
              }
            : null),
          tabBarActiveTintColor: "#127A87",
          tabBarInactiveTintColor: isDark ? "#8A7C76" : "#A99C95",
          // Icons only; each tab's title still reaches screen readers as its label.
          tabBarShowLabel: false,
          // Otherwise Android pushes the tab bar up on top of the keyboard while
          // typing (in Chat, Edit profile, ...), eating into the visible form.
          tabBarHideOnKeyboard: true,
          // The bar itself is square and painted in the color of the screen above it;
          // the white, rounded-top surface is tabBarBackground. Otherwise the space
          // outside the rounded corners showed whatever was behind the bar -- the
          // page cream -- which notched the lighter cream of a conversation.
          tabBarStyle: {
            height: 54 + insets.bottom,
            paddingBottom: insets.bottom + 6,
            paddingTop: 6,
            // Inline styles, not classNames -- React Navigation's tabBarStyle isn't
            // resolved through NativeWind, so dark mode has to be handled here in JS.
            backgroundColor: cornerColor,
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarBackground: () => (
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? "#352C27" : "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                // Same soft shadow as AppHeader's bottom edge, cast upward instead.
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
              }}
            />
          ),
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === "circles") {
              // The sidebar already shows the logo at its top, so there Circles gets a
              // plain icon like the other sections.
              if (wide) return <CirclesIcon focused={focused} color={color} size={size} />;
              return (
                <View style={{ opacity: focused ? 1 : 0.45 }}>
                  <AppMark size={LOGO_ICON_SIZE} />
                </View>
              );
            }
            const icons = TAB_ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" };
            return (
              <View className="items-center justify-center" style={{ width: 40, height: 28 }}>
                <Ionicons name={focused ? icons.active : icons.inactive} size={size - 2} color={typeof color === "string" ? color : undefined} />
              </View>
            );
          },
          // Kills the default gray Android ripple blob behind whichever tab is
          // pressed -- web has no equivalent effect, and the plain instant icon-color
          // swap (no ripple) is the preferred look on native too.
          tabBarButton: (props) => <PlatformPressable {...props} pressColor="transparent" />,
        })}
      >
        <Tabs.Screen
          name="circles"
          options={{ title: t("tabs.circles"), ...(wide ? wideScene(WIDE_GRID_SCENE_MAX_WIDTH, "start") : null) }}
        />
        <Tabs.Screen
          name="connections"
          options={{ title: t("tabs.connections"), ...(wide ? wideScene(WIDE_GRID_SCENE_MAX_WIDTH, "start") : null) }}
        />
        <Tabs.Screen
          name="discover"
          options={{ title: t("tabs.discover"), ...(wide ? wideScene(WIDE_GRID_SCENE_MAX_WIDTH, "start") : null) }}
        />
        <Tabs.Screen
          name="chat"
          options={{ title: t("tabs.chat"), ...(wide ? wideScene(WIDE_GRID_SCENE_MAX_WIDTH, "start") : null) }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: t("tabs.settings"), ...(wide ? wideScene(WIDE_SETTINGS_SCENE_MAX_WIDTH, "start") : null) }}
        />
        {/* Viewing someone else's profile from Circles/Connections/Chat -- kept in its
            own directory (see user/_layout.tsx) rather than alongside your own profile
            in settings/, so it doesn't push onto that tab's Stack: a route living inside
            another tab's folder stays on that tab's history even after you switch away,
            leaving THEIR profile showing the next time you opened that tab. href: null
            keeps it reachable via router.push without a tab bar button of its own. */}
        <Tabs.Screen
          name="user"
          options={{ href: null, ...(wide ? wideScene(WIDE_GRID_SCENE_MAX_WIDTH, "start") : null) }}
        />
        {/* Your own profile, opened from the header avatar on any tab or from
            Settings -- hidden for the same reason as "user" above. */}
        <Tabs.Screen
          name="me"
          options={{ href: null, ...(wide ? wideScene(WIDE_GRID_SCENE_MAX_WIDTH, "start") : null) }}
        />
        {/* Plus (paywall / waitlist), opened from Settings and from Connections'
            Likes you -- hidden for the same reason. */}
        <Tabs.Screen name="plus" options={{ href: null }} />
        {/* Report (and block), opened from a profile on any tab and from the Safety
            Center -- hidden for the same reason. */}
        <Tabs.Screen name="report" options={{ href: null, ...(wide ? wideScene(WIDE_GRID_SCENE_MAX_WIDTH, "start") : null) }} />
      </Tabs>
      <SearchOverlay visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
