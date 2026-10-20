import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";

// Your message's status under its bubble, drawn from the logo's circles: sent = a
// teal ring, delivered = a teal sun, read = the sun with a coral dot at its center.
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
          <Circle cx={8} cy={8} r={5} fill={TEAL} />
          <Circle cx={8} cy={8} r={2.2} fill={CORAL} />
        </>
      ) : null}
    </Svg>
  );
}
