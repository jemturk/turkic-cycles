import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMyVerificationStatus, useSubmitVerificationStub } from "@/hooks/useVerification";
import { Button } from "@/components/Button";

export default function Verification() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: verification } = useMyVerificationStatus(userId);
  const submit = useSubmitVerificationStub(userId);

  const status = verification?.status ?? "unverified";

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <Ionicons name="shield-checkmark-outline" size={32} color="#2C8B80" />
          </View>
          <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">
            {t("settings.verificationScreen.heading")}
          </Text>
          <Text className="text-center text-sm text-ink-700 dark:text-ink-200">
            {t("settings.verificationScreen.subheading")}
          </Text>
        </View>

        {status === "pending" ? (
          <View className="rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
              {t("settings.verificationScreen.pendingReview")}
            </Text>
            <Text className="mt-1 text-sm text-ink-700 dark:text-ink-200">
              {t("settings.verificationScreen.pendingBody")}
            </Text>
          </View>
        ) : status === "verified" ? (
          <View className="rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
              {t("settings.verificationScreen.verifiedBody")}
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row items-center gap-3 rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
              <Ionicons name="person-outline" size={22} color="#2C8B80" />
              <View className="flex-1">
                <Text className="font-display text-base text-ink-900 dark:text-ink-50">
                  {t("settings.verificationScreen.selfieTitle")}
                </Text>
                <Text className="text-xs text-ink-400">{t("settings.verificationScreen.selfieBody")}</Text>
              </View>
              <Ionicons name="checkmark" size={20} color="#2C8B80" />
            </View>

            <View className="flex-row items-center gap-3 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
              <Ionicons name="card-outline" size={22} color="#D9663D" />
              <View className="flex-1">
                <Text className="font-display text-base text-ink-900 dark:text-ink-50">
                  {t("settings.verificationScreen.idTitle")}
                </Text>
                <Text className="text-xs text-ink-400">{t("settings.verificationScreen.idBody")}</Text>
              </View>
              <Text className="text-xs font-medium text-coral-600">{t("settings.verificationScreen.required")}</Text>
            </View>

            <View className="flex-row gap-2 rounded-xl bg-teal-50 p-3">
              <Ionicons name="lock-closed-outline" size={18} color="#2C8B80" />
              <Text className="flex-1 text-xs text-ink-700 dark:text-ink-200">
                {t("settings.verificationScreen.disclaimer")}
              </Text>
            </View>

            <View className="mt-2">
              <Button
                label={submit.isPending ? t("settings.verificationScreen.submitting") : t("settings.verificationScreen.submit")}
                disabled={submit.isPending}
                onPress={() => submit.mutate()}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
