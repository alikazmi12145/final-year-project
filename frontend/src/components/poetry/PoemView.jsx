import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Share2,
  Bookmark,
  Download,
  User,
  Calendar,
  Eye,
  MessageCircle,
  Edit,
  Trash2,
  Clock,
  Tag,
  Star,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import ReviewsSection from "./ReviewsSection";

const PoemView = ({
  poem,
  loading = false,
  onLike,
  onComment,
  onDeleteComment,
  onEdit,
  onDelete,
  onBookmark,
  onDownload,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingComment, setDeletingComment] = useState(null);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (poem) {
      setIsLiked(poem.likes?.includes(user?.userId || user?.id) || false);
      setLikesCount(poem.likesCount || 0);
      setIsBookmarked(poem.isBookmarked || false);
      setComments(poem.comments || []);
    }
  }, [poem, user]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

  const getReadingTime = (content) => {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime;
  };

  const handleLike = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    try {
      const result = await onLike(id);
      if (result) {
        setIsLiked(result.liked);
        setLikesCount(result.likesCount);
      }
    } catch (error) {
      console.error("Like error:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (isBookmarking) return;
    setIsBookmarking(true);

    try {
      if (onBookmark) {
        const result = await onBookmark(id);
        if (result !== null) {
          setIsBookmarked(!isBookmarked);
        }
      }
    } catch (error) {
      console.error("Bookmark error:", error);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (isDownloading) return;
    setIsDownloading(true);

    try {
      if (onDownload) {
        await onDownload(id);
      }
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      alert("براہ کرم تبصرہ لکھیں");
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }

    setSubmittingComment(true);
    try {
      const result = await onComment(id, newComment.trim());
      if (result) {
        setComments((prev) => [...prev, result.comment]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Comment error:", error);
      alert("تبصرہ بھیجنے میں خرابی ہوئی");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (deletingComment === commentId) return;
    
    setDeletingComment(commentId);
    try {
      if (onDeleteComment) {
        const result = await onDeleteComment(id, commentId);
        if (result?.success) {
          setComments((prev) => prev.filter(c => c._id !== commentId));
        }
      }
    } catch (error) {
      console.error("Delete comment error:", error);
    } finally {
      setDeletingComment(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: poem.title,
          text: `${poem.title} - ${poem.poet?.name || "نامعلوم شاعر"}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert("لنک کاپی ہو گیا!");
    }
  };

  const canEditOrDelete =
    user &&
    (user.id === poem?.author?._id ||
      user.role === "admin" ||
      user.role === "moderator");

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-bold text-urdu-brown mb-4">
            نظم نہیں ملی
          </h1>
          <p className="text-urdu-maroon mb-6">معذرت، یہ نظم دستیاب نہیں ہے۔</p>
          <Link
            to="/poems"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>واپس شاعری میں</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-urdu-brown hover:text-urdu-gold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>واپس</span>
          </button>

          {canEditOrDelete && (
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(poem._id)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="نظم میں تبدیلی"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(poem._id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="نظم کو حذف کریں"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Poem Header */}
        <div className="card p-8 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold urdu-text text-center mb-6 text-urdu-brown">
            {poem.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6 text-sm text-urdu-maroon">
            {poem.poet && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{poem.poet.name}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(poem.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{getReadingTime(poem.content)} منٹ پڑھنے کا وقت</span>
            </div>
          </div>

          {/* Categories and Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="inline-block bg-urdu-gold/20 text-urdu-brown px-3 py-1 rounded-full text-sm font-medium">
              {getCategoryInUrdu(poem.category)}
            </span>
            {poem.language && (
              <span className="inline-block bg-urdu-maroon/20 text-urdu-maroon px-3 py-1 rounded-full text-sm">
                {poem.poetryLanguage === "urdu" ? "اردو" : poem.poetryLanguage}
              </span>
            )}
            {poem.tags?.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center space-x-1 bg-urdu-cream text-urdu-brown px-2 py-1 rounded-full text-xs"
              >
                <Tag className="w-3 h-3" />
                <span>#{tag}</span>
              </span>
            ))}
          </div>

          {/* Poem Content */}
          <div className="bg-urdu-cream/30 rounded-lg p-8 mb-6">
            <div className="urdu-text text-xl md:text-2xl leading-loose text-center text-urdu-brown">
              {poem.content.split("\n").map((line, index) => (
                <p key={index} className="mb-4">
                  {line || "\u00A0"}
                </p>
              ))}
            </div>
          </div>

          {/* Description */}
          {poem.description && (
            <div className="mb-6 p-4 bg-urdu-gold/10 rounded-lg">
              <h3 className="font-semibold text-urdu-brown mb-2">تفصیل:</h3>
              <p className="text-urdu-maroon urdu-text">{poem.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isLiked
                  ? "bg-red-100 text-red-600"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              <span>پسند ({isLiking ? "..." : likesCount})</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تبصرے ({comments.length})</span>
            </button>

            <button
              onClick={handleBookmark}
              disabled={isBookmarking}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isBookmarked
                  ? "bg-green-100 text-green-600"
                  : "bg-green-50 text-green-600 hover:bg-green-100"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
              <span>{isBookmarking ? "..." : (isBookmarked ? "محفوظ شدہ" : "محفوظ کریں")}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>شیئر</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center space-x-2 px-4 py-2 bg-urdu-gold/10 text-urdu-brown rounded-lg hover:bg-urdu-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? "..." : "ڈاؤن لوڈ"}</span>
            </button>
          </div>

          {/* Statistics */}
          <div className="flex items-center justify-center space-x-6 mt-6 pt-6 border-t border-urdu-cream text-sm text-urdu-maroon">
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{poem.viewsCount || 0} نظریں</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4" />
              <span>{likesCount} پسند</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length} تبصرے</span>
            </div>
            {poem.averageRating > 0 && (
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span>{poem.averageRating.toFixed(1)} ریٹنگ</span>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="card p-6">
            <h3 className="text-xl font-semibold text-urdu-brown mb-4">
              تبصرے
            </h3>

            {/* Add Comment Form */}
            {user ? (
              <form onSubmit={handleCommentSubmit} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent urdu-text"
                  rows={3}
                  placeholder="اپنا تبصرہ لکھیں..."
                  dir="rtl"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="px-4 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? "بھیجا جا رہا ہے..." : "تبصرہ بھیجیں"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-urdu-maroon mb-2">
                  تبصرے کے لیے لاگ ان کریں
                </p>
                <Link
                  to="/auth"
                  className="inline-block px-4 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
                >
                  لاگ ان
                </Link>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment, index) => {
                  const canDeleteComment = user && (
                    comment.user?._id === user.userId || 
                    comment.user?._id === user.id ||
                    poem?.author === user.userId ||
                    poem?.author === user.id ||
                    user.role === 'admin' ||
                    user.role === 'moderator'
                  );

                  return (
                    <div key={comment._id || index} className="border-l-4 border-urdu-gold pl-4 relative group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-urdu-brown">
                            {comment.user?.name || "نامعلوم صارف"}
                          </span>
                          <span className="text-sm text-urdu-maroon">•</span>
                          <span className="text-sm text-urdu-maroon">
                            {formatDate(comment.commentedAt)}
                          </span>
                        </div>
                        {canDeleteComment && (
                          <button
                            onClick={() => handleCommentDelete(comment._id)}
                            disabled={deletingComment === comment._id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="تبصرہ حذف کریں / Delete comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-urdu-maroon urdu-text">
                        {comment.comment}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-urdu-maroon py-8">
                  ابھی تک کوئی تبصرہ نہیں ہے
                </p>
              )}
            </div>
          </div>
        )}

        {/* Reviews & Ratings Section */}
        {poem._id && (
          <div className="card p-6">
            <ReviewsSection poemId={poem._id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PoemView;
