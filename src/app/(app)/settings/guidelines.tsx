import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Card, IconTile, SubPage } from "@/components/SettingsUI";

// The community rules in plain words, one card per topic: what the Terms' "Community
// rules" say, plus how to meet safely (the Safety Center's "Meeting safely tips" opens
// this page too) and what happens after a report.
const SECTIONS: { id: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "yourself", icon: "person-outline" },
  { id: "respect", icon: "heart-outline" },
  { id: "profile", icon: "image-outline" },
  { id: "meeting", icon: "cafe-outline" },
  { id: "reporting", icon: "flag-outline" },
  { id: "consequences", icon: "alert-circle-outline" },
];

export default function CommunityGuidelines() {
  const { t } = useTranslation();
  return (
    <SubPage title={t("settings.guidelinesScreen.title")} subtitle={t("settings.guidelinesScreen.intro")}>
      {SECTIONS.map(({ id, icon }) => {
        const points = t(`settings.guidelinesScreen.sections.${id}.points`, { returnObjects: true }) as unknown as string[];
        return (
          <Card key={id}>
            <View className="flex-row items-center gap-3">
              <IconTile icon={icon} />
              <Text className="flex-1 text-lg font-semibold text-ink-900 dark:text-ink-50">
                {t(`settings.guidelinesScreen.sections.${id}.heading`)}
              </Text>
            </View>
            <View className="gap-2">
              {points.map((point) => (
                <View key={point} className="flex-row gap-2.5">
                  <Text className="text-base leading-relaxed text-ink-400 dark:text-ink-300">•</Text>
                  <Text className="flex-1 text-base leading-relaxed text-ink-700 dark:text-ink-200">{point}</Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}
    </SubPage>
  );
}
