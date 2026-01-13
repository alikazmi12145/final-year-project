import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Book,
  Users,
  ArrowLeft,
  Quote,
  Heart,
  Sparkles,
  Star,
} from "lucide-react";
import PoetOfTheDay from "../components/homepage/PoetOfTheDay";
import PersonalizedRecommendations from "../components/homepage/PersonalizedRecommendations";
import LiveCommunityFeed from "../components/homepage/LiveCommunityFeed";
import DarkModeToggle from "../components/homepage/DarkModeToggle";
import PoetHistorySlider from "../components/homepage/PoetHistorySlider";

const Home = () => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // Featured poets - expanded to 6 renowned poets
  const featuredPoets = [
    {
      name: "مرزا غالب",
      period: "1797-1869",
      description: "اردو شاعری کا بے تاج بادشاہ",
      quote: "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے",
      image: "/images/images.jpg",
    },
    {
      name: "علامہ اقبال",
      period: "1877-1938",
      description: "شاعر مشرق",
      quote: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے",
      image: "/images/images (1).jpg",
    },
    {
      name: "فیض احمد فیض",
      period: "1911-1984",
      description: "انقلابی شاعر",
      quote: "محبت کرنے والے کم نہ ہوں گے",
      image: "/images/5-61.jpg",
    },
    {
      name: "میر تقی میر",
      period: "1723-1810",
      description: "خدائے سخن",
      quote: "کیا مجھ کو یہ عشق ہوا ہے کہ بس",
      image: "/images/images (3).jpg",
    },
    {
      name: "احمد فراز",
      period: "1931-2008",
      description: "جدید غزل کا استاد",
      quote: "رنج کی شب میں سحر کا انتظار کون کرے",
      image: "/images/images (2).jpg",
    },
    {
      name: "پروین شاکر",
      period: "1952-1994",
      description: "جدید اردو شاعرہ",
      quote: "پتا نہیں کیوں زندگی کی راہوں میں",
      image: "/images/images (4).jpg",
    },
  ];

  // Rotating quotes
  const poeticQuotes = [
    {
      text: "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے",
      poet: "مرزا غالب",
    },
    {
      text: "محبت کرنے والے کم نہ ہوں گے",
      poet: "فیض احمد فیض",
    },
    {
      text: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے",
      poet: "علامہ اقبال",
    },
  ];

  // Auto-rotate quotes
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % poeticQuotes.length);
    }, 5000);
    return () => clearInterval(quoteInterval);
  }, [poeticQuotes.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50">
      {/* Dark Mode Toggle */}
      <DarkModeToggle />

      {/* Subtle Islamic pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B45309' fill-opacity='0.3'%3E%3Cpolygon points='30 0 60 30 30 60 0 30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        ></div>
      </div>

      {/* Hero Section - Simplified and Professional */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-5xl mx-auto w-full">
          {/* Main Title with Cultural Elegance */}
          <div className="mb-8">
            <div className="relative inline-block mb-8">
              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-amber-600 opacity-60"></div>
              <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-amber-600 opacity-60"></div>

              <h1
                className="nastaleeq-heading cultural-title text-5xl md:text-7xl lg:text-8xl font-bold text-amber-900 mb-4"
                style={{
                  direction: "rtl",
                  textAlign: "center",
                  fontWeight: "700",
                  letterSpacing: "0.02em",
                  lineHeight: "1.1",
                  textShadow: "0 4px 12px rgba(139, 69, 19, 0.3)",
                }}
                dir="rtl"
              >
                بزم سخن
              </h1>
            </div>

            {/* Elegant subtitle */}
            <p
              className="nastaleeq-primary cultural-title text-xl md:text-2xl text-slate-700 mb-6 font-medium"
              style={{
                direction: "rtl",
                textAlign: "center",
                letterSpacing: "0.01em",
                lineHeight: "1.6",
              }}
              dir="rtl"
            >
              اردو شاعری کا جدید ذخیرہ
            </p>

            <div className="flex justify-center items-center mb-8">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400"></div>
              <Sparkles className="mx-4 w-6 h-6 text-amber-500" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400"></div>
            </div>

            <p
              className="nastaleeq-primary text-slate-600 max-w-2xl mx-auto leading-relaxed text-xl mb-8"
              dir="rtl"
            >
              نہیں کھیل اے داغؔ یاروں سے کہہ دو
              <br />
              کہ آتی ہے اردو زباں آتے آتے
            </p>
          </div>

          {/* Poet History Slider - Positioned below subtitle */}
          <div className="mb-12">
            <PoetHistorySlider />
          </div>

          {/* Action Buttons - Clean and Simple */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/search"
              className="group flex items-center px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Search className="ml-3 h-5 w-5" />
              <span className="nastaleeq-primary font-bold">
                شاعری تلاش کریں
              </span>
              <ArrowLeft className="mr-3 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/auth?tab=register"
              className="group flex items-center px-8 py-4 bg-white border-2 border-amber-600 text-amber-700 font-semibold rounded-xl shadow-lg hover:bg-amber-600 hover:text-white transition-all duration-300 transform hover:scale-105"
            >
              <Users className="ml-3 h-5 w-5" />
              <span className="nastaleeq-primary font-bold">
                کمیونٹی میں شامل ہوں
              </span>
              <ArrowLeft className="mr-3 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Quote Section - Elegant and Minimal */}
      <div className="relative z-10 py-16 px-4 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-r from-amber-900 to-orange-900 rounded-2xl shadow-2xl p-8 md:p-12 text-white overflow-hidden">
            {/* Decorative Quote Icon */}
            <div className="absolute top-6 right-6 opacity-20">
              <Quote className="h-16 w-16" />
            </div>

            <div className="relative z-10 text-center">
              <div className="mb-6">
                <p
                  className="nastaleeq-primary urdu-text text-2xl md:text-3xl leading-relaxed font-medium"
                  dir="rtl"
                  style={{ color: 'white' }}
                >
                  {poeticQuotes[currentQuoteIndex].text}
                </p>
              </div>

              <div className="flex justify-center items-center">
                <div className="h-px w-12 bg-amber-300 opacity-60"></div>
                <p
                  className="nastaleeq-primary urdu-text mx-4 text-xl"
                  dir="rtl"
                  style={{ color: 'white' }}
                >
                  {poeticQuotes[currentQuoteIndex].poet}
                </p>
                <div className="h-px w-12 bg-amber-300 opacity-60"></div>
              </div>
            </div>

            {/* Quote indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {poeticQuotes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuoteIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentQuoteIndex
                      ? "bg-amber-300"
                      : "bg-amber-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Poet of the Day & Verse of the Day */}
      <PoetOfTheDay />

      {/* Personalized Recommendations (only for logged-in users) */}
      <PersonalizedRecommendations />

      {/* Featured Poets - Clean Grid */}
      <div className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="nastaleeq-heading cultural-title text-3xl md:text-4xl font-bold text-amber-900 mb-4"
              dir="rtl"
            >
              نامور شعراء
            </h2>
            <p
              className="nastaleeq-primary text-slate-600 max-w-2xl mx-auto leading-relaxed"
              dir="rtl"
            >
              عظیم اردو شعراء کے کام دیکھیں جن کے اشعار نسلوں کو متاثر کرتے رہتے
              ہیں
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {featuredPoets.map((poet, index) => (
              <div
                key={index}
                className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-slate-200 hover:border-amber-300"
              >
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-amber-200 shadow-lg group-hover:border-amber-400 transition-all duration-300">
                      <img
                        src={poet.image}
                        alt={poet.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            poet.name
                          )}&background=f59e0b&color=ffffff&size=200&font-size=0.6`;
                        }}
                      />
                    </div>
                  </div>

                  <h3
                    className="nastaleeq-heading urdu-text text-xl font-bold text-amber-900 mb-2"
                    dir="rtl"
                  >
                    {poet.name}
                  </h3>

                  <p className="text-sm text-slate-500 mb-2">{poet.period}</p>

                  <p
                    className="nastaleeq-primary urdu-text text-sm text-amber-700 mb-4"
                    dir="rtl"
                  >
                    {poet.description}
                  </p>

                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border-l-4 border-amber-400">
                    <p
                      className="nastaleeq-primary urdu-text text-sm text-amber-800 italic leading-relaxed"
                      dir="rtl"
                    >
                      "{poet.quote}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section - Minimalist */}
      <div className="relative z-10 py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="nastaleeq-heading text-3xl md:text-4xl font-bold text-amber-900 mb-4">
              پلیٹ فارم کی فیچرز
            </h2>
            <p
              className="nastaleeq-primary text-slate-600 max-w-2xl mx-auto leading-relaxed"
              dir="rtl"
            >
              جدید ٹیکنالوجی اور روایتی ثقافتی قدردانی کے ذریعے شاعری دریافت
              کریں
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: "ذہین اے آئی تلاش",
                description:
                  "آواز، تصاویر، اور ذہین متنی شناخت کے ساتھ ایڈوانس تلاش",
                color: "from-blue-500 to-blue-600",
              },
              {
                icon: Book,
                title: "ڈیجیٹل لائبریری",
                description: "کلاسیکی اور جدید اردو شاعری کا جامع ذخیرہ",
                color: "from-green-500 to-green-600",
              },
              {
                icon: Users,
                title: "کمیونٹی پلیٹ فارم",
                description:
                  "شاعری کے شوقین سے رابطہ قائم کریں اور ثقافتی بحث میں حصہ لیں",
                color: "from-purple-500 to-purple-600",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200"
              >
                <div className="text-center">
                  <div
                    className={`w-14 h-14 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3
                    className="nastaleeq-heading text-xl font-bold text-slate-800 mb-3"
                    dir="rtl"
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="nastaleeq-primary text-slate-600 leading-relaxed"
                    dir="rtl"
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Community Feed */}
      <LiveCommunityFeed />

      {/* Stats Section - Clean and Simple */}
      <div className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "10,000+", label: "اشعار" },
              { number: "500+", label: "شعراء" },
              { number: "50+", label: "مقابلے" },
              { number: "100K+", label: "قارئین" },
            ].map((stat, index) => (
              <div key={index} className="group">
                <div className="text-3xl md:text-4xl font-bold text-amber-600 mb-3 group-hover:scale-110 transition-transform">
                  {stat.number}
                </div>
                <div
                  className="nastaleeq-primary text-amber-800 font-bold text-lg"
                  dir="rtl"
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
