/**
 * FraudReportPage.jsx
 * Standalone page where any logged-in user can search a poet and submit a
 * fraud / abuse report against them. Reuses the existing FraudReportForm.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Search, Flag, ShieldAlert, Loader2, ChevronRight, X } from "lucide-react";
import FraudReportForm from "../components/verification/FraudReportForm";
import VerificationBadge from "../components/verification/VerificationBadge";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

// Lightweight unauthenticated GET — the poets list is public
const fetchPoets = (search) =>
  axios.get(`${API_BASE_URL}/poets`, {
    params: { search: search || undefined, limit: 12 },
    timeout: 12000,
  });

const FraudReportPage = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [poets, setPoets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  // Pre-select a poet via query string: /report-fraud?target=<userId>&name=<name>
  useEffect(() => {
    const target = searchParams.get("target");
    const name = searchParams.get("name");
    if (target) {
      setSelected({ id: target, name: name || "منتخب شاعر" });
    }
  }, [searchParams]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch poets when query changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchPoets(debouncedQuery);
        if (cancelled) return;
        // Normalize response — different endpoints nest data differently
        const raw =
          res.data?.poets ||
          res.data?.data ||
          (Array.isArray(res.data) ? res.data : []);
        setPoets(Array.isArray(raw) ? raw : []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || "شعراء حاصل کرنے میں خرابی"
          );
          setPoets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Map a poet object to the User id we need for the report
  const resolveUserId = (poet) => {
    if (!poet) return null;
    // Poet collection populated `.user`
    if (poet.user?._id) return poet.user._id;
    if (typeof poet.user === "string") return poet.user;
    // Fallback for User-as-poet entries
    return poet._id || null;
  };

  const displayName = (poet) =>
    poet?.name || poet?.user?.name || poet?.fullName || "نامعلوم شاعر";

  const renderList = useMemo(() => {
    if (loading) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 size={28} className="animate-spin text-red-500" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center text-sm urdu-text text-red-600 py-6">
          {error}
        </div>
      );
    }
    if (!poets.length) {
      return (
        <div className="text-center text-sm urdu-text text-gray-500 py-6">
          کوئی شاعر نہیں ملا
        </div>
      );
    }
    return (
      <ul className="divide-y divide-amber-100 border border-amber-100 rounded-2xl bg-white overflow-hidden">
        {poets.map((p) => {
          const uid = resolveUserId(p);
          const verified = p.isVerified || p.user?.isVerified;
          const badge = p.verificationBadge || p.user?.verificationBadge || "gold";
          return (
            <li
              key={uid || p._id}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {displayName(p).charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold urdu-text text-gray-900 truncate">
                      {displayName(p)}
                    </p>
                    {verified && (
                      <VerificationBadge
                        isVerified
                        badge={badge}
                        size="sm"
                        showLabel={false}
                      />
                    )}
                  </div>
                  {p.bio && (
                    <p className="text-xs text-gray-500 urdu-text truncate">
                      {p.bio.slice(0, 80)}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={!uid}
                onClick={() => setSelected({ id: uid, name: displayName(p) })}
                className="flex items-center gap-1 text-xs font-semibold urdu-text text-red-600 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <Flag size={14} />
                رپورٹ کریں
                <ChevronRight size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }, [loading, error, poets]);

  return (
    <div className="min-h-screen bg-amber-50/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert size={22} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold urdu-text text-gray-900">
              غلط استعمال کی رپورٹ
            </h1>
            <p className="text-sm urdu-text text-gray-500">
              کسی شاعر کو رپورٹ کرنے کے لیے تلاش کریں
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="شاعر کا نام تلاش کریں..."
            dir="rtl"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 urdu-text bg-white"
          />
        </div>

        {/* Poet list */}
        {renderList}

        {/* Report modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                aria-label="بند کریں"
              >
                <X size={20} />
              </button>
              <FraudReportForm
                reportedUserId={selected.id}
                reportedUserName={selected.name}
                onClose={() => setSelected(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FraudReportPage;
