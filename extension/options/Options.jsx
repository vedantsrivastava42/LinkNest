import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { auth, storage } from "../../lib/adapters/extension/index.js";
import { CATEGORY_COLORS } from "../../lib/core/categories.js";
import { getFaviconUrl } from "../../lib/core/url.js";
import {
  filterBookmarks,
  sortBookmarks,
  computeCategories,
  computeTags,
} from "../../lib/core/bookmarks.js";
import { exportBookmarks, parseImportFile } from "../../lib/core/importExport.js";

/**
 * Full dashboard view for the extension options page.
 * Reuses shared core logic — mirrors the web DashboardClient functionality.
 */
export default function Options() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const fileInputRef = useRef(null);

  // Auth check
  useEffect(() => {
    (async () => {
      const { user } = await auth.getSession();
      setUser(user);
      setLoading(false);

      if (user) {
        const { data } = await storage.getBookmarks(user.id);
        setBookmarks(data || []);
      }
    })();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const unsub = storage.subscribeRealtime(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        setBookmarks((prev) => {
          if (prev.some((b) => b.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      } else if (payload.eventType === "DELETE") {
        setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id));
      } else if (payload.eventType === "UPDATE") {
        setBookmarks((prev) =>
          prev.map((b) => (b.id === payload.new.id ? payload.new : b))
        );
      }
    });
    return unsub;
  }, [user]);

  const categories = useMemo(() => computeCategories(bookmarks), [bookmarks]);
  const allTags = useMemo(() => computeTags(bookmarks), [bookmarks]);

  const filtered = useMemo(
    () => filterBookmarks(bookmarks, { filter, tagFilter, searchQuery }),
    [bookmarks, filter, tagFilter, searchQuery]
  );
  const sorted = useMemo(() => sortBookmarks(filtered, sortBy), [filtered, sortBy]);

  const handleDelete = useCallback(async (id) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    await storage.removeBookmark(id);
  }, []);

  const handleToggleFav = useCallback(async (id, current) => {
    const next = !current;
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_favorite: next } : b))
    );
    await storage.toggleFavourite(id, next);
  }, []);

  const handleExport = useCallback(() => {
    if (bookmarks.length === 0) return;
    exportBookmarks(bookmarks);
  }, [bookmarks]);

  const handleSignIn = async () => {
    try {
      await auth.signIn("google");
      const { user: u } = await auth.getSession();
      setUser(u);
      if (u) {
        const { data } = await storage.getBookmarks(u.id);
        setBookmarks(data || []);
      }
    } catch (err) {
      console.error("Sign in error:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#050505", color: "#71717a" }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#050505", gap: 16 }}>
        <span style={{ fontSize: 48 }}>🔖</span>
        <h1 style={{ color: "#e4e4e7", fontSize: 24, fontWeight: 700 }}>LinkNest</h1>
        <p style={{ color: "#71717a", fontSize: 14 }}>Sign in to manage your bookmarks</p>
        <button className="btn-primary" onClick={handleSignIn} style={{ maxWidth: 260 }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, minHeight: "100vh", background: "#050505" }}>
      {/* Header */}
      <div className="header" style={{ marginBottom: 24 }}>
        <div className="header-left">
          <span className="logo" style={{ fontSize: 24 }}>🔖</span>
          <h1 style={{ fontSize: 20 }}>LinkNest</h1>
        </div>
        <div className="header-right">
          <span style={{ color: "#71717a", fontSize: 12 }}>
            {user.user_metadata?.full_name || user.email}
          </span>
          <button className="btn-text" onClick={() => { auth.signOut(); setUser(null); }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Search + Sort */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search bookmarks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)",
            color: "#e4e4e7",
            fontSize: 14,
            outline: "none",
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)",
            color: "#a1a1aa",
            fontSize: 13,
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title-az">A → Z</option>
          <option value="most-visited">Most visited</option>
        </select>
      </div>

      {/* Category Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <button
          onClick={() => setFilter("all")}
          className={`btn-text ${filter === "all" ? "active-filter" : ""}`}
          style={{
            padding: "6px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            background: filter === "all" ? "linear-gradient(to right, #e8590c, #f97316)" : "rgba(255,255,255,0.03)",
            color: filter === "all" ? "white" : "#71717a",
            border: filter === "all" ? "none" : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          All ({bookmarks.length})
        </button>
        {categories.map(([cat, count]) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="btn-text"
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 11,
              background: filter === cat ? "linear-gradient(to right, #e8590c, #f97316)" : "rgba(255,255,255,0.03)",
              color: filter === cat ? "white" : "#71717a",
              border: filter === cat ? "none" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {cat} ({count})
          </button>
        ))}
      </div>

      {/* Export */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn-text" onClick={handleExport} style={{ fontSize: 12, color: "#f97316" }}>
          📤 Export all
        </button>
      </div>

      {/* Bookmark List */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#71717a" }}>
          <span style={{ fontSize: 32, opacity: 0.4 }}>📭</span>
          <p style={{ marginTop: 8, fontSize: 13 }}>No bookmarks found</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((b) => (
            <li
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid ${b.is_pinned ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`,
                background: b.is_pinned ? "rgba(245,158,11,0.04)" : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onClick={() => {
                storage.incrementClick(b.id);
                window.open(b.url, "_blank");
              }}
            >
              <img
                src={getFaviconUrl(b.url) || ""}
                alt=""
                style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0 }}
                onError={(e) => (e.target.style.display = "none")}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {b.is_pinned && "📌 "}{b.title}
                </p>
                <p style={{ fontSize: 11, color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {b.url}
                </p>
              </div>
              {b.category && (
                <span className="category-badge">{b.category}</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleFav(b.id, b.is_favorite); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: b.is_favorite ? "#fbbf24" : "#52525b" }}
              >
                {b.is_favorite ? "★" : "☆"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#52525b" }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
