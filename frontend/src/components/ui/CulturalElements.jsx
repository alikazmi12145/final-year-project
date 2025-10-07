import React from "react";

// Traditional Islamic/Urdu decorative patterns
export const IslamicPattern = ({ size = 40, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" className={className}>
    <defs>
      <pattern
        id="islamic-pattern"
        x="0"
        y="0"
        width="30"
        height="30"
        patternUnits="userSpaceOnUse"
      >
        <polygon
          points="15 0 30 15 15 30 0 15"
          fill="currentColor"
          opacity="0.1"
        />
      </pattern>
    </defs>
    <rect width="60" height="60" fill="url(#islamic-pattern)" />
  </svg>
);

// Decorative border component
export const CulturalBorder = ({ children, className = "" }) => (
  <div className={`relative ${className}`}>
    <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
    <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
    <div className="absolute top-2 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-400 opacity-60"></div>
    <div className="absolute top-2 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-400 opacity-60"></div>
    <div className="absolute bottom-2 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-400 opacity-60"></div>
    <div className="absolute bottom-2 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-400 opacity-60"></div>
    {children}
  </div>
);

// Geometric ornament
export const GeometricOrnament = ({ className = "" }) => (
  <svg className={`w-8 h-8 ${className}`} viewBox="0 0 32 32">
    <circle
      cx="16"
      cy="16"
      r="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.6"
    />
    <circle
      cx="16"
      cy="16"
      r="6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.8"
    />
    <circle cx="16" cy="16" r="2" fill="currentColor" opacity="0.9" />
  </svg>
);

// Calligraphy-style divider
export const CalligraphyDivider = ({ className = "" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-300"></div>
    <GeometricOrnament className="mx-4 text-amber-500" />
    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-300"></div>
  </div>
);

// Traditional card frame
export const TraditionalCard = ({ children, className = "", title }) => (
  <div
    className={`relative bg-white rounded-xl shadow-lg border border-slate-200 ${className}`}
  >
    {/* Decorative corners */}
    <div className="absolute top-0 left-0 w-4 h-4">
      <div className="absolute top-1 left-1 w-2 h-0.5 bg-amber-400"></div>
      <div className="absolute top-1 left-1 w-0.5 h-2 bg-amber-400"></div>
    </div>
    <div className="absolute top-0 right-0 w-4 h-4">
      <div className="absolute top-1 right-1 w-2 h-0.5 bg-amber-400"></div>
      <div className="absolute top-1 right-1 w-0.5 h-2 bg-amber-400"></div>
    </div>
    <div className="absolute bottom-0 left-0 w-4 h-4">
      <div className="absolute bottom-1 left-1 w-2 h-0.5 bg-amber-400"></div>
      <div className="absolute bottom-1 left-1 w-0.5 h-2 bg-amber-400"></div>
    </div>
    <div className="absolute bottom-0 right-0 w-4 h-4">
      <div className="absolute bottom-1 right-1 w-2 h-0.5 bg-amber-400"></div>
      <div className="absolute bottom-1 right-1 w-0.5 h-2 bg-amber-400"></div>
    </div>

    {title && (
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <h3
          className="cultural-title text-lg font-semibold text-amber-900"
          dir="rtl"
        >
          {title}
        </h3>
      </div>
    )}

    <div className="p-6">{children}</div>
  </div>
);

export default {
  IslamicPattern,
  CulturalBorder,
  GeometricOrnament,
  CalligraphyDivider,
  TraditionalCard,
};
