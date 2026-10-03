import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import {
  useCircle,
  useCircleEvent,
  useCircleMembers,
  useJoinCircle,
  useLeaveCircle,
  useMyCircleMemberships,
  useMyRsvp,
  useUpsertRsvp,
} from "@/hooks/useCircles";
import { RSVP_STATUSES, type CircleTopic, type RsvpStatus } from "@/constants/circles";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { SingleSelectChips } from "@/components/SingleSelectChips";
import { Avatar } from "@/components/Avatar";
import { CircleHeader } from "@/components/CircleHeader";

const MEMBERS_PREVIEW_COUNT = 6;

export default function CircleEventDetail() {
  const { t } = useTranslation();
  const { circleId, eventId } = useLocalSearchParams<{ circleId: string; eventId: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const navigation = useRouter();

  // Reachable via a direct URL/refresh on web (e.g. a shared link), which has no
  // in-app history to pop -- router.back() would then silently no-op. Fall back to
  // the circle's events list instead of assuming a push always happened first.
  function goBack() {
    if (navigation.canGoBack()) router.back();
    else router.replace(`/(app)/circles/${circleId}`);
  }

  const { data: circle } = useCircle(circleId);
  const { data: memberships } = useMyCircleMemberships(userId);
  const { data: event } = useCircleEvent(eventId);
  const { data: rsvp } = useMyRsvp(event?.id, userId);
  const { data: membersPreview } = useCircleMembers(circleId, MEMBERS_PREVIEW_COUNT);
  const joinCircle = useJoinCircle(userId);
  const leaveCircle = useLeaveCircle(userId);
  const upsertRsvp = useUpsertRsvp(event?.id, userId);

  if (!circle) return null;

  const topic = circle.topic as CircleTopic;
  const isJoined = (memberships ?? []).includes(circle.id);
  const location = [circle.city, circle.state, circle.country].filter(Boolean).join(", ");

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950" edges={["left", "right"]}>
      <CircleHeader name={circle.name} topic={topic} onBack={goBack} />

      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-10 pt-4">
        <View className="gap-4 px-6">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-sm text-ink-400">
              {t("circles.membersCount", { count: circle.member_count })}
              {location ? ` · ${location}` : ""}
            </Text>
            <Chip
              label={isJoined ? t("circles.joined") : t("circles.join")}
              selected={isJoined}
              disabled={joinCircle.isPending || leaveCircle.isPending}
              onPress={() => {
                if (isJoined) leaveCircle.mutate(circle.id);
                else joinCircle.mutate(circle.id);
              }}
            />
          </View>

          {circle.description ? <Text className="text-base text-ink-700 dark:text-ink-200">{circle.description}</Text> : null}

          {event ? (
            <View className="gap-3 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
              <Text className="font-display text-lg text-ink-900 dark:text-ink-50">{event.title}</Text>
              <Text className="text-sm text-ink-700 dark:text-ink-200">
                {format(new Date(event.starts_at), "EEE, MMM d · h:mm a")}
                {event.location ? ` · ${event.location}` : ""}
              </Text>
              <SingleSelectChips
                label={t("circles.rsvpLabel")}
                options={RSVP_STATUSES.map((s) => ({ value: s.value, label: t(`circles.rsvp.${s.value}`) }))}
                // event_rsvps.status is a text+check column (project convention, no
                // native Postgres enum), so the generated type is plain `string`;
                // the check constraint guarantees it's actually one of the 3 values.
                value={rsvp?.status as RsvpStatus | undefined}
                onChange={(status) => upsertRsvp.mutate(status)}
              />
            </View>
          ) : null}

          {membersPreview && membersPreview.length > 0 ? (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("circles.members")}</Text>
                <Pressable onPress={() => router.push(`/(app)/circles/${circle.id}/members`)}>
                  <Text className="text-sm font-medium text-coral-600">
                    {t("circles.seeAll", { count: circle.member_count })}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-4">
                {membersPreview.map((member) => (
                  <Pressable
                    key={member.userId}
                    className="items-center gap-1"
                    style={{ width: 56 }}
                    onPress={() => router.replace(`/(app)/user/${member.userId}`)}
                  >
                    <Avatar uri={member.avatarUrl} name={member.displayName} size={48} />
                    <Text className="text-xs text-ink-700 dark:text-ink-200" numberOfLines={1}>
                      {member.displayName || t("common.member")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View className="mt-2">
            <Button label={t("circles.meetMembers")} onPress={() => router.push(`/(app)/circles/${circle.id}/discover`)} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
