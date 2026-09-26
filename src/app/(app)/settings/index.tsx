import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { supabase } from "@/api/client";
import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyVerificationStatus } from "@/hooks/useVerification";
import {
  useRequestAccountDeletion,
  useUpdateAppLocale,
  useUpdateNotificationPreferences,
  useUpdateProfileVisibility,
} from "@/hooks/useSettings";
import { useOnboardingStore } from "@/stores/onboarding";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";

const VERIFICATION_LABELS: Record<string, string> = {
  unverified: "Not verified",
  pending: "Pending review",
  verified: "Verified",
  failed: "Verification failed",
};

function SectionHeader({ label }: { label: string }) {
  return <Text className="mt-2 text-xs font-medium uppercase text-ink-400">{label}</Text>;
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
      className="flex-row items-center justify-between rounded-xl border border-coral-100 bg-white px-4 py-3"
    >
      <Text className="text-base text-ink-900">{label}</Text>
      {value ? <Text className="text-sm text-ink-400">{value}</Text> : null}
    </Pressable>
  );
}

export default function Settings() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const { data: verification } = useMyVerificationStatus(userId);
  const updateAppLocale = useUpdateAppLocale(userId);
  const updateNotifications = useUpdateNotificationPreferences(userId);
  const updateVisibility = useUpdateProfileVisibility(userId);
  const requestDeletion = useRequestAccountDeletion(userId);
  const resetOnboardingStore = useOnboardingStore((s) => s.reset);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");

  const signOut = async () => {
    resetOnboardingStore();
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-8" contentContainerClassName="gap-3 pb-10">
        <Text className="font-display text-3xl text-ink-900">Settings</Text>

        <Pressable
          className="flex-row items-center justify-between rounded-xl border border-coral-100 bg-white px-4 py-3"
          onPress={() => router.push("/(app)/profile/edit")}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-coral-500">
              <Text className="text-base font-semibold text-white">
                {(profile?.display_name || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="font-display text-lg text-ink-900">{profile?.display_name || "Add your name"}</Text>
              {location ? <Text className="text-sm text-ink-400">{location}</Text> : null}
            </View>
          </View>
          <Text className="text-sm font-medium text-coral-600">Edit</Text>
        </Pressable>

        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 bg-white px-4 py-3">
          <Text className="text-base text-ink-900">App language</Text>
          <View className="flex-row gap-2">
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
          </View>
        </View>

        <SectionHeader label="Account" />
        <SettingsRow label="Account" onPress={() => router.push("/(app)/settings/account")} />

        <SectionHeader label="Safety" />
        <SettingsRow
          label="Get verified"
          value={VERIFICATION_LABELS[verification?.status ?? "unverified"]}
          onPress={() => router.push("/(app)/settings/verification")}
        />
        <SettingsRow label="Safety Center" onPress={() => router.push("/(app)/settings/safety")} />

        <SectionHeader label="Matching preferences" />
        <SettingsRow
          label="Matching preferences"
          onPress={() => router.push("/(app)/settings/matching-preferences")}
        />

        <SectionHeader label="Privacy" />
        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 bg-white px-4 py-3">
          <Text className="text-base text-ink-900">Profile visibility</Text>
          <View className="flex-row gap-2">
            <Chip
              label="Visible"
              selected={(profile?.profile_visibility ?? "visible") === "visible"}
              onPress={() => updateVisibility.mutate("visible")}
            />
            <Chip
              label="Hidden"
              selected={profile?.profile_visibility === "hidden"}
              onPress={() => updateVisibility.mutate("hidden")}
            />
          </View>
        </View>
        <SettingsRow label="Blocked users" onPress={() => router.push("/(app)/settings/blocked-users")} />
        <SettingsRow
          label="Data & privacy"
          onPress={() => router.push("/(app)/settings/static-page?topic=privacy")}
        />

        <SectionHeader label="Notifications" />
        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 bg-white px-4 py-3">
          <Text className="text-base text-ink-900">Push notifications</Text>
          <Switch
            value={profile?.push_notifications_enabled ?? true}
            onValueChange={(pushEnabled) => updateNotifications.mutate({ pushEnabled })}
          />
        </View>
        <View className="flex-row items-center justify-between rounded-xl border border-coral-100 bg-white px-4 py-3">
          <Text className="text-base text-ink-900">Email notifications</Text>
          <Switch
            value={profile?.email_notifications_enabled ?? false}
            onValueChange={(emailEnabled) => updateNotifications.mutate({ emailEnabled })}
          />
        </View>

        <SectionHeader label="Community" />
        <SettingsRow label="About Turkic Circles" onPress={() => router.push("/(app)/settings/static-page?topic=about")} />
        <SettingsRow
          label="Community guidelines"
          onPress={() => router.push("/(app)/settings/static-page?topic=guidelines")}
        />
        <SettingsRow label="Help & support" onPress={() => router.push("/(app)/settings/static-page?topic=help")} />

        <View className="mt-4">
          <Button label="Log out" variant="secondary" onPress={signOut} />
        </View>

        {confirmingDelete ? (
          <View className="gap-2 rounded-xl border border-coral-500 bg-white p-4">
            <Text className="text-sm text-ink-700">
              This marks your account for deletion. You&apos;ll be signed out, and your data will
              be permanently removed within a few days.
            </Text>
            <View className="flex-row gap-2">
              <Button label="Cancel" variant="secondary" onPress={() => setConfirmingDelete(false)} />
              <Button
                label="Yes, delete my account"
                onPress={() => requestDeletion.mutate(undefined, { onSuccess: signOut })}
              />
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingDelete(true)}>
            <Text className="text-center text-sm font-medium text-coral-600">Delete account</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
