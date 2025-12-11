import React, { useState, useEffect } from "react";
import { Sparkles, User } from "lucide-react";
import axios from "axios";

// Create a dedicated axios instance with explicit empty baseURL to override any global defaults
const homepageAxios = axios.create({
  baseURL: '', // Explicitly empty to prevent inheritance of global defaults
});

const PoetOfTheDay = () => {
  const [dailyContent, setDailyContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDailyContent();
  }, []);

  const fetchDailyContent = async () => {
    try {
      // Use absolute URL to bypass any axios defaults
      const response = await homepageAxios.get('http://localhost:5000/api/homepage/daily-content');

      if (response.data.success) {
        setDailyContent(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching daily content:", err);
      setError("Failed to load daily content");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl animate-pulse">
            <div className="h-8 bg-amber-200 rounded w-1/3 mx-auto mb-8"></div>
            <div className="h-64 bg-amber-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dailyContent) {
    return null;
  }

  return (
    <div className="relative z-10 py-16 px-4 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B45309' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 fade-in-up">
          <div className="flex justify-center items-center mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400"></div>
            <Sparkles className="mx-4 w-8 h-8 text-amber-500 animate-pulse" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400"></div>
          </div>
          <h2
            className="nastaleeq-heading cultural-title text-3xl md:text-4xl font-bold text-amber-900 mb-3"
            dir="rtl"
          >
            آج کا شاعر اور شعر
          </h2>
          <p
            className="nastaleeq-primary text-amber-700 text-lg"
            dir="rtl"
          >
            ہر دن ایک نیا شاعر اور ایک خوبصورت شعر
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border-4 border-amber-200 hover:border-amber-300 transition-all duration-500 fade-in-scale">
          <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
            {/* Poet Section */}
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative group">
                {/* Animated badge */}
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>

                {/* Poet Image */}
                <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-8 border-amber-200 shadow-2xl group-hover:border-amber-400 transition-all duration-300 group-hover:scale-105">
                  {dailyContent.poet.profileImage?.url ? (
                    <img
                      src={dailyContent.poet.profileImage.url.startsWith('http') 
                        ? dailyContent.poet.profileImage.url 
                        : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${dailyContent.poet.profileImage.url}`}
                      alt={dailyContent.poet.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          dailyContent.poet.name
                        )}&background=f59e0b&color=ffffff&size=400&font-size=0.4`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <User className="w-24 h-24 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Poet Info */}
              <div className="space-y-3">
                <h3
                  className="nastaleeq-heading text-3xl font-bold text-amber-900"
                  dir="rtl"
                >
                  {dailyContent.poet.name}
                </h3>
                {dailyContent.poet.penName && (
                  <p
                    className="nastaleeq-primary text-xl text-amber-700"
                    dir="rtl"
                  >
                    ({dailyContent.poet.penName})
                  </p>
                )}
                {dailyContent.poet.era && (
                  <div className="inline-block px-6 py-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full border-2 border-amber-300">
                    <span className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                      {dailyContent.poet.era}
                    </span>
                  </div>
                )}
                {dailyContent.poet.shortBio && (
                  <p
                    className="nastaleeq-primary text-slate-600 leading-relaxed max-w-md mx-auto"
                    dir="rtl"
                  >
                    {dailyContent.poet.shortBio}
                  </p>
                )}
              </div>
            </div>

            {/* Verse Section */}
            <div className="flex flex-col justify-center">
              <div className="relative">
                {/* Decorative quote marks */}
                <div className="absolute -top-4 -right-4 text-6xl text-amber-300 opacity-50 font-serif">
                  ❝
                </div>

                <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-8 border-l-8 border-amber-500 shadow-xl">
                  <div className="space-y-6">
                    {dailyContent.verse.title && (
                      <h4
                        className="nastaleeq-heading text-2xl font-bold text-amber-900 mb-4 border-b-2 border-amber-200 pb-3"
                        dir="rtl"
                      >
                        {dailyContent.verse.title}
                      </h4>
                    )}

                    <div
                      className="nastaleeq-primary text-2xl md:text-3xl text-slate-800 leading-loose whitespace-pre-line"
                      dir="rtl"
                      style={{
                        fontWeight: "500",
                        lineHeight: "2.5",
                        textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      {dailyContent.verse.content}
                    </div>

                    {dailyContent.verse.category && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t-2 border-amber-200">
                        <span className="px-4 py-1.5 bg-white rounded-full text-sm font-medium text-amber-700 border-2 border-amber-300">
                          {dailyContent.verse.category}
                        </span>
                        {dailyContent.verse.mood && (
                          <span className="px-4 py-1.5 bg-white rounded-full text-sm font-medium text-orange-700 border-2 border-orange-300">
                            {dailyContent.verse.mood}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 text-6xl text-amber-300 opacity-50 font-serif rotate-180">
                  ❝
                </div>
              </div>
            </div>
          </div>

          {/* Footer with soft gradient */}
          <div className="bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 py-4 text-center">
            <p
              className="nastaleeq-primary text-amber-800 text-sm"
              dir="rtl"
            >
              روزانہ تازہ مواد • ہر دن کچھ نیا
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoetOfTheDay;
