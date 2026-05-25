/**
 * AdminViolationsPage.jsx
 * Admin browse + lift/expire/update enforcement actions.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldX, Loader2, AlertCircle } from "lucide-react";
import useViolationReports from "../hooks/useViolationReports";
import { Skeleton } from "../components/copyright/Skeleton";
import { ADMIN_ACTIONS } from "../services/copyrightAPI";

const actionLabel = (id) =>
  ADMIN_ACTIONS.find((a) => a.id === id)?.label || id;

const STATUS_PILL = {
  none: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-red-100 text-red-700 border-red-200",
  expired: "bg-amber-100 text-amber-700 border-amber-200",
  lifted: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const AdminViolationsPage = () => {
  const navigate = useNavigate();
  const { items, pagination, loading, error, listViolations, updateViolation, acting } =
    useViolationReports();
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    listViolations({ action: action || undefined, page });
  }, [listViolations, action, page]);

  const onLift = async (id) => {
    if (!confirm("کیا آپ واقعی یہ معطلی ختم کرنا چاہتے ہیں؟")) return;
    const res = await updateViolation(id, { suspensionStatus: "lifted" });
    if (res.ok) listViolations({ action: action || undefined, page });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-urdu-cream/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="urdu-text text-2xl sm:text-3xl font-bold text-urdu-brown flex items-center gap-2">
            <ShieldX className="h-7 w-7 text-red-600" />
            خلاف ورزیوں کا ریکارڈ
          </h1>
          <button
            onClick={() => navigate("/admin/copyright")}
            className="urdu-text text-sm rounded-xl border border-urdu-cream bg-white px-4 py-2 hover:bg-urdu-cream/40"
          >
            ← شکایات پر واپس
          </button>
        </div>

        <div className="card rounded-2xl border border-urdu-cream bg-white p-3 sm:p-4 mb-5 flex flex-col sm:flex-row gap-2">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-urdu-cream bg-white px-3 py-2 text-sm urdu-text"
          >
            <option value="">تمام کارروائیاں</option>
            {ADMIN_ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
            <AlertCircle className="h-4 w-4" />
            <span className="urdu-text">{error}</span>
          </div>
        )}

        <div className="space-y-3">
          {loading && items.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="card rounded-2xl border border-urdu-cream bg-white p-5"
                >
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            : items.length === 0
            ? (
              <div className="card rounded-2xl border border-dashed border-urdu-cream bg-white p-10 text-center">
                <ShieldX className="mx-auto h-12 w-12 text-urdu-gold mb-3" />
                <p className="urdu-text text-urdu-brown font-bold">
                  ابھی کوئی خلاف ورزی درج نہیں
                </p>
              </div>
            )
            : items.map((v) => (
                <article
                  key={v._id}
                  className="card rounded-2xl border border-urdu-cream bg-white p-4 sm:p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="urdu-text inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 text-[11px] font-bold">
                          {actionLabel(v.actionTaken)}
                        </span>
                        {v.suspensionStatus !== "none" && (
                          <span
                            className={`urdu-text inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_PILL[v.suspensionStatus]}`}
                          >
                            {v.suspensionStatus}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400">
                          {new Date(v.createdAt).toLocaleString("ur-PK")}
                        </span>
                      </div>
                      <h3 className="urdu-text font-bold text-urdu-brown text-base sm:text-lg">
                        {v.violatorId?.name || "—"}
                      </h3>
                      <p className="urdu-text text-xs text-urdu-maroon mt-1">
                        نظم: {v.poemId?.title || "—"} • صادر کنندہ:{" "}
                        {v.issuedBy?.name || "—"}
                      </p>
                      {v.reason && (
                        <p className="urdu-text text-sm text-urdu-maroon line-clamp-2 mt-2">
                          {v.reason}
                        </p>
                      )}
                      {v.suspendedUntil && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          معطل تا:{" "}
                          {new Date(v.suspendedUntil).toLocaleDateString(
                            "ur-PK"
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      {v.suspensionStatus === "active" && (
                        <button
                          disabled={acting}
                          onClick={() => onLift(v._id)}
                          className="urdu-text rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-bold disabled:opacity-60"
                        >
                          معطلی ختم کریں
                        </button>
                      )}
                      {v.reportId && (
                        <button
                          onClick={() =>
                            navigate(`/admin/copyright/${v.reportId._id || v.reportId}`)
                          }
                          className="urdu-text rounded-xl border border-urdu-cream bg-white px-4 py-2 text-sm"
                        >
                          متعلقہ رپورٹ
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
        </div>

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
              {pagination.page} / {pagination.pages}
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
    </div>
  );
};

export default AdminViolationsPage;
