/**
 * FraudReportForm.jsx
 * Allows any authenticated user to report a poet/user for fraud or abuse.
 *
 * Props:
 *   reportedUserId  {string}  - ID of the user being reported (required)
 *   reportedUserName {string} - Display name of reported user
 *   onClose         {func}    - Called after successful submission or cancel
 */
import React, { useState } from "react";
import { Flag, Loader2, AlertCircle, CheckCircle, X } from "lucide-react";
import { submitFraudReport } from "../../services/verificationAPI";

const REASON_OPTIONS = [
  { value: "impersonation",    label: "جعلی شناخت — کسی معروف شاعر کی نقل"    },
  { value: "fake_credentials", label: "جھوٹی سند — دستاویزات میں جعل سازی"     },
  { value: "plagiarism",       label: "سرقہ — دوسروں کا کلام اپنا بتانا"       },
  { value: "spam",             label: "اسپام — فضول یا بار بار مواد"             },
  { value: "harassment",       label: "ہراسانی — دوسرے صارفین کو تکلیف دینا"  },
  { value: "other",            label: "دیگر"                                      },
];

const FraudReportForm = ({ reportedUserId, reportedUserName, onClose }) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!reason) {
      setError("وجہ منتخب کریں");
      return;
    }
    if (description.trim().length < 20) {
      setError("تفصیل کم از کم ۲۰ حروف ہونی چاہیے");
      return;
    }

    const evidenceUrls = evidenceUrl.trim() ? [evidenceUrl.trim()] : [];

    setSubmitting(true);
    try {
      await submitFraudReport({
        reportedUserId,
        reason,
        description: description.trim(),
        evidenceUrls,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "رپورٹ جمع کرنے میں خرابی ہوئی"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen
  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-green-500" />
        </div>
        <p className="font-bold urdu-text text-gray-900 text-lg">
          رپورٹ جمع ہو گئی
        </p>
        <p className="text-sm urdu-text text-gray-500">
          ایڈمن جلد اس رپورٹ کا جائزہ لے گا۔ آپ کا شکریہ۔
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-2 px-5 py-2 bg-amber-500 text-white rounded-lg font-medium urdu-text hover:bg-amber-600 transition-colors"
          >
            بند کریں
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
            <Flag size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold urdu-text text-gray-900">
              غلط استعمال کی رپورٹ
            </h3>
            {reportedUserName && (
              <p className="text-xs text-gray-500 urdu-text">
                {reportedUserName} کے خلاف
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Reason */}
        <div>
          <label className="block text-sm font-semibold urdu-text text-gray-700 mb-2">
            وجہ <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {REASON_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  reason === opt.value
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={opt.value}
                  checked={reason === opt.value}
                  onChange={() => {
                    setReason(opt.value);
                    setError("");
                  }}
                  className="accent-red-500"
                />
                <span className="text-sm urdu-text text-gray-800">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold urdu-text text-gray-700 mb-1">
            تفصیل <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError("");
            }}
            placeholder="مسئلے کی تفصیل بیان کریں (کم از کم ۲۰ حروف)"
            rows={4}
            dir="rtl"
            maxLength={2000}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 urdu-text resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">
            {description.length} / 2000
          </p>
        </div>

        {/* Evidence URL */}
        <div>
          <label className="block text-sm font-semibold urdu-text text-gray-700 mb-1">
            ثبوت کا ربط (اختیاری)
          </label>
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://..."
            dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <p className="text-xs text-gray-400 urdu-text mt-1">
            اسکرین شاٹ یا ثبوت کا لنک
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span className="text-sm urdu-text">{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-2.5 rounded-lg transition-colors"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Flag size={16} />
            )}
            <span className="urdu-text">رپورٹ جمع کریں</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm urdu-text transition-colors"
            >
              منسوخ
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FraudReportForm;
