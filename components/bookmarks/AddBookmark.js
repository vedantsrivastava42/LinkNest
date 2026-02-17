"use client";

import { useState } from "react";
import { categorizeBookmark } from "@/lib/services/bookmarks";

export default function AddBookmark({ onAdd }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setAiStatus("analyzing");

    try {
      const aiData = await categorizeBookmark(url.trim(), title.trim());
      setAiStatus(aiData ? "done" : "error");

      const finalTitle =
        title.trim() ||
        aiData?.suggestedTitle ||
        aiData?.pageTitle ||
        url.trim();

      const { error } = await onAdd(finalTitle, url.trim(), aiData || {});
      if (!error) {
        setTitle("");
        setUrl("");
      }
    } catch (err) {
      console.error("Error adding bookmark:", err);
      setAiStatus("error");
    } finally {
      setLoading(false);
      setTimeout(() => setAiStatus(""), 3000);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-2xl bg-white/[0.03] p-5 border border-white/[0.06] backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <span className="text-base text-orange-400">+</span> Add Bookmark
        </h2>
        {aiStatus && (
          <span
            className={`flex items-center gap-1.5 text-xs font-medium ${
              aiStatus === "analyzing"
                ? "text-orange-400"
                : aiStatus === "done"
                ? "text-emerald-400"
                : "text-zinc-500"
            }`}
          >
            {aiStatus === "analyzing" && (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                AI is analyzing…
              </>
            )}
            {aiStatus === "done" && "✦ AI categorized!"}
            {aiStatus === "error" && "Saved without AI"}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Title (optional — AI will suggest one)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 focus:outline-none backdrop-blur-sm transition-all"
        />
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 focus:outline-none backdrop-blur-sm transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:from-orange-500 hover:to-amber-500 hover:shadow-lg hover:shadow-orange-500/15 active:scale-[0.97] disabled:opacity-50 disabled:hover:shadow-none"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Analyzing
            </span>
          ) : (
            "Add"
          )}
        </button>
      </div>
    </form>
  );
}
