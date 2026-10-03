import { View } from "react-native";
import { WebView } from "react-native-webview";

import { TURNSTILE_HOSTNAME, TURNSTILE_SCRIPT, type CaptchaWidgetProps } from "./turnstile";

// Native: Turnstile has no native SDK, so it runs in a small WebView and posts the
// token back. (CaptchaWidget.web.tsx renders it straight into the page instead.)
export function CaptchaWidget({ siteKey, theme, onToken }: CaptchaWidgetProps) {
  const html = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html, body { margin: 0; background: transparent; display: flex; justify-content: center; }</style>
<script src="${TURNSTILE_SCRIPT}?onload=onTurnstileLoad&render=explicit" async defer></script>
</head><body>
<div id="widget"></div>
<script>
  function send(token) { window.ReactNativeWebView.postMessage(JSON.stringify({ token: token })); }
  function onTurnstileLoad() {
    turnstile.render("#widget", {
      sitekey: ${JSON.stringify(siteKey)},
      theme: ${JSON.stringify(theme)},
      callback: function (token) { send(token); },
      "expired-callback": function () { send(null); },
      "error-callback": function () { send(null); },
    });
  }
</script>
</body></html>`;

  return (
    <View style={{ height: 70 }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: TURNSTILE_HOSTNAME }}
        style={{ backgroundColor: "transparent" }}
        scrollEnabled={false}
        onMessage={(event) => {
          try {
            onToken(JSON.parse(event.nativeEvent.data).token ?? null);
          } catch {
            onToken(null);
          }
        }}
      />
    </View>
  );
}
