import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as SMS from "expo-sms";
import { addMinutes, format } from "date-fns";
import type { TFunction } from "i18next";

import type { TrustedContact } from "@/api/safety";
import type { Tables } from "@/types/database";

// Safety plans reach trusted contacts as texts the member sends from their own
// phone: the app opens Messages with the text already written, and they tap Send.
// Nothing is sent automatically -- no SMS provider, no cost, works everywhere -- so
// the app backs it up with check-in reminders scheduled on the device itself
// (local notifications, which need no server and work offline):
//   * at the check-in time: "Time to check in";
//   * OVERDUE_AFTER_MINUTES later, if they still haven't: "Alert your contacts?".
// Tapping either opens the Safety Center, where the plan has Check in and
// Alert my contacts buttons.

type SafetyPlan = Tables<"safety_plans">;

const OVERDUE_AFTER_MINUTES = 15;
const REMINDER_IDS_KEY = (planId: string) => `turek.safetyReminders.${planId}`;

export function planContacts(plan: SafetyPlan): TrustedContact[] {
  return Array.isArray(plan.trusted_contacts) ? (plan.trusted_contacts as TrustedContact[]) : [];
}

export function checkInTime(plan: Pick<SafetyPlan, "meeting_at" | "auto_checkin_minutes">) {
  return addMinutes(new Date(plan.meeting_at), plan.auto_checkin_minutes);
}

// The text sent when the plan is made: who, where, when, and when to worry.
export function planMessage(t: TFunction, plan: SafetyPlan, myName: string) {
  return t("safetyAlerts.planText", {
    name: myName,
    meetingWith: plan.meeting_with,
    location: plan.location,
    when: format(new Date(plan.meeting_at), "EEE, MMM d 'at' h:mm a"),
    checkIn: format(checkInTime(plan), "h:mm a"),
  });
}

// The text sent when they haven't checked in.
export function alertMessage(t: TFunction, plan: SafetyPlan, myName: string) {
  return t("safetyAlerts.alertText", {
    name: myName,
    meetingWith: plan.meeting_with,
    location: plan.location,
    when: format(new Date(plan.meeting_at), "EEE, MMM d 'at' h:mm a"),
  });
}

// Opens the phone's Messages app addressed to the contacts with `message` filled in.
// "sent" / "cancelled" on iPhone; Android can't tell, so it reports "unknown". In a
// browser (no SMS), falls back to an sms: link, which phones' browsers open in
// Messages; "unavailable" if even that can't open.
export async function textContacts(contacts: TrustedContact[], message: string) {
  const phones = contacts.map((c) => c.phone.trim()).filter(Boolean);
  if (phones.length === 0) return "no-phones" as const;
  if (await SMS.isAvailableAsync()) {
    const { result } = await SMS.sendSMSAsync(phones, message);
    return result;
  }
  const separator = Platform.OS === "ios" ? "&" : "?";
  const url = `sms:${phones.join(",")}${separator}body=${encodeURIComponent(message)}`;
  if (await Linking.canOpenURL(url).catch(() => false)) {
    await Linking.openURL(url);
    return "unknown" as const;
  }
  return "unavailable" as const;
}

// Schedules the two check-in reminders for a plan (phones only; the website can't
// notify while it's closed). Asks for notification permission if it hasn't been
// given yet; without it, the plan still works but there are no reminders.
export async function scheduleCheckInReminders(t: TFunction, plan: SafetyPlan) {
  if (Platform.OS === "web") return;
  await cancelCheckInReminders(plan.id);

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return;

  const due = checkInTime(plan);
  const data = { type: "safety", planId: plan.id };
  const reminders = [
    {
      date: due,
      title: t("safetyAlerts.reminderTitle"),
      body: t("safetyAlerts.reminderBody", { meetingWith: plan.meeting_with }),
    },
    {
      date: addMinutes(due, OVERDUE_AFTER_MINUTES),
      title: t("safetyAlerts.overdueTitle"),
      body: t("safetyAlerts.overdueBody"),
    },
  ].filter((reminder) => reminder.date.getTime() > Date.now());

  const ids: string[] = [];
  for (const reminder of reminders) {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title: reminder.title, body: reminder.body, data, sound: "default" },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.date,
          channelId: "default",
        },
      })
    );
  }
  await AsyncStorage.setItem(REMINDER_IDS_KEY(plan.id), JSON.stringify(ids)).catch(() => {});
}

// After checking in or cancelling: the reminders are no longer needed.
export async function cancelCheckInReminders(planId: string) {
  if (Platform.OS === "web") return;
  const stored = await AsyncStorage.getItem(REMINDER_IDS_KEY(planId)).catch(() => null);
  if (!stored) return;
  const ids = JSON.parse(stored) as string[];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  await AsyncStorage.removeItem(REMINDER_IDS_KEY(planId)).catch(() => {});
}
