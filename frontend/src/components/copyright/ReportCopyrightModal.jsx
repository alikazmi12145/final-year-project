/**
 * ReportCopyrightModal.jsx
 * Modal form for submitting a copyright report against a specific poem.
 * Uses react-hook-form for clean validation + toast-style inline feedback.
 *
 * Props:
 *   poemId         (required) the poem being reported
 *   poemTitle      optional   shown in the header
 *   originalPoemId optional   pre-fills "alleged original"
 *   open           bool       controls visibility
 *   onClose        fn
 *   onSuccess      fn(reportId)
 */
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  X,
  Flag,
  Link as LinkIcon,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { REPORT_REASONS } from "../../services/copyrightAPI";
import useCopyright from "../../hooks/useCopyright";

const ReportCopyrightModal = ({
  poemId,
  poemTitle = "",
  originalPoemId = "",
  open,
  onClose,
  onSuccess,
}) => {
  const { reportCopyright, submitting } = useCopyright();
  const [serverError, setServerError] = useState("");
  const [successId, setSuccessId] = useState("");

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      reason: "plagiarism",
      description: "",
      originalPoemId: originalPoemId || "",
      evidenceLinks: [{ value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "evidenceLinks",
  });

  useEffect(() => {
    if (open) {
      reset({
        reason: "plagiarism",
        description: "",
        originalPoemId: originalPoemId || "",
        evidenceLinks: [{ value: "" }],
      });
      setServerError("");
      setSuccessId("");
    }
  }, [open, originalPoemId, reset]);

  const description = watch("description");

  if (!open) return null;

  const onSubmit = async (values) => {
    setServerError("");
    const payload = {
      poemId,
      reason: values.reason,
      description: values.description.trim(),
      evidenceLinks: values.evidenceLinks
        .map((e) => (e?.value || "").trim())
        .filter(Boolean),
      ...(values.originalPoemId
        ? { originalPoemId: values.originalPoemId.trim() }
        : {}),
    };
    const result = await reportCopyright(payload);
    if (result.ok) {
      setSuccessId(result.data?.reportId);
      onSuccess?.(result.data?.reportId);
    } else {
      setServerError(result.error || "رپورٹ جمع نہیں ہو سکی");
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-urdu-cream max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-urdu-maroon to-red-800 text-white px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2 min-w-0">
            <Flag className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="urdu-text font-bold text-base sm:text-lg truncate">
                کاپی رائٹ کی شکایت
              </h2>
              {poemTitle && (
                <p className="text-xs opacity-80 urdu-text truncate">
                  {poemTitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success state */}
        {successId ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="urdu-text text-xl font-bold text-urdu-brown mb-2">
              رپورٹ کامیابی سے جمع ہو گئی
            </h3>
            <p className="urdu-text text-sm text-urdu-maroon mb-4">
              ایڈمن جلد جائزہ لے کر فیصلہ سنائے گا۔
            </p>
            <p className="text-xs text-gray-500 mb-6 break-all">
              Report ID: <span className="font-mono">{successId}</span>
            </p>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl bg-cultural-amber text-white px-6 py-2.5 font-bold urdu-text hover:bg-cultural-amber/90"
            >
              ٹھیک ہے
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-4 sm:p-6 space-y-5"
          >
            {/* Reason */}
            <div>
              <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
                شکایت کی وجہ <span className="text-red-500">*</span>
              </label>
              <select
                {...register("reason", { required: true })}
                className="w-full rounded-xl border border-urdu-cream bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cultural-amber urdu-text"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
                تفصیل <span className="text-red-500">*</span>{" "}
                <span className="text-xs font-normal text-gray-500">
                  (کم از کم 20 حروف)
                </span>
              </label>
              <textarea
                {...register("description", {
                  required: "تفصیل ضروری ہے",
                  minLength: { value: 20, message: "کم از کم 20 حروف" },
                  maxLength: { value: 2000, message: "زیادہ سے زیادہ 2000 حروف" },
                })}
                rows={5}
                placeholder="یہاں اپنی شکایت کی تفصیل لکھیں — کب، کیسے، اور کس بنیاد پر آپ کو یہ نقل لگتی ہے۔"
                className="urdu-text w-full rounded-xl border border-urdu-cream bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cultural-amber resize-y"
              />
              <div className="flex justify-between mt-1 text-xs">
                <span className="text-red-500 urdu-text">
                  {errors.description?.message}
                </span>
                <span className="text-gray-400">
                  {description?.length || 0} / 2000
                </span>
              </div>
            </div>

            {/* Original poem id (optional) */}
            <div>
              <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
                اصل نظم کا ID (اختیاری)
              </label>
              <input
                {...register("originalPoemId", {
                  pattern: {
                    value: /^[a-f\d]{24}$/i,
                    message: "درست poem id درج کریں",
                  },
                })}
                placeholder="مثلاً: 65f0c8c9..."
                className="w-full rounded-xl border border-urdu-cream bg-white px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cultural-amber"
              />
              {errors.originalPoemId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.originalPoemId.message}
                </p>
              )}
            </div>

            {/* Evidence links */}
            <div>
              <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
                ثبوت / لنکس
              </label>
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-urdu-maroon shrink-0" />
                    <input
                      {...register(`evidenceLinks.${i}.value`, {
                        maxLength: 500,
                      })}
                      placeholder="https://..."
                      className="flex-1 rounded-xl border border-urdu-cream bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cultural-amber"
                      dir="ltr"
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                        aria-label="Remove link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {fields.length < 10 && (
                  <button
                    type="button"
                    onClick={() => append({ value: "" })}
                    className="inline-flex items-center gap-1 text-sm text-urdu-maroon hover:text-cultural-amber font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="urdu-text">مزید لنک شامل کریں</span>
                  </button>
                )}
              </div>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="urdu-text">{serverError}</span>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-urdu-cream">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-urdu-cream text-urdu-brown urdu-text font-medium hover:bg-urdu-cream/40"
              >
                منسوخ کریں
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-urdu-maroon hover:bg-red-800 text-white urdu-text font-bold shadow disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جمع ہو رہی ہے…
                  </>
                ) : (
                  <>
                    <Flag className="h-4 w-4" />
                    رپورٹ جمع کریں
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportCopyrightModal;
