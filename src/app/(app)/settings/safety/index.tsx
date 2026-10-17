import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { SubPage, Group, Item, Note } from "@/components/SettingsUI";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

import { Text } from "@/components/Text";
import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useCancelSafetyPlan, useCheckInSafetyPlan, useMySafetyPlans } from "@/hooks/useSafety";
import { alertMessage, cancelCheckInReminders, checkInTime, planContacts, textContacts } from "@/lib/safetyAlerts";
import type { Tables } from "@/types/database";

type SafetyItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

// A small action button on a plan card.
function PlanAction({ label, onPress, tone }: { label: string; onPress: () => void; tone: "solid" | "outline" | "danger" }) {
  const styles = {
    solid: "bg-primary-500 web:hover:bg-primary-600",
    outline: "border border-primary-100 dark:border-ink-700 web:hover:bg-primary-100/40",
    danger: "bg-accent-600",
  }[tone];
  const text = tone === "outline" ? "text-primary-600 dark:text-primary-400" : "text-white";
  return (
    <Pressable onPress={onPress} className={`h-10 justify-center rounded-full px-4 ${styles}`}>
      <Text className={`text-sm font-semibold ${text}`}>{label}</Text>
    </Pressable>
  );
}

// The member's upcoming and overdue safety plans, each with Check in, Alert my
// contacts (opens Messages with an alert already written) and Cancel. Hidden when
// there are none. Overdue: the check-in time has passed without a check-in -- the
// server marks it (0009's cron), and the card also shows it as soon as the time passes.
function YourPlans() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: plans } = useMySafetyPlans(userId);
  const { data: profile } = useMyProfile(userId);
  const checkIn = useCheckInSafetyPlan(userId);
  const cancel = useCancelSafetyPlan(userId);
  // Ticks every minute, so a card turns overdue on its own while the screen is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const open = (plans ?? []).filter((plan) => plan.status === "active" || plan.status === "overdue");
  if (open.length === 0) return null;

  async function alertContacts(plan: Tables<"safety_plans">) {
    const result = await textContacts(planContacts(plan), alertMessage(t, plan, profile?.display_name || ""));
    if (result === "unavailable" || result === "no-phones") {
      Alert.alert(t("safetyAlerts.cantTextTitle"), t("safetyAlerts.cantTextBody"));
    }
  }

  return (
    <View className="gap-1.5">
      <Text className="ml-1 mt-1 text-xs font-medium uppercase text-ink-400">{t("safetyAlerts.yourPlans")}</Text>
      {open.map((plan) => {
        const due = checkInTime(plan);
        const overdue = plan.status === "overdue" || due.getTime() < now;
        return (
          <View key={plan.id} className="gap-3 rounded-2xl bg-white p-4 dark:bg-ink-800">
            <View className="flex-row items-start gap-3">
              <View
                className={`h-9 w-9 items-center justify-center rounded-lg ${overdue ? "bg-accent-600" : "bg-accent-100/60 dark:bg-ink-700"}`}
              >
                <Ionicons name={overdue ? "alert" : "time-outline"} size={20} color={overdue ? "#FFFFFF" : "#C1440E"} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-semibold text-ink-900 dark:text-ink-50">
                  {t("safetyAlerts.meeting", { name: plan.meeting_with })}
                </Text>
                <Text className="text-sm text-ink-700 dark:text-ink-200">
                  {[format(new Date(plan.meeting_at), "EEE, MMM d · h:mm a"), plan.location].filter(Boolean).join(" · ")}
                </Text>
                <Text className={`text-sm ${overdue ? "font-semibold text-accent-600" : "text-ink-400"}`}>
                  {overdue
                    ? t("safetyAlerts.overdueSince", { time: format(due, "h:mm a") })
                    : t("safetyAlerts.checkInBy", { time: format(due, "h:mm a") })}
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <PlanAction
                tone="solid"
                label={t("safetyAlerts.checkIn")}
                onPress={() => {
                  checkIn.mutate(plan.id);
                  cancelCheckInReminders(plan.id);
                }}
              />
              <PlanAction
                tone={overdue ? "danger" : "outline"}
                label={t("safetyAlerts.alertContacts")}
                onPress={() => alertContacts(plan)}
              />
              <PlanAction
                tone="outline"
                label={t("safetyAlerts.cancelPlan")}
                onPress={() => {
                  cancel.mutate(plan.id);
                  cancelCheckInReminders(plan.id);
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function SafetyCenter() {
  const { t } = useTranslation();
  const items: SafetyItem[] = [
    {
      icon: "shield-checkmark-outline",
      title: t("settings.safetyCenterScreen.verificationTitle"),
      subtitle: t("settings.safetyCenterScreen.verificationSubtitle"),
      onPress: () => router.push("/(app)/settings/verification"),
    },
    {
      icon: "location-outline",
      title: t("settings.safetyCenterScreen.sharePlansTitle"),
      subtitle: t("settings.safetyCenterScreen.sharePlansSubtitle"),
      onPress: () => router.push("/(app)/settings/safety/share-plans"),
    },
    {
      icon: "flag-outline",
      title: t("settings.safetyCenterScreen.reportBlockTitle"),
      subtitle: t("settings.safetyCenterScreen.reportBlockSubtitle"),
      onPress: () => router.push("/(app)/settings/safety/report"),
    },
    {
      icon: "information-circle-outline",
      title: t("settings.safetyCenterScreen.meetingTipsTitle"),
      subtitle: t("settings.safetyCenterScreen.meetingTipsSubtitle"),
      onPress: () => router.push("/(app)/settings/static-page?topic=guidelines"),
    },
    {
      icon: "document-text-outline",
      title: t("settings.safetyCenterScreen.communityGuidelinesTitle"),
      subtitle: "",
      onPress: () => router.push("/(app)/settings/static-page?topic=guidelines"),
    },
    {
      icon: "headset-outline",
      title: t("settings.safetyCenterScreen.contactSupportTitle"),
      subtitle: "",
      onPress: () => router.push("/(app)/settings/static-page?topic=help"),
    },
  ];

  return (
    <SubPage title={t("settings.safetyCenterScreen.heading")} subtitle={t("settings.safetyCenterScreen.subheading")}>
      <YourPlans />
      <Group>
        {items.map((item) => (
          <Item key={item.title} icon={item.icon} title={item.title} subtitle={item.subtitle} onPress={item.onPress} />
        ))}
      </Group>
      <Note icon="warning-outline" tone="warning">
        {t("settings.safetyCenterScreen.emergencyDisclaimer")}
      </Note>
    </SubPage>
  );
}
