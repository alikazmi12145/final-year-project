import React from "react";
import { Crown, Headphones, PlayCircle, TrendingUp } from "lucide-react";
import CalligraphyHeader from "./CalligraphyHeader";

const POETS = [
  { name: "مرزا غالب", roman: "Mirza Ghalib", era: "1797–1869", color: "from-amber-400 to-rose-500" },
  { name: "علامہ اقبال", roman: "Allama Iqbal", era: "1877–1938", color: "from-emerald-400 to-amber-500" },
  { name: "فیض احمد فیض", roman: "Faiz Ahmed Faiz", era: "1911–1984", color: "from-purple-400 to-amber-500" },
  { name: "احمد فراز", roman: "Ahmad Faraz", era: "1931–2008", color: "from-rose-400 to-yellow-500" },
];

const GHAZALS = [
  { title: "ہم تو دیوانے ہیں شب فرقت کے", poet: "احمد فراز", reads: "12.4k" },
  { title: "تم آئے ہو نہ شب انتظار گزری ہے", poet: "فیض احمد فیض", reads: "9.8k" },
  { title: "ہزاروں خواہشیں ایسی", poet: "مرزا غالب", reads: "21.3k" },
  { title: "اپنی جاں نذر کروں اپنی وفا پیش کروں", poet: "ناصر کاظمی", reads: "6.1k" },
];

const MUSHAIRAS = [
  { title: "بزمِ سخن بین الاقوامی مشاعرہ", host: "Lahore Literary Society", duration: "2h 14m" },
  { title: "شام غزل — یاد فیض", host: "Karachi Adabi Markaz", duration: "1h 42m" },
];

export default function FeaturedSections() {
  return (
    <>
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <CalligraphyHeader urdu="نمایاں شعرا" english="Featured Poets" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {POETS.map((p, idx) => (
              <div
                key={p.roman}
                className="bes-glass bes-glass-hover rounded-2xl p-6 text-center bes-fade-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div
                  className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${p.color} bes-ring-gold bes-float flex items-center justify-center text-stone-900 font-bold text-2xl`}
                >
                  {p.roman.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </div>
                <h4
                  dir="rtl"
                  className="font-nastaliq bes-gold-text text-xl mt-4"
                >
                  {p.name}
                </h4>
                <p className="text-amber-100/70 text-sm mt-1">{p.roman}</p>
                <p className="text-amber-100/50 text-xs mt-1">{p.era}</p>
                <button className="bes-btn-ghost mt-4 text-xs">Follow</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bes-glass rounded-2xl p-7 bes-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-amber-50 font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-300" />
                Trending Ghazals
              </h3>
              <span className="bes-chip">آج کے رجحانات</span>
            </div>
            <ul className="space-y-3">
              {GHAZALS.map((g, i) => (
                <li
                  key={g.title}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-amber-400/5 transition"
                >
                  <span className="text-2xl font-bold bes-gold-text w-8 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      dir="rtl"
                      className="font-nastaliq text-amber-50 truncate"
                    >
                      {g.title}
                    </p>
                    <p
                      dir="rtl"
                      className="font-nastaliq text-xs text-amber-100/60"
                    >
                      {g.poet}
                    </p>
                  </div>
                  <span className="text-xs text-amber-100/50">{g.reads}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bes-glass rounded-2xl p-7 bes-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-amber-50 font-semibold flex items-center gap-2">
                <Headphones className="w-5 h-5 text-amber-300" />
                Audio Mushaira
              </h3>
              <span className="bes-chip flex items-center gap-1">
                <Crown className="w-3 h-3" /> PREMIUM
              </span>
            </div>
            <ul className="space-y-4">
              {MUSHAIRAS.map((m) => (
                <li
                  key={m.title}
                  className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/5 to-transparent hover:from-amber-500/10 transition"
                >
                  <button className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-700 flex items-center justify-center text-stone-900 bes-ring-gold">
                    <PlayCircle className="w-7 h-7" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      dir="rtl"
                      className="font-nastaliq text-amber-50 truncate"
                    >
                      {m.title}
                    </p>
                    <p className="text-xs text-amber-100/60">{m.host}</p>
                  </div>
                  <span className="text-xs text-amber-100/60">
                    {m.duration}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
