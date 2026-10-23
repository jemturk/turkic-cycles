import { containsEmail, containsPhoneNumber } from "./contactInfo";

describe("containsPhoneNumber", () => {
  it.each([
    "call me 555-123-4567",
    "+1 (919) 555-0142",
    "my number is 0532 123 45 67",
    "+905321234567",
    "555.123.4567",
    "text 9195550142 later",
  ])("finds a number in %p", (text) => {
    expect(containsPhoneNumber(text)).toBe(true);
  });

  it.each([
    "See you at 7:45 PM",
    "The celebration is on 2026-10-29",
    "Meet on 17.10.2026 at the café",
    "Back on 10/17/26",
    "Room 123, around 5",
    "I was born in 1990 and moved in 2015",
    "",
  ])("ignores %p", (text) => {
    expect(containsPhoneNumber(text)).toBe(false);
  });
});

describe("containsEmail", () => {
  it("finds an email address", () => {
    expect(containsEmail("write to aigerim@example.com")).toBe(true);
  });

  it("ignores an @handle or a lone @", () => {
    expect(containsEmail("I'm @aigerim on there")).toBe(false);
    expect(containsEmail("meet @ 5")).toBe(false);
  });
});
