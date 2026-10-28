import { FAITH_CONSENT_KEY, ORIENTATION_CONSENT_KEY, sensitiveConsents } from "./sensitiveConsent";

const romantic = { gender: "woman", interestedIn: ["men"], consentSensitive: true };

describe("sensitiveConsents", () => {
  it("records consent for Romantic and for a faith answer of 1-5", () => {
    const result = sensitiveConsents({ romantic, values: { faith: 4, consentFaith: true } }, ["romantic"]);
    expect(result.granted).toEqual([ORIENTATION_CONSENT_KEY, FAITH_CONSENT_KEY]);
    expect(result.revoked).toEqual([]);
    expect(result.saved.romantic).toEqual(romantic);
  });

  it("deletes Romantic answers and withdraws consent when Romantic is removed", () => {
    const result = sensitiveConsents({ romantic, friend: { goals: [] } }, ["friend"]);
    expect(result.saved).not.toHaveProperty("romantic");
    expect(result.saved.friend).toEqual({ goals: [] });
    expect(result.revoked).toEqual([ORIENTATION_CONSENT_KEY]);
  });

  it("drops the faith tick and withdraws when faith becomes prefer not to say", () => {
    const result = sensitiveConsents({ values: { faith: 0, social: 3, consentFaith: true } }, ["friend"]);
    expect(result.saved.values).toEqual({ faith: 0, social: 3 });
    expect(result.revoked).toEqual([FAITH_CONSENT_KEY]);
    expect(result.granted).toEqual([]);
  });

  it("records nothing once a withdrawal has been saved", () => {
    const result = sensitiveConsents({ values: { faith: 0, social: 3 } }, ["friend"]);
    expect(result.granted).toEqual([]);
    expect(result.revoked).toEqual([]);
  });
});
