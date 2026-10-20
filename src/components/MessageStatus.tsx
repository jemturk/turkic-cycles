import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";

// Your message's status under its bubble, drawn from the logo's circles ("Corona"):
// sent = a teal ring, delivered = a teal sun, read = the sun wrapped edge to edge in
// a coral band. Each step differs in shape and lightness, not only color.
const TEAL = "#127A87";
const CORAL = "#C1440E";

export type MessageStatusValue = "sent" | "delivered" | "read";

export function messageStatus(message: { read_at: string | null; delivered_at: string | null }): MessageStatusValue {
  if (message.read_at) return "read";
  if (message.delivered_at) return "delivered";
  return "sent";
}

export function MessageStatus({ status, size = 16 }: { status: MessageStatusValue; size?: number }) {
  const { t } = useTranslation();
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityRole="image" accessibilityLabel={t(`chat.status.${status}`)}>
      {status === "sent" ? <Circle cx={8} cy={8} r={4.2} fill="none" stroke={TEAL} strokeWidth={1.6} /> : null}
      {status === "delivered" ? <Circle cx={8} cy={8} r={5} fill={TEAL} /> : null}
      {status === "read" ? (
        <>
          <Circle cx={8} cy={8} r={6.4} fill={CORAL} />
          <Circle cx={8} cy={8} r={4.2} fill={TEAL} />
        </>
      ) : null}
    </Svg>
  );
}
