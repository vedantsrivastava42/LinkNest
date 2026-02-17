/**
 * Extension Storage Adapter — uses Supabase JS client (not SSR).
 * AI categorization calls the deployed Next.js API.
 */

import { getClient } from "./auth.js";

// The deployed web app URL — extension calls API routes on this host.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

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
    // Use the deployed web app's API
    if (API_BASE) {
      await fetch(`${API_BASE}/api/bookmark-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } else {
      // Direct Supabase update if no API base configured
      const supabase = getClient();
      const { data: bookmark } = await supabase
        .from("bookmarks")
        .select("click_count")
        .eq("id", id)
        .single();

      const newCount = (bookmark?.click_count || 0) + 1;
      await supabase
        .from("bookmarks")
        .update({ click_count: newCount })
        .eq("id", id);
    }
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
 * Categorize a bookmark via the deployed API.
 */
export async function categorize(url, userTitle) {
  const apiUrl = API_BASE
    ? `${API_BASE}/api/ai-categorize`
    : "/api/ai-categorize";

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, userTitle }),
  });

  if (!res.ok) return null;
  return res.json();
}
