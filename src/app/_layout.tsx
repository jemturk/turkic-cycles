import "@/theme/global.css";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // web.output is "single" (SPA), so +html.tsx root-document customization never
    // applies -- Expo always serves its own fixed template regardless. Set
    // theme-color here instead: without it, some mobile browsers tint their own
    // chrome (address bar, the strip behind the home indicator) by sampling the
    // page's body background, which is the neutral desktop-framing color from
    // global.css, not this screen's own white/coral tones.
    if (Platform.OS !== "web") return;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "#ffffff");
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Constrains the app to a phone-width column on wide (web/desktop)
              viewports, framed against the neutral backdrop set in global.css.
              A no-op on native/mobile-web, where the viewport is already
              narrower than max-w-[480px]. */}
          <View className="mx-auto w-full max-w-[480px] flex-1 bg-coral-50 web:shadow-2xl">
            <Slot />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
