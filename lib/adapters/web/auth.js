/**
 * Web Auth Adapter — uses Supabase SSR via cookies (Next.js).
 * Client-side operations only. Server-side auth stays in lib/supabase/server.js.
 */

import { createBrowserClient } from "@supabase/ssr";

let _client;

function getClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _client;
}

export async function getSession() {
  const supabase = getClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

export async function signIn(provider = "google") {
  const supabase = getClient();
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
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
