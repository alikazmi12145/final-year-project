/**
 * useVerification.js
 *
 * React hook for poet verification workflow.
 *
 * Capabilities:
 *  • Loads the current user's verification status (auto on mount)
 *  • Submits new verification applications
 *  • Refreshes status after submit
 *  • Exposes loading + error state separately for read vs write actions
 *  • Admin helpers: list / approve / reject (opt-in via { admin: true })
 *
 * Usage:
 *   const v = useVerification();
 *   v.status            // { isVerified, verificationBadge, latestRequest } | null
 *   v.loading           // initial status load
 *   v.submitting        // apply / approve / reject in flight
 *   v.error             // last error message (string | null)
 *   v.apply(payload)    // submit application
 *   v.refresh()         // refetch status
 *
 *   const admin = useVerification({ admin: true });
 *   admin.list({ status: 'pending', page: 1 })
 *   admin.approve(id, remarks)
 *   admin.reject(id, remarks)
 */
import { useCallback, useEffect, useState } from "react";
import {
  applyForVerification,
  getMyVerificationStatus,
  getAdminVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
} from "../services/verificationAPI";

const extractError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export default function useVerification({ admin = false, autoLoad = true } = {}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(autoLoad && !admin);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ── User: load own status ───────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyVerificationStatus();
      setStatus(res.data?.data || null);
      return res.data?.data || null;
    } catch (err) {
      setError(extractError(err, "حالت معلوم کرنے میں خرابی"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad && !admin) refresh();
  }, [admin, autoLoad, refresh]);

  // ── User: submit application ────────────────────────────────────────────
  const apply = useCallback(
    async (payload) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await applyForVerification(payload);
        // Refresh status so caller sees the new pending state
        if (!admin) refresh();
        return { ok: true, data: res.data?.data };
      } catch (err) {
        const msg = extractError(err, "درخواست جمع کرنے میں خرابی ہوئی");
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSubmitting(false);
      }
    },
    [admin, refresh]
  );

  // ── Admin: list requests ────────────────────────────────────────────────
  const list = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminVerificationRequests(params);
      return {
        ok: true,
        data: res.data?.data || [],
        pagination: res.data?.pagination || null,
      };
    } catch (err) {
      const msg = extractError(err, "درخواستیں حاصل کرنے میں خرابی");
      setError(msg);
      return { ok: false, error: msg, data: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Admin: approve ──────────────────────────────────────────────────────
  const approve = useCallback(async (id, remarks = "") => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await approveVerificationRequest(id, remarks);
      return { ok: true, data: res.data?.data };
    } catch (err) {
      const msg = extractError(err, "منظوری میں خرابی");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, []);

  // ── Admin: reject ───────────────────────────────────────────────────────
  const reject = useCallback(async (id, remarks) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await rejectVerificationRequest(id, remarks);
      return { ok: true, data: res.data?.data };
    } catch (err) {
      const msg = extractError(err, "رد کرنے میں خرابی");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    // state
    status,
    loading,
    submitting,
    error,
    // user actions
    apply,
    refresh,
    // admin actions
    list,
    approve,
    reject,
    // setter for optimistic UI
    setStatus,
  };
}
