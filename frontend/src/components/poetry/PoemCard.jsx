import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Heart,
  MessageCircle,
  Eye,
  Edit,
  Trash2,
  User,
  Calendar,
  Star,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";

const PoemCard = ({
  poem,
  showActions = false,
  onDelete,
  onEdit,
  isBookmarked = false,
  onBookmark,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [liked, setLiked] = useState(poem.isLiked || false);
  const [likeCount, setLikeCount] = useState(poem.likesCount || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [viewCount, setViewCount] = useState(poem.viewsCount || 0);
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateContent = (content, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const handleBookmark = async () => {
    if (bookmarkLoading || !onBookmark) return;

    setBookmarkLoading(true);
    try {
      await onBookmark(poem._id);
      setBookmarked(!bookmarked);
    } catch (error) {
      console.error("Bookmark error:", error);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert("براہ کرم لاگ ان کریں - Please login to like poems");
      return;
    }

    if (likeLoading) return;

    setLikeLoading(true);
    try {
      // Dynamic import to avoid circular dependencies
      const { poetryAPI } = await import("../../services/api");
      const response = await poetryAPI.likePoem(poem._id);

      setLiked(!liked);
      setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

      console.log(
        liked ? "❤️ شعر کو نا پسند کر دیا گیا!" : "💖 شعر پسند کر دیا گیا!"
      );
    } catch (error) {
      console.error("Like error:", error);
      // Optimistic update even on error for better UX
      setLiked(!liked);
      setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
      alert("نیٹ ورک کی خرابی - Network error, please try again");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleViewIncrement = async () => {
    try {
      // Increment view count when user clicks to read poem
      setViewCount((prev) => prev + 1);

      // Call API to track view
      const { poetryAPI } = await import("../../services/api");
      await poetryAPI.incrementView(poem._id);

      console.log("👁️ نظر کا شمار بڑھایا گیا - View count incremented!");
    } catch (error) {
      console.error("View tracking error:", error);
      // Keep the optimistic update even if API call fails
    }
  };

  const handleCommentClick = () => {
    // Navigate to poem detail page with comments section focused
    navigate(`/poems/${poem._id}#comments`);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < Math.floor(rating)
            ? "text-yellow-400 fill-current"
            : "text-gray-300"
        }`}
      />
    ));
  };

  const getCategoryInUrdu = (category) => {
    const categoryMap = {
      ghazal: "غزل",
      nazm: "نظم",
      rubai: "رباعی",
      qasida: "قصیدہ",
      masnavi: "مثنوی",
      free_verse: "آزاد نظم",
      hamd: "حمد",
      naat: "نعت",
      manqabat: "منقبت",
      marsiya: "مرثیہ",
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      {/* Header with Poet Info */}
      <div className="flex items-start space-x-4 mb-4">
        {/* Poet Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-urdu-gold/20 rounded-full flex items-center justify-center">
            {poem.poet?.avatar ? (
              <img
                src={poem.poet.avatar}
                alt={poem.poet.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-urdu-brown" />
            )}
          </div>
        </div>

        {/* Poem Info */}
        <div className="flex-1">
          <Link to={`/poems/${poem._id}`} onClick={handleViewIncrement}>
            <h3 className="text-xl font-bold text-urdu-brown hover:text-urdu-gold urdu-text mb-2 hover:scale-105 transform transition-all duration-300">
              {poem.title}
            </h3>
          </Link>

          <div className="flex items-center space-x-4 text-sm text-urdu-maroon mb-2">
            {(poem.poet || poem.author) && (
              <div className="flex items-center space-x-1">
                <span className="font-medium">
                  {poem.poet?.name || poem.author?.name || "نامعلوم شاعر"}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(poem.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <span className="inline-block bg-urdu-gold/20 text-urdu-brown px-2 py-1 rounded-full text-xs">
              {getCategoryInUrdu(poem.category)}
            </span>
            {poem.poetryLanguage && (
              <span className="inline-block bg-urdu-maroon/20 text-urdu-maroon px-2 py-1 rounded-full text-xs">
                {poem.poetryLanguage === "urdu" ? "اردو" : poem.poetryLanguage}
              </span>
            )}
            {poem.status && (
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs ${
                  poem.status === "published" || poem.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : poem.status === "under_review"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {(poem.status === "published" || poem.status === "approved") &&
                  "شائع شدہ"}
                {poem.status === "under_review" && "زیر جائزہ"}
                {poem.status === "draft" && "مسودہ"}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(poem._id)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Poem"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(poem._id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Poem"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="mb-4">
        <p className="urdu-text text-gray-700 leading-relaxed">
          {truncateContent(poem.content)}
        </p>
      </div>

      {/* Description */}
      {poem.description && (
        <div className="mb-4">
          <p className="text-sm text-urdu-maroon">
            {truncateContent(poem.description, 100)}
          </p>
        </div>
      )}

      {/* Tags */}
      {poem.tags && poem.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {poem.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-urdu-cream text-urdu-brown px-2 py-1 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
            {poem.tags.length > 3 && (
              <span className="text-xs text-urdu-maroon">
                +{poem.tags.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer Stats - Interactive */}
      <div className="flex items-center justify-between text-sm text-urdu-maroon border-t border-urdu-cream pt-3">
        <div className="flex items-center space-x-4">
          {/* Interactive Like Button */}
          <button
            onClick={handleLike}
            disabled={!user || likeLoading}
            className={`flex items-center space-x-1 transition-all hover:scale-105 ${
              !user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            } ${
              liked ? "text-red-500" : "text-urdu-maroon hover:text-red-500"
            }`}
            title={
              user ? (liked ? "نا پسند کریں" : "پسند کریں") : "لاگ ان کریں"
            }
          >
            <Heart
              className={`w-4 h-4 ${liked ? "fill-current" : ""} ${
                likeLoading ? "animate-pulse" : ""
              }`}
            />
            <span>{likeCount}</span>
          </button>

          {/* Interactive Comment Button */}
          <button
            onClick={handleCommentClick}
            className="flex items-center space-x-1 text-urdu-maroon hover:text-blue-500 transition-all hover:scale-105 cursor-pointer"
            title="تبصرے دیکھیں"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{poem.commentsCount || 0}</span>
          </button>

          {/* View Counter */}
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{viewCount}</span>
          </div>

          {/* Rating Display */}
          {poem.averageRating > 0 && (
            <div className="flex items-center space-x-1">
              <div className="flex">{renderStars(poem.averageRating)}</div>
              <span className="text-xs">({poem.averageRating.toFixed(1)})</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Bookmark Button */}
          {user && (
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className={`p-1 rounded transition-all hover:scale-105 ${
                bookmarked
                  ? "text-urdu-gold hover:text-urdu-brown"
                  : "text-urdu-maroon hover:text-urdu-gold"
              } ${bookmarkLoading ? "opacity-50 animate-pulse" : ""}`}
              title={bookmarked ? "بُک مارک ہٹائیں" : "بُک مارک کریں"}
            >
              {bookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          )}

          <Link
            to={`/poems/${poem._id}`}
            onClick={handleViewIncrement}
            className="text-urdu-gold hover:text-urdu-brown transition-all font-medium hover:scale-105 inline-block"
          >
            مکمل پڑھیں
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PoemCard;
