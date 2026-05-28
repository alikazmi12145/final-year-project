import React, { useMemo } from "react";
import { Quote, Sparkles } from "lucide-react";

const QUOTES = [
  {
    urdu: "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے",
    sub: "بہت نکلے میرے ارمان لیکن پھر بھی کم نکلے",
    by: "مرزا غالب",
  },
  {
    urdu: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے",
    sub: "خدا بندے سے خود پوچھے، بتا تیری رضا کیا ہے",
    by: "علامہ اقبال",
  },
  {
    urdu: "رنجش ہی سہی دل ہی دکھانے کے لیے آ",
    sub: "آ پھر سے مجھے چھوڑ کے جانے کے لیے آ",
    by: "احمد فراز",
  },
];

const AQWAL = [
  { ar: "العلمُ نورٌ", urdu: "علم روشنی ہے", by: "حضرت علیؓ" },
  { ar: "الصبر مفتاح الفرج", urdu: "صبر فرج کی کنجی ہے", by: "حدیث" },
  { ar: "خير الناس أنفعهم للناس", urdu: "بہترین انسان وہ ہے جو دوسروں کے کام آئے", by: "حدیث" },
];

export default function QuoteOfTheDay() {
  const q = useMemo(() => {
    const day = new Date().getDate();
    return QUOTES[day % QUOTES.length];
  }, []);
  const aqwal = useMemo(() => {
    const day = new Date().getDate();
    return AQWAL[day % AQWAL.length];
  }, []);

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bes-glass rounded-2xl p-8 relative overflow-hidden bes-fade-up">
          <div className="absolute -top-6 -right-6 opacity-10">
            <Quote className="w-32 h-32 text-amber-300" />
          </div>
          <span className="bes-chip">
            <Sparkles className="w-3 h-3" /> Quote of the Day
          </span>
          <p
            dir="rtl"
            className="font-nastaliq text-2xl md:text-3xl bes-gold-text mt-5 leading-relaxed"
          >
            {q.urdu}
          </p>
          <p
            dir="rtl"
            className="font-nastaliq text-lg text-amber-100/80 mt-2 leading-relaxed"
          >
            {q.sub}
          </p>
          <p
            dir="rtl"
            className="font-nastaliq text-amber-300/80 mt-5 text-sm"
          >
            — {q.by}
          </p>
        </div>

        <div className="bes-glass rounded-2xl p-8 relative overflow-hidden bes-fade-up" style={{ animationDelay: "120ms" }}>
          <span className="bes-chip">اقوال زریں</span>
          <p
            dir="rtl"
            className="font-naskh text-3xl md:text-4xl bes-gold-text mt-5 leading-relaxed"
          >
            {aqwal.ar}
          </p>
          <p
            dir="rtl"
            className="font-nastaliq text-lg text-amber-100/85 mt-3"
          >
            {aqwal.urdu}
          </p>
          <p
            dir="rtl"
            className="font-nastaliq text-amber-300/80 mt-5 text-sm"
          >
            — {aqwal.by}
          </p>
        </div>
      </div>
    </section>
  );
}
