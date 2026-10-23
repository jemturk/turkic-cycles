import { useCallback } from "react";
import { Platform, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";

import { Text } from "@/components/Text";
import { useSession } from "@/hooks/useSession";
import { useMyVerificationStatus, useStartVerification } from "@/hooks/useVerification";
import { Button } from "@/components/Button";
import { SubPage, Card, Group, Item, Note } from "@/components/SettingsUI";
import { showAlert } from "@/lib/alert";

// Identity verification with Stripe Identity: a photo of a government ID and a live
// selfie, checked by Stripe on its own page. The result comes back through
// stripe-identity-webhook, so this screen only starts the check and shows the status:
//   unverified / failed -> the two steps and a button to start (again);
//   pending             -> "checking", with a button to finish an interrupted check;
//   verified            -> the badge.
// The status is re-read whenever the screen is shown, e.g. on coming back from Stripe.
export default function Verification() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: verification, refetch } = useMyVerificationStatus(userId);
  const start = useStartVerification(userId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const status = verification?.status ?? "unverified";

  async function verify() {
    try {
      const url = await start.mutateAsync(Platform.OS === "web" ? "web" : "app");
      if (Platform.OS === "web") {
        // Stripe brings them back to this screen when they're done.
        window.location.href = url;
        return;
      }
      // An in-app browser; when it's closed, the result is usually already in.
      await WebBrowser.openBrowserAsync(url);
      refetch();
    } catch (error) {
      showAlert(t("settings.verificationScreen.startFailed"), (error as Error).message);
    }
  }

  const steps = (
    <Group>
      <Item
        icon="card-outline"
        title={t("settings.verificationScreen.idTitle")}
        subtitle={t("settings.verificationScreen.idBody")}
      />
      <Item
        icon="person-outline"
        title={t("settings.verificationScreen.selfieTitle")}
        subtitle={t("settings.verificationScreen.selfieBody")}
      />
    </Group>
  );

  return (
    <SubPage title={t("settings.verificationScreen.heading")} subtitle={t("settings.verificationScreen.subheading")}>
      {status === "verified" ? (
        <Card>
          <View className="flex-row items-center gap-3">
            <Ionicons name="shield-checkmark" size={28} color="#2C8B80" />
            <Text className="flex-1 font-display text-lg text-ink-900 dark:text-ink-50">
              {t("settings.verificationScreen.verifiedBody")}
            </Text>
          </View>
        </Card>
      ) : status === "pending" ? (
        <>
          <Card>
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
              {t("settings.verificationScreen.pendingReview")}
            </Text>
            <Text className="-mt-2 text-sm text-ink-700 dark:text-ink-200">
              {t("settings.verificationScreen.pendingBody")}
            </Text>
          </Card>
          <Button
            variant="secondary"
            label={start.isPending ? t("settings.verificationScreen.submitting") : t("settings.verificationScreen.resume")}
            disabled={start.isPending}
            onPress={verify}
          />
        </>
      ) : (
        <>
          {status === "failed" ? (
            <Note icon="alert-circle-outline" tone="warning">
              {t("settings.verificationScreen.failedBody")}
            </Note>
          ) : null}
          {steps}
          <Note icon="lock-closed-outline">{t("settings.verificationScreen.disclaimer")}</Note>
          <Button
            label={
              start.isPending
                ? t("settings.verificationScreen.submitting")
                : status === "failed"
                  ? t("settings.verificationScreen.retry")
                  : t("settings.verificationScreen.submit")
            }
            disabled={start.isPending}
            onPress={verify}
          />
        </>
      )}
    </SubPage>
  );
}
