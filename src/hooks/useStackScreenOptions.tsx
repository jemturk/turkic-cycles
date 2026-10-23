import { useColorScheme } from "nativewind";
import { AppHeader } from "@/components/AppHeader";

// Every Stack in the app was leaving `contentStyle` unset, so the native-stack
// container behind each screen was transparent -- during the push/pop transition,
// the outgoing screen showed through the incoming one as a faint ghost. Giving the
// container the same opaque background every screen already paints (bg-primary-50 /
// dark:bg-ink-950) makes the transition opaque from the first frame, before the
// screen's own content has even laid out.
//
// headerShown defaults to false here -- most screens draw their own in-body back
// button -- but a tab's root screen opts back in (see e.g. circles/_layout.tsx) to
// get AppHeader (its title + your avatar) instead of an in-body title.
export function useStackScreenOptions() {
  const { colorScheme } = useColorScheme();

  return {
    headerShown: false as const,
    contentStyle: { backgroundColor: colorScheme === "dark" ? "#171310" : "#FEF6EC" },
    header: ({ options }: { options: { title?: string } }) => <AppHeader title={options.title} />,
  };
}
