import { Fragment, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

import { useSession } from "@/hooks/useSession";
import {
  useMarkThreadRead,
  useMatchParticipant,
  useMessages,
  useReactions,
  useSendMessage,
  useToggleReaction,
} from "@/hooks/useChat";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { Avatar } from "@/components/Avatar";
import { TypingDots } from "@/components/TypingDots";
import { MessageStatus, messageStatus } from "@/components/MessageStatus";
import { ReactionEmoji } from "@/components/ReactionEmoji";
import { MessageText } from "@/components/MessageText";
import { useWideLayout } from "@/hooks/useWideLayout";
import { containsEmail, containsPhoneNumber } from "@/lib/contactInfo";
import { dayLabel } from "@/lib/dayLabel";
import type { Tables } from "@/types/database";
import { usePlaceholderColor } from "@/hooks/usePlaceholderColor";

// Message bubbles: pale turquoise for yours, pale coral for theirs (a step past the
// palette's lightest shades, primary-100 / accent-50), both with dark text.
// Back-to-back messages from the same person this close together form a run: they
// sit tight together, and only the last shows its time.
const RUN_GAP_MS = 2 * 60 * 1000;

// Bubble corners: round, softer on the sender's side where bubbles of a run meet, and
// the last of a run comes to a point toward its sender with a small flick, like a
// speech bubble.
const BUBBLE_RADIUS = 18;
const RUN_RADIUS = 6;
const TAIL_WIDTH = 5;
const TAIL_HEIGHT = 9;
// Below the flick, for its drawn-in shadow.
const TAIL_SHADOW_ROOM = 2;
// A short, flat sweep out from the bubble's bottom corner (its edge is the 1px overlap).
const TAIL_PATH_THEIRS = "M5 0 L5 9 L0 9 C2.6 8.2 4.4 5.2 5 0 Z";
const TAIL_PATH_OWN = "M0 0 L0 9 L5 9 C2.4 8.2 0.6 5.2 0 0 Z";

function sameDay(a: Message, b: Message) {
  return new Date(a.created_at).toDateString() === new Date(b.created_at).toDateString();
}

function sameRun(a: Message | undefined, b: Message | undefined) {
  return (
    !!a &&
    !!b &&
    a.sender_id === b.sender_id &&
    Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < RUN_GAP_MS
  );
}

// tail: the color at the bubble's bottom corner, where the flick joins it (yours is
// the end of the sheen).
const BUBBLE_COLORS = {
  own: { background: "#BEDFE2", text: "#0E3F45", tail: "#B2D8DB" },
  their: { background: "#F8DBCF", text: "#2B2320", tail: "#F8DBCF" },
};

// The quick reactions offered on the other person's messages (migration 0038 stores
// one per person per message).
const REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🙏"];

type Message = Tables<"messages">;

export default function ChatThread() {
  const insets = useSafeAreaInsets();
  const placeholderColor = usePlaceholderColor();
  const { t, i18n } = useTranslation();
  const wide = useWideLayout();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: participant } = useMatchParticipant(matchId, userId);
  const { data: messages } = useMessages(matchId);
  const sendMessage = useSendMessage(matchId, userId);
  const markThreadRead = useMarkThreadRead(matchId, userId);
  const { isOtherTyping, notifyTyping, notifyStopped, clearOtherTyping } = useTypingIndicator(matchId, userId);
  const { data: reactions } = useReactions(matchId);
  const toggleReaction = useToggleReaction(matchId, userId);

  const [draft, setDraft] = useState("");
  // The message whose reaction bar is open (long-press on a phone, the smiley on
  // desktop), the one hovered on desktop, and the one being replied to.
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  // A safety tip while the draft holds what looks like a phone number or email
  // address; once closed, it stays closed for this conversation. Advisory only --
  // sending isn't held up.
  const [contactTipDismissed, setContactTipDismissed] = useState(false);
  const showContactTip = !contactTipDismissed && (containsPhoneNumber(draft) || containsEmail(draft));
  const scrollRef = useRef<ScrollViewInstance>(null);
  // The thread opens already at its latest message: until the messages have loaded
  // and the list has jumped to the end (instantly), it stays hidden, so the jump is
  // never seen. After that, new messages scroll smoothly.
  // Which thread has been positioned -- per thread, since on desktop the screen stays
  // mounted while switching between them.
  const [positionedFor, setPositionedFor] = useState<string | null>(null);
  const positioned = positionedFor === matchId;
  // Whether the list is at (or near) its end -- so when the keyboard shrinks the
  // list, it stays pinned to the newest message, but not if you're reading older ones.
  const atBottomRef = useRef(true);
  // The newest message the list has followed, to tell a new message from other growth.
  const lastMessageIdRef = useRef<string | null>(null);
  // Which thread has made its first jump to the end -- set when its messages arrive,
  // not when the list is revealed (a slow load is revealed by the fallback first) --
  // and, for a moment after that, "settling": reactions (their own query), photos and
  // emoji still add height, and following that has to be instant too, or the thread
  // visibly glides down from older bubbles as it opens.
  const landedForRef = useRef<string | null>(null);
  const settlingRef = useRef(false);

  // Each thread opens at its end, and never stays hidden if no size change comes
  // after its messages load.
  useEffect(() => {
    atBottomRef.current = true;
    const fallback = setTimeout(() => setPositionedFor(matchId ?? null), 1000);
    return () => clearTimeout(fallback);
  }, [matchId]);

  useEffect(() => {
    if (matchId && userId) markThreadRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, userId]);

  function onDraftChange(text: string) {
    setDraft(text);
    if (text.trim()) notifyTyping();
    else notifyStopped();
  }

  // Their new message ends their typing: hide the dots now, not when the timeout runs out.
  const lastMessage = messages?.[messages.length - 1];
  useEffect(() => {
    if (lastMessage && lastMessage.sender_id !== userId) clearOtherTyping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage?.id]);

  function onSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    notifyStopped();
    sendMessage.mutate({ body, replyToId: replyTo?.id });
    setReplyTo(null);
  }

  const otherName = participant?.profile.display_name || t("common.member");
  const messagesById = new Map((messages ?? []).map((m) => [m.id, m]));

  function startReply(message: Message) {
    setActionsFor(null);
    setReplyTo(message);
  }

  function react(message: Message, emoji: string) {
    const current = (reactions ?? []).find((r) => r.messageId === message.id && r.userId === userId)?.emoji;
    toggleReaction.mutate({ messageId: message.id, emoji, current });
    setActionsFor(null);
  }

  // The quick reactions, plus Reply (a phone has no hover buttons to reach it).
  // Floats over the message above (or, for the first message, just below), so opening
  // it never moves the bubble you long-pressed.
  function renderReactionBar(message: Message, below: boolean) {
    const mine = (reactions ?? []).find((r) => r.messageId === message.id && r.userId === userId)?.emoji;
    return (
      <View
        className="absolute left-0 flex-row items-center gap-0.5 rounded-full bg-white px-1.5 py-1 dark:bg-ink-800"
        style={{
          ...(below ? { top: "100%", marginTop: 6 } : { bottom: "100%", marginBottom: 6 }),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        {REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={emoji}
            aria-pressed={mine === emoji}
            onPress={() => react(message, emoji)}
            className={`h-10 w-10 items-center justify-center rounded-full ${
              mine === emoji ? "bg-primary-100 dark:bg-ink-700" : "web:hover:bg-primary-100/40"
            }`}
          >
            <ReactionEmoji emoji={emoji} size={26} />
          </Pressable>
        ))}
        <View className="mx-1 h-6 w-px bg-ink-100 dark:bg-ink-700" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.reply")}
          onPress={() => startReply(message)}
          className="h-10 w-10 items-center justify-center rounded-full web:hover:bg-primary-100/40"
        >
          <Ionicons name="arrow-undo-outline" size={20} color="#4A3F3A" />
        </Pressable>
      </View>
    );
  }

  // The message a reply answers, quoted at the top of its bubble.
  function renderQuote(originalId: string, onOwnBubble: boolean) {
    const original = messagesById.get(originalId);
    if (!original) return null;
    const fromMe = original.sender_id === userId;
    return (
      <View
        className="mb-2 rounded-lg border-l-4 px-3 py-1.5"
        style={{
          backgroundColor: onOwnBubble ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.55)",
          borderLeftColor: fromMe ? "#127A87" : "#C1440E",
        }}
      >
        <Text className="text-xs font-semibold text-ink-900">{fromMe ? t("chat.you") : otherName}</Text>
        <Text className="text-sm text-ink-700" numberOfLines={2}>
          {original.body}
        </Text>
      </View>
    );
  }

  return (
    // No top edge on the SafeAreaView: the header pads itself for the status bar
    // instead, so the white header runs up behind it like every other screen's
    // (the SafeAreaView's padding would show the cream page background there).
    // Desktop web (wide) is the right-hand pane of chat/_layout.tsx: one white card
    // with a hairline under the header and over the composer, a lighter message
    // area, and the other person's bubbles in a neutral grey instead of coral.
    <SafeAreaView
      className={wide ? "flex-1 bg-white dark:bg-ink-800" : "flex-1 bg-[#FFFAF4] dark:bg-ink-900"}
      edges={["left", "right"]}
    >
      <View
        className={
          wide
            ? "flex-row items-center gap-3 border-b border-[#F3E3D2] px-6 py-4 dark:border-ink-700"
            : "flex-row items-center gap-3 bg-white dark:bg-ink-800 px-4 pb-3"
        }
        style={
          wide
            ? undefined
            : {
                paddingTop: insets.top + 12,
                // Same soft shadow as AppHeader's bottom edge, in place of a tinted border
                // line; zIndex keeps it drawn over the messages below.
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
                zIndex: 1,
              }
        }
      >
        {/* Deliberately not router.back(): a thread can be reached from outside its
            own stack (a push notification tap, a deep link), in which case there's
            nothing local to pop back to and it falls through to whatever the
            surrounding navigation history happens to be (e.g. the Circles tab) --
            replace with the thread list explicitly so this button's destination
            never depends on how the thread was opened. On desktop the list is
            always beside the thread (chat/_layout.tsx), so there's no button. */}
        {wide ? null : (
          <Pressable onPress={() => router.replace("/(app)/chat")}>
            <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
          </Pressable>
        )}
        <Pressable
          className="flex-1 flex-row items-center gap-3"
          onPress={() => {
            if (participant?.profile.id) router.replace(`/(app)/user/${participant.profile.id}?matchId=${matchId}`);
          }}
        >
          <Avatar uri={participant?.profile.avatar_url} name={participant?.profile.display_name} size={40} />
          <View>
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
              {participant?.profile.display_name || t("common.member")}
            </Text>
            {/* Also in the header, so it shows while reading further up the thread. */}
            {isOtherTyping ? (
              <Text className="-mt-0.5 text-xs font-medium text-primary-600 dark:text-primary-400">
                {t("chat.typing")}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {wide && participant?.profile.id ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/(app)/user/${participant.profile.id}?matchId=${matchId}`)}
            className="h-10 justify-center rounded-full border border-primary-100 px-4 web:hover:bg-primary-100/40 dark:border-ink-700 dark:web:hover:bg-ink-700"
          >
            <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {t("chat.viewProfile")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Lifts the message list and the input above the keyboard -- the input
          is pinned to the bottom, so without this the keyboard covers it. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          // The lighter cream behind the messages (rather than the page's) keeps the
          // pale bubbles visible -- the coral one all but vanished on the page color.
          className={
            wide ? "flex-1 bg-[#FFFAF4] px-6 pt-5 dark:bg-ink-900" : "flex-1 bg-[#FFFAF4] px-4 pt-4 dark:bg-ink-900"
          }
          contentContainerClassName="grow pb-4"
          // After the new content has laid out, not when the state changes: scrolling
          // from an effect ran before a new message or the typing bubble had any
          // height, stopping short and leaving it half behind the input bar.
          // Once positioned, only follow the end for a new message (yours always; theirs
          // if you're at the bottom) or, at the bottom, the typing bubble -- never for a
          // reaction bar or reaction appearing, which would yank an older bubble you
          // long-pressed out from under your finger.
          onContentSizeChange={() => {
            if (!messages) return;
            const last = messages[messages.length - 1];
            if (landedForRef.current !== matchId) {
              // First content for this thread: straight to the end, unseen.
              landedForRef.current = matchId ?? null;
              lastMessageIdRef.current = last?.id ?? null;
              settlingRef.current = true;
              setTimeout(() => {
                settlingRef.current = false;
              }, 1000);
              scrollRef.current?.scrollToEnd({ animated: false });
              if (!positioned) requestAnimationFrame(() => setPositionedFor(matchId ?? null));
              return;
            }
            const newMessage = !!last && last.id !== lastMessageIdRef.current;
            if (last) lastMessageIdRef.current = last.id;
            if (settlingRef.current) {
              scrollRef.current?.scrollToEnd({ animated: false });
            } else if (newMessage) {
              if (last.sender_id === userId || atBottomRef.current) scrollRef.current?.scrollToEnd({ animated: true });
            } else if (atBottomRef.current && !actionsFor) {
              // The typing bubble and the like: keep the end in view, instantly.
              scrollRef.current?.scrollToEnd({ animated: false });
            }
          }}
          // The keyboard opening (or the reply preview appearing) makes the list
          // shorter; keep the newest message in view rather than hidden behind it.
          onLayout={() => {
            if (atBottomRef.current) scrollRef.current?.scrollToEnd({ animated: false });
          }}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            atBottomRef.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
          }}
          scrollEventThrottle={32}
          style={{ opacity: positioned ? 1 : 0 }}
          onScrollBeginDrag={() => setActionsFor(null)}
        >
          {/* With the reaction bar open, a tap anywhere outside it -- empty space,
              another bubble, the message box -- closes it. Buttons inside (the bar,
              the bubbles) take their own taps first; this only gets the rest. */}
          <Pressable
            onPress={() => setActionsFor(null)}
            disabled={!actionsFor}
            accessible={false}
            className="grow gap-3"
            style={{ cursor: "auto" } as never}
          >
            {participant?.match ? (
              <Text className="text-center text-xs text-ink-400 dark:text-ink-300">
                {t("chat.youMatched", { date: format(new Date(participant.match.created_at), "MMM d") })}
              </Text>
            ) : null}

            {(messages ?? []).map((message, index, list) => {
              const isOwn = message.sender_id === userId;
              // A day divider above the first message of each day; runs don't cross it.
              const startsDay = !list[index - 1] || !sameDay(list[index - 1], message);
              const nextStartsDay = !!list[index + 1] && !sameDay(message, list[index + 1]);
              const joinsPrevious = !startsDay && sameRun(list[index - 1], message);
              const continues = !nextStartsDay && sameRun(message, list[index + 1]);
              const top = joinsPrevious ? RUN_RADIUS : BUBBLE_RADIUS;
              const bottom = continues ? RUN_RADIUS : 0;
              const corners = isOwn
                ? { borderRadius: BUBBLE_RADIUS, borderTopRightRadius: top, borderBottomRightRadius: bottom }
                : { borderRadius: BUBBLE_RADIUS, borderTopLeftRadius: top, borderBottomLeftRadius: bottom };
              const colors = BUBBLE_COLORS[isOwn ? "own" : "their"];
              const messageReactions = (reactions ?? []).filter((r) => r.messageId === message.id);
              const showHoverActions = wide && !isOwn && (hovered === message.id || actionsFor === message.id);
              const bubble = (
                <View
                  className="shrink"
                  style={[
                    corners,
                    {
                      backgroundColor: colors.background,
                      // Only the last bubble of a run casts a shadow, so the run sits on the
                      // page as one card -- one under each would show as a dark line in
                      // the 2px seam between them.
                      shadowColor: "#2B2320",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: continues ? 0 : 0.08,
                      shadowRadius: 2,
                      elevation: continues ? 0 : 1,
                    },
                  ]}
                >
                  {/* Yours has a faint top-to-bottom sheen; theirs stays flat. */}
                  {isOwn ? (
                    <LinearGradient
                      colors={["#C9E6E8", "#B2D8DB"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.4, y: 1 }}
                      style={[StyleSheet.absoluteFill, corners]}
                    />
                  ) : null}
                  {/* The last bubble of a run ends in a small flick toward its sender. */}
                  {!continues ? (
                    // Its shadow is drawn in (a faint copy 1px lower, like the bubble's own
                    // shadow): Android's elevation can only shade a rectangle.
                    <Svg
                      width={TAIL_WIDTH}
                      height={TAIL_HEIGHT + TAIL_SHADOW_ROOM}
                      viewBox={`0 0 ${TAIL_WIDTH} ${TAIL_HEIGHT + TAIL_SHADOW_ROOM}`}
                      style={{
                        position: "absolute",
                        bottom: -TAIL_SHADOW_ROOM,
                        [isOwn ? "right" : "left"]: -TAIL_WIDTH + 1,
                      }}
                      aria-hidden
                    >
                      <Path
                        d={isOwn ? TAIL_PATH_OWN : TAIL_PATH_THEIRS}
                        fill="#2B2320"
                        opacity={0.06}
                        transform="translate(0 1)"
                      />
                      <Path
                        d={isOwn ? TAIL_PATH_OWN : TAIL_PATH_THEIRS}
                        fill="#2B2320"
                        opacity={0.04}
                        transform="translate(0 2)"
                      />
                      <Path d={isOwn ? TAIL_PATH_OWN : TAIL_PATH_THEIRS} fill={colors.tail} />
                    </Svg>
                  ) : null}
                  <View className="px-4 py-3">
                    {message.reply_to_id ? renderQuote(message.reply_to_id, isOwn) : null}
                    <MessageText body={message.body} color={colors.text} />
                  </View>
                  {/* Reactions sit on the bubble's bottom corner, like most chat apps --
                      just the emoji, no badge behind them. */}
                  {messageReactions.length > 0 ? (
                    // 20px tall and 10px below: the bubble's bottom edge runs through
                    // the middle of the emoji.
                    <View className={`absolute -bottom-2.5 flex-row px-1.5 ${isOwn ? "left-2" : "right-2"}`}>
                      {messageReactions.map((r) => (
                        <View key={r.userId} className="h-5 w-5 items-center justify-center">
                          <ReactionEmoji emoji={r.emoji} size={18} />
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
              return (
                <Fragment key={message.id}>
                {startsDay ? (
                  // A hairline either side of the label, fading out toward the edges.
                  <View className="flex-row items-center gap-3 px-2 pt-2">
                    <LinearGradient
                      colors={["rgba(169,156,149,0)", "rgba(169,156,149,0.55)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1, height: StyleSheet.hairlineWidth * 2 }}
                    />
                    <Text accessibilityRole="header" className="text-xs font-medium text-ink-400 dark:text-ink-300">
                      {dayLabel(new Date(message.created_at), new Date(), i18n.language, {
                        today: t("chat.today"),
                        yesterday: t("chat.yesterday"),
                      })}
                    </Text>
                    <LinearGradient
                      colors={["rgba(169,156,149,0.55)", "rgba(169,156,149,0)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1, height: StyleSheet.hairlineWidth * 2 }}
                    />
                  </View>
                ) : null}
                <View
                  // gap-3 between messages; a run's bubbles sit 2px apart instead.
                  className={`${isOwn ? "items-end" : "items-start"} ${joinsPrevious ? "-mt-2.5" : ""}`}
                  // Above its neighbours while its reaction bar is open, which overlaps them.
                  style={actionsFor === message.id ? { zIndex: 10, elevation: 5 } : undefined}
                >
                  {actionsFor === message.id ? renderReactionBar(message, index === 0) : null}
                  {/* Yours in pale turquoise, theirs in pale coral -- light tints rather
                    than solid brand colors, so a long thread is calm to read. Only the
                    other person's can be
                    reacted to or replied to: long-press on a phone, hover on desktop. */}
                  <View className={`flex-row items-center gap-1.5 ${wide ? "max-w-[60%]" : "max-w-[80%]"}`}>
                    {isOwn ? (
                      bubble
                    ) : (
                      <Pressable
                        onLongPress={() => setActionsFor(actionsFor === message.id ? null : message.id)}
                        // A plain tap on any bubble closes an open reaction bar.
                        onPress={() => setActionsFor(null)}
                        delayLongPress={300}
                        onHoverIn={() => setHovered(message.id)}
                        onHoverOut={() => setHovered((id) => (id === message.id ? null : id))}
                        className="shrink"
                      >
                        {bubble}
                      </Pressable>
                    )}
                    {!isOwn && wide ? (
                      <View
                        className="flex-row gap-1"
                        style={{ opacity: showHoverActions ? 1 : 0 }}
                        onPointerEnter={() => setHovered(message.id)}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("chat.react")}
                          onPress={() => setActionsFor(actionsFor === message.id ? null : message.id)}
                          className="h-8 w-8 items-center justify-center rounded-full web:hover:bg-white dark:web:hover:bg-ink-800"
                        >
                          <Ionicons name="happy-outline" size={18} color="#8A7C76" />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("chat.reply")}
                          onPress={() => startReply(message)}
                          className="h-8 w-8 items-center justify-center rounded-full web:hover:bg-white dark:web:hover:bg-ink-800"
                        >
                          <Ionicons name="arrow-undo-outline" size={18} color="#8A7C76" />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  {/* The time (and your read ticks) only under the last bubble of a run; an
                      earlier one with reactions keeps room for its badge. */}
                  {continues ? (
                    messageReactions.length > 0 ? <View className="h-3" /> : null
                  ) : (
                    <View className={`flex-row items-center gap-1 ${messageReactions.length > 0 ? "mt-3" : "mt-1"}`}>
                      <Text className="text-xs text-ink-400 dark:text-ink-300">{format(new Date(message.created_at), "h:mm a")}</Text>
                      {isOwn ? <MessageStatus status={messageStatus(message)} /> : null}
                    </View>
                  )}
                </View>
                </Fragment>
              );
            })}

            {isOtherTyping ? <TypingDots /> : null}
          </Pressable>
        </ScrollView>

        {showContactTip ? (
          <View
            accessibilityRole="alert"
            className={`flex-row items-center gap-3 bg-primary-100/60 dark:bg-ink-800 ${
              wide ? "border-t border-[#F3E3D2] px-6 py-3 dark:border-ink-700" : "mx-4 mt-2 rounded-2xl px-4 py-2.5"
            }`}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#127A87" />
            <Text className="flex-1 text-sm text-ink-700 dark:text-ink-200">{t("chat.contactTip")}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.dismissTip")}
              hitSlop={8}
              onPress={() => setContactTipDismissed(true)}
              className="h-8 w-8 items-center justify-center rounded-full web:hover:bg-primary-100/40"
            >
              <Ionicons name="close" size={18} color="#4A3F3A" />
            </Pressable>
          </View>
        ) : null}

        {replyTo ? (
          <View
            className={`flex-row items-center gap-3 bg-white dark:bg-ink-800 ${
              wide ? "border-t border-[#F3E3D2] px-6 pt-3 dark:border-ink-700" : "mx-4 mt-2 rounded-2xl px-4 py-2.5"
            }`}
          >
            <View className="flex-1 border-l-4 border-accent-500 pl-3">
              <Text className="text-xs font-semibold text-accent-600">{t("chat.replyingTo", { name: otherName })}</Text>
              <Text className="text-sm text-ink-700 dark:text-ink-200" numberOfLines={1}>
                {replyTo.body}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.cancelReply")}
              hitSlop={8}
              onPress={() => setReplyTo(null)}
              className="h-8 w-8 items-center justify-center rounded-full web:hover:bg-primary-100/40"
            >
              <Ionicons name="close" size={18} color="#4A3F3A" />
            </Pressable>
          </View>
        ) : null}

        {wide ? (
          <View
            className={`flex-row items-center gap-2.5 px-6 py-4 ${
              replyTo || showContactTip ? "" : "border-t border-[#F3E3D2] dark:border-ink-700"
            }`}
          >
            <TextInput
              className="h-[46px] flex-1 rounded-full border border-ink-100 bg-white px-[18px] text-base text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50"
              style={{ outlineStyle: "none" } as never}
              placeholder={t("chat.typeMessage")}
              placeholderTextColor={placeholderColor}
              value={draft}
              onChangeText={onDraftChange}
              onFocus={() => setActionsFor(null)}
              onSubmitEditing={onSend}
            />
            <Pressable
              accessibilityLabel={t("chat.send")}
              disabled={!draft.trim()}
              className={`h-[46px] w-[46px] items-center justify-center rounded-full ${draft.trim() ? "bg-primary-500" : "bg-primary-100 dark:bg-ink-700"}`}
              onPress={onSend}
            >
              <Ionicons name="paper-plane-outline" size={20} color="white" />
            </Pressable>
          </View>
        ) : (
          <View className="px-4 pb-4 pt-2">
            <View
              className="flex-row items-center gap-2 rounded-full bg-white dark:bg-ink-800 py-2 pl-4 pr-2"
              style={{
                shadowColor: "#000000",
                // iOS (and web) draw the shadow from these; tuned to match Android's elevation 3.
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.16,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <TextInput
                className="flex-1 text-base text-ink-900 dark:text-ink-50"
                // This is the first bare, borderless TextInput in the app (every other
                // one sits inside TextField's own bordered box, which already masks the
                // browser's default focus ring) -- react-native-web's outlineStyle prop
                // suppresses that ring, keeping the pill's edge clean when focused.
                // lineHeight 0 on iOS: its fixed line height (from text-base) clips the tail of g/y/p.
                style={{ outlineStyle: "none", ...(Platform.OS === "ios" ? { lineHeight: 0 } : null) } as never}
                placeholder={t("chat.typeMessage")}
                placeholderTextColor={placeholderColor}
                value={draft}
                onChangeText={onDraftChange}
                onFocus={() => setActionsFor(null)}
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
