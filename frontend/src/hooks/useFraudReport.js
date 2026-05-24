/**
 * useFraudReport.js
 *
 * React hook for fraud / abuse reporting workflow.
 *
 * Usage (any user):
 *   const fr = useFraudReport();
 *   await fr.submit({ reportedUserId, reason, description, evidenceUrls });
 *
 * Usage (admin):
 *   const admin = useFraudReport({ admin: true });
 *   admin.list({ status: 'pending' })
 *   admin.resolve(id, 'resolved', notes)
 *   admin.resolve(id, 'dismissed', notes)
 */
import { useCallback, useState } from "react";
import {
  submitFraudReport,
  getAdminFraudReports,
  resolveReport,
} from "../services/verificationAPI";

const extractError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export default function useFraudReport(/* { admin = false } = {} */) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastReportId, setLastReportId] = useState(null);

  // ── User: submit a report ───────────────────────────────────────────────
  const submit = useCallback(async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitFraudReport(payload);
      const reportId = res.data?.data?.reportId || null;
      setLastReportId(reportId);
      return { ok: true, reportId };
    } catch (err) {
      const msg = extractError(err, "رپورٹ جمع کرنے میں خرابی ہوئی");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, []);

  // ── Admin: list reports ─────────────────────────────────────────────────
  const list = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminFraudReports(params);
      return {
        ok: true,
        data: res.data?.data || [],
        pagination: res.data?.pagination || null,
      };
    } catch (err) {
      const msg = extractError(err, "رپورٹس حاصل کرنے میں خرابی");
      setError(msg);
      return { ok: false, error: msg, data: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Admin: resolve or dismiss ───────────────────────────────────────────
  const resolve = useCallback(async (id, action = "resolved", adminNotes = "") => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await resolveReport(id, action, adminNotes);
      return { ok: true, data: res.data?.data };
    } catch (err) {
      const msg = extractError(err, "رپورٹ نمٹانے میں خرابی");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    loading,
    submitting,
    error,
    lastReportId,
    submit,
    list,
    resolve,
  };
}
