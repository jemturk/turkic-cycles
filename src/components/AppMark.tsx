import Svg, { Circle, Defs, G, Mask, Polygon, Rect } from "react-native-svg";

// The app's logo mark: two overlapping circles (coral + teal, echoing the
// connection between two people/communities that "Circles" is built around),
// with an 8-pointed star cut out of the overlap -- a geometric motif common
// across Turkic/Central Asian ornament, not a literal cultural symbol. Same
// mark used for the app icon, splash screen, and this in-app rendering, so
// changing it means regenerating assets/icon.png etc. to match (see the
// render script used to produce them, not tracked in the repo).
const STAR_POINTS =
  "100,10 114.5,64.9 163.6,36.4 135.1,85.5 190,100 135.1,114.5 163.6,163.6 114.5,135.1 " +
  "100,190 85.5,135.1 36.4,163.6 64.9,114.5 10,100 64.9,85.5 36.4,36.4 85.5,64.9";

export function AppMark({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <Mask id="appMarkStarCut" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
          <Rect x="0" y="0" width="160" height="160" fill="white" />
          <Polygon points={STAR_POINTS} fill="black" transform="translate(80,80) scale(0.2) translate(-100,-100)" />
        </Mask>
      </Defs>
      <G mask="url(#appMarkStarCut)">
        <Circle cx="62" cy="80" r="52" fill="#D9663D" />
        <Circle cx="98" cy="80" r="52" fill="#2C8B80" />
      </G>
    </Svg>
  );
}
