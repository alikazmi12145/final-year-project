/**
 * AdminFraudPanel.jsx
 * Admin panel for reviewing and resolving fraud/abuse reports.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Flag,
  CheckCircle,
  XCircle,
  Eye,
  User,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  getAdminFraudReports,
  resolveReport,
} from "../../services/verificationAPI";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const REASON_LABELS = {
  impersonation:    "جعلی شناخت",
  fake_credentials: "جھوٹی سند",
  plagiarism:       "سرقہ",
  spam:             "اسپام",
  harassment:       "ہراسانی",
  other:            "دیگر",
};

const STATUS_CONFIG = {
  pending:   { label: "زیرِ غور",   cls: "bg-amber-100 text-amber-700" },
  reviewed:  { label: "جانچا گیا", cls: "bg-blue-100   text-blue-700"  },
  resolved:  { label: "حل ہوا",    cls: "bg-green-100  text-green-700" },
  dismissed: { label: "مسترد",     cls: "bg-gray-100   text-gray-600"  },
};

const StatusPill = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full urdu-text ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Report detail modal
// ─────────────────────────────────────────────────────────────────────────────
const ReportModal = ({ report, onClose, onResolve, processing }) => {
  const [adminNotes, setAdminNotes] = useState("");
  const [notesError, setNotesError] = useState("");

  const handleAction = (action) => {
    setNotesError("");
    if (!adminNotes.trim()) {
      setNotesError("نوٹ لکھنا ضروری ہے");
      return;
    }
    onResolve(report._id, action, adminNotes.trim());
  };

  const isPending =
    report.status === "pending" || report.status === "reviewed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Flag size={18} className="text-red-500" />
            <h3 className="font-bold urdu-text text-gray-900">
              رپورٹ کی تفصیل
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Reported user */}
          <div>
            <p className="text-xs font-semibold text-gray-500 urdu-text mb-2">
              جس کے خلاف رپورٹ
            </p>
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {report.reportedUserId?.profileImage?.url ? (
                  <img
                    src={report.reportedUserId.profileImage.url}
                    alt={report.reportedUserId.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={18} className="text-red-700" />
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900">
                  {report.reportedUserId?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {report.reportedUserId?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Reporter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 urdu-text mb-2">
              رپورٹ کرنے والا
            </p>
            <p className="text-sm text-gray-700">
              {report.reportedBy?.name || "نامعلوم"}
              <span className="text-gray-400 ml-1 text-xs">
                ({report.reportedBy?.email})
              </span>
            </p>
          </div>

          {/* Reason + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-1">
                وجہ
              </p>
              <p className="text-sm urdu-text text-gray-800 font-medium">
                {REASON_LABELS[report.reason] || report.reason}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-1">
                حالت
              </p>
              <StatusPill status={report.status} />
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-500 urdu-text mb-2">
              تفصیل
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p
                className="text-sm text-gray-800 urdu-text leading-relaxed whitespace-pre-wrap"
                dir="rtl"
              >
                {report.description}
              </p>
            </div>
          </div>

          {/* Evidence */}
          {report.evidenceUrls?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-2">
                ثبوت
              </p>
              <div className="space-y-1">
                {report.evidenceUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-600 hover:underline block truncate"
                  >
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Existing admin notes */}
          {report.adminNotes && !isPending && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-1">
                ایڈمن کا نوٹ
              </p>
              <p className="text-sm text-gray-700 urdu-text">{report.adminNotes}</p>
            </div>
          )}

          {/* Date */}
          <p className="text-xs text-gray-400 urdu-text">
            تاریخ: {new Date(report.createdAt).toLocaleDateString("ur-PK")}
          </p>

          {/* Action area */}
          {isPending && (
            <>
              <div>
                <label className="text-sm font-semibold urdu-text text-gray-700 mb-1 block">
                  ایڈمن نوٹ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => {
                    setAdminNotes(e.target.value);
                    setNotesError("");
                  }}
                  placeholder="فیصلے کی وجہ یا نوٹ..."
                  rows={3}
                  dir="rtl"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 urdu-text resize-none"
                />
                {notesError && (
                  <p className="text-xs text-red-500 urdu-text mt-1">
                    {notesError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAction("resolved")}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  <span className="urdu-text">حل کریں</span>
                </button>
                <button
                  onClick={() => handleAction("dismissed")}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  <span className="urdu-text">مسترد کریں</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────────────────
const AdminFraudPanel = () => {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0, page: 1, totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [alert, setAlert] = useState(null);

  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminFraudReports({
        status: statusFilter,
        page,
        limit: 15,
      });
      setReports(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch {
      setAlert({ type: "error", msg: "رپورٹیں لوڈ نہیں ہوئیں" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  const handleResolve = async (id, action, adminNotes) => {
    setProcessing(true);
    try {
      await resolveReport(id, action, adminNotes);
      setAlert({
        type: "success",
        msg: action === "resolved" ? "رپورٹ حل کر دی گئی" : "رپورٹ مسترد کر دی گئی",
      });
      setSelectedReport(null);
      fetchReports(pagination.page);
    } catch (err) {
      setAlert({
        type: "error",
        msg: err.response?.data?.message || "عمل مکمل نہیں ہوا",
      });
    } finally {
      setProcessing(false);
    }
  };

  const FILTER_TABS = [
    { value: "pending",   label: "زیرِ غور"  },
    { value: "reviewed",  label: "جانچا گیا" },
    { value: "resolved",  label: "حل ہوا"    },
    { value: "dismissed", label: "مسترد"     },
    { value: "all",       label: "تمام"       },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flag size={22} className="text-red-500" />
          <h2 className="text-xl font-bold urdu-text text-gray-900">
            فراڈ رپورٹیں
          </h2>
          <span className="text-sm bg-red-100 text-red-700 font-semibold px-2.5 py-0.5 rounded-full">
            {pagination.total || 0}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium urdu-text transition-colors ${
                statusFilter === tab.value
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => fetchReports(pagination.page)}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
            title="تازہ کریں"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border text-sm urdu-text ${
            alert.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {alert.msg}
          <button
            onClick={() => setAlert(null)}
            className="ml-auto text-lg font-bold leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-red-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Flag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="urdu-text">کوئی رپورٹ نہیں ملی</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-red-50 text-red-800">
              <tr>
                <th className="px-4 py-3 text-right urdu-text font-semibold">
                  جس کے خلاف
                </th>
                <th className="px-4 py-3 text-right urdu-text font-semibold">
                  رپورٹر
                </th>
                <th className="px-4 py-3 text-right urdu-text font-semibold">
                  وجہ
                </th>
                <th className="px-4 py-3 text-right urdu-text font-semibold">
                  تفصیل
                </th>
                <th className="px-4 py-3 text-right urdu-text font-semibold">
                  تاریخ
                </th>
                <th className="px-4 py-3 text-center urdu-text font-semibold">
                  حالت
                </th>
                <th className="px-4 py-3 text-center urdu-text font-semibold">
                  عمل
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((rpt) => (
                <tr
                  key={rpt._id}
                  className="hover:bg-red-50/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {rpt.reportedUserId?.profileImage?.url ? (
                          <img
                            src={rpt.reportedUserId.profileImage.url}
                            alt={rpt.reportedUserId.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={14} className="text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {rpt.reportedUserId?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {rpt.reportedUserId?.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {rpt.reportedBy?.name || "نامعلوم"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="urdu-text text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      {REASON_LABELS[rpt.reason] || rpt.reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p
                      className="text-xs text-gray-600 urdu-text truncate"
                      dir="rtl"
                    >
                      {rpt.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(rpt.createdAt).toLocaleDateString("ur-PK")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill status={rpt.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedReport(rpt)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Eye size={13} />
                      <span className="urdu-text">دیکھیں</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchReports(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-sm text-gray-600 urdu-text">
            صفحہ {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchReports(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {/* Report detail modal */}
      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onResolve={handleResolve}
          processing={processing}
        />
      )}
    </div>
  );
};

export default AdminFraudPanel;
