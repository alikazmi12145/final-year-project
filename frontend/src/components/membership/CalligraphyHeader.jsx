import React from "react";

/**
 * Classical title plate — eyebrow + Nastaliq title + ornament + English subtitle.
 * Designed to feel like a Mughal manuscript chapter heading.
 */
export default function CalligraphyHeader({ urdu, english, caption, eyebrow }) {
  return (
    <div className="text-center mb-16 bes-fade-up">
      {eyebrow && (
        <div className="mb-5">
          <span className="bes-eyebrow">{eyebrow}</span>
        </div>
      )}

      <h2
        dir="rtl"
        className="bes-section-title text-4xl sm:text-5xl md:text-6xl bes-gold-text mb-3"
      >
        {urdu}
      </h2>

      <Ornament />

      {english && (
        <p className="font-elegant italic text-amber-100/80 tracking-[0.18em] text-sm sm:text-base uppercase mt-4">
          {english}
        </p>
      )}
      {caption && (
        <p
          dir="rtl"
          className="bes-urdu-display text-amber-100/70 mt-4 max-w-2xl mx-auto text-lg"
        >
          {caption}
        </p>
      )}
    </div>
  );
}

function Ornament() {
  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      <span className="h-px w-16 sm:w-28 bg-gradient-to-l from-amber-400/60 to-transparent" />
      <svg width="44" height="14" viewBox="0 0 44 14" fill="none" aria-hidden>
        <circle cx="22" cy="7" r="3.5" stroke="#d4af37" strokeWidth="1.2" />
        <circle cx="22" cy="7" r="1.4" fill="#f6d27a" />
        <path d="M2 7 L14 7 M30 7 L42 7" stroke="#d4af37" strokeWidth="1" strokeLinecap="round" />
        <circle cx="6" cy="7" r="1.1" fill="#d4af37" />
        <circle cx="38" cy="7" r="1.1" fill="#d4af37" />
      </svg>
      <span className="h-px w-16 sm:w-28 bg-gradient-to-r from-amber-400/60 to-transparent" />
    </div>
  );
}
