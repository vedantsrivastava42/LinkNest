"use client";

import BookmarkItem from "./BookmarkItem";

export default function BookmarkList({
  bookmarks,
  onDelete,
  onToggleFavourite,
  onTogglePin,
  onEdit,
  onTrackClick,
  categoryColors,
  bulkMode,
  selectedIds,
  onToggleSelect,
  emptyMessage,
}) {
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
        <span className="mb-3 text-4xl opacity-40">📭</span>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {bookmarks.map((bookmark) => (
        <BookmarkItem
          key={bookmark.id}
          bookmark={bookmark}
          onDelete={onDelete}
          onToggleFavourite={onToggleFavourite}
          onTogglePin={onTogglePin}
          onEdit={onEdit}
          onTrackClick={onTrackClick}
          categoryColors={categoryColors}
          bulkMode={bulkMode}
          isSelected={selectedIds?.has(bookmark.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </ul>
  );
}
