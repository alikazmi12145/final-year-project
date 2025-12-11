import React from "react";
import { Link } from "react-router-dom";
import { Clock, User, Trash2, BookOpen, Flame } from "lucide-react";
import useHistory, { useReadingStreak } from "../../hooks/useHistory";
import { LoadingSpinner } from "../ui/LoadingSpinner";

/**
 * History List Component
 * Displays user's reading history with statistics
 */
const HistoryList = ({ onPoemClick, showStats = true }) => {
  const {
    history,
    loading,
    error,
    pagination,
    removeHistoryEntry,
    clearHistory,
    fetchHistory,
  } = useHistory({
    autoFetch: true,
    limit: 30,
  });

  const { currentStreak, longestStreak } = useReadingStreak();

  const handleRemove = async (historyId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm("Remove this entry from your reading history?")) {
      try {
        await removeHistoryEntry(historyId);
      } catch (error) {
        alert("Failed to remove history entry");
      }
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        "Clear all reading history? This action cannot be undone."
      )
    ) {
      try {
        await clearHistory();
      } catch (error) {
        alert("Failed to clear history");
      }
    }
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.pages) {
      fetchHistory({ page: pagination.page + 1 });
    }
  };

  const formatReadTime = (date) => {
    const now = new Date();
    const readDate = new Date(date);
    const diffInSeconds = Math.floor((now - readDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return readDate.toLocaleDateString();
  };

  if (loading && history.length === 0) {
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
        <button onClick={() => fetchHistory()} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reading Stats */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-urdu-gold" />
            <div className="text-2xl font-bold text-urdu-brown">
              {pagination?.total || history.length}
            </div>
            <div className="text-sm text-urdu-maroon">Poems Read</div>
          </div>
          
          <div className="card p-4 text-center">
            <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold text-urdu-brown">
              {currentStreak}
            </div>
            <div className="text-sm text-urdu-maroon">Day Streak</div>
          </div>
          
          <div className="card p-4 text-center">
            <Flame className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold text-urdu-brown">
              {longestStreak}
            </div>
            <div className="text-sm text-urdu-maroon">Best Streak</div>
          </div>
          
          <div className="card p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-urdu-brown">
              {history.length > 0 ? formatReadTime(history[0].readAt) : "N/A"}
            </div>
            <div className="text-sm text-urdu-maroon">Last Read</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-urdu-brown">
          Reading History
        </h2>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-urdu-gold opacity-50" />
          <h3 className="text-xl font-bold text-urdu-brown mb-2">
            No Reading History
          </h3>
          <p className="text-urdu-maroon mb-4">
            Start reading poems to build your history
          </p>
          <Link to="/search" className="btn-primary inline-block">
            Explore Poems
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <Link
              key={entry._id}
              to={`/poems/${entry.poem?._id}`}
              onClick={() => onPoemClick && onPoemClick(entry.poem)}
              className="card p-4 hover:shadow-lg transition-all group flex items-center justify-between"
            >
              <div className="flex-1">
                <h3 className="text-lg font-bold text-urdu-brown mb-1 group-hover:text-urdu-gold transition-colors">
                  {entry.poem?.urduTitle || entry.poem?.title || "Untitled"}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-urdu-maroon">
                  {entry.poem?.author && (
                    <div className="flex items-center">
                      <User size={14} className="mr-1" />
                      {entry.poem.author.name}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1" />
                    {formatReadTime(entry.readAt)}
                  </div>
                  {entry.readCount > 1 && (
                    <div className="bg-urdu-cream px-2 py-1 rounded text-xs font-medium">
                      Read {entry.readCount}x
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={(e) => handleRemove(entry._id, e)}
                className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded ml-4"
                title="Remove from history"
              >
                <Trash2 size={18} />
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Load More */}
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

export default HistoryList;
