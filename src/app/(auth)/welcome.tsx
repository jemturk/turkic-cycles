import { useRef, useState, type ComponentType } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/Button";
import { AppMark } from "@/components/AppMark";
import { LinearGradient } from "expo-linear-gradient";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS } from "@/constants/circles";

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: "coral" | "teal";
  titleKey: string;
  bodyKey: string;
  // Which illustrative screen preview to show instead of the plain icon --
  // undefined for the brand-intro slide, which has no specific screen to preview.
  mockup?: "circles" | "discover" | "chat" | "safety";
};

const SLIDES: Slide[] = [
  { icon: "infinite-outline", tint: "coral", titleKey: "welcome.slide1Title", bodyKey: "welcome.slide1Body" },
  {
    icon: "people-outline",
    tint: "teal",
    titleKey: "welcome.slide2Title",
    bodyKey: "welcome.slide2Body",
    mockup: "circles",
  },
  {
    icon: "sparkles-outline",
    tint: "coral",
    titleKey: "welcome.slide3Title",
    bodyKey: "welcome.slide3Body",
    mockup: "discover",
  },
  {
    icon: "chatbubbles-outline",
    tint: "teal",
    titleKey: "welcome.slideChatTitle",
    bodyKey: "welcome.slideChatBody",
    mockup: "chat",
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
  coral: "bg-primary-500",
  teal: "bg-teal-500",
};

// Soft card shadow shared by the previews, so they lift off the cream page.
const CARD_SHADOW = {
  shadowColor: "#2B2320",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

// A small round "photo": warm initials, since the previews use sample people.
function Face({ letter, color, size = 28 }: { letter: string; color: string; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full border-2 border-white"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <Text className="text-xs font-bold text-white">{letter}</Text>
    </View>
  );
}

// Small, static illustrations of what the real screens look like -- sample data,
// not live content, shown before sign-up so new users see the app before they've
// filled anything in themselves. Built from the real screens' own styles (circle
// cards with topic tiles, the Discover card, chat bubbles, the event page) rather
// than screenshots, so they're translated and follow dark mode.
function CirclesMockup() {
  return (
    <View className="w-full gap-3">
      <View className="flex-row items-center gap-3 rounded-[22px] bg-white p-4 dark:bg-ink-800" style={CARD_SHADOW}>
        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${CIRCLE_TOPIC_COLORS.culture.bg}`}>
          <Ionicons name={CIRCLE_TOPIC_ICONS.culture} size={22} color={CIRCLE_TOPIC_COLORS.culture.fg} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-display text-base text-ink-900 dark:text-ink-50" numberOfLines={1}>
            Tampa Türkiye Circle
          </Text>
          <Text className="text-xs text-ink-400 dark:text-ink-300" numberOfLines={1}>
            12 members · Tampa
          </Text>
        </View>
        <View className="rounded-full bg-primary-500 px-3.5 py-1.5">
          <Text className="text-xs font-semibold text-white">Join</Text>
        </View>
      </View>

      <View className="gap-3 rounded-[22px] bg-white p-4 dark:bg-ink-800" style={CARD_SHADOW}>
        <View className="flex-row items-center gap-3">
          <View className={`h-12 w-11 items-center justify-center rounded-xl ${CIRCLE_TOPIC_COLORS.family.bg}`}>
            <Text className="text-[10px] font-bold" style={{ color: CIRCLE_TOPIC_COLORS.family.fg }}>
              NOV
            </Text>
            <Text className="text-lg font-bold leading-5" style={{ color: CIRCLE_TOPIC_COLORS.family.fg }}>
              9
            </Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="font-display text-base text-ink-900 dark:text-ink-50" numberOfLines={1}>
              Holiday Lights Walk
            </Text>
            <Text className="text-xs text-ink-400 dark:text-ink-300" numberOfLines={1}>
              Mon · 6:30 PM · Downtown Tampa
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="flex-row">
            {[
              ["A", "#B5651D"],
              ["K", "#5A6B7B"],
              ["Z", "#8A6A4F"],
              ["T", "#4F6B5A"],
            ].map(([letter, color], i) => (
              <View key={letter} style={{ marginLeft: i ? -8 : 0 }}>
                <Face letter={letter} color={color} />
              </View>
            ))}
          </View>
          <Text className="text-xs font-medium text-ink-700 dark:text-ink-200">5 going · 3 interested</Text>
        </View>
      </View>
    </View>
  );
}

function DiscoverMockup() {
  const { t } = useTranslation();
  return (
    <View className="w-full overflow-hidden rounded-3xl" style={[CARD_SHADOW, { height: 260 }]}>
      <LinearGradient colors={["#D9A57E", "#9C6B4E", "#5C3D2E"]} style={StyleSheet.absoluteFill} />
      <View className="flex-1 items-center justify-center">
        <Ionicons name="person" size={110} color="rgba(255,255,255,0.28)" />
      </View>
      <View className="gap-2 bg-ink-950/55 p-4">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-display text-xl text-white">Aylin, 27</Text>
          <Ionicons name="checkmark-circle" size={18} color="white" />
        </View>
        <Text className="text-xs text-white/90">Tampa, FL</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1">
            <Ionicons name="sparkles" size={12} color="#9C7A28" />
            <Text className="text-xs font-bold text-ink-900">{t("discover.strongMatch")}</Text>
          </View>
          <Text className="text-xs text-white">
            {t("discover.reasons.interests", { count: 3 })} · {t("discover.reasons.proximity")}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {["Architect", "Hiking", "Friendship"].map((tag) => (
            <View key={tag} className="rounded-full bg-white/20 px-2.5 py-1">
              <Text className="text-[11px] font-medium text-white">{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// The chat screen's bubbles: grouped runs, the speech corner toward the sender, an
// emoji reaction and the typing dots.
function ChatMockup() {
  const their = { backgroundColor: "#F8DBCF", borderRadius: 18 };
  const own = { backgroundColor: "#BEDFE2", borderRadius: 18 };
  return (
    <View className="w-full gap-1 rounded-[22px] p-4" style={{ backgroundColor: "#FFFAF4", ...CARD_SHADOW }}>
      <View className="self-start px-3.5 py-2" style={[their, { borderBottomLeftRadius: 6 }]}>
        <Text className="text-sm text-ink-900">Coffee after the walk? ☕</Text>
      </View>
      <View className="self-start px-3.5 py-2" style={[their, { borderTopLeftRadius: 6, borderBottomLeftRadius: 0 }]}>
        <Text className="text-sm text-ink-900">{"There's a great place on Salem St"}</Text>
        <View
          className="absolute -bottom-3 right-2 rounded-full bg-white px-1.5 py-0.5"
          style={{ shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
        >
          <Text className="text-xs">❤️</Text>
        </View>
      </View>
      <View className="mt-5 self-end px-3.5 py-2" style={[own, { borderBottomRightRadius: 0 }]}>
        <Text className="text-sm" style={{ color: "#0E3F45" }}>
          Yes! See you at 7 🙌
        </Text>
      </View>
      <View className="mt-2 flex-row gap-1 self-start rounded-2xl px-3 py-2.5" style={{ backgroundColor: "#FBEAE2" }}>
        {[0.75, 0.5, 0.3].map((opacity) => (
          <View key={opacity} className="h-1.5 w-1.5 rounded-full bg-ink-900" style={{ opacity }} />
        ))}
      </View>
    </View>
  );
}

function SafetyMockup() {
  return (
    <View className="w-full gap-3 rounded-[22px] bg-white p-4 dark:bg-ink-800" style={CARD_SHADOW}>
      <View className="flex-row items-center gap-3">
        <Face letter="A" color="#B5651D" size={40} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-display text-base text-ink-900 dark:text-ink-50">Aylin</Text>
            <Ionicons name="checkmark-circle" size={16} color="#2C8B80" />
          </View>
          <Text className="text-xs text-ink-400 dark:text-ink-300">Verified member</Text>
        </View>
      </View>
      {[
        ["location-outline", "Plans shared with a trusted contact"],
        ["eye-off-outline", "You choose how much location to show"],
        ["flag-outline", "Block or report in two taps"],
      ].map(([icon, label]) => (
        <View key={label} className="flex-row items-center gap-2.5 rounded-xl bg-teal-50 p-2.5">
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color="#206E65" />
          <Text className="flex-1 text-xs text-ink-700">{label}</Text>
        </View>
      ))}
    </View>
  );
}

const MOCKUPS: Record<NonNullable<Slide["mockup"]>, ComponentType> = {
  circles: CirclesMockup,
  discover: DiscoverMockup,
  chat: ChatMockup,
  safety: SafetyMockup,
};

export default function Welcome() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  // Each slide fills the area's full height too, so its content centers vertically
  // (a horizontal ScrollView's pages otherwise only grow as tall as their content).
  const [pageHeight, setPageHeight] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
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
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <View className="flex-1 justify-between pb-6 pt-10">
        <Pressable
          className="self-end px-6"
          onPress={() => router.push("/(auth)/login")}
          style={{ opacity: isLast ? 0 : 1 }}
        >
          <Text className="text-sm font-medium text-ink-400 dark:text-ink-300">{t("welcome.skip")}</Text>
        </Pressable>

        {/* Measuring this wrapper's own rendered width (via onLayout) rather than using
            the window/screen width: on web the content is constrained to a max-w-480
            centered column (see root _layout.tsx), which is narrower than the browser
            window on desktop, so a page width based on the window would be wrong there. */}
        <View
          className="flex-1"
          onLayout={(e) => {
            setPageWidth(e.nativeEvent.layout.width);
            setPageHeight(e.nativeEvent.layout.height);
          }}
        >
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
                  <View key={s.titleKey} style={{ width: pageWidth, height: pageHeight }} className="items-center justify-center px-6">
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
                        {/* The first slide's title is the app's name, in ink like the others: the logo
                            above it brings the colour, and the teal Next button stays the one accent. */}
                        <Text className="w-full text-center font-display text-3xl text-ink-900 dark:text-ink-50">
                          {t(s.titleKey)}
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
                <View className={`h-2 rounded-full ${i === index ? "w-6 bg-primary-500" : "w-2 bg-primary-100"}`} />
              </Pressable>
            ))}
          </View>

          <View className="gap-3">
            {isLast ? (
              <Button label={t("welcome.getStarted")} onPress={() => router.push("/(auth)/sign-up")} />
            ) : (
              <Button label={t("welcome.next")} onPress={next} />
            )}
            {/* Always laid out, shown only on the last slide, so the button and dots
                don't jump up when it appears. */}
            <View style={{ opacity: isLast ? 1 : 0 }} pointerEvents={isLast ? "auto" : "none"}>
              <Text className="text-center text-sm text-ink-400 dark:text-ink-300">
                {t("welcome.alreadyHaveAccount")}{" "}
                <Text className="font-semibold text-primary-500" onPress={() => router.push("/(auth)/login")}>
                  {t("welcome.logIn")}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
