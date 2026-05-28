import React, { useState } from "react";
import { Check, Crown, Sparkles, Star } from "lucide-react";
import CalligraphyHeader from "./CalligraphyHeader";

const PLAN_ORDER = ["free", "premium_monthly", "premium_yearly", "vip_literary"];

function iconFor(id) {
  if (id === "vip_literary") return <Crown className="w-5 h-5" />;
  if (id === "premium_yearly") return <Star className="w-5 h-5" />;
  if (id === "premium_monthly") return <Sparkles className="w-5 h-5" />;
  return <Check className="w-5 h-5" />;
}

export default function PricingCards({ plans, onSelect, currentPlanId }) {
  const [cycle, setCycle] = useState("year"); // for display toggle (visual)
  if (!plans || plans.length === 0) return null;
  const ordered = PLAN_ORDER.map((id) => plans.find((p) => p.id === id)).filter(
    Boolean
  );

  return (
    <section className="relative py-20" id="pricing">
      <div className="max-w-7xl mx-auto px-4">
        <CalligraphyHeader
          eyebrow="Choose Your Plan"
          urdu="رکنیت کا انتخاب"
          english="Membership Tiers"
          caption="ہر قاری کے لیے ایک شاندار منصوبہ"
        />

        <div className="flex justify-center mb-10">
          <div
            role="tablist"
            className="bes-glass inline-flex p-1 rounded-full"
          >
            {[
              { id: "month", label: "ماہانہ" },
              { id: "year", label: "سالانہ" },
            ].map((opt) => (
              <button
                key={opt.id}
                role="tab"
                aria-selected={cycle === opt.id}
                onClick={() => setCycle(opt.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all font-nastaliq ${
                  cycle === opt.id
                    ? "bg-gradient-to-r from-amber-400 to-yellow-600 text-stone-900 shadow"
                    : "text-amber-100/70 hover:text-amber-200"
                }`}
              >
                {opt.label}
                {opt.id === "year" && (
                  <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                    Save 33%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ordered.map((p, idx) => {
            const isFeatured = p.id === "premium_yearly";
            const price =
              cycle === "year" ? p.price?.yearly : p.price?.monthly;
            const isCurrent = currentPlanId === p.id;
            return (
              <article
                key={p.id}
                className={`relative bes-glass bes-glass-hover bes-card bes-shine bes-fade-up bes-price-card ${
                  isFeatured ? "featured bes-ring-gold lg:scale-105 lg:-mt-3" : ""
                }`}
                style={{ animationDelay: `${idx * 110}ms` }}
              >
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bes-chip whitespace-nowrap">
                      {p.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-amber-300/90 mb-3">
                  {iconFor(p.id)}
                  <span className="uppercase tracking-widest text-xs">
                    {p.name}
                  </span>
                </div>
                <h3
                  dir="rtl"
                  className="font-nastaliq text-2xl bes-gold-text mb-1"
                >
                  {p.nameUrdu}
                </h3>
                <p
                  dir="rtl"
                  className="font-nastaliq text-sm text-amber-100/70 min-h-[2.4rem]"
                >
                  {p.tagline}
                </p>

                <div className="my-6">
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-bold bes-gold-text">
                      ${price}
                    </span>
                    {price > 0 && (
                      <span className="text-amber-100/60 pb-2">
                        /{cycle === "year" ? "mo" : "mo"}
                      </span>
                    )}
                  </div>
                  {cycle === "year" && p.price?.yearly > 0 && (
                    <p className="text-xs text-amber-100/50 mt-1">
                      Billed as ${(p.price.yearly).toFixed(2)} yearly
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6">
                  {(p.perks || []).map((perk) => (
                    <li
                      dir="rtl"
                      key={perk}
                      className="flex items-start gap-2 font-nastaliq text-amber-50/90 text-sm"
                    >
                      <Check className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelect && onSelect(p, cycle)}
                  disabled={isCurrent}
                  className={
                    isFeatured ? "bes-btn-gold w-full" : "bes-btn-ghost w-full"
                  }
                >
                  {isCurrent
                    ? "موجودہ پلان"
                    : p.id === "free"
                    ? "مفت شروع کریں"
                    : "ابھی حاصل کریں"}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
