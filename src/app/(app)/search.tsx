import { Redirect } from "expo-router";

// Only exists so the tab bar has a "search" route to attach its button to -- the
// button itself opens SearchOverlay (see (app)/_layout.tsx) and never navigates
// here. A deep link to /search lands on Circles instead of a blank screen.
export default function SearchRoute() {
  return <Redirect href="/(app)/circles" />;
}
