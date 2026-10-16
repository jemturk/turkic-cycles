import { SubPage, Group, Item, Note } from "@/components/SettingsUI";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type SafetyItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export default function SafetyCenter() {
  const { t } = useTranslation();
  const items: SafetyItem[] = [
    {
      icon: "shield-checkmark-outline",
      title: t("settings.safetyCenterScreen.verificationTitle"),
      subtitle: t("settings.safetyCenterScreen.verificationSubtitle"),
      onPress: () => router.push("/(app)/settings/verification"),
    },
    {
      icon: "location-outline",
      title: t("settings.safetyCenterScreen.sharePlansTitle"),
      subtitle: t("settings.safetyCenterScreen.sharePlansSubtitle"),
      onPress: () => router.push("/(app)/settings/safety/share-plans"),
    },
    {
      icon: "flag-outline",
      title: t("settings.safetyCenterScreen.reportBlockTitle"),
      subtitle: t("settings.safetyCenterScreen.reportBlockSubtitle"),
      onPress: () => router.push("/(app)/settings/safety/report"),
    },
    {
      icon: "information-circle-outline",
      title: t("settings.safetyCenterScreen.meetingTipsTitle"),
      subtitle: t("settings.safetyCenterScreen.meetingTipsSubtitle"),
      onPress: () => router.push("/(app)/settings/static-page?topic=guidelines"),
    },
    {
      icon: "document-text-outline",
      title: t("settings.safetyCenterScreen.communityGuidelinesTitle"),
      subtitle: "",
      onPress: () => router.push("/(app)/settings/static-page?topic=guidelines"),
    },
    {
      icon: "headset-outline",
      title: t("settings.safetyCenterScreen.contactSupportTitle"),
      subtitle: "",
      onPress: () => router.push("/(app)/settings/static-page?topic=help"),
    },
  ];

  return (
    <SubPage title={t("settings.safetyCenterScreen.heading")} subtitle={t("settings.safetyCenterScreen.subheading")}>
      <Group>
        {items.map((item) => (
          <Item key={item.title} icon={item.icon} title={item.title} subtitle={item.subtitle} onPress={item.onPress} />
        ))}
      </Group>
      <Note icon="warning-outline" tone="warning">
        {t("settings.safetyCenterScreen.emergencyDisclaimer")}
      </Note>
    </SubPage>
  );
}
