import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Calendar,
  Tag,
  ExternalLink,
  Heart,
  MessageCircle,
  Share2,
  Download,
  BookOpen,
  Eye,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";

const ExternalPoemPage = () => {
  const { title } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showMessage } = useMessage();
  const [poem, setPoem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    // Retrieve the poem data from sessionStorage
    const storedPoem = sessionStorage.getItem("externalPoem");
    if (storedPoem) {
      try {
        const poemData = JSON.parse(storedPoem);
        setPoem(poemData);
        setLikeCount(poemData.likes || 0);
      } catch (error) {
        console.error("Error parsing poem data:", error);
        showMessage("خرابی", "Failed to load poem data", "error");
        navigate("/search");
      }
    } else {
      showMessage("نظم نہیں ملی", "Poem not found", "error");
      navigate("/search");
    }
    setLoading(false);
  }, [title, navigate, showMessage]);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    showMessage(
      liked ? "پسند ہٹا دی گئی" : "پسند کیا گیا",
      liked ? "Removed from favorites" : "Added to favorites",
      "success"
    );
  };

  const handleCopyText = async () => {
    if (!poem) return;
    
    try {
      const authorName = poem.author?.name || poem.poet?.name || poem.author || "نامعلوم شاعر";
      const textToCopy = `${poem.title}\n${authorName}\n\n${poem.content}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      showMessage("کاپی ہو گیا", "Text copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      showMessage("کاپی نہیں ہو سکا", "Failed to copy text", "error");
    }
  };

  const handleShare = async () => {
    if (!poem) return;

    const authorName = poem.author?.name || poem.poet?.name || poem.author || "نامعلوم شاعر";
    const shareData = {
      title: poem.title,
      text: `${poem.title} - ${authorName}\n\n${poem.content.substring(0, 100)}...`,
      url: poem.externalUrl || poem.url || window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showMessage("شیئر کر دیا گیا", "Shared successfully", "success");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showMessage("لنک کاپی ہو گیا", "Link copied to clipboard", "success");
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleDownload = async () => {
    if (!poem) return;

    try {
      const authorName = poem.author?.name || poem.poet?.name || poem.author || "نامعلوم شاعر";
      const content = `${poem.title}\n${authorName}\n\n${poem.content}\n\n\nماخذ: Rekhta.org`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${poem.title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showMessage(
        "نظم ڈاؤن لوڈ ہو گئی",
        "Poem downloaded successfully",
        "success"
      );
    } catch (error) {
      console.error("Download error:", error);
      showMessage("ڈاؤن لوڈ میں خرابی", "Download failed", "error");
    }
  };

  const getCategoryInUrdu = (category) => {
    const categoryMap = {
      ghazal: "غزل",
      غزل: "غزل",
      nazm: "نظم",
      نظم: "نظم",
      rubai: "رباعی",
      qasida: "قصیدہ",
      masnavi: "مثنوی",
      "شعر": "شعر",
      شاعری: "شاعری",
    };
    return categoryMap[category] || category || "غزل";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-cream/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-urdu-gold"></div>
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-cream/50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">نظم نہیں ملی</h2>
          <p className="text-gray-500 mb-4">Poem not found</p>
          <button
            onClick={() => navigate("/search")}
            className="px-6 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-gold/90"
          >
            تلاش پر واپس جائیں
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-cream/50">
      {/* Header with Back Button */}
      <div className="bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white py-4 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-3 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:transform group-hover:-translate-x-1 transition-transform" />
            <span className="urdu-text">واپس جائیں</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Poem Card - Matching Rekhta Style */}
        <div className="bg-white rounded-2xl shadow-2xl border border-urdu-cream/50 overflow-hidden mb-6">
          
          {/* Title Section with Gradient Background */}
          <div className="bg-gradient-to-r from-urdu-maroon via-urdu-brown to-urdu-maroon text-white px-8 py-6 text-center">
            <h1
              className="text-3xl md:text-4xl font-bold urdu-text mb-3"
              dir="rtl"
              style={{
                fontFamily: "Noto Nastaliq Urdu, serif",
                lineHeight: "1.8",
              }}
            >
              {poem.title}
            </h1>
            <div className="flex items-center justify-center gap-3 text-white/90">
              <User className="w-5 h-5" />
              <span className="text-lg urdu-text" dir="rtl">
                {poem.author?.name || poem.poet?.name || poem.author || "نامعلوم شاعر"}
              </span>
            </div>
          </div>

          {/* Metadata Bar */}
          <div className="bg-urdu-cream/30 px-6 py-3 border-b border-urdu-cream/50 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center bg-urdu-gold/20 text-urdu-brown px-3 py-1 rounded-full text-sm font-medium">
              {getCategoryInUrdu(poem.category)}
            </span>
            {poem.language && (
              <span className="inline-flex items-center bg-urdu-maroon/10 text-urdu-maroon px-3 py-1 rounded-full text-sm font-medium urdu-text">
                {poem.language === "urdu" ? "اردو" : poem.language}
              </span>
            )}
            {poem.createdAt && (
              <span className="inline-flex items-center text-gray-600 text-sm">
                <Calendar className="w-4 h-4 ml-2" />
                {new Date(poem.createdAt).toLocaleDateString("ur-PK")}
              </span>
            )}
          </div>

          {/* Poem Content with Beautiful Typography */}
          <div className="p-8 md:p-12 bg-gradient-to-br from-white to-urdu-cream/20">
            <div className="relative max-w-2xl mx-auto">
              {/* Decorative Right Border */}
              <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-urdu-gold via-urdu-maroon to-urdu-gold rounded-full opacity-60"></div>

              {/* Text Content */}
              <div
                className="pr-8 text-right leading-loose text-lg md:text-xl text-gray-800 whitespace-pre-line urdu-text"
                dir="rtl"
                style={{
                  fontFamily: "Noto Nastaliq Urdu, serif",
                  lineHeight: "2.5",
                  fontSize: "1.35rem",
                }}
              >
                {poem.content}
              </div>
            </div>
          </div>

          {/* Interactive Action Bar */}
          <div className="bg-gradient-to-r from-urdu-cream/20 to-transparent px-6 py-4 border-t border-urdu-cream/50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Social Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                    liked
                      ? "bg-red-50 text-red-500 border border-red-200"
                      : "bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-gray-200"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                  <span className="text-sm font-medium">{likeCount}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-500 rounded-lg transition-all duration-200 hover:scale-105 border border-gray-200"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm urdu-text">شیئر کریں</span>
                </button>

                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-500 rounded-lg transition-all duration-200 hover:scale-105 border border-gray-200"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span className="text-sm urdu-text">کاپی ہو گیا</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span className="text-sm urdu-text">کاپی کریں</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-500 rounded-lg transition-all duration-200 hover:scale-105 border border-gray-200"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm urdu-text">ڈاؤن لوڈ</span>
                </button>
              </div>

              {/* View on Rekhta Button */}
              {poem.externalUrl && (
                <a
                  href={poem.externalUrl || poem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gradient-to-r from-urdu-gold to-urdu-maroon hover:from-urdu-maroon hover:to-urdu-gold text-white px-6 py-2 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="urdu-text">Rekhta.org پر مکمل دیکھیں</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Attribution Box - Matching Reference Style */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 text-center shadow-md mb-6">
          <p className="text-amber-800 font-medium mb-1 urdu-text" dir="rtl">
            یہ نظم بیرونی ذریعہ سے کی گئی ہے
          </p>
          <p className="text-amber-600 text-sm">
            This poem is from an external source (
            <a 
              href={poem.externalUrl || "https://rekhta.org"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
            >
              Rekhta.org
            </a>
            )
          </p>
        </div>

        {/* Back to Search Button */}
        <div className="text-center">
          <button
            onClick={() => navigate("/search")}
            className="px-8 py-3 bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white rounded-xl hover:shadow-xl transition-all duration-300 font-medium hover:scale-105 urdu-text"
          >
            مزید نظمیں تلاش کریں
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalPoemPage;