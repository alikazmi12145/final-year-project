import React, { useState, useEffect } from "react";
import { Calendar, Sparkles, Star } from "lucide-react";

const PoetHistorySlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Real historical data about famous Urdu poets
  const poetHistoricalFacts = [
    {
      type: "birth",
      poet: "مرزا غالب",
      date: "27 دسمبر 1797",
      fact: "مرزا اسد اللہ خان غالب کی پیدائش آگرہ میں ہوئی",
      icon: "🎂",
    },
    {
      type: "death",
      poet: "مرزا غالب",
      date: "15 فروری 1869",
      fact: "غالب کا انتقال دہلی میں ہوا، عمر 71 سال",
      icon: "📖",
    },
    {
      type: "birth",
      poet: "علامہ اقبال",
      date: "9 نومبر 1877",
      fact: "علامہ محمد اقبال کی پیدائش سیالکوٹ میں ہوئی",
      icon: "🎂",
    },
    {
      type: "death",
      poet: "علامہ اقبال",
      date: "21 اپریل 1938",
      fact: "شاعر مشرق کا انتقال لاہور میں ہوا، عمر 60 سال",
      icon: "📖",
    },
    {
      type: "birth",
      poet: "فیض احمد فیض",
      date: "13 فروری 1911",
      fact: "فیض احمد فیض کی پیدائش سیالکوٹ میں ہوئی",
      icon: "🎂",
    },
    {
      type: "death",
      poet: "فیض احمد فیض",
      date: "20 نومبر 1984",
      fact: "انقلابی شاعر فیض کا انتقال لاہور میں ہوا",
      icon: "📖",
    },
    {
      type: "birth",
      poet: "میر تقی میر",
      date: "1723",
      fact: "میر تقی میر کی پیدائش آگرہ میں ہوئی",
      icon: "🎂",
    },
    {
      type: "death",
      poet: "میر تقی میر",
      date: "20 ستمبر 1810",
      fact: "خدائے سخن میر کا انتقال لکھنؤ میں ہوا",
      icon: "📖",
    },
    {
      type: "birth",
      poet: "احمد فراز",
      date: "12 جنوری 1931",
      fact: "احمد فراز کی پیدائش کوہاٹ میں ہوئی",
      icon: "🎂",
    },
    {
      type: "death",
      poet: "احمد فراز",
      date: "25 اگست 2008",
      fact: "احمد فراز کا انتقال اسلام آباد میں ہوا",
      icon: "📖",
    },
    {
      type: "birth",
      poet: "ساحر لدھیانوی",
      date: "8 مارچ 1921",
      fact: "ساحر لدھیانوی کی پیدائش لدھیانہ میں ہوئی",
      icon: "🎂",
    },
    {
      type: "death",
      poet: "ساحر لدھیانوی",
      date: "25 اکتوبر 1980",
      fact: "ساحر لدھیانوی کا انتقال ممبئی میں ہوا",
      icon: "📖",
    },
    {
      type: "anniversary",
      poet: "جون ایلیا",
      date: "14 دسمبر 1931",
      fact: "جون ایلیا کی پیدائش امروہہ میں ہوئی",
      icon: "✨",
    },
    {
      type: "death",
      poet: "جون ایلیا",
      date: "8 نومبر 2002",
      fact: "جون ایلیا کا انتقال کراچی میں ہوا",
      icon: "📖",
    },
    {
      type: "birth",
      poet: "پروین شاکر",
      date: "24 نومبر 1952",
      fact: "پروین شاکر کی پیدائش کراچی میں ہوئی",
      icon: "🎂",
    },
    {
      type: "death",
      poet: "پروین شاکر",
      date: "26 دسمبر 1994",
      fact: "پروین شاکر کا المناک حادثے میں انتقال ہوا",
      icon: "📖",
    },
  ];

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % poetHistoricalFacts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [poetHistoricalFacts.length]);

  const currentFact = poetHistoricalFacts[currentIndex];

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="relative overflow-hidden">
        {/* Premium glassmorphism container with better contrast */}
        <div className="relative bg-gradient-to-r from-amber-900/80 via-orange-800/80 to-amber-900/80 backdrop-blur-xl border-2 border-amber-400/30 rounded-2xl px-6 py-3 shadow-2xl">
          {/* Animated sliding content */}
          <div className="flex items-center justify-between gap-4">
            {/* Left icon with animation */}
            <div className="flex-shrink-0 text-2xl animate-bounce">
              {currentFact.icon}
            </div>

            {/* Center content */}
            <div className="flex-1 text-center animate-fade-in">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-amber-200 text-xs font-semibold tracking-wide">
                  {currentFact.date}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </div>

              <h3
                className="nastaleeq-heading text-lg font-bold text-white drop-shadow-lg mb-0.5"
                dir="rtl"
              >
                {currentFact.poet}
              </h3>

              <p
                className="nastaleeq-primary text-amber-100 text-sm drop-shadow-md"
                dir="rtl"
              >
                {currentFact.fact}
              </p>
            </div>

            {/* Right decorative element */}
            <div className="flex-shrink-0">
              <Star className="w-5 h-5 text-amber-300 animate-spin-slow" />
            </div>
          </div>

          {/* Minimalist progress dots */}
          <div className="flex justify-center gap-1 mt-2">
            {poetHistoricalFacts.slice(0, 8).map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex % 8
                    ? "w-6 bg-amber-300"
                    : "w-1 bg-white/30"
                }`}
              />
            ))}
          </div>

          {/* Inner glow border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 pointer-events-none"></div>
        </div>

        {/* Outer glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-amber-600/30 rounded-2xl blur-xl -z-10"></div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PoetHistorySlider;
