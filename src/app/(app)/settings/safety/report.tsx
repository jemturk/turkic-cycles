import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useCreateReport } from "@/hooks/useSafety";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { SingleSelectChips } from "@/components/SingleSelectChips";

const REASON_VALUES = ["harassment", "fake_profile", "inappropriate", "safety_concern", "other"] as const;

export default function Report() {
  const { t } = useTranslation();
  const REASONS = REASON_VALUES.map((value) => ({ value, label: t(`settings.reportScreen.reasons.${value}`) }));
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { session } = useSession();
  const createReport = useCreateReport(session?.user.id);

  const [reason, setReason] = useState<string>();
  const [details, setDetails] = useState("");

  function onSubmit() {
    if (!userId || !reason) return;
    createReport.mutate(
      { reportedUserId: userId, reason, details: details || undefined },
      { onSuccess: () => router.back() }
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{t("settings.reportScreen.heading")}</Text>
        {!userId ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">
            {t("settings.reportScreen.openFromProfile")}
          </Text>
        ) : (
          <>
            <SingleSelectChips label={t("settings.reportScreen.reason")} options={REASONS} value={reason} onChange={setReason} />
            <TextField
              label={t("settings.reportScreen.additionalDetails")}
              multiline
              value={details}
              onChangeText={setDetails}
            />
            <View className="mt-2">
              <Button
                label={createReport.isPending ? t("settings.reportScreen.submitting") : t("settings.reportScreen.submitReport")}
                disabled={createReport.isPending || !reason}
                onPress={onSubmit}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
