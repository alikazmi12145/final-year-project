import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  Flame,
  Sparkles,
  RefreshCw,
  Eye,
  Heart,
  Star,
  Bookmark,
  ArrowLeft,
  BookOpen,
  Award,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";

/**
 * AI-Powered Poetry Recommendations — Classical Urdu Edition
 * Shows personalized, trending, and discovery recommendations.
 */

const recommendationTypes = [
  {
    key: "personalized",
    label: "آپ کے لیے",
    description: "آپ کی پسند کے مطابق منتخب",
    Icon: Target,
  },
  {
    key: "trending",
    label: "مقبولِ زمانہ",
    description: "اس وقت سب سے زیادہ پڑھی جانے والی",
    Icon: Flame,
  },
  {
    key: "discovery",
    label: "نئی دریافت",
    description: "نئے رنگ، نئی شاعری",
    Icon: Sparkles,
  },
];

const categoryLabels = {
  ghazal: "غزل",
  nazm: "نظم",
  rubai: "رباعی",
  qawwali: "قوالی",
  marsiya: "مرثیہ",
  salam: "سلام",
  hamd: "حمد",
  naat: "نعت",
  "free-verse": "آزاد نظم",
  other: "متفرق",
};

const moodLabels = {
  romantic: "رومانوی",
  sad: "غمناک",
  patriotic: "وطن پرستی",
  spiritual: "روحانی",
  philosophical: "فلسفیانہ",
  humorous: "مزاحیہ",
  other: "متفرق",
};

