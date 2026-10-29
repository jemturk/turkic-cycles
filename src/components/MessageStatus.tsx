import Svg, { Circle, Path } from "react-native-svg";
import { useTranslation } from "react-i18next";

// Your message's status under its bubble, drawn from the logo's circles: sent = a
// teal ring, delivered = a teal sun, read = a coral sun. Still in the outbox
// (useSendMessage): waiting = a grey clock, failed = a coral "!".
const TEAL = "#127A87";
const CORAL = "#C1440E";
const GREY = "#A99C95";

export type MessageStatusValue = "pending" | "failed" | "sent" | "delivered" | "read";

export function messageStatus(message: { read_at: string | null; delivered_at: string | null }): MessageStatusValue {
  if (message.read_at) return "read";
  if (message.delivered_at) return "delivered";
  return "sent";
}

export function MessageStatus({ status, size = 16 }: { status: MessageStatusValue; size?: number }) {
  const { t } = useTranslation();
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityRole="image" accessibilityLabel={t(`chat.status.${status}`)}>
      {status === "pending" ? (
        <>
          <Circle cx={8} cy={8} r={5} fill="none" stroke={GREY} strokeWidth={1.3} />
          <Path d="M8 5.2V8l1.9 1.2" fill="none" stroke={GREY} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {status === "failed" ? (
        <>
          <Circle cx={8} cy={8} r={5.5} fill={CORAL} />
          <Path d="M8 5v3.6" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx={8} cy={10.9} r={0.85} fill="#fff" />
        </>
      ) : null}
      {status === "sent" ? <Circle cx={8} cy={8} r={2.9} fill="none" stroke={TEAL} strokeWidth={1.3} /> : null}
      {status === "delivered" ? <Circle cx={8} cy={8} r={3.4} fill={TEAL} /> : null}
      {status === "read" ? <Circle cx={8} cy={8} r={3.4} fill={CORAL} /> : null}
    </Svg>
  );
}
