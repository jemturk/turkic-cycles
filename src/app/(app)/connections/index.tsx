import { useEffect, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { EmptyState } from "@/components/EmptyState";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMessageThreads, useNewConnections } from "@/hooks/useChat";
import { useSavedPeople } from "@/hooks/useDiscover";
import { useHasPlus, useIncomingLikes, useIncomingLikesCount } from "@/hooks/usePlus";
import { calculateAge } from "@/lib/age";
import { Avatar } from "@/components/Avatar";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";
import { Button } from "@/components/Button";
import { EXPANDING_TABS_DURATION, ExpandingTabs } from "@/components/ExpandingTabs";
import { useWideLayout } from "@/hooks/useWideLayout";
import { useSearchOverlay } from "@/stores/searchOverlay";
import { DesktopPersonCard } from "@/components/DesktopPersonCard";
import type { MatchWithParticipant, MessageThread } from "@/api/chat";
import type { SavedPerson } from "@/api/discover";

type Tab = "matched" | "connected" | "saved" | "likes";

const TABS: { value: Tab; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "matched", icon: "flash" },
  { value: "connected", icon: "chatbubbles" },
  { value: "saved", icon: "star" },
  { value: "likes", icon: "heart" },
];

// What a card shows -- matches and saved people both carry these fields.
type PersonCardData = Pick<
  MatchWithParticipant,
  | "otherDisplayName"
  | "otherAvatarUrl"
  | "otherBirthdate"
  | "otherCity"
  | "otherState"
  | "otherCountry"
  | "otherCoverPhotoUrl"
>;

const GRID_GAP = 12;
const GRID_COLUMNS = 2;
// Desktop web: the Discover grid's sizes (DiscoverGrid) -- cards between these
// widths, at most 4 to a row, so a wide window gets room beside the grid rather
// than ever-bigger cards.
const WIDE_GRID_GAP = 20;
const WIDE_MIN_CARD_WIDTH = 260;
const WIDE_MAX_CARD_WIDTH = 300;
const WIDE_MAX_COLUMNS = 4;
const WIDE_CARD_ASPECT = 5 / 4;
// Placeholder cards behind the Likes teaser. Deliberately not their real photos,
// blurred: the server never sends a free user who liked them, so there's nothing
// to un-blur.
const TEASER_CARDS = 4;

