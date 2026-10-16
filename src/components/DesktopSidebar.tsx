import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { AppMark } from "@/components/AppMark";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useUnreadMessageCount } from "@/hooks/useChat";
import { useSidebar } from "@/stores/sidebar";

// The tabs that get a sidebar entry, in order -- the others in (app)/_layout.tsx
// (user, me, plus) are hidden routes with href: null.
const SIDEBAR_TABS = ["circles", "connections", "discover", "chat", "settings"];

export const SIDEBAR_WIDTH = 260;
// Collapsed: an icon rail.
export const SIDEBAR_COLLAPSED_WIDTH = 68;

// The sidebar's current width, for laying out the screens beside it.
export function useSidebarWidth(): number {
  const collapsed = useSidebar((s) => s.collapsed);
  return collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
}

function formatCount(count: number) {
  return count > 99 ? "99+" : `${count}`;
}

// The desktop-web replacement for the bottom tab bar ((app)/_layout.tsx passes it as
// tabBar with tabBarPosition "left"). Each tab's icon is the same tabBarIcon the
// bottom bar uses, and presses go through the same tabPress event, so the cover
// guard's preventDefault applies here too. It collapses to an icon rail -- with a
// round handle on its edge that shows while the pointer is over the sidebar (or the
// handle has keyboard focus), or by clicking the logo when collapsed -- remembered
// per browser (stores/sidebar.ts); labels then still reach screen readers.
export function DesktopSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const unread = useUnreadMessageCount(session?.user.id);
  const collapsed = useSidebar((s) => s.collapsed);
  const toggle = useSidebar((s) => s.toggle);
  const width = useSidebarWidth();
  const focusedName = state.routes[state.index]?.name;
  const iconColor = isDark ? "#C9BFB9" : "#4A3F3A";
  const [hovered, setHovered] = useState(false);
  const [handleFocused, setHandleFocused] = useState(false);
  const showHandle = hovered || handleFocused;

  return (
    <View
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={`gap-1.5 bg-white py-7 dark:bg-ink-800 ${collapsed ? "px-2.5" : "px-4"}`}
      style={{
        width,
        // Above the screens beside it, so the handle can hang over the edge.
        zIndex: 10,
        borderTopRightRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      }}
    >
      <View className={`flex-row items-center gap-2.5 pb-6 ${collapsed ? "justify-center" : "px-3"}`}>
        {/* Collapsed, the logo expands it too -- the handle is easy to miss. */}
        {collapsed ? (
          <Pressable accessibilityLabel={t("tabs.expandSidebar")} onPress={toggle}>
            <AppMark size={40} />
          </Pressable>
        ) : (
          <>
            <AppMark size={40} />
            <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{t("welcome.slide1Title")}</Text>
          </>
        )}
      </View>

      {/* Level with the logo, half over the sidebar's right edge. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsed ? t("tabs.expandSidebar") : t("tabs.collapseSidebar")}
        onPress={toggle}
        onFocus={() => setHandleFocused(true)}
        onBlur={() => setHandleFocused(false)}
        className="absolute -right-3.5 top-[36px] h-7 w-7 items-center justify-center rounded-full border border-primary-100 bg-white web:hover:bg-primary-100/40 dark:border-ink-700 dark:bg-ink-800 dark:web:hover:bg-ink-700"
        style={{
          opacity: showHandle ? 1 : 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
        }}
      >
        <Ionicons name={collapsed ? "chevron-forward" : "chevron-back"} size={14} color={iconColor} />
      </Pressable>

      {state.routes
        .filter((route) => SIDEBAR_TABS.includes(route.name))
        .sort((a, b) => SIDEBAR_TABS.indexOf(a.name) - SIDEBAR_TABS.indexOf(b.name))
        .map((route) => {
          const { options } = descriptors[route.key];
          const focused = route.name === focusedName;
          const color = focused ? "#127A87" : iconColor;
          const badge = route.name === "chat" && unread > 0 ? formatCount(unread) : null;

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          }

          return (
            <Pressable
              key={route.key}
              role="tab"
              aria-selected={focused}
              accessibilityLabel={collapsed ? options.title : undefined}
              onPress={onPress}
              className={`min-h-[44px] flex-row items-center gap-3 rounded-xl ${collapsed ? "justify-center px-0" : "px-3"} ${
                focused ? "bg-primary-100 dark:bg-ink-700" : "web:hover:bg-primary-100/40 dark:web:hover:bg-ink-700"
              }`}
            >
              <View className="w-7 items-center">{options.tabBarIcon?.({ focused, color, size: 24 })}</View>
              {collapsed ? null : (
                <Text
                  className={`text-base ${focused ? "font-semibold text-primary-600 dark:text-primary-400" : "text-ink-700 dark:text-ink-200"}`}
                >
                  {options.title}
                </Text>
              )}
              {badge ? (
                <View
                  className={`h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent-500 px-1.5 ${
                    collapsed ? "absolute right-0.5 top-0.5 h-[18px] min-w-[18px] px-1" : "ml-auto"
                  }`}
                >
                  <Text className={`font-bold text-white ${collapsed ? "text-[10px]" : "text-xs"}`}>{badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

      <Pressable
        onPress={() => router.push("/(app)/me")}
        accessibilityLabel={t("profile.myProfile")}
        className={`mt-auto flex-row items-center gap-2.5 rounded-2xl bg-primary-50 dark:bg-ink-900 ${
          collapsed ? "justify-center p-2" : "p-3"
        }`}
      >
        <Avatar uri={profile?.avatar_url} name={profile?.display_name} size={collapsed ? 32 : 40} />
        {collapsed ? null : (
          <View className="flex-1">
            <Text className="font-semibold text-ink-900 dark:text-ink-50" numberOfLines={1}>
              {profile?.display_name}
            </Text>
            <Text className="text-[13px] text-ink-700 dark:text-ink-200">{t("profile.myProfile")}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
