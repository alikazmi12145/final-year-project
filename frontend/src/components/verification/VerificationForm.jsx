/**
 * VerificationForm.jsx
 * Allows an authenticated user to apply for poet verification.
 * Also shows their current verification status if a request exists.
 */
import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  applyForVerification,
  getMyVerificationStatus,
} from "../../services/verificationAPI";
import VerificationBadge from "./VerificationBadge";

// ─────────────────────────────────────────────────────────────────────────────
// Status banner shown when a request already exists
// ─────────────────────────────────────────────────────────────────────────────
const StatusBanner = ({ status, adminRemarks }) => {
  const configs = {
    pending: {
      icon: <Clock size={20} className="text-amber-500" />,
      bg: "bg-amber-50 border-amber-300",
      text: "text-amber-800",
      title: "درخواست زیرِ غور ہے",
      body: "آپ کی تصدیق کی درخواست ایڈمن کے پاس زیرِ جائزہ ہے۔ نتیجے کا انتظار کریں۔",
    },
    approved: {
      icon: <CheckCircle size={20} className="text-green-500" />,
      bg: "bg-green-50 border-green-300",
      text: "text-green-800",
      title: "درخواست منظور ہو گئی",
      body: "مبارک ہو! آپ تصدیق شدہ شاعر ہیں۔",
    },
    rejected: {
      icon: <XCircle size={20} className="text-red-500" />,
      bg: "bg-red-50 border-red-300",
      text: "text-red-800",
      title: "درخواست رد کر دی گئی",
      body: adminRemarks || "آپ کی درخواست منظور نہیں ہوئی۔ دوبارہ درخواست دے سکتے ہیں۔",
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <div className={`rounded-xl border p-4 flex gap-3 ${cfg.bg}`}>
      {cfg.icon}
      <div>
        <p className={`font-bold urdu-text ${cfg.text}`}>{cfg.title}</p>
        <p className={`text-sm urdu-text mt-0.5 ${cfg.text}`}>{cfg.body}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Form
// ─────────────────────────────────────────────────────────────────────────────
const VerificationForm = () => {
  const [statusData, setStatusData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [form, setForm] = useState({
    fullName: "",
    penName: "",
    nationalIdDocumentUrl: "",
    samplePoetry: "",
    statement: "",
  });
  const [socialLinks, setSocialLinks] = useState([{ platform: "", url: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load current status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getMyVerificationStatus();
        setStatusData(res.data.data);
      } catch (err) {
        console.error("Failed to load verification status:", err);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchStatus();
  }, [success]);

  // ── Social links helpers
  const addSocialLink = () => {
    if (socialLinks.length < 5) {
      setSocialLinks((prev) => [...prev, { platform: "", url: "" }]);
    }
  };
  const removeSocialLink = (idx) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateSocialLink = (idx, field, value) => {
    setSocialLinks((prev) =>
      prev.map((link, i) => (i === idx ? { ...link, [field]: value } : link))
    );
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim()) {
      setError("مکمل نام درج کریں");
      return;
    }
    if (form.samplePoetry.trim().length < 50) {
      setError("نمونہ کلام کم از کم ۵۰ حروف کا ہونا چاہیے");
      return;
    }

    const cleanLinks = socialLinks.filter((l) => l.url.trim());

    setSubmitting(true);
    try {
      await applyForVerification({
        ...form,
        socialLinks: cleanLinks,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "درخواست جمع کرنے میں خرابی ہوئی"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state
  if (loadingStatus) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={32} className="animate-spin text-amber-500" />
      </div>
    );
  }

  // ── Already verified
  if (statusData?.isVerified) {
    return (
      <div className="max-w-xl mx-auto text-center py-10 space-y-4">
        <VerificationBadge isVerified size="lg" showLabel />
        <p className="urdu-text text-gray-700 text-lg">
          آپ پہلے سے تصدیق شدہ شاعر ہیں
        </p>
      </div>
    );
  }

  // ── Pending request exists
  const latestReq = statusData?.latestRequest;
  const hasPending = latestReq?.status === "pending";
  const isRejected = latestReq?.status === "rejected";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <ShieldCheck size={20} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold urdu-text text-gray-900">
            شاعر تصدیق
          </h2>
          <p className="text-sm text-gray-500 urdu-text">
            اپنی شناخت ثابت کریں اور تصدیق شدہ بیج حاصل کریں
          </p>
        </div>
      </div>

      {/* Status banner */}
      {latestReq && (
        <div className="mb-6">
          <StatusBanner
            status={latestReq.status}
            adminRemarks={latestReq.adminRemarks}
          />
        </div>
      )}

      {/* Success message after submit */}
      {success && (
        <div className="mb-6 rounded-xl border border-green-300 bg-green-50 p-4 flex gap-3">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
          <p className="urdu-text text-green-800">
            درخواست کامیابی سے جمع ہو گئی۔ ایڈمن جلد جائزہ لے گا۔
          </p>
        </div>
      )}

      {/* Hide form if pending (and not just submitted) */}
      {hasPending && !success ? null : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-white rounded-2xl border border-amber-100 shadow-sm p-6"
        >
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold urdu-text text-gray-700 mb-1">
              مکمل نام <span className="text-red-500">*</span>
            </label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="آپ کا مکمل نام"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 urdu-text"
              dir="rtl"
              maxLength={150}
            />
          </div>

          {/* Pen Name */}
          <div>
            <label className="block text-sm font-semibold urdu-text text-gray-700 mb-1">
              تخلص (اختیاری)
            </label>
            <input
              name="penName"
              value={form.penName}
              onChange={handleChange}
              placeholder="آپ کا ادبی نام"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 urdu-text"
              dir="rtl"
              maxLength={100}
            />
          </div>

          {/* Document URL */}
          <div>
            <label className="block text-sm font-semibold urdu-text text-gray-700 mb-1">
              شناختی دستاویز URL (اختیاری)
            </label>
            <input
              name="nationalIdDocumentUrl"
              value={form.nationalIdDocumentUrl}
              onChange={handleChange}
              placeholder="https://drive.google.com/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              dir="ltr"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 urdu-text mt-1">
              شناختی کارڈ یا دیگر دستاویز کا Google Drive / Dropbox لنک
            </p>
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-sm font-semibold urdu-text text-gray-700 mb-2">
              سوشل میڈیا / ادبی پروفائل روابط (اختیاری)
            </label>
            <div className="space-y-2">
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={link.platform}
                    onChange={(e) =>
                      updateSocialLink(idx, "platform", e.target.value)
                    }
                    placeholder="پلیٹ فارم (مثلاً Facebook)"
                    className="w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 urdu-text"
                    dir="rtl"
                  />
                  <input
                    value={link.url}
                    onChange={(e) =>
                      updateSocialLink(idx, "url", e.target.value)
                    }
                    placeholder="https://..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    dir="ltr"
                  />
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => removeSocialLink(idx)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {socialLinks.length < 5 && (
              <button
                type="button"
                onClick={addSocialLink}
                className="mt-2 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium"
              >
                <Plus size={14} /> لنک شامل کریں
              </button>
            )}
          </div>

          {/* Sample Poetry */}
          <div>
            <label className="block text-sm font-semibold urdu-text text-gray-700 mb-1">
              نمونہ کلام <span className="text-red-500">*</span>
            </label>
            <textarea
              name="samplePoetry"
              value={form.samplePoetry}
              onChange={handleChange}
              placeholder="اپنی شاعری کا نمونہ درج کریں (کم از کم ۵۰ حروف)"
              rows={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 urdu-text resize-none"
              dir="rtl"
              maxLength={5000}
            />
            <p className="text-xs text-gray-400 text-right">
              {form.samplePoetry.length} / 5000
            </p>
          </div>

          {/* Statement */}
          <div>
            <label className="block text-sm font-semibold urdu-text text-gray-700 mb-1">
              بیانیہ (اختیاری)
            </label>
            <textarea
              name="statement"
              value={form.statement}
              onChange={handleChange}
              placeholder="اپنی ادبی سرگرمیوں کے بارے میں مختصر بیان"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 urdu-text resize-none"
              dir="rtl"
              maxLength={1000}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm urdu-text">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-2.5 rounded-lg transition-colors"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ShieldCheck size={18} />
            )}
            <span className="urdu-text">
              {isRejected ? "دوبارہ درخواست جمع کریں" : "درخواست جمع کریں"}
            </span>
          </button>
        </form>
      )}
    </div>
  );
};

export default VerificationForm;
