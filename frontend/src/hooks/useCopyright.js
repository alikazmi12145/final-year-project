/**
 * useCopyright.js
 * React hook bundling per-poem copyright operations:
 *   • fetch poem copyright info
 *   • update license (author/admin)
 *   • submit a copyright report
 *   • run similarity check
 */
import { useCallback, useState } from "react";
import {
  getPoemCopyrightInfo,
  updatePoemLicense,
  submitCopyrightReport,
  checkSimilarity,
} from "../services/copyrightAPI";

const extractError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export default function useCopyright() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadInfo = useCallback(async (poemId) => {
    if (!poemId) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await getPoemCopyrightInfo(poemId);
      setInfo(res.data?.data || null);
      return res.data?.data;
    } catch (err) {
      setError(extractError(err, "کاپی رائٹ معلومات لوڈ نہیں ہو سکیں"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const changeLicense = useCallback(async (poemId, license) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await updatePoemLicense(poemId, license);
      if (res.data?.success && info) {
        setInfo({
          ...info,
          license,
          copyrightNotice: res.data.data?.copyrightNotice || info.copyrightNotice,
        });
      }
      return { ok: true, data: res.data?.data };
    } catch (err) {
      const msg = extractError(err, "لائسنس تبدیل نہیں ہو سکا");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, [info]);

  const reportCopyright = useCallback(async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitCopyrightReport(payload);
      return { ok: true, data: res.data?.data };
    } catch (err) {
      const msg = extractError(err, "رپورٹ جمع کرنے میں خرابی");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, []);

  const runSimilarityCheck = useCallback(async (content, excludePoemId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await checkSimilarity(content, excludePoemId);
      return { ok: true, data: res.data?.data };
    } catch (err) {
      const msg = extractError(err, "مماثلت چیک نہیں ہو سکی");
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    info,
    loading,
    submitting,
    error,
    loadInfo,
    changeLicense,
    reportCopyright,
    runSimilarityCheck,
    clearError: () => setError(null),
  };
}
