import { createClient } from "@/lib/supabase/client";

export async function categorizeBookmark(url, userTitle) {
  const res = await fetch("/api/ai-categorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, userTitle }),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function insertBookmark(userId, title, url, aiData = {}) {
  const supabase = createClient();
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
  const supabase = createClient();
  return supabase.from("bookmarks").delete().eq("id", id);
}

export async function updateBookmark(id, title, url, category, tags) {
  const supabase = createClient();
  const updates = { title, url };
  if (category !== undefined) updates.category = category;
  if (tags !== undefined) updates.tags = tags;
  return supabase.from("bookmarks").update(updates).eq("id", id);
}

export async function toggleBookmarkFavourite(id, isFavorite) {
  const supabase = createClient();
  return supabase
    .from("bookmarks")
    .update({ is_favorite: isFavorite })
    .eq("id", id);
}

export async function bulkInsertBookmarks(userId, bookmarksArray) {
  const supabase = createClient();
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

export async function incrementClickCount(id) {
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
