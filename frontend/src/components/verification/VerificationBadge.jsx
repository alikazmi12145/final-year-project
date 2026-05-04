/**
 * VerificationBadge.jsx
 * Displays a gold "✔ تصدیق شدہ" badge for verified poets.
 * Can be used inline on profile pages, poem cards, and search results.
 *
 * Props:
 *   isVerified  {boolean}  - whether to show the badge
 *   badge       {string}   - verificationBadge level (none/bronze/silver/gold/diamond)
 *   size        {'sm'|'md'|'lg'}  - badge size
 *   showLabel   {boolean}  - whether to show text label alongside icon
 */
import React from "react";
import { ShieldCheck } from "lucide-react";

const BADGE_STYLES = {
  gold: {
    container: "bg-amber-50 border border-amber-400 text-amber-700",
    icon: "text-amber-500",
    glow: "shadow-amber-200",
  },
  diamond: {
    container: "bg-sky-50 border border-sky-400 text-sky-700",
    icon: "text-sky-500",
    glow: "shadow-sky-200",
  },
  silver: {
    container: "bg-slate-50 border border-slate-400 text-slate-600",
    icon: "text-slate-500",
    glow: "shadow-slate-200",
  },
  bronze: {
    container: "bg-orange-50 border border-orange-400 text-orange-700",
    icon: "text-orange-500",
    glow: "shadow-orange-200",
  },
};

const SIZE_MAP = {
  sm: { icon: 12, text: "text-xs", padding: "px-1.5 py-0.5", gap: "gap-0.5" },
  md: { icon: 14, text: "text-sm", padding: "px-2 py-1",   gap: "gap-1"   },
  lg: { icon: 18, text: "text-base",padding: "px-3 py-1.5", gap: "gap-1.5" },
};

const VerificationBadge = ({
  isVerified = false,
  badge = "gold",
  size = "md",
  showLabel = true,
}) => {
  if (!isVerified) return null;

  const level = BADGE_STYLES[badge] || BADGE_STYLES.gold;
  const { icon: iconSize, text, padding, gap } = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold shadow
        ${level.container} ${level.glow} ${padding} ${gap}
        select-none whitespace-nowrap
      `}
      title="تصدیق شدہ شاعر"
      role="img"
      aria-label="تصدیق شدہ شاعر"
    >
      <ShieldCheck
        size={iconSize}
        className={`${level.icon} flex-shrink-0`}
        strokeWidth={2.5}
      />
      {showLabel && (
        <span className={`${text} urdu-text leading-none`}>تصدیق شدہ</span>
      )}
    </span>
  );
};

export default VerificationBadge;
