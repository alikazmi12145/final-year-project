import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Image,
  Eye,
  EyeOff,
  Flag,
  CheckCircle,
  XCircle,
  Megaphone,
  Star,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Send,
} from "lucide-react";

// ==============================================
// AdminUpdatesDashboard - Admin panel for posts, moderation, feedback, announcements
// ==============================================
const AdminUpdatesDashboard = () => {
  const [activeTab, setActiveTab] = useState("posts");

  const tabs = [
    { key: "posts", label: "پوسٹس", icon: Eye },
    { key: "create", label: "نئی پوسٹ", icon: Plus },
    { key: "reported", label: "رپورٹس", icon: Flag },
    { key: "feedback", label: "رائے", icon: Star },
    { key: "announce", label: "اعلان", icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <h1
          className="text-3xl font-bold text-amber-900 mb-6"
          style={{ fontFamily: "Jameel Noori Nastaleeq, serif" }}
        >
          اپ ڈیٹس اور فیڈ بیک - ایڈمن پینل
        </h1>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === key
                  ? "bg-amber-700 text-white shadow-md"
                  : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "posts" && <ManagePosts />}
        {activeTab === "create" && <CreatePostForm onCreated={() => setActiveTab("posts")} />}
        {activeTab === "reported" && <ReportedContent />}
        {activeTab === "feedback" && <FeedbackManager />}
        {activeTab === "announce" && <AnnouncementPanel />}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-component: Manage Posts
// ─────────────────────────────────────────
const ManagePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.posts.getAll({ page, limit: 8 });
      if (res.data.success) {
        setPosts(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {
      toast.error("پوسٹس لوڈ نہیں ہو سکیں");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id) => {
    if (!window.confirm("کیا آپ واقعی اس پوسٹ کو حذف کرنا چاہتے ہیں؟")) return;
    try {
      await api.posts.delete(id);
      toast.success("پوسٹ حذف ہو گئی");
      fetchPosts();
    } catch {
      toast.error("حذف نہیں ہو سکی");
    }
  };

  const startEdit = (post) => {
    setEditingPost(post._id);
    setEditForm({
      title: post.title,
      description: post.description,
      category: post.category,
      status: post.status,
    });
  };

  const saveEdit = async () => {
    try {
      await api.posts.update(editingPost, editForm);
      toast.success("پوسٹ اپ ڈیٹ ہو گئی");
      setEditingPost(null);
      fetchPosts();
    } catch {
      toast.error("اپ ڈیٹ نہیں ہو سکی");
    }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="large" /></div>;

  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <p className="text-center text-gray-500 py-16">کوئی پوسٹ نہیں</p>
      ) : (
        posts.map((post) => (
          <div key={post._id} className="bg-white rounded-xl shadow-sm border border-amber-100 p-5">
            {editingPost === post._id ? (
              /* ── Inline Edit Form ── */
              <div className="space-y-3">
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg"
                  placeholder="عنوان"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg resize-none"
                  rows={3}
                  placeholder="تفصیل"
                />
                <div className="flex gap-3">
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                    className="px-3 py-2 border border-amber-200 rounded-lg"
                  >
                    <option value="event">تقریب</option>
                    <option value="poetry">شاعری</option>
                    <option value="contest">مقابلہ</option>
                  </select>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                    className="px-3 py-2 border border-amber-200 rounded-lg"
                  >
                    <option value="published">شائع شدہ</option>
                    <option value="archived">آرکائیو</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm">
                    <Save className="w-4 h-4" /> محفوظ کریں
                  </button>
                  <button onClick={() => setEditingPost(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-1 text-sm">
                    <X className="w-4 h-4" /> منسوخ
                  </button>
                </div>
              </div>
            ) : (
              /* ── Post Display ── */
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      post.status === "published" ? "bg-green-100 text-green-700" :
                      post.status === "flagged" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {post.status === "published" ? "شائع" : post.status === "flagged" ? "فلیگ" : "آرکائیو"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {post.category === "event" ? "تقریب" : post.category === "poetry" ? "شاعری" : "مقابلہ"}
                    </span>
                    {post.reportsCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                        <Flag className="w-3 h-3" /> {post.reportsCount} رپورٹس
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-amber-900">{post.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    لائکس: {post.likesCount || 0} | {new Date(post.createdAt).toLocaleDateString("ur-PK")}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 mr-4">
                  <button onClick={() => startEdit(post)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(post._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!pagination.hasPrev}
            className="p-2 rounded-lg bg-amber-100 text-amber-800 disabled:opacity-40">
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm text-amber-800">{pagination.page} / {pagination.totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={!pagination.hasNext}
            className="p-2 rounded-lg bg-amber-100 text-amber-800 disabled:opacity-40">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-component: Create Post Form
// ─────────────────────────────────────────
const CreatePostForm = ({ onCreated }) => {
  const [form, setForm] = useState({ title: "", description: "", category: "event", image: null });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("عنوان درج کریں");
    if (!form.description.trim()) return toast.error("تفصیل درج کریں");

    try {
      setSubmitting(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
      };
      if (form.image) {
        payload.image = { url: form.image };
      }

      const res = await api.posts.create(payload);
      if (res.data.success) {
        toast.success("پوسٹ شائع ہو گئی");
        onCreated();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "پوسٹ شائع نہیں ہو سکی");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-amber-100 p-8 max-w-2xl space-y-5">
      <h2 className="text-xl font-bold text-amber-900 mb-2">نئی پوسٹ بنائیں</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">عنوان *</label>
        <input
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
          placeholder="پوسٹ کا عنوان"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">زمرہ *</label>
        <select
          value={form.category}
          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:border-amber-500 outline-none"
        >
          <option value="event">تقریب</option>
          <option value="poetry">شاعری</option>
          <option value="contest">مقابلہ</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">تفصیل *</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none resize-none"
          rows={6}
          placeholder="پوسٹ کی تفصیل..."
          maxLength={5000}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">تصویر URL (اختیاری)</label>
        <div className="relative">
          <Image className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 w-5 h-5" />
          <input
            value={form.image || ""}
            onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
            className="w-full pr-10 pl-4 py-3 rounded-lg border border-amber-200 focus:border-amber-500 outline-none"
            placeholder="https://example.com/image.jpg"
            dir="ltr"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition flex items-center justify-center gap-2 font-medium disabled:opacity-60"
      >
        {submitting ? <LoadingSpinner size="small" variant="modern" /> : <><Plus className="w-5 h-5" /> پوسٹ شائع کریں</>}
      </button>
    </form>
  );
};

// ─────────────────────────────────────────
// Sub-component: Reported Content (Posts + Comments)
// ─────────────────────────────────────────
const ReportedContent = () => {
  const [reportedPosts, setReportedPosts] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("posts");

  const fetchReported = useCallback(async () => {
    try {
      setLoading(true);
      const [postsRes, commentsRes] = await Promise.all([
        api.posts.getReported(),
        api.comments.getReported(),
      ]);
      if (postsRes.data.success) setReportedPosts(postsRes.data.data);
      if (commentsRes.data.success) setReportedComments(commentsRes.data.data);
    } catch {
      toast.error("رپورٹس لوڈ نہیں ہو سکیں");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReported(); }, [fetchReported]);

  const handleModeratePost = async (postId, reportId, action) => {
    try {
      await api.posts.moderateReport(postId, reportId, action);
      toast.success(action === "approved" ? "رپورٹ منظور - پوسٹ آرکائیو" : "رپورٹ مسترد");
      fetchReported();
    } catch {
      toast.error("کارروائی ناکام");
    }
  };

  const handleModerateComment = async (commentId, reportId, action) => {
    try {
      await api.comments.moderateReport(commentId, reportId, action);
      toast.success(action === "approved" ? "رپورٹ منظور - تبصرہ چھپایا" : "رپورٹ مسترد");
      fetchReported();
    } catch {
      toast.error("کارروائی ناکام");
    }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="large" /></div>;

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSubTab("posts")}
          className={`px-4 py-2 rounded-lg text-sm ${subTab === "posts" ? "bg-red-600 text-white" : "bg-white border border-red-200 text-red-700"}`}
        >
          پوسٹ رپورٹس ({reportedPosts.length})
        </button>
        <button
          onClick={() => setSubTab("comments")}
          className={`px-4 py-2 rounded-lg text-sm ${subTab === "comments" ? "bg-red-600 text-white" : "bg-white border border-red-200 text-red-700"}`}
        >
          تبصرہ رپورٹس ({reportedComments.length})
        </button>
      </div>

      {/* Reported Posts */}
      {subTab === "posts" && (
        <div className="space-y-4">
          {reportedPosts.length === 0 ? (
            <p className="text-center text-gray-500 py-10">کوئی رپورٹ شدہ پوسٹ نہیں</p>
          ) : (
            reportedPosts.map((post) => (
              <div key={post._id} className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
                <h3 className="font-bold text-gray-800 mb-1">{post.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{post.description}</p>
                <div className="space-y-2">
                  {post.reports
                    ?.filter((r) => r.status === "pending")
                    .map((report) => (
                      <div key={report._id} className="flex items-center justify-between bg-red-50 rounded-lg p-3">
                        <div>
                          <p className="text-sm text-red-800 font-medium">
                            رپورٹ از: {report.user?.name || "نامعلوم"}
                          </p>
                          <p className="text-xs text-red-600">{report.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleModeratePost(post._id, report._id, "approved")}
                            className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700" title="منظور (پوسٹ آرکائیو)"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleModeratePost(post._id, report._id, "rejected")}
                            className="p-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500" title="مسترد"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reported Comments */}
      {subTab === "comments" && (
        <div className="space-y-4">
          {reportedComments.length === 0 ? (
            <p className="text-center text-gray-500 py-10">کوئی رپورٹ شدہ تبصرہ نہیں</p>
          ) : (
            reportedComments.map((comment) => (
              <div key={comment._id} className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
                <p className="text-sm text-gray-700 mb-1">
                  <strong>{comment.user?.name || "صارف"}</strong>: {comment.content}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  پوسٹ: {comment.post?.title || "—"}
                </p>
                <div className="space-y-2">
                  {comment.reports
                    ?.filter((r) => r.status === "pending")
                    .map((report) => (
                      <div key={report._id} className="flex items-center justify-between bg-red-50 rounded-lg p-3">
                        <div>
                          <p className="text-sm text-red-800">رپورٹ از: {report.user?.name || "نامعلوم"}</p>
                          <p className="text-xs text-red-600">{report.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleModerateComment(comment._id, report._id, "approved")}
                            className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleModerateComment(comment._id, report._id, "rejected")}
                            className="p-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-component: Feedback Manager (Admin)
// ─────────────────────────────────────────
const FeedbackManager = () => {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, totalFeedback: 0, distribution: [] });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.feedback.getAll({ page, limit: 10 });
      if (res.data.success) {
        setFeedback(res.data.data);
        setStats(res.data.stats);
        setPagination(res.data.pagination);
      }
    } catch {
      toast.error("رائے لوڈ نہیں ہو سکی");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleDelete = async (id) => {
    if (!window.confirm("کیا واقعی حذف کرنا چاہتے ہیں؟")) return;
    try {
      await api.feedback.delete(id);
      toast.success("رائے حذف ہو گئی");
      fetchFeedback();
    } catch {
      toast.error("حذف نہیں ہو سکی");
    }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="large" /></div>;

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 text-center">
          <p className="text-3xl font-bold text-amber-700">{stats.averageRating}</p>
          <div className="flex justify-center gap-0.5 my-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${s <= Math.round(stats.averageRating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
            ))}
          </div>
          <p className="text-sm text-gray-500">اوسط درجہ</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 text-center">
          <p className="text-3xl font-bold text-amber-700">{stats.totalFeedback}</p>
          <p className="text-sm text-gray-500">کل رائے</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5">
          <p className="text-sm text-gray-500 mb-2 text-center">تقسیم</p>
          {[5, 4, 3, 2, 1].map((rating) => {
            const item = stats.distribution?.find((d) => d.rating === rating);
            const count = item?.count || 0;
            const pct = stats.totalFeedback > 0 ? (count / stats.totalFeedback) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-2 text-xs mb-1">
                <span className="w-4 text-left">{rating}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-left text-gray-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {feedback.length === 0 ? (
          <p className="text-center text-gray-500 py-10">کوئی رائے نہیں</p>
        ) : (
          feedback.map((fb) => (
            <div key={fb._id} className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800">{fb.name}</span>
                  <span className="text-xs text-gray-400" dir="ltr">{fb.email}</span>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= fb.rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
                  ))}
                </div>
                <p className="text-sm text-gray-700">{fb.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(fb.createdAt).toLocaleDateString("ur-PK")}
                </p>
              </div>
              <button onClick={() => handleDelete(fb._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="p-2 rounded-lg bg-amber-100 text-amber-800 disabled:opacity-40">
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm text-amber-800">{page} / {pagination.totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}
            className="p-2 rounded-lg bg-amber-100 text-amber-800 disabled:opacity-40">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-component: Announcement Panel
// ─────────────────────────────────────────
const AnnouncementPanel = () => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return toast.error("اعلان کا پیغام لکھیں");

    try {
      setSending(true);
      const res = await api.notifications.sendAnnouncement(message.trim());
      if (res.data.success) {
        toast.success(res.data.message);
        setMessage("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "اعلان نہیں بھیجا جا سکا");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-amber-100 p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="w-8 h-8 text-amber-600" />
        <div>
          <h2 className="text-xl font-bold text-amber-900">اعلان بھیجیں</h2>
          <p className="text-sm text-gray-500">تمام فعال صارفین کو اطلاع بھیجی جائے گی</p>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اعلان کا پیغام لکھیں..."
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none resize-none"
          maxLength={500}
        />
        <p className="text-xs text-gray-400 text-left">{message.length}/500</p>

        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="px-8 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition flex items-center gap-2 font-medium disabled:opacity-60"
        >
          {sending ? <LoadingSpinner size="small" variant="modern" /> : <><Send className="w-5 h-5" /> اعلان بھیجیں</>}
        </button>
      </form>
    </div>
  );
};

export default AdminUpdatesDashboard;
