import React, { useState, useEffect } from "react";
import { Heart, TrendingUp, BookOpen, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const PersonalizedRecommendations = () => {
  const { user, isAuthenticated } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRecommendations();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchRecommendations = async () => {
    try {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${baseUrl}/api/homepage/recommendations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setRecommendations(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  // Don't render if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-amber-200 rounded w-1/3 mx-auto"></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-amber-100 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="relative z-10 py-16 px-4 bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 fade-in-up">
          <div className="flex justify-center items-center mb-4">
            <TrendingUp className="w-8 h-8 text-amber-500" />
          </div>
          <h2
            className="nastaleeq-heading cultural-title text-3xl md:text-4xl font-bold text-amber-900 mb-3"
            dir="rtl"
          >
            آپ کے لیے تجویز کردہ
          </h2>
          <p
            className="nastaleeq-primary text-slate-600 text-lg max-w-2xl mx-auto"
            dir="rtl"
          >
            آپ کی پسند کی بنیاد پر منتخب کردہ شاعری
          </p>
        </div>

        {/* Recommendations Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {recommendations.slice(0, 6).map((poem, index) => (
            <Link
              key={poem._id}
              to={`/poems/${poem._id}`}
              className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-amber-300 fade-in-scale"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-6">
                {/* Category Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full text-xs font-semibold text-amber-800 border border-amber-300">
                    {poem.category}
                  </span>
                  {poem.mood && (
                    <span className="text-xs text-slate-500 font-medium">
                      {poem.mood}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  className="nastaleeq-heading text-xl font-bold text-slate-800 mb-3 line-clamp-2 group-hover:text-amber-900 transition-colors"
                  dir="rtl"
                >
                  {poem.title}
                </h3>

                {/* Excerpt */}
                <div
                  className="nastaleeq-primary text-slate-600 text-base leading-relaxed mb-4 line-clamp-3"
                  dir="rtl"
                  style={{ minHeight: "4.5rem" }}
                >
                  {poem.content.split("\n")[0]}
                </div>

                {/* Poet Info */}
                {poem.poet && (
                  <div className="flex items-center mb-4 pb-4 border-b border-slate-200">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                      {poem.poet.profileImage?.url ? (
                        <img
                          src={poem.poet.profileImage.url}
                          alt={poem.poet.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              poem.poet.name
                            )}&background=f59e0b&color=ffffff&size=100`;
                          }}
                        />
                      ) : (
                        poem.poet.name?.charAt(0) || "؟"
                      )}
                    </div>
                    <div className="mr-3">
                      <p
                        className="nastaleeq-primary text-sm font-semibold text-amber-900"
                        dir="rtl"
                      >
                        {poem.poet.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <span className="flex items-center">
                      <Heart className="w-4 h-4 ml-1 text-red-400" />
                      {poem.likes?.length || 0}
                    </span>
                    <span className="flex items-center">
                      <BookOpen className="w-4 h-4 ml-1 text-blue-400" />
                      {poem.views || 0}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Hover Effect Gradient */}
              <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Link>
          ))}
        </div>

        {/* View More Button */}
        {recommendations.length > 6 && (
          <div className="text-center mt-12 fade-in-up">
            <Link
              to="/search"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <span className="nastaleeq-primary font-bold">
                مزید دیکھیں
              </span>
              <ChevronRight className="mr-2 h-5 w-5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizedRecommendations;
