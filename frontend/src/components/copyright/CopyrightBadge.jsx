/**
 * CopyrightBadge.jsx
 * Compact responsive badge showing license + author + year. Used on poem
 * detail / list cards. Auto-fetches info if `poemId` is provided and no
 * `info` prop given.
 */
import React, { useEffect, useState } from "react";
import { Copyright, AlertTriangle, Flag } from "lucide-react";
import { Link } from "react-router-dom";
import { LICENSE_OPTIONS } from "../../services/copyrightAPI";
import { getPoemCopyrightInfo } from "../../services/copyrightAPI";

const COLOR_BY_LICENSE = {
  all_rights_reserved: "bg-urdu-maroon/10 text-urdu-maroon border-urdu-maroon/30",
  cc_by: "bg-blue-50 text-blue-700 border-blue-200",
  cc_by_sa: "bg-indigo-50 text-indigo-700 border-indigo-200",
  cc_by_nc: "bg-purple-50 text-purple-700 border-purple-200",
  public_domain: "bg-emerald-50 text-emerald-700 border-emerald-200",
  personal_copyright: "bg-amber-50 text-amber-800 border-amber-200",
};

const CopyrightBadge = ({
  poemId,
  info: infoProp,
  compact = false,
  showReportLink = true,
  onReport,
  className = "",
}) => {
  const [info, setInfo] = useState(infoProp || null);
  const [loading, setLoading] = useState(!infoProp && !!poemId);

  useEffect(() => {
    if (infoProp) {
      setInfo(infoProp);
      return;
    }
    if (!poemId) return;
    let alive = true;
    setLoading(true);
    getPoemCopyrightInfo(poemId)
      .then((res) => alive && setInfo(res.data?.data || null))
      .catch(() => alive && setInfo(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [poemId, infoProp]);

  if (loading) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-urdu-cream bg-urdu-cream/40 px-3 py-1 text-xs text-urdu-maroon animate-pulse ${className}`}
      >
        <Copyright className="h-3 w-3" />
        لوڈ ہو رہا ہے…
      </div>
    );
  }

  if (!info) return null;

  const meta = LICENSE_OPTIONS.find((l) => l.id === info.license) || LICENSE_OPTIONS[0];
  const colorClass =
    COLOR_BY_LICENSE[info.license] || COLOR_BY_LICENSE.all_rights_reserved;
  const year = info.createdAt ? new Date(info.createdAt).getFullYear() : "";
  const authorName = info.author?.name || "نامعلوم";

  if (compact) {
    return (
      <span
        title={info.copyrightNotice}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${colorClass} ${className}`}
        dir="rtl"
      >
        <Copyright className="h-3 w-3" />
        <span className="urdu-text">{meta.label}</span>
      </span>
    );
  }

  return (
    <div
      dir="rtl"
      className={`relative overflow-hidden rounded-2xl border ${colorClass} bg-gradient-to-l from-white/80 via-white/60 to-white/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}
    >
      {/* Decorative corner accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -left-8 h-24 w-24 rounded-full bg-current opacity-[0.06] blur-2xl"
      />

      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
        <div
          className="shrink-0 flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-white/70 border border-current/20 shadow-sm text-xl sm:text-2xl"
          aria-hidden="true"
        >
          {meta.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="urdu-text font-bold text-sm sm:text-base leading-tight">
              {meta.label}
            </span>
            <span className="inline-flex items-center rounded-full border border-current/20 bg-white/50 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold opacity-80">
              {meta.english}
            </span>
            {info.flaggedForSimilarity && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold">
                <AlertTriangle className="h-3 w-3" />
                مشتبہ مماثلت
              </span>
            )}
          </div>
          <p className="urdu-text text-xs sm:text-sm mt-1.5 opacity-95 flex items-center gap-1.5">
            <Copyright className="h-3.5 w-3.5 opacity-70" />
            <span>
              {year} <span className="font-semibold">{authorName}</span>
            </span>
          </p>
          <p className="text-[11px] sm:text-xs mt-1 opacity-75 urdu-text leading-relaxed">
            {meta.description}
          </p>
        </div>
      </div>

      {showReportLink && (
        <div className="flex items-center gap-2 self-end sm:self-auto sm:border-r sm:border-current/15 sm:pr-4">
          {onReport ? (
            <button
              type="button"
              onClick={onReport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 hover:bg-white border border-current/25 px-3 py-2 text-xs sm:text-[13px] font-semibold shadow-sm hover:shadow transition"
            >
              <Flag className="h-3.5 w-3.5" />
              <span className="urdu-text">رپورٹ کریں</span>
            </button>
          ) : (
            <Link
              to={`/copyright/report?poemId=${info.poemId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 hover:bg-white border border-current/25 px-3 py-2 text-xs sm:text-[13px] font-semibold shadow-sm hover:shadow transition"
            >
              <Flag className="h-3.5 w-3.5" />
              <span className="urdu-text">رپورٹ کریں</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default CopyrightBadge;
