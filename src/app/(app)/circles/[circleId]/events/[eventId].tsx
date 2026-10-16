import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import {
  useCircle,
  useCircleEvent,
  useCircleMembers,
  useJoinCircle,
  useMyCircleMemberships,
  useMyRsvp,
  useUpsertRsvp,
} from "@/hooks/useCircles";
import {
  CIRCLE_TOPIC_COLORS,
  CIRCLE_TOPIC_ICONS,
  RSVP_STATUSES,
  type CircleTopic,
  type RsvpStatus,
} from "@/constants/circles";
import { SingleSelectChips } from "@/components/SingleSelectChips";
import { Avatar } from "@/components/Avatar";
import { CircleHeader } from "@/components/CircleHeader";
import { useWideLayout } from "@/hooks/useWideLayout";
import { Group, Item } from "@/components/SettingsUI";

const MEMBERS_PREVIEW_COUNT = 6;

// Each RSVP choice's icon in the phone's grouped list.
const RSVP_ICONS: Record<RsvpStatus, keyof typeof Ionicons.glyphMap> = {
  going: "checkmark-circle-outline",
  interested: "star-outline",
  not_going: "close-circle-outline",
};

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
  const upsertRsvp = useUpsertRsvp(event?.id, userId);
  const wide = useWideLayout();

  if (!circle) return null;

  const topic = circle.topic as CircleTopic;
  const isJoined = (memberships ?? []).includes(circle.id);
  const location = [circle.city, circle.state, circle.country].filter(Boolean).join(", ");

  const rsvpChips = (
    <SingleSelectChips
      label={t("circles.rsvpLabel")}
      options={RSVP_STATUSES.map((s) => ({ value: s.value, label: t(`circles.rsvp.${s.value}`) }))}
      // event_rsvps.status is a text+check column (project convention, no
      // native Postgres enum), so the generated type is plain `string`;
      // the check constraint guarantees it's actually one of the 3 values.
      value={rsvp?.status as RsvpStatus | undefined}
      onChange={(status) => upsertRsvp.mutate(status)}
    />
  );

  // Desktop web: a large title row like the circle's own page, the event on the
  // left (a date tile in the circle's topic colors, when and where, the
  // description, RSVP) and the circle on the right (Join, members, Meet members).
  if (wide) {
    const colors = CIRCLE_TOPIC_COLORS[topic];
    const startsAt = event ? new Date(event.starts_at) : null;
    return (
      <ScrollView
        className="flex-1 bg-primary-50 dark:bg-ink-950"
        contentContainerClassName="gap-6 px-20 pb-10 pt-9"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityLabel={t("common.back")}
            hitSlop={8}
            onPress={goBack}
            className="h-10 w-10 items-center justify-center rounded-full web:hover:bg-white dark:web:hover:bg-ink-800"
          >
            <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
          </Pressable>
          <View className={`h-14 w-14 items-center justify-center rounded-2xl ${colors.bg}`}>
            <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={26} color={colors.fg} />
          </View>
          <View className="flex-1 gap-1">
            <Text className="font-display text-4xl text-ink-900 dark:text-ink-50" numberOfLines={1}>
              {event?.title ?? circle.name}
            </Text>
            <Text className="text-sm text-ink-400">{circle.name}</Text>
          </View>
        </View>

        <View className="flex-row items-start gap-6">
          <View className="max-w-[720px] flex-1 gap-4">
            {event && startsAt ? (
              <View className="gap-5 rounded-[22px] bg-white p-6 dark:bg-ink-800">
                <View className="flex-row items-center gap-5">
                  <View className={`h-[76px] w-[72px] items-center justify-center rounded-2xl ${colors.bg}`}>
                    <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.fg }}>
                      {format(startsAt, "MMM")}
                    </Text>
                    <Text className="text-3xl font-bold" style={{ color: colors.fg }}>
                      {format(startsAt, "d")}
                    </Text>
                  </View>
                  <View className="flex-1 gap-2">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="time-outline" size={18} color="#4A3F3A" />
                      <Text className="text-base text-ink-900 dark:text-ink-50">
                        {format(startsAt, "EEEE, MMMM d · h:mm a")}
                      </Text>
                    </View>
                    {event.location ? (
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="location-outline" size={18} color="#4A3F3A" />
                        <Text className="text-base text-ink-900 dark:text-ink-50">{event.location}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {event.description ? (
                  <Text className="text-base text-ink-700 dark:text-ink-200">{event.description}</Text>
                ) : null}
                <View className="border-t border-primary-50 pt-4 dark:border-ink-700">{rsvpChips}</View>
              </View>
            ) : null}
          </View>

          <View className="w-[360px] gap-4">
            <View className="gap-4 rounded-[22px] bg-white p-5 dark:bg-ink-800">
              <View className="flex-row items-center gap-3">
                <View className={`h-11 w-11 items-center justify-center rounded-[14px] ${colors.bg}`}>
                  <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={20} color={colors.fg} />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-xl text-ink-900 dark:text-ink-50" numberOfLines={1}>
                    {circle.name}
                  </Text>
                  <Text className="text-[13px] text-ink-400" numberOfLines={1}>
                    {[t("circles.membersCount", { count: circle.member_count }), location].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </View>
              {circle.description ? (
                <Text className="text-sm text-ink-700 dark:text-ink-200">{circle.description}</Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={isJoined || joinCircle.isPending}
                onPress={() => {
                  // Joined is a status, not a button: leaving is in the circle page's ⋯ menu.
                  if (!isJoined) joinCircle.mutate(circle.id);
                }}
                className={`h-11 flex-row items-center justify-center gap-1.5 rounded-2xl ${
                  isJoined
                    ? "border border-primary-100 web:hover:bg-primary-100/40 dark:border-ink-700"
                    : "bg-primary-500 web:hover:bg-primary-600"
                }`}
              >
                {isJoined ? <Ionicons name="checkmark" size={18} color="#127A87" /> : null}
                <Text className={`font-semibold ${isJoined ? "text-primary-600 dark:text-primary-400" : "text-white"}`}>
                  {isJoined ? t("circles.joined") : t("circles.join")}
                </Text>
              </Pressable>
            </View>

            {membersPreview && membersPreview.length > 0 ? (
              <View className="gap-3 rounded-[22px] bg-white p-5 dark:bg-ink-800">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("circles.members")}</Text>
                  <Pressable onPress={() => router.push(`/(app)/circles/${circle.id}/members`)}>
                    <Text className="text-sm font-medium text-primary-600">
                      {t("circles.seeAll", { count: circle.member_count })}
                    </Text>
                  </Pressable>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  {membersPreview.map((member) => (
                    <Pressable
                      key={member.userId}
                      className="items-center gap-1"
                      style={{ width: 92 }}
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

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/(app)/circles/${circle.id}/discover`)}
              className="h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-500 web:hover:bg-primary-600"
            >
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              <Text className="font-semibold text-white">{t("circles.meetMembers")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <CircleHeader name={circle.name} topic={topic} onBack={goBack} />

      {/* Settings-style grouped cards: the event's details, RSVP as a choice of rows,
          the circle, and its members ending with Meet members. */}
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-10 pt-4">
        {event ? (
          <>
            <View className="gap-0.5 px-1">
              <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">{event.title}</Text>
              <Text className="text-sm text-ink-400">{circle.name}</Text>
            </View>

            <Group>
              <Item icon="calendar-outline" title={format(new Date(event.starts_at), "EEEE, MMMM d")} />
              <Item icon="time-outline" title={format(new Date(event.starts_at), "h:mm a")} />
              {event.location ? <Item icon="location-outline" title={event.location} /> : null}
              {event.description ? <Item icon="document-text-outline" title={event.description} /> : null}
            </Group>

            <Group title={t("circles.rsvpLabel")}>
              {RSVP_STATUSES.map((status) => {
                const chosen = rsvp?.status === status.value;
                return (
                  <Item
                    key={status.value}
                    icon={RSVP_ICONS[status.value]}
                    title={t(`circles.rsvp.${status.value}`)}
                    bold={chosen}
                    onPress={() => upsertRsvp.mutate(status.value)}
                    right={chosen ? <Ionicons name="checkmark" size={20} color="#127A87" /> : <View />}
                  />
                );
              })}
            </Group>
          </>
        ) : null}

        <Group>
          <Item
            leading={
              <View className={`h-9 w-9 items-center justify-center rounded-lg ${CIRCLE_TOPIC_COLORS[topic].bg}`}>
                <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={20} color={CIRCLE_TOPIC_COLORS[topic].fg} />
              </View>
            }
            title={circle.name}
            subtitle={[t("circles.membersCount", { count: circle.member_count }), location].filter(Boolean).join(" · ")}
            right={
              isJoined ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="checkmark" size={16} color="#127A87" />
                  <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {t("circles.joined")}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={joinCircle.isPending}
                  onPress={() => joinCircle.mutate(circle.id)}
                  className="h-9 justify-center rounded-full bg-primary-500 px-4"
                >
                  <Text className="text-sm font-semibold text-white">{t("circles.join")}</Text>
                </Pressable>
              )
            }
          />
          {circle.description ? <Item icon="information-circle-outline" title={circle.description} /> : null}
        </Group>

        <Group title={t("circles.members")}>
          {(membersPreview ?? []).map((member) => (
            <Item
              key={member.userId}
              leading={<Avatar uri={member.avatarUrl} name={member.displayName} size={36} />}
              title={member.displayName || t("common.member")}
              onPress={() => router.replace(`/(app)/user/${member.userId}`)}
            />
          ))}
          {circle.member_count > (membersPreview?.length ?? 0) ? (
            <Item
              icon="people-outline"
              title={t("circles.seeAll", { count: circle.member_count })}
              onPress={() => router.push(`/(app)/circles/${circle.id}/members`)}
            />
          ) : null}
          <Item
            icon="sparkles-outline"
            solid
            title={t("circles.meetMembers")}
            onPress={() => router.push(`/(app)/circles/${circle.id}/discover`)}
          />
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}
