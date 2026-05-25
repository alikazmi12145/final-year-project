/**
 * CopyrightReportDetailPage.jsx
 * Shows full detail of a single copyright report — used by both reporter and
 * the reported author. Includes original vs reported comparison and a
 * status timeline.
 */
import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  Shield,
  FileText,
  ExternalLink,
  Clock,
} from "lucide-react";
import useViolationReports from "../hooks/useViolationReports";
import StatusBadge from "../components/copyright/StatusBadge";
import { REPORT_REASONS } from "../services/copyrightAPI";

const reasonLabel = (id) =>
  REPORT_REASONS.find((r) => r.id === id)?.label || id;

const PoemBlock = ({ heading, poem }) => (
  <div className="card rounded-2xl border border-urdu-cream bg-white p-4 sm:p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <FileText className="h-4 w-4 text-cultural-amber" />
      <h4 className="urdu-text font-bold text-urdu-brown">{heading}</h4>
    </div>
    {poem ? (
      <>
        <p className="urdu-text font-bold text-urdu-brown mb-2">
          {poem.title}
        </p>
        <pre
          dir="rtl"
          className="urdu-text whitespace-pre-wrap text-sm text-urdu-maroon font-urdu leading-loose max-h-72 overflow-y-auto"
        >
          {poem.content}
        </pre>
      </>
    ) : (
      <p className="urdu-text text-sm text-gray-500">دستیاب نہیں</p>
    )}
  </div>
);

const CopyrightReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, loading, error } = useViolationReports();
  const [report, setReport] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await get(id);
      if (data?.success) setReport(data.data);
    })();
  }, [id, get]);

  if (loading && !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cultural-amber" />
      </div>
    );
  }

  if (!report) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <p className="urdu-text text-urdu-maroon">{error || "رپورٹ نہیں ملی"}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 rounded-xl bg-urdu-maroon text-white urdu-text"
          >
            واپس جائیں
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-urdu-cream/30 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <button
          onClick={() => navigate(-1)}
          className="urdu-text text-sm text-urdu-maroon mb-4 hover:underline inline-flex items-center gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          واپس
        </button>

        {/* Header */}
        <div className="card rounded-2xl border border-urdu-cream bg-white p-5 sm:p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Shield className="h-5 w-5 text-cultural-amber" />
                <StatusBadge status={report.status} />
                <span className="urdu-text text-xs text-urdu-maroon">
                  {reasonLabel(report.reason)}
                </span>
              </div>
              <h1 className="urdu-text text-xl sm:text-2xl font-bold text-urdu-brown">
                {report.poemId?.title || "نظم"}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(report.createdAt).toLocaleString("ur-PK")}
              </p>
            </div>
            {typeof report.similarityScore === "number" &&
              report.similarityScore > 0 && (
                <div className="text-center sm:text-left">
                  <div className="text-xs urdu-text text-urdu-maroon">مماثلت</div>
                  <div className="text-3xl font-bold text-cultural-amber">
                    {Math.round(report.similarityScore * 100)}%
                  </div>
                </div>
              )}
          </div>

          <div className="mt-4">
            <h3 className="urdu-text font-bold text-urdu-brown text-sm mb-1">
              تفصیل
            </h3>
            <p className="urdu-text text-sm text-urdu-maroon whitespace-pre-wrap leading-relaxed">
              {report.description}
            </p>
          </div>

          {report.evidenceLinks?.length > 0 && (
            <div className="mt-4">
              <h3 className="urdu-text font-bold text-urdu-brown text-sm mb-2">
                ثبوت
              </h3>
              <ul className="space-y-1">
                {report.evidenceLinks.map((link, i) => (
                  <li key={i} className="text-sm">
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
                      dir="ltr"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.adminNotes && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <h3 className="urdu-text font-bold text-amber-800 text-sm mb-1">
                ایڈمن نوٹس
              </h3>
              <p className="urdu-text text-sm text-amber-900 whitespace-pre-wrap">
                {report.adminNotes}
              </p>
            </div>
          )}
        </div>

        {/* Side-by-side poems */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <PoemBlock heading="رپورٹ کردہ نظم" poem={report.poemId} />
          <PoemBlock heading="مبینہ اصل نظم" poem={report.originalPoemId} />
        </div>

        {/* Timeline */}
        {report.timeline?.length > 0 && (
          <div className="card rounded-2xl border border-urdu-cream bg-white p-5 sm:p-6 shadow-sm">
            <h3 className="urdu-text font-bold text-urdu-brown mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cultural-amber" />
              ٹائم لائن
            </h3>
            <ol className="relative border-r-2 border-urdu-cream pr-6 space-y-4">
              {report.timeline.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -right-[34px] top-1.5 h-3 w-3 rounded-full bg-cultural-amber border-2 border-white" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={e.status} />
                    <span className="text-[11px] text-gray-400">
                      {new Date(e.at).toLocaleString("ur-PK")}
                    </span>
                  </div>
                  {e.note && (
                    <p className="urdu-text text-sm text-urdu-maroon mt-1">
                      {e.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default CopyrightReportDetailPage;
