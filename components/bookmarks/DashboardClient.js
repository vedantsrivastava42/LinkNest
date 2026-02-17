"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_COLORS } from "@/lib/constants/categories";
import {
  insertBookmark,
  removeBookmark,
  updateBookmark,
  toggleBookmarkFavourite,
  toggleBookmarkPin,
  bulkDeleteBookmarks,
  bulkUpdateCategory,
  incrementClickCount,
  bulkInsertBookmarks,
} from "@/lib/services/bookmarks";
import { exportBookmarks, parseImportFile } from "@/lib/importExport";
import { useToast } from "@/components/ui/Toast";
import AddBookmark from "./AddBookmark";
import BookmarkList from "./BookmarkList";

export default function DashboardClient({ initialBookmarks, userId }) {
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [filter, setFilter] = useState("all"); // "all" | "favourites" | category name
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState(null); // null or tag string
  const [sortBy, setSortBy] = useState("newest");
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [tagsOverflow, setTagsOverflow] = useState(false);
  const tagsRef = useRef(null);
  const [catsExpanded, setCatsExpanded] = useState(false);
  const [catsOverflow, setCatsOverflow] = useState(false);
  const catsRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCatDropdown, setBulkCatDropdown] = useState(false);
  const { addToast } = useToast();
  const deleteTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const optimisticIdsRef = useRef(new Set());

  useEffect(() => {
    setBookmarks(initialBookmarks);
  }, [initialBookmarks]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

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
          if (payload.eventType === "INSERT") {
            if (optimisticIdsRef.current.has(payload.new.id)) {
              optimisticIdsRef.current.delete(payload.new.id);
              return;
            }
            setBookmarks((prev) => {
              if (prev.some((b) => b.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== payload.old.id)
            );
          } else if (payload.eventType === "UPDATE") {
            setBookmarks((prev) =>
              prev.map((b) => (b.id === payload.new.id ? payload.new : b))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Compute categories from bookmarks
  const categories = useMemo(() => {
    const cats = {};
    bookmarks.forEach((b) => {
      const cat = b.category || "Other";
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  // Compute all unique tags with counts
  const allTags = useMemo(() => {
    const tagMap = {};
    bookmarks.forEach((b) => {
      (b.tags || []).forEach((t) => {
        tagMap[t] = (tagMap[t] || 0) + 1;
      });
    });
    return Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  // Detect if categories overflow one line
  useEffect(() => {
    if (catsRef.current) {
      setCatsOverflow(catsRef.current.scrollHeight > 42);
    }
  }, [categories]);

  // Detect if tags overflow one line
  useEffect(() => {
    if (tagsRef.current) {
      setTagsOverflow(tagsRef.current.scrollHeight > 38);
    }
  }, [allTags]);

  const addBookmark = useCallback(
    async (title, url, aiData = {}) => {
      const { data, error } = await insertBookmark(userId, title, url, aiData);

      if (!error && data) {
        optimisticIdsRef.current.add(data.id);
        setBookmarks((prev) => [data, ...prev]);
        addToast("Bookmark added", { type: "success" });
      } else if (error) {
        addToast("Failed to add bookmark", { type: "error" });
      }
      return { error };
    },
    [userId, addToast]
  );

  const deleteBookmark = useCallback(
    async (id) => {
      // Find the bookmark before removing
      let deleted;
      setBookmarks((prev) => {
        deleted = prev.find((b) => b.id === id);
        return prev.filter((b) => b.id !== id);
      });

      if (!deleted) return;

      // Set a timer — only actually delete from DB after timeout
      const timer = setTimeout(async () => {
        await removeBookmark(id);
        deleteTimerRef.current = null;
      }, 5000);

      deleteTimerRef.current = { id, timer };

      addToast(`"${deleted.title}" deleted`, {
        type: "undo",
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timer);
            deleteTimerRef.current = null;
            setBookmarks((prev) => [deleted, ...prev]);
            addToast("Bookmark restored", { type: "success", duration: 2000 });
          },
        },
      });
    },
    [addToast]
  );

  const toggleFavourite = useCallback(async (id, currentValue) => {
    const newValue = !currentValue;
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_favorite: newValue } : b))
    );

    const { error } = await toggleBookmarkFavourite(id, newValue);

    if (error) {
      setBookmarks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_favorite: currentValue } : b))
      );
      addToast("Failed to update favourite", { type: "error" });
    } else {
      addToast(
        newValue ? "Added to favourites" : "Removed from favourites",
        { type: newValue ? "success" : "undo", duration: 2000 }
      );
    }
  }, [addToast]);

  const editBookmark = useCallback(async (id, title, url, category, tags) => {
    let old;
    setBookmarks((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          old = b;
          return { ...b, title, url, category, tags };
        }
        return b;
      })
    );

    const { error } = await updateBookmark(id, title, url, category, tags);

    if (error && old) {
      setBookmarks((prev) => prev.map((b) => (b.id === id ? old : b)));
      addToast("Failed to update bookmark", { type: "error" });
    } else {
      addToast("Bookmark updated", { type: "success", duration: 2000 });
    }
  }, [addToast]);

  // ── Pin / Unpin ──────────────────────────────────────────────
  const togglePin = useCallback(async (id, currentValue) => {
    const newValue = !currentValue;
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_pinned: newValue } : b))
    );
    const { error } = await toggleBookmarkPin(id, newValue);
    if (error) {
      setBookmarks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_pinned: currentValue } : b))
      );
      addToast("Failed to update pin", { type: "error" });
    } else {
      addToast(newValue ? "Pinned to top" : "Unpinned", {
        type: "success",
        duration: 2000,
      });
    }
  }, [addToast]);

  // ── Bulk Actions ─────────────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(bookmarks.map((b) => b.id)));
  }, [bookmarks]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const removed = bookmarks.filter((b) => selectedIds.has(b.id));
    setBookmarks((prev) => prev.filter((b) => !selectedIds.has(b.id)));
    setSelectedIds(new Set());

    const { error } = await bulkDeleteBookmarks(ids);
    if (error) {
      setBookmarks((prev) => [...removed, ...prev]);
      addToast("Bulk delete failed", { type: "error" });
    } else {
      addToast(`Deleted ${ids.length} bookmarks`, { type: "success" });
    }
  }, [selectedIds, bookmarks, addToast]);

  const handleBulkCategory = useCallback(async (category) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const oldBookmarks = bookmarks.filter((b) => selectedIds.has(b.id));
    setBookmarks((prev) =>
      prev.map((b) => (selectedIds.has(b.id) ? { ...b, category } : b))
    );
    setBulkCatDropdown(false);

    const { error } = await bulkUpdateCategory(ids, category);
    if (error) {
      setBookmarks((prev) =>
        prev.map((b) => {
          const old = oldBookmarks.find((o) => o.id === b.id);
          return old ? { ...b, category: old.category } : b;
        })
      );
      addToast("Bulk category update failed", { type: "error" });
    } else {
      addToast(`${ids.length} bookmarks → ${category}`, { type: "success" });
    }
  }, [selectedIds, bookmarks, addToast]);

  const handleBulkExport = useCallback(() => {
    const selected = bookmarks.filter((b) => selectedIds.has(b.id));
    if (selected.length === 0) return;
    exportBookmarks(selected);
    addToast(`Exported ${selected.length} selected bookmarks`, { type: "success" });
  }, [selectedIds, bookmarks, addToast]);

  // ── Import / Export ──────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (bookmarks.length === 0) {
      addToast("No bookmarks to export", { type: "info", duration: 2500 });
      return;
    }
    exportBookmarks(bookmarks);
    addToast(`Exported ${bookmarks.length} bookmarks`, { type: "success" });
  }, [bookmarks, addToast]);

  const handleImport = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so user can re-import same file if needed
      e.target.value = "";

      setImporting(true);
      try {
        const text = await file.text();
        const { bookmarks: parsed, errors } = parseImportFile(text);

        if (errors.length > 0) {
          addToast(errors[0], { type: "error", duration: 4000 });
        }
        if (parsed.length === 0) {
          setImporting(false);
          return;
        }

        // Deduplicate — skip URLs already in the user's library
        const existingUrls = new Set(bookmarks.map((b) => b.url));
        const newOnes = parsed.filter((b) => !existingUrls.has(b.url));
        const dupes = parsed.length - newOnes.length;

        if (newOnes.length === 0) {
          addToast(
            `All ${parsed.length} bookmarks already exist — nothing to import`,
            { type: "info", duration: 3000 }
          );
          setImporting(false);
          return;
        }

        const { data, error } = await bulkInsertBookmarks(userId, newOnes);

        if (error) {
          addToast("Import failed: " + error.message, { type: "error" });
        } else {
          setBookmarks((prev) => [
            ...(data || []),
            ...prev,
          ]);
          const msg = dupes
            ? `Imported ${newOnes.length} bookmarks (${dupes} duplicates skipped)`
            : `Imported ${newOnes.length} bookmarks`;
          addToast(msg, { type: "success" });
        }
      } catch (err) {
        console.error("Import error:", err);
        addToast("Failed to read file", { type: "error" });
      } finally {
        setImporting(false);
      }
    },
    [bookmarks, userId, addToast]
  );

  // Track bookmark click
  const trackClick = useCallback(async (id) => {
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, click_count: (b.click_count || 0) + 1 } : b
      )
    );
    await incrementClickCount(id);
  }, []);

  const totalBookmarks = bookmarks.length;
  const totalFavourites = bookmarks.filter((b) => b.is_favorite).length;

  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    // Filter by tab
    if (filter === "favourites") result = result.filter((b) => b.is_favorite);
    else if (filter !== "all")
      result = result.filter((b) => (b.category || "Other") === filter);

    // Filter by tag
    if (tagFilter) {
      result = result.filter((b) => (b.tags || []).includes(tagFilter));
    }

    // Search
    if (searchQuery.trim()) {
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
  }, [bookmarks, filter, tagFilter, searchQuery]);

  // Sort (pinned always first)
  const sortedBookmarks = useMemo(() => {
    const sorted = [...filteredBookmarks];
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
  }, [filteredBookmarks, sortBy]);

  return (
    <>
      <AddBookmark onAdd={addBookmark} />

      {/* Import / Export / Bulk Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={handleExport}
          className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-400 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <span className="text-sm">📤</span> Export
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-400 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-50"
        >
          {importing ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              Importing…
            </>
          ) : (
            <>
              <span className="text-sm">📥</span> Import
            </>
          )}
        </button>

        <button
          onClick={() => {
            setBulkMode(!bulkMode);
            setSelectedIds(new Set());
            setBulkCatDropdown(false);
          }}
          className={`cursor-pointer flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium backdrop-blur-sm transition-all ${
            bulkMode
              ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
              : "border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
          }`}
        >
          <span className="text-sm">☑</span> {bulkMode ? "Exit Select" : "Select"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
        />

        {/* Bulk Action Bar */}
        {bulkMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-zinc-400">
              {selectedIds.size} selected
            </span>
            <button
              onClick={selectAll}
              className="cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium text-orange-400 border border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/20 transition-all"
            >
              All
            </button>
            <button
              onClick={deselectAll}
              className="cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium text-zinc-400 border border-white/[0.06] hover:text-zinc-200 transition-all"
            >
              None
            </button>
            <button
              onClick={handleBulkExport}
              className="cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-medium text-blue-400 border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 transition-all"
            >
              📤 Export
            </button>
            <div className="relative">
              <button
                onClick={() => setBulkCatDropdown(!bulkCatDropdown)}
                className="cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-medium text-amber-400 border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all"
              >
                🏷 Category ▼
              </button>
              {bulkCatDropdown && (
                <div className="absolute top-8 left-0 z-50 max-h-48 overflow-y-auto rounded-xl border border-white/[0.08] bg-zinc-900 shadow-2xl py-1">
                  {Object.keys(CATEGORY_COLORS).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleBulkCategory(cat)}
                      className="cursor-pointer block w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06] transition-all"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleBulkDelete}
              className="cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-medium text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-all"
            >
              🗑 Delete
            </button>
          </div>
        )}
      </div>

      {/* Search Bar + Sort */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search bookmarks by title, URL, tag, category…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 focus:outline-none backdrop-blur-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 pr-9 text-sm text-zinc-300 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 focus:outline-none backdrop-blur-sm transition-all cursor-pointer"
          >
            <option value="newest" className="bg-zinc-900">Newest first</option>
            <option value="oldest" className="bg-zinc-900">Oldest first</option>
            <option value="title-az" className="bg-zinc-900">Title A → Z</option>
            <option value="title-za" className="bg-zinc-900">Title Z → A</option>
            <option value="most-visited" className="bg-zinc-900">Most visited</option>
            <option value="least-visited" className="bg-zinc-900">Least visited</option>
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-xs">
            ▼
          </span>
        </div>
      </div>

      {/* Stats / Filter Bar */}
      <div className="mb-4">
        <div className="relative">
          <div
            ref={catsRef}
            className={`flex flex-wrap items-center gap-2 transition-all duration-300 ${
              catsExpanded ? "" : "max-h-[38px] overflow-hidden"
            }`}
          >
            <button
              onClick={() => setFilter("all")}
              className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-all backdrop-blur-sm ${
                filter === "all"
                  ? "bg-gradient-to-r from-orange-600/90 to-amber-600/90 text-white shadow-lg shadow-orange-500/10"
                  : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
              All
              <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                {totalBookmarks}
              </span>
            </button>
            <button
              onClick={() => setFilter("favourites")}
              className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-all backdrop-blur-sm ${
                filter === "favourites"
                  ? "bg-gradient-to-r from-orange-600/90 to-amber-600/90 text-white shadow-lg shadow-orange-500/10"
                  : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
              <span className="mr-1">★</span>
              Favourites
              <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                {totalFavourites}
              </span>
            </button>

            {/* Category filters — auto-generated from bookmarks */}
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all backdrop-blur-sm ${
                  filter === cat
                    ? "bg-gradient-to-r from-orange-600/90 to-amber-600/90 text-white shadow-lg shadow-orange-500/10"
                    : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300 hover:bg-white/[0.06]"
                }`}
              >
                {cat}
                <span className="ml-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              </button>
            ))}
          </div>
          {catsOverflow && (
            <button
              onClick={() => setCatsExpanded(!catsExpanded)}
              className="mt-1.5 cursor-pointer flex items-center gap-1 text-[10px] text-zinc-500 hover:text-orange-400 transition-colors"
            >
              <span
                className={`inline-block transition-transform duration-300 ${
                  catsExpanded ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
              {catsExpanded
                ? "Show less"
                : `Show all ${categories.length} categories`}
            </button>
          )}
        </div>
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">
              Tags
            </span>
            {tagFilter && (
              <button
                onClick={() => setTagFilter(null)}
                className="cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium text-orange-400 border border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/20 transition-all"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <div
              ref={tagsRef}
              className={`flex flex-wrap gap-1.5 transition-all duration-300 ${
                tagsExpanded ? "" : "max-h-[34px] overflow-hidden"
              }`}
            >
              {allTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all ${
                    tagFilter === tag
                      ? "bg-gradient-to-r from-orange-600/90 to-amber-600/90 text-white shadow-lg shadow-orange-500/10"
                      : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300 hover:bg-white/[0.06]"
                  }`}
                >
                  #{tag}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              ))}
            </div>
            {tagsOverflow && (
              <button
                onClick={() => setTagsExpanded(!tagsExpanded)}
                className="mt-1.5 cursor-pointer flex items-center gap-1 text-[10px] text-zinc-500 hover:text-orange-400 transition-colors"
              >
                <span
                  className={`inline-block transition-transform duration-300 ${
                    tagsExpanded ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
                {tagsExpanded ? "Show less" : `Show all ${allTags.length} tags`}
              </button>
            )}
          </div>
        </div>
      )}

      <BookmarkList
        bookmarks={sortedBookmarks}
        onDelete={deleteBookmark}
        onToggleFavourite={toggleFavourite}
        onTogglePin={togglePin}
        onEdit={editBookmark}
        onTrackClick={trackClick}
        categoryColors={CATEGORY_COLORS}
        bulkMode={bulkMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        emptyMessage={
          filter === "favourites"
            ? "No favourites yet. Star a bookmark to add it here!"
            : filter !== "all"
            ? `No bookmarks in "${filter}" category.`
            : searchQuery
            ? "No bookmarks match your search."
            : tagFilter
            ? `No bookmarks with tag "#${tagFilter}".`
            : "No bookmarks yet. Add one above!"
        }
      />
    </>
  );
}
