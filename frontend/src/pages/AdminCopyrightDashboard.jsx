/**
 * AdminCopyrightDashboard.jsx
 * Admin overview of all copyright reports with filters, search, status tabs,
 * counts, pagination and quick decision modal.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Search,
  Filter,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
} from "lucide-react";
import useViolationReports from "../hooks/useViolationReports";
import StatusBadge from "../components/copyright/StatusBadge";
import { Skeleton } from "../components/copyright/Skeleton";
import { REPORT_REASONS, ADMIN_ACTIONS } from "../services/copyrightAPI";

const TABS = [
  { id: "pending", label: "زیرِ التواء", color: "amber" },
  { id: "under_review", label: "جائزے میں", color: "blue" },
  { id: "approved", label: "منظور", color: "green" },
  { id: "rejected", label: "مسترد", color: "red" },
  { id: "withdrawn", label: "واپس", color: "gray" },
];

const COLOR_BG = {
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  green: "bg-emerald-50 border-emerald-200 text-emerald-700",
  red: "bg-red-50 border-red-200 text-red-700",
  gray: "bg-gray-50 border-gray-200 text-gray-700",
};

const AdminCopyrightDashboard = () => {
  const navigate = useNavigate();
  const {
    items,
    counts,
    pagination,
    loading,
    error,
    listAdmin,
    decide,
    acting,
  } = useViolationReports();

  const [status, setStatus] = useState("pending");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [decisionFor, setDecisionFor] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    listAdmin({
      status,
      reason: reason || undefined,
      search: debounced || undefined,
      page,
    });
  }, [listAdmin, status, reason, debounced, page]);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-urdu-cream/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="urdu-text text-2xl sm:text-3xl font-bold text-urdu-brown flex items-center gap-2">
              <ShieldAlert className="h-7 w-7 text-cultural-amber" />
              کاپی رائٹ شکایات — ایڈمن پینل
            </h1>
            <p className="urdu-text text-sm text-urdu-maroon mt-1">
              تمام صارفین کی جانب سے جمع کردہ شکایات کا انتظام۔
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/copyright/violations")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-urdu-cream bg-white px-4 py-2.5 urdu-text text-urdu-brown font-bold hover:bg-urdu-cream/40"
          >
            خلاف ورزیوں کا ریکارڈ
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setStatus(t.id);
                setPage(1);
              }}
              className={`rounded-2xl border p-3 sm:p-4 text-right transition ${
                COLOR_BG[t.color]
              } ${status === t.id ? "ring-2 ring-offset-2 ring-cultural-amber" : "opacity-90 hover:opacity-100"}`}
            >
              <div className="urdu-text text-xs sm:text-sm font-bold">
                {t.label}
              </div>
              <div className="text-2xl sm:text-3xl font-bold mt-1">
                {counts[t.id] || 0}
              </div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="card rounded-2xl border border-urdu-cream bg-white p-3 sm:p-4 mb-6 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex-1 flex items-center gap-2 border border-urdu-cream rounded-xl px-3 py-2 bg-urdu-cream/20">
            <Search className="h-4 w-4 text-urdu-maroon" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="تفصیل یا ایڈمن نوٹس میں تلاش کریں…"
              className="flex-1 bg-transparent outline-none urdu-text text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-urdu-maroon" />
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-urdu-cream bg-white px-3 py-2 text-sm urdu-text"
            >
              <option value="">تمام وجوہات</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
            <AlertCircle className="h-4 w-4" />
            <span className="urdu-text">{error}</span>
          </div>
        )}

        {/* Table / cards */}
        <div className="space-y-3">
          {loading && items.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="card rounded-2xl border border-urdu-cream bg-white p-5"
              >
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="card rounded-2xl border border-dashed border-urdu-cream bg-white p-10 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-urdu-gold mb-3" />
              <p className="urdu-text text-urdu-brown font-bold">
                اس فلٹر کے مطابق کوئی رپورٹ نہیں
              </p>
            </div>
          ) : (
            items.map((r) => (
              <article
                key={r._id}
                className="card rounded-2xl border border-urdu-cream bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge status={r.status} />
                      <span className="urdu-text text-xs text-urdu-maroon">
                        {REPORT_REASONS.find((x) => x.id === r.reason)?.label}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(r.createdAt).toLocaleString("ur-PK")}
                      </span>
                    </div>
                    <h3 className="urdu-text font-bold text-urdu-brown text-base sm:text-lg">
                      {r.poemId?.title || "نظم"}
                    </h3>
                    <p className="urdu-text text-xs sm:text-sm text-urdu-maroon mt-1">
                      <span className="font-bold">رپورٹر:</span>{" "}
                      {r.reporterId?.name || "—"}
                      <span className="mx-2">•</span>
                      <span className="font-bold">شاعر:</span>{" "}
                      {r.reportedUserId?.name || "—"}
                    </p>
                    <p className="urdu-text text-sm text-urdu-maroon line-clamp-2 mt-2">
                      {r.description}
                    </p>
                    {r.similarityScore > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 w-40 rounded-full bg-urdu-cream overflow-hidden">
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
                  <div className="flex sm:flex-col gap-2 lg:w-48 shrink-0">
                    <button
                      onClick={() =>
                        navigate(`/admin/copyright/${r._id}`)
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-urdu-cream bg-white px-3 py-2 text-sm urdu-text hover:bg-urdu-cream/40"
                    >
                      <Eye className="h-4 w-4" />
                      تفصیلات
                    </button>
                    {["pending", "under_review"].includes(r.status) && (
                      <button
                        onClick={() => setDecisionFor(r)}
                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-cultural-amber text-white px-3 py-2 text-sm urdu-text font-bold hover:bg-cultural-amber/90"
                      >
                        فیصلہ کریں
                        <ChevronRight className="h-4 w-4" />
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

      {/* Decision modal */}
      {decisionFor && (
        <AdminDecisionModal
          report={decisionFor}
          acting={acting}
          onClose={() => setDecisionFor(null)}
          onSubmit={async (payload) => {
            const res = await decide(decisionFor._id, payload);
            if (res.ok) {
              setDecisionFor(null);
              listAdmin({
                status,
                reason: reason || undefined,
                search: debounced || undefined,
                page,
              });
            }
          }}
        />
      )}
    </div>
  );
};

/* ────────── Inline modal component ────────── */
const AdminDecisionModal = ({ report, acting, onClose, onSubmit }) => {
  const [decision, setDecision] = useState("approve");
  const [action, setAction] = useState("warning");
  const [adminNotes, setAdminNotes] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-urdu-cream max-h-[95vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-urdu-cream flex items-center justify-between">
          <h3 className="urdu-text font-bold text-urdu-brown">
            رپورٹ پر فیصلہ
          </h3>
          <button onClick={onClose} aria-label="close">
            <XCircle className="h-5 w-5 text-urdu-maroon" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
              فیصلہ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "approve", label: "منظور", icon: CheckCircle2, color: "emerald" },
                { id: "reject", label: "مسترد", icon: XCircle, color: "red" },
                { id: "under_review", label: "جائزے میں", icon: Eye, color: "blue" },
              ].map(({ id, label, icon: Icon, color }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setDecision(id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition ${
                    decision === id
                      ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                      : "border-urdu-cream bg-white text-urdu-brown"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="urdu-text text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {decision === "approve" && (
            <>
              <div>
                <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
                  کارروائی
                </label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full rounded-xl border border-urdu-cream bg-white px-3 py-2 text-sm urdu-text"
                >
                  {ADMIN_ACTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              {action === "user_suspended" && (
                <div>
                  <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
                    معطلی کی مدت (دن)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={suspensionDays}
                    onChange={(e) =>
                      setSuspensionDays(Number(e.target.value) || 1)
                    }
                    className="w-full rounded-xl border border-urdu-cream bg-white px-3 py-2 text-sm"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="urdu-text block text-sm font-bold text-urdu-brown mb-2">
              ایڈمن نوٹس
            </label>
            <textarea
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              maxLength={2000}
              placeholder="فیصلے کی وجہ یا تفصیل…"
              className="urdu-text w-full rounded-xl border border-urdu-cream px-3 py-2 text-sm focus:ring-2 focus:ring-cultural-amber"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-urdu-cream text-urdu-brown urdu-text"
            >
              منسوخ
            </button>
            <button
              disabled={acting}
              onClick={() =>
                onSubmit({
                  decision,
                  adminNotes,
                  ...(decision === "approve"
                    ? {
                        action,
                        ...(action === "user_suspended"
                          ? { suspensionDays }
                          : {}),
                      }
                    : {}),
                })
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-urdu-maroon hover:bg-red-800 text-white urdu-text font-bold disabled:opacity-60"
            >
              {acting && <Loader2 className="h-4 w-4 animate-spin" />}
              فیصلہ محفوظ کریں
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCopyrightDashboard;
