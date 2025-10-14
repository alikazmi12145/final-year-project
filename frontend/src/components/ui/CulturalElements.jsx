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

// Background cultural elements for pages
export const CulturalElements = ({ className = "" }) => (
  <div
    className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}
  >
    {/* Top decorative elements */}
    <div className="absolute top-10 left-10 opacity-10">
      <IslamicPattern size={120} className="text-amber-600" />
    </div>
    <div className="absolute top-20 right-16 opacity-10">
      <GeometricOrnament className="w-24 h-24 text-orange-500" />
    </div>

    {/* Middle decorative elements */}
    <div className="absolute top-1/2 left-16 opacity-5 transform -translate-y-1/2">
      <IslamicPattern size={200} className="text-amber-500" />
    </div>
    <div className="absolute top-1/3 right-10 opacity-10">
      <GeometricOrnament className="w-16 h-16 text-amber-600" />
    </div>

    {/* Bottom decorative elements */}
    <div className="absolute bottom-16 left-20 opacity-10">
      <GeometricOrnament className="w-20 h-20 text-orange-400" />
    </div>
    <div className="absolute bottom-20 right-14 opacity-5">
      <IslamicPattern size={100} className="text-amber-600" />
    </div>

    {/* Subtle corner decorations */}
    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-300 opacity-20"></div>
    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-300 opacity-20"></div>
    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-amber-300 opacity-20"></div>
    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-300 opacity-20"></div>
  </div>
);

export default {
  IslamicPattern,
  CulturalBorder,
  GeometricOrnament,
  CalligraphyDivider,
  TraditionalCard,
  CulturalElements,
};
