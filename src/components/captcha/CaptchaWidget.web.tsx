import { useEffect, useRef } from "react";
import { View } from "react-native";

import { TURNSTILE_SCRIPT, type CaptchaWidgetProps } from "./turnstile";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<Turnstile> | null = null;

// Loads Turnstile's script once per page, however many widgets mount.
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${TURNSTILE_SCRIPT}?render=explicit`;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load Turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// Web: rendered straight into the page (WebView doesn't run on web).
export function CaptchaWidget({ siteKey, theme, onToken }: CaptchaWidgetProps) {
  const containerRef = useRef<View>(null);
  // Latest callback without re-rendering the widget when the parent re-renders.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        const element = containerRef.current as unknown as HTMLElement | null;
        if (cancelled || !element) return;
        widgetId = turnstile.render(element, {
          sitekey: siteKey,
          theme,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, theme]);

  return <View ref={containerRef} style={{ minHeight: 65, alignItems: "center" }} />;
}
