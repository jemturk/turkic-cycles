import de from "@/i18n/locales/de.json";
import en from "@/i18n/locales/en.json";
import ru from "@/i18n/locales/ru.json";
import tr from "@/i18n/locales/tr.json";

import { EXPERTISE, GOALS, INDUSTRIES, INTEREST_GROUPS, INTERESTS, SELECTION_LIMITS } from "./matching";

const locales = { en, tr, de, ru };

const lists: [string, readonly string[]][] = [
  ["interests", INTERESTS],
  ["interestGroups", INTEREST_GROUPS.map((group) => group.id)],
  ["goals", Object.values(GOALS).flat()],
  ["industries", INDUSTRIES],
  ["expertise", EXPERTISE],
];

describe("matching tag lists", () => {
  it.each(Object.entries(locales))("has a label for every tag in %s", (_, locale) => {
    const constants = locale.constants as unknown as Record<string, Record<string, string> | undefined>;
    for (const [list, ids] of lists) {
      const missing = ids.filter((id) => !constants[list]?.[id]);
      expect({ list, missing }).toEqual({ list, missing: [] });
    }
  });

  it("never repeats an ID within a list", () => {
    for (const [, ids] of lists) expect(new Set(ids).size).toBe(ids.length);
  });

  it("matches the spec's list sizes", () => {
    expect(INTERESTS).toHaveLength(42);
    expect(Object.values(GOALS).flat()).toHaveLength(30);
    expect(INDUSTRIES).toHaveLength(20);
    expect(EXPERTISE).toHaveLength(27);
    expect(SELECTION_LIMITS.interests).toEqual({ min: 3, max: 10 });
  });
});
