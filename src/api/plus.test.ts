import { hasPlus, type MySubscription } from "./plus";

jest.mock("@/api/client", () => ({ supabase: {} }));

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

function sub(overrides: Partial<MySubscription>): MySubscription {
  return { tier: "plus", status: "active", currentPeriodEnd: future, ...overrides };
}

describe("hasPlus", () => {
  it("is false while loading and on the free tier", () => {
    expect(hasPlus(undefined)).toBe(false);
    expect(hasPlus(sub({ tier: "free", currentPeriodEnd: null }))).toBe(false);
  });

  it("counts plus and business_circle within the paid period", () => {
    expect(hasPlus(sub({}))).toBe(true);
    expect(hasPlus(sub({ tier: "business_circle" }))).toBe(true);
    expect(hasPlus(sub({ currentPeriodEnd: null }))).toBe(true);
  });

  it("keeps access during a billing issue, but not after the period ends or once canceled", () => {
    expect(hasPlus(sub({ status: "past_due" }))).toBe(true);
    expect(hasPlus(sub({ currentPeriodEnd: past }))).toBe(false);
    expect(hasPlus(sub({ status: "canceled" }))).toBe(false);
  });
});
