import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMessage } from "../../context/MessageContext";
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
  Share2,
  Download,
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
  const { showMessage } = useMessage();
  const navigate = useNavigate();

  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [liked, setLiked] = useState(poem.isLiked || false);
  const [likeCount, setLikeCount] = useState(
    Array.isArray(poem.likes) ? poem.likes.length : 0
  );
  const [likeLoading, setLikeLoading] = useState(false);
  const [viewCount, setViewCount] = useState(poem.views || 0);
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
      showMessage("براہ کرم لاگ ان کریں", "Please login to like poems", "info");
      return;
    }

    if (likeLoading) return;

    setLikeLoading(true);
    try {
      // Dynamic import to avoid circular dependencies
      const { poetryAPI } = await import("../../services/api.jsx");
      const response = await poetryAPI.likePoem(poem._id);

      setLiked(!liked);
      setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error("Like error:", error);
      // Optimistic update even on error for better UX
      setLiked(!liked);
      setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
      showMessage(
        "نیٹ ورک کی خرابی",
        "Network error, please try again",
        "error"
      );
    } finally {
      setLikeLoading(false);
    }
  };

  const handleViewIncrement = async () => {
    try {
      // Increment view count when user clicks to read poem
      setViewCount((prev) => prev + 1);

      // Call API to track view
      const { poetryAPI } = await import("../../services/api.jsx");
      await poetryAPI.incrementView(poem._id);
    } catch (error) {
      console.error("View tracking error:", error);
      // Keep the optimistic update even if API call fails
    }
  };

  const handleCommentClick = () => {
    // Navigate to poem detail page with comments section focused
    navigate(`/poems/${poem._id}#comments`);
  };

  const handleShare = async () => {
    const shareData = {
      title: poem.title,
      text: `${poem.title} - ${
        poem.poet?.name || poem.author?.name || "نامعلوم شاعر"
      }`,
      url: `${window.location.origin}/poems/${poem._id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        showMessage("لنک کاپی ہو گیا", "Link copied to clipboard", "success");
      }
    } catch (error) {
      console.error("Share error:", error);
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        showMessage("لنک کاپی ہو گیا", "Link copied to clipboard", "success");
      } catch (clipboardError) {
        showMessage("شیئر کرنے میں خرابی", "Unable to share", "error");
      }
    }
  };

  const handleDownload = async () => {
    try {
      const content = `${poem.title}\n${
        poem.poet?.name || poem.author?.name || "نامعلوم شاعر"
      }\n\n${poem.content}`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${poem.title}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showMessage(
        "نظم ڈاؤن لوڈ ہو گئی",
        "Poem downloaded successfully",
        "success"
      );
    } catch (error) {
      console.error("Download error:", error);
      showMessage("ڈاؤن لوڈ میں خرابی", "Download failed", "error");
    }
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
    <div className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-urdu-cream/30 hover:border-urdu-gold/50 transform hover:-translate-y-1 h-full flex flex-col">
      {/* Header with Poet Info */}
      <div className="flex items-start space-x-4 mb-4">
        {/* Poet Avatar */}
        <div className="flex-shrink-0">
          <div className="w-14 h-14 bg-gradient-to-br from-urdu-gold/20 to-urdu-maroon/20 rounded-full flex items-center justify-center ring-2 ring-urdu-cream shadow-md">
            {poem.poet?.avatar ? (
              <img
                src={poem.poet.avatar}
                alt={poem.poet.name}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 text-urdu-brown" />
            )}
          </div>
        </div>

        {/* Poem Info */}
        <div className="flex-1">
          <Link to={`/poems/${poem._id}`} onClick={handleViewIncrement}>
            <h3 className="text-xl font-bold text-urdu-brown hover:text-urdu-gold urdu-text mb-2 hover:scale-105 transform transition-all duration-300 line-clamp-2">
              {poem.title}
            </h3>
          </Link>

          <div className="flex items-center space-x-4 text-sm text-urdu-maroon mb-3">
            {(poem.poet || poem.author) && (
              <div className="flex items-center space-x-1 font-medium">
                <span>
                  {poem.poet?.name || poem.author?.name || "نامعلوم شاعر"}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-1 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(poem.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center bg-gradient-to-r from-urdu-gold/20 to-urdu-maroon/20 text-urdu-brown px-3 py-1 rounded-full text-xs font-medium">
              {getCategoryInUrdu(poem.category)}
            </span>
            {poem.poetryLanguage && (
              <span className="inline-flex items-center bg-urdu-maroon/10 text-urdu-maroon px-3 py-1 rounded-full text-xs font-medium">
                {poem.poetryLanguage === "urdu" ? "اردو" : poem.poetryLanguage}
              </span>
            )}
            {poem.status && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  poem.status === "published" || poem.status === "approved"
                    ? "bg-green-100 text-green-700 ring-1 ring-green-200"
                    : poem.status === "under_review"
                    ? "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200"
                    : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
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
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
              title="Edit Poem"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(poem._id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
              title="Delete Poem"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="flex-grow">
        <div className="mb-4 relative">
          <div className="bg-gradient-to-r from-urdu-cream/30 to-transparent p-4 rounded-lg border-l-4 border-urdu-gold">
            <p className="urdu-text text-gray-700 leading-relaxed text-base line-clamp-4">
              {truncateContent(poem.content)}
            </p>
          </div>
        </div>

        {/* Description */}
        {poem.description && (
          <div className="mb-4">
            <p className="text-sm text-urdu-maroon/80 italic line-clamp-2">
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
                  className="inline-block bg-urdu-cream/60 text-urdu-brown px-2 py-1 rounded-md text-xs hover:bg-urdu-cream transition-colors"
                >
                  #{tag}
                </span>
              ))}
              {poem.tags.length > 3 && (
                <span className="text-xs text-urdu-maroon font-medium">
                  +{poem.tags.length - 3} مزید
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats - Interactive */}
      <div className="flex items-center justify-between text-sm text-urdu-maroon border-t border-urdu-cream/50 pt-4 mt-4">
        <div className="flex items-center space-x-4">
          {/* Interactive Like Button */}
          <button
            onClick={handleLike}
            disabled={!user || likeLoading}
            className={`flex items-center space-x-1 transition-all duration-200 hover:scale-110 ${
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
            <span className="font-medium">{likeCount}</span>
          </button>

          {/* Interactive Comment Button */}
          <button
            onClick={handleCommentClick}
            className="flex items-center space-x-1 text-urdu-maroon hover:text-blue-500 transition-all duration-200 hover:scale-110 cursor-pointer"
            title="تبصرے دیکھیں"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">{poem.commentsCount || 0}</span>
          </button>

          {/* View Counter */}
          <div className="flex items-center space-x-1 text-gray-500">
            <Eye className="w-4 h-4" />
            <span className="font-medium">{viewCount}</span>
          </div>

          {/* Rating Display */}
          {poem.averageRating > 0 && (
            <div className="flex items-center space-x-1">
              <div className="flex">{renderStars(poem.averageRating)}</div>
              <span className="text-xs font-medium">
                ({poem.averageRating.toFixed(1)})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-1 rounded transition-all duration-200 hover:scale-110 text-urdu-maroon hover:text-urdu-gold"
            title="شیئر کریں"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="p-1 rounded transition-all duration-200 hover:scale-110 text-urdu-maroon hover:text-urdu-gold"
            title="ڈاؤن لوڈ کریں"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Bookmark Button */}
          {user && (
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className={`p-1 rounded transition-all duration-200 hover:scale-110 ${
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
            className="text-urdu-gold hover:text-urdu-brown transition-all duration-200 font-medium hover:scale-105 inline-block px-3 py-1 bg-urdu-gold/10 hover:bg-urdu-gold/20 rounded-md"
          >
            مکمل پڑھیں
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PoemCard;
