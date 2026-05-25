/**
 * useViolationReports.js
 * Hook for browsing and acting on copyright reports.
 *   • list({ status, page, search })          — user lists own reports
 *   • get(id)                                 — single report detail
 *   • withdraw(id)
 *   • listAdmin({ status, reason, page })     — admin
 *   • decide(id, { decision, action, ... })   — admin
 *   • listViolations({ ... })                 — admin
 *   • updateViolation(id, payload)            — admin
 */
import { useCallback, useState } from "react";
import {
  getMyCopyrightReports,
  getCopyrightReport,
  withdrawCopyrightReport,
  getAdminCopyrightReports,
  getAdminCopyrightReport,
  decideCopyrightReport,
  getAdminViolations,
  updateViolation as updateViolationApi,
  getMyViolations,
} from "../services/copyrightAPI";

const extractError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export default function useViolationReports() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    withdrawn: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20,
  });
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);

  const wrap = async (fn, fallback) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      return res.data;
    } catch (err) {
      const msg = extractError(err, fallback);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const list = useCallback(async (params = {}) => {
    const data = await wrap(
      () => getMyCopyrightReports(params),
      "رپورٹس لوڈ نہیں ہو سکیں"
    );
    if (data?.success) {
      setItems(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    }
    return data;
  }, []);

  const get = useCallback(async (id) => {
    const data = await wrap(
      () => getCopyrightReport(id),
      "رپورٹ لوڈ نہیں ہو سکی"
    );
    return data;
  }, []);

  const withdraw = useCallback(async (id) => {
    setActing(true);
    setError(null);
    try {
      const res = await withdrawCopyrightReport(id);
      return { ok: true, data: res.data };
    } catch (err) {
      const msg = extractError(err, "واپس لینے میں خرابی");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setActing(false);
    }
  }, []);

  const listAdmin = useCallback(async (params = {}) => {
    const data = await wrap(
      () => getAdminCopyrightReports(params),
      "ایڈمن رپورٹس لوڈ نہیں ہو سکیں"
    );
    if (data?.success) {
      setItems(data.data || []);
      setCounts((prev) => data.counts || prev);
      if (data.pagination) setPagination(data.pagination);
    }
    return data;
  }, []);

  const getAdmin = useCallback(async (id) => {
    return await wrap(
      () => getAdminCopyrightReport(id),
      "رپورٹ لوڈ نہیں ہو سکی"
    );
  }, []);

  const decide = useCallback(async (id, payload) => {
    setActing(true);
    setError(null);
    try {
      const res = await decideCopyrightReport(id, payload);
      return { ok: true, data: res.data };
    } catch (err) {
      const msg = extractError(err, "فیصلہ ریکارڈ نہیں ہو سکا");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setActing(false);
    }
  }, []);

  const listViolations = useCallback(async (params = {}) => {
    const data = await wrap(
      () => getAdminViolations(params),
      "خلاف ورزیوں کی فہرست لوڈ نہیں ہو سکی"
    );
    if (data?.success) {
      setItems(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    }
    return data;
  }, []);

  const updateViolation = useCallback(async (id, payload) => {
    setActing(true);
    setError(null);
    try {
      const res = await updateViolationApi(id, payload);
      return { ok: true, data: res.data };
    } catch (err) {
      const msg = extractError(err, "خلاف ورزی اپڈیٹ نہیں ہو سکی");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setActing(false);
    }
  }, []);

  const myViolations = useCallback(async () => {
    return await wrap(
      () => getMyViolations(),
      "خلاف ورزیاں لوڈ نہیں ہو سکیں"
    );
  }, []);

  return {
    items,
    counts,
    pagination,
    loading,
    acting,
    error,
    clearError: () => setError(null),
    list,
    get,
    withdraw,
    listAdmin,
    getAdmin,
    decide,
    listViolations,
    updateViolation,
    myViolations,
  };
}
