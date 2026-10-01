import { useColorScheme } from "nativewind";

// Every Stack in the app was leaving `contentStyle` unset, so the native-stack
// container behind each screen was transparent -- during the push/pop transition,
// the outgoing screen showed through the incoming one as a faint ghost. Giving the
// container the same opaque background every screen already paints (bg-coral-50 /
// dark:bg-ink-950) makes the transition opaque from the first frame, before the
// screen's own content has even laid out.
export function useStackScreenOptions() {
  const { colorScheme } = useColorScheme();
  return {
    headerShown: false as const,
    contentStyle: { backgroundColor: colorScheme === "dark" ? "#171310" : "#FDEDE5" },
  };
}
