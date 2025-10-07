import React from "react";

export const Input = ({ label, error, helperText, className = "", icon, variant = "default", ...props }) => {
  const variants = {
    default: "border-gray-300 focus:border-urdu-brown focus:ring-urdu-brown/20",
    cultural: "border-urdu-cream focus:border-urdu-gold focus:ring-urdu-gold/20 bg-gradient-to-r from-white to-urdu-cream/10",
    modern: "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/90 backdrop-blur-sm",
    minimal: "border-0 border-b-2 border-gray-300 focus:border-urdu-brown focus:ring-0 rounded-none bg-transparent px-0"
  };

  return (
    <div className="w-full mb-6">
      {label && (
        <label className="block text-sm font-semibold text-urdu-brown mb-3 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <span className="text-gray-400 group-focus-within:text-urdu-brown transition-colors duration-200">{icon}</span>
          </div>
        )}
        <input
          className={`w-full ${icon ? 'pl-12' : 'pl-4'} pr-4 py-4 border-2 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:shadow-lg hover:shadow-md group ${variants[variant]} ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
          } ${className}`}
          {...props}
        />
        {/* Animated border gradient */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-urdu-brown via-urdu-gold to-urdu-brown opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
      </div>
      {(error || helperText) && (
        <div className="mt-3 flex items-start gap-2">
          {error && (
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <p className={`text-sm ${
            error ? "text-red-600" : "text-urdu-maroon"
          }`}>
            {error || helperText}
          </p>
        </div>
      )}
    </div>
  );
};
