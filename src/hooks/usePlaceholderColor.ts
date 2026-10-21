import { useColorScheme } from "nativewind";

// Placeholder text in inputs, in the secondary-text greys (tailwind ink-400 / ink-300):
// both pass the 4.5:1 contrast small text needs on their theme's surfaces.
export function usePlaceholderColor(): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? "#A99C95" : "#6E625C";
}
