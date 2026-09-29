import { createContext, useContext, type ReactNode } from "react";

const TextScaleContext = createContext(1);

export function TextScaleProvider({ scale, children }: { scale: number; children: ReactNode }) {
  return <TextScaleContext.Provider value={scale}>{children}</TextScaleContext.Provider>;
}

export function useTextScale(): number {
  return useContext(TextScaleContext);
}
