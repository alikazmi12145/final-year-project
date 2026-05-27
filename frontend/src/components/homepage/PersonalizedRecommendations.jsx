import React, { useState, useEffect } from "react";
import {
  Heart,
  BookOpen,
  ChevronRight,
  Sparkles,
  Eye,
  Target,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const homepageAxios = axios.create({ baseURL: "" });

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

const SectionShell = ({ children }) => (
  <section className="relative z-10 py-16 px-4 bg-gradient-to-br from-urdu-cream/40 via-white to-amber-50/40 overflow-hidden">
    {/* Ambient blobs */}
    <div className="pointer-events-none absolute top-10 -right-16 w-72 h-72 bg-urdu-gold/10 rounded-full blur-3xl bsk-float" />
    <div className="pointer-events-none absolute bottom-10 -left-16 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl bsk-float-slow" />
    <div className="max-w-6xl mx-auto relative">{children}</div>
  </section>
);

const SectionHeader = ({ subtitle }) => (
  <div className="relative text-center mb-12 bsk-rise" dir="rtl">
    <span className="pointer-events-none absolute -top-2 right-0 w-8 h-8 border-t-2 border-r-2 border-urdu-gold/60 rounded-tr-md" />
    <span className="pointer-events-none absolute -top-2 left-0 w-8 h-8 border-t-2 border-l-2 border-urdu-gold/60 rounded-tl-md" />

    <div className="inline-flex items-center justify-center gap-3 mb-4">
      <Sparkles className="w-7 h-7 text-urdu-gold bsk-spin-slow" />
      <h2 className="bsk-gold-title text-3xl md:text-4xl font-bold nastaleeq-heading">
        آپ کے لیے تجویز کردہ
      </h2>
      <Sparkles className="w-7 h-7 text-urdu-gold bsk-spin-slow" />
    </div>

    <div className="flex justify-center items-center gap-3 mb-4">
      <div className="h-px w-20 bg-gradient-to-r from-transparent to-urdu-gold bsk-divider-grow" />
      <span className="text-urdu-gold text-xl">✦</span>
      <div className="h-px w-20 bg-gradient-to-l from-transparent to-urdu-gold bsk-divider-grow" />
    </div>

    <p className="text-urdu-brown text-lg nastaleeq-primary bsk-ink-reveal">
      {subtitle}
    </p>
  </div>
);

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
      const token = localStorage.getItem("token");
      const response = await homepageAxios.get(
        "http://localhost:5000/api/homepage/recommendations",
        { headers: { Authorization: `Bearer ${token}` } }
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

  /* ===== Guest state ===== */
  if (!isAuthenticated) {
    return (
      <SectionShell>
        <SectionHeader subtitle="آپ کی پسند کے مطابق منتخب کلام" />
        <div className="relative bg-gradient-to-br from-urdu-cream via-white to-amber-50 rounded-2xl border border-urdu-gold/30 shadow-xl p-12 text-center bsk-rise">
          <span className="pointer-events-none absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-urdu-gold/60 rounded-tr-md" />
          <span className="pointer-events-none absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-urdu-gold/60 rounded-tl-md" />
          <span className="pointer-events-none absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-urdu-gold/60 rounded-br-md" />
          <span className="pointer-events-none absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-urdu-gold/60 rounded-bl-md" />

          <BookOpen className="w-16 h-16 text-urdu-gold mx-auto mb-6 bsk-float" />
          <h3
            className="nastaleeq-heading text-2xl font-bold text-urdu-maroon mb-4"
            dir="rtl"
          >
            ذاتی تجاویز دیکھنے کے لیے لاگ ان کریں
          </h3>
          <p
            className="nastaleeq-primary text-urdu-brown mb-8 max-w-md mx-auto"
            dir="rtl"
          >
            اپنی پڑھنے کی تاریخ اور پسند کی بنیاد پر خصوصی شاعری کی تجاویز
            حاصل کریں
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{ color: "#ffffff" }}
          >
            <span className="nastaleeq-primary text-lg" style={{ color: "#ffffff" }}>
              لاگ ان کریں
            </span>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </SectionShell>
    );
  }

  /* ===== Loading state ===== */
  if (loading) {
    return (
      <SectionShell>
        <SectionHeader subtitle="آپ کی پسند کے مطابق منتخب کلام" />
        <div className="grid md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-gradient-to-br from-urdu-cream/60 to-amber-100/30 border border-urdu-gold/20"
            />
          ))}
        </div>
      </SectionShell>
    );
  }

  /* ===== Empty / Error state ===== */
  if (error || !recommendations || recommendations.length === 0) {
    return (
      <SectionShell>
        <SectionHeader subtitle="آپ کی پسند کے مطابق منتخب کلام" />
        <div className="relative bg-gradient-to-br from-urdu-cream via-white to-amber-50 rounded-2xl border border-urdu-gold/30 shadow-xl p-12 text-center bsk-rise">
          <Heart className="w-16 h-16 text-urdu-gold mx-auto mb-6 bsk-float" />
          <h3
            className="nastaleeq-heading text-2xl font-bold text-urdu-maroon mb-4"
            dir="rtl"
          >
            تجاویز بنانے کے لیے مزید شاعری پڑھیں
          </h3>
          <p
            className="nastaleeq-primary text-urdu-brown mb-8 max-w-md mx-auto"
            dir="rtl"
          >
            جب آپ شاعری پڑھتے اور پسند کرتے ہیں، تو ہم آپ کی پسند کے مطابق
            تجاویز فراہم کریں گے
          </p>
          <Link
            to="/poetry"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{ color: "#ffffff" }}
          >
            <span className="nastaleeq-primary text-lg" style={{ color: "#ffffff" }}>
              شاعری دریافت کریں
            </span>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </SectionShell>
    );
  }

  /* ===== Recommendations grid ===== */
  return (
    <SectionShell>
      <SectionHeader subtitle="آپ کی پسند کی بنیاد پر منتخب کردہ کلام" />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.slice(0, 6).map((poem, index) => (
          <Link
            key={poem._id}
            to={`/poems/${poem._id}`}
            className="group relative bg-gradient-to-br from-urdu-cream via-white to-amber-50 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-urdu-gold/30 hover:border-urdu-gold bsk-card-lift bsk-rise"
            style={{ animationDelay: `${index * 0.1}s` }}
            dir="rtl"
          >
            {/* Corner brackets */}
            <span className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-urdu-gold/50 rounded-tl-md" />
            <span className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-urdu-gold/50 rounded-br-md" />

            {/* Badge */}
            <div className="absolute top-0 right-0 z-10">
              <span
                className="inline-flex items-center gap-1 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-xs px-3 py-1.5 rounded-bl-2xl rounded-tr-2xl font-bold nastaleeq-primary shadow-md"
                style={{ color: "#ffffff" }}
              >
                <Target className="w-3 h-3" />
                <span style={{ color: "#ffffff" }}>آپ کے لیے</span>
              </span>
            </div>

            <div className="p-6">
              {/* Pills */}
              <div className="flex flex-wrap gap-2 mb-4 pr-20">
                <span className="inline-block bg-urdu-gold/15 text-urdu-maroon text-xs px-3 py-1 rounded-full font-semibold nastaleeq-primary border border-urdu-gold/30">
                  {categoryLabels[poem.category] || poem.category}
                </span>
                {poem.mood && moodLabels[poem.mood] && (
                  <span className="inline-block bg-amber-100/60 text-urdu-brown text-xs px-3 py-1 rounded-full font-semibold nastaleeq-primary border border-amber-300/50">
                    {moodLabels[poem.mood]}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3
                className="nastaleeq-heading text-xl font-bold text-urdu-maroon mb-3 line-clamp-2 group-hover:text-urdu-gold transition-colors"
                dir="rtl"
              >
                {poem.title}
              </h3>

              {/* Excerpt */}
              <div
                className="nastaleeq-primary text-urdu-brown text-sm leading-loose mb-4 line-clamp-3 bg-white/50 rounded-lg p-3 border border-urdu-gold/15"
                dir="rtl"
                style={{ minHeight: "5rem" }}
              >
                {poem.content?.split("\n")[0]}
              </div>

              {/* Poet */}
              {poem.poet && (
                <div className="flex items-center mb-4 pb-3 border-b border-urdu-gold/20">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-urdu-gold to-urdu-maroon flex items-center justify-center font-bold border-2 border-urdu-gold/40">
                    {poem.poet.profileImage?.url ? (
                      <img
                        src={
                          poem.poet.profileImage.url.startsWith("http")
                            ? poem.poet.profileImage.url
                            : `${
                                import.meta.env.VITE_API_BASE_URL?.replace(
                                  "/api",
                                  ""
                                ) || "http://localhost:5000"
                              }${poem.poet.profileImage.url}`
                        }
                        alt={poem.poet.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            poem.poet.name
                          )}&background=b8860b&color=ffffff&size=100`;
                        }}
                      />
                    ) : (
                      <span style={{ color: "#ffffff" }}>
                        {poem.poet.name?.charAt(0) || "؟"}
                      </span>
                    )}
                  </div>
                  <div className="mr-3">
                    <p
                      className="nastaleeq-primary text-sm font-semibold text-urdu-maroon"
                      dir="rtl"
                    >
                      <span className="text-urdu-gold">✦</span> {poem.poet.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-urdu-brown nastaleeq-primary">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    {poem.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-urdu-gold" />
                    {poem.views || 0}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-urdu-gold group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Hover gradient line */}
            <div className="h-1 bg-gradient-to-r from-urdu-gold via-amber-400 to-urdu-maroon transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          </Link>
        ))}
      </div>

      {/* View More */}
      <div className="text-center mt-12 bsk-rise">
        <Link
          to="/recommendations"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-urdu-gold to-urdu-maroon font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
          style={{ color: "#ffffff" }}
        >
          <span
            className="nastaleeq-primary text-lg"
            style={{ color: "#ffffff" }}
          >
            مزید تجاویز دیکھیں
          </span>
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>
    </SectionShell>
  );
};

export default PersonalizedRecommendations;
