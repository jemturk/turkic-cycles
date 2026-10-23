import { z } from "zod";

import { CIRCLE_TOPICS } from "@/constants/circles";
import { requireRegionForCountry } from "@/schemas/questionnaire/core";

// New circle (admins only): same location rules as a profile -- country first, and
// a state from the list for the US, Canada and Australia.
export const circleFormSchema = z
  .object({
    name: z.string().trim().min(3, "Give the circle a name (at least 3 characters)").max(80, "Keep the name under 80 characters"),
    description: z.string().trim().max(500, "Keep the description under 500 characters"),
    topic: z.enum(CIRCLE_TOPICS, "Pick a topic"),
    city: z.string().trim().min(1, "Enter a city"),
    state: z.string(),
    country: z.string().min(1, "Select a country"),
  })
  .superRefine(requireRegionForCountry);
export type CircleFormValues = z.infer<typeof circleFormSchema>;

// "2026-10-15" + "19:30" as a moment in the device's time zone, or null if either
// part isn't a real date/time (e.g. 2026-02-30 or 25:00).
export function combineDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const [y, m, d] = dateMatch.slice(1).map(Number);
  const [h, min] = timeMatch.slice(1).map(Number);
  if (h > 23 || min > 59) return null;
  const result = new Date(y, m - 1, d, h, min);
  // Date rolls overflow over (Feb 30 -> Mar 2); a mismatch means it wasn't real.
  if (result.getFullYear() !== y || result.getMonth() !== m - 1 || result.getDate() !== d) return null;
  return result;
}

// New event (a circle's owners/moderators, or admins): starts in the future.
export const eventFormSchema = z
  .object({
    title: z.string().trim().min(3, "Give the event a title (at least 3 characters)").max(100, "Keep the title under 100 characters"),
    description: z.string().trim().max(1000, "Keep the description under 1000 characters"),
    location: z.string().trim().min(3, "Where is it happening?"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time"),
  })
  .superRefine((values, ctx) => {
    const startsAt = combineDateTime(values.date, values.time);
    if (!startsAt) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Enter a valid date and time" });
    } else if (startsAt.getTime() <= Date.now()) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Pick a date and time in the future" });
    }
  });
export type EventFormValues = z.infer<typeof eventFormSchema>;
