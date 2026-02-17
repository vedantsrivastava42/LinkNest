/**
 * Adapter interface contracts.
 *
 * Each platform adapter (web, extension) must export functions
 * matching these signatures. This file serves as documentation;
 * JavaScript doesn't enforce interfaces at runtime, but this
 * keeps the contract clear.
 *
 * ── Auth Adapter ───────────────────────────────────────────
 * getSession()          → { user, error }
 * signIn(provider)      → void (triggers redirect / popup)
 * signOut()             → void
 * onAuthChange(cb)      → unsubscribe function
 *
 * ── Storage Adapter (Bookmark operations) ──────────────────
 * getBookmarks(userId)   → { data, error }
 * insertBookmark(userId, title, url, aiData)  → { data, error }
 * removeBookmark(id)     → { error }
 * updateBookmark(id, fields)  → { error }
 * toggleFavourite(id, value)  → { error }
 * togglePin(id, value)        → { error }
 * bulkDelete(ids)             → { error }
 * bulkUpdateCategory(ids, category) → { error }
 * bulkInsert(userId, bookmarks)     → { data, error }
 * incrementClick(id)          → void
 * subscribeRealtime(userId, onEvent) → unsubscribe function
 *
 * ── AI Adapter ─────────────────────────────────────────────
 * categorize(url, userTitle)  → { category, tags, summary, suggestedTitle, pageTitle }
 */

// This file intentionally exports nothing. It's for reference only.
// Import the concrete adapters from lib/adapters/web/ or lib/adapters/extension/.
