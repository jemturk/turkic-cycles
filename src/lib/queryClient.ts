import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, onlineManager, type Mutation, type Query } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import * as Network from "expo-network";
import Constants from "expo-constants";

import { supabase } from "@/api/client";
import { SEND_MESSAGE_KEY, registerSendMessageDefaults } from "@/lib/outbox";

// How long saved data is kept on the device for when the app opens offline. Queries
// have to live at least as long in memory, or they'd be dropped from the save early.
const SAVED_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: SAVED_FOR_MS } },
});
registerSendMessageDefaults(queryClient);

// What's saved to the device: your own profile and photos (the cover check and the
// theme/language read them as the app opens) and the chats. Not Discover, circles
// and the rest -- they're only useful fresh.
const SAVED_QUERIES = new Set([
  "profile",
  "profilePhotos",
  "messageThreads",
  "newConnections",
  "matchParticipant",
  "messages",
  "messageReactions",
]);
// Each conversation keeps only its latest messages on the device.
export const SAVED_MESSAGES_PER_THREAD = 50;

export function shouldSaveQuery(query: Query) {
  return query.state.status === "success" && SAVED_QUERIES.has(query.queryKey[0] as string);
}

export function trimSavedClient(client: PersistedClient): PersistedClient {
  const queries = client.clientState.queries.map((query) => {
    const data = query.state.data;
    if (query.queryKey[0] !== "messages" || !Array.isArray(data) || data.length <= SAVED_MESSAGES_PER_THREAD) {
      return query;
    }
    return { ...query, state: { ...query.state, data: data.slice(-SAVED_MESSAGES_PER_THREAD) } };
  });
  return { ...client, clientState: { ...client.clientState, queries } };
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "turek-query-cache",
  serialize: (client) => JSON.stringify(trimSavedClient(client)),
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: SAVED_FOR_MS,
  // A new app version may shape its data differently: start again rather than read
  // an old save.
  buster: Constants.expoConfig?.version ?? "",
  dehydrateOptions: {
    shouldDehydrateQuery: shouldSaveQuery,
    // Messages waiting to go out (offline) or that failed, so they survive a restart.
    // Only sends: they're the only mutation with a default to run after a restart
    // (lib/outbox.ts); any other restored one would have nothing to run.
    shouldDehydrateMutation: (mutation: Mutation) =>
      mutation.options.mutationKey?.[0] === SEND_MESSAGE_KEY &&
      (mutation.state.isPaused || mutation.state.status === "error"),
  },
};

// Online as the device sees it, so queries pause (keeping what's saved on screen)
// rather than fail, and paused sends go out once it's back.
// Android reports a reconnect as "connected, internet not yet reachable" first, and the
// event for it becoming reachable doesn't always arrive -- the app stayed "offline" on
// a working connection. So while offline it also asks again every few seconds, and
// whenever the app comes back to the foreground.
const OFFLINE_RECHECK_MS = 3000;

onlineManager.setEventListener((setOnline) => {
  let recheck: ReturnType<typeof setInterval> | null = null;
  const update = (state: Network.NetworkState) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    setOnline(online);
    if (online && recheck) {
      clearInterval(recheck);
      recheck = null;
    } else if (!online && !recheck) {
      recheck = setInterval(check, OFFLINE_RECHECK_MS);
    }
  };
  const check = () => Network.getNetworkStateAsync().then(update, () => {});
  check();
  const subscription = Network.addNetworkStateListener(update);
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") check();
  });
  return () => {
    subscription.remove();
    appState.remove();
    if (recheck) clearInterval(recheck);
  };
});

// Signing out (here, or the session ending elsewhere) wipes everything saved, so the
// next person on this device sees none of it.
supabase.auth.onAuthStateChange((event) => {
  if (event !== "SIGNED_OUT") return;
  queryClient.clear();
  queryPersister.removeClient();
});
