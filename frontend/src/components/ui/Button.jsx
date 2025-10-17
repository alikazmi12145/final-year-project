import React from "react";

export const Button = ({
  children,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  className = "",
  icon,
  ...props
}) => {
  const baseClasses =
    "font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl relative overflow-hidden cultural-button";

  const variants = {
    primary:
      "bg-gradient-to-r from-urdu-brown via-urdu-maroon to-urdu-brown bg-size-200 bg-pos-0 hover:bg-pos-100 text-white focus:ring-urdu-brown/50 shadow-urdu-brown/25 border-2 border-urdu-gold/30 nastaleeq-primary",
    secondary:
      "border-2 border-urdu-brown text-urdu-brown hover:bg-gradient-to-r hover:from-urdu-brown hover:to-urdu-maroon hover:text-white focus:ring-urdu-brown/50 bg-gradient-to-r from-white/90 to-urdu-cream/50 backdrop-blur-sm nastaleeq-primary",
    outline:
      "border-2 border-urdu-brown text-urdu-brown hover:bg-gradient-to-r hover:from-urdu-brown hover:to-urdu-maroon hover:text-white focus:ring-urdu-brown/50 bg-transparent nastaleeq-primary",
    default:
      "bg-gradient-to-r from-urdu-brown via-urdu-maroon to-urdu-brown bg-size-200 bg-pos-0 hover:bg-pos-100 text-white focus:ring-urdu-brown/50 shadow-urdu-brown/25 border-2 border-urdu-gold/30 nastaleeq-primary",
    cultural:
      "bg-gradient-to-r from-urdu-gold via-yellow-500 to-urdu-gold text-urdu-brown hover:from-yellow-500 hover:to-urdu-gold focus:ring-urdu-gold/50 shadow-urdu-gold/25 border-2 border-urdu-maroon/30 font-bold nastaleeq-primary urdu-text-shadow",
    success:
      "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 focus:ring-green-500/50 shadow-green-500/25 border-2 border-green-400/30",
    danger:
      "bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 focus:ring-red-500/50 shadow-red-500/25 border-2 border-red-400/30",
    ghost:
      "text-urdu-brown hover:bg-gradient-to-r hover:from-urdu-cream hover:to-urdu-gold/20 focus:ring-urdu-brown/50 bg-transparent border-2 border-urdu-brown/30 hover:border-urdu-gold nastaleeq-primary",
    modern:
      "bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white hover:from-blue-600 hover:to-purple-600 focus:ring-blue-500/50 shadow-blue-500/25 border-2 border-blue-400/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    small: "px-4 py-2 text-sm",
    medium: "px-6 py-3 text-base",
    large: "px-8 py-4 text-lg",
    xl: "px-10 py-5 text-xl",
  };

  const classes = `${baseClasses} ${variants[variant]} ${
    sizes[size]
  } ${className} ${
    disabled || loading
      ? "opacity-50 cursor-not-allowed transform-none hover:scale-100"
      : ""
  }`;

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {/* Enhanced shimmer effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>

      {/* Cultural pattern overlay */}
      <div className="absolute inset-0 opacity-10 islamic-pattern"></div>

      <div className="relative flex items-center justify-center gap-2 z-10">
        {loading ? (
          <>
            <svg
              className="animate-spin w-4 h-4 text-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>لوڈ ہو رہا ہے...</span>
          </>
        ) : (
          <>
            {icon && <span className="mr-1">{icon}</span>}
            {children}
          </>
        )}
      </div>
    </button>
  );
};
