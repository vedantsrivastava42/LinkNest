/**
 * Shared import/export logic — platform-agnostic.
 * Note: `exportBookmarks` creates a Blob and triggers a download (uses DOM APIs).
 * For the extension, the adapter may override the download mechanism if needed,
 * but Blob + <a> download works in extension popups and options pages too.
 */

/**
 * Export bookmarks as a JSON file download.
 * Strips internal IDs & user_id so the file is portable.
 */
export function exportBookmarks(bookmarks) {
  const exportData = {
    app: "LinkNest",
    exportedAt: new Date().toISOString(),
    count: bookmarks.length,
    bookmarks: bookmarks.map((b) => ({
      title: b.title,
      url: b.url,
      category: b.category || null,
      tags: b.tags || [],
      ai_summary: b.ai_summary || null,
      is_favorite: !!b.is_favorite,
      is_pinned: !!b.is_pinned,
      click_count: b.click_count || 0,
      created_at: b.created_at,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `linknest-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse & validate an imported JSON file.
 * Supports:
 *   - Our own export format  ({ bookmarks: [...] })
 *   - Plain array of objects  ([{ title, url }, ...])
 * Returns { bookmarks: [...], errors: [...] }
 */
export function parseImportFile(jsonString) {
  const errors = [];
  let raw;

  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { bookmarks: [], errors: ["Invalid JSON file."] };
  }

  // Accept either { bookmarks: [...] } or a plain array
  let items = Array.isArray(raw) ? raw : raw?.bookmarks;

  if (!Array.isArray(items) || items.length === 0) {
    return {
      bookmarks: [],
      errors: ["No bookmarks found. Expected a JSON array or { bookmarks: [...] }."],
    };
  }

  const valid = [];
  items.forEach((item, i) => {
    if (!item.url || typeof item.url !== "string") {
      errors.push(`Item ${i + 1}: missing or invalid "url".`);
      return;
    }
    valid.push({
      title: item.title || item.url,
      url: item.url,
      category: item.category || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      ai_summary: item.ai_summary || null,
      is_favorite: !!item.is_favorite,
      click_count: item.click_count || 0,
    });
  });

  return { bookmarks: valid, errors };
}
