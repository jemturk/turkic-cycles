import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";

import { registerPushToken } from "@/api/pushTokens";
import { markMessageDelivered } from "@/api/chat";

// Foreground presentation: a message notification should still show as a banner
// even while the app is open (the in-thread screen itself is what suppresses this
// naturally on native, since the OS already knows that screen is focused -- there's
// no extra check needed here for that case).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type MessagePushData = { type?: string; matchId?: string; messageId?: string };

// Web has no Expo push support at all (Expo's push service targets native APNs/
// FCM, not the separate Web Push API) and Expo Go can't register for push either
// (Android has required a dev/production build for this since SDK 53) -- both are
// silent no-ops here rather than an error, since neither is a broken state.
export function usePushNotifications(userId: string | undefined) {
  const registeredForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || Platform.OS === "web" || registeredForRef.current === userId) return;
    registeredForRef.current = userId;

    (async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      const status =
        existingStatus === "granted" ? existingStatus : (await Notifications.requestPermissionsAsync()).status;
      if (status !== "granted") return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      await registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
    })().catch((error) => {
      console.error("Push registration failed", error);
    });
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as MessagePushData;
      if (data?.type === "message" && data.messageId) {
        markMessageDelivered(data.messageId).catch(() => {});
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as MessagePushData;
      if (data?.type === "message" && data.matchId) {
        router.push(`/(app)/chat/${data.matchId}`);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);
}
