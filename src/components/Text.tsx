import { Platform, Text, type TextProps } from "react-native";

import { useTextScale } from "@/hooks/useTextScale";

// Drop-in replacement for RN's own Text, used everywhere in this app instead of it
// (see the Settings > Text size feature).
//
// Two earlier approaches were tried and confirmed NOT to work here, both via
// on-device testing rather than assumption:
//  1. NativeWind's own "rem" unit -- every text-* Tailwind class is defined in
//     terms of it, so scaling that one runtime value looked like it should rescale
//     every screen's text with zero component changes. It's a real, correctly-
//     wired reactive primitive, but already-mounted (and even freshly remounted)
//     native Text components don't actually pick up a changed rem value. The
//     docs for that API explicitly say it isn't supported for this; a source-level
//     read of the runtime wasn't enough to safely rule it out.
//  2. Reading the already-resolved `style` prop and multiplying its fontSize: on
//     web, NativeWind resolves className to a `{ $$css: true, ... }` marker object
//     (real CSS classes applied to the DOM element), not literal numbers -- so
//     there's never a fontSize to read there at all, and this was a silent no-op.
//
// This version sidesteps NativeWind's resolution entirely for size: it parses the
// same text-* class Tailwind's own scale defines (unmodified in this project's
// tailwind.config.js) straight out of `className`, and computes the scaled
// fontSize/lineHeight itself from that -- independent of whatever NativeWind
// does internally, so it can't be defeated by a caching or reactivity gap in
// either platform's implementation. `className` still passes through to
// NativeWind unchanged for everything else (color, weight, margin, etc.); only
// the numeric size override added here.
//
// The inner JSX below is deliberately `<Text .../>` (react-native's own export,
// not a renamed/aliased binding) -- NativeWind's babel plugin matches against the
// literal JSX tag name, so an aliased import here would silently stop getting
// className support at all.
const REM_BASE = Platform.OS === "web" ? 16 : 14;

// Tailwind's stock default type scale (rem multiples of the base), unmodified in
// this project's tailwind.config.js.
const FONT_SIZE_REM: Record<string, number> = {
  "text-xs": 0.75,
  "text-sm": 0.875,
  "text-base": 1,
  "text-lg": 1.125,
  "text-xl": 1.25,
  "text-2xl": 1.5,
  "text-3xl": 1.875,
};
const LINE_HEIGHT_REM: Record<string, number> = {
  "text-xs": 1,
  "text-sm": 1.25,
  "text-base": 1.5,
  "text-lg": 1.75,
  "text-xl": 1.75,
  "text-2xl": 2,
  "text-3xl": 2.25,
};

function ScaledText({ className, style, ...props }: TextProps & { className?: string }) {
  const scale = useTextScale();
  const sizeClass = className?.split(/\s+/).find((c) => c in FONT_SIZE_REM);

  const sizeOverride = sizeClass
    ? {
        fontSize: REM_BASE * FONT_SIZE_REM[sizeClass] * scale,
        lineHeight: REM_BASE * LINE_HEIGHT_REM[sizeClass] * scale,
      }
    : undefined;

  return <Text {...props} className={className} style={[style, sizeOverride]} />;
}

export { ScaledText as Text };
