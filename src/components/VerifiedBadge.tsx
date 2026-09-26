import { Ionicons } from "@expo/vector-icons";

export function VerifiedBadge({ status, color = "#2C8B80" }: { status: string | null | undefined; color?: string }) {
  if (status !== "verified") return null;
  return <Ionicons name="checkmark-circle" size={18} color={color} />;
}
