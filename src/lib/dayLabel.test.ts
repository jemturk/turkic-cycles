import { dayLabel } from "./dayLabel";

const words = { today: "Today", yesterday: "Yesterday" };
const now = new Date(2026, 9, 19, 9, 30); // Mon, Oct 19 2026

describe("dayLabel", () => {
  it("says Today and Yesterday by calendar day, not 24 hours", () => {
    expect(dayLabel(new Date(2026, 9, 19, 0, 5), now, "en-US", words)).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 18, 23, 59), now, "en-US", words)).toBe("Yesterday");
  });

  it("uses the weekday within the last week", () => {
    expect(dayLabel(new Date(2026, 9, 14, 12), now, "en-US", words)).toBe("Wednesday");
  });

  it("uses the date after a week, adding the year only for earlier years", () => {
    expect(dayLabel(new Date(2026, 9, 12, 12), now, "en-US", words)).toBe("Mon, Oct 12");
    expect(dayLabel(new Date(2025, 9, 12, 12), now, "en-US", words)).toBe("Oct 12, 2025");
  });

  it("formats in the app's language", () => {
    expect(dayLabel(new Date(2026, 9, 14, 12), now, "tr", words)).toBe("Çarşamba");
  });
});
