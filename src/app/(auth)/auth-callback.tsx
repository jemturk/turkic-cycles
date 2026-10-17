import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";

import { useSession } from "@/hooks/useSession";

// Where Google sign-in's browser returns to (turek://auth-callback). On Android the
// return link also opens this screen, while signInWithGoogle (src/api/socialAuth.ts)
// is still turning its tokens into a session -- so this waits for the session
// before handing over to the root gate, which then picks onboarding or the app.
// Gives up after a few seconds (a cancelled or failed sign-in) and goes back.
export default function AuthCallback() {
  const { session } = useSession();

  useEffect(() => {
    if (session) {
      router.replace("/");
      return;
    }
    const timeout = setTimeout(() => router.replace("/"), 5000);
    return () => clearTimeout(timeout);
  }, [session]);

  return (
    <View className="flex-1 items-center justify-center bg-primary-50 dark:bg-ink-950">
      <ActivityIndicator color="#127A87" />
    </View>
  );
}
