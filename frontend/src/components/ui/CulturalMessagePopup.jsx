import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles,
} from "lucide-react";

/**
 * Clean, professional Urdu popup card.
 * - Toast variants (success / error / warning / info) appear at the chosen
 *   corner / edge with a coloured accent strip and a clean white card.
 * - Confirm variant renders as a centred parchment-style modal in the
 *   classical Urdu manuscript aesthetic with subtle corner ornaments.
 *
 * Message and title may contain a `" / "` separator to render bilingual
 * content — the Urdu half is rendered prominently and the English half is
 * shown beneath as a softer secondary line. Newlines are preserved.
 */

const TYPE_THEME = {
  success: {
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    title: "text-emerald-900",
    Icon: CheckCircle2,
    defaultTitle: "کامیاب",
  },
  error: {
    accent: "bg-rose-500",
    iconBg: "bg-rose-50 text-rose-600 ring-rose-100",
    title: "text-rose-900",
    Icon: AlertCircle,
    defaultTitle: "خرابی",
  },
  warning: {
    accent: "bg-amber-500",
    iconBg: "bg-amber-50 text-amber-700 ring-amber-100",
    title: "text-amber-900",
    Icon: AlertTriangle,
    defaultTitle: "خبردار",
  },
  info: {
    accent: "bg-sky-500",
    iconBg: "bg-sky-50 text-sky-600 ring-sky-100",
    title: "text-sky-900",
    Icon: Info,
    defaultTitle: "اطلاع",
  },
  confirm: {
    accent: "bg-amber-700",
    iconBg: "bg-amber-100 text-amber-800 ring-amber-200",
    title: "text-amber-900",
    Icon: AlertCircle,
    defaultTitle: "تصدیق",
  },
};

const POSITION_CLASSES = {
  "top-center": "top-6 left-1/2 -translate-x-1/2",
  "top-left": "top-6 left-6",
  "top-right": "top-6 right-6",
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
  "bottom-left": "bottom-6 left-6",
  "bottom-right": "bottom-6 right-6",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

// Split " / " bilingual text into { urdu, english }.
const splitBilingual = (text) => {
  if (!text) return { urdu: "", english: "" };
  const str = String(text);
  const idx = str.indexOf(" / ");
  if (idx === -1) return { urdu: str, english: "" };
  return { urdu: str.slice(0, idx).trim(), english: str.slice(idx + 3).trim() };
};

// Render a bilingual block: Urdu prominent, English subtle.
const BilingualText = ({ text, urduClass = "", englishClass = "" }) => {
  const { urdu, english } = splitBilingual(text);
  const renderLines = (val) =>
    val
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line, i) => <div key={i}>{line}</div>);
  return (
    <div>
      {urdu && (
        <div className={`urdu-text-local ${urduClass}`} dir="rtl">
          {renderLines(urdu)}
        </div>
      )}
      {english && (
        <div className={`${englishClass}`} dir="ltr">
          {renderLines(english)}
        </div>
      )}
    </div>
  );
};

