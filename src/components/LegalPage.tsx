import { Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { AppMark } from "@/components/AppMark";
import { Text } from "@/components/Text";
import { APP_NAME, LEGAL_CONTACT, LEGAL_UPDATED, type LegalDocument } from "@/constants/legal";
import { useWideLayout } from "@/hooks/useWideLayout";
import { goUp } from "@/lib/goUp";

// The Privacy Policy or Terms of Service as a readable page: a back button, the
// title and date, an intro, then one white card per section. Used both for the
// public /privacy and /terms pages (no account needed) and from Settings.
export function LegalPage({ document }: { document: LegalDocument }) {
  const { t } = useTranslation();
  const navigation = useRouter();
  const wide = useWideLayout();
  // The public pages fill a desktop window on their own (AppFrame), so they get the
  // logo and name; in Settings the sidebar already shows them.
  const publicPage = useSegments()[0] === "(auth)";

  // In Settings: up to Settings (goUp). The public pages are opened from the
  // welcome screens or straight from a link (a store listing, an email); with no
  // history to go back through, go to the start instead.
  function goBack() {
    if (!publicPage) goUp("/(app)/settings");
    else if (navigation.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <ScrollView contentContainerClassName={wide ? "items-center px-8 pb-16 pt-8" : "px-4 pb-12 pt-4"}>
        <View className={`gap-4 ${wide ? "w-full max-w-[760px]" : ""}`}>
          {wide && publicPage && (
            <Pressable onPress={() => router.replace("/")} className="mb-4 flex-row items-center gap-3 self-start">
              <AppMark size={36} />
              <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{APP_NAME}</Text>
            </Pressable>
          )}
          <View className="gap-2">
            <Pressable
              accessibilityLabel={t("common.back")}
              hitSlop={8}
              onPress={goBack}
              className="-ml-2 h-10 w-10 items-center justify-center rounded-full web:hover:bg-white dark:web:hover:bg-ink-800"
            >
              <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
            </Pressable>
            <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">{document.title}</Text>
            <Text className="text-sm text-ink-400 dark:text-ink-300">Last updated {LEGAL_UPDATED}</Text>
          </View>

          <Text className="text-base text-ink-700 dark:text-ink-200">{document.intro}</Text>

          {document.sections.map((section) => (
            <View key={section.heading} className="gap-2.5 rounded-2xl bg-white p-5 dark:bg-ink-800">
              <Text className="text-lg font-semibold text-ink-900 dark:text-ink-50">{section.heading}</Text>
              {section.body.map((line) =>
                line.startsWith("- ") ? (
                  <View key={line} className="flex-row gap-2 pl-1">
                    <Text className="text-base text-ink-400 dark:text-ink-300">•</Text>
                    <Text className="flex-1 text-base text-ink-700 dark:text-ink-200">{line.slice(2)}</Text>
                  </View>
                ) : (
                  <Text key={line} className="text-base text-ink-700 dark:text-ink-200">
                    {line}
                  </Text>
                )
              )}
            </View>
          ))}

          <Pressable onPress={() => Linking.openURL(`mailto:${LEGAL_CONTACT}`)} className="items-center py-2">
            <Text className="text-sm font-medium text-primary-600 dark:text-primary-400">{LEGAL_CONTACT}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
