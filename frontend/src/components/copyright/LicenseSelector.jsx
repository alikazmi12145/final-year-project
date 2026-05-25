/**
 * LicenseSelector.jsx
 * Responsive grid of license cards. Used by poem creation/editing and on
 * the poem detail page (when the viewer is the author).
 */
import React from "react";
import { Check } from "lucide-react";
import { LICENSE_OPTIONS } from "../../services/copyrightAPI";

const LicenseSelector = ({
  value,
  onChange,
  disabled = false,
  compact = false,
  className = "",
}) => {
  return (
    <div dir="rtl" className={className}>
      <div
        className={`grid gap-3 ${
          compact
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {LICENSE_OPTIONS.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              type="button"
              key={opt.id}
              disabled={disabled}
              onClick={() => onChange?.(opt.id)}
              aria-pressed={selected}
              className={`group relative text-right rounded-2xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-cultural-amber/50 ${
                selected
                  ? "border-cultural-amber bg-cultural-amber/10 shadow-md ring-2 ring-cultural-amber/40"
                  : "border-urdu-cream bg-white hover:border-urdu-gold hover:shadow-sm"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {selected && (
                <span className="absolute top-2 left-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-cultural-amber text-white shadow">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className="text-3xl leading-none shrink-0" aria-hidden="true">
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <div className="urdu-text font-bold text-urdu-brown text-base sm:text-lg">
                    {opt.label}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-urdu-maroon/70">
                    {opt.english}
                  </div>
                  <p className="urdu-text text-xs sm:text-sm text-urdu-maroon mt-2 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LicenseSelector;
