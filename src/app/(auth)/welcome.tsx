import { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/Button";

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: "coral" | "teal";
  titleKey: string;
  bodyKey: string;
};

const SLIDES: Slide[] = [
  { icon: "infinite-outline", tint: "coral", titleKey: "welcome.slide1Title", bodyKey: "welcome.slide1Body" },
  { icon: "sparkles-outline", tint: "teal", titleKey: "welcome.slide2Title", bodyKey: "welcome.slide2Body" },
  { icon: "heart-outline", tint: "coral", titleKey: "welcome.slide3Title", bodyKey: "welcome.slide3Body" },
  {
    icon: "shield-checkmark-outline",
    tint: "teal",
    titleKey: "welcome.slide4Title",
    bodyKey: "welcome.slide4Body",
  },
];

const TINT_BG: Record<Slide["tint"], string> = {
  coral: "bg-coral-500",
  teal: "bg-teal-500",
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
          onPress={() => goToIndex(SLIDES.length - 1)}
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
              {SLIDES.map((s, i) => (
                <View
                  key={s.titleKey}
                  style={{ width: pageWidth }}
                  className="items-center justify-center px-6"
                >
                  <View className="w-full items-center gap-6">
                    <View className={`h-20 w-20 items-center justify-center rounded-3xl ${TINT_BG[s.tint]}`}>
                      <Ionicons name={s.icon} size={36} color="white" />
                    </View>

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
              ))}
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
