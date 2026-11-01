import { useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Card, Group, SubPage } from "@/components/SettingsUI";
import { APP_NAME, LEGAL_CONTACT } from "@/constants/legal";

// Help & support: what the app is (with its version, which support asks for), the
// common questions, each opening in place, and an email to support with the version
// and platform already filled in.
const QUESTIONS = ["discover", "matching", "location", "verify", "report", "plus", "email", "delete"] as const;

const VERSION = Constants.expoConfig?.version ?? "";

function Question({ id }: { id: (typeof QUESTIONS)[number] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="flex-row items-center gap-3 px-4 py-4 web:hover:bg-primary-100/40 dark:web:hover:bg-ink-700"
      >
        <Text className="flex-1 text-base font-medium text-ink-900 dark:text-ink-50">
          {t(`settings.helpScreen.faq.${id}.q`)}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#A99C95" />
      </Pressable>
      {open ? (
        <Text className="px-4 pb-4 text-base leading-relaxed text-ink-700 dark:text-ink-200">
          {t(`settings.helpScreen.faq.${id}.a`)}
        </Text>
      ) : null}
    </View>
  );
}

export default function Help() {
  const { t } = useTranslation();

  function emailSupport() {
    const subject = encodeURIComponent(t("settings.helpScreen.emailSubject", { app: APP_NAME }));
    const body = encodeURIComponent(`\n\n—\n${APP_NAME} ${VERSION} · ${Platform.OS} ${Platform.Version}`);
    Linking.openURL(`mailto:${LEGAL_CONTACT}?subject=${subject}&body=${body}`);
  }

  return (
    <SubPage title={t("settings.helpScreen.title")}>
      <Card>
        <Text className="text-base leading-relaxed text-ink-700 dark:text-ink-200">{t("settings.helpScreen.about")}</Text>
        <Text className="text-sm text-ink-400 dark:text-ink-300">
          {t("settings.helpScreen.version", { version: VERSION })}
        </Text>
      </Card>

      <Group title={t("settings.helpScreen.faqTitle")}>
        {QUESTIONS.map((id) => (
          <Question key={id} id={id} />
        ))}
      </Group>

      <Card>
        <Text className="text-lg font-semibold text-ink-900 dark:text-ink-50">{t("settings.helpScreen.contactTitle")}</Text>
        <Text className="text-base leading-relaxed text-ink-700 dark:text-ink-200">
          {t("settings.helpScreen.contactBody", { email: LEGAL_CONTACT })}
        </Text>
        <Button label={t("settings.helpScreen.emailButton")} onPress={emailSupport} />
      </Card>
    </SubPage>
  );
}
