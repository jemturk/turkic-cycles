// First, so errors anywhere after this are reported.
import { Sentry, identifySentryUser } from "@/lib/sentry";
import "@/theme/global.css";
import "@/theme/icons";
import { useEffect, useState } from "react";
import { LogBox, Platform } from "react-native";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useColorScheme } from "nativewind";
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
import { TextScaleProvider } from "@/hooks/useTextScale";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { AppFrame } from "@/components/AppFrame";
import { DialogHost } from "@/components/DialogHost";
import { persistOptions, queryClient } from "@/lib/queryClient";

SplashScreen.preventAutoHideAsync();

// NativeWind's runtime (react-native-css-interop 0.2.7, current with nativewind 4.2.7)
// registers React Native's ImageBackground on start-up, which trips React Native 0.88's
// deprecation notice although the app never uses ImageBackground. Remove once NativeWind
// stops touching it.
LogBox.ignoreLogs(["ImageBackground is deprecated"]);

// Applies the account's saved light/dark preference (Settings > Dark mode) to
// NativeWind's color scheme, the OS status bar icon color, and (on web) the
// browser-chrome theme-color meta tag. Lives inside PersistQueryClientProvider since
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
const SUPPORTED_LOCALES = ["en", "tr", "ru", "de"];

function LocaleSync() {
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const savedLocale = profile?.app_locale;
  const locale = savedLocale && SUPPORTED_LOCALES.includes(savedLocale) ? savedLocale : "en";

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale]);

  return null;
}

// Applies the account's saved text size (Settings > Text size) via plain React
// Context, consumed by src/components/Text.tsx -- every screen in this app imports
// Text from there instead of "react-native" directly, specifically so this
// propagates through ordinary React re-renders. An earlier version of this tried
// scaling NativeWind's own "rem" unit instead, which would have needed no
// per-component changes at all -- confirmed on real Android hardware (twice) that
// already-mounted, and even freshly remounted, native Text components don't
// actually pick up a changed rem value, matching what that API's own docs already
// said (a source-level read of the runtime wasn't enough to safely rule out).
// "default" is deliberately no longer an exact 1.0/no-op -- feedback was that even
// the untouched baseline read too small, not just "small" and "large" relative to
// it, so the whole range shifted up rather than just widening the gaps.
const TEXT_SIZE_MULTIPLIER: Record<string, number> = { small: 0.95, default: 1.1, large: 1.3 };
// Text's sizes start from a 16px base on web but 14px in the app, so on web the same
// setting read ~14% larger. Scaling web by 14/16 makes each setting match the app.
const WEB_TEXT_SCALE = Platform.OS === "web" ? 14 / 16 : 1;

function TextSizeSync({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const textSize = profile?.text_size ?? "default";

  return <TextScaleProvider scale={(TEXT_SIZE_MULTIPLIER[textSize] ?? 1) * WEB_TEXT_SCALE}>{children}</TextScaleProvider>;
}

// Tells Sentry which account an error came from (its id only).
function SentryUserSync() {
  const { session } = useSession();
  const userId = session?.user.id;
  useEffect(() => identifySentryUser(userId), [userId]);
  return null;
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

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
        {/* Powers KeyboardAwareScrollView (FormScrollView) -- keeps the focused
            field above the keyboard, which plain ScrollViews didn't do. */}
        <KeyboardProvider>
          {/* Chats and your profile are saved to the device and shown at once on the
              next open, even offline (lib/queryClient.ts); sends left waiting there
              go out once the save is read back. */}
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={persistOptions}
            onSuccess={() => queryClient.resumePausedMutations()}
          >
            <ThemeSync />
            <SentryUserSync />
            <LocaleSync />
            <TextSizeSync>
              {/* Phone-width column on web, framed beside a brand panel on desktop;
                  the full screen on native. */}
              <AppFrame>
                <Slot />
                {/* Plays once the native (static-image) splash hands off to JS --
                    gives the logo mark its own animated "assembly" moment instead
                    of cutting straight to the app. */}
                {showAnimatedSplash && (
                  <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} />
                )}
              </AppFrame>
              {/* Alerts and confirms (lib/alert.ts), over everything. */}
              <DialogHost />
            </TextSizeSync>
          </PersistQueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap catches errors React rendering throws, and reports them.
export default Sentry.wrap(RootLayout);
