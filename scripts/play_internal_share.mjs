#!/usr/bin/env node
// Uploads an app bundle to Google Play's internal app sharing and prints the install
// link. Installing from that link gives an app signed by Play -- the same key as
// Play's testing tracks -- so it updates over a Play install and back again, which a
// locally signed APK can't (Play App Signing re-signs with Google's key).
//
//   node scripts/play_internal_share.mjs path/to/app-release.aab
//
// Credentials: a Google Cloud service account's JSON key, kept outside the repo at
// ~/.turek/play-service-account.json (or the path in TUREK_PLAY_SERVICE_ACCOUNT),
// invited in Play Console -> Users and permissions. No dependencies: Node signs the
// service account's token itself.
//
// Exit code 0 = uploaded (the link is the last line printed), 1 = failed.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PACKAGE_NAME = "com.turek.app";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const KEY_PATH = process.env.TUREK_PLAY_SERVICE_ACCOUNT || join(homedir(), ".turek", "play-service-account.json");

function fail(message) {
  console.error(`play_internal_share: ${message}`);
  process.exit(1);
}

const base64url = (data) => Buffer.from(data).toString("base64url");

async function accessToken(account) {
  // OAuth 2.0 for service accounts: a JWT signed with the account's key, exchanged
  // for a short-lived access token.
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: account.token_uri, iat: now, exp: now + 3600 })
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key, "base64url");

  const res = await fetch(account.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) fail(`sign-in failed (${res.status}): ${JSON.stringify(body)}`);
  return body.access_token;
}

const bundlePath = process.argv[2];
if (!bundlePath) fail("usage: node scripts/play_internal_share.mjs <app-release.aab>");

let account;
try {
  account = JSON.parse(readFileSync(KEY_PATH, "utf8"));
} catch (error) {
  fail(`no service account key at ${KEY_PATH} (${error.code ?? error.message}) -- see store-submission.md, Internal app sharing`);
}
if (account.type !== "service_account") fail(`${KEY_PATH} isn't a service account key`);

let bundle;
try {
  bundle = readFileSync(bundlePath);
} catch (error) {
  fail(`can't read the bundle at ${bundlePath} (${error.code ?? error.message}) -- build one with build.py -b`);
}
const token = await accessToken(account);

const res = await fetch(
  `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/internalappsharing/${PACKAGE_NAME}/artifacts/bundle?uploadType=media`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    body: bundle,
  }
);
const text = await res.text();
if (!res.ok) {
  const hint =
    res.status === 403
      ? " -- invite the service account in Play Console (Users and permissions) and add it as an internal app sharing uploader"
      : "";
  fail(`upload failed (${res.status})${hint}: ${text.slice(0, 500)}`);
}

const artifact = JSON.parse(text);
console.log(`Uploaded ${(bundle.length / 1_000_000).toFixed(1)} MB; signed by Play (${artifact.certificateFingerprint}).`);
console.log(artifact.downloadUrl);
