import * as SMS from "expo-sms";

import { checkInTime, planContacts, planMessage, textContacts } from "./safetyAlerts";
import type { Tables } from "@/types/database";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("expo-sms", () => ({
  isAvailableAsync: jest.fn(),
  sendSMSAsync: jest.fn(),
}));

const plan = {
  id: "plan-1",
  user_id: "me",
  meeting_with: "Aylin",
  location: "Salem St Cafe",
  meeting_at: "2026-11-09T18:30:00",
  auto_checkin_minutes: 120,
  trusted_contacts: [
    { name: "Mom", phone: "+1 555 0100" },
    { name: "No phone", phone: "  " },
  ],
  checked_in_at: null,
  status: "active",
  created_at: "2026-11-01T00:00:00",
} as unknown as Tables<"safety_plans">;

// Echoes the key and the values it was given, so the test sees what went in.
const t = ((key: string, values: Record<string, unknown>) => `${key} ${JSON.stringify(values)}`) as never;

describe("safetyAlerts", () => {
  it("puts the check-in time the chosen minutes after the meeting", () => {
    expect(checkInTime(plan).getTime()).toBe(new Date("2026-11-09T20:30:00").getTime());
  });

  it("writes who, where, when and the check-in time into the plan text", () => {
    const text = planMessage(t, plan, "Jem");
    expect(text).toContain('"name":"Jem"');
    expect(text).toContain('"meetingWith":"Aylin"');
    expect(text).toContain('"location":"Salem St Cafe"');
    expect(text).toContain('"checkIn":"8:30 PM"');
  });

  it("texts only the contacts that have a phone number", async () => {
    (SMS.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (SMS.sendSMSAsync as jest.Mock).mockResolvedValue({ result: "sent" });
    expect(await textContacts(planContacts(plan), "hello")).toBe("sent");
    expect(SMS.sendSMSAsync).toHaveBeenCalledWith(["+1 555 0100"], "hello");
  });

  it("does nothing when no contact has a phone number", async () => {
    (SMS.sendSMSAsync as jest.Mock).mockClear();
    expect(await textContacts([{ name: "No phone", phone: "" }], "hello")).toBe("no-phones");
    expect(SMS.sendSMSAsync).not.toHaveBeenCalled();
  });
});
