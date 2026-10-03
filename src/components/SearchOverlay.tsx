import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useCircles } from "@/hooks/useCircles";
import { useMessageThreads, useNewConnections } from "@/hooks/useChat";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";
import { Avatar } from "@/components/Avatar";

function matches(needle: string, fields: (string | null | undefined)[]) {
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

function SectionLabel({ label }: { label: string }) {
  return <Text className="px-1 pt-2 text-xs font-medium uppercase text-ink-400">{label}</Text>;
}

// Floating search over whatever screen is open, opened from the search icon in
// AppHeader rather than navigating to a page of its own. Searches only data the app
// already loads for you -- every circle, plus people you're matched or chatting
// with -- all client-side, so there's no new query that could expose other users.
export function SearchOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: circles } = useCircles();
  const { data: matched } = useNewConnections(userId);
  const { data: connected } = useMessageThreads(userId);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();

  const circleResults = useMemo(() => {
    if (!needle) return [];
    return (circles ?? []).filter((c) => matches(needle, [c.name, c.description, c.city]));
  }, [circles, needle]);

  const peopleResults = useMemo(() => {
    if (!needle) return [];
    const byUser = new Map([...(matched ?? []), ...(connected ?? [])].map((p) => [p.otherUserId, p]));
    return [...byUser.values()].filter((p) =>
      matches(needle, [p.otherDisplayName, p.otherCity, p.otherState, p.otherCountry])
    );
  }, [matched, connected, needle]);

  const hasResults = circleResults.length > 0 || peopleResults.length > 0;

  function close() {
    setQuery("");
    onClose();
  }

  function go(navigate: () => void) {
    close();
    navigate();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable accessibilityLabel={t("common.close")} className="flex-1 bg-black/40" onPress={close}>
        {/* Inner Pressable swallows taps so only the dimmed backdrop closes the overlay. */}
        <Pressable
          onPress={() => {}}
          className="mx-auto w-full max-w-[480px] gap-3 px-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View className="flex-row items-center gap-3 rounded-2xl bg-white dark:bg-ink-800 px-5 py-4 shadow-lg">
            <Ionicons name="search" size={20} color="#8A7C76" />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={t("search.placeholder")}
              placeholderTextColor="#8A7C76"
              autoCapitalize="none"
              autoCorrect={false}
              // Without these, mobile Chrome treats this as a fillable form field and
              // shows its autofill bar (passwords / cards / addresses) above the
              // keyboard.
              autoComplete="off"
              inputMode="search"
              returnKeyType="search"
              className="flex-1 text-base text-ink-900 dark:text-ink-50"
              // Suppresses the browser's default focus ring on web, same as the chat
              // input in chat/[matchId].tsx.
              style={{ outlineStyle: "none" } as never}
            />
            {query ? (
              <Pressable accessibilityLabel={t("common.clear")} hitSlop={8} onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={20} color="#8A7C76" />
              </Pressable>
            ) : null}
          </View>

          {needle ? (
            <View className="rounded-2xl bg-white dark:bg-ink-800 shadow-lg" style={{ maxHeight: height * 0.6 }}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-1 p-3">
                {!hasResults ? (
                  <Text className="py-2 text-center text-sm text-ink-400">
                    {t("search.noResults", { query: query.trim() })}
                  </Text>
                ) : null}

                {circleResults.length > 0 ? <SectionLabel label={t("search.circles")} /> : null}
                {circleResults.map((circle) => {
                  const topic = circle.topic as CircleTopic;
                  return (
                    <Pressable
                      key={circle.id}
                      onPress={() => go(() => router.push(`/(app)/circles/${circle.id}`))}
                      className="flex-row items-center gap-3 rounded-xl px-2 py-2"
                    >
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-lg ${CIRCLE_TOPIC_COLORS[topic].bg}`}
                      >
                        <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={20} color={CIRCLE_TOPIC_COLORS[topic].fg} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-display text-base text-ink-900 dark:text-ink-50" numberOfLines={1}>
                          {circle.name}
                        </Text>
                        <Text className="text-xs text-ink-400" numberOfLines={1}>
                          {t("circles.membersCount", { count: circle.member_count })}
                          {circle.city ? ` · ${[circle.city, circle.state].filter(Boolean).join(", ")}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

                {peopleResults.length > 0 ? <SectionLabel label={t("search.people")} /> : null}
                {peopleResults.map((person) => {
                  const location = [person.otherCity, person.otherState, person.otherCountry]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <Pressable
                      key={person.otherUserId}
                      // replace, not push -- see goToProfile in connections/index.tsx.
                      onPress={() =>
                        go(() => router.replace(`/(app)/user/${person.otherUserId}?matchId=${person.matchId}`))
                      }
                      className="flex-row items-center gap-3 rounded-xl px-2 py-2"
                    >
                      <Avatar uri={person.otherAvatarUrl} name={person.otherDisplayName} size={40} />
                      <View className="flex-1">
                        <Text className="font-display text-base text-ink-900 dark:text-ink-50" numberOfLines={1}>
                          {person.otherDisplayName}
                        </Text>
                        {location ? (
                          <Text className="text-xs text-ink-400" numberOfLines={1}>
                            {location}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
