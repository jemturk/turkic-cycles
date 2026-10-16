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
import { useDebugSetTier, useDebugSetVerified, useHasPlus, useMySubscription, usePlusWaitlist } from "@/hooks/usePlus";
import type { Tier } from "@/api/plus";
import { useIsAppAdmin } from "@/hooks/useCircles";
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
import { useWideLayout } from "@/hooks/useWideLayout";

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
      className="h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-ink-700"
    >
      <Ionicons name={icon} size={22} color="#127A87" />
    </View>
  );
}

// Every row is its own bordered card, on a phone and on desktop web alike.
const ROW_CLASS =
  "flex-row items-center justify-between rounded-xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3";

function SettingsRow({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`${ROW_CLASS} web:hover:bg-primary-50 dark:web:hover:bg-ink-700`}>
      <Text className="text-base text-ink-900 dark:text-ink-50">{label}</Text>
      {value ? <Text className="text-sm text-ink-400">{value}</Text> : null}
    </Pressable>
  );
}

// The icon stands in for the label on a phone; desktop has room for both.
function RowLabel({ icon, label, wide }: { icon: keyof typeof Ionicons.glyphMap; label: string; wide: boolean }) {
  if (!wide) return <RowIcon icon={icon} label={label} />;
  return (
    <View className="flex-row items-center gap-3">
      <RowIcon icon={icon} label={label} />
      <Text className="text-base text-ink-900 dark:text-ink-50">{label}</Text>
    </View>
  );
}

// TEMPORARY test controls (migration 0036).
const TEST_TIERS: { tier: Tier; label: string }[] = [
  { tier: "free", label: "Free" },
  { tier: "plus", label: "Plus" },
  { tier: "premium", label: "Premium" },
];

