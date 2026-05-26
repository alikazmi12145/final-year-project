import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Mic } from "lucide-react";
import PoetryPlayer from "../components/tts/PoetryPlayer";
import Footer from "../components/layout/Footer";
import { TTS_POETRY } from "../data/ttsPoetry";

const PoetryTTSPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-3xl border border-urdu-gold/25 bg-gradient-to-br from-urdu-cream/70 via-white to-amber-50 shadow-xl bsk-rise">
          {/* Classical corner brackets */}
          <span className="pointer-events-none absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-urdu-gold/60 rounded-tl-md"></span>
          <span className="pointer-events-none absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-urdu-gold/60 rounded-tr-md"></span>
          <span className="pointer-events-none absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-urdu-gold/60 rounded-bl-md"></span>
          <span className="pointer-events-none absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-urdu-gold/60 rounded-br-md"></span>

          {/* Floating background ornaments */}
          <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl bsk-float-slow"></div>
          <div className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 bg-urdu-gold/20 rounded-full blur-3xl bsk-drift"></div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Close TTS page"
            className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white text-urdu-maroon shadow-md transition hover:scale-105 hover:shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative px-5 py-8 sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(212,175,55,0.10),rgba(212,175,55,0.02)_35%,rgba(212,175,55,0.10)_95%)]" />
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-urdu-gold/30 to-urdu-maroon/15 mb-3 shadow-md bsk-float">
                <Mic className="w-7 h-7 text-urdu-maroon" />
              </div>
              <h1 className="cultural-title text-4xl font-bold tracking-wide sm:text-6xl bsk-gold-title bsk-ink-reveal">
                نغمۂ سخن
              </h1>
              <div className="flex justify-center items-center mt-4">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-urdu-gold bsk-divider-grow"></div>
                <Sparkles className="mx-3 w-4 h-4 text-urdu-gold bsk-spin-slow" />
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-urdu-gold bsk-divider-grow"></div>
              </div>
              <p className="mt-3 text-base sm:text-lg text-urdu-brown urdu-body">
                اپنی شاعری کو دل نشین آواز میں سنیں اور محفوظ کریں
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-6 relative">
            <PoetryPlayer
              title=""
              initialText={TTS_POETRY.text}
              poetName={TTS_POETRY.poetName}
              showEditor={true}
            />
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default PoetryTTSPage;
