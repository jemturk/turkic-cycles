import { router, type Href } from "expo-router";

// Back buttons (and Save on a form) go up to the screen's parent -- an event to its
// circle, a circle to the Circles list, a Settings page to Settings -- never to
// whatever screen happened to be open before (a search result, another tab, a
// notification). dismissTo pops back to the parent if it's in the stack, and
// otherwise replaces this screen with it, which also covers a page opened straight
// from a link with no history behind it.
//
// Screens without one parent (someone's profile, Plus, Report) still use
// router.back(): going back to where you came from is the point there.
export function goUp(parent: Href) {
  router.dismissTo(parent);
}
