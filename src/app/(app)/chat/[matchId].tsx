import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
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
  const insets = useSafeAreaInsets();
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
    // No top edge on the SafeAreaView: the header pads itself for the status bar
    // instead, so the white header runs up behind it like every other screen's
    // (the SafeAreaView's padding would show the cream page background there).
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <View
        className="flex-row items-center gap-3 bg-white dark:bg-ink-800 px-4 pb-3"
        style={{
          paddingTop: insets.top + 12,
          // Same soft shadow as AppHeader's bottom edge, in place of a tinted border
          // line; zIndex keeps it drawn over the messages below.
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
          zIndex: 1,
        }}
      >
        {/* Deliberately not router.back(): a thread can be reached from outside its
            own stack (a push notification tap, a deep link), in which case there's
            nothing local to pop back to and it falls through to whatever the
            surrounding navigation history happens to be (e.g. the Circles tab) --
            replace with the thread list explicitly so this button's destination
            never depends on how the thread was opened. */}
        <Pressable onPress={() => router.replace("/(app)/chat")}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>
        <Pressable
          className="flex-1 flex-row items-center gap-3"
          onPress={() => {
            if (participant?.profile.id) router.replace(`/(app)/user/${participant.profile.id}?matchId=${matchId}`);
          }}
        >
          <Avatar
            uri={participant?.profile.avatar_url}
            name={participant?.profile.display_name}
            size={40}
          />
          <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
            {participant?.profile.display_name || t("common.member")}
          </Text>
        </Pressable>
      </View>

      {/* Lifts the message list and the input above the keyboard -- the input
          is pinned to the bottom, so without this the keyboard covers it. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-4"
          contentContainerClassName="gap-3 pb-4"
          // After the new content has laid out, not when the state changes: scrolling
          // from an effect ran before a new message or the typing bubble had any
          // height, stopping short and leaving it half behind the input bar.
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {participant?.match ? (
            <Text className="text-center text-xs text-ink-400">
              {t("chat.youMatched", { date: format(new Date(participant.match.created_at), "MMM d") })}
            </Text>
          ) : null}

          {(messages ?? []).map((message) => {
            const isOwn = message.sender_id === userId;
            return (
              <View key={message.id} className={isOwn ? "items-end" : "items-start"}>
                {/* Yours in the primary turquoise, theirs in the coral-red accent. */}
                <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${isOwn ? "bg-primary-500" : "bg-accent-500"}`}>
                  <Text className="text-base text-white">{message.body}</Text>
                </View>
                <View className="mt-1 flex-row items-center gap-1">
                  <Text className="text-xs text-ink-400">{format(new Date(message.created_at), "h:mm a")}</Text>
                  {isOwn ? (
                    <MaterialIcons
                      name={message.read_at || message.delivered_at ? "done-all" : "done"}
                      size={16}
                      color={message.read_at ? "#127A87" : "#A99C95"}
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
              className={`h-10 w-10 items-center justify-center rounded-full ${draft.trim() ? "bg-primary-500" : "bg-primary-100 dark:bg-ink-700"}`}
              onPress={onSend}
            >
              <Ionicons name="arrow-up" size={20} color="white" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
