import React, { useEffect, useState } from "react";
import { Check, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { GeometricOrnament, IslamicPattern } from "./CulturalElements";

const CulturalMessagePopup = ({
  message,
  type = "info",
  title,
  isVisible,
  onClose,
  onConfirm,
  onCancel,
  duration = 5000,
  position = "top-center",
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);

      // Don't auto-close confirmation dialogs
      if (duration > 0 && type !== "confirm") {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  if (!isVisible && !isAnimating) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-gradient-to-br from-urdu-cream via-cultural-pearl to-urdu-light",
          border: "border-urdu-gold border-2",
          text: "text-urdu-brown",
          icon: <Check className="w-7 h-7" />,
          ornamentColor: "text-urdu-gold",
          shadowColor: "shadow-cultural",
          buttonBg: "from-urdu-gold to-cultural-amber",
        };
      case "error":
        return {
          bg: "bg-gradient-to-br from-red-50 via-rose-50 to-pink-100",
          border: "border-cultural-burgundy border-2",
          text: "text-cultural-burgundy",
          icon: <AlertCircle className="w-7 h-7" />,
          ornamentColor: "text-cultural-burgundy",
          shadowColor: "shadow-cultural",
          buttonBg: "from-cultural-burgundy to-urdu-maroon",
        };
      case "warning":
        return {
          bg: "bg-gradient-to-br from-urdu-light via-cultural-pearl to-urdu-cream",
          border: "border-cultural-amber border-2",
          text: "text-cultural-brown",
          icon: <AlertTriangle className="w-7 h-7" />,
          ornamentColor: "text-cultural-amber",
          shadowColor: "shadow-cultural",
          buttonBg: "from-cultural-amber to-urdu-gold",
        };
      case "confirm":
        return {
          bg: "bg-gradient-to-br from-urdu-cream via-cultural-pearl to-urdu-light",
          border: "border-urdu-brown border-2",
          text: "text-urdu-brown",
          icon: <AlertCircle className="w-7 h-7" />,
          ornamentColor: "text-urdu-brown",
          shadowColor: "shadow-cultural",
          buttonBg: "from-urdu-brown to-cultural-burgundy",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-urdu-cream via-cultural-pearl to-urdu-light",
          border: "border-urdu-gold border-2",
          text: "text-urdu-brown",
          icon: <Info className="w-7 h-7" />,
          ornamentColor: "text-urdu-gold",
          shadowColor: "shadow-cultural",
          buttonBg: "from-urdu-gold to-cultural-amber",
        };
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case "top-left":
        return "top-6 left-6";
      case "top-right":
        return "top-6 right-6";
      case "bottom-center":
        return "bottom-6 left-1/2 transform -translate-x-1/2";
      case "bottom-left":
        return "bottom-6 left-6";
      case "bottom-right":
        return "bottom-6 right-6";
      case "center":
        return "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2";
      default: // top-center
        return "top-6 left-1/2 transform -translate-x-1/2";
    }
  };

  const styles = getTypeStyles();

  return (
    <>
      {/* Backdrop for center position */}
      {position === "center" && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300 backdrop-blur-sm"></div>
      )}

      {/* Main popup */}
      <div
        className={`fixed ${getPositionStyles()} z-50 transition-all duration-500 ease-out ${
          isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div
          className={`
          relative max-w-md mx-auto min-w-80
          ${styles.bg} ${styles.border} ${styles.text}
          rounded-2xl shadow-2xl ${styles.shadowColor}
          transform transition-all duration-500 ease-out
          ${isAnimating ? "translate-y-0" : "-translate-y-4"}
          backdrop-blur-sm
        `}
        >
          {/* Cultural Background Pattern */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute top-3 right-3 opacity-15">
              <IslamicPattern size={80} className={styles.ornamentColor} />
            </div>
            <div className="absolute bottom-3 left-3 opacity-15">
              <GeometricOrnament
                className={`w-16 h-16 ${styles.ornamentColor}`}
              />
            </div>

            {/* Additional decorative patterns */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5">
              <IslamicPattern size={120} className={styles.ornamentColor} />
            </div>
          </div>

          {/* Enhanced Decorative Corners */}
          <div className="absolute top-0 left-0 w-8 h-8">
            <div
              className={`absolute top-3 left-3 w-4 h-0.5 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} rounded-full`}
            ></div>
            <div
              className={`absolute top-3 left-3 w-0.5 h-4 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} rounded-full`}
            ></div>
          </div>
          <div className="absolute top-0 right-0 w-8 h-8">
            <div
              className={`absolute top-3 right-3 w-4 h-0.5 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} rounded-full`}
            ></div>
            <div
              className={`absolute top-3 right-3 w-0.5 h-4 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} rounded-full`}
            ></div>
          </div>
          <div className="absolute bottom-0 left-0 w-8 h-8">
            <div
              className={`absolute bottom-3 left-3 w-4 h-0.5 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} rounded-full`}
            ></div>
            <div
              className={`absolute bottom-3 left-3 w-0.5 h-4 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} rounded-full`}
            ></div>
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8">
            <div
              className={`absolute bottom-3 right-3 w-4 h-0.5 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} rounded-full`}
            ></div>
            <div
              className={`absolute bottom-3 right-3 w-0.5 h-4 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} rounded-full`}
            ></div>
          </div>

          {/* Close Button - hidden for confirmation dialogs */}
          {type !== "confirm" && (
            <button
              onClick={handleClose}
              className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-300
                hover:bg-urdu-gold/20 ${styles.text} hover:scale-110 hover:rotate-90
                shadow-md hover:shadow-cultural border border-urdu-gold/30`}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Content */}
          <div className="relative p-8 pr-16">
            {/* Header with Icon */}
            <div className="flex items-center gap-5 mb-5">
              <div
                className={`
                flex-shrink-0 p-3 rounded-full 
                bg-gradient-to-r from-urdu-cream to-cultural-pearl ${styles.text}
                shadow-cultural border border-urdu-gold/30
                transform hover:scale-105 transition-transform duration-300
              `}
              >
                {styles.icon}
              </div>

              {/* Cultural Divider */}
              <div className="flex-1 flex items-center">
                <div
                  className={`h-px flex-1 bg-gradient-to-r from-transparent via-current to-transparent ${styles.text} opacity-40`}
                ></div>
                <GeometricOrnament
                  className={`w-4 h-4 mx-3 ${styles.ornamentColor} opacity-70`}
                />
                <div
                  className={`h-px flex-1 bg-gradient-to-l from-transparent via-current to-transparent ${styles.text} opacity-40`}
                ></div>
              </div>
            </div>

            {/* Message Text with Enhanced Urdu Font Support */}
            <div className={`${styles.text} leading-relaxed`}>
              <div className="font-urdu urdu-body text-lg mb-2" dir="auto">
                {title && (
                  <div className="text-xl font-bold mb-2 font-urdu urdu-heading-md">
                    {title}
                  </div>
                )}
                <div className="font-urdu urdu-body leading-relaxed text-base">
                  {message}
                </div>
              </div>

              {/* Confirmation Buttons for confirm type */}
              {type === "confirm" && (
                <div className="flex justify-center gap-4 mt-6 mb-4">
                  <button
                    onClick={onCancel}
                    className="px-6 py-3 bg-gradient-to-r from-cultural-charcoal to-cultural-slate text-white rounded-xl hover:from-cultural-slate hover:to-cultural-charcoal transition-all duration-300 shadow-cultural hover:shadow-lg transform hover:-translate-y-1 font-urdu urdu-body"
                  >
                    منسوخ / Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className={`px-6 py-3 bg-gradient-to-r ${styles.buttonBg} text-white rounded-xl hover:shadow-lg transition-all duration-300 shadow-cultural transform hover:-translate-y-1 font-urdu urdu-body`}
                  >
                    تصدیق / Confirm
                  </button>
                </div>
              )}

              {/* Cultural bottom ornament */}
              <div className="flex justify-center mt-5 pt-2">
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-px w-8 bg-gradient-to-r from-transparent to-current ${styles.text} opacity-30`}
                  ></div>
                  <GeometricOrnament
                    className={`w-8 h-8 ${styles.ornamentColor} opacity-70 transform hover:rotate-180 transition-transform duration-1000`}
                  />
                  <div
                    className={`h-px w-8 bg-gradient-to-l from-transparent to-current ${styles.text} opacity-30`}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced bottom decorative border */}
          <div className="absolute bottom-0 left-8 right-8">
            <div
              className={`h-px bg-gradient-to-r from-transparent via-current to-transparent ${styles.text} opacity-25`}
            ></div>
          </div>

          {/* Cultural border accents */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none">
            <div
              className={`absolute top-0 left-1/4 w-12 h-0.5 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} opacity-50 rounded-full`}
            ></div>
            <div
              className={`absolute bottom-0 right-1/4 w-12 h-0.5 ${styles.border
                .replace("border-", "bg-")
                .replace(" border-2", "")} opacity-50 rounded-full`}
            ></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CulturalMessagePopup;
