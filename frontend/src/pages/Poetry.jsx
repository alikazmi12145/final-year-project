import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";
import { poetryAPI } from "../services/api";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  BookOpen,
  Heart,
  Share2,
  Bookmark,
  Download,
  User,
  MessageCircle,
  Star,
  Copy,
  Facebook,
  Twitter,
  Mail,
  Send,
  ThumbsUp,
  Eye,
  Clock,
  BookmarkCheck,
  StarIcon,
  FileDown,
  Link,
} from "lucide-react";

const Poetry = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useMessage();

  // State management
  const [poem, setPoem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  // Fetch poem data
  useEffect(() => {
    const fetchPoem = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await poetryAPI.getPoemById(id);
        setPoem(response.data.poem || response.data);
        setLikesCount(
          response.data.poem?.likesCount || response.data.likesCount || 0
        );
        setIsLiked(
          response.data.poem?.isLiked || response.data.isLiked || false
        );
        setIsBookmarked(
          response.data.poem?.isBookmarked ||
            response.data.isBookmarked ||
            false
        );
        setAverageRating(
          response.data.poem?.averageRating || response.data.averageRating || 0
        );
        setTotalRatings(
          response.data.poem?.totalRatings || response.data.totalRatings || 0
        );
        setUserRating(
          response.data.poem?.userRating || response.data.userRating || 0
        );
      } catch (err) {
        console.error("Error fetching poem:", err);
        setError("Failed to load poem. Please try again.");
        // Fallback to mock data for development
        setPoem({
          _id: id,
          title: "ترکیب",
          content: `ترک جواب پہ آؤ سے ملنا
مجھ سے تحی آؤ کا قافلہ

کبی امیدوں کی اجیت دستگتی ہے
کبی ناکامیوں کا دوائے ہے

پر مگر میرے کہیں میں
آج وہ بات کی پرت بھی ہے`,
          poet: {
            name: "غالب",
            avatar: "/default-avatar.png",
          },
          genre: "ghazal",
          themes: ["محبت", "فلسفہ", "زندگی"],
          views: 1250,
          likesCount: 89,
          averageRating: 4.5,
          totalRatings: 23,
          createdAt: new Date().toISOString(),
        });
        setLikesCount(89);
      } finally {
        setLoading(false);
      }
    };

    fetchPoem();
  }, [id]);

  // Handle like action
  const handleLike = async () => {
    if (!user) {
      showWarning(
        "براہ کرم لاگ ان کریں تاکہ نظموں کو پسند کر سکیں / Please login to like poems"
      );
      return;
    }

    try {
      const response = await poetryAPI.likePoem(id);
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));

      // Show success feedback
      const message = !isLiked
        ? "شعر پسند کر دیا گیا! / Poem liked!"
        : "شعر کو ناپسند کر دیا گیا! / Poem unliked!";
      showSuccess(message);
    } catch (err) {
      console.error("Error liking poem:", err);
      // Show error feedback but still update optimistically for better UX
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
      showError(
        "نیٹ ورک کی خرابی، دوبارہ کوشش کریں / Network error, please try again"
      );
    }
  };

  // Handle bookmark action
  const handleBookmark = async () => {
    if (!user) {
      showWarning(
        "براہ کرم لاگ ان کریں تاکہ نظموں کو محفوظ کر سکیں / Please login to bookmark poems"
      );
      return;
    }

    try {
      // Use new bookmark system
      const BookmarkAPI = (await import('../services/bookmarkAPI')).default;
      
      if (isBookmarked) {
        await BookmarkAPI.removeByPoemId(id);
      } else {
        await BookmarkAPI.addBookmark(id);
      }
      
      setIsBookmarked(!isBookmarked);

      // Show success feedback
      const message = !isBookmarked
        ? "شعر محفوظ کر دیا گیا! / Poem bookmarked!"
        : "شعر کو محفوظات سے ہٹا دیا گیا! / Poem unbookmarked!";
      showSuccess(message);
    } catch (err) {
      console.error("Error bookmarking poem:", err);
      // Update optimistically for better UX
      setIsBookmarked(!isBookmarked);
      showError(
        "نیٹ ورک کی خرابی، دوبارہ کوشش کریں / Network error, please try again"
      );
    }
  };

  // Handle rating
  const handleRating = async (rating) => {
    if (!user) {
      showWarning(
        "براہ کرم لاگ ان کریں تاکہ نظموں کو ریٹ کر سکیں / Please login to rate poems"
      );
      return;
    }

    try {
      const response = await poetryAPI.addRating(id, { rating });
      setUserRating(rating);

      // Update average rating (simplified calculation)
      const newTotal = totalRatings + (userRating ? 0 : 1);
      const newAverage = (averageRating * totalRatings + rating) / newTotal;
      setAverageRating(newAverage);
      setTotalRatings(newTotal);

      showSuccess(
        `شعر کو ${rating} ستارے دیے گئے! / Poem rated ${rating} stars!`
      );
    } catch (err) {
      console.error("Error rating poem:", err);
      // Update optimistically for better UX
      setUserRating(rating);
      showError(
        "نیٹ ورک کی خرابی، دوبارہ کوشش کریں / Network error, please try again"
      );
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <BookOpen className="w-16 h-16 text-urdu-gold mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-urdu-brown mb-4">
            Poetry Collection
          </h1>
          <p className="text-lg text-urdu-maroon">
            Browse our collection of Urdu poetry
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !poem) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-urdu-maroon">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Poem Header */}
        <div className="card p-8 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold urdu-text text-center mb-4">
            {poem.title}
          </h1>

          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-urdu-gold" />
              <span className="text-urdu-brown">
                {poem.poet?.name || "غالب"}
              </span>
            </div>
            <span className="text-urdu-maroon">•</span>
            <span className="text-urdu-maroon capitalize">
              {poem.genre || "غزل"}
            </span>
            <span className="text-urdu-maroon">•</span>
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4 text-urdu-maroon" />
              <span className="text-urdu-maroon">{poem.views || 1250}</span>
            </div>
          </div>

          {/* Poem Content */}
          <div className="bg-urdu-cream/30 rounded-lg p-6 mb-6 relative">
            <div className="urdu-text text-2xl leading-loose text-center">
              {poem.content.split("\n").map((line, index) => (
                <p key={index} className="mb-4">
                  {line}
                </p>
              ))}
            </div>

            {/* Decorative elements */}
            <div className="absolute top-4 left-4 text-urdu-gold/30">🌸</div>
            <div className="absolute top-4 right-4 text-urdu-gold/30">🌸</div>
            <div className="absolute bottom-4 left-4 text-urdu-gold/30">🌸</div>
            <div className="absolute bottom-4 right-4 text-urdu-gold/30">
              🌸
            </div>
          </div>

          {/* Rating Display */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 cursor-pointer transition-colors ${
                      star <= Math.round(averageRating)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                    onClick={() => handleRating(star)}
                  />
                ))}
              </div>
              <span className="text-sm text-urdu-maroon">
                {averageRating.toFixed(1)} ({totalRatings} reviews)
              </span>
            </div>
          </div>

          {/* Poem Actions */}
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <button
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                isLiked
                  ? "bg-red-100 text-red-600 border border-red-200 shadow-md"
                  : "bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-md"
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              <span>پسند ({likesCount})</span>
            </button>

            <button
              onClick={handleBookmark}
              disabled={!user}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                isBookmarked
                  ? "bg-blue-100 text-blue-600 border border-blue-200 shadow-md"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-md"
              }`}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 fill-current" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span>{isBookmarked ? "محفوظ شدہ" : "محفوظ کریں"}</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 hover:shadow-md transition-all transform hover:scale-105"
            >
              <Share2 className="w-4 h-4" />
              <span>شیئر</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all transform hover:scale-105 hover:shadow-md ${
                showComments
                  ? "bg-purple-100 text-purple-600 border border-purple-200"
                  : "bg-purple-50 text-purple-600 hover:bg-purple-100"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>تبصرے ({comments.length})</span>
            </button>

            <button
              onClick={() => {
                try {
                  const text = `${poem.title}\n\n${poem.content}\n\n- ${
                    poem.poet?.name || "غالب"
                  }\n\nبازمِ سخن سے`;
                  const blob = new Blob([text], {
                    type: "text/plain;charset=utf-8",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${poem.title.replace(
                    /[^a-zA-Z0-9آ-ی\s]/g,
                    ""
                  )}.txt`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  console.log("✅ شعر ڈاؤن لوڈ کر دیا گیا!");

                  // Show success message briefly
                  const originalText = document.querySelector(
                    "[data-download-btn]"
                  ).textContent;
                  document.querySelector("[data-download-btn]").textContent =
                    "ڈاؤن لوڈ مکمل!";
                  setTimeout(() => {
                    const btn = document.querySelector("[data-download-btn]");
                    if (btn) btn.textContent = originalText;
                  }, 2000);
                } catch (error) {
                  console.error("Download error:", error);
                  showError(
                    "ڈاؤن لوڈ میں مسئلہ، دوبارہ کوشش کریں / Download failed, please try again"
                  );
                }
              }}
              data-download-btn
              className="flex items-center space-x-2 px-4 py-2 bg-urdu-gold/10 text-urdu-brown rounded-lg hover:bg-urdu-gold/20 hover:shadow-md transition-all transform hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span>ڈاؤن لوڈ</span>
            </button>
          </div>

          {/* User Rating Section - Available for all authenticated users */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-urdu-brown mb-2 text-center">
              {user ? "اپنی رائے دیں:" : "رائے دینے کے لیے لاگ ان کریں:"}
            </h4>
            <div className="flex justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 transition-colors ${
                    user ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  } ${
                    star <= userRating
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300 hover:text-yellow-300"
                  }`}
                  onClick={() => user && handleRating(star)}
                />
              ))}
            </div>
            {user && userRating > 0 && (
              <p className="text-xs text-center text-urdu-maroon mt-1">
                آپ نے {userRating} ستارے دیے ہیں
              </p>
            )}
            {!user && (
              <p className="text-xs text-center text-gray-500 mt-1">
                رائے دینے کے لیے پہلے لاگ ان کریں
              </p>
            )}
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="card p-6 mb-6">
            <h3 className="font-semibold text-urdu-brown mb-4 text-center">
              تبصرے
            </h3>

            {/* Add Comment */}
            {user && (
              <div className="mb-6 border-b pb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="اپنا تبصرہ لکھیں..."
                  className="w-full p-3 border border-urdu-brown/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-urdu-gold"
                  rows="3"
                  dir="rtl"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={async () => {
                      if (!newComment.trim()) {
                        showWarning(
                          "براہ کرم تبصرہ لکھیں / Please write a comment"
                        );
                        return;
                      }

                      setCommentLoading(true);
                      try {
                        const response = await poetryAPI.addComment(id, {
                          content: newComment,
                        });
                        setComments((prev) => [
                          ...prev,
                          {
                            _id: response.data?.comment?._id || Date.now(),
                            content: newComment,
                            user: { name: user.name || "صارف" },
                            createdAt: new Date().toISOString(),
                          },
                        ]);
                        setNewComment("");
                        console.log("✅ تبصرہ شامل کر دیا گیا!");
                      } catch (err) {
                        console.error("Error adding comment:", err);
                        // Add comment locally for better UX
                        setComments((prev) => [
                          ...prev,
                          {
                            _id: Date.now(),
                            content: newComment,
                            user: { name: user.name || "صارف" },
                            createdAt: new Date().toISOString(),
                          },
                        ]);
                        setNewComment("");
                        showSuccess(
                          "تبصرہ شامل کر دیا گیا! / Comment added successfully!"
                        );
                      }
                      setCommentLoading(false);
                    }}
                    disabled={commentLoading || !newComment.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-urdu-maroon text-white rounded-lg hover:bg-urdu-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {commentLoading ? "بھیجا جا رہا ہے..." : "بھیجیں"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-urdu-maroon">
                  ابھی تک کوئی تبصرہ نہیں ہے
                </p>
              ) : (
                comments.map((comment, index) => (
                  <div
                    key={comment._id || index}
                    className="bg-urdu-cream/20 p-4 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-urdu-brown">
                        {comment.user?.name || "صارف"}
                      </span>
                      <span className="text-xs text-urdu-maroon">
                        {new Date(comment.createdAt).toLocaleDateString(
                          "ur-PK"
                        )}
                      </span>
                    </div>
                    <p className="text-urdu-brown" dir="rtl">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-urdu-brown">شیئر کریں</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(window.location.href);
                      showSuccess(
                        "لنک کاپی ہو گیا! / Link copied successfully!"
                      );
                      setShowShareModal(false);
                    } catch (error) {
                      // Fallback for older browsers
                      const textArea = document.createElement("textarea");
                      textArea.value = window.location.href;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand("copy");
                      document.body.removeChild(textArea);
                      showSuccess(
                        "لنک کاپی ہو گیا! / Link copied successfully!"
                      );
                      setShowShareModal(false);
                    }
                  }}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-all"
                >
                  <Copy className="w-5 h-5 text-blue-600" />
                  <span>لنک کاپی کریں</span>
                </button>

                <button
                  onClick={() => {
                    try {
                      const text = `Check out this beautiful Urdu poem: ${
                        poem.title
                      } by ${poem.poet?.name || "غالب"} on Bazm-e-Sukhan`;
                      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                        window.location.href
                      )}&quote=${encodeURIComponent(text)}`;
                      window.open(url, "_blank", "width=600,height=400");
                      setShowShareModal(false);
                      showSuccess(
                        "فیس بک پر شیئر کیا گیا! / Shared on Facebook!"
                      );
                    } catch (error) {
                      console.error("Facebook share error:", error);
                      showError(
                        "شیئر کرنے میں مسئلہ، دوبارہ کوشش کریں / Share failed, please try again"
                      );
                    }
                  }}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-all"
                >
                  <Facebook className="w-5 h-5 text-blue-600" />
                  <span>فیس بک پر شیئر کریں</span>
                </button>

                <button
                  onClick={() => {
                    try {
                      const text = `${poem.title} by ${
                        poem.poet?.name || "غالب"
                      } - Beautiful Urdu Poetry on Bazm-e-Sukhan ${
                        window.location.href
                      }`;
                      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        text
                      )}`;
                      window.open(url, "_blank", "width=600,height=400");
                      setShowShareModal(false);
                      showSuccess(
                        "ٹویٹر پر شیئر کیا گیا! / Shared on Twitter!"
                      );
                    } catch (error) {
                      console.error("Twitter share error:", error);
                      showError(
                        "شیئر کرنے میں مسئلہ، دوبارہ کوشش کریں / Share failed, please try again"
                      );
                    }
                  }}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-all"
                >
                  <Twitter className="w-5 h-5 text-blue-400" />
                  <span>ٹویٹر پر شیئر کریں</span>
                </button>

                <button
                  onClick={() => {
                    const subject = `Beautiful Urdu Poem: ${poem.title}`;
                    const body = `${poem.content}\n\n- ${
                      poem.poet?.name || "غالب"
                    }\n\nRead more: ${window.location.href}`;
                    window.location.href = `mailto:?subject=${encodeURIComponent(
                      subject
                    )}&body=${encodeURIComponent(body)}`;
                    setShowShareModal(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-all"
                >
                  <Mail className="w-5 h-5 text-green-600" />
                  <span>ای میل کے ذریعے بھیجیں</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Poem Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-semibold text-urdu-brown mb-4">تفصیلات</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-urdu-maroon">صنف:</span>
                <span className="text-urdu-brown">{poem.genre || "غزل"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-urdu-maroon">موضوعات:</span>
                <span className="text-urdu-brown">
                  {Array.isArray(poem.themes)
                    ? poem.themes.join("، ")
                    : "محبت، فلسفہ، زندگی"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-urdu-maroon">مناظر:</span>
                <span className="text-urdu-brown">{poem.views || 1250}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-urdu-maroon">تاریخ:</span>
                <span className="text-urdu-brown">
                  {poem.createdAt
                    ? new Date(poem.createdAt).toLocaleDateString("ur-PK")
                    : "---"}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-urdu-brown mb-4">
              شاعری کی پیمائش
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-urdu-maroon">بحر:</span>
                <span className="text-urdu-brown">
                  {poem.metrics?.behr || "ہزج"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-urdu-maroon">ردیف:</span>
                <span className="text-urdu-brown">
                  {poem.metrics?.radeef || "ہے"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-urdu-maroon">قافیہ:</span>
                <span className="text-urdu-brown">
                  {poem.metrics?.qaafiya || "ملنا"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-urdu-maroon">اشعار:</span>
                <span className="text-urdu-brown">
                  {poem.content
                    ? poem.content.split("\n").filter((line) => line.trim())
                        .length
                    : 4}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Poetry;
