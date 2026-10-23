import { useState } from "react";
import { useColorScheme } from "nativewind";

import { CaptchaWidget } from "@/components/captcha/CaptchaWidget";
import { TURNSTILE_SITE_KEY } from "@/components/captcha/turnstile";

// CAPTCHA state for an auth screen. Without a site key (the default) it's inert:
// `widget` is null and `ready` is always true, so screens behave as before.
//
// Tokens are single-use -- call reset() after every auth request, success or not,
// so the next attempt gets a fresh challenge.
export function useCaptcha() {
  const { colorScheme } = useColorScheme();
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const widget = TURNSTILE_SITE_KEY ? (
    <CaptchaWidget
      key={resetKey}
      siteKey={TURNSTILE_SITE_KEY}
      theme={colorScheme === "dark" ? "dark" : "light"}
      onToken={setToken}
    />
  ) : null;

  return {
    widget,
    ready: !TURNSTILE_SITE_KEY || !!token,
    captchaToken: token ?? undefined,
    reset: () => {
      setToken(null);
      setResetKey((key) => key + 1);
    },
  };
}
