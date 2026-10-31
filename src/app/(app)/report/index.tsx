import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useCreateReport } from "@/hooks/useSafety";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { SingleSelectChips } from "@/components/SingleSelectChips";
import { SubPage, Card } from "@/components/SettingsUI";

const REASON_VALUES = ["harassment", "fake_profile", "inappropriate", "child_safety", "safety_concern", "other"] as const;

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
      { onSuccess: () => router.back() },
    );
  }

  return (
    <SubPage parent={null} title={t("settings.reportScreen.heading")} form>
      <Card>
        {!userId ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("settings.reportScreen.openFromProfile")}</Text>
        ) : (
          <>
            <SingleSelectChips
              label={t("settings.reportScreen.reason")}
              options={REASONS}
              value={reason}
              onChange={setReason}
            />
            <TextField
              label={t("settings.reportScreen.additionalDetails")}
              multiline
              value={details}
              onChangeText={setDetails}
            />
            <View>
              <Button
                label={
                  createReport.isPending
                    ? t("settings.reportScreen.submitting")
                    : t("settings.reportScreen.submitReport")
                }
                disabled={createReport.isPending || !reason}
                onPress={onSubmit}
              />
            </View>
          </>
        )}
      </Card>
    </SubPage>
  );
}
