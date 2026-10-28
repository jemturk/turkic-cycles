import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Chip } from "@/components/Chip";
import { useMyConnectionFeedback, useSaveConnectionFeedback } from "@/hooks/useChat";

const ASK_AFTER_DAYS = 3;
const ASK_AGAIN_AFTER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// Above the message box, a few days into a connection: "Did you two meet or talk?" and,
// if so, how and how it was (1-5) -- the outcomes the matching weights will be refit
// from (connection_feedback). "Not yet" asks again two weeks later; the x hides it for
// this visit.
export function ConnectionFeedbackPrompt({
  matchId,
  userId,
  otherUserId,
  matchCreatedAt,
  wide,
}: {
  matchId: string | undefined;
  userId: string | undefined;
  otherUserId: string | undefined;
  matchCreatedAt: string | undefined;
  wide: boolean;
}) {
  const { t } = useTranslation();
  const { data: feedback, isLoading } = useMyConnectionFeedback(matchId, userId);
  const save = useSaveConnectionFeedback(matchId, userId, otherUserId);
  const [step, setStep] = useState<"ask" | "format" | "rate">("ask");
  const [format, setFormat] = useState<"in_person" | "virtual">();
  const [hidden, setHidden] = useState(false);
  // When the chat opened: whether it's time to ask is decided once, not on every render.
  const [now] = useState(() => Date.now());

  const due =
    !!matchCreatedAt &&
    now - new Date(matchCreatedAt).getTime() > ASK_AFTER_DAYS * DAY_MS &&
    (feedback === null || (feedback !== undefined && !feedback.met && now - new Date(feedback.updatedAt).getTime() > ASK_AGAIN_AFTER_DAYS * DAY_MS));
  if (hidden || isLoading || !due || !otherUserId) return null;

  return (
    <View
      className={`gap-2 bg-gold-100/70 dark:bg-ink-800 ${
        wide ? "border-t border-[#F3E3D2] px-6 py-3 dark:border-ink-700" : "mx-4 mt-2 rounded-2xl px-4 py-3"
      }`}
    >
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-sm font-medium text-ink-900 dark:text-ink-50">
          {step === "ask" ? t("feedback.metQuestion") : step === "format" ? t("feedback.formatQuestion") : t("feedback.ratingQuestion")}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t("feedback.notNow")} hitSlop={8} onPress={() => setHidden(true)}>
          <Ionicons name="close" size={18} color="#7A6E68" />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {step === "ask" ? (
          <>
            <Chip label={t("feedback.yes")} selected={false} onPress={() => setStep("format")} />
            <Chip label={t("feedback.notYet")} selected={false} disabled={save.isPending} onPress={() => save.mutate({ met: false })} />
          </>
        ) : step === "format" ? (
          (["in_person", "virtual"] as const).map((value) => (
            <Chip
              key={value}
              label={t(`constants.meetingFormats.${value}`)}
              selected={format === value}
              onPress={() => {
                setFormat(value);
                setStep("rate");
              }}
            />
          ))
        ) : (
          [1, 2, 3, 4, 5].map((rating) => (
            <Chip
              key={rating}
              label={`${rating} ★`}
              selected={false}
              disabled={save.isPending}
              onPress={() => save.mutate({ met: true, metFormat: format, rating }, { onSuccess: () => setHidden(true) })}
            />
          ))
        )}
      </View>
    </View>
  );
}
