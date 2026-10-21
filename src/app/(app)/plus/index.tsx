import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import {
  useHasPlus,
  useMySubscription,
  usePlusPackages,
  usePlusWaitlist,
  usePurchasePlus,
  useRestorePurchases,
  useSetPlusWaitlist,
} from "@/hooks/usePlus";
import { purchasesAvailable, type PlusPackage } from "@/lib/purchases";
import { Button } from "@/components/Button";
import { showAlert } from "@/lib/alert";

const MANAGE_SUBSCRIPTIONS_URL = Platform.select({
  ios: "https://apps.apple.com/account/subscriptions",
  default: "https://play.google.com/store/account/subscriptions",
});

function Benefit({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body?: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-ink-700">
        <Ionicons name={icon} size={22} color="#127A87" />
      </View>
      <View className="flex-1">
        <Text className="font-display text-base text-ink-900 dark:text-ink-50">{title}</Text>
        {body ? <Text className="text-xs text-ink-400 dark:text-ink-300">{body}</Text> : null}
      </View>
    </View>
  );
}

export default function Plus() {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: subscription } = useMySubscription(userId);
  const subscribed = useHasPlus(userId);
  const { data: onWaitlist } = usePlusWaitlist(userId);
  const setWaitlist = useSetPlusWaitlist(userId);
  const { data: packages, isLoading: packagesLoading } = usePlusPackages(userId);
  const purchase = usePurchasePlus(userId);
  const restore = useRestorePurchases(userId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Nothing to sell (no store, or no offering set up in RevenueCat yet) = waitlist.
  const selling = purchasesAvailable && (packagesLoading || (packages?.length ?? 0) > 0);
  const selected = packages?.find((p) => p.id === selectedId) ?? packages?.[0];
  const busy = purchase.isPending || restore.isPending;

  function priceLabel(pkg: PlusPackage) {
    if (pkg.period === "monthly") return t("plus.perMonth", { price: pkg.priceString });
    if (pkg.period === "annual") return t("plus.perYear", { price: pkg.priceString });
    return `${pkg.title} · ${pkg.priceString}`;
  }

  function buy() {
    if (!selected) return;
    purchase.mutate(selected.id, {
      onSuccess: (outcome) => {
        if (outcome === "purchased") showAlert(t("plus.welcomeTitle"), t("plus.welcomeBody"));
      },
      onError: (error) => showAlert(t("plus.purchaseErrorTitle"), error.message),
    });
  }

  function restoreAll() {
    restore.mutate(undefined, {
      onSuccess: (restored) => showAlert(restored ? t("plus.restored") : t("plus.nothingToRestore")),
      onError: (error) => showAlert(t("plus.purchaseErrorTitle"), error.message),
    });
  }

  function toggleWaitlist(join: boolean) {
    setWaitlist.mutate(join, {
      onError: (error) => showAlert(t("plus.waitlistErrorTitle"), error.message),
    });
  }

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(i18n.language)
    : null;

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()} accessibilityLabel={t("common.back")}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-ink-800">
            <Ionicons name="sparkles" size={32} color="#127A87" />
          </View>
          <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{t("plus.title")}</Text>
          <Text className="text-center text-sm text-ink-700 dark:text-ink-200">{t("plus.subheading")}</Text>
        </View>

        <View className="gap-4 rounded-2xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
          <Benefit icon="heart" title={t("plus.seeLikes")} body={t("plus.seeLikesBody")} />
          <Text className="mt-1 text-xs font-medium uppercase text-ink-400 dark:text-ink-300">{t("plus.comingSoon")}</Text>
          <Benefit icon="globe-outline" title={t("plus.worldwide")} />
          <Benefit icon="options-outline" title={t("plus.filters")} />
          <Benefit icon="infinite-outline" title={t("plus.moreLikes")} />
        </View>

        {subscribed ? (
          <View className="gap-2 rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">{t("plus.active")}</Text>
            {subscription?.status === "past_due" ? (
              <Text className="text-sm text-accent-600">{t("plus.billingIssue")}</Text>
            ) : periodEnd ? (
              <Text className="text-sm text-ink-700 dark:text-ink-200">{t("plus.renewsOn", { date: periodEnd })}</Text>
            ) : null}
            {purchasesAvailable ? (
              <Pressable onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)}>
                <Text className="text-sm font-medium text-primary-500">{t("plus.manage")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : selling ? (
          <>
            <View className="gap-2">
              {(packages ?? []).map((pkg) => {
                const isSelected = pkg.id === selected?.id;
                return (
                  <Pressable
                    key={pkg.id}
                    onPress={() => setSelectedId(pkg.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    className={`flex-row items-center justify-between rounded-xl border bg-white dark:bg-ink-800 px-4 py-3 ${
                      isSelected ? "border-primary-500" : "border-primary-100 dark:border-ink-700"
                    }`}
                  >
                    <Text className="text-base text-ink-900 dark:text-ink-50">{priceLabel(pkg)}</Text>
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#127A87" : "#A99C95"}
                    />
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={purchase.isPending ? t("common.loading") : t("plus.subscribe")}
              disabled={busy || !selected}
              onPress={buy}
            />
            <Pressable onPress={restoreAll} disabled={busy}>
              <Text className="text-center text-sm font-medium text-primary-500">
                {restore.isPending ? t("common.loading") : t("plus.restore")}
              </Text>
            </Pressable>
            <Text className="text-center text-xs text-ink-400 dark:text-ink-300">{t("plus.autoRenewNote")}</Text>
          </>
        ) : onWaitlist ? (
          <View className="gap-2 rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">{t("plus.joined")}</Text>
            <Text className="text-sm text-ink-700 dark:text-ink-200">{t("plus.joinedBody")}</Text>
            <Pressable onPress={() => toggleWaitlist(false)} disabled={setWaitlist.isPending}>
              <Text className="text-sm font-medium text-primary-500">{t("plus.leaveWaitlist")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text className="text-center text-sm text-ink-700 dark:text-ink-200">{t("plus.waitlistBody")}</Text>
            <Button
              label={setWaitlist.isPending ? t("common.loading") : t("plus.joinWaitlist")}
              disabled={setWaitlist.isPending || onWaitlist === undefined}
              onPress={() => toggleWaitlist(true)}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
