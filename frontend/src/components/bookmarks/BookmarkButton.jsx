import React, { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useIsBookmarked } from "../../hooks/useBookmarks";

/**
 * Bookmark Button Component
 * Toggles bookmark status for a poem
 */
const BookmarkButton = ({ poemId, size = "md", showLabel = false, onToggle }) => {
  const { isBookmarked, loading, toggleBookmark } = useIsBookmarked(poemId);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setIsAnimating(true);
      await toggleBookmark();
      
      // Call optional callback
      if (onToggle) {
        onToggle(!isBookmarked);
      }

      // Show success message (you can customize this with your toast system)
      if (!isBookmarked) {
        console.log("Bookmark added successfully!");
      } else {
        console.log("Bookmark removed successfully!");
      }
    } catch (error) {
      console.error("Bookmark toggle error:", error);
      // Show error message
      alert("Failed to update bookmark. Please try again.");
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const sizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        ${sizes[size]}
        inline-flex items-center justify-center
        rounded-full
        transition-all duration-300
        ${
          isBookmarked
            ? "bg-urdu-gold text-white hover:bg-urdu-brown"
            : "bg-white text-urdu-gold hover:bg-urdu-cream border-2 border-urdu-gold"
        }
        ${isAnimating ? "scale-110" : "scale-100"}
        ${loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg"}
        focus:outline-none focus:ring-2 focus:ring-urdu-gold focus:ring-offset-2
      `}
      title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
      ) : isBookmarked ? (
        <BookmarkCheck size={iconSizes[size]} className="animate-bounce-once" />
      ) : (
        <Bookmark size={iconSizes[size]} />
      )}
      {showLabel && (
        <span className="ml-2 font-medium">
          {isBookmarked ? "Bookmarked" : "Bookmark"}
        </span>
      )}
    </button>
  );
};

export default BookmarkButton;
