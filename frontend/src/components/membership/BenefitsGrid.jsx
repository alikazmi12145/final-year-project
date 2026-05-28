import React from "react";
import {
  Sparkles,
  BookMarked,
  Download,
  Headphones,
  ShieldCheck,
  Crown,
  Zap,
} from "lucide-react";
import CalligraphyHeader from "./CalligraphyHeader";

const BENEFITS = [
  {
    icon: <BookMarked />,
    title: "Exclusive Collections",
    urdu: "خصوصی شاعری کے ذخیرے",
    desc: "نایاب کلاسیکی مخطوطات اور VIP مجموعوں تک رسائی",
  },
  {
    icon: <Sparkles />,
    title: "AI-Powered Tools",
    urdu: "ذہین AI ٹولز",
    desc: "آواز، تصویر، اور معنوی تلاش کی مکمل طاقت",
  },
  {
    icon: <Download />,
    title: "Unlimited Downloads",
    urdu: "لامحدود ڈاؤن لوڈ",
    desc: "خوبصورت ٹائپوگرافی کے ساتھ ہائی کوالٹی PDF",
  },
  {
    icon: <Headphones />,
    title: "Audio Poetry Studio",
    urdu: "آڈیو شاعری اسٹوڈیو",
    desc: "تلاوت کا تجربہ، پلے لسٹس، اور پوڈکاسٹ موڈ",
  },
  {
    icon: <ShieldCheck />,
    title: "Ad-Free Experience",
    urdu: "اشتہار سے پاک",
    desc: "خاموش، صاف اور توجہ مرکوز ادبی ماحول",
  },
  {
    icon: <Crown />,
    title: "Premium Profile Badge",
    urdu: "پریمیم بیج",
    desc: "کمیونٹی میں آپ کا ادبی مقام نمایاں ہو",
  },
  {
    icon: <Zap />,
    title: "Early Access",
    urdu: "نئے فیچرز تک ابتدائی رسائی",
    desc: "نئے ٹولز اور تجربات سب سے پہلے آپ کے لیے",
  },
];

export default function BenefitsGrid() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        <CalligraphyHeader
          urdu="پریمیم رکنیت کے فوائد"
          english="Premium Benefits"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {BENEFITS.map((b, idx) => (
            <div
              key={b.title}
              className="bes-glass bes-glass-hover rounded-2xl p-6 bes-fade-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="w-11 h-11 mb-4 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500/30 to-yellow-700/10 text-amber-300">
                {b.icon}
              </div>
              <h4 className="text-amber-50 font-semibold">{b.title}</h4>
              <h5
                dir="rtl"
                className="font-nastaliq bes-gold-text text-lg mt-1"
              >
                {b.urdu}
              </h5>
              <p
                dir="rtl"
                className="font-nastaliq text-amber-100/70 text-sm mt-2 leading-relaxed"
              >
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
