import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  circles: "sparkles-outline",
  connections: "heart-outline",
  chat: "chatbubble-outline",
  profile: "person-outline",
  settings: "settings-outline",
};

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#D9663D",
        tabBarInactiveTintColor: "#8A7C76",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] ?? "ellipse-outline"} size={size} color={color} />
        ),
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
