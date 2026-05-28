import React from "react";
import AnimatedCounter from "./AnimatedCounter";
import { BookOpen, Users, Headphones, Trophy } from "lucide-react";

const STATS = [
  { value: 12500, suffix: "+", label: "Urdu Poems", urdu: "اردو نظمیں", icon: <BookOpen /> },
  { value: 320, suffix: "+", label: "Verified Poets", urdu: "تصدیق شدہ شعرا", icon: <Users /> },
  { value: 4800, suffix: "+", label: "Audio Recitations", urdu: "آڈیو تلاوتیں", icon: <Headphones /> },
  { value: 84, suffix: "", label: "Live Mushairas", urdu: "مشاعرے", icon: <Trophy /> },
];

export default function StatsSection() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bes-glass bes-glass-frame rounded-2xl p-10 grid grid-cols-2 md:grid-cols-4 gap-6 bes-fade-up relative">
          {STATS.map((s, i) => (
            <div key={s.label} className="text-center relative">
              {i > 0 && (
                <span className="hidden md:block bes-vsep absolute left-0 top-2 bottom-2" />
              )}
              <div className="bes-medallion mx-auto mb-4">
                {s.icon}
              </div>
              <div className="text-3xl md:text-4xl font-bold bes-gold-text">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div className="text-amber-100/80 text-sm mt-2 tracking-wider uppercase">{s.label}</div>
              <div
                dir="rtl"
                className="bes-urdu-display text-amber-100/60 text-sm mt-1"
              >
                {s.urdu}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
