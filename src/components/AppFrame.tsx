import type { ReactNode } from "react";
import { View } from "react-native";
import { useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { AppMark } from "@/components/AppMark";
import { useWideLayout } from "@/hooks/useWideLayout";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; titleKey: string }[] = [
  { icon: "people-outline", titleKey: "welcome.slide2Title" },
  { icon: "sparkles-outline", titleKey: "welcome.slide3Title" },
  { icon: "shield-checkmark-outline", titleKey: "welcome.slide4Title" },
];

// Shown beside the app on desktop. Reuses the welcome slides' copy, so it's
// translated wherever they are.
function BrandPanel() {
  const { t } = useTranslation();
  return (
    <View className="w-[360px] gap-6">
      <AppMark size={96} />
      <View className="gap-3">
        <Text className="font-display text-5xl text-ink-900 dark:text-ink-50">{t("welcome.slide1Title")}</Text>
        <Text className="text-lg leading-7 text-ink-700 dark:text-ink-200">{t("welcome.slide1Body")}</Text>
      </View>
      <View className="gap-3">
        {FEATURES.map(({ icon, titleKey }) => (
          <View key={titleKey} className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-white/70 dark:bg-ink-800">
              <Ionicons name={icon} size={20} color="#127A87" />
            </View>
            <Text className="text-base font-medium text-ink-900 dark:text-ink-50">{t(titleKey)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// The app is mobile-first, so on web it runs in a phone-width column. On a
// desktop-width window, signed-out screens (welcome, auth, onboarding) put that
// column in a framed, rounded "device" beside a brand panel, against the backdrop in
// global.css, while the signed-in app goes full width with its own sidebar
// ((app)/_layout.tsx). Narrower windows (and native) get the plain column, which on
// a phone is simply the full screen.
export function AppFrame({ children }: { children: ReactNode }) {
  const wide = useWideLayout();
  const segments = useSegments();

  if (wide && segments[0] === "(app)") {
    return <View className="flex-1 bg-primary-50 dark:bg-ink-950">{children}</View>;
  }

  if (!wide) {
    return (
      <View className="mx-auto w-full max-w-[480px] flex-1 bg-primary-50 dark:bg-ink-950 web:shadow-2xl">
        {children}
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row items-center justify-center gap-20 px-10 py-8">
      <BrandPanel />
      <View className="h-full max-h-[920px] w-[440px] overflow-hidden rounded-[36px] border border-white/60 bg-primary-50 shadow-2xl dark:border-ink-800 dark:bg-ink-950">
        {children}
      </View>
    </View>
  );
}
