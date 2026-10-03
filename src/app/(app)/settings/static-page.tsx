import { Pressable, ScrollView } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const TOPICS = ["about", "guidelines", "help", "privacy"] as const;

export default function StaticPage() {
  const { t } = useTranslation();
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const isKnownTopic = (TOPICS as readonly string[]).includes(topic);
  const page = isKnownTopic
    ? {
        title: t(`settings.staticPages.${topic}.title`),
        body: t(`settings.staticPages.${topic}.body`),
      }
    : { title: "Turkic Circles", body: "" };

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
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
