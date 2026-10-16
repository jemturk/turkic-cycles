import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { useSession } from "@/hooks/useSession";
import { useDiscoverCandidates, useRecordSwipe } from "@/hooks/useDiscover";
import { useOtherUserVerificationStatus } from "@/hooks/useVerification";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";
import { DesktopPersonCard } from "@/components/DesktopPersonCard";
import { CONNECTION_TYPES, type ConnectionType } from "@/constants/connectionTypes";
import type { DiscoverCandidate } from "@/api/discover";

const GAP = 20;
// Cards are between these widths and there are never more than MAX_COLUMNS, so a
// wide window gets breathing room beside the grid rather than ever-bigger cards.
const MIN_CARD_WIDTH = 260;
const MAX_CARD_WIDTH = 300;
const MAX_COLUMNS = 4;
// Portrait, a little less tall than the phone's card.
const CARD_ASPECT = 5 / 4;

type SwipeAction = "like" | "pass" | "save";

// The phone's icons and colors (SwipeButton), but all three on the same small
// frosted circle, so a grid of cards doesn't turn into rows of big buttons.
const CARD_ACTIONS: { action: SwipeAction; icon: keyof typeof Ionicons.glyphMap; color: string; labelKey: string }[] = [
  { action: "pass", icon: "close", color: "#C1440E", labelKey: "discover.pass" },
  { action: "save", icon: "star", color: "#D9663D", labelKey: "discover.save" },
  { action: "like", icon: "heart", color: "#C1440E", labelKey: "discover.like" },
];

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-pressed={selected}
      onPress={onPress}
      className={`h-10 justify-center rounded-full px-4 ${
        selected ? "bg-primary-500" : "border border-primary-100 bg-white dark:border-ink-700 dark:bg-ink-800"
      }`}
    >
      <Text className={`text-sm ${selected ? "font-semibold text-white" : "text-ink-900 dark:text-ink-50"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

// One person (DesktopPersonCard, the same card a desktop profile shows). Pass / Save
// / Like show in the corner only while the card is hovered or focused, so a screen
// of cards isn't also a screen of buttons.
function GridCard({
  person,
  width,
  onOpenProfile,
  onSwipe,
}: {
  person: DiscoverCandidate;
  width: number;
  onOpenProfile: (userId: string) => void;
  onSwipe: (person: DiscoverCandidate, action: SwipeAction) => void;
}) {
  const { t } = useTranslation();
  const { data: verification } = useOtherUserVerificationStatus(person.userId);
  const [hovered, setHovered] = useState(false);
  // Keyboard users get the buttons too: focus on the card or any of its buttons
  // counts (a blur fires before the next focus, so tabbing between them stays true).
  const [focused, setFocused] = useState(false);
  const showActions = hovered || focused;

  return (
    <Pressable
      style={{ width, height: Math.round(width * CARD_ASPECT) }}
      onPress={() => onOpenProfile(person.userId)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="rounded-3xl web:hover:shadow-md"
    >
      <DesktopPersonCard person={person} verificationStatus={verification} />

      <View
        className="absolute right-3 top-3 flex-row gap-2"
        style={{ opacity: showActions ? 1 : 0, pointerEvents: showActions ? "auto" : "none" }}
      >
        {CARD_ACTIONS.map(({ action, icon, color, labelKey }) => (
          <Pressable
            key={action}
            accessibilityRole="button"
            accessibilityLabel={t(labelKey)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={(e) => {
              // Don't also open the profile underneath.
              e.stopPropagation();
              onSwipe(person, action);
            }}
            className="h-[38px] w-[38px] items-center justify-center rounded-full bg-white/70 web:hover:bg-white dark:bg-ink-800/70 dark:web:hover:bg-ink-800"
            style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }}
          >
            <Ionicons name={icon} size={18} color={color} />
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

// Desktop web's Discover (DiscoverDeck switches to it on a wide window): the same
// candidates as the phone's one-at-a-time deck, as a grid of the same cards with
// their own Pass / Save / Like, and chips to narrow it to what people are looking for. A card
// disappears as soon as it's acted on, and the refetched batch fills the gap;
// there's no skip here, since every card is in view.
export function DiscoverGrid({
  circleId,
  emptyLabel,
  onOpenProfile,
}: {
  circleId: string | null | undefined;
  emptyLabel: string;
  onOpenProfile: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: candidates, isLoading } = useDiscoverCandidates(circleId, userId);
  const recordSwipe = useRecordSwipe(circleId, userId);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  // Hidden right away rather than waiting for the refetch, which would leave the
  // card sitting there looking unanswered; shown again if the swipe fails.
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [lookingFor, setLookingFor] = useState<ConnectionType | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const unanswered = (candidates ?? []).filter((c) => !answered.has(c.userId));
  const visible = lookingFor ? unanswered.filter((c) => c.connectionTypes.includes(lookingFor)) : unanswered;
  // Only the types someone in this batch is actually looking for, so no chip leads
  // to an empty grid.
  const offeredTypes = CONNECTION_TYPES.filter((type) => unanswered.some((c) => c.connectionTypes.includes(type)));

  const columns = Math.min(MAX_COLUMNS, Math.max(1, Math.floor((containerWidth + GAP) / (MIN_CARD_WIDTH + GAP))));
  const cardWidth =
    containerWidth > 0 ? Math.min(MAX_CARD_WIDTH, Math.floor((containerWidth - GAP * (columns - 1)) / columns)) : 0;

  function onSwipe(person: DiscoverCandidate, action: SwipeAction) {
    setAnswered((current) => new Set(current).add(person.userId));
    recordSwipe.mutate(
      { targetId: person.userId, action },
      {
        onSuccess: (isMatch) => {
          if (isMatch) setMatchedName(person.displayName);
        },
        onError: () =>
          setAnswered((current) => {
            const next = new Set(current);
            next.delete(person.userId);
            return next;
          }),
      },
    );
  }

  return (
    <>
      {/* -mx-3 / px-3: room for the cards' hover shadow, which the ScrollView would
          otherwise clip at its edges, without moving the cards. */}
      <ScrollView
        className="-mx-3 flex-1"
        contentContainerClassName="gap-5 px-3 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {offeredTypes.length > 1 ? (
          <View className="flex-row flex-wrap gap-2">
            <FilterChip
              label={t("circles.filterAll")}
              selected={lookingFor === null}
              onPress={() => setLookingFor(null)}
            />
            {offeredTypes.map((type) => (
              <FilterChip
                key={type}
                label={t(`constants.connectionTypes.${type}`)}
                selected={lookingFor === type}
                onPress={() => setLookingFor(type)}
              />
            ))}
          </View>
        ) : null}

        {isLoading ? null : visible.length === 0 ? (
          <View className="items-center justify-center py-24">
            <Text className="text-center text-base text-ink-700 dark:text-ink-200">{emptyLabel}</Text>
          </View>
        ) : (
          <View
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}
          >
            {cardWidth > 0
              ? visible.map((person) => (
                  <GridCard
                    key={person.userId}
                    person={person}
                    width={cardWidth}
                    onOpenProfile={onOpenProfile}
                    onSwipe={onSwipe}
                  />
                ))
              : null}
          </View>
        )}
      </ScrollView>

      <MatchCelebrationModal matchedName={matchedName} onDismiss={() => setMatchedName(null)} />
    </>
  );
}
