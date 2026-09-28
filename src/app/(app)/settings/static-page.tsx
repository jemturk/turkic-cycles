import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const PAGES: Record<string, { title: string; body: string }> = {
  about: {
    title: "About Turkic Circles",
    body: "Turkic Circles is a connections app for the Turkic and Turkic-adjacent diaspora — friendship, romance, business, and mentorship, all in one community rather than four separate products.",
  },
  guidelines: {
    title: "Community guidelines",
    body: "Be respectful, be honest about who you are, and treat every conversation the way you'd want to be treated. Harassment, hate speech, and impersonation are never allowed and will result in account action.",
  },
  help: {
    title: "Help & support",
    body: "Questions or issues? This is a placeholder support page — real contact details land alongside a real support channel.",
  },
  privacy: {
    title: "Data & privacy",
    body: "Your sensitive fields (origin, religion, citizenship detail) are stored separately from the rest of your profile and are only ever shared with your explicit, revocable consent. See the Safety Center for more.",
  },
};

export default function StaticPage() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const page = PAGES[topic] ?? { title: "Turkic Circles", body: "" };

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{page.title}</Text>
        <Text className="text-base text-ink-700 dark:text-ink-200">{page.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
