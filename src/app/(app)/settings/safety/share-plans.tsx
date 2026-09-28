import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { addMinutes, format, isValid, parse } from "date-fns";

import { useSession } from "@/hooks/useSession";
import { useCreateSafetyPlan } from "@/hooks/useSafety";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { Chip } from "@/components/Chip";
import type { TrustedContact } from "@/api/safety";

export default function SharePlans() {
  const { session } = useSession();
  const createPlan = useCreateSafetyPlan(session?.user.id);

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
    if (!contactName.trim()) return;
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
      { onSuccess: () => router.back() }
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">Share your plans</Text>
        <Text className="-mt-2 text-sm text-ink-700 dark:text-ink-200">
          Let a trusted contact know where you&apos;ll be — just in case.
        </Text>

        <TextField label="Who are you meeting?" value={meetingWith} onChangeText={setMeetingWith} />
        <TextField label="Where" value={location} onChangeText={setLocation} />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-04" />
          </View>
          <View className="flex-1">
            <TextField label="Time (24h)" value={time} onChangeText={setTime} placeholder="19:00" />
          </View>
        </View>

        <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">Trusted contacts</Text>
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
            <TextField placeholder="Name" value={contactName} onChangeText={setContactName} />
          </View>
          <View className="flex-1">
            <TextField placeholder="Phone" value={contactPhone} onChangeText={setContactPhone} />
          </View>
        </View>
        <Button variant="secondary" label="+ Add contact" onPress={addContact} />

        <TextField
          label="Check in after (minutes)"
          keyboardType="number-pad"
          value={String(autoCheckinMinutes)}
          onChangeText={(v) => setAutoCheckinMinutes(Number(v) || 0)}
        />

        <View className="gap-2 rounded-xl bg-teal-50 p-3">
          <Text className="text-xs text-ink-700 dark:text-ink-200">
            {contacts.length > 0 ? contacts.map((c) => c.name).join(", ") : "Your trusted contact"} will get{" "}
            {meetingWith || "their"} name, the location, and time by text.
            {checkinAt ? ` We'll ask if you're okay at ${format(checkinAt, "h:mm a")}.` : ""} If you don&apos;t
            respond, we&apos;ll follow up. (SMS delivery is stubbed for now — no message is actually sent yet.)
          </Text>
        </View>

        <View className="mt-2">
          <Button
            label={createPlan.isPending ? "Sharing..." : "Share plans"}
            disabled={createPlan.isPending || !meetingAtValid || contacts.length === 0}
            onPress={onSubmit}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
