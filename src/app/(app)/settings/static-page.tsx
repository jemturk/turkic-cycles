import { Text } from "@/components/Text";
import { SubPage, Card } from "@/components/SettingsUI";
import { useLocalSearchParams } from "expo-router";
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
    <SubPage title={page.title}>
      {page.body ? (
        <Card>
          <Text className="text-base leading-relaxed text-ink-700 dark:text-ink-200">{page.body}</Text>
        </Card>
      ) : null}
    </SubPage>
  );
}
