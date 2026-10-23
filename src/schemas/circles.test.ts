import { circleFormSchema, combineDateTime, eventFormSchema } from "./circles";

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("combineDateTime", () => {
  it("builds a local date-time", () => {
    const d = combineDateTime("2030-03-15", "19:30")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2030, 2, 15, 19, 30]);
  });

  it("rejects dates and times that don't exist", () => {
    expect(combineDateTime("2030-02-30", "10:00")).toBeNull();
    expect(combineDateTime("2030-13-01", "10:00")).toBeNull();
    expect(combineDateTime("2030-03-15", "24:00")).toBeNull();
    expect(combineDateTime("2030-03-15", "10:60")).toBeNull();
    expect(combineDateTime("", "")).toBeNull();
  });
});

describe("eventFormSchema", () => {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const valid = { title: "Picnic", description: "", location: "Lake Park, Apex", date: isoDate(nextYear), time: "12:00" };

  it("accepts a future event", () => {
    expect(eventFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an event in the past", () => {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const result = eventFormSchema.safeParse({ ...valid, date: isoDate(lastYear) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["date"]);
  });

  it("needs a title and a location", () => {
    expect(eventFormSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(eventFormSchema.safeParse({ ...valid, location: "" }).success).toBe(false);
  });
});

describe("circleFormSchema", () => {
  const valid = { name: "Apex Families", description: "", topic: "family", city: "Apex", state: "NC", country: "United States" };

  it("accepts a valid circle", () => {
    expect(circleFormSchema.safeParse(valid).success).toBe(true);
  });

  it("needs a topic from the list", () => {
    expect(circleFormSchema.safeParse({ ...valid, topic: "sports" }).success).toBe(false);
  });

  it("applies the same state rule as profiles (US needs a listed state)", () => {
    expect(circleFormSchema.safeParse({ ...valid, state: "" }).success).toBe(false);
    expect(circleFormSchema.safeParse({ ...valid, country: "Türkiye", state: "" }).success).toBe(true);
  });
});
