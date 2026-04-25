import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import PoetryPlayer from "../components/tts/PoetryPlayer";
import Footer from "../components/layout/Footer";
import { TTS_POETRY } from "../data/ttsPoetry";

const PoetryTTSPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-3xl border-0 ring-0 bg-gradient-to-br from-urdu-cream/70 via-white to-amber-50 shadow-lg">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Close TTS page"
            className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white text-urdu-maroon shadow-md transition hover:scale-105"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative px-5 py-7 sm:px-10">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(212,175,55,0.10),rgba(212,175,55,0.02)_35%,rgba(212,175,55,0.10)_95%)]" />
            <div className="relative text-center">
              <h1 className="cultural-title text-4xl font-bold tracking-wide text-urdu-maroon sm:text-6xl">
              نغمۂ سخن
              </h1>
            </div>
          </div>

          <div className="p-3 sm:p-6">
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
