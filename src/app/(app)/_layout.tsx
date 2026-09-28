import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  circles: { active: "sparkles", inactive: "sparkles-outline" },
  connections: { active: "people", inactive: "people-outline" },
  chat: { active: "chatbubble", inactive: "chatbubble-outline" },
  profile: { active: "person", inactive: "person-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation();

  return (
    <Tabs
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
          borderTopWidth: 1,
          borderTopColor: isDark ? "#4A3F3A" : "#F1E7E0",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" };
          return (
            <View className="items-center justify-center" style={{ width: 40, height: 28 }}>
              <Ionicons name={focused ? icons.active : icons.inactive} size={size - 2} color={color} />
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="circles" options={{ title: t("tabs.circles") }} />
      <Tabs.Screen name="connections" options={{ title: t("tabs.connections") }} />
      <Tabs.Screen name="chat" options={{ title: t("tabs.chat") }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile") }} />
      <Tabs.Screen name="settings" options={{ title: t("tabs.settings") }} />
    </Tabs>
  );
}
