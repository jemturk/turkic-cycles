import Svg, { Circle, Polygon } from "react-native-svg";

// The app's logo mark: two overlapping circles in the app's accent and primary
// (coral-red + turquoise), echoing the connection between two people/communities
// that "Circles" is built around, with a white 8-pointed star on the overlap -- a geometric motif common
// across Turkic/Central Asian ornament, not a literal cultural symbol. Same
// mark used for the app icon, splash screen, and this in-app rendering, so
// changing it means regenerating assets/icon.png, icon-ios.png, favicon.png,
// splash-icon.png and android-icon-foreground.png to match (the render script
// used to produce them isn't tracked in the repo). The star is a white fill, not
// a cutout, so it stays white on any background -- except in
// android-icon-monochrome.png, where Android tints the whole icon one color.
// assets/notification-icon.png (the status-bar icon) is rendered from this geometry
// by scripts/render_notification_icon.py.
const STAR_POINTS =
  "100,10 114.5,64.9 163.6,36.4 135.1,85.5 190,100 135.1,114.5 163.6,163.6 114.5,135.1 " +
  "100,190 85.5,135.1 36.4,163.6 64.9,114.5 10,100 64.9,85.5 36.4,36.4 85.5,64.9";

export function AppMark({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Circle cx="62" cy="80" r="52" fill="#C1440E" />
      <Circle cx="98" cy="80" r="52" fill="#127A87" />
      <Polygon points={STAR_POINTS} fill="#FFFFFF" transform="translate(80,80) scale(0.2) translate(-100,-100)" />
    </Svg>
  );
}
