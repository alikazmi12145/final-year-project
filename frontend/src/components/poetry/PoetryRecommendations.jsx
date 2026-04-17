import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

/**
 * AI-Powered Poetry Recommendations Component
 * Shows personalized, trending, and discovery recommendations
 */

const PoetryRecommendations = () => {
  const { user, isAuthenticated } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState("personalized");

  const recommendationTypes = [
    {
      key: "personalized",
      label: "آپ کے لیے",
      description: "آپ کی پسند کے مطابق",
      icon: "🎯",
    },
    {
      key: "trending",
      label: "مقبول شاعری",
      description: "اس وقت مقبول",
      icon: "🔥",
    },
    {
      key: "discovery",
      label: "نئی تلاش",
      description: "نئی شاعری دریافت کریں",
      icon: "🌟",
    },
  ];

  // Fetch recommendations based on type
  const fetchRecommendations = async (type = "personalized") => {
    try {
      setLoading(true);
      setError(null);

      const headers = {};
      if (isAuthenticated) {
        headers["Authorization"] = `Bearer ${localStorage.getItem("token")}`;
      }

      let url = "/api/poetry/recommendations";
      if (type === "personalized" && isAuthenticated) {
        url = "/api/poetry/recommendations/personalized";
      } else if (type === "trending") {
        url = "/api/poetry/trending";
      } else {
        url = `/api/poetry/recommendations?type=${type}&limit=12`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
      } else {
        setError(data.message || "تجاویز حاصل کرنے میں خرابی");
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("تجاویز حاصل کرنے میں خرابی ہوئی");
    } finally {
      setLoading(false);
    }
  };

  // Handle type change
  const handleTypeChange = (type) => {
    setActiveType(type);
    fetchRecommendations(type);
  };

  // Handle poem interactions
  const handleLike = async (poemId) => {
    if (!isAuthenticated) {
      alert("پسند کرنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${poemId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        // Update the poem in recommendations
        setRecommendations((prev) =>
          prev.map((poem) =>
            poem._id === poemId
              ? { ...poem, likesCount: data.likesCount }
              : poem
          )
        );
      }
    } catch (error) {
      console.error("Error liking poem:", error);
    }
  };

  const handleAddToFavorites = async (poemId) => {
    if (!isAuthenticated) {
      alert("پسندیدہ میں شامل کرنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${poemId}/favorites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error("Error adding to favorites:", error);
    }
  };

  // Load recommendations when component mounts
  useEffect(() => {
    // If not authenticated, show trending by default
    const initialType = isAuthenticated ? "personalized" : "trending";
    setActiveType(initialType);
    fetchRecommendations(initialType);
  }, [isAuthenticated]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-4xl font-bold text-gray-800 mb-4"
          style={{ fontFamily: "Jameel Noori Nastaleeq" }}
        >
          آپ کے لیے تجاویز
        </h1>
        <p className="text-gray-600 text-lg">
          AI کی مدد سے منتخب کردہ بہترین شاعری
        </p>
      </div>

      {/* Recommendation Type Selector */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendationTypes.map((type) => (
              <button
                key={type.key}
                onClick={() => handleTypeChange(type.key)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                  activeType === type.key
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                } ${
                  !isAuthenticated && type.key === "personalized"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={!isAuthenticated && type.key === "personalized"}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div
                  className="font-semibold mb-1"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                >
                  {type.label}
                </div>
                <div className="text-sm text-gray-600">{type.description}</div>
                {!isAuthenticated && type.key === "personalized" && (
                  <div className="text-xs text-red-600 mt-1">لاگ ان کریں</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Current Selection Info */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {recommendationTypes.find((t) => t.key === activeType)?.icon}
            </span>
            <div>
              <h2
                className="text-xl font-semibold text-gray-800"
                style={{ fontFamily: "Jameel Noori Nastaleeq" }}
              >
                {recommendationTypes.find((t) => t.key === activeType)?.label}
              </h2>
              <p className="text-gray-600 text-sm">
                {
                  recommendationTypes.find((t) => t.key === activeType)
                    ?.description
                }
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => fetchRecommendations(activeType)}
            disabled={loading}
          >
            🔄 تازہ کریں
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Recommendations Grid */}
      {!loading && !error && (
        <>
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {recommendations.map((poem) => (
                <RecommendationCard
                  key={poem._id}
                  poem={poem}
                  onLike={handleLike}
                  onAddToFavorites={handleAddToFavorites}
                  isAuthenticated={isAuthenticated}
                  recommendationType={activeType}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p
                className="text-gray-500 text-lg mb-4"
                style={{ fontFamily: "Jameel Noori Nastaleeq" }}
              >
                {activeType === "personalized"
                  ? "آپ کے لیے کوئی تجویز نہیں ملی"
                  : "اس وقت کوئی تجویز دستیاب نہیں"}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {activeType === "personalized"
                  ? "کچھ شاعری پڑھیں اور پسند کریں تاکہ ہم آپ کے لیے بہتر تجاویز پیش کر سکیں"
                  : "کچھ دیر بعد دوبارہ کوشش کریں"}
              </p>
              <Button
                onClick={() => (window.location.href = "/poetry-collection")}
                variant="primary"
              >
                شاعری تلاش کریں
              </Button>
            </div>
          )}
        </>
      )}

      {/* Additional Recommendations Section */}
      {!loading && !error && recommendations.length > 0 && (
        <Card className="mt-8">
          <div className="p-6">
            <h3
              className="text-lg font-semibold mb-4 text-gray-800"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              مزید تجاویز
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/poetry?featured=true")}
                className="justify-center"
              >
                ⭐ نمایاں شاعری
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/poetry?sortBy=views")}
                className="justify-center"
              >
                👁️ سب سے زیادہ دیکھی گئی
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href = "/poetry?sortBy=averageRating")
                }
                className="justify-center"
              >
                ⭐ بہترین ریٹنگ
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

/**
 * Individual Recommendation Card Component
 */
const RecommendationCard = ({
  poem,
  onLike,
  onAddToFavorites,
  isAuthenticated,
  recommendationType,
}) => {
  // Truncate content for preview
  const getExcerpt = (content, maxLength = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  // Format category display
  const getCategoryLabel = (category) => {
    const categoryMap = {
      ghazal: "غزل",
      nazm: "نظم",
      rubai: "رباعی",
      qawwali: "قوالی",
      marsiya: "مرسیہ",
      hamd: "حمد",
      naat: "نعت",
      "free-verse": "آزاد نظم",
    };
    return categoryMap[category] || category;
  };

  // Get recommendation reason badge
  const getRecommendationBadge = () => {
    switch (recommendationType) {
      case "personalized":
        return { text: "آپ کے لیے", color: "bg-blue-100 text-blue-800" };
      case "trending":
        return { text: "مقبول", color: "bg-red-100 text-red-800" };
      case "discovery":
        return { text: "نئی", color: "bg-green-100 text-green-800" };
      default:
        return null;
    }
  };

  const badge = getRecommendationBadge();

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300 relative overflow-hidden">
      {/* Recommendation Badge */}
      {badge && (
        <div className="absolute top-0 right-0 z-10">
          <span
            className={`inline-block ${badge.color} text-xs px-3 py-1 rounded-bl-lg font-medium`}
          >
            {badge.text}
          </span>
        </div>
      )}

      <div className="p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-8">
            <h3
              className="text-lg font-bold text-gray-800 mb-2"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              {poem.title}
            </h3>
            {poem.author && (
              <p className="text-gray-600 text-sm mb-2">
                شاعر: {poem.author.name}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                {getCategoryLabel(poem.category)}
              </span>
              {poem.mood && (
                <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  {poem.mood}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 mb-4">
          <div
            className="text-gray-700 leading-relaxed"
            style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            dir="rtl"
          >
            {getExcerpt(poem.content)}
          </div>
        </div>

        {/* Stats with AI insights */}
        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
          <div className="flex space-x-3">
            <span className="flex items-center">
              <span className="mr-1">👁️</span>
              {poem.views || 0}
            </span>
            <span className="flex items-center">
              <span className="mr-1">❤️</span>
              {poem.likesCount || 0}
            </span>
            <span className="flex items-center">
              <span className="mr-1">⭐</span>
              {poem.averageRating ? poem.averageRating.toFixed(1) : "N/A"}
            </span>
          </div>

          {/* Trending indicator */}
          {recommendationType === "trending" && poem.trendingScore && (
            <div className="flex items-center text-red-600">
              <span className="mr-1">🔥</span>
              <span className="text-xs">ہاٹ</span>
            </div>
          )}
        </div>

        {/* AI Recommendation Reason */}
        {recommendationType === "personalized" && (
          <div className="mb-4 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <span className="font-medium">کیوں تجویز کی گئی:</span>
            <span className="ml-1">
              {poem.category === "ghazal"
                ? "آپ کو غزل پسند ہے"
                : poem.mood === "romantic"
                ? "آپ کو رومانوی شاعری پسند ہے"
                : "آپ کی پسند کے مطابق"}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLike(poem._id)}
              disabled={!isAuthenticated}
              className="flex items-center space-x-1 text-xs px-2 py-1"
            >
              <span>❤️</span>
              <span>پسند</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddToFavorites(poem._id)}
              disabled={!isAuthenticated}
              className="flex items-center space-x-1 text-xs px-2 py-1"
            >
              <span>⭐</span>
              <span>محفوظ</span>
            </Button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => (window.location.href = `/poetry/${poem._id}`)}
            className="text-xs px-3 py-1"
          >
            مکمل پڑھیں
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PoetryRecommendations;
