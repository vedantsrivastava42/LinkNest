/**
 * Shared bookmark data shapes and validation — platform-agnostic.
 */

/**
 * Validates a bookmark object has required fields.
 * @param {object} bookmark
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBookmark(bookmark) {
  const errors = [];

  if (!bookmark.url || typeof bookmark.url !== "string") {
    errors.push("URL is required and must be a string.");
  } else {
    try {
      new URL(bookmark.url);
    } catch {
      errors.push("URL is not a valid URL.");
    }
  }

  if (bookmark.title && typeof bookmark.title !== "string") {
    errors.push("Title must be a string.");
  }

  if (bookmark.tags && !Array.isArray(bookmark.tags)) {
    errors.push("Tags must be an array.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Normalizes a bookmark for storage.
 * @param {object} raw - Raw bookmark input
 * @param {string} userId - User ID to associate
 * @returns {object} Normalized bookmark row
 */
export function normalizeBookmark(raw, userId) {
  return {
    user_id: userId,
    title: raw.title || raw.url,
    url: raw.url,
    category: raw.category || null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    ai_summary: raw.ai_summary || null,
    is_favorite: !!raw.is_favorite,
    is_pinned: !!raw.is_pinned,
    click_count: raw.click_count || 0,
  };
}

/**
 * Sort options for bookmarks.
 */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-az", label: "Title A → Z" },
  { value: "title-za", label: "Title Z → A" },
  { value: "most-visited", label: "Most visited" },
  { value: "least-visited", label: "Least visited" },
];

/**
 * Filter bookmarks by category, favourites, tags, and search query.
 * Platform-agnostic pure function.
 */
export function filterBookmarks(bookmarks, { filter, tagFilter, searchQuery }) {
  let result = bookmarks;

  if (filter === "favourites") {
    result = result.filter((b) => b.is_favorite);
  } else if (filter !== "all") {
    result = result.filter((b) => (b.category || "Other") === filter);
  }

  if (tagFilter) {
    result = result.filter((b) => (b.tags || []).includes(tagFilter));
  }

  if (searchQuery?.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.url?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.ai_summary?.toLowerCase().includes(q) ||
        (b.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }

  return result;
}

/**
 * Sort bookmarks — pinned always first.
 */
export function sortBookmarks(bookmarks, sortBy) {
  const sorted = [...bookmarks];
  switch (sortBy) {
    case "newest":
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case "oldest":
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case "title-az":
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "title-za":
      sorted.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
      break;
    case "most-visited":
      sorted.sort((a, b) => (b.click_count || 0) - (a.click_count || 0));
      break;
    case "least-visited":
      sorted.sort((a, b) => (a.click_count || 0) - (b.click_count || 0));
      break;
  }
  // Pinned always on top
  sorted.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
  return sorted;
}

/**
 * Compute categories with counts from bookmarks.
 */
export function computeCategories(bookmarks) {
  const cats = {};
  bookmarks.forEach((b) => {
    const cat = b.category || "Other";
    cats[cat] = (cats[cat] || 0) + 1;
  });
  return Object.entries(cats).sort((a, b) => b[1] - a[1]);
}

/**
 * Compute all unique tags with counts from bookmarks.
 */
export function computeTags(bookmarks) {
  const tagMap = {};
  bookmarks.forEach((b) => {
    (b.tags || []).forEach((t) => {
      tagMap[t] = (tagMap[t] || 0) + 1;
    });
  });
  return Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
}
