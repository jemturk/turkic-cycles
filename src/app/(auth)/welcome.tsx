import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Button } from "@/components/Button";

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: "coral" | "teal";
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: "infinite-outline",
    tint: "coral",
    title: "Turkic Circles",
    body: "Meaningful connections within the Turkic and Turkic-adjacent community — join circles, meet people, belong somewhere.",
  },
  {
    icon: "sparkles-outline",
    tint: "teal",
    title: "Join Circles",
    body: "Browse and join community groups built around your city, culture, and interests — from everyday hangouts to business networks.",
  },
  {
    icon: "heart-outline",
    tint: "coral",
    title: "Discover & Connect",
    body: "Meet people within your circles for friendship, romance, business, or mentorship — matching adapts to what you're looking for.",
  },
  {
    icon: "shield-checkmark-outline",
    tint: "teal",
    title: "Safe by Design",
    body: "Get verified, share your plans before meeting up, and block or report anyone — your safety comes first, always.",
  },
];

const TINT_BG: Record<Slide["tint"], string> = {
  coral: "bg-coral-500",
  teal: "bg-teal-500",
};

export default function Welcome() {
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  function next() {
    if (isLast) return;
    setIndex((i) => i + 1);
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-1 justify-between px-6 pb-6 pt-10">
        <Pressable
          className="self-end"
          onPress={() => setIndex(SLIDES.length - 1)}
          style={{ opacity: isLast ? 0 : 1 }}
        >
          <Text className="text-sm font-medium text-ink-400">Skip</Text>
        </Pressable>

        <View className="flex-1 items-center justify-center">
          <Animated.View style={animatedStyle} className="w-full items-center gap-6">
            <View className={`h-20 w-20 items-center justify-center rounded-3xl ${TINT_BG[slide.tint]}`}>
              <Ionicons name={slide.icon} size={36} color="white" />
            </View>

            <View className="w-full items-center gap-3">
              <Text className="w-full text-center font-display text-3xl text-ink-900 dark:text-ink-50">
                {index === 0 ? (
                  <>
                    Turkic <Text className="text-coral-500">Circles</Text>
                  </>
                ) : (
                  slide.title
                )}
              </Text>
              <Text className="w-full max-w-[320px] text-center text-base leading-6 text-ink-700 dark:text-ink-200">
                {slide.body}
              </Text>
            </View>
          </Animated.View>
        </View>

        <View className="gap-6">
          <View className="flex-row items-center justify-center gap-2">
            {SLIDES.map((s, i) => (
              <View
                key={s.title}
                className={`h-2 rounded-full ${i === index ? "w-6 bg-coral-500" : "w-2 bg-coral-100"}`}
              />
            ))}
          </View>

          {isLast ? (
            <View className="gap-3">
              <Button label="Get started" onPress={() => router.push("/(auth)/sign-up")} />
              <Text className="text-center text-sm text-ink-400">
                Already have an account?{" "}
                <Text className="font-semibold text-coral-500" onPress={() => router.push("/(auth)/login")}>
                  Log in
                </Text>
              </Text>
            </View>
          ) : (
            <Button label="Next" onPress={next} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
