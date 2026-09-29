import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMarkThreadRead, useMatchParticipant, useMessages, useSendMessage } from "@/hooks/useChat";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { Avatar } from "@/components/Avatar";
import { TypingDots } from "@/components/TypingDots";

export default function ChatThread() {
  const { t } = useTranslation();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: participant } = useMatchParticipant(matchId, userId);
  const { data: messages } = useMessages(matchId);
  const sendMessage = useSendMessage(matchId, userId);
  const markThreadRead = useMarkThreadRead(matchId, userId);
  const { isOtherTyping, notifyTyping } = useTypingIndicator(matchId, userId);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (matchId && userId) markThreadRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, userId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages?.length, isOtherTyping]);

  function onDraftChange(text: string) {
    setDraft(text);
    if (text.trim()) notifyTyping();
  }

  function onSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    sendMessage.mutate(body);
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950" edges={["top", "left", "right"]}>
      <View className="flex-row items-center gap-3 border-b border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
        {/* Deliberately not router.back(): a thread can be reached from outside its
            own stack (a push notification tap, a deep link), in which case there's
            nothing local to pop back to and it falls through to whatever the
            surrounding navigation history happens to be (e.g. the Circles tab) --
            replace with the thread list explicitly so this button's destination
            never depends on how the thread was opened. */}
        <Pressable onPress={() => router.replace("/(app)/chat")}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>
        <Avatar
          uri={participant?.profile.avatar_url}
          name={participant?.profile.display_name}
          size={40}
        />
        <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
          {participant?.profile.display_name || t("common.member")}
        </Text>
      </View>

      <ScrollView ref={scrollRef} className="flex-1 px-4 pt-4" contentContainerClassName="gap-3 pb-4">
        {participant?.match ? (
          <Text className="text-center text-xs text-ink-400">
            {t("chat.youMatched", { date: format(new Date(participant.match.created_at), "MMM d") })}
          </Text>
        ) : null}

        {(messages ?? []).map((message) => {
          const isOwn = message.sender_id === userId;
          return (
            <View key={message.id} className={isOwn ? "items-end" : "items-start"}>
              <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${isOwn ? "bg-coral-500" : "bg-white dark:bg-ink-800"}`}>
                <Text className={isOwn ? "text-base text-white" : "text-base text-ink-900 dark:text-ink-50"}>{message.body}</Text>
              </View>
              <View className="mt-1 flex-row items-center gap-1">
                <Text className="text-xs text-ink-400">{format(new Date(message.created_at), "h:mm a")}</Text>
                {isOwn ? (
                  <MaterialIcons
                    name={message.read_at || message.delivered_at ? "done-all" : "done"}
                    size={16}
                    color={message.read_at ? "#D9663D" : "#A99C95"}
                  />
                ) : null}
              </View>
            </View>
          );
        })}

        {isOtherTyping ? <TypingDots /> : null}
      </ScrollView>

      <View className="px-4 pb-4 pt-2">
        <View
          className="flex-row items-center gap-2 rounded-full bg-white dark:bg-ink-800 py-2 pl-4 pr-2"
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <TextInput
            className="flex-1 text-base text-ink-900 dark:text-ink-50"
            // This is the first bare, borderless TextInput in the app (every other
            // one sits inside TextField's own bordered box, which already masks the
            // browser's default focus ring) -- react-native-web's outlineStyle prop
            // suppresses that ring, keeping the pill's edge clean when focused.
            style={{ outlineStyle: "none" } as never}
            placeholder={t("chat.typeMessage")}
            placeholderTextColor="#8A7C76"
            value={draft}
            onChangeText={onDraftChange}
            onSubmitEditing={onSend}
          />
          <Pressable
            accessibilityLabel={t("chat.send")}
            disabled={!draft.trim()}
            className={`h-10 w-10 items-center justify-center rounded-full ${draft.trim() ? "bg-coral-500" : "bg-coral-100 dark:bg-ink-700"}`}
            onPress={onSend}
          >
            <Ionicons name="arrow-up" size={20} color="white" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
