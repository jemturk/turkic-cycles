import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  circles: { active: "sparkles", inactive: "sparkles-outline" },
  connections: { active: "people", inactive: "people-outline" },
  chat: { active: "chatbubble", inactive: "chatbubble-outline" },
  profile: { active: "person", inactive: "person-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#D9663D",
        tabBarInactiveTintColor: "#A99C95",
        tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontWeight: "600", marginTop: 2 },
        tabBarStyle: {
          height: 76 + insets.bottom,
          paddingBottom: insets.bottom + 12,
          paddingTop: 8,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1E7E0",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" };
          return (
            <View
              className={focused ? "items-center justify-center rounded-full bg-coral-50" : "items-center justify-center"}
              style={{ width: 40, height: 28 }}
            >
              <Ionicons name={focused ? icons.active : icons.inactive} size={size - 2} color={color} />
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="circles" options={{ title: "Circles" }} />
      <Tabs.Screen name="connections" options={{ title: "Connections" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
