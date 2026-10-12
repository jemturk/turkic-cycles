import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import Purchases, { PACKAGE_TYPE, PURCHASES_ERROR_CODE, type PurchasesPackage } from "react-native-purchases";

import type { PlusPackage, PurchaseOutcome } from "./purchases";

export type { PlusPackage, PurchaseOutcome } from "./purchases";

// RevenueCat's public SDK keys (appl_... / goog_...) -- public by design, like the
// Supabase publishable key. Unset = Plus isn't on sale yet and the app shows the
// waitlist. Expo Go can't make real purchases (RevenueCat only mocks them there),
// so it gets the waitlist too.
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

export const purchasesAvailable: boolean =
  !!apiKey && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// RevenueCat's user id is the Supabase user id, so the webhook knows whose
// subscriptions row to update (supabase/functions/_shared/revenuecat.ts).
let configuredFor: string | null = null;

async function ready(userId: string) {
  if (!purchasesAvailable || !apiKey) throw new Error("In-app purchases aren't available.");
  if (configuredFor === null) {
    Purchases.configure({ apiKey, appUserID: userId });
  } else if (configuredFor !== userId) {
    await Purchases.logIn(userId);
  }
  configuredFor = userId;
}

// The packages from the last fetch, so a purchase can be made by id.
const packagesById = new Map<string, PurchasesPackage>();

function periodOf(pkg: PurchasesPackage): PlusPackage["period"] {
  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return "monthly";
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return "annual";
  return "other";
}

// The "current" offering from the RevenueCat dashboard -- prices and plans change
// there without an app update.
export async function getPlusPackages(userId: string): Promise<PlusPackage[]> {
  await ready(userId);
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  packagesById.clear();
  for (const pkg of packages) packagesById.set(pkg.identifier, pkg);
  return packages.map((pkg) => ({
    id: pkg.identifier,
    title: pkg.product.title,
    priceString: pkg.product.priceString,
    period: periodOf(pkg),
  }));
}

export async function purchasePlusPackage(userId: string, packageId: string): Promise<PurchaseOutcome> {
  await ready(userId);
  const pkg = packagesById.get(packageId);
  if (!pkg) throw new Error(`Unknown package ${packageId}`);
  try {
    await Purchases.purchasePackage(pkg);
    return "purchased";
  } catch (error) {
    if ((error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return "cancelled";
    throw error;
  }
}

export async function restorePurchases(userId: string): Promise<void> {
  await ready(userId);
  await Purchases.restorePurchases();
}
