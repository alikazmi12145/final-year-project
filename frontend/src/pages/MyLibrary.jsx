import React from "react";
import { BookmarkCheck, Clock, Heart } from "lucide-react";
import BookmarksList from "../components/bookmarks/BookmarksList";
import HistoryList from "../components/history/HistoryList";
import FavoritesList from "../components/poetry/FavoritesList";

/**
 * My Library Page
 * Shows user's bookmarks and reading history
 */
const MyLibrary = () => {
  const [activeTab, setActiveTab] = React.useState("bookmarks");

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            📚 My Library
          </h1>
          <p className="text-lg text-urdu-maroon">
            میری لائبریری - Manage your bookmarks and reading history
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2
              ${
                activeTab === "bookmarks"
                  ? "bg-urdu-gold text-white shadow-lg"
                  : "bg-white text-urdu-brown hover:bg-urdu-cream"
              }
            `}
          >
            <BookmarkCheck size={20} />
            Bookmarks
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2
              ${
                activeTab === "history"
                  ? "bg-urdu-gold text-white shadow-lg"
                  : "bg-white text-urdu-brown hover:bg-urdu-cream"
              }
            `}
          >
            <Clock size={20} />
            Reading History
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2
              ${
                activeTab === "favorites"
                  ? "bg-urdu-gold text-white shadow-lg"
                  : "bg-white text-urdu-brown hover:bg-urdu-cream"
              }
            `}
          >
            <Heart size={20} />
            Favorites
          </button>
        </div>

        {/* Tab Content */}
        <div className="card p-6">
          {activeTab === "bookmarks" ? (
            <BookmarksList />
          ) : activeTab === "favorites" ? (
            <FavoritesList />
          ) : (
            <HistoryList showStats={true} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MyLibrary;
