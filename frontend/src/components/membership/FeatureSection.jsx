import React from "react";
import {
  Mic,
  ScanText,
  Sparkles,
  Search,
  BookOpen,
  Headphones,
  Bookmark,
  Library,
  Users,
  MessageSquare,
  Heart,
  Trophy,
  Crown,
  Lock,
} from "lucide-react";
import CalligraphyHeader from "./CalligraphyHeader";

const FEATURES = [
  {
    icon: <Sparkles className="w-8 h-8" />,
    urdu: "ذہین اے آئی تلاش",
    english: "Intelligent AI Search",
    description:
      "آواز، تصاویر، اور ذہین متنی شناخت کے ساتھ ایڈوانس تلاش",
    items: [
      { text: "Voice search", urdu: "آواز سے تلاش", icon: <Mic className="w-4 h-4" /> },
      { text: "OCR poetry extraction", urdu: "تصویر سے متن", icon: <ScanText className="w-4 h-4" /> },
      { text: "AI poetry recognition", urdu: "AI شناخت", icon: <Sparkles className="w-4 h-4" /> },
      { text: "Semantic Urdu search", urdu: "معنوی تلاش", icon: <Search className="w-4 h-4" /> },
      { text: "Smart suggestions", urdu: "ذہین تجاویز", icon: <Sparkles className="w-4 h-4" /> },
      { text: "Premium-only advanced AI", urdu: "صرف پریمیم", icon: <Crown className="w-4 h-4" />, premium: true },
    ],
  },
  {
    icon: <Library className="w-8 h-8" />,
    urdu: "ڈیجیٹل لائبریری",
    english: "Digital Library",
    description: "کلاسیکی اور جدید اردو شاعری کا جامع ذخیرہ",
    items: [
      { text: "Thousands of Urdu poems", urdu: "ہزاروں اردو نظمیں", icon: <BookOpen className="w-4 h-4" /> },
      { text: "Rare classical collections", urdu: "نایاب مجموعے", icon: <Library className="w-4 h-4" />, premium: true },
      { text: "Categorized poets & genres", urdu: "اقسام و اصناف", icon: <BookOpen className="w-4 h-4" /> },
      { text: "Audio poetry playback", urdu: "آڈیو شاعری", icon: <Headphones className="w-4 h-4" /> },
      { text: "Bookmark & save", urdu: "بک مارک", icon: <Bookmark className="w-4 h-4" /> },
      { text: "Exclusive PDFs", urdu: "خصوصی PDF", icon: <Crown className="w-4 h-4" />, premium: true },
    ],
  },
  {
    icon: <Users className="w-8 h-8" />,
    urdu: "کمیونٹی پلیٹ فارم",
    english: "Community Platform",
    description: "شاعری کے شوقین سے رابطہ قائم کریں اور ثقافتی بحث میں حصہ لیں",
    items: [
      { text: "Poetry discussions", urdu: "ادبی مکالمہ", icon: <MessageSquare className="w-4 h-4" /> },
      { text: "User profiles", urdu: "صارف پروفائلز", icon: <Users className="w-4 h-4" /> },
      { text: "Follow favorite poets", urdu: "شاعروں کو فالو کریں", icon: <Heart className="w-4 h-4" /> },
      { text: "Comments & reactions", urdu: "تبصرے", icon: <MessageSquare className="w-4 h-4" /> },
      { text: "Poetry competitions", urdu: "مقابلے", icon: <Trophy className="w-4 h-4" /> },
      { text: "Premium member badge", urdu: "پریمیم بیج", icon: <Crown className="w-4 h-4" />, premium: true },
    ],
  },
];

export default function FeatureSection() {
  return (
    <section className="relative py-20 bes-geo-pattern">
      <div className="max-w-7xl mx-auto px-4">
        <CalligraphyHeader
          urdu="ہمارے خصوصی فیچرز"
          english="A New Era of Urdu Poetry"
          caption="بصیرت، علم، اور خوبصورتی کا حسین امتزاج"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f, idx) => (
            <article
              key={f.english}
              className="bes-glass bes-glass-hover bes-card bes-shine relative bes-fade-up"
              style={{ animationDelay: `${idx * 120}ms` }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500/30 to-yellow-700/10 text-amber-300 bes-ring-gold">
                  {f.icon}
                </div>
                <span className="bes-chip">Feature 0{idx + 1}</span>
              </div>

              <h3
                dir="rtl"
                className="font-nastaliq text-2xl bes-gold-text mb-1 leading-snug"
              >
                {f.urdu}
              </h3>
              <p className="font-elegant text-amber-100/70 italic mb-3">
                {f.english}
              </p>
              <p
                dir="rtl"
                className="font-nastaliq text-amber-50/85 leading-relaxed mb-5"
              >
                {f.description}
              </p>

              <div className="bes-divider mb-4" />

              <ul className="space-y-2.5">
                {f.items.map((it) => (
                  <li
                    key={it.text}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 text-sm text-amber-50/85">
                      <span className="text-amber-300/90">{it.icon}</span>
                      {it.text}
                    </span>
                    {it.premium ? (
                      <span className="text-[10px] tracking-widest text-amber-300/90 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" /> PREMIUM
                      </span>
                    ) : (
                      <span className="text-[10px] tracking-widest text-emerald-300/80">
                        INCLUDED
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