export default function Settings() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const { data: verification } = useMyVerificationStatus(userId);
  const subscribed = useHasPlus(userId);
  const { data: onPlusWaitlist } = usePlusWaitlist(userId);
  // TEMPORARY free/Plus switch for testing; remove with migration 0034's function.
  const { data: isAdmin } = useIsAppAdmin(userId);
  const { data: subscription } = useMySubscription(userId);
  const debugSetTier = useDebugSetTier(userId);
  const debugSetVerified = useDebugSetVerified(userId);
  const updateAppLocale = useUpdateAppLocale(userId);
  const updateThemePreference = useUpdateThemePreference(userId);
  const updateTextSize = useUpdateTextSize(userId);
  const updateNotifications = useUpdateNotificationPreferences(userId);
  const updateVisibility = useUpdateProfileVisibility(userId);
  const updateDiscoverable = useUpdateDiscoverable(userId);
  const deleteAccount = useDeleteAccount();
  const resetOnboardingStore = useOnboardingStore((s) => s.reset);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const wide = useWideLayout();
  const row = ROW_CLASS;
  const rowWithGap = `${row} gap-3`;

  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");

  // local: after deleting the account the session is already invalid server-side,
  // so a global sign-out would fail -- just drop the session on this device.
  const signOut = async (scope: "global" | "local" = "global") => {
    resetOnboardingStore();
    await supabase.auth.signOut({ scope });
    router.replace("/");
  };

  const adminSection = (
    <>
      {/* TEMPORARY test controls (migration 0036), at the top while testing. */}
      {isAdmin ? (
        <View className="gap-3 rounded-xl border border-dashed border-accent-500 bg-white dark:bg-ink-800 px-4 py-3">
          <View>
            <Text className="text-base text-ink-900 dark:text-ink-50">Test: subscription</Text>
            <Text className="text-sm text-ink-400">temporary, admins only</Text>
          </View>
          <View accessibilityRole="radiogroup" className="flex-row gap-4">
            {TEST_TIERS.map(({ tier, label }) => {
              const selected = subscription?.tier === tier;
              return (
                <Pressable
                  key={tier}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  disabled={!subscription || debugSetTier.isPending}
                  onPress={() =>
                    debugSetTier.mutate(tier, { onError: (e) => Alert.alert("Couldn't switch", e.message) })
                  }
                  className="flex-row items-center gap-1.5"
                >
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selected ? "#127A87" : "#9CA3AF"}
                  />
                  <Text className="text-base text-ink-900 dark:text-ink-50">{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-ink-900 dark:text-ink-50">Verified</Text>
            <Switch
              value={verification?.status === "verified"}
              disabled={!verification || debugSetVerified.isPending}
              onValueChange={(verified) =>
                debugSetVerified.mutate(verified, { onError: (e) => Alert.alert("Couldn't switch", e.message) })
              }
            />
          </View>
        </View>
      ) : null}
    </>
  );

  const profileSection = (
    <>
      <Pressable className={row} onPress={() => router.push("/(app)/me")}>
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
    </>
  );

  const appearanceSection = (
    <>
      <View className={row}>
        <RowLabel icon="language-outline" label={t("settings.appLanguage")} wide={wide} />
        <View className="flex-row flex-wrap justify-end gap-2">
          <Chip
            label="EN"
            selected={(profile?.app_locale ?? "en") === "en"}
            onPress={() => updateAppLocale.mutate("en")}
          />
          <Chip label="TR" selected={profile?.app_locale === "tr"} onPress={() => updateAppLocale.mutate("tr")} />
          <Chip label="RU" selected={profile?.app_locale === "ru"} onPress={() => updateAppLocale.mutate("ru")} />
          <Chip label="DE" selected={profile?.app_locale === "de"} onPress={() => updateAppLocale.mutate("de")} />
        </View>
      </View>

      <View className={row}>
        <RowLabel icon="contrast-outline" label={t("settings.theme")} wide={wide} />
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

      <View className={row}>
        <RowLabel icon="text-outline" label={t("settings.textSize")} wide={wide} />
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
    </>
  );

  const accountSection = (
    <>
      <SectionHeader label={t("settings.account")} />
      <SettingsRow
        label={t("plus.title")}
        value={subscribed ? t("plus.statusActive") : onPlusWaitlist ? t("plus.statusWaitlisted") : undefined}
        onPress={() => router.push("/(app)/plus")}
      />
      <SettingsRow label={t("settings.account")} onPress={() => router.push("/(app)/settings/account")} />
    </>
  );

  const safetySection = (
    <>
      <SectionHeader label={t("settings.safety")} />
      <SettingsRow
        label={t("settings.getVerified")}
        value={t(`settings.verification.${verification?.status ?? "unverified"}`)}
        onPress={() => router.push("/(app)/settings/verification")}
      />
      <SettingsRow label={t("settings.safetyCenter")} onPress={() => router.push("/(app)/settings/safety")} />
    </>
  );

  const matchingSection = (
    <>
      <SectionHeader label={t("settings.matchingPreferences")} />
      <SettingsRow
        label={t("settings.matchingPreferences")}
        onPress={() => router.push("/(app)/settings/matching-preferences")}
      />
    </>
  );

  const privacySection = (
    <>
      <SectionHeader label={t("settings.privacy")} />
      <View className={row}>
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
      <View className={rowWithGap}>
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
    </>
  );

  const notificationsSection = (
    <>
      <SectionHeader label={t("settings.notifications")} />
      <View className={row}>
        <Text className="text-base text-ink-900 dark:text-ink-50">{t("settings.pushNotifications")}</Text>
        <Switch
          value={profile?.push_notifications_enabled ?? true}
          onValueChange={(pushEnabled) => updateNotifications.mutate({ pushEnabled })}
        />
      </View>
      <View className={row}>
        <Text className="text-base text-ink-900 dark:text-ink-50">{t("settings.emailNotifications")}</Text>
        <Switch
          value={profile?.email_notifications_enabled ?? false}
          onValueChange={(emailEnabled) => updateNotifications.mutate({ emailEnabled })}
        />
      </View>
    </>
  );

  const communitySection = (
    <>
      <SectionHeader label={t("settings.community")} />
      <SettingsRow
        label={t("settings.aboutApp")}
        onPress={() => router.push("/(app)/settings/static-page?topic=about")}
      />
      <SettingsRow
        label={t("settings.communityGuidelines")}
        onPress={() => router.push("/(app)/settings/static-page?topic=guidelines")}
      />
      <SettingsRow
        label={t("settings.helpAndSupport")}
        onPress={() => router.push("/(app)/settings/static-page?topic=help")}
      />
    </>
  );

  const dangerSection = (
    <>
      <View className="mt-4">
        <Button label={t("settings.logOut")} variant="secondary" onPress={() => signOut()} />
      </View>

      {confirmingDelete ? (
        <View className="gap-2 rounded-xl border border-accent-500 bg-white dark:bg-ink-800 p-4">
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
          <Text className="text-center text-sm font-medium text-accent-600">{t("settings.deleteAccount")}</Text>
        </Pressable>
      )}
    </>
  );

  // Desktop web: a large title and the same rows in two columns, in place of
  // AppHeader and the phone's single list.
  if (wide) {
    return (
      <ScrollView
        className="flex-1 bg-primary-50 dark:bg-ink-950"
        contentContainerClassName="gap-6 px-10 pb-12 pt-9"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-display text-4xl text-ink-900 dark:text-ink-50">{t("tabs.settings")}</Text>
        <View className="flex-row items-start gap-6">
          <View className="flex-1 gap-3">
            {adminSection}
            {profileSection}
            {appearanceSection}
            {accountSection}
            {safetySection}
            {matchingSection}
          </View>
          <View className="flex-1 gap-3">
            {privacySection}
            {notificationsSection}
            {communitySection}
            {dangerSection}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <ScrollView className="flex-1 px-6 pt-4" contentContainerClassName="gap-3 pb-10">
        {adminSection}
        {profileSection}
        {appearanceSection}
        {accountSection}
        {safetySection}
        {matchingSection}
        {privacySection}
        {notificationsSection}
        {communitySection}
        {dangerSection}
      </ScrollView>
    </SafeAreaView>
  );
}
