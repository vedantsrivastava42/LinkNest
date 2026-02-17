/**
 * Extension Auth Adapter — uses Supabase auth via chrome.storage.
 * OAuth is handled by the background service worker so it survives
 * popup close. The popup communicates via chrome.runtime messages.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client;

function getClient() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        storage: {
          getItem: (key) =>
            new Promise((resolve) =>
              chrome.storage.local.get(key, (result) => resolve(result[key] || null))
            ),
          setItem: (key, value) =>
            new Promise((resolve) =>
              chrome.storage.local.set({ [key]: value }, resolve)
            ),
          removeItem: (key) =>
            new Promise((resolve) =>
              chrome.storage.local.remove(key, resolve)
            ),
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

export { getClient };

export async function getSession() {
  const supabase = getClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

/**
 * Sign in — delegates to background service worker so the OAuth
 * window doesn't get killed when the popup closes.
 */
export function signIn(provider = "google") {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "SIGN_IN", provider },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      }
    );
  });
}

export async function signOut() {
  const supabase = getClient();
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  const supabase = getClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => subscription.unsubscribe();
}
