import Svg, { Circle, Path } from "react-native-svg";

// "Remove connection": the logo's two circles as rings, set apart, with a cut between
// them. Outline style, to sit with the menu's Ionicons outlines. (Rings touching or
// overlapping read as "connected" -- an infinity sign -- so they're clearly apart.)
export function BrokenLinkIcon({ size = 18, color = "#4A3F3A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Circle cx={6} cy={12} r={4} fill="none" stroke={color} strokeWidth={1.8} />
      <Circle cx={18} cy={12} r={4} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M13.3 8.2l-2.6 7.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
