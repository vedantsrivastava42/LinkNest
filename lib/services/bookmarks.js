/**
 * Re-export from web adapter for backward compatibility.
 * Bookmark service logic now lives in lib/adapters/web/storage.js.
 *
 * These named exports match the original function signatures exactly,
 * so all existing imports continue to work unchanged.
 */

import {
  insertBookmark,
  removeBookmark,
  updateBookmark,
  toggleFavourite as toggleBookmarkFavourite,
  togglePin as toggleBookmarkPin,
  bulkDelete as bulkDeleteBookmarks,
  bulkUpdateCategory,
  bulkInsert as bulkInsertBookmarks,
  incrementClick as incrementClickCount,
  categorize as categorizeBookmark,
} from "@/lib/adapters/web/storage";

export {
  insertBookmark,
  removeBookmark,
  updateBookmark,
  toggleBookmarkFavourite,
  toggleBookmarkPin,
  bulkDeleteBookmarks,
  bulkUpdateCategory,
  bulkInsertBookmarks,
  incrementClickCount,
  categorizeBookmark,
};
