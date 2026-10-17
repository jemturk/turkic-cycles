import { Pressable } from "react-native";
import { Text } from "@/components/Text";
import type { ReactNode } from "react";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  rightSlot?: ReactNode;
};

export function Button({ label, onPress, variant = "primary", disabled }: ButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "w-full items-center justify-center rounded-full py-4",
        isPrimary ? "bg-primary-500" : "bg-transparent border border-[#F3E3D2]0",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <Text className={isPrimary ? "text-base font-semibold text-white" : "text-base font-semibold text-primary-500"}>
        {label}
      </Text>
    </Pressable>
  );
}
