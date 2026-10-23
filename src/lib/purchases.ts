// Web (and tests): no in-app purchases -- Plus shows the waitlist instead. The
// native implementation lives in purchases.native.ts; both export the same API,
// and this file's types are the ones TypeScript checks against.

export type PlusPackage = {
  id: string;
  title: string;
  priceString: string;
  period: "monthly" | "annual" | "other";
};

export type PurchaseOutcome = "purchased" | "cancelled";

// false = sell nothing here; the Plus screen offers the waitlist.
export const purchasesAvailable: boolean = false;

export async function getPlusPackages(_userId: string): Promise<PlusPackage[]> {
  return [];
}

export async function purchasePlusPackage(_userId: string, _packageId: string): Promise<PurchaseOutcome> {
  throw new Error("In-app purchases aren't available on this platform.");
}

export async function restorePurchases(_userId: string): Promise<void> {
  throw new Error("In-app purchases aren't available on this platform.");
}
