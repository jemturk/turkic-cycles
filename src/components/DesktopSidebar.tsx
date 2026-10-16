import { Pressable, View } from "react-native";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { AppMark } from "@/components/AppMark";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useUnreadMessageCount } from "@/hooks/useChat";

// The tabs that get a sidebar entry, in order -- the others in (app)/_layout.tsx
// (user, me, plus) are hidden routes with href: null.
const SIDEBAR_TABS = ["circles", "connections", "discover", "chat", "settings"];

export const SIDEBAR_WIDTH = 260;

// The desktop-web replacement for the bottom tab bar ((app)/_layout.tsx passes it as
// tabBar with tabBarPosition "left"). Each tab's icon is the same tabBarIcon the
// bottom bar uses, and presses go through the same tabPress event, so the cover
// guard's preventDefault applies here too.
export function DesktopSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const unread = useUnreadMessageCount(session?.user.id);
  const focusedName = state.routes[state.index]?.name;

  return (
    <View
      className="gap-1.5 bg-white px-4 py-7 dark:bg-ink-800"
      style={{
        width: SIDEBAR_WIDTH,
        borderTopRightRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      }}
    >
      <View className="flex-row items-center gap-2.5 px-3 pb-6">
        <AppMark size={40} />
        <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{t("welcome.slide1Title")}</Text>
      </View>

      {state.routes
        .filter((route) => SIDEBAR_TABS.includes(route.name))
        .sort((a, b) => SIDEBAR_TABS.indexOf(a.name) - SIDEBAR_TABS.indexOf(b.name))
        .map((route) => {
          const { options } = descriptors[route.key];
          const focused = route.name === focusedName;
          const color = focused ? "#127A87" : isDark ? "#C9BFB9" : "#4A3F3A";

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          }

          return (
            <Pressable
              key={route.key}
              role="tab"
              aria-selected={focused}
              onPress={onPress}
              className={`min-h-[44px] flex-row items-center gap-3 rounded-xl px-3 ${
                focused ? "bg-primary-100 dark:bg-ink-700" : "web:hover:bg-primary-50 dark:web:hover:bg-ink-700"
              }`}
            >
              <View className="w-7 items-center">{options.tabBarIcon?.({ focused, color, size: 24 })}</View>
              <Text
                className={`text-base ${focused ? "font-semibold text-primary-600 dark:text-primary-400" : "text-ink-700 dark:text-ink-200"}`}
              >
                {options.title}
              </Text>
              {route.name === "chat" && unread > 0 ? (
                <View className="ml-auto h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent-500 px-1.5">
                  <Text className="text-xs font-bold text-white">{unread > 99 ? "99+" : unread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

      <Pressable
        onPress={() => router.push("/(app)/me")}
        accessibilityLabel={t("profile.myProfile")}
        className="mt-auto flex-row items-center gap-2.5 rounded-2xl bg-primary-50 p-3 dark:bg-ink-900"
      >
        <Avatar uri={profile?.avatar_url} name={profile?.display_name} size={40} />
        <View className="flex-1">
          <Text className="font-semibold text-ink-900 dark:text-ink-50" numberOfLines={1}>
            {profile?.display_name}
          </Text>
          <Text className="text-[13px] text-ink-700 dark:text-ink-200">{t("profile.myProfile")}</Text>
        </View>
      </Pressable>
    </View>
  );
}
