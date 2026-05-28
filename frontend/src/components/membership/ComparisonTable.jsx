import React from "react";
import { Check, X } from "lucide-react";
import CalligraphyHeader from "./CalligraphyHeader";

const ROWS = [
  { key: "exclusiveCollections", label: "Exclusive Poetry Collections", urdu: "خصوصی شاعری ذخیرہ" },
  { key: "aiAdvancedSearch", label: "AI-powered Search Tools", urdu: "ایڈوانس AI تلاش" },
  { key: "unlimitedDownloads", label: "Unlimited PDF Downloads", urdu: "لامحدود ڈاؤن لوڈ" },
  { key: "audioStudio", label: "Audio Poetry Studio", urdu: "آڈیو شاعری اسٹوڈیو" },
  { key: "adFree", label: "Ad-free Experience", urdu: "اشتہار سے پاک" },
  { key: "premiumBadge", label: "Premium Profile Badge", urdu: "پریمیم بیج" },
  { key: "earlyAccess", label: "Early Access to New Features", urdu: "نئے فیچرز تک ابتدائی رسائی" },
];

const PLAN_ORDER = ["free", "premium_monthly", "premium_yearly", "vip_literary"];

export default function ComparisonTable({ plans }) {
  if (!plans || plans.length === 0) return null;
  const ordered = PLAN_ORDER.map((id) => plans.find((p) => p.id === id)).filter(
    Boolean
  );

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <CalligraphyHeader
          eyebrow="Side by Side"
          urdu="پلانز کا موازنہ"
          english="Compare Membership Plans"
        />

        <div className="bes-glass bes-glass-frame rounded-2xl overflow-x-auto bes-fade-up">
          <table className="bes-table min-w-[720px]">
            <thead>
              <tr>
                <th className="text-left">Benefit / فائدہ</th>
                {ordered.map((p) => (
                  <th key={p.id} className={p.id === "premium_yearly" ? "col-featured" : ""}>
                    <div className="flex flex-col items-center">
                      <span
                        dir="rtl"
                        className="font-nastaliq bes-gold-text text-lg"
                      >
                        {p.nameUrdu}
                      </span>
                      <span className="text-xs text-amber-100/60">{p.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="text-left">
                    <div className="flex flex-col">
                      <span className="text-amber-50/90">{row.label}</span>
                      <span
                        dir="rtl"
                        className="font-nastaliq text-amber-100/60 text-sm"
                      >
                        {row.urdu}
                      </span>
                    </div>
                  </td>
                  {ordered.map((p) => (
                    <td key={p.id} className={p.id === "premium_yearly" ? "col-featured" : ""}>
                      {p.features?.[row.key] ? (
                        <Check className="w-5 h-5 text-emerald-400 inline" />
                      ) : (
                        <X className="w-5 h-5 text-stone-500 inline" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
