import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  Heart,
  MessageCircle,
  Flag,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  User,
  Send,
  ThumbsUp,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";

// ==============================================
// NewsFeedPage - Displays literary events, poetry launches, contests
// ==============================================
const NewsFeedPage = () => {
  const { user } = useAuth();

  // ── State ──
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [reportModal, setReportModal] = useState({ open: false, type: null, id: null });
  const [reportReason, setReportReason] = useState("");

  // Category labels in Urdu
  const categories = [
    { value: "", label: "سب" },
    { value: "event", label: "تقریبات" },
    { value: "poetry", label: "شاعری" },
    { value: "contest", label: "مقابلے" },
  ];

  // Category colors
  const categoryColors = {
    event: "bg-blue-100 text-blue-800",
    poetry: "bg-purple-100 text-purple-800",
    contest: "bg-amber-100 text-amber-800",
  };

  // ── Fetch Posts ──
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (category) params.category = category;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.posts.getAll(params);
      if (res.data.success) {
        setPosts(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      toast.error("پوسٹس لوڈ نہیں ہو سکیں");
    } finally {
      setLoading(false);
    }
  }, [page, category, searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [category, searchQuery]);

  // ── Like Toggle ──
  const handleLike = async (postId) => {
    if (!user) return toast.error("لائک کرنے کے لیے لاگ ان کریں");
    try {
      const res = await api.posts.toggleLike(postId);
      if (res.data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId
              ? { ...p, likesCount: res.data.data.likesCount, isLiked: res.data.data.isLiked }
              : p
          )
        );
      }
    } catch {
      toast.error("لائک کرنے میں خرابی");
    }
  };

  // ── Open Comments Panel ──
  const openComments = async (post) => {
    setSelectedPost(post);
    setCommentsLoading(true);
    try {
      const res = await api.comments.getByPost(post._id);
      if (res.data.success) setComments(res.data.data);
    } catch {
      toast.error("تبصرے لوڈ نہیں ہو سکے");
    } finally {
      setCommentsLoading(false);
    }
  };

  // ── Add Comment ──
  const handleAddComment = async (e, parentComment = null) => {
    e.preventDefault();
    if (!user) return toast.error("تبصرہ کرنے کے لیے لاگ ان کریں");
    if (!commentText.trim()) return;

    try {
      const res = await api.comments.add(selectedPost._id, {
        content: commentText.trim(),
        parentComment,
      });
      if (res.data.success) {
        toast.success("تبصرہ شائع ہو گیا");
        setCommentText("");
        // Refresh comments
        const updated = await api.comments.getByPost(selectedPost._id);
        if (updated.data.success) setComments(updated.data.data);
      }
    } catch {
      toast.error("تبصرہ شائع نہیں ہو سکا");
    }
  };

  // ── Delete Comment ──
  const handleDeleteComment = async (commentId) => {
    try {
      const res = await api.comments.delete(commentId);
      if (res.data.success) {
        toast.success("تبصرہ حذف ہو گیا");
        const updated = await api.comments.getByPost(selectedPost._id);
        if (updated.data.success) setComments(updated.data.data);
      }
    } catch {
      toast.error("تبصرہ حذف نہیں ہو سکا");
    }
  };

  // ── Like Comment ──
  const handleLikeComment = async (commentId) => {
    if (!user) return toast.error("لاگ ان کریں");
    try {
      const res = await api.comments.toggleLike(commentId);
      if (res.data.success) {
        const updated = await api.comments.getByPost(selectedPost._id);
        if (updated.data.success) setComments(updated.data.data);
      }
    } catch {
      toast.error("لائک میں خرابی");
    }
  };

  // ── Report ──
  const handleReport = async () => {
    if (!reportReason.trim()) return toast.error("وجہ درج کریں");
    try {
      if (reportModal.type === "post") {
        await api.posts.report(reportModal.id, reportReason.trim());
      } else {
        await api.comments.report(reportModal.id, reportReason.trim());
      }
      toast.success("رپورٹ جمع ہو گئی");
      setReportModal({ open: false, type: null, id: null });
      setReportReason("");
    } catch (error) {
      toast.error(error.response?.data?.message || "رپورٹ جمع نہیں ہو سکی");
    }
  };

  // ── Format date ──
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ── Page Header ── */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2" style={{ fontFamily: "Jameel Noori Nastaleeq, serif" }}>
            تازہ ترین خبریں
          </h1>
          <p className="text-amber-700">ادبی تقریبات، شاعری اور مقابلوں کی تازہ خبریں</p>
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 w-5 h-5" />
            <input
              type="text"
              placeholder="تلاش کریں..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              style={{ fontFamily: "Jameel Noori Nastaleeq, serif" }}
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  category === cat.value
                    ? "bg-amber-700 text-white shadow-md"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading State ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="large" />
          </div>
        ) : posts.length === 0 ? (
          /* ── Empty State ── */
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-amber-300 mx-auto mb-4" />
            <p className="text-xl text-amber-700">کوئی پوسٹ نہیں ملی</p>
          </div>
        ) : (
          <>
            {/* ── Posts List ── */}
            <div className="space-y-6">
              {posts.map((post) => (
                <article
                  key={post._id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-amber-100"
                >
                  {/* Post Image */}
                  {post.image?.url && (
                    <img
                      src={post.image.url}
                      alt={post.title}
                      className="w-full h-56 object-cover"
                    />
                  )}

                  <div className="p-6">
                    {/* Category Badge & Date */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[post.category]}`}>
                        <Tag className="inline w-3 h-3 ml-1" />
                        {categories.find((c) => c.value === post.category)?.label || post.category}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(post.createdAt)}
                      </span>
                    </div>

                    {/* Title */}
                    <h2
                      className="text-2xl font-bold text-amber-900 mb-2"
                      style={{ fontFamily: "Jameel Noori Nastaleeq, serif" }}
                    >
                      {post.title}
                    </h2>

                    {/* Description */}
                    <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                      {post.description}
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
                        {post.createdBy?.profileImage ? (
                          <img
                            src={post.createdBy.profileImage}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-amber-700" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {post.createdBy?.name || "ایڈمن"}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 pt-4 border-t border-amber-100">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLike(post._id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                          post.isLiked
                            ? "bg-red-50 text-red-600"
                            : "hover:bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 ${post.isLiked ? "fill-red-500" : ""}`}
                        />
                        <span className="text-sm">{post.likesCount || 0}</span>
                      </button>

                      {/* Comments Button */}
                      <button
                        onClick={() => openComments(post)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">تبصرے</span>
                      </button>

                      {/* Report Button */}
                      {user && (
                        <button
                          onClick={() =>
                            setReportModal({ open: true, type: "post", id: post._id })
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition mr-auto"
                        >
                          <Flag className="w-4 h-4" />
                          <span className="text-sm">رپورٹ</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* ── Pagination ── */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev}
                  className="p-2 rounded-lg bg-amber-100 text-amber-800 disabled:opacity-40 hover:bg-amber-200 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-amber-800 font-medium">
                  صفحہ {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNext}
                  className="p-2 rounded-lg bg-amber-100 text-amber-800 disabled:opacity-40 hover:bg-amber-200 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Comments Side Panel ── */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setSelectedPost(null);
              setComments([]);
            }}
          />

          {/* Panel */}
          <div className="absolute left-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col" dir="rtl">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-amber-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-amber-900">
                تبصرے - {selectedPost.title}
              </h3>
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setComments([]);
                }}
                className="p-1 hover:bg-amber-100 rounded-full"
              >
                <X className="w-5 h-5 text-amber-700" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {commentsLoading ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner size="medium" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-500 py-10">ابھی کوئی تبصرہ نہیں</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="space-y-3">
                    {/* Main Comment */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center">
                          {comment.user?.profileImage ? (
                            <img src={comment.user.profileImage} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-amber-700" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {comment.user?.name || "صارف"}
                        </span>
                        <span className="text-xs text-gray-400 mr-auto">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>

                      <p className="text-gray-700 text-sm mb-2">{comment.content}</p>

                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={() => handleLikeComment(comment._id)}
                          className={`flex items-center gap-1 ${
                            comment.isLiked ? "text-amber-600" : "text-gray-500"
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {comment.likesCount || 0}
                        </button>
                        {user && (
                          <button
                            onClick={() =>
                              setReportModal({ open: true, type: "comment", id: comment._id })
                            }
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(comment.user?._id === user?._id || user?.role === "admin") && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies?.map((reply) => (
                      <div key={reply._id} className="mr-8 bg-amber-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                            <User className="w-3 h-3 text-amber-700" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {reply.user?.name || "صارف"}
                          </span>
                        </div>
                        <p className="text-gray-600 text-xs">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            {user && (
              <form
                onSubmit={(e) => handleAddComment(e)}
                className="px-6 py-4 border-t bg-gray-50 flex gap-2"
              >
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="تبصرہ لکھیں..."
                  className="flex-1 px-4 py-2 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="p-2.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Report Modal ── */}
      {reportModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReportModal({ open: false, type: null, id: null })} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" dir="rtl">
            <h3 className="text-lg font-bold text-amber-900 mb-4">
              {reportModal.type === "post" ? "پوسٹ کی رپورٹ" : "تبصرے کی رپورٹ"}
            </h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="رپورٹ کی وجہ لکھیں..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-amber-200 focus:border-amber-500 outline-none resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                رپورٹ جمع کریں
              </button>
              <button
                onClick={() => {
                  setReportModal({ open: false, type: null, id: null });
                  setReportReason("");
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                منسوخ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsFeedPage;
