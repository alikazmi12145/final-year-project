import React from "react";
import { Link } from "react-router-dom";
import { Trash2, BookOpen, User, Calendar, X } from "lucide-react";
import useBookmarks from "../../hooks/useBookmarks";
import { LoadingSpinner } from "../ui/LoadingSpinner";

/**
 * Bookmarks List Component
 * Displays user's bookmarked poems with management options
 */
const BookmarksList = ({ onPoemClick }) => {
  const {
    bookmarks,
    loading,
    error,
    pagination,
    removeBookmark,
    clearBookmarks,
    fetchBookmarks,
  } = useBookmarks({
    autoFetch: true,
    limit: 20,
  });

  const handleRemove = async (bookmarkId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm("Are you sure you want to remove this bookmark?")) {
      try {
        await removeBookmark(bookmarkId);
      } catch (error) {
        alert("Failed to remove bookmark");
      }
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all bookmarks? This action cannot be undone."
      )
    ) {
      try {
        await clearBookmarks();
      } catch (error) {
        alert("Failed to clear bookmarks");
      }
    }
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.pages) {
      fetchBookmarks({ page: pagination.page + 1 });
    }
  };

  if (loading && bookmarks.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchBookmarks()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-urdu-gold opacity-50" />
        <h3 className="text-xl font-bold text-urdu-brown mb-2">
          No Bookmarks Yet
        </h3>
        <p className="text-urdu-maroon mb-4">
          Start bookmarking poems to save them for later
        </p>
        <Link to="/search" className="btn-primary inline-block">
          Explore Poems
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with clear all button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-urdu-brown">
          My Bookmarks ({pagination?.total || bookmarks.length})
        </h2>
        {bookmarks.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      {/* Bookmarks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bookmarks.map((bookmark) => (
          <Link
            key={bookmark._id}
            to={`/poems/${bookmark.poem?._id}`}
            onClick={() => onPoemClick && onPoemClick(bookmark.poem)}
            className="card p-4 hover:shadow-lg transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-urdu-brown mb-1 group-hover:text-urdu-gold transition-colors">
                  {bookmark.poem?.urduTitle || bookmark.poem?.title || "Untitled"}
                </h3>
                {bookmark.poem?.author && (
                  <div className="flex items-center text-sm text-urdu-maroon">
                    <User size={14} className="mr-1" />
                    {bookmark.poem.author.name}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => handleRemove(bookmark._id, e)}
                className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded"
                title="Remove bookmark"
              >
                <X size={18} />
              </button>
            </div>

            {/* Poem preview */}
            {bookmark.poem?.verses && bookmark.poem.verses.length > 0 && (
              <div className="text-sm text-urdu-maroon mb-3 line-clamp-2">
                {bookmark.poem.verses[0].urdu || bookmark.poem.verses[0].roman}
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <Calendar size={12} className="mr-1" />
                {new Date(bookmark.createdAt).toLocaleDateString()}
              </div>
              {bookmark.poem?.category && (
                <span className="bg-urdu-cream px-2 py-1 rounded text-urdu-brown">
                  {bookmark.poem.category}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Load More Button */}
      {pagination && pagination.page < pagination.pages && (
        <div className="text-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
};

export default BookmarksList;
