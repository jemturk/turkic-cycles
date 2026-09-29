import "@/theme/global.css";
import "@/theme/icons";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { rem, useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import i18n from "@/i18n";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Applies the account's saved light/dark preference (Settings > Dark mode) to
// NativeWind's color scheme, the OS status bar icon color, and (on web) the
// browser-chrome theme-color meta tag. Lives inside QueryClientProvider since
// useMyProfile needs that context; renders only the StatusBar config, nothing visual.
function ThemeSync() {
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const { setColorScheme } = useColorScheme();
  const isDark = profile?.theme_preference === "dark";

  useEffect(() => {
    setColorScheme(isDark ? "dark" : "light");
    // NativeWind's own setColorScheme is unreliable on web specifically (confirmed by
    // testing: it can silently fail to add/remove the "dark" class it otherwise reads
    // correctly at CSS-generation time -- the exact class of bug tailwind.config.js
    // already flags in its darkMode comment). Toggling the class directly here is a
    // known-working fallback; harmless to also call setColorScheme above for native.
    if (Platform.OS === "web") {
      document.documentElement.classList.toggle("dark", isDark);
    }
    // setColorScheme's identity changes on every render (useColorScheme() returns a
    // new object each time) -- including it here would re-run this effect every
    // render and infinite-loop, since calling it triggers a re-render itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  useEffect(() => {
    // web.output is "single" (SPA), so +html.tsx root-document customization never
    // applies -- Expo always serves its own fixed template regardless. Set
    // theme-color here instead: without it, some mobile browsers tint their own
    // chrome (address bar, the strip behind the home indicator) by sampling the
    // page's body background, which would otherwise stay the light-mode color.
    if (Platform.OS !== "web") return;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", isDark ? "#171310" : "#ffffff");
  }, [isDark]);

  return <StatusBar style={isDark ? "light" : "dark"} />;
}

// Applies the account's saved app language (Settings > App language) to i18next.
function LocaleSync() {
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const locale = profile?.app_locale === "tr" ? "tr" : "en";

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale]);

  return null;
}

// NativeWind's "rem" unit backs every Tailwind text-size utility (text-sm, text-base,
// etc. are all defined in rem by Tailwind's own default scale, unmodified in this
// project's tailwind.config.js) -- so scaling this one runtime value scales every
// screen's text together, with no per-component changes needed anywhere else.
// "default" reproduces each platform's own untouched baseline exactly (14 native /
// 16 web -- NativeWind and the web <html> default disagree with each other, a
// pre-existing quirk unrelated to this feature), so picking "Default" is a no-op
// for anyone who never touches this setting.
const REM_BASE = Platform.OS === "web" ? 16 : 14;
const TEXT_SIZE_MULTIPLIER: Record<string, number> = { small: 0.85, default: 1, large: 1.15 };

// Wraps (rather than sits beside) the app content, and remounts it by key when
// textSize changes. Confirmed on-device: NativeWind's rem observable *does* update
// correctly on Android (the Settings chips, which read the very same profile query,
// select/deselect live) -- but already-mounted native Text components don't
// reliably re-render just from that observable changing, a real gap this session's
// on-device testing found that neither the docs nor a source read predicted. A full
// remount sidesteps it: every Text in the fresh tree computes its size from
// scratch, so it's correct regardless of whether the reactive path works.
function TextSizeSync({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const textSize = profile?.text_size ?? "default";

  // Set synchronously during render, not in an effect -- an effect runs after the
  // fresh (remounted) tree's first render, which would then be computed from the
  // *old* rem value, the exact failure mode being worked around here. rem.set is
  // idempotent, so calling it on every render of this rarely-rendering component
  // is harmless.
  rem.set(REM_BASE * (TEXT_SIZE_MULTIPLIER[textSize] ?? 1));

  return (
    <View key={textSize} style={{ flex: 1 }}>
      {children}
    </View>
  );
}

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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeSync />
          <LocaleSync />
          <TextSizeSync>
            {/* Constrains the app to a phone-width column on wide (web/desktop)
                viewports, framed against the neutral backdrop set in global.css.
                A no-op on native/mobile-web, where the viewport is already
                narrower than max-w-[480px]. */}
            <View className="mx-auto w-full max-w-[480px] flex-1 bg-coral-50 dark:bg-ink-950 web:shadow-2xl">
              <Slot />
            </View>
          </TextSizeSync>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
