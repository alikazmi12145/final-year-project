import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  User,
  ChevronDown,
  ChevronUp,
  Edit3,
  Send,
  Feather,
  BookOpen,
  Sparkles,
  Heart,
  Palette,
  Award,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * ReviewsSection – Classical professional rating & review component for Urdu poetry.
 * Integrates with backend: GET/POST /api/poetry/:poemId/reviews
 *
 * Props:
 *  - poemId        (string)  required
 *  - onReviewAdded (fn)      optional callback after a review is successfully submitted
 */
const ReviewsSection = ({ poemId, onReviewAdded }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
  });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    title: "",
    content: "",
    categories: {
      literary: 3,
      emotional: 3,
      linguistic: 3,
      cultural: 3,
      originality: 3,
    },
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");

  // ──────────── Category config ────────────

  const categoryConfig = {
    literary: {
      label: "ادبی معیار",
      sublabel: "Literary Quality",
      icon: BookOpen,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    emotional: {
      label: "جذباتی اثر",
      sublabel: "Emotional Impact",
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    linguistic: {
      label: "لسانی حسن",
      sublabel: "Linguistic Beauty",
      icon: Feather,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    cultural: {
      label: "ثقافتی اہمیت",
      sublabel: "Cultural Significance",
      icon: Palette,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    originality: {
      label: "اصالت و تخلیق",
      sublabel: "Originality",
      icon: Sparkles,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  };

  // ──────────── Rating labels ────────────

  const ratingLabels = {
    1: "کمزور",
    2: "معمولی",
    3: "اچھا",
    4: "بہترین",
    5: "شاہکار",
  };

  // ──────────── Data fetching ────────────

  const fetchReviews = useCallback(
    async (page = 1) => {
      if (!poemId) return;
      setLoading(true);
      try {
        const { poetryAPI } = await import("../../services/api.jsx");
        const res = await poetryAPI.getReviews(poemId, {
          page,
          limit: 10,
          sortBy,
        });

        if (res.data.success) {
          setReviews(res.data.reviews || []);
          setPagination(res.data.pagination || {});
          setStatistics(
            res.data.statistics || {
              averageRating: 0,
              totalReviews: 0,
              distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            }
          );

          // Pre-fill form if user already reviewed
          const userReview = res.data.reviews?.find(
            (r) => r.user?._id === (user?.userId || user?.id)
          );
          if (userReview) {
            setFormData({
              rating: userReview.rating,
              title: userReview.title || "",
              content: userReview.content || "",
              categories: userReview.categories || formData.categories,
            });
            setIsEditing(true);
          }
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    },
    [poemId, sortBy, user]
  );

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  // ──────────── Submit review ────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!user) {
      navigate("/auth");
      return;
    }

    if (formData.rating === 0) {
      setFormError("براہ کرم ریٹنگ دیں");
      return;
    }
    if (!formData.title.trim()) {
      setFormError("عنوان ضروری ہے");
      return;
    }
    if (formData.content.trim().length < 10) {
      setFormError("جائزہ کم از کم 10 حروف پر مشتمل ہو");
      return;
    }

    setSubmitting(true);
    try {
      const { poetryAPI } = await import("../../services/api.jsx");
      const res = await poetryAPI.addReview(poemId, {
        rating: formData.rating,
        title: formData.title.trim(),
        content: formData.content.trim(),
        categories: formData.categories,
      });

      if (res.data.success) {
        setShowForm(false);
        setIsEditing(true);
        await fetchReviews(1);
        onReviewAdded?.();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "جائزہ بھیجنے میں خرابی ہوئی";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────── Helpful vote ────────────

  const handleHelpful = async (reviewId, isHelpful) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const { poetryAPI } = await import("../../services/api.jsx");
      await poetryAPI.markReviewHelpful(reviewId, isHelpful);
      await fetchReviews(pagination.currentPage);
    } catch (err) {
      console.error("Helpful vote error:", err);
    }
  };

  // ──────────── Reply ────────────

  const handleReply = async (reviewId) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!replyContent.trim()) return;

    try {
      const { poetryAPI } = await import("../../services/api.jsx");
      await poetryAPI.addReviewReply(reviewId, replyContent.trim());
      setReplyingTo(null);
      setReplyContent("");
      await fetchReviews(pagination.currentPage);
    } catch (err) {
      console.error("Reply error:", err);
    }
  };

  // ──────────── Helpers ────────────

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const maxDistribution = Math.max(
    ...Object.values(statistics.distribution),
    1
  );

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════

  return (
    <div className="mt-8">
      {/* ── Section Header with ornamental divider ── */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-urdu-cream" />
        </div>
        <div className="relative bg-white px-6 flex items-center gap-3">
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-urdu-gold" />
          <Award className="w-5 h-5 text-urdu-gold" />
          <h3 className="text-lg font-semibold text-urdu-brown tracking-wide">
            تنقید و تبصرہ
          </h3>
          <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-urdu-gold" />
        </div>
      </div>

      {/* ── Rating Overview Card ── */}
      <div className="bg-gradient-to-br from-urdu-cream/40 via-white to-urdu-gold/5 border border-urdu-cream/60 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Grand average */}
          <div className="flex flex-col items-center justify-center lg:min-w-[180px] lg:border-l lg:border-urdu-cream/60 lg:pl-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-urdu-gold/20 to-yellow-100 flex items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-urdu-brown">
                  {statistics.averageRating
                    ? statistics.averageRating.toFixed(1)
                    : "—"}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-urdu-gold/90 flex items-center justify-center shadow">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
            <div className="flex gap-0.5 mt-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i <= Math.round(statistics.averageRating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-urdu-maroon mt-1 font-medium">
              {statistics.totalReviews}{" "}
              {statistics.totalReviews === 1 ? "جائزہ" : "جائزے"}
            </p>
            {statistics.averageRating > 0 && (
              <span className="mt-1 text-xs px-2 py-0.5 rounded-full bg-urdu-gold/15 text-urdu-brown font-medium">
                {ratingLabels[Math.round(statistics.averageRating)]}
              </span>
            )}
          </div>

          {/* Right: Distribution */}
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = statistics.distribution[star] || 0;
                const pct =
                  statistics.totalReviews > 0
                    ? (count / statistics.totalReviews) * 100
                    : 0;
                return (
                  <div key={star} className="flex items-center gap-3 group">
                    <div className="flex items-center gap-1 w-12 justify-end">
                      <span className="text-sm font-medium text-urdu-brown">
                        {star}
                      </span>
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-yellow-300 to-yellow-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-urdu-maroon w-8 text-left tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Write / Edit Review Button ── */}
      <div className="flex items-center justify-between mb-6">
        {user ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 transition-all duration-300 ${
              showForm
                ? "border-urdu-gold bg-urdu-gold text-white shadow-lg shadow-urdu-gold/20"
                : "border-urdu-gold/40 bg-white text-urdu-brown hover:border-urdu-gold hover:bg-urdu-gold/5"
            }`}
          >
            {isEditing ? (
              <>
                <Edit3 className="w-4 h-4" />
                <span className="text-sm font-medium">ترمیم کریں</span>
              </>
            ) : (
              <>
                <Feather
                  className={`w-4 h-4 transition-transform ${showForm ? "" : "group-hover:rotate-[-15deg]"}`}
                />
                <span className="text-sm font-medium">جائزہ لکھیں</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => navigate("/auth")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-urdu-gold/40 bg-white text-urdu-brown hover:border-urdu-gold hover:bg-urdu-gold/5 transition-all"
          >
            <Feather className="w-4 h-4" />
            <span className="text-sm font-medium">
              جائزہ لکھنے کے لیے لاگ ان کریں
            </span>
          </button>
        )}

        {/* Sort Control */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-sm border border-urdu-cream rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-urdu-gold/30 focus:border-urdu-gold transition-all text-urdu-brown"
        >
          <option value="newest">تازہ ترین</option>
          <option value="oldest">پرانے پہلے</option>
          <option value="rating">اعلیٰ ریٹنگ</option>
          <option value="helpfulnessScore">سب سے مددگار</option>
        </select>
      </div>

      {/* ── Review Form ── */}
      {showForm && user && (
        <div className="mb-8 border-2 border-urdu-gold/30 rounded-2xl bg-gradient-to-b from-white to-urdu-cream/10 overflow-hidden shadow-sm">
          {/* Form header */}
          <div className="px-6 py-4 bg-gradient-to-r from-urdu-gold/10 to-transparent border-b border-urdu-cream/60">
            <h4 className="text-base font-semibold text-urdu-brown flex items-center gap-2">
              <Feather className="w-4 h-4 text-urdu-gold" />
              {isEditing ? "اپنا جائزہ ترمیم کریں" : "نیا جائزہ تحریر کریں"}
            </h4>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Star rating - Interactive classical style */}
            <div className="text-center">
              <label className="block text-sm font-medium text-urdu-brown mb-3">
                مجموعی ریٹنگ <span className="text-red-400 text-xs">*</span>
              </label>
              <div className="inline-flex items-center gap-1 p-3 bg-urdu-cream/30 rounded-xl">
                {[1, 2, 3, 4, 5].map((i) => {
                  const active = i <= (hoverRating || formData.rating);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setFormData((p) => ({ ...p, rating: i }))
                      }
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-all duration-200 ${
                          active
                            ? "text-yellow-400 fill-yellow-400 drop-shadow-sm"
                            : "text-gray-200 hover:text-yellow-200"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              {(hoverRating || formData.rating) > 0 && (
                <p className="text-sm text-urdu-gold font-medium mt-2 transition-all">
                  {ratingLabels[hoverRating || formData.rating]}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-1.5">
                عنوان <span className="text-red-400 text-xs">*</span>
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.title}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="جائزے کا مختصر عنوان..."
                className="w-full px-4 py-2.5 border border-urdu-cream rounded-xl bg-white focus:ring-2 focus:ring-urdu-gold/30 focus:border-urdu-gold transition-all text-urdu-brown placeholder:text-gray-300"
                dir="rtl"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-1.5">
                تفصیلی جائزہ <span className="text-red-400 text-xs">*</span>
              </label>
              <textarea
                rows={4}
                maxLength={2000}
                value={formData.content}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, content: e.target.value }))
                }
                placeholder="اس کلام کے بارے میں اپنی رائے تفصیل سے بیان کریں..."
                className="w-full px-4 py-3 border border-urdu-cream rounded-xl bg-white focus:ring-2 focus:ring-urdu-gold/30 focus:border-urdu-gold transition-all text-urdu-brown urdu-text leading-relaxed placeholder:text-gray-300"
                dir="rtl"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-300">
                  کم از کم 10 حروف
                </span>
                <span
                  className={`text-xs tabular-nums ${formData.content.length > 1800 ? "text-red-400" : "text-gray-300"}`}
                >
                  {formData.content.length}/2000
                </span>
              </div>
            </div>

            {/* Category ratings - Professional grid */}
            <div>
              <button
                type="button"
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center gap-2 text-sm text-urdu-brown/70 hover:text-urdu-brown transition-colors"
              >
                {showCategories ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>تفصیلی زمرہ جات کی ریٹنگ</span>
                <span className="text-xs text-gray-400">(اختیاری)</span>
              </button>

              {showCategories && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(categoryConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const val = formData.categories[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-3 rounded-xl border border-gray-100 ${cfg.bg}/30 transition-all hover:shadow-sm`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                          <div>
                            <span className="text-sm font-medium text-urdu-brown block leading-tight">
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {cfg.sublabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() =>
                                setFormData((p) => ({
                                  ...p,
                                  categories: {
                                    ...p.categories,
                                    [key]: v,
                                  },
                                }))
                              }
                              className="p-0.5"
                            >
                              <Star
                                className={`w-3.5 h-3.5 transition-colors ${
                                  v <= val
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-200 hover:text-yellow-200"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                <span>⚠</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-urdu-gold to-urdu-brown text-white rounded-xl hover:shadow-lg hover:shadow-urdu-gold/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                <Send className="w-4 h-4" />
                {submitting
                  ? "بھیجا جا رہا ہے..."
                  : isEditing
                    ? "جائزہ اپ ڈیٹ کریں"
                    : "جائزہ بھیجیں"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
                className="px-5 py-2.5 border border-gray-200 text-urdu-maroon rounded-xl hover:bg-gray-50 transition-all text-sm"
              >
                منسوخ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Reviews List ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-urdu-gold border-t-transparent" />
            <span className="text-sm text-urdu-maroon/60">
              جائزے لوڈ ہو رہے ہیں...
            </span>
          </div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-urdu-cream/50 mb-4">
            <Feather className="w-7 h-7 text-urdu-gold/60" />
          </div>
          <p className="text-urdu-maroon font-medium mb-1">
            ابھی تک کوئی جائزہ نہیں ہے
          </p>
          <p className="text-sm text-gray-400">
            اس کلام پر پہلا تنقیدی جائزہ تحریر کریں
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              currentUserId={user?.userId || user?.id}
              onHelpful={handleHelpful}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onReply={handleReply}
              formatDate={formatDate}
              categoryConfig={categoryConfig}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8 pt-6 border-t border-urdu-cream/40">
          <button
            disabled={!pagination.hasPrev}
            onClick={() => fetchReviews(pagination.currentPage - 1)}
            className="px-4 py-2 text-sm border border-urdu-cream rounded-xl hover:bg-urdu-cream/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-urdu-brown"
          >
            ← پچھلا
          </button>
          <span className="text-sm text-urdu-maroon tabular-nums px-2">
            {pagination.currentPage} / {pagination.totalPages}
          </span>
          <button
            disabled={!pagination.hasNext}
            onClick={() => fetchReviews(pagination.currentPage + 1)}
            className="px-4 py-2 text-sm border border-urdu-cream rounded-xl hover:bg-urdu-cream/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-urdu-brown"
          >
            اگلا →
          </button>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════
// ReviewCard sub-component
// ══════════════════════════════════════════

const ReviewCard = ({
  review,
  currentUserId,
  onHelpful,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  onReply,
  formatDate,
  categoryConfig,
}) => {
  const isOwnReview = review.user?._id === currentUserId;

  return (
    <div
      className={`rounded-2xl border transition-all hover:shadow-sm ${
        isOwnReview
          ? "border-urdu-gold/40 bg-gradient-to-br from-urdu-gold/5 to-transparent"
          : "border-gray-100 bg-white"
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {review.user?.profilePicture ? (
              <img
                src={review.user.profilePicture}
                alt={review.user.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-urdu-cream"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-urdu-cream to-urdu-gold/20 flex items-center justify-center ring-2 ring-urdu-cream">
                <User className="w-5 h-5 text-urdu-brown/60" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-urdu-brown text-sm">
                  {review.user?.name || "نامعلوم صارف"}
                </span>
                {isOwnReview && (
                  <span className="text-[10px] bg-urdu-gold/15 text-urdu-brown px-2 py-0.5 rounded-full font-medium">
                    آپ
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(review.createdAt)}
              </p>
            </div>
          </div>

          {/* Star rating badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-50">
            <span className="text-sm font-bold text-yellow-600">
              {review.rating}
            </span>
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          </div>
        </div>

        {/* Review title */}
        {review.title && (
          <h4 className="font-semibold text-urdu-brown mb-2 text-[15px]">
            {review.title}
          </h4>
        )}

        {/* Review content */}
        <p className="text-urdu-maroon text-sm urdu-text leading-relaxed mb-4">
          {review.content}
        </p>

        {/* Category mini-badges (if present) */}
        {review.categories &&
          Object.values(review.categories).some((v) => v > 0) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(categoryConfig).map(([key, cfg]) => {
                const val = review.categories?.[key];
                if (!val) return null;
                const Icon = cfg.icon;
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${cfg.bg}/40 ${cfg.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="font-medium">{cfg.label}</span>
                    <span className="opacity-60">{val}/5</span>
                  </span>
                );
              })}
            </div>
          )}

        {/* Actions row */}
        <div className="flex items-center gap-5 text-sm text-gray-400">
          <button
            onClick={() => onHelpful(review._id, true)}
            className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors group"
            title="مددگار"
          >
            <ThumbsUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="tabular-nums">
              {review.helpfulCount || review.helpful || 0}
            </span>
          </button>
          <button
            onClick={() => onHelpful(review._id, false)}
            className="flex items-center gap-1.5 hover:text-red-400 transition-colors group"
            title="غیر مددگار"
          >
            <ThumbsDown className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="tabular-nums">
              {review.notHelpfulCount || review.notHelpful || 0}
            </span>
          </button>
          <button
            onClick={() =>
              setReplyingTo(replyingTo === review._id ? null : review._id)
            }
            className="flex items-center gap-1.5 hover:text-urdu-gold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>جواب ({review.replies?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Replies */}
      {review.replies?.length > 0 && (
        <div className="mx-5 mb-4 space-y-2">
          {review.replies.map((reply, idx) => (
            <div
              key={idx}
              className="p-3 bg-gray-50/80 rounded-xl border-r-2 border-urdu-gold/40"
              dir="rtl"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-urdu-brown">
                  {reply.user?.name || "نامعلوم"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {reply.createdAt || reply.repliedAt
                    ? formatDate(reply.createdAt || reply.repliedAt)
                    : ""}
                </span>
              </div>
              <p className="text-sm text-urdu-maroon urdu-text">
                {reply.content || reply.reply}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {replyingTo === review._id && (
        <div className="mx-5 mb-4 flex gap-2">
          <input
            type="text"
            maxLength={300}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="اپنا جواب لکھیں..."
            className="flex-1 px-4 py-2.5 text-sm border border-urdu-cream rounded-xl bg-white focus:ring-2 focus:ring-urdu-gold/30 focus:border-urdu-gold transition-all"
            dir="rtl"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onReply(review._id);
              }
            }}
          />
          <button
            onClick={() => onReply(review._id)}
            disabled={!replyContent.trim()}
            className="p-2.5 bg-urdu-gold text-white rounded-xl hover:bg-urdu-brown transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
