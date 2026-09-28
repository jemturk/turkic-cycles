import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type SafetyItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export default function SafetyCenter() {
  const items: SafetyItem[] = [
    {
      icon: "shield-checkmark-outline",
      title: "Verification",
      subtitle: "Confirm your identity and earn the badge",
      onPress: () => router.push("/(app)/settings/verification"),
    },
    {
      icon: "location-outline",
      title: "Share your plans",
      subtitle: "Send date details to someone you trust",
      onPress: () => router.push("/(app)/settings/safety/share-plans"),
    },
    {
      icon: "flag-outline",
      title: "Report or block someone",
      subtitle: "From any profile or conversation",
      onPress: () => router.push("/(app)/settings/safety/report"),
    },
    {
      icon: "information-circle-outline",
      title: "Meeting safely tips",
      subtitle: "First dates, video chat, and red flags",
      onPress: () => router.push("/(app)/settings/static-page?topic=guidelines"),
    },
    {
      icon: "document-text-outline",
      title: "Community guidelines",
      subtitle: "",
      onPress: () => router.push("/(app)/settings/static-page?topic=guidelines"),
    },
    {
      icon: "headset-outline",
      title: "Contact support",
      subtitle: "",
      onPress: () => router.push("/(app)/settings/static-page?topic=help"),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-3 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">Safety Center</Text>
        <Text className="-mt-2 text-sm text-ink-700 dark:text-ink-200">
          Tools and resources to help you connect with confidence.
        </Text>

        {items.map((item) => (
          <Pressable
            key={item.title}
            onPress={item.onPress}
            className="flex-row items-center gap-3 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4"
          >
            <Ionicons name={item.icon} size={22} color="#D9663D" />
            <View className="flex-1">
              <Text className="font-display text-base text-ink-900 dark:text-ink-50">{item.title}</Text>
              {item.subtitle ? <Text className="text-xs text-ink-400">{item.subtitle}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8A7C76" />
          </Pressable>
        ))}

        <View className="mt-2 flex-row gap-2 rounded-xl bg-coral-100 p-3">
          <Ionicons name="warning-outline" size={18} color="#C24F2A" />
          <Text className="flex-1 text-xs text-ink-700 dark:text-ink-200">
            In an emergency, always contact local emergency services first — this app is not a
            substitute for immediate help.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
