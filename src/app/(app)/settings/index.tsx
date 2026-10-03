import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyVerificationStatus } from "@/hooks/useVerification";
import {
  useDeleteAccount,
  useUpdateAppLocale,
  useUpdateDiscoverable,
  useUpdateNotificationPreferences,
  useUpdateProfileVisibility,
  useUpdateTextSize,
  useUpdateThemePreference,
} from "@/hooks/useSettings";
import { useOnboardingStore } from "@/stores/onboarding";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Avatar } from "@/components/Avatar";

function SectionHeader({ label }: { label: string }) {
  return <Text className="mt-2 text-xs font-medium uppercase text-ink-400">{label}</Text>;
}

// Icon-only stand-in for a row's text label. The label still goes to screen
// readers via accessibilityLabel.
function RowIcon({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      className="h-10 w-10 items-center justify-center rounded-lg bg-coral-50 dark:bg-ink-700"
    >
      <Ionicons name={icon} size={22} color="#D9663D" />
    </View>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3"
    >
      <Text className="text-base text-ink-900 dark:text-ink-50">{label}</Text>
      {value ? <Text className="text-sm text-ink-400">{value}</Text> : null}
    </Pressable>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const { data: verification } = useMyVerificationStatus(userId);
  const updateAppLocale = useUpdateAppLocale(userId);
  const updateThemePreference = useUpdateThemePreference(userId);
  const updateTextSize = useUpdateTextSize(userId);
  const updateNotifications = useUpdateNotificationPreferences(userId);
  const updateVisibility = useUpdateProfileVisibility(userId);
  const updateDiscoverable = useUpdateDiscoverable(userId);
  const deleteAccount = useDeleteAccount();
  const resetOnboardingStore = useOnboardingStore((s) => s.reset);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");

  // local: after deleting the account the session is already invalid server-side,
  // so a global sign-out would fail -- just drop the session on this device.
  const signOut = async (scope: "global" | "local" = "global") => {
    resetOnboardingStore();
    await supabase.auth.signOut({ scope });
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950" edges={["left", "right", "bottom"]}>
      <ScrollView className="flex-1 px-6 pt-4" contentContainerClassName="gap-3 pb-10">
        <Pressable
          className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3"
          onPress={() => router.push("/(app)/me")}
        >
          <View className="flex-row items-center gap-3">
            <Avatar uri={profile?.avatar_url} name={profile?.display_name} size={44} />
            <View>
              <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
                {profile?.display_name || t("profile.addYourName")}
              </Text>
              {location ? <Text className="text-sm text-ink-400">{location}</Text> : null}
            </View>
          </View>
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              router.push("/(app)/me/edit");
            }}
          >
            <RowIcon icon="pencil" label={t("settings.edit")} />
          </Pressable>
        </Pressable>

        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
          <RowIcon icon="language-outline" label={t("settings.appLanguage")} />
          <View className="flex-row flex-wrap justify-end gap-2">
            <Chip
              label="EN"
              selected={(profile?.app_locale ?? "en") === "en"}
              onPress={() => updateAppLocale.mutate("en")}
            />
            <Chip
              label="TR"
              selected={profile?.app_locale === "tr"}
              onPress={() => updateAppLocale.mutate("tr")}
            />
            <Chip
              label="RU"
              selected={profile?.app_locale === "ru"}
              onPress={() => updateAppLocale.mutate("ru")}
            />
            <Chip
              label="DE"
              selected={profile?.app_locale === "de"}
              onPress={() => updateAppLocale.mutate("de")}
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
          <RowIcon icon="contrast-outline" label={t("settings.theme")} />
          <View className="flex-row gap-2">
            <Chip
              label={t("settings.light")}
              selected={(profile?.theme_preference ?? "light") === "light"}
              onPress={() => updateThemePreference.mutate("light")}
            />
            <Chip
              label={t("settings.dark")}
              selected={profile?.theme_preference === "dark"}
              onPress={() => updateThemePreference.mutate("dark")}
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
          <RowIcon icon="text-outline" label={t("settings.textSize")} />
          <View className="flex-row gap-2">
            <Chip
              label={t("settings.textSizeSmall")}
              selected={profile?.text_size === "small"}
              onPress={() => updateTextSize.mutate("small")}
            />
            <Chip
              label={t("settings.textSizeDefault")}
              selected={(profile?.text_size ?? "default") === "default"}
              onPress={() => updateTextSize.mutate("default")}
            />
            <Chip
              label={t("settings.textSizeLarge")}
              selected={profile?.text_size === "large"}
              onPress={() => updateTextSize.mutate("large")}
            />
          </View>
        </View>

        <SectionHeader label={t("settings.account")} />
        <SettingsRow label={t("settings.account")} onPress={() => router.push("/(app)/settings/account")} />

        <SectionHeader label={t("settings.safety")} />
        <SettingsRow
          label={t("settings.getVerified")}
          value={t(`settings.verification.${verification?.status ?? "unverified"}`)}
          onPress={() => router.push("/(app)/settings/verification")}
        />
        <SettingsRow label={t("settings.safetyCenter")} onPress={() => router.push("/(app)/settings/safety")} />

        <SectionHeader label={t("settings.matchingPreferences")} />
        <SettingsRow
          label={t("settings.matchingPreferences")}
          onPress={() => router.push("/(app)/settings/matching-preferences")}
        />

        <SectionHeader label={t("settings.privacy")} />
        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
          <Text className="text-base text-ink-900 dark:text-ink-50">{t("settings.profileVisibility")}</Text>
          <View className="flex-row gap-2">
            <Chip
              label={t("settings.visible")}
              selected={(profile?.profile_visibility ?? "visible") === "visible"}
              onPress={() => updateVisibility.mutate("visible")}
            />
            <Chip
              label={t("settings.hidden")}
              selected={profile?.profile_visibility === "hidden"}
              onPress={() => updateVisibility.mutate("hidden")}
            />
          </View>
        </View>
        <View className="flex-row items-center justify-between gap-3 rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
          <View className="flex-1">
            <Text className="text-base text-ink-900 dark:text-ink-50">{t("settings.globalDiscover")}</Text>
            <Text className="text-sm text-ink-400">{t("settings.globalDiscoverHint")}</Text>
          </View>
          <Switch
            value={profile?.discoverable ?? true}
            onValueChange={(discoverable) => updateDiscoverable.mutate(discoverable)}
          />
        </View>
        <SettingsRow label={t("settings.blockedUsers")} onPress={() => router.push("/(app)/settings/blocked-users")} />
        <SettingsRow
          label={t("settings.dataAndPrivacy")}
          onPress={() => router.push("/(app)/settings/static-page?topic=privacy")}
        />

        <SectionHeader label={t("settings.notifications")} />
        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
          <Text className="text-base text-ink-900 dark:text-ink-50">{t("settings.pushNotifications")}</Text>
          <Switch
            value={profile?.push_notifications_enabled ?? true}
            onValueChange={(pushEnabled) => updateNotifications.mutate({ pushEnabled })}
          />
        </View>
        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
          <Text className="text-base text-ink-900 dark:text-ink-50">{t("settings.emailNotifications")}</Text>
          <Switch
            value={profile?.email_notifications_enabled ?? false}
            onValueChange={(emailEnabled) => updateNotifications.mutate({ emailEnabled })}
          />
        </View>

        <SectionHeader label={t("settings.community")} />
        <SettingsRow label={t("settings.aboutApp")} onPress={() => router.push("/(app)/settings/static-page?topic=about")} />
        <SettingsRow
          label={t("settings.communityGuidelines")}
          onPress={() => router.push("/(app)/settings/static-page?topic=guidelines")}
        />
        <SettingsRow label={t("settings.helpAndSupport")} onPress={() => router.push("/(app)/settings/static-page?topic=help")} />

        <View className="mt-4">
          <Button label={t("settings.logOut")} variant="secondary" onPress={() => signOut()} />
        </View>

        {confirmingDelete ? (
          <View className="gap-2 rounded-xl border border-coral-500 bg-white dark:bg-ink-800 p-4">
            <Text className="text-sm text-ink-700 dark:text-ink-200">{t("settings.deleteAccountWarning")}</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label={t("settings.cancel")} variant="secondary" onPress={() => setConfirmingDelete(false)} />
              </View>
              <View className="flex-1">
                <Button
                  label={deleteAccount.isPending ? t("common.loading") : t("settings.confirmDelete")}
                  disabled={deleteAccount.isPending}
                  onPress={() =>
                    deleteAccount.mutate(undefined, {
                      onSuccess: () => signOut("local"),
                      onError: () => Alert.alert(t("settings.deleteAccountFailed")),
                    })
                  }
                />
              </View>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingDelete(true)}>
            <Text className="text-center text-sm font-medium text-coral-600">{t("settings.deleteAccount")}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
