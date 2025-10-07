import React from "react";

export const Card = ({
  children,
  className = "",
  hover = true,
  variant = "default",
  ...props
}) => {
  const variants = {
    default: "cultural-card hover:border-urdu-gold/40",
    gradient:
      "bg-gradient-to-br from-white via-urdu-cream/30 to-urdu-gold/15 border-2 border-urdu-gold/30 shadow-xl hover:shadow-2xl islamic-pattern",
    cultural:
      "enhanced-card bg-gradient-to-br from-urdu-cream/80 to-urdu-gold/25 border-2 border-urdu-brown/30 shadow-lg ornamental-border",
    modern:
      "cultural-card bg-white/95 backdrop-blur-sm border border-urdu-gold/20",
    dark: "bg-gradient-to-br from-urdu-brown/90 to-urdu-maroon/80 border-2 border-urdu-gold/40 shadow-xl hover:shadow-2xl text-white islamic-pattern",
    poetry:
      "poetry-verse bg-gradient-to-r from-urdu-cream/30 via-white/90 to-urdu-gold/20 border-r-4 border-urdu-gold",
  };

  return (
    <div
      className={`rounded-xl transition-all duration-500 transform ${
        hover ? "hover:-translate-y-2 hover:scale-[1.02]" : ""
      } ${variants[variant]} ${className}`}
      {...props}
    >
      <div className="p-6 relative overflow-hidden">
        {/* Enhanced decorative corner elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-urdu-gold/15 via-urdu-cream/10 to-transparent rounded-bl-full"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-urdu-maroon/10 to-transparent rounded-tr-full"></div>

        {/* Cultural pattern overlay */}
        <div className="absolute inset-0 opacity-5 islamic-pattern rounded-xl"></div>

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
};
