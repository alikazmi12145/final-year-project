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
  Crown,
  Check,
  Lock,
} from "lucide-react";
import PoetOfTheDay from "../components/homepage/PoetOfTheDay";
import PersonalizedRecommendations from "../components/homepage/PersonalizedRecommendations";
import LiveCommunityFeed from "../components/homepage/LiveCommunityFeed";
import DarkModeToggle from "../components/homepage/DarkModeToggle";
import PoetHistorySlider from "../components/homepage/PoetHistorySlider";
import "../components/membership/membership.css";

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

      {/* Subtle Islamic pattern overlay with slow drift */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0 bsk-drift"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B45309' fill-opacity='0.3'%3E%3Cpolygon points='30 0 60 30 30 60 0 30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        ></div>
      </div>

      {/* Decorative floating ornaments */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Sparkles className="absolute top-24 left-[8%] w-5 h-5 text-amber-400/50 bsk-float" />
        <Star className="absolute top-40 right-[10%] w-4 h-4 text-amber-500/40 bsk-float-slow" />
        <Sparkles className="absolute top-[60vh] right-[6%] w-6 h-6 text-orange-400/40 bsk-float-slow" style={{ animationDelay: '1.2s' }} />
        <Star className="absolute top-[55vh] left-[7%] w-3.5 h-3.5 text-amber-600/40 bsk-float" style={{ animationDelay: '0.6s' }} />
      </div>

      {/* Hero Section - Simplified and Professional */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-5xl mx-auto w-full">
          {/* Main Title with Cultural Elegance */}
          <div className="mb-8">
            <div className="relative inline-block mb-8 px-6 py-2">
              {/* Animated decorative corner brackets */}
              <div className="absolute -top-4 -left-4 w-10 h-10 border-t-2 border-l-2 border-amber-600 opacity-70 bsk-rise" style={{ animationDelay: '0.1s' }}></div>
              <div className="absolute -top-4 -right-4 w-10 h-10 border-t-2 border-r-2 border-amber-600 opacity-70 bsk-rise" style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute -bottom-4 -left-4 w-10 h-10 border-b-2 border-l-2 border-amber-600 opacity-70 bsk-rise" style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute -bottom-4 -right-4 w-10 h-10 border-b-2 border-r-2 border-amber-600 opacity-70 bsk-rise" style={{ animationDelay: '0.1s' }}></div>

              <h1
                className="nastaleeq-heading cultural-title bsk-gold-title bsk-ink-reveal text-5xl md:text-7xl lg:text-8xl font-bold mb-4"
                style={{
                  direction: "rtl",
                  textAlign: "center",
                  fontWeight: "700",
                  letterSpacing: "0.02em",
                  lineHeight: "1.15",
                  filter: "drop-shadow(0 6px 16px rgba(139,69,19,0.25))",
                }}
                dir="rtl"
              >
                بزم سخن
              </h1>
            </div>

            {/* Elegant subtitle */}
            <p
              className="nastaleeq-primary cultural-title text-xl md:text-2xl text-slate-700 mb-6 font-medium bsk-rise"
              style={{
                direction: "rtl",
                textAlign: "center",
                letterSpacing: "0.01em",
                lineHeight: "1.6",
                animationDelay: '0.5s',
              }}
              dir="rtl"
            >
              اردو شاعری کا جدید ذخیرہ
            </p>

            <div className="flex justify-center items-center mb-8">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-amber-500 bsk-divider-grow"></div>
              <Sparkles className="mx-4 w-6 h-6 text-amber-500 bsk-spin-slow" />
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-amber-500 bsk-divider-grow"></div>
            </div>

            <p
              className="nastaleeq-primary text-slate-700 max-w-2xl mx-auto leading-relaxed text-xl md:text-2xl mb-8 italic bsk-rise"
              dir="rtl"
              style={{ animationDelay: '0.75s' }}
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center bsk-rise" style={{ animationDelay: '0.9s' }}>
            <Link
              to="/search"
              className="group relative flex items-center px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent"></span>
              <Search className="ml-3 h-5 w-5 relative" />
              <span className="nastaleeq-primary font-bold relative">
                شاعری تلاش کریں
              </span>
              <ArrowLeft className="mr-3 h-5 w-5 relative group-hover:-translate-x-1 transition-transform" />
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
          <div className="relative bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 rounded-2xl shadow-2xl p-8 md:p-12 text-white overflow-hidden bsk-pulse-glow">
            {/* Inner classical border */}
            <div className="pointer-events-none absolute inset-3 border border-amber-300/25 rounded-xl"></div>
            {/* Decorative Quote Icon */}
            <div className="absolute top-6 right-6 opacity-20 bsk-float-slow">
              <Quote className="h-16 w-16" />
            </div>
            <div className="absolute bottom-6 left-6 opacity-10 bsk-float" style={{ animationDelay: '1s' }}>
              <Quote className="h-12 w-12 rotate-180" />
            </div>

            <div className="relative z-10 text-center">
              <div className="mb-6" key={`quote-${currentQuoteIndex}`}>
                <p
                  className="nastaleeq-primary urdu-text text-2xl md:text-3xl leading-relaxed font-medium bsk-quote-fade"
                  dir="rtl"
                  style={{ color: 'white' }}
                >
                  {poeticQuotes[currentQuoteIndex].text}
                </p>
              </div>

              <div className="flex justify-center items-center" key={`poet-${currentQuoteIndex}`}>
                <div className="h-px w-12 bg-amber-300 opacity-60"></div>
                <p
                  className="nastaleeq-primary urdu-text mx-4 text-xl bsk-quote-fade"
                  dir="rtl"
                  style={{ color: 'white', animationDelay: '0.15s' }}
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
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === currentQuoteIndex
                      ? "w-8 bg-amber-300"
                      : "w-2 bg-amber-600/70 hover:bg-amber-400"
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
                className="group bsk-card-lift bsk-rise bg-white rounded-xl shadow-lg hover:shadow-2xl p-6 border border-slate-200 hover:border-amber-400 relative overflow-hidden"
                style={{ animationDelay: `${0.1 + index * 0.08}s` }}
              >
                <span className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 bg-amber-200/0 group-hover:bg-amber-200/40 rounded-full blur-2xl transition-colors duration-500"></span>
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

      {/* Features Section — Semi-Premium Classical Band */}
      <div className="relative z-10 py-24 px-4 bes-bg-night bes-geo-pattern overflow-hidden">
        <div className="max-w-7xl mx-auto relative">
          {/* Section header */}
          <div className="text-center mb-16 bes-fade-up">
            <div className="mb-5">
              <span className="bes-eyebrow">
                <Sparkles className="inline w-3 h-3 mr-2 -mt-0.5" />
                Platform Highlights
              </span>
            </div>
            <h2
              dir="rtl"
              className="bes-urdu-display text-4xl md:text-6xl bes-shimmer-text"
              style={{ lineHeight: "1.5" }}
            >
              پلیٹ فارم کی فیچرز
            </h2>
            <div className="max-w-sm mx-auto mt-5 mb-5">
              <div className="bes-divider-double" />
            </div>
            <p className="font-elegant italic text-amber-100/70 tracking-[0.22em] uppercase text-xs sm:text-sm">
              A New Era of Urdu Poetry
            </p>
            <p
              dir="rtl"
              className="bes-urdu-display text-amber-100/80 max-w-2xl mx-auto mt-6 text-lg"
            >
              جدید ٹیکنالوجی اور روایتی ثقافتی قدردانی کے ذریعے شاعری دریافت کریں
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-7">
            {[
              {
                icon: Search,
                title: "ذہین اے آئی تلاش",
                english: "Intelligent AI Search",
                description:
                  "آواز، تصاویر، اور ذہین متنی شناخت کے ساتھ ایڈوانس تلاش",
                perks: [
                  { text: "Voice search", premium: false },
                  { text: "OCR poetry extraction", premium: false },
                  { text: "Advanced semantic AI", premium: true },
                ],
              },
              {
                icon: Book,
                title: "ڈیجیٹل لائبریری",
                english: "Digital Library",
                description: "کلاسیکی اور جدید اردو شاعری کا جامع ذخیرہ",
                perks: [
                  { text: "12,500+ poems", premium: false },
                  { text: "Bookmark & save", premium: false },
                  { text: "Rare classical PDFs", premium: true },
                ],
                featured: true,
              },
              {
                icon: Users,
                title: "کمیونٹی پلیٹ فارم",
                english: "Community Platform",
                description:
                  "شاعری کے شوقین سے رابطہ قائم کریں اور ثقافتی بحث میں حصہ لیں",
                perks: [
                  { text: "Discussions & comments", premium: false },
                  { text: "Follow poets", premium: false },
                  { text: "Premium member badge", premium: true },
                ],
              },
            ].map((feature, index) => (
              <article
                key={index}
                className={`bes-glass bes-glass-hover bes-card bes-shine bes-price-card bes-fade-up ${
                  feature.featured ? "featured bes-ring-gold lg:scale-105 lg:-mt-2" : ""
                }`}
                style={{ animationDelay: `${0.1 + index * 0.12}s` }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="bes-medallion">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <span className="bes-chip">0{index + 1}</span>
                </div>

                <h3
                  dir="rtl"
                  className="bes-section-title text-2xl md:text-3xl bes-gold-text mb-1"
                >
                  {feature.title}
                </h3>
                <p className="font-elegant italic text-amber-100/65 tracking-wider text-sm mb-4">
                  {feature.english}
                </p>

                <p
                  dir="rtl"
                  className="bes-urdu-display text-amber-50/85 mb-5"
                >
                  {feature.description}
                </p>

                <div className="bes-divider mb-4" />

                <ul className="space-y-2.5">
                  {feature.perks.map((p) => (
                    <li
                      key={p.text}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex items-center gap-2 text-amber-50/90">
                        <Check className="w-4 h-4 text-emerald-400" />
                        {p.text}
                      </span>
                      {p.premium && (
                        <span className="text-[10px] tracking-widest text-amber-300/90 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> PREMIUM
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* CTA strip */}
          <div className="mt-14 text-center bes-fade-up">
            <Link
              to="/membership"
              className="bes-btn-gold bes-shine inline-flex"
            >
              <Crown className="w-4 h-4" /> Unlock Premium Features
            </Link>
            <p
              dir="rtl"
              className="bes-urdu-display text-amber-100/60 text-sm mt-4"
            >
              پریمیم رکنیت کے ساتھ تمام خصوصی فیچرز کا لطف اٹھائیں
            </p>
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
              <div
                key={index}
                className="group bsk-rise"
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div className="text-3xl md:text-5xl font-bold bg-gradient-to-br from-amber-500 to-orange-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
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