const PoetryRecommendations = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState("personalized");

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
        setError(data.message || "تجاویز حاصل کرنے میں خرابی پیش آئی");
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("تجاویز حاصل کرنے میں خرابی پیش آئی");
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    if (!isAuthenticated && type === "personalized") return;
    setActiveType(type);
    fetchRecommendations(type);
  };

  const handleLike = async (poemId) => {
    if (!isAuthenticated) return;
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
        setRecommendations((prev) =>
          prev.map((poem) =>
            poem._id === poemId ? { ...poem, likesCount: data.likesCount } : poem
          )
        );
      }
    } catch (e) {
      console.error("Error liking poem:", e);
    }
  };

  const handleBookmark = async (poemId) => {
    if (!isAuthenticated) return;
    try {
      await fetch(`/api/poetry/${poemId}/favorites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
    } catch (e) {
      console.error("Error bookmarking poem:", e);
    }
  };

  useEffect(() => {
    const initialType = isAuthenticated ? "personalized" : "trending";
    setActiveType(initialType);
    fetchRecommendations(initialType);
  }, [isAuthenticated]);

  const activeMeta = recommendationTypes.find((t) => t.key === activeType);

  return (
    <div className="container mx-auto px-4 py-10" dir="rtl">
      {/* ===== Classical Header ===== */}
      <div className="relative text-center mb-12 bsk-rise">
        <span className="pointer-events-none absolute -top-2 right-0 w-8 h-8 border-t-2 border-r-2 border-urdu-gold/60 rounded-tr-md" />
        <span className="pointer-events-none absolute -top-2 left-0 w-8 h-8 border-t-2 border-l-2 border-urdu-gold/60 rounded-tl-md" />

        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <Sparkles className="w-7 h-7 text-urdu-gold bsk-spin-slow" />
          <h1 className="bsk-gold-title text-4xl md:text-5xl font-bold nastaleeq-heading">
            تجاویزِ سخن
          </h1>
          <Sparkles className="w-7 h-7 text-urdu-gold bsk-spin-slow" />
        </div>

        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-urdu-gold bsk-divider-grow" />
          <span className="text-urdu-gold text-xl">✦</span>
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-urdu-gold bsk-divider-grow" />
        </div>

        <p className="text-urdu-brown text-lg nastaleeq-primary bsk-ink-reveal">
          آپ کے ذوق کے مطابق بہترین کلام کا انتخاب
        </p>
      </div>

      {/* ===== Type Selector ===== */}
      <div className="relative bg-gradient-to-br from-urdu-cream via-white to-amber-50 rounded-2xl shadow-lg border border-urdu-gold/30 p-6 mb-10 bsk-rise">
        <span className="pointer-events-none absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-urdu-gold/60 rounded-tl-md" />
        <span className="pointer-events-none absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-urdu-gold/60 rounded-tr-md" />
        <span className="pointer-events-none absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-urdu-gold/60 rounded-bl-md" />
        <span className="pointer-events-none absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-urdu-gold/60 rounded-br-md" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendationTypes.map(({ key, label, description, Icon }) => {
            const isActive = activeType === key;
            const isDisabled = !isAuthenticated && key === "personalized";
            return (
              <button
                key={key}
                onClick={() => handleTypeChange(key)}
                disabled={isDisabled}
                className={`relative group p-5 rounded-xl border-2 transition-all duration-300 text-center bsk-card-lift ${
                  isActive
                    ? "border-urdu-gold bg-gradient-to-br from-urdu-gold/15 via-amber-50 to-white shadow-lg"
                    : "border-urdu-gold/30 bg-white/70 hover:border-urdu-gold/60"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div
                  className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-urdu-gold to-urdu-maroon text-white shadow-lg ring-4 ring-urdu-gold/30"
                      : "bg-urdu-cream text-urdu-maroon group-hover:bg-urdu-gold/20"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="font-bold text-urdu-maroon nastaleeq-heading text-lg mb-1">
                  {label}
                </div>
                <div className="text-sm text-urdu-brown nastaleeq-primary">
                  {description}
                </div>
                {isDisabled && (
                  <div className="text-xs text-red-700 mt-2 nastaleeq-primary">
                    ذاتی تجاویز کے لیے لاگ ان کریں
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Active selection header ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          {activeMeta && (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-urdu-gold to-urdu-maroon text-white flex items-center justify-center shadow-md">
              <activeMeta.Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-urdu-maroon nastaleeq-heading">
              {activeMeta?.label}
            </h2>
            <p className="text-urdu-brown text-sm nastaleeq-primary">
              {activeMeta?.description}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchRecommendations(activeType)}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 nastaleeq-primary"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>تازہ کریں</span>
        </button>
      </div>

      {/* ===== Loading ===== */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner />
        </div>
      )}

      {/* ===== Error ===== */}
      {error && !loading && (
        <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl mb-6 nastaleeq-primary text-center">
          {error}
        </div>
      )}

      {/* ===== Recommendations Grid ===== */}
      {!loading && !error && (
        <>
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {recommendations.map((poem) => (
                <RecommendationCard
                  key={poem._id}
                  poem={poem}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  isAuthenticated={isAuthenticated}
                  recommendationType={activeType}
                  navigate={navigate}
                />
              ))}
            </div>
          ) : (
            <div className="relative bg-gradient-to-br from-urdu-cream via-white to-amber-50 rounded-2xl border border-urdu-gold/30 py-16 px-6 text-center bsk-rise">
              <BookOpen className="w-16 h-16 text-urdu-gold/60 mx-auto mb-4 bsk-float" />
              <p className="text-urdu-maroon text-xl font-bold nastaleeq-heading mb-3">
                {activeType === "personalized"
                  ? "ابھی آپ کے لیے تجاویز دستیاب نہیں"
                  : "اس وقت کوئی تجویز موجود نہیں"}
              </p>
              <p className="text-urdu-brown text-sm nastaleeq-primary mb-6 max-w-md mx-auto">
                {activeType === "personalized"
                  ? "کچھ غزلیں اور نظمیں پڑھیں، پسند کریں اور محفوظ کریں تاکہ ہم آپ کے ذوق کے مطابق منتخب تجاویز پیش کر سکیں"
                  : "براہ کرم کچھ دیر بعد دوبارہ کوشش فرمائیں"}
              </p>
              <button
                onClick={() => navigate("/poetry-collection")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 nastaleeq-primary"
              >
                <BookOpen className="w-4 h-4" />
                <span>شاعری تلاش کریں</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== Quick Discovery Strip ===== */}
      {!loading && !error && recommendations.length > 0 && (
        <div className="relative bg-gradient-to-br from-urdu-cream via-white to-amber-50 rounded-2xl border border-urdu-gold/30 p-6 shadow-md bsk-rise">
          <div className="flex justify-center items-center gap-3 mb-5">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-urdu-gold" />
            <h3 className="text-xl font-bold text-urdu-maroon nastaleeq-heading">
              مزید تلاش کریں
            </h3>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-urdu-gold" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/poetry?featured=true")}
              className="flex items-center justify-center gap-2 p-4 bg-white border-2 border-urdu-gold/30 rounded-xl hover:border-urdu-gold hover:bg-urdu-cream transition-all bsk-card-lift text-urdu-maroon nastaleeq-primary"
            >
              <Award className="w-5 h-5 text-urdu-gold" />
              <span className="font-semibold">نمایاں شاعری</span>
            </button>
            <button
              onClick={() => navigate("/poetry?sortBy=views")}
              className="flex items-center justify-center gap-2 p-4 bg-white border-2 border-urdu-gold/30 rounded-xl hover:border-urdu-gold hover:bg-urdu-cream transition-all bsk-card-lift text-urdu-maroon nastaleeq-primary"
            >
              <TrendingUp className="w-5 h-5 text-urdu-gold" />
              <span className="font-semibold">سب سے زیادہ دیکھی گئی</span>
            </button>
            <button
              onClick={() => navigate("/poetry?sortBy=averageRating")}
              className="flex items-center justify-center gap-2 p-4 bg-white border-2 border-urdu-gold/30 rounded-xl hover:border-urdu-gold hover:bg-urdu-cream transition-all bsk-card-lift text-urdu-maroon nastaleeq-primary"
            >
              <Star className="w-5 h-5 text-urdu-gold" />
              <span className="font-semibold">بہترین درجہ بندی</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============ RECOMMENDATION CARD ============ */
const RecommendationCard = ({
  poem,
  onLike,
  onBookmark,
  isAuthenticated,
  recommendationType,
  navigate,
}) => {
  const getExcerpt = (content = "", maxLength = 140) => {
    if (!content) return "";
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + " …";
  };

  const badge = {
    personalized: { text: "آپ کے لیے", icon: Target },
    trending: { text: "مقبول", icon: Flame },
    discovery: { text: "نئی", icon: Sparkles },
  }[recommendationType];

  const BadgeIcon = badge?.icon;

  const reason =
    recommendationType === "personalized"
      ? poem.category === "ghazal"
        ? "آپ کو غزل پسند ہے"
        : poem.mood === "romantic"
        ? "آپ کو رومانوی شاعری پسند ہے"
        : poem.category === "naat"
        ? "آپ کو نعتیہ کلام پسند ہے"
        : "آپ کے ذوق کے مطابق منتخب"
      : null;

  return (
    <div className="relative h-full bg-gradient-to-br from-urdu-cream via-white to-amber-50 rounded-2xl border border-urdu-gold/30 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden bsk-card-lift bsk-rise">
      <span className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-urdu-gold/50 rounded-tl-md" />
      <span className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-urdu-gold/50 rounded-br-md" />

      {badge && (
        <div className="absolute top-0 right-0 z-10">
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white text-xs px-3 py-1.5 rounded-bl-2xl rounded-tr-2xl font-bold nastaleeq-primary shadow-md">
            {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
            <span>{badge.text}</span>
          </span>
        </div>
      )}

      <div className="p-6 flex flex-col h-full">
        <div className="mb-3 pr-20">
          <h3 className="text-xl font-bold text-urdu-maroon mb-1 nastaleeq-heading line-clamp-1">
            {poem.title}
          </h3>
          {poem.author?.name && (
            <p className="text-urdu-brown text-sm nastaleeq-primary">
              <span className="text-urdu-gold">✦</span> شاعر: {poem.author.name}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-block bg-urdu-gold/15 text-urdu-maroon text-xs px-3 py-1 rounded-full font-semibold nastaleeq-primary border border-urdu-gold/30">
            {categoryLabels[poem.category] || poem.category}
          </span>
          {poem.mood && moodLabels[poem.mood] && (
            <span className="inline-block bg-amber-100/60 text-urdu-brown text-xs px-3 py-1 rounded-full font-semibold nastaleeq-primary border border-amber-300/50">
              {moodLabels[poem.mood]}
            </span>
          )}
        </div>

        <div
          className="flex-1 mb-4 text-urdu-brown leading-loose nastaleeq-primary text-sm bg-white/50 rounded-lg p-3 border border-urdu-gold/15"
          dir="rtl"
        >
          {getExcerpt(poem.content)}
        </div>

        {reason && (
          <div className="mb-4 px-3 py-2 bg-gradient-to-r from-urdu-gold/10 to-amber-100/40 border border-urdu-gold/30 rounded-lg text-xs text-urdu-brown nastaleeq-primary flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-urdu-gold flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-urdu-maroon">وجہ تجویز: </span>
              <span>{reason}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-urdu-brown mb-4 nastaleeq-primary border-t border-urdu-gold/20 pt-3">
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-urdu-gold" />
              {poem.views || 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              {poem.likesCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              {poem.averageRating ? poem.averageRating.toFixed(1) : "—"}
            </span>
          </div>
          {recommendationType === "trending" && (
            <span className="flex items-center gap-1 text-red-600 font-bold">
              <Flame className="w-3.5 h-3.5" />
              ہاٹ
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => onLike(poem._id)}
              disabled={!isAuthenticated}
              title={isAuthenticated ? "پسند کریں" : "لاگ ان کریں"}
              className="p-2 bg-white border border-urdu-gold/30 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Heart className="w-4 h-4 text-red-500" />
            </button>
            <button
              onClick={() => onBookmark(poem._id)}
              disabled={!isAuthenticated}
              title={isAuthenticated ? "محفوظ کریں" : "لاگ ان کریں"}
              className="p-2 bg-white border border-urdu-gold/30 rounded-lg hover:bg-urdu-gold/10 hover:border-urdu-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Bookmark className="w-4 h-4 text-urdu-gold" />
            </button>
          </div>

          <button
            onClick={() => navigate(`/poetry/${poem._id}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-105 nastaleeq-primary"
          >
            <span>مکمل پڑھیں</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoetryRecommendations;
