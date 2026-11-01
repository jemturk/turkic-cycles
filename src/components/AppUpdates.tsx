import { useEffect } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";
import * as Application from "expo-application";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { getMinBuild } from "@/api/appVersion";

// Keeping installed apps current, on the phone only (the website is always current):
// - RequiredUpdate: below the minimum build for this platform (app_min_builds,
//   migration 0068), a full-screen "Update required" covers the app. Offline or on
//   any error the app opens as usual; a check that can't run never locks anyone out.
// - Android: when Play has a newer version, Google's own flexible-update prompt, once
//   per version; it downloads in the background and restarts into the new one.

const NATIVE = Platform.OS === "ios" || Platform.OS === "android";
// Expo Go doesn't include the native module, and importing the library there throws;
// load it only when present (the "Update required" screen then opens the store itself).
const InAppUpdates: typeof import("expo-in-app-updates") | null = requireOptionalNativeModule("ExpoInAppUpdates")
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional: a static import throws in Expo Go
    require("expo-in-app-updates")
  : null;
const BUILD = Number(Application.nativeBuildVersion ?? 0);
const STORE_URL = Platform.select({
  ios: "itms-apps://apps.apple.com/app/id6828226383",
  default: "market://details?id=com.turek.app",
});
// The Play versionCode last offered, so declining isn't asked again until the next one.
const OFFERED_KEY = "appUpdate.offeredVersion";

async function openStore() {
  try {
    // Android: Play's immediate update, inside the app. iOS: the App Store sheet.
    if (InAppUpdates && (await InAppUpdates.startUpdate(true))) return;
  } catch {
    // Fall through to the store app.
  }
  Linking.openURL(STORE_URL).catch(() => {});
}

function RequiredUpdate() {
  const { t } = useTranslation();
  const { data: minBuild } = useQuery({
    queryKey: ["appMinBuild", Platform.OS],
    queryFn: () => getMinBuild(Platform.OS as "ios" | "android"),
    enabled: NATIVE && BUILD > 0,
    staleTime: 60 * 60 * 1000,
  });
  if (!minBuild || BUILD >= minBuild) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      className="items-center justify-center gap-5 bg-primary-50 px-8 dark:bg-ink-950"
    >
      <View className="h-20 w-20 items-center justify-center rounded-full bg-white dark:bg-ink-800">
        <Ionicons name="arrow-up-circle-outline" size={40} color="#127A87" />
      </View>
      <Text className="text-center font-display text-2xl text-ink-900 dark:text-ink-50">
        {t("appUpdate.requiredTitle")}
      </Text>
      <Text className="text-center text-base text-ink-700 dark:text-ink-200">{t("appUpdate.requiredBody")}</Text>
      <Button label={t("appUpdate.update")} onPress={openStore} />
    </View>
  );
}

function useFlexibleUpdate() {
  useEffect(() => {
    if (Platform.OS !== "android" || __DEV__ || !InAppUpdates) return;
    const updates = InAppUpdates;
    (async () => {
      const info = await updates.checkForUpdate();
      if (!info.updateAvailable || !info.flexibleAllowed || !info.storeVersion) return;
      if ((await AsyncStorage.getItem(OFFERED_KEY)) === info.storeVersion) return;
      await AsyncStorage.setItem(OFFERED_KEY, info.storeVersion);
      await updates.startUpdate(false);
    })().catch(() => {});
  }, []);
}

export function AppUpdates() {
  useFlexibleUpdate();
  return NATIVE ? <RequiredUpdate /> : null;
}
