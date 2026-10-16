import { View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMyVerificationStatus, useSubmitVerificationStub } from "@/hooks/useVerification";
import { Button } from "@/components/Button";
import { SubPage, Card, Group, Item, Note } from "@/components/SettingsUI";

export default function Verification() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: verification } = useMyVerificationStatus(userId);
  const submit = useSubmitVerificationStub(userId);

  const status = verification?.status ?? "unverified";

  return (
    <SubPage title={t("settings.verificationScreen.heading")} subtitle={t("settings.verificationScreen.subheading")}>
      {status === "pending" ? (
        <Card>
          <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
            {t("settings.verificationScreen.pendingReview")}
          </Text>
          <Text className="-mt-2 text-sm text-ink-700 dark:text-ink-200">
            {t("settings.verificationScreen.pendingBody")}
          </Text>
        </Card>
      ) : status === "verified" ? (
        <Card>
          <View className="flex-row items-center gap-3">
            <Ionicons name="shield-checkmark" size={28} color="#2C8B80" />
            <Text className="flex-1 font-display text-lg text-ink-900 dark:text-ink-50">
              {t("settings.verificationScreen.verifiedBody")}
            </Text>
          </View>
        </Card>
      ) : (
        <>
          <Group>
            <Item
              icon="person-outline"
              title={t("settings.verificationScreen.selfieTitle")}
              subtitle={t("settings.verificationScreen.selfieBody")}
              right={<Ionicons name="checkmark-circle" size={22} color="#2C8B80" />}
            />
            <Item
              icon="card-outline"
              title={t("settings.verificationScreen.idTitle")}
              subtitle={t("settings.verificationScreen.idBody")}
              right={
                <Text className="text-xs font-semibold text-accent-600">
                  {t("settings.verificationScreen.required")}
                </Text>
              }
            />
          </Group>
          <Note icon="lock-closed-outline">{t("settings.verificationScreen.disclaimer")}</Note>
          <Button
            label={
              submit.isPending ? t("settings.verificationScreen.submitting") : t("settings.verificationScreen.submit")
            }
            disabled={submit.isPending}
            onPress={() => submit.mutate()}
          />
        </>
      )}
    </SubPage>
  );
}
