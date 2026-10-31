import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { addMinutes, format, isValid, parse } from "date-fns";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useCreateSafetyPlan } from "@/hooks/useSafety";
import { useMyProfile } from "@/hooks/useProfile";
import { planMessage, scheduleCheckInReminders, textContacts } from "@/lib/safetyAlerts";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { Chip } from "@/components/Chip";
import type { TrustedContact } from "@/api/safety";
import { SubPage, Card } from "@/components/SettingsUI";
import { goUp } from "@/lib/goUp";

export default function SharePlans() {
  const { t } = useTranslation();
  const { session } = useSession();
  const createPlan = useCreateSafetyPlan(session?.user.id);
  const { data: profile } = useMyProfile(session?.user.id);

  const [meetingWith, setMeetingWith] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [time, setTime] = useState(""); // HH:MM, 24h
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [autoCheckinMinutes, setAutoCheckinMinutes] = useState(120);

  const meetingAt = date && time ? parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date()) : null;
  const meetingAtValid = meetingAt && isValid(meetingAt);
  const checkinAt = meetingAtValid ? addMinutes(meetingAt, autoCheckinMinutes) : null;

  function addContact() {
    // A phone number is what the text goes to.
    if (!contactName.trim() || !contactPhone.trim()) return;
    setContacts([...contacts, { name: contactName.trim(), phone: contactPhone.trim() }]);
    setContactName("");
    setContactPhone("");
  }

  function onSubmit() {
    if (!meetingAtValid || contacts.length === 0) return;
    createPlan.mutate(
      {
        meetingWith,
        location,
        meetingAt: meetingAt.toISOString(),
        trustedContacts: contacts,
        autoCheckinMinutes,
      },
      {
        // Saved: set the check-in reminders, then open Messages with the plan
        // written out for the contacts -- they're told only when you tap Send.
        onSuccess: async (plan) => {
          await scheduleCheckInReminders(t, plan).catch(() => {});
          await textContacts(contacts, planMessage(t, plan, profile?.display_name || "")).catch(() => {});
          goUp("/(app)/settings/safety");
        },
      },
    );
  }

  return (
    <SubPage parent="/(app)/settings/safety" title={t("settings.sharePlansScreen.heading")} subtitle={t("settings.sharePlansScreen.subheading")} form>
      <Card>
        <TextField
          label={t("settings.sharePlansScreen.whoMeeting")}
          value={meetingWith}
          onChangeText={setMeetingWith}
        />
        <TextField label={t("settings.sharePlansScreen.where")} value={location} onChangeText={setLocation} />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label={t("settings.sharePlansScreen.date")}
              value={date}
              onChangeText={setDate}
              placeholder="2026-10-04"
            />
          </View>
          <View className="flex-1">
            <TextField
              label={t("settings.sharePlansScreen.time")}
              value={time}
              onChangeText={setTime}
              placeholder="19:00"
            />
          </View>
        </View>

        <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">
          {t("settings.sharePlansScreen.trustedContacts")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {contacts.map((contact, i) => (
            <Chip
              key={`${contact.name}-${i}`}
              label={contact.name}
              selected
              onPress={() => setContacts(contacts.filter((_, j) => j !== i))}
            />
          ))}
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextField
              placeholder={t("settings.sharePlansScreen.namePlaceholder")}
              value={contactName}
              onChangeText={setContactName}
            />
          </View>
          <View className="flex-1">
            <TextField
              placeholder={t("settings.sharePlansScreen.phonePlaceholder")}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              value={contactPhone}
              onChangeText={setContactPhone}
            />
          </View>
        </View>
        <Button variant="secondary" label={t("settings.sharePlansScreen.addContact")} onPress={addContact} />

        <TextField
          label={t("settings.sharePlansScreen.checkInAfter")}
          keyboardType="number-pad"
          value={String(autoCheckinMinutes)}
          onChangeText={(v) => setAutoCheckinMinutes(Number(v) || 0)}
        />

        <View className="gap-2 rounded-xl bg-teal-50 p-3">
          <Text className="text-xs text-ink-700 dark:text-ink-200">
            {t("settings.sharePlansScreen.willGetText", {
              contacts:
                contacts.length > 0
                  ? contacts.map((c) => c.name).join(", ")
                  : t("settings.sharePlansScreen.yourTrustedContact"),
              name: meetingWith || t("settings.sharePlansScreen.theirNameFallback"),
            })}
            {checkinAt ? t("settings.sharePlansScreen.checkinNote", { time: format(checkinAt, "h:mm a") }) : ""}
            {t("settings.sharePlansScreen.followUpNote")}
          </Text>
        </View>

        <View>
          <Button
            label={
              createPlan.isPending ? t("settings.sharePlansScreen.sharing") : t("settings.sharePlansScreen.sharePlans")
            }
            disabled={createPlan.isPending || !meetingAtValid || contacts.length === 0}
            onPress={onSubmit}
          />
        </View>
      </Card>
    </SubPage>
  );
}