function PersonCard({
  person,
  width,
  unreadCount,
  onPress,
  onQuickChat,
  wide = false,
}: {
  person: PersonCardData;
  width: number;
  unreadCount?: number;
  onPress: () => void;
  onQuickChat?: () => void;
  wide?: boolean;
}) {
  const { t } = useTranslation();

  // Desktop web: the same card as on Discover (DesktopPersonCard), with the quick
  // chat button and unread dot as one of Discover's frosted corner buttons.
  if (wide) {
    return (
      <Pressable
        style={{ width, height: Math.round(width * WIDE_CARD_ASPECT) }}
        onPress={onPress}
        className="rounded-3xl web:hover:shadow-md"
      >
        <DesktopPersonCard
          person={{
            displayName: person.otherDisplayName,
            avatarUrl: person.otherAvatarUrl,
            birthdate: person.otherBirthdate,
            city: person.otherCity,
            state: person.otherState,
            occupation: null,
            connectionTypes: [],
            coverPhotoUrl: person.otherCoverPhotoUrl,
          }}
          verificationStatus={null}
        />
        {onQuickChat ? (
          <Pressable
            accessibilityLabel={t("connections.connected")}
            onPress={(e) => {
              e.stopPropagation();
              onQuickChat();
            }}
            className="absolute right-3 top-3 h-[38px] w-[38px] items-center justify-center rounded-full bg-white/70 web:hover:bg-white dark:bg-ink-800/70 dark:web:hover:bg-ink-800"
            style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#127A87" />
            {unreadCount ? (
              <View className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent-500" />
            ) : null}
          </Pressable>
        ) : unreadCount ? (
          <View className="absolute right-3 top-3 h-3 w-3 rounded-full border-2 border-white bg-accent-500" />
        ) : null}
      </Pressable>
    );
  }

  const age = person.otherBirthdate ? calculateAge(person.otherBirthdate) : undefined;
  const location = [person.otherCity, person.otherState, person.otherCountry].filter(Boolean).join(", ");
  const meta = [age ? `${age}` : null, location || null].filter(Boolean).join(" · ");

  const cover = person.otherCoverPhotoUrl;

  return (
    <Pressable
      className="items-center justify-center gap-2 overflow-hidden rounded-2xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-2 web:hover:shadow-md"
      // An explicit height, not aspectRatio: in the wrapping row, the row's default
      // stretch alignment overrode aspectRatio, so cards were only as tall as their
      // text band and came out wide rather than square.
      style={{ width, height: width }}
      onPress={onPress}
    >
      {cover ? (
        <>
          {/* Same idea as the Discover card: their first gallery photo fills the
              card, a dark band keeps the text readable, and the profile picture
              moves to a corner. */}
          <Image
            source={{ uri: cover }}
            resizeMode="cover"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            accessibilityIgnoresInvertColors
          />
          <View className="absolute left-2 top-2 rounded-full border-2 border-white">
            <Avatar uri={person.otherAvatarUrl} name={person.otherDisplayName} size={32} />
          </View>
          <View className="absolute bottom-0 left-0 right-0 gap-0.5 bg-ink-950/55 px-2.5 py-2">
            <Text className="font-display text-sm text-white" numberOfLines={1}>
              {person.otherDisplayName}
            </Text>
            {meta ? (
              <Text className="text-xs text-white/85" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Avatar uri={person.otherAvatarUrl} name={person.otherDisplayName} size={56} />

          {/* w-full is load-bearing: with the Pressable's own items-center, a shrink-
              wrapped child never gets a bounded width to truncate against, so long
              content (e.g. "Apex, NC, United States") renders past the card's edge
              instead of ellipsizing. */}
          <View className="w-full items-center gap-0.5 px-1">
            <Text className="font-display text-sm text-ink-900 dark:text-ink-50" numberOfLines={1}>
              {person.otherDisplayName}
            </Text>
            {meta ? (
              <Text className="text-xs text-ink-400 dark:text-ink-300" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
        </>
      )}

      {unreadCount && !onQuickChat ? (
        <View className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border border-white bg-accent-500" />
      ) : null}

      {/* Top corner, not bottom: the square card has spare room above the avatar,
          while the bottom corner sits on the meta line and covers the location.
          The unread dot rides on this button so the two don't fight for the corner. */}
      {onQuickChat ? (
        <Pressable
          accessibilityLabel={t("connections.connected")}
          hitSlop={8}
          className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-primary-50 dark:bg-ink-700"
          onPress={(e) => {
            e.stopPropagation();
            onQuickChat();
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} className="text-primary-500" />
          {unreadCount ? (
            <View className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-accent-500 dark:border-ink-800" />
          ) : null}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

// Desktop web's tab row, at the top: every tab has room for its label and count, so
// there's no need for ExpandingTabs' collapsing pill.
function DesktopTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: Tab; icon: keyof typeof Ionicons.glyphMap; label: string; count: number }[];
  value: Tab;
  onChange: (value: Tab) => void;
}) {
  return (
    <View accessibilityRole="tablist" className="flex-row flex-wrap gap-2">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            role="tab"
            aria-selected={selected}
            onPress={() => onChange(tab.value)}
            className={`h-10 flex-row items-center gap-2 rounded-full px-4 ${
              selected ? "bg-primary-500" : "border border-primary-100 bg-white dark:border-ink-700 dark:bg-ink-800"
            }`}
          >
            <Ionicons name={tab.icon} size={16} color={selected ? "#FFFFFF" : "#127A87"} />
            <Text className={`text-sm ${selected ? "font-semibold text-white" : "text-ink-900 dark:text-ink-50"}`}>
              {tab.label}
            </Text>
            {tab.count > 0 ? (
              <Text className={`text-xs ${selected ? "text-white/85" : "text-ink-400 dark:text-ink-300"}`}>
                {tab.count > 99 ? "99+" : tab.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Connections() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const wide = useWideLayout();
  const openSearch = useSearchOverlay((s) => s.setOpen);
  const { data: matched, refetch: refetchMatched, isRefetching: isRefetchingMatched } = useNewConnections(userId);
  const { data: connected, refetch: refetchConnected, isRefetching: isRefetchingConnected } = useMessageThreads(userId);
  const { data: saved, refetch: refetchSaved, isRefetching: isRefetchingSaved } = useSavedPeople(userId);
  const subscribed = useHasPlus(userId);
  const { data: likesCount, refetch: refetchLikesCount, isRefetching: isRefetchingLikesCount } =
    useIncomingLikesCount(userId);
  const { data: likes, refetch: refetchLikes, isRefetching: isRefetchingLikes } = useIncomingLikes(
    userId,
    subscribed === true
  );
  // tab drives the pill; contentTab, what's shown below it, catches up once the pill
  // has finished moving. Building a long grid of photo cards (Saved) in the same
  // frames as the animation made it stutter on Android.
  const [tab, setTab] = useState<Tab>("matched");
  const [contentTab, setContentTab] = useState<Tab>("matched");
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (contentTimer.current) clearTimeout(contentTimer.current);
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    // The delay is for the phone's sliding pill; desktop's tabs don't animate.
    if (wide) {
      setContentTab(next);
      return;
    }
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => setContentTab(next), EXPANDING_TABS_DURATION);
  }
  const [gridWidth, setGridWidth] = useState(0);

  // Math.floor matters here: a fractional width (e.g. 157.5) can get rounded UP by
  // the browser's layout engine, making COLUMNS cards + gaps a hair wider than the
  // container -- flex-wrap then bumps the last card onto its own line instead of
  // keeping them side by side, which is exactly the "cards stack vertically on web"
  // bug this fixes.
  const gap = wide ? WIDE_GRID_GAP : GRID_GAP;
  const columns = wide
    ? Math.min(WIDE_MAX_COLUMNS, Math.max(1, Math.floor((gridWidth + gap) / (WIDE_MIN_CARD_WIDTH + gap))))
    : GRID_COLUMNS;
  const fitWidth = gridWidth > 0 ? Math.floor((gridWidth - gap * (columns - 1)) / columns) : 0;
  const cardWidth = wide ? Math.min(WIDE_MAX_CARD_WIDTH, fitWidth) : fitWidth;
  // The cards' actual extent, so the title row (and its search box) ends where they do.
  const gridContentWidth = cardWidth > 0 ? columns * cardWidth + (columns - 1) * gap : undefined;

  function refetch() {
    refetchMatched();
    refetchConnected();
    refetchSaved();
    refetchLikesCount();
    if (subscribed) refetchLikes();
  }

  // replace, not push: "user" is its own hidden tab (see (app)/_layout.tsx), and
  // switching away from a tab doesn't pop its stack, only changes focus -- a push
  // here would leave the previous profile sitting underneath, so back() from a
  // later one would land on it instead of returning to this Connections screen.
  function goToProfile(otherUserId: string, matchId: string) {
    router.replace(`/(app)/user/${otherUserId}?matchId=${matchId}`);
  }

  // Opens the profile with its Pass / Like buttons, acting on the same deck the
  // person was saved from: Like can still make a match, Pass takes them off Saved.
  function goToSavedProfile(person: SavedPerson) {
    const scope = person.circleId ? `&circleId=${person.circleId}` : "";
    router.replace(`/(app)/user/${person.otherUserId}?fromDiscover=true${scope}`);
  }

  const counts: Record<Tab, number> = {
    matched: matched?.length ?? 0,
    connected: connected?.length ?? 0,
    saved: saved?.length ?? 0,
    likes: likesCount ?? 0,
  };
  const people =
    contentTab === "matched"
      ? matched
      : contentTab === "connected"
        ? connected
        : contentTab === "saved"
          ? saved
          : likes;
  const emptyLabel = t(
    contentTab === "matched"
      ? "connections.emptyMatched"
      : contentTab === "connected"
        ? "connections.emptyConnected"
        : contentTab === "saved"
          ? "connections.emptySaved"
          : "connections.emptyLikes"
  );
  // Free users with likes waiting get the teaser instead of a list.
  const showLikesTeaser = contentTab === "likes" && subscribed === false && (likesCount ?? 0) > 0;
  const isEmpty = !showLikesTeaser && (!people || people.length === 0);
  const tabItems = TABS.map(({ value, icon }) => ({ value, icon, label: t(`connections.${value}`), count: counts[value] }));

  // No "bottom" edge: the tab bar already pads for the home indicator, and adding
  // it here too left a gap under the tab strip on phones.
  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <RefreshableScrollView
        refreshing={
          isRefetchingMatched || isRefetchingConnected || isRefetchingSaved || isRefetchingLikesCount || isRefetchingLikes
        }
        onRefresh={refetch}
        className={wide ? "flex-1 px-20 pt-9" : "flex-1 px-6 pt-4"}
        // grow lets an empty tab's message fill the space above the tabs and sit
        // centred in it, rather than hugging the top.
        contentContainerClassName={wide ? "grow gap-5 pb-10" : "grow gap-6 pb-6"}
        showsVerticalScrollIndicator={!wide}
      >
        {/* Desktop web: a large title with search, and the tabs up here. */}
        {wide ? (
          <>
            <View className="flex-row flex-wrap items-center gap-4" style={{ maxWidth: gridContentWidth }}>
              <Text className="flex-1 font-display text-4xl text-ink-900 dark:text-ink-50">{t("tabs.connections")}</Text>
              <Pressable
                accessibilityRole="search"
                onPress={() => openSearch(true)}
                className="h-11 w-[320px] flex-row items-center gap-2 rounded-full bg-white px-4 dark:bg-ink-800"
              >
                <Ionicons name="search-outline" size={18} color="#8A7C76" />
                <Text className="text-[15px] text-ink-400 dark:text-ink-300">{t("tabs.search")}</Text>
              </Pressable>
            </View>
            <DesktopTabs tabs={tabItems} value={tab} onChange={selectTab} />
          </>
        ) : null}

        <View className={isEmpty ? "flex-1" : undefined} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
          {showLikesTeaser ? (
            <View className="gap-4">
              {cardWidth > 0 ? (
                <View className="flex-row flex-wrap" style={{ gap }}>
                  {Array.from({ length: Math.min(likesCount ?? 0, TEASER_CARDS) }, (_, i) => (
                    <View
                      key={i}
                      className="items-center justify-center rounded-2xl border border-primary-100 dark:border-ink-700 bg-primary-100 dark:bg-ink-800"
                      style={{ width: cardWidth, height: cardWidth }}
                    >
                      <Ionicons name="heart" size={32} color="#127A87" />
                    </View>
                  ))}
                </View>
              ) : null}
              <Text className="text-center font-display text-lg text-ink-900 dark:text-ink-50">
                {t("connections.likesTeaser", { count: likesCount ?? 0 })}
              </Text>
              <Button label={t("connections.seeWhoLikesYou")} onPress={() => router.push("/(app)/plus")} />
            </View>
          ) : isEmpty ? (
            <EmptyState icon={TABS.find((x) => x.value === contentTab)!.icon} label={emptyLabel} />
          ) : cardWidth > 0 ? (
            <View className="flex-row flex-wrap" style={{ gap }}>
              {contentTab === "saved" || contentTab === "likes"
                ? ((contentTab === "saved" ? saved : likes) ?? []).map((person) => (
                    <PersonCard
                      key={person.otherUserId}
                      person={person}
                      width={cardWidth}
                      wide={wide}
                      onPress={() => goToSavedProfile(person)}
                    />
                  ))
                : (people as MatchWithParticipant[]).map((person) => (
                    <PersonCard
                      key={person.matchId}
                      person={person}
                      width={cardWidth}
                      wide={wide}
                      unreadCount={contentTab === "connected" ? (person as MessageThread).unreadCount : undefined}
                      onPress={() => goToProfile(person.otherUserId, person.matchId)}
                      onQuickChat={contentTab === "connected" ? () => router.push(`/(app)/chat/${person.matchId}`, { withAnchor: true }) : undefined}
                    />
                  ))}
            </View>
          ) : null}
        </View>
      </RefreshableScrollView>

      {/* Pinned under the list, within thumb reach, rather than scrolling away
          with it. Equal space above and below so it sits centred between the list
          and the tab bar. */}
      {wide ? null : (
        <View className="px-6" style={{ paddingVertical: 16 }}>
          <ExpandingTabs value={tab} onChange={selectTab} tabs={tabItems} />
        </View>
      )}
    </SafeAreaView>
  );
}
