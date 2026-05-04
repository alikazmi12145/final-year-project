/**
 * AdminVerificationPanel.jsx
 * Admin panel for reviewing, approving, and rejecting poet verification requests.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  User,
  Link2,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  getAdminVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
} from "../../services/verificationAPI";
import VerificationBadge from "../verification/VerificationBadge";

// ─────────────────────────────────────────────────────────────────────────────
// Status pill
// ─────────────────────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const map = {
    pending:  { label: "زیرِ غور",    cls: "bg-amber-100 text-amber-700" },
    approved: { label: "منظور",        cls: "bg-green-100 text-green-700"  },
    rejected: { label: "رد",           cls: "bg-red-100   text-red-700"    },
  };
  const cfg = map[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full urdu-text ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Request detail modal
// ─────────────────────────────────────────────────────────────────────────────
const RequestModal = ({ request, onClose, onApprove, onReject, processing }) => {
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");

  const handleApprove = () => {
    setRemarksError("");
    onApprove(request._id, remarks);
  };

  const handleReject = () => {
    if (remarks.trim().length < 10) {
      setRemarksError("رد کرنے کی وجہ کم از کم ۱۰ حروف ہونی چاہیے");
      return;
    }
    setRemarksError("");
    onReject(request._id, remarks);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-amber-500" />
            <h3 className="font-bold urdu-text text-gray-900">تصدیق درخواست کی تفصیل</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* User info */}
          <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {request.userId?.profileImage?.url ? (
                <img
                  src={request.userId.profileImage.url}
                  alt={request.userId.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={24} className="text-amber-700" />
              )}
            </div>
            <div>
              <p className="font-bold text-gray-900">{request.userId?.name}</p>
              <p className="text-sm text-gray-500">{request.userId?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {request.userId?.role} •{" "}
                {new Date(request.createdAt).toLocaleDateString("ur-PK")}
              </p>
            </div>
            <div className="ml-auto">
              <StatusPill status={request.status} />
            </div>
          </div>

          {/* Full Name & Pen Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-1">مکمل نام</p>
              <p className="text-sm font-medium text-gray-900 urdu-text">
                {request.fullName}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-1">تخلص</p>
              <p className="text-sm text-gray-700 urdu-text">
                {request.penName || "—"}
              </p>
            </div>
          </div>

          {/* Document URL */}
          {request.nationalIdDocumentUrl && (
            <div>
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-1">
                شناختی دستاویز
              </p>
              <a
                href={request.nationalIdDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-amber-600 hover:underline"
              >
                <Link2 size={14} /> دستاویز دیکھیں
              </a>
            </div>
          )}

          {/* Social Links */}
          {request.socialLinks?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-2">
                سوشل روابط
              </p>
              <div className="space-y-1">
                {request.socialLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {link.platform && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 urdu-text">
                        {link.platform}
                      </span>
                    )}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-600 hover:underline truncate max-w-[300px]"
                    >
                      {link.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Poetry */}
          <div>
            <p className="text-xs font-semibold text-gray-500 urdu-text mb-2">
              نمونہ کلام
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p
                className="text-sm text-gray-800 urdu-text leading-loose whitespace-pre-wrap"
                dir="rtl"
              >
                {request.samplePoetry}
              </p>
            </div>
          </div>

          {/* Statement */}
          {request.statement && (
            <div>
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-2">
                بیانیہ
              </p>
              <p className="text-sm text-gray-700 urdu-text" dir="rtl">
                {request.statement}
              </p>
            </div>
          )}

          {/* Existing admin remarks (if already processed) */}
          {request.adminRemarks && request.status !== "pending" && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 urdu-text mb-1">
                ایڈمن کا تبصرہ
              </p>
              <p className="text-sm text-gray-700 urdu-text">{request.adminRemarks}</p>
            </div>
          )}

          {/* Action area - only for pending */}
          {request.status === "pending" && (
            <>
              <div>
                <label className="text-sm font-semibold urdu-text text-gray-700 mb-1 block">
                  تبصرہ / وجہ (رد کرنے کے لیے لازمی)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    setRemarksError("");
                  }}
                  placeholder="ایڈمن کا تبصرہ یہاں لکھیں..."
                  rows={3}
                  dir="rtl"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 urdu-text resize-none"
                />
                {remarksError && (
                  <p className="text-xs text-red-500 urdu-text mt-1">{remarksError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  <span className="urdu-text">منظور کریں</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  <span className="urdu-text">رد کریں</span>
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
// Main Panel
// ─────────────────────────────────────────────────────────────────────────────
const AdminVerificationPanel = () => {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0, page: 1, totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [alert, setAlert] = useState(null); // { type: 'success'|'error', msg }

  const fetchRequests = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminVerificationRequests({
        status: statusFilter,
        page,
        limit: 15,
      });
      setRequests(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setAlert({ type: "error", msg: "درخواستیں لوڈ نہیں ہوئیں" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests(1);
  }, [fetchRequests]);

  const handleApprove = async (id, adminRemarks) => {
    setProcessing(true);
    try {
      await approveVerificationRequest(id, adminRemarks);
      setAlert({ type: "success", msg: "درخواست منظور کر لی گئی" });
      setSelectedRequest(null);
      fetchRequests(pagination.page);
    } catch (err) {
      setAlert({
        type: "error",
        msg: err.response?.data?.message || "منظوری میں خرابی",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id, adminRemarks) => {
    setProcessing(true);
    try {
      await rejectVerificationRequest(id, adminRemarks);
      setAlert({ type: "success", msg: "درخواست رد کر دی گئی" });
      setSelectedRequest(null);
      fetchRequests(pagination.page);
    } catch (err) {
      setAlert({
        type: "error",
        msg: err.response?.data?.message || "رد کرنے میں خرابی",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-amber-500" />
          <h2 className="text-xl font-bold urdu-text text-gray-900">
            تصدیق درخواستیں
          </h2>
          <span className="text-sm bg-amber-100 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full">
            {pagination.total || 0}
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["pending", "approved", "rejected", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium urdu-text transition-colors ${
                statusFilter === s
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "pending"  ? "زیرِ غور" :
               s === "approved" ? "منظور"    :
               s === "rejected" ? "رد"        : "تمام"}
            </button>
          ))}
          <button
            onClick={() => fetchRequests(pagination.page)}
            className="p-2 text-gray-500 hover:text-amber-600 transition-colors"
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
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="urdu-text">کوئی درخواست نہیں ملی</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-amber-50 text-amber-800">
              <tr>
                <th className="px-4 py-3 text-right urdu-text font-semibold">شاعر</th>
                <th className="px-4 py-3 text-right urdu-text font-semibold">مکمل نام</th>
                <th className="px-4 py-3 text-right urdu-text font-semibold">تاریخ</th>
                <th className="px-4 py-3 text-center urdu-text font-semibold">حالت</th>
                <th className="px-4 py-3 text-center urdu-text font-semibold">عمل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req) => (
                <tr key={req._id} className="hover:bg-amber-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {req.userId?.profileImage?.url ? (
                          <img
                            src={req.userId.profileImage.url}
                            alt={req.userId.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={16} className="text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {req.userId?.name}
                        </p>
                        <p className="text-xs text-gray-400">{req.userId?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 urdu-text text-gray-700" dir="rtl">
                    {req.fullName}
                    {req.penName && (
                      <span className="text-xs text-gray-400 block">
                        ({req.penName})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(req.createdAt).toLocaleDateString("ur-PK")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill status={req.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 font-medium text-xs bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
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
            onClick={() => fetchRequests(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-sm text-gray-600 urdu-text">
            صفحہ {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchRequests(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selectedRequest && (
        <RequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          processing={processing}
        />
      )}
    </div>
  );
};

export default AdminVerificationPanel;
