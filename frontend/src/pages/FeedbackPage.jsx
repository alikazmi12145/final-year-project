import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { Star, Send, CheckCircle } from "lucide-react";

// ==============================================
// FeedbackPage - Users can submit platform feedback with rating
// ==============================================
const FeedbackPage = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    message: "",
    rating: 0,
  });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill form when user data loads
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) return toast.error("نام درج کریں");
    if (!form.email.trim()) return toast.error("ای میل درج کریں");
    if (!form.message.trim()) return toast.error("پیغام لکھیں");
    if (form.rating === 0) return toast.error("درجہ بندی منتخب کریں");

    try {
      setSubmitting(true);
      const res = await api.feedback.submit(form);
      if (res.data.success) {
        setSubmitted(true);
        toast.success("آپ کی رائے جمع ہو گئی۔ شکریہ!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "رائے جمع نہیں ہو سکی");
    } finally {
      setSubmitting(false);
    }
  };

  // Success state after submission
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2
            className="text-2xl font-bold text-amber-900 mb-2"
            style={{ fontFamily: "Jameel Noori Nastaleeq, serif" }}
          >
            شکریہ!
          </h2>
          <p className="text-gray-600 mb-6">
            آپ کی قیمتی رائے ہمارے لیے بہت اہم ہے۔ ہم آپ کی تجاویز پر عمل کریں گے۔
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({ name: user?.name || "", email: user?.email || "", message: "", rating: 0 });
            }}
            className="px-6 py-2.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
          >
            مزید رائے دیں
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl font-bold text-amber-900 mb-2"
            style={{ fontFamily: "Jameel Noori Nastaleeq, serif" }}
          >
            اپنی رائے دیں
          </h1>
          <p className="text-amber-700">آپ کی رائے بزم سخن کو بہتر بنانے میں مدد کرتی ہے</p>
        </div>

        {/* ── Feedback Form ── */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-amber-100"
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نام *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="اپنا نام لکھیں"
              className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              maxLength={100}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ای میل *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="اپنا ای میل درج کریں"
              className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              dir="ltr"
            />
          </div>

          {/* Rating Stars */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">درجہ بندی *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, rating: star }))}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredStar || form.rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {form.rating > 0 && (
              <p className="text-sm text-amber-600 mt-1">
                {["", "بہت خراب", "خراب", "ٹھیک", "اچھا", "بہترین"][form.rating]}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">پیغام *</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="اپنی رائے تفصیل سے لکھیں..."
              rows={5}
              className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-gray-400 mt-1 text-left">
              {form.message.length}/2000
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition flex items-center justify-center gap-2 font-medium disabled:opacity-60"
          >
            {submitting ? (
              <LoadingSpinner size="small" variant="modern" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                رائے جمع کریں
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackPage;
