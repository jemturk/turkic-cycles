import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/hooks/useSession";
import { useHasDiscoverFilters } from "@/hooks/useSettings";

// Discover's filters are the matching preferences, also in Settings. These open them
// from the deck itself: `filtersHref` is the deck's own copy of that page (discover/filters,
// circles/[id]/filters), so Back and Save come back to the deck.

// The header's filter icon, with a dot while any filter is set.
export function DiscoverFiltersButton({ filtersHref, iconColor }: { filtersHref: Href; iconColor?: string }) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { session } = useSession();
  const filtered = useHasDiscoverFilters(session?.user.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filtered ? t("discover.filtersOn") : t("discover.filters")}
      hitSlop={8}
      onPress={() => router.push(filtersHref)}
    >
      <Ionicons
        name="options-outline"
        size={24}
        color={iconColor ?? (colorScheme === "dark" ? "#F5F1EE" : "#2B2320")}
      />
      {filtered ? (
        <View className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent-500 dark:border-ink-800" />
      ) : null}
    </Pressable>
  );
}

// An empty deck: with filters set, says so and offers to change them, since they're the
// likeliest reason; otherwise the deck's own "check back soon".
export function DiscoverEmpty({
  label,
  filtersHref,
  className,
}: {
  label: string;
  filtersHref: Href;
  className?: string;
}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const filtered = useHasDiscoverFilters(session?.user.id);
  if (!filtered) return <EmptyState icon="sparkles" label={label} className={className} />;
  return (
    <EmptyState
      icon="sparkles"
      label={t("discover.emptyWithFilters")}
      className={className}
      action={
        <View className="w-56">
          <Button label={t("discover.changeFilters")} variant="secondary" onPress={() => router.push(filtersHref)} />
        </View>
      }
    />
  );
}
