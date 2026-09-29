import { useRef, useState, type ComponentType } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/Button";
import { AppMark } from "@/components/AppMark";

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: "coral" | "teal";
  titleKey: string;
  bodyKey: string;
  // Which illustrative screen preview to show instead of the plain icon --
  // undefined for the brand-intro slide, which has no specific screen to preview.
  mockup?: "circles" | "discover" | "safety";
};

const SLIDES: Slide[] = [
  { icon: "infinite-outline", tint: "coral", titleKey: "welcome.slide1Title", bodyKey: "welcome.slide1Body" },
  {
    icon: "sparkles-outline",
    tint: "teal",
    titleKey: "welcome.slide2Title",
    bodyKey: "welcome.slide2Body",
    mockup: "circles",
  },
  {
    icon: "heart-outline",
    tint: "coral",
    titleKey: "welcome.slide3Title",
    bodyKey: "welcome.slide3Body",
    mockup: "discover",
  },
  {
    icon: "shield-checkmark-outline",
    tint: "teal",
    titleKey: "welcome.slide4Title",
    bodyKey: "welcome.slide4Body",
    mockup: "safety",
  },
];

const TINT_BG: Record<Slide["tint"], string> = {
  coral: "bg-coral-500",
  teal: "bg-teal-500",
};

// Small, static illustrations of what the real screens look like -- sample data,
// not live content, shown before sign-up so new users see the app before they've
// filled anything in themselves. Styled to match the real screens' own classes
// (circles list rows, the Discover match card, a verified-member row) rather than
// being screenshots, so they never go stale relative to the actual UI.
function CirclesMockup() {
  return (
    <View className="w-full gap-3">
      <View className="flex-row items-center gap-3 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
          <Ionicons name="people-outline" size={20} color="#2C8B80" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-display text-sm text-ink-900 dark:text-ink-50">Tampa Türkiye Circle</Text>
          <Text className="text-xs text-ink-400">12 members · Tampa</Text>
        </View>
        <View className="justify-center rounded-full bg-coral-500 px-3 py-1">
          <Text className="text-xs font-medium text-white">Join</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-coral-50">
          <Ionicons name="briefcase-outline" size={20} color="#D9663D" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-display text-sm text-ink-900 dark:text-ink-50">NYC Business Network</Text>
          <Text className="text-xs text-ink-400">34 members · New York</Text>
        </View>
        <View className="justify-center rounded-full border border-coral-500 px-3 py-1">
          <Text className="text-xs font-medium text-coral-500">Join</Text>
        </View>
      </View>
    </View>
  );
}

function DiscoverMockup() {
  return (
    <View className="w-full items-center gap-3 rounded-3xl bg-teal-500 p-5">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-white/30">
        <Text className="text-2xl font-semibold text-white">A</Text>
      </View>
      <View className="items-center gap-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-display text-lg text-white">Aylin, 27</Text>
          <Ionicons name="checkmark-circle" size={16} color="white" />
        </View>
        <Text className="text-xs text-white/90">Tampa, FL</Text>
      </View>
      <View className="rounded-full bg-white/20 px-3 py-1">
        <Text className="text-xs font-medium text-white">Looking for: Friend</Text>
      </View>
    </View>
  );
}

function SafetyMockup() {
  return (
    <View className="w-full gap-3 rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-coral-500">
          <Text className="text-base font-semibold text-white">A</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-display text-sm text-ink-900 dark:text-ink-50">Aylin</Text>
            <Ionicons name="checkmark-circle" size={16} color="#2C8B80" />
          </View>
          <Text className="text-xs text-ink-400">Verified member</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2 rounded-xl bg-teal-50 p-2.5">
        <Ionicons name="location-outline" size={16} color="#2C8B80" />
        <Text className="flex-1 text-xs text-ink-700">Plans shared with a trusted contact</Text>
      </View>
    </View>
  );
}

const MOCKUPS: Record<NonNullable<Slide["mockup"]>, ComponentType> = {
  circles: CirclesMockup,
  discover: DiscoverMockup,
  safety: SafetyMockup,
};

export default function Welcome() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = index === SLIDES.length - 1;

  function goToIndex(next: number) {
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * pageWidth, animated: true });
  }

  // Plain onScroll rather than onMomentumScrollEnd: web mouse-wheel/trackpad drags
  // don't reliably fire a momentum-end event the way a native touch gesture does, so
  // the dots/button would silently stop tracking the visible page on web. onScroll
  // fires for every input method and gets a final, correct call once the scroll
  // (however it was driven) settles.
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!pageWidth) return;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  }

  function next() {
    if (isLast) return;
    goToIndex(index + 1);
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-1 justify-between pb-6 pt-10">
        <Pressable
          className="self-end px-6"
          onPress={() => router.push("/(auth)/login")}
          style={{ opacity: isLast ? 0 : 1 }}
        >
          <Text className="text-sm font-medium text-ink-400">{t("welcome.skip")}</Text>
        </Pressable>

        {/* Measuring this wrapper's own rendered width (via onLayout) rather than using
            the window/screen width: on web the content is constrained to a max-w-480
            centered column (see root _layout.tsx), which is narrower than the browser
            window on desktop, so a page width based on the window would be wrong there. */}
        <View className="flex-1" onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}>
          {pageWidth > 0 ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              {SLIDES.map((s, i) => {
                const Mockup = s.mockup ? MOCKUPS[s.mockup] : null;
                return (
                <View
                  key={s.titleKey}
                  style={{ width: pageWidth }}
                  className="items-center justify-center px-6"
                >
                  <View className="w-full items-center gap-6">
                    {i === 0 ? (
                      <View className="h-24 w-24 items-center justify-center rounded-3xl bg-white dark:bg-ink-800">
                        <AppMark size={72} />
                      </View>
                    ) : Mockup ? (
                      <View className="w-full max-w-[300px]">
                        <Mockup />
                      </View>
                    ) : (
                      <View className={`h-20 w-20 items-center justify-center rounded-3xl ${TINT_BG[s.tint]}`}>
                        <Ionicons name={s.icon} size={36} color="white" />
                      </View>
                    )}

                    <View className="w-full items-center gap-3">
                      <Text className="w-full text-center font-display text-3xl text-ink-900 dark:text-ink-50">
                        {i === 0 ? (
                          <>
                            Turkic <Text className="text-coral-500">Circles</Text>
                          </>
                        ) : (
                          t(s.titleKey)
                        )}
                      </Text>
                      <Text className="w-full max-w-[320px] text-center text-base leading-6 text-ink-700 dark:text-ink-200">
                        {t(s.bodyKey)}
                      </Text>
                    </View>
                  </View>
                </View>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        <View className="gap-6 px-6">
          <View className="flex-row items-center justify-center gap-2">
            {SLIDES.map((s, i) => (
              <Pressable key={s.titleKey} onPress={() => goToIndex(i)}>
                <View className={`h-2 rounded-full ${i === index ? "w-6 bg-coral-500" : "w-2 bg-coral-100"}`} />
              </Pressable>
            ))}
          </View>

          {isLast ? (
            <View className="gap-3">
              <Button label={t("welcome.getStarted")} onPress={() => router.push("/(auth)/sign-up")} />
              <Text className="text-center text-sm text-ink-400">
                {t("welcome.alreadyHaveAccount")}{" "}
                <Text className="font-semibold text-coral-500" onPress={() => router.push("/(auth)/login")}>
                  {t("welcome.logIn")}
                </Text>
              </Text>
            </View>
          ) : (
            <Button label={t("welcome.next")} onPress={next} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
