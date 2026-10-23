import { differenceInCalendarDays, isSameYear } from "date-fns";

// The label on a chat's day divider: Today, Yesterday, the weekday within the last
// week, then the date (with the year once it isn't this year), in the app's language.
export function dayLabel(
  date: Date,
  now: Date,
  locale: string,
  words: { today: string; yesterday: string }
): string {
  const daysAgo = differenceInCalendarDays(now, date);
  if (daysAgo <= 0) return words.today;
  if (daysAgo === 1) return words.yesterday;
  if (daysAgo < 7) return date.toLocaleDateString(locale, { weekday: "long" });
  if (isSameYear(date, now)) return date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}
