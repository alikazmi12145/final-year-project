/**
 * MyCopyrightReportsPage.jsx
 * Logged-in user's list of copyright reports + status timeline. Also includes
 * an entry-point form to file a NEW report by pasting a poemId.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Flag,
  ShieldCheck,
  Search,
  X,
  ChevronRight,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import useViolationReports from "../hooks/useViolationReports";
import ReportCopyrightModal from "../components/copyright/ReportCopyrightModal";
import StatusBadge from "../components/copyright/StatusBadge";
import { Skeleton } from "../components/copyright/Skeleton";
import { REPORT_REASONS } from "../services/copyrightAPI";

const STATUS_TABS = [
  { id: "", label: "تمام" },
  { id: "pending", label: "زیرِ التواء" },
  { id: "under_review", label: "جائزے میں" },
  { id: "approved", label: "منظور" },
  { id: "rejected", label: "مسترد" },
  { id: "withdrawn", label: "واپس لیا" },
];

const reasonLabel = (id) =>
  REPORT_REASONS.find((r) => r.id === id)?.label || id;

const MyCopyrightReportsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPoemId = searchParams.get("poemId") || "";
  const { items, pagination, loading, error, list, withdraw, acting } =
    useViolationReports();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(!!initialPoemId);
  const [targetPoemId, setTargetPoemId] = useState(initialPoemId);
  const [manualPoemId, setManualPoemId] = useState("");

  useEffect(() => {
    list({ status: status || undefined, page });
  }, [list, status, page]);

  const onOpenManual = (e) => {
    e?.preventDefault();
    if (!/^[a-f\d]{24}$/i.test(manualPoemId.trim())) return;
    setTargetPoemId(manualPoemId.trim());
    setShowModal(true);
  };

  const onSuccess = () => {
    setShowModal(false);
    setTargetPoemId("");
    searchParams.delete("poemId");
    setSearchParams(searchParams);
    list({ status: status || undefined, page: 1 });
    setPage(1);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-urdu-cream/30 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="urdu-text text-2xl sm:text-3xl font-bold text-urdu-brown flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-cultural-amber" />
              میری کاپی رائٹ رپورٹس
            </h1>
            <p className="urdu-text text-sm text-urdu-maroon mt-1">
              اپنی جمع کردہ شکایات اور ان کی موجودہ صورتحال یہاں دیکھیں۔
            </p>
          </div>
          <button
            onClick={() => {
              setTargetPoemId("");
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-urdu-maroon hover:bg-red-800 text-white px-5 py-2.5 urdu-text font-bold shadow"
          >
            <Flag className="h-4 w-4" />
            نئی رپورٹ
          </button>
        </div>

        {/* Quick "report by poem id" panel */}
        <form
          onSubmit={onOpenManual}
          className="card p-4 sm:p-5 rounded-2xl border border-urdu-cream bg-white shadow-sm mb-6"
        >
          <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
            <Search className="inline h-4 w-4 ms-1" />
            Poem ID کے ذریعے رپورٹ کریں
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={manualPoemId}
              onChange={(e) => setManualPoemId(e.target.value)}
              placeholder="نظم کا 24-حروف Mongo ID پیسٹ کریں"
              className="flex-1 rounded-xl border border-urdu-cream bg-white px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cultural-amber"
              dir="ltr"
            />
            <button
              type="submit"
              disabled={!/^[a-f\d]{24}$/i.test(manualPoemId.trim())}
              className="rounded-xl bg-cultural-amber hover:bg-cultural-amber/90 text-white urdu-text font-bold px-5 py-2.5 disabled:opacity-50"
            >
              جاری رکھیں
            </button>
          </div>
        </form>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id || "all"}
              onClick={() => {
                setStatus(t.id);
                setPage(1);
              }}
              className={`urdu-text px-4 py-1.5 rounded-full text-sm border transition ${
                status === t.id
                  ? "bg-urdu-brown text-white border-urdu-brown shadow"
                  : "bg-white text-urdu-brown border-urdu-cream hover:bg-urdu-cream/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
            <AlertCircle className="h-4 w-4" />
            <span className="urdu-text">{error}</span>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading && items.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="card rounded-2xl border border-urdu-cream bg-white p-4 sm:p-5"
              >
                <Skeleton className="h-5 w-2/3 mb-3" />
                <Skeleton className="h-4 w-full mb-1.5" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="card rounded-2xl border border-dashed border-urdu-cream bg-white p-10 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-urdu-gold mb-3" />
              <p className="urdu-text text-urdu-brown font-bold mb-1">
                ابھی کوئی رپورٹ نہیں
              </p>
              <p className="urdu-text text-sm text-urdu-maroon">
                جب آپ کسی نظم کے بارے میں شکایت کریں گے، وہ یہاں نظر آئے گی۔
              </p>
            </div>
          ) : (
            items.map((r) => (
              <article
                key={r._id}
                className="card rounded-2xl border border-urdu-cream bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusBadge status={r.status} />
                      <span className="urdu-text text-xs text-urdu-maroon">
                        {reasonLabel(r.reason)}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(r.createdAt).toLocaleString("ur-PK")}
                      </span>
                    </div>
                    <h3 className="urdu-text font-bold text-urdu-brown text-base sm:text-lg truncate">
                      {r.poemId?.title || "نظم"}
                    </h3>
                    <p className="urdu-text text-sm text-urdu-maroon line-clamp-2 mt-1">
                      {r.description}
                    </p>
                    {typeof r.similarityScore === "number" &&
                      r.similarityScore > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 w-24 sm:w-40 rounded-full bg-urdu-cream overflow-hidden">
                            <div
                              className="h-full bg-cultural-amber"
                              style={{
                                width: `${Math.round(r.similarityScore * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-urdu-maroon">
                            {Math.round(r.similarityScore * 100)}% مماثلت
                          </span>
                        </div>
                      )}
                  </div>
                  <div className="flex sm:flex-col items-stretch gap-2 sm:w-40 shrink-0">
                    <button
                      onClick={() => navigate(`/copyright/report/${r._id}`)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-urdu-cream bg-white px-3 py-1.5 text-sm hover:bg-urdu-cream/40 urdu-text"
                    >
                      تفصیلات
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {["pending", "under_review"].includes(r.status) && (
                      <button
                        disabled={acting}
                        onClick={async () => {
                          if (!confirm("کیا آپ واقعی رپورٹ واپس لینا چاہتے ہیں؟"))
                            return;
                          const res = await withdraw(r._id);
                          if (res.ok)
                            list({ status: status || undefined, page });
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-sm urdu-text hover:bg-red-100 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        واپس لیں
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-urdu-cream bg-white text-sm disabled:opacity-50"
            >
              ‹ پچھلا
            </button>
            <span className="text-sm urdu-text text-urdu-maroon">
              صفحہ {pagination.page} / {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-urdu-cream bg-white text-sm disabled:opacity-50"
            >
              اگلا ›
            </button>
          </div>
        )}
      </div>

      <ReportCopyrightModal
        poemId={targetPoemId}
        open={showModal && !!targetPoemId}
        onClose={() => {
          setShowModal(false);
          setTargetPoemId("");
        }}
        onSuccess={onSuccess}
      />

      {/* If "new report" was clicked without a poemId, ask for it */}
      {showModal && !targetPoemId && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="urdu-text font-bold text-urdu-brown text-lg">
                نظم کا Poem ID درج کریں
              </h3>
              <button onClick={() => setShowModal(false)} aria-label="close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onOpenManual} className="space-y-3">
              <input
                value={manualPoemId}
                onChange={(e) => setManualPoemId(e.target.value)}
                placeholder="24-character poem id"
                className="w-full rounded-xl border border-urdu-cream px-3 py-2 font-mono text-sm"
                dir="ltr"
              />
              <button
                type="submit"
                disabled={!/^[a-f\d]{24}$/i.test(manualPoemId.trim())}
                className="w-full rounded-xl bg-urdu-maroon text-white py-2.5 urdu-text font-bold disabled:opacity-50"
              >
                جاری رکھیں
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCopyrightReportsPage;
