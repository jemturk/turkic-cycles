import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/api/client";

// "cancelled" when the person closed the Apple sheet or the Google browser, which is
// not an error worth showing.
export type SocialSignInResult = "signedIn" | "cancelled";

// A new account starts with an empty display name (handle_new_user in 0001);
// fill it from the provider's name so onboarding starts with it. Never overwrites a
// name the person already set.
async function prefillDisplayName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("profiles").update({ display_name: trimmed }).eq("id", data.user.id).eq("display_name", "");
}

// Sign in with Apple, iPhone only: Apple's native sheet, then its identity token is
// exchanged for a Supabase session. The nonce guards against a replayed token --
// Apple gets its SHA-256 hash, Supabase the raw value to check against it.
// captchaToken: Supabase checks the CAPTCHA on this token exchange too.
export async function signInWithApple(captchaToken?: string): Promise<SocialSignInResult> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return "cancelled";
    throw error;
  }
  if (!credential.identityToken) throw new Error("Apple didn't return an identity token.");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
    options: { captchaToken },
  });
  if (error) throw error;

  // Apple shares the name only the very first time someone signs in to the app.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
  if (name) {
    await supabase.auth.updateUser({ data: { full_name: name } });
    await prefillDisplayName(name);
  }
  return "signedIn";
}

// Sign in with Google through Supabase's hosted sign-in page, on every platform.
// On the web the page itself redirects there and back (detectSessionInUrl in
// client.ts picks the session up). On phones it opens in a secure in-app browser
// that returns to turek://auth-callback with the session tokens in the link.
export async function signInWithGoogle(): Promise<SocialSignInResult> {
  if (Platform.OS === "web") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
    return "signedIn";
  }

  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return "cancelled";

  // The tokens come back in the link's #fragment (implicit flow); an error, in
  // either the fragment or the query.
  const [beforeHash, hash = ""] = result.url.split("#");
  const params = new URLSearchParams(hash || beforeHash.split("?")[1] || "");
  const problem = params.get("error_description") ?? params.get("error");
  if (problem) throw new Error(problem);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) throw new Error("Google sign-in didn't return a session.");

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;

  const meta = sessionData.user?.user_metadata;
  await prefillDisplayName((meta?.full_name as string | undefined) ?? (meta?.name as string | undefined));
  return "signedIn";
}