const CulturalMessagePopup = ({
  message,
  type = "info",
  title,
  isVisible,
  onClose,
  onConfirm,
  onCancel,
  duration = 4000,
  position = "top-center",
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    // Allow CSS transition to play on mount.
    const t = requestAnimationFrame(() => setMounted(true));
    if (duration > 0 && type !== "confirm") {
      const timer = setTimeout(() => handleClose(), duration);
      return () => {
        cancelAnimationFrame(t);
        clearTimeout(timer);
      };
    }
    return () => cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, duration, type]);

  const handleClose = () => {
    setMounted(false);
    setTimeout(() => onClose?.(), 200);
  };

  if (!isVisible && !mounted) return null;

  const theme = TYPE_THEME[type] || TYPE_THEME.info;
  const { Icon } = theme;
  const isConfirm = type === "confirm";
  const isCentered = isConfirm || position === "center";

  // ----- Confirm variant: parchment classical modal -----
  if (isConfirm) {
    return (
      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity duration-200 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={onCancel}
      >
        <div
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md bg-gradient-to-b from-[#fdf6e3] via-[#fbf1d5] to-[#f7e8c0] rounded-2xl shadow-2xl transition-all duration-200 ${
            mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {/* Classical double border + corner ornaments */}
          <div className="pointer-events-none absolute inset-3 border-2 border-amber-700/30 rounded-xl"></div>
          <div className="pointer-events-none absolute inset-4 border border-amber-600/20 rounded-lg"></div>
          <span className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-amber-700/60 rounded-tr-md"></span>
          <span className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-amber-700/60 rounded-tl-md"></span>
          <span className="pointer-events-none absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-amber-700/60 rounded-br-md"></span>
          <span className="pointer-events-none absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-amber-700/60 rounded-bl-md"></span>

          <div className="relative px-8 pt-9 pb-7">
            <div className="flex flex-col items-center mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-md ring-4 ring-amber-200/60">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-2 mt-3 text-amber-700/80">
                <span className="h-px w-10 bg-amber-700/40"></span>
                <Sparkles className="w-3.5 h-3.5" />
                <span className="h-px w-10 bg-amber-700/40"></span>
              </div>
            </div>

            <div className="text-center mb-4">
              <BilingualText
                text={title || theme.defaultTitle}
                urduClass="text-2xl font-bold text-amber-900 tracking-wide"
                englishClass="text-xs text-amber-700/70 mt-1 tracking-wide uppercase"
              />
            </div>

            <div className="bg-white/70 border border-amber-700/15 rounded-xl px-5 py-4 mb-6 shadow-sm">
              <BilingualText
                text={message}
                urduClass="text-amber-900 leading-loose text-base text-center"
                englishClass="text-amber-800/80 text-sm text-center mt-1.5 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onCancel}
                className="urdu-text-local inline-flex items-center justify-center min-w-[110px] px-5 py-2.5 bg-white border border-amber-700/30 text-amber-900 rounded-lg hover:bg-amber-50 transition-colors shadow-sm font-semibold text-sm"
              >
                منسوخ
              </button>
              <button
                onClick={onConfirm}
                className="urdu-text-local inline-flex items-center justify-center min-w-[110px] px-5 py-2.5 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-lg hover:from-amber-800 hover:to-amber-900 transition-colors shadow-md font-semibold text-sm"
              >
                تصدیق
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- Toast variants -----
  const positionClass = POSITION_CLASSES[position] || POSITION_CLASSES["top-center"];
  // Slide direction based on position.
  const slideClass = (() => {
    if (position.startsWith("top")) return mounted ? "translate-y-0" : "-translate-y-3";
    if (position.startsWith("bottom")) return mounted ? "translate-y-0" : "translate-y-3";
    return mounted ? "scale-100" : "scale-95";
  })();

  return (
    <>
      {isCentered && (
        <div
          className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleClose}
        ></div>
      )}
      <div
        className={`fixed ${positionClass} z-[65] transition-all duration-200 ${
          mounted ? "opacity-100" : "opacity-0"
        } ${slideClass}`}
      >
        <div
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          className="relative flex items-stretch w-[min(92vw,28rem)] bg-white rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden"
        >
          {/* Accent strip (right side in RTL = leading edge) */}
          <div className={`w-1.5 ${theme.accent} shrink-0`} aria-hidden="true"></div>

          <div className="flex items-start gap-3 px-4 py-3.5 flex-1 min-w-0">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ring-4 shrink-0 ${theme.iconBg}`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 pt-0.5 pl-1">
              <BilingualText
                text={title || theme.defaultTitle}
                urduClass={`text-base font-bold leading-snug ${theme.title}`}
                englishClass="text-[11px] uppercase tracking-wide text-gray-500 mt-0.5"
              />
              {message && (
                <div className="mt-1.5">
                  <BilingualText
                    text={message}
                    urduClass="text-sm text-gray-800 leading-relaxed"
                    englishClass="text-xs text-gray-500 mt-1 leading-relaxed"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleClose}
              className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="بند کریں"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CulturalMessagePopup;
