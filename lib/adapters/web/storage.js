/**
 * Web Storage Adapter — Supabase client for bookmark CRUD.
 * Wraps @supabase/ssr browser client.
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

export async function getBookmarks(userId) {
  const supabase = getClient();
  return supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function insertBookmark(userId, title, url, aiData = {}) {
  const supabase = getClient();
  return supabase
    .from("bookmarks")
    .insert({
      title,
      url,
      user_id: userId,
      category: aiData.category || null,
      tags: aiData.tags || null,
      ai_summary: aiData.summary || null,
    })
    .select()
    .single();
}

export async function removeBookmark(id) {
  const supabase = getClient();
  return supabase.from("bookmarks").delete().eq("id", id);
}

export async function updateBookmark(id, title, url, category, tags) {
  const supabase = getClient();
  const updates = { title, url };
  if (category !== undefined) updates.category = category;
  if (tags !== undefined) updates.tags = tags;
  return supabase.from("bookmarks").update(updates).eq("id", id);
}

export async function toggleFavourite(id, isFavorite) {
  const supabase = getClient();
  return supabase
    .from("bookmarks")
    .update({ is_favorite: isFavorite })
    .eq("id", id);
}

export async function togglePin(id, isPinned) {
  const supabase = getClient();
  return supabase
    .from("bookmarks")
    .update({ is_pinned: isPinned })
    .eq("id", id);
}

export async function bulkDelete(ids) {
  const supabase = getClient();
  return supabase.from("bookmarks").delete().in("id", ids);
}

export async function bulkUpdateCategory(ids, category) {
  const supabase = getClient();
  return supabase.from("bookmarks").update({ category }).in("id", ids);
}

export async function bulkInsert(userId, bookmarksArray) {
  const supabase = getClient();
  const rows = bookmarksArray.map((b) => ({
    user_id: userId,
    title: b.title,
    url: b.url,
    category: b.category || null,
    tags: b.tags || null,
    ai_summary: b.ai_summary || null,
    is_favorite: !!b.is_favorite,
    click_count: b.click_count || 0,
  }));
  return supabase.from("bookmarks").insert(rows).select();
}

export async function incrementClick(id) {
  try {
    await fetch("/api/bookmark-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch (err) {
    console.error("Click tracking error:", err);
  }
}

/**
 * Subscribe to realtime bookmark changes.
 * @returns {Function} unsubscribe
 */
export function subscribeRealtime(userId, onEvent) {
  const supabase = getClient();

  const channel = supabase
    .channel("bookmarks-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookmarks",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onEvent(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Categorize a bookmark via the Next.js API route.
 */
export async function categorize(url, userTitle) {
  const res = await fetch("/api/ai-categorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, userTitle }),
  });

  if (!res.ok) return null;
  return res.json();
}
