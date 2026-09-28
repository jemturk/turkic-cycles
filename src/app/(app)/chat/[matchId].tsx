import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMarkThreadRead, useMatchParticipant, useMessages, useSendMessage } from "@/hooks/useChat";
import { TextField } from "@/components/TextField";

export default function ChatThread() {
  const { t } = useTranslation();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: participant } = useMatchParticipant(matchId, userId);
  const { data: messages } = useMessages(matchId);
  const sendMessage = useSendMessage(matchId, userId);
  const markThreadRead = useMarkThreadRead(matchId, userId);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (matchId && userId) markThreadRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, userId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages?.length]);

  function onSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    sendMessage.mutate(body);
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-row items-center gap-3 border-b border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-coral-500">
          <Text className="text-base font-semibold text-white">
            {(participant?.profile.display_name || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
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
              <Text className="mt-1 text-xs text-ink-400">{format(new Date(message.created_at), "h:mm a")}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View className="flex-row items-center gap-3 border-t border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
        <View className="flex-1">
          <TextField placeholder={t("chat.typeMessage")} value={draft} onChangeText={setDraft} onSubmitEditing={onSend} />
        </View>
        <Pressable
          accessibilityLabel={t("chat.send")}
          className="h-12 w-12 items-center justify-center rounded-full bg-coral-500"
          onPress={onSend}
        >
          <Ionicons name="send" size={18} color="white" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
