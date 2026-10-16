import { Children, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { FormScrollView } from "@/components/FormScrollView";
import { useWideLayout } from "@/hooks/useWideLayout";

type IconName = keyof typeof Ionicons.glyphMap;

// The building blocks of the Settings sub-pages (Account, Verification, Safety
// Center, ...), so they share the Settings screen's look: a round back button and a
// large title, white cards, and grouped lists of rows with pale-coral icon tiles.

// A whole sub-page. `form` uses FormScrollView, which keeps the focused field above
// the keyboard. On desktop web the content keeps to a readable width, left-aligned
// with the other screens.
export function SubPage({
  title,
  subtitle,
  form = false,
  children,
}: {
  title: string;
  subtitle?: string;
  form?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const wide = useWideLayout();
  const Scroll = form ? FormScrollView : ScrollView;
  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <Scroll
        className="flex-1"
        contentContainerClassName={wide ? "px-20 pb-12 pt-9" : "px-4 pb-10 pt-4"}
        showsVerticalScrollIndicator={!wide}
      >
        <View className={wide ? "max-w-[720px] gap-5" : "gap-4"}>
          <View className="gap-2">
            <Pressable
              accessibilityLabel={t("common.back")}
              hitSlop={8}
              onPress={() => router.back()}
              className="-ml-2 h-10 w-10 items-center justify-center rounded-full web:hover:bg-white dark:web:hover:bg-ink-800"
            >
              <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
            </Pressable>
            <Text className={`font-display text-ink-900 dark:text-ink-50 ${wide ? "text-4xl" : "text-3xl"}`}>{title}</Text>
            {subtitle ? <Text className="text-base text-ink-700 dark:text-ink-200">{subtitle}</Text> : null}
          </View>
          {children}
        </View>
      </Scroll>
    </SafeAreaView>
  );
}

// A white card for a form or a block of text.
export function Card({ children }: { children: ReactNode }) {
  return <View className="gap-4 rounded-[22px] bg-white p-5 dark:bg-ink-800">{children}</View>;
}

// A tinted note -- `tone` "info" (teal) or "warning" (coral).
export function Note({ icon, tone = "info", children }: { icon: IconName; tone?: "info" | "warning"; children: ReactNode }) {
  return (
    <View className={`flex-row gap-2.5 rounded-2xl p-4 ${tone === "warning" ? "bg-accent-50" : "bg-teal-50"}`}>
      <Ionicons name={icon} size={18} color={tone === "warning" ? "#9E370B" : "#206E65"} />
      <Text className="flex-1 text-sm text-ink-700">{children}</Text>
    </View>
  );
}

// The pale-coral tile a row leads with, as on the Settings screen; `solid` is the
// filled teal one (Log out, Meet members).
export function IconTile({ icon, solid = false }: { icon: IconName; solid?: boolean }) {
  return (
    <View
      className={`h-9 w-9 items-center justify-center rounded-lg ${solid ? "bg-primary-500" : "bg-accent-100/60 dark:bg-ink-700"}`}
    >
      <Ionicons name={icon} size={20} color={solid ? "#FFFFFF" : "#C1440E"} />
    </View>
  );
}

// One white card of rows with hairlines between them, with an optional small title
// just above it, as on the Settings screen.
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  const card = (
    <View className="overflow-hidden rounded-2xl bg-white dark:bg-ink-800">
      {Children.toArray(children).map((child, index) => (
        <View key={index} className={index > 0 ? "border-t border-primary-50 dark:border-ink-700" : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
  if (!title) return card;
  return (
    <View className="gap-1.5">
      <Text className="ml-1 mt-1 text-xs font-medium uppercase text-ink-400">{title}</Text>
      {card}
    </View>
  );
}

// A row in a Group: icon tile, title and an optional line under it, then `right`
// (a value, a button) or, for a row that opens something, a ›.
// `leading` replaces the icon tile (an avatar, a circle's topic tile); `solid` gives
// the icon the filled teal tile; `bold` sets the title in semibold (a chosen option).
export function Item({
  icon,
  leading,
  solid = false,
  bold = false,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: IconName;
  leading?: ReactNode;
  solid?: boolean;
  bold?: boolean;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      {leading ?? (icon ? <IconTile icon={icon} solid={solid} /> : null)}
      <View className="flex-1">
        <Text className={`text-base text-ink-900 dark:text-ink-50 ${bold ? "font-semibold" : ""}`}>{title}</Text>
        {subtitle ? <Text className="text-sm text-ink-400">{subtitle}</Text> : null}
      </View>
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color="#A99C95" /> : null}
    </>
  );
  const className = "flex-row items-center gap-3 px-4 py-3";
  return onPress ? (
    <Pressable onPress={onPress} className={`${className} web:hover:bg-primary-100/40 dark:web:hover:bg-ink-700`}>
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );
}
