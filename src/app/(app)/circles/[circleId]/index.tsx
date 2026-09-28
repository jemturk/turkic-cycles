import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

import { useSession } from "@/hooks/useSession";
import {
  useCircle,
  useCircleMembers,
  useJoinCircle,
  useLeaveCircle,
  useMyCircleMemberships,
  useMyRsvp,
  useNextCircleEvent,
  useUpsertRsvp,
} from "@/hooks/useCircles";
import {
  CIRCLE_TOPIC_COLORS,
  CIRCLE_TOPIC_ICONS,
  RSVP_STATUSES,
  type CircleTopic,
  type RsvpStatus,
} from "@/constants/circles";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { SingleSelectChips } from "@/components/SingleSelectChips";

const MEMBERS_PREVIEW_COUNT = 6;

export default function CircleDetail() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const navigation = useRouter();

  // Reachable via a direct URL/refresh on web (e.g. a shared link), which has no
  // in-app history to pop -- router.back() would then silently no-op. Same class of
  // bug as the onboarding step-1 back button fixed earlier: fall back to the circles
  // list instead of assuming a push always happened first.
  function goBack() {
    if (navigation.canGoBack()) router.back();
    else router.replace("/(app)/circles");
  }

  const { data: circle } = useCircle(circleId);
  const { data: memberships } = useMyCircleMemberships(userId);
  const { data: event } = useNextCircleEvent(circleId);
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
    <SafeAreaView className="flex-1 bg-coral-50" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-10">
        <View className={`h-16 flex-row items-center gap-3 px-6 ${CIRCLE_TOPIC_COLORS[topic].bg}`}>
          <Pressable onPress={goBack}>
            <Ionicons name="chevron-back" size={24} color="#2B2320" />
          </Pressable>
          <View className="rounded-xl bg-white/70 p-2">
            <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={28} color={CIRCLE_TOPIC_COLORS[topic].fg} />
          </View>
        </View>

        <View className="gap-4 px-6">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 font-display text-2xl text-ink-900">{circle.name}</Text>
            <Chip
              label={isJoined ? "Joined" : "Join"}
              selected={isJoined}
              disabled={joinCircle.isPending || leaveCircle.isPending}
              onPress={() => {
                if (isJoined) leaveCircle.mutate(circle.id);
                else joinCircle.mutate(circle.id);
              }}
            />
          </View>

          <Text className="text-sm text-ink-400">
            {circle.member_count} members{location ? ` · ${location}` : ""}
          </Text>

          {circle.description ? <Text className="text-base text-ink-700">{circle.description}</Text> : null}

          {event ? (
            <View className="gap-3 rounded-2xl border border-coral-100 bg-white p-4">
              <Text className="font-display text-lg text-ink-900">{event.title}</Text>
              <Text className="text-sm text-ink-700">
                {format(new Date(event.starts_at), "EEE, MMM d · h:mm a")}
                {event.location ? ` · ${event.location}` : ""}
              </Text>
              <SingleSelectChips
                label="RSVP"
                options={RSVP_STATUSES}
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
                <Text className="text-sm font-medium text-ink-700">Members</Text>
                <Pressable onPress={() => router.push(`/(app)/circles/${circle.id}/members`)}>
                  <Text className="text-sm font-medium text-coral-600">See all {circle.member_count}</Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-4">
                {membersPreview.map((member) => (
                  <Pressable
                    key={member.userId}
                    className="items-center gap-1"
                    style={{ width: 56 }}
                    onPress={() => router.push(`/(app)/profile/${member.userId}`)}
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-coral-500">
                      <Text className="text-base font-semibold text-white">
                        {(member.displayName || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-xs text-ink-700" numberOfLines={1}>
                      {member.displayName || "Member"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View className="mt-2">
            <Button label="Meet members" onPress={() => router.push(`/(app)/circles/${circle.id}/discover`)} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
