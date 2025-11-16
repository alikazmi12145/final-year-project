/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Enhanced cultural color palette for Urdu poetry platform
        primary: {
          50: "#fef7f0",
          100: "#fce7d6",
          200: "#f8cba6",
          300: "#f4a573",
          400: "#ee7a47",
          500: "#d97706", // Main golden amber
          600: "#c2620d",
          700: "#a04e0e",
          800: "#823f11",
          900: "#6b3412",
        },
        urdu: {
          gold: "#d4af37",
          brown: "#8b4513",
          cream: "#f5f5dc",
          maroon: "#722f37",
          light: "#fdf6e3",
          dark: "#2d1b0e",
          sage: "#9caf88",
          burgundy: "#722f37",
        },
        cultural: {
          gold: "#d4af37",
          brown: "#8b4513",
          burgundy: "#722f37",
          cream: "#f5f5dc",
          sage: "#9caf88",
          amber: "#f59e0b",
          emerald: "#059669",
          pearl: "#f8fafc",
          dark: "#2d2d2d",
          charcoal: "#374151",
          slate: "#64748b",
          yellow: "#fbbf24",
          honey: "#f59e0b",
          saffron: "#f97316",
        },
      },
      fontFamily: {
        // Set Urdu fonts as default for the entire application
        sans: [
          "Noto Nastaliq Urdu",
          "LocalNastaleeq",
          "Jameel Noori Nastaleeq",
          "Noto Sans Arabic",
          "Tajawal",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        // Enhanced font families for Urdu and cultural content
        urdu: [
          "Noto Nastaliq Urdu",
          "LocalNastaleeq",
          "Jameel Noori Nastaleeq",
          "Arabic Typesetting",
          "serif",
        ],
        nastaliq: ["Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "LocalNastaleeq", "serif"],
        naskh: ["Amiri", "Scheherazade New", "serif"],
        cultural: ["Crimson Text", "Playfair Display", "serif"],
        elegant: ["Cormorant Garamond", "EB Garamond", "serif"],
        inter: ["Inter", "sans-serif"],
        modern: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "urdu-sm": ["0.875rem", { lineHeight: "1.8" }],
        "urdu-base": ["1rem", { lineHeight: "1.9" }],
        "urdu-lg": ["1.125rem", { lineHeight: "2" }],
        "urdu-xl": ["1.25rem", { lineHeight: "2.1" }],
        "urdu-2xl": ["1.5rem", { lineHeight: "2.2" }],
        "urdu-3xl": ["1.875rem", { lineHeight: "2.3" }],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },
      backgroundImage: {
        "cultural-pattern":
          'url(\'data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%238b4513" fill-opacity="0.1" fill-rule="evenodd"/%3E%3C/svg%3E\')',
        "paper-texture": "url('/images/paper-texture.svg')",
        "calligraphy-bg": "url('/images/calligraphy-bg.svg')",
      },
      boxShadow: {
        cultural:
          "0 10px 25px -3px rgba(217, 119, 6, 0.1), 0 4px 6px -2px rgba(217, 119, 6, 0.05)",
        poetry:
          "0 20px 25px -5px rgba(30, 41, 59, 0.1), 0 10px 10px -5px rgba(30, 41, 59, 0.04)",
        elegant: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(217, 119, 6, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(217, 119, 6, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
