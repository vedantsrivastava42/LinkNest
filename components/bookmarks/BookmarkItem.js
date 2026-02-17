"use client";

import { useState } from "react";
import { getFaviconUrl } from "@/lib/utils/url";
import { CATEGORY_COLORS } from "@/lib/constants/categories";

const CATEGORIES = Object.keys(CATEGORY_COLORS);

export default function BookmarkItem({
  bookmark,
  onDelete,
  onToggleFavourite,
  onTogglePin,
  onEdit,
  onTrackClick,
  categoryColors,
  bulkMode,
  isSelected,
  onToggleSelect,
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(bookmark.title);
  const [editUrl, setEditUrl] = useState(bookmark.url);
  const [editCategory, setEditCategory] = useState(bookmark.category || "Other");
  const [editTags, setEditTags] = useState(bookmark.tags || []);
  const [tagInput, setTagInput] = useState("");

  const faviconUrl = getFaviconUrl(bookmark.url);
  const catColor =
    categoryColors?.[bookmark.category] || categoryColors?.Other || "";

  const handleSave = () => {
    if (!editTitle.trim() || !editUrl.trim()) return;
    onEdit(bookmark.id, editTitle.trim(), editUrl.trim(), editCategory, editTags);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditCategory(bookmark.category || "Other");
    setEditTags(bookmark.tags || []);
    setTagInput("");
    setEditing(false);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove) => {
    setEditTags(editTags.filter((t) => t !== tagToRemove));
  };

  if (editing) {
    return (
      <li
        className="rounded-2xl bg-white/[0.03] px-5 py-4 border border-white/[0.12] backdrop-blur-xl transition-all"
        style={{
          boxShadow:
            "0 0 12px rgba(255,255,255,0.04), inset 0 0 12px rgba(255,255,255,0.01)",
        }}
      >
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 focus:outline-none backdrop-blur-sm"
            placeholder="Title"
            autoFocus
          />
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 focus:outline-none backdrop-blur-sm"
            placeholder="https://example.com"
          />

          {/* Category Dropdown */}
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-600">
              Category
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-sm text-zinc-100 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 focus:outline-none backdrop-blur-sm appearance-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-zinc-900 text-zinc-100">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Editor */}
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-600">
              Tags
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 min-h-[38px]">
              {editTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-md bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[11px] text-zinc-300 font-medium"
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="cursor-pointer text-zinc-500 hover:text-red-400 transition-colors ml-0.5"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={editTags.length === 0 ? "Add tags…" : ""}
                className="flex-1 min-w-[80px] bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[10px] text-zinc-600">Press Enter to add a tag</p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-400 transition-all hover:bg-white/[0.06]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="cursor-pointer rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:from-orange-500 hover:to-amber-500 active:scale-[0.97]"
            >
              Save
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      onClick={() => {
        if (bulkMode) {
          onToggleSelect(bookmark.id);
          return;
        }
        if (onTrackClick) onTrackClick(bookmark.id);
        window.open(bookmark.url, "_blank", "noopener,noreferrer");
      }}
      className={`group flex items-start gap-4 rounded-2xl px-5 py-4 border backdrop-blur-xl transition-all cursor-pointer ${
        isSelected
          ? "bg-orange-500/10 border-orange-500/30"
          : bookmark.is_pinned
          ? "bg-amber-500/[0.04] border-amber-500/20"
          : "bg-white/[0.02] border-white/[0.14] hover:bg-white/[0.04] hover:border-white/[0.22]"
      }`}
      style={{
        boxShadow:
          "0 0 18px rgba(255,255,255,0.05), inset 0 0 14px rgba(255,255,255,0.02)",
      }}
    >
      {/* Bulk Select Checkbox */}
      {bulkMode && (
        <div className="flex items-center shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={() => onToggleSelect(bookmark.id)}
            className="h-4 w-4 rounded border-zinc-600 text-orange-500 focus:ring-orange-500 cursor-pointer accent-orange-500"
          />
        </div>
      )}

      {/* Pin Indicator */}
      {bookmark.is_pinned && !bulkMode && (
        <span className="shrink-0 text-amber-400 text-xs mt-0.5" title="Pinned">📌</span>
      )}
      {/* Favicon */}
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          className="h-5 w-5 shrink-0 rounded mt-0.5"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/[0.05] text-xs text-zinc-500 mt-0.5">
          🔗
        </span>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="truncate text-sm font-medium text-zinc-200">
            {bookmark.title}
          </p>
          {bookmark.category && (
            <span
              className={`shrink-0 rounded-lg bg-gradient-to-r px-2 py-0.5 text-[10px] font-semibold border ${catColor}`}
            >
              {bookmark.category}
            </span>
          )}
          {(bookmark.click_count || 0) > 0 && (
            <span
              className="shrink-0 rounded-md bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-500 font-medium flex items-center gap-0.5"
              title={`Visited ${bookmark.click_count} time${bookmark.click_count !== 1 ? "s" : ""}`}
            >
              👁 {bookmark.click_count}
            </span>
          )}
        </div>
        <span className="block truncate text-xs text-zinc-500 group-hover:text-orange-400 transition-colors">
          {bookmark.url}
        </span>

        {bookmark.ai_summary && (
          <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed flex items-start gap-1">
            <span className="text-orange-400/70 shrink-0">✦</span>
            {bookmark.ai_summary}
          </p>
        )}

        {bookmark.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {bookmark.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-500 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex flex-col sm:flex-row items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onTogglePin(bookmark.id, bookmark.is_pinned)}
          className={`cursor-pointer rounded-lg p-1.5 text-sm transition-all hover:scale-110 ${
            bookmark.is_pinned
              ? "text-amber-400"
              : "text-zinc-600 hover:text-amber-400"
          }`}
          title={bookmark.is_pinned ? "Unpin" : "Pin to top"}
        >
          📌
        </button>

        <button
          onClick={() => onToggleFavourite(bookmark.id, bookmark.is_favorite)}
          className={`cursor-pointer rounded-lg p-1.5 text-base transition-all hover:scale-110 ${
            bookmark.is_favorite
              ? "text-amber-400"
              : "text-zinc-600 hover:text-amber-400"
          }`}
          title={
            bookmark.is_favorite
              ? "Remove from favourites"
              : "Add to favourites"
          }
        >
          {bookmark.is_favorite ? "★" : "☆"}
        </button>

        <button
          onClick={() => setEditing(true)}
          className="cursor-pointer rounded-lg p-1.5 text-sm text-zinc-400 transition-all duration-200 hover:scale-125 hover:text-zinc-200 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          title="Edit bookmark"
        >
          ✎
        </button>

        <button
          onClick={() => onDelete(bookmark.id)}
          className="cursor-pointer rounded-lg p-1.5 text-sm text-zinc-400 transition-all duration-200 hover:scale-125 hover:text-red-400 hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]"
          title="Delete bookmark"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
