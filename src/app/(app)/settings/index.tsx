import { Children, useState, type ReactNode } from "react";
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

type IconName = keyof typeof Ionicons.glyphMap;

// The small tinted tile every row leads with: pale coral-orange with a coral icon,
// the warm half of the logo's pair next to the teal of the selected chips and
// switches. The destructive rows (Delete account) get a solid coral tile instead.
// `solid` (Log out) is a filled teal tile, set apart like Delete's filled coral.
function RowIcon({ icon, danger = false, solid = false }: { icon: IconName; danger?: boolean; solid?: boolean }) {
  return (
    <View
      className={`h-9 w-9 items-center justify-center rounded-lg ${
        danger ? "bg-accent-500" : solid ? "bg-primary-500" : "bg-accent-100/60 dark:bg-ink-700"
      }`}
    >
      <Ionicons name={icon} size={20} color={danger || solid ? "#FFFFFF" : "#C1440E"} />
    </View>
  );
}

// On a phone every row is its own bordered card; on desktop web the rows sit
// inside their section's card (Section), which draws the dividers.
const ROW_CLASS =
  "flex-row items-center justify-between gap-3 rounded-xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3";
const WIDE_ROW_CLASS = "flex-row items-center justify-between gap-3 px-5 py-3.5";

// One setting: icon, label (and an optional hint under it), then either a value
// and a › for rows that open a page (onPress), or a control (`right`). `iconOnly`
// keeps just the icon on a phone, for rows whose controls need the width (the
// label still reaches screen readers).
function Row({
  icon,
  label,
  hint,
  value,
  onPress,
  right,
  danger = false,
  solid = false,
  iconOnly = false,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  solid?: boolean;
  iconOnly?: boolean;
}) {
  const wide = useWideLayout();
  const showLabel = wide || !iconOnly;
  const className = `${wide ? WIDE_ROW_CLASS : ROW_CLASS} ${onPress ? "web:hover:bg-primary-100/40 dark:web:hover:bg-ink-700" : ""}`;
  const content = (
    <>
      <View
        className={`flex-row items-center gap-3 ${showLabel ? "flex-1" : ""}`}
        accessible={!showLabel}
        accessibilityLabel={showLabel ? undefined : label}
      >
        <RowIcon icon={icon} danger={danger} solid={solid} />
        {showLabel ? (
          <View className="flex-1">
            <Text className={`text-base ${danger ? "text-accent-600" : "text-ink-900 dark:text-ink-50"}`}>{label}</Text>
            {hint ? <Text className="text-sm text-ink-400">{hint}</Text> : null}
          </View>
        ) : null}
      </View>
      {right}
      {onPress ? (
        <View className="flex-row items-center gap-1.5">
          {value ? <Text className="text-sm text-ink-400">{value}</Text> : null}
          <Ionicons name="chevron-forward" size={18} color="#A99C95" />
        </View>
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} className={className}>
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );
}

// A group of rows. Phone: the title above, then the rows as separate cards.
// Desktop web: one white card with the title inside and a hairline between rows.
function Section({ title, children }: { title?: string; children: ReactNode }) {
  const wide = useWideLayout();
  if (!wide) {
    return (
      <>
        {title ? <Text className="mt-2 text-xs font-medium uppercase text-ink-400">{title}</Text> : null}
        {children}
      </>
    );
  }
  return (
    <View className="overflow-hidden rounded-[18px] bg-white dark:bg-ink-800">
      {title ? (
        <Text className="px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-ink-400">{title}</Text>
      ) : null}
      {Children.toArray(children).map((child, index) => (
        <View key={index} className={index > 0 ? "border-t border-primary-50 dark:border-ink-700" : undefined}>
          {child}
        </View>
      ))}
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

  const verified = verification?.status === "verified";

  // Phone: a compact row. Desktop web: your account at a glance -- picture, name,
  // place, Plus / Verified badges, and View profile / Edit.
  const profileSection = wide ? (
    <View className="flex-row items-center gap-4 rounded-[18px] bg-white p-5 dark:bg-ink-800">
      <Avatar uri={profile?.avatar_url} name={profile?.display_name} size={64} />
      <View className="flex-1 gap-1.5">
        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50" numberOfLines={1}>
          {profile?.display_name || t("profile.addYourName")}
        </Text>
        {location ? <Text className="text-sm text-ink-400">{location}</Text> : null}
        {subscribed || verified ? (
          <View className="flex-row gap-1.5">
            {subscribed ? (
              <View className="flex-row items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1">
                <Ionicons name="star" size={12} color="#9C7A28" />
                <Text className="text-xs font-semibold text-gold-600">Plus</Text>
              </View>
            ) : null}
            {verified ? (
              <View className="flex-row items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1">
                <Ionicons name="checkmark-circle" size={12} color="#206E65" />
                <Text className="text-xs font-semibold text-teal-600">{t("settings.verification.verified")}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <View className="gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(app)/me/edit")}
          className="h-10 flex-row items-center justify-center gap-1.5 rounded-full bg-primary-500 px-4 web:hover:bg-primary-600"
        >
          <Ionicons name="pencil" size={14} color="#FFFFFF" />
          <Text className="text-sm font-semibold text-white">{t("profile.editProfile")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(app)/me")}
          className="h-10 items-center justify-center rounded-full border border-primary-100 px-4 web:hover:bg-primary-100/40 dark:border-ink-700"
        >
          <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">{t("chat.viewProfile")}</Text>
        </Pressable>
      </View>
    </View>
  ) : (
    <Pressable className={ROW_CLASS} onPress={() => router.push("/(app)/me")}>
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
        accessibilityLabel={t("settings.edit")}
        onPress={(e) => {
          e.stopPropagation();
          router.push("/(app)/me/edit");
        }}
      >
        <RowIcon icon="pencil" />
      </Pressable>
    </Pressable>
  );

  const appearanceSection = (
    <Section>
      <Row
        icon="language-outline"
        label={t("settings.appLanguage")}
        iconOnly
        right={
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
        }
      />
      <Row
        icon="contrast-outline"
        label={t("settings.theme")}
        iconOnly
        right={
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
        }
      />
      <Row
        icon="text-outline"
        label={t("settings.textSize")}
        iconOnly
        right={
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
        }
      />
    </Section>
  );

  const accountSection = (
    <Section title={t("settings.account")}>
      <Row
        icon="star-outline"
        label={t("plus.title")}
        value={subscribed ? t("plus.statusActive") : onPlusWaitlist ? t("plus.statusWaitlisted") : undefined}
        onPress={() => router.push("/(app)/plus")}
      />
      <Row icon="person-outline" label={t("settings.account")} onPress={() => router.push("/(app)/settings/account")} />
    </Section>
  );

  // Matching preferences lives here now, rather than in a section of its own.
  const safetySection = (
    <Section title={t("settings.safety")}>
      <Row
        icon="shield-checkmark-outline"
        label={t("settings.getVerified")}
        value={t(`settings.verification.${verification?.status ?? "unverified"}`)}
        onPress={() => router.push("/(app)/settings/verification")}
      />
      <Row
        icon="shield-half-outline"
        label={t("settings.safetyCenter")}
        onPress={() => router.push("/(app)/settings/safety")}
      />
      <Row
        icon="options-outline"
        label={t("settings.matchingPreferences")}
        onPress={() => router.push("/(app)/settings/matching-preferences")}
      />
    </Section>
  );

  const privacySection = (
    <Section title={t("settings.privacy")}>
      <Row
        icon="eye-outline"
        label={t("settings.profileVisibility")}
        right={
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
        }
      />
      <Row
        icon="sparkles-outline"
        label={t("settings.globalDiscover")}
        hint={t("settings.globalDiscoverHint")}
        right={
          <Switch
            value={profile?.discoverable ?? true}
            onValueChange={(discoverable) => updateDiscoverable.mutate(discoverable)}
          />
        }
      />
      <Row
        icon="ban-outline"
        label={t("settings.blockedUsers")}
        onPress={() => router.push("/(app)/settings/blocked-users")}
      />
      <Row
        icon="lock-closed-outline"
        label={t("settings.dataAndPrivacy")}
        onPress={() => router.push("/(app)/settings/static-page?topic=privacy")}
      />
    </Section>
  );

  const notificationsSection = (
    <Section title={t("settings.notifications")}>
      <Row
        icon="notifications-outline"
        label={t("settings.pushNotifications")}
        right={
          <Switch
            value={profile?.push_notifications_enabled ?? true}
            onValueChange={(pushEnabled) => updateNotifications.mutate({ pushEnabled })}
          />
        }
      />
      <Row
        icon="mail-outline"
        label={t("settings.emailNotifications")}
        right={
          <Switch
            value={profile?.email_notifications_enabled ?? false}
            onValueChange={(emailEnabled) => updateNotifications.mutate({ emailEnabled })}
          />
        }
      />
    </Section>
  );

  const communitySection = (
    <Section title={t("settings.community")}>
      <Row
        icon="information-circle-outline"
        label={t("settings.aboutApp")}
        onPress={() => router.push("/(app)/settings/static-page?topic=about")}
      />
      <Row
        icon="book-outline"
        label={t("settings.communityGuidelines")}
        onPress={() => router.push("/(app)/settings/static-page?topic=guidelines")}
      />
      <Row
        icon="help-buoy-outline"
        label={t("settings.helpAndSupport")}
        onPress={() => router.push("/(app)/settings/static-page?topic=help")}
      />
    </Section>
  );

  // Log out and Delete account as rows (Delete in coral); confirming the delete
  // opens under them.
  const dangerSection = (
    <>
      <Section>
        <Row icon="log-out-outline" label={t("settings.logOut")} solid onPress={() => signOut()} />
        <Row
          icon="trash-outline"
          label={t("settings.deleteAccount")}
          danger
          onPress={() => setConfirmingDelete(true)}
        />
      </Section>

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
      ) : null}
    </>
  );

  // Desktop web: a large title and the sections as cards in two columns, in place
  // of AppHeader and the phone's single list.
  if (wide) {
    return (
      <ScrollView
        className="flex-1 bg-primary-50 dark:bg-ink-950"
        contentContainerClassName="gap-6 px-20 pb-12 pt-9"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-display text-4xl text-ink-900 dark:text-ink-50">{t("tabs.settings")}</Text>
        <View className="flex-row items-start gap-6">
          <View className="flex-1 gap-4">
            {adminSection}
            {profileSection}
            {appearanceSection}
            {accountSection}
            {safetySection}
          </View>
          <View className="flex-1 gap-4">
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
        {privacySection}
        {notificationsSection}
        {communitySection}
        {dangerSection}
      </ScrollView>
    </SafeAreaView>
  );
}
