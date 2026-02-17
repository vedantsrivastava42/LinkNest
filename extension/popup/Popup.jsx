import React, { useState, useEffect, useCallback } from "react";
import { auth, storage } from "../../lib/adapters/extension/index.js";
import { CATEGORY_COLORS } from "../../lib/core/categories.js";
import { getFaviconUrl } from "../../lib/core/url.js";

export default function Popup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentTab, setCurrentTab] = useState({ url: "", title: "" });
  const [recentBookmarks, setRecentBookmarks] = useState([]);
  const [aiStatus, setAiStatus] = useState("");

  // Check auth on mount
  useEffect(() => {
    (async () => {
      try {
        const { user } = await auth.getSession();
        setUser(user);

        if (user) {
          // Fetch recent bookmarks
          const { data } = await storage.getBookmarks(user.id);
          setRecentBookmarks((data || []).slice(0, 5));
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Get current tab info
  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB" }, (response) => {
      if (response) {
        setCurrentTab(response);
      }
    });

    // Check for pending bookmark from context menu
    chrome.storage.local.get("pendingBookmark", (result) => {
      if (result.pendingBookmark) {
        setCurrentTab({
          url: result.pendingBookmark.url,
          title: result.pendingBookmark.title,
        });
        chrome.runtime.sendMessage({ type: "CLEAR_PENDING" });
      }
    });
  }, []);

  // Listen for quick-save from background
  useEffect(() => {
    const handler = (message) => {
      if (message.type === "QUICK_SAVE") {
        setCurrentTab(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const handleSignIn = async () => {
    try {
      // This sends a message to the background worker which handles
      // the OAuth flow (survives popup close). When user reopens the
      // popup, getSession() will find the saved session.
      await auth.signIn("google");
      // If we're still open, update state immediately
      const { user } = await auth.getSession();
      setUser(user);
      if (user) {
        const { data } = await storage.getBookmarks(user.id);
        setRecentBookmarks((data || []).slice(0, 5));
      }
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setUser(null);
    setRecentBookmarks([]);
  };

  const handleSaveBookmark = useCallback(async () => {
    if (!user || !currentTab.url || saving) return;

    setSaving(true);
    setAiStatus("analyzing");

    try {
      // AI categorization
      const aiData = await storage.categorize(
        currentTab.url,
        currentTab.title
      );
      setAiStatus(aiData ? "done" : "skipped");

      const finalTitle =
        currentTab.title ||
        aiData?.suggestedTitle ||
        currentTab.url;

      const { data, error } = await storage.insertBookmark(
        user.id,
        finalTitle,
        currentTab.url,
        aiData || {}
      );

      if (!error && data) {
        setSaved(true);
        setRecentBookmarks((prev) => [data, ...prev.slice(0, 4)]);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Save failed:", err);
      setAiStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setAiStatus(""), 3000);
    }
  }, [user, currentTab, saving]);

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="popup-container">
        <div className="header">
          <span className="logo">🔖</span>
          <h1>LinkNest</h1>
        </div>
        <p className="subtitle">Sign in to save bookmarks</p>
        <button className="btn-primary" onClick={handleSignIn}>
          <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  // Logged in
  return (
    <div className="popup-container">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <span className="logo">🔖</span>
          <h1>LinkNest</h1>
        </div>
        <div className="header-right">
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="avatar"
              referrerPolicy="no-referrer"
            />
          )}
          <button className="btn-text" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Save Current Page */}
      <div className="save-section">
        <div className="current-page">
          {currentTab.url && (
            <img
              src={getFaviconUrl(currentTab.url) || ""}
              alt=""
              className="favicon"
              onError={(e) => (e.target.style.display = "none")}
            />
          )}
          <div className="page-info">
            <p className="page-title">{currentTab.title || "Current page"}</p>
            <p className="page-url">{currentTab.url}</p>
          </div>
        </div>

        <button
          className={`btn-save ${saved ? "btn-saved" : ""}`}
          onClick={handleSaveBookmark}
          disabled={saving || saved || !currentTab.url}
        >
          {saving ? (
            <span className="saving-text">
              <span className="spinner" />
              {aiStatus === "analyzing" ? "AI analyzing..." : "Saving..."}
            </span>
          ) : saved ? (
            "✓ Saved!"
          ) : (
            "+ Save Bookmark"
          )}
        </button>
      </div>

      {/* Recent Bookmarks */}
      {recentBookmarks.length > 0 && (
        <div className="recent-section">
          <h3 className="section-title">Recent</h3>
          <ul className="recent-list">
            {recentBookmarks.map((b) => (
              <li key={b.id} className="recent-item">
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="recent-link"
                >
                  <img
                    src={getFaviconUrl(b.url) || ""}
                    alt=""
                    className="favicon-sm"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <span className="recent-title">{b.title}</span>
                  {b.category && (
                    <span className={`category-badge ${(b.category || "").toLowerCase().replace(/\s+/g, "-")}`}>
                      {b.category}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Open Dashboard Link */}
      <div className="footer">
        <a
          href={`${import.meta.env.VITE_API_BASE_URL || ""}/dashboard`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-text dashboard-link"
        >
          Open full dashboard →
        </a>
      </div>
    </div>
  );
}
