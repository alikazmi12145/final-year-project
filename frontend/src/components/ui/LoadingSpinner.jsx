import React from "react";

export const LoadingSpinner = ({
  size = "medium",
  className = "",
  variant = "default",
}) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
    xl: "w-16 w-16",
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const variants = {
    default: "border-urdu-gold border-t-transparent",
    cultural: "border-urdu-brown border-t-urdu-gold",
    modern: "border-blue-200 border-t-blue-600",
    gradient:
      "border-transparent bg-gradient-to-r from-urdu-brown via-urdu-gold to-urdu-brown",
  };

  if (variant === "dots") {
    return (
      <div
        className={`flex items-center justify-center space-x-2 ${className}`}
      >
        <div
          className={`${sizeClasses[size]} bg-urdu-brown rounded-full animate-bounce`}
          style={{ animationDelay: "0ms" }}
        ></div>
        <div
          className={`${sizeClasses[size]} bg-urdu-gold rounded-full animate-bounce`}
          style={{ animationDelay: "150ms" }}
        ></div>
        <div
          className={`${sizeClasses[size]} bg-urdu-maroon rounded-full animate-bounce`}
          style={{ animationDelay: "300ms" }}
        ></div>
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className={`${sizeClasses[size]} bg-gradient-to-r from-urdu-brown to-urdu-gold rounded-full animate-pulse shadow-lg`}
        ></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 ${variants[variant]} rounded-full animate-spin shadow-lg`}
      >
        {variant === "gradient" && (
          <div className="absolute inset-1 bg-white rounded-full"></div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
