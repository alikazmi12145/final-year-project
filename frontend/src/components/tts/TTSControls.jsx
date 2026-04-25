import React from "react";
import { Pause, Play, Square, SkipBack, SkipForward } from "lucide-react";

const TTSControls = ({
  canPlay,
  isSpeaking,
  isPaused,
  speed,
  onSpeedChange,
  onPlay,
  onPause,
  onResume,
  onStop,
}) => {
  const speeds = [0.5, 1, 1.5, 2];

  return (
    <div className="space-y-4" role="group" aria-label="Text to speech controls">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-urdu-brown shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          onClick={onStop}
          disabled={!isSpeaking && !isPaused}
          aria-label="Stop"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="grid h-24 w-24 place-items-center rounded-full bg-[radial-gradient(circle,#f5e6c9_0%,#e6c181_34%,#b07a34_100%)] text-urdu-dark shadow-[0_0_30px_rgba(212,175,55,0.45)] transition hover:scale-[1.03] disabled:opacity-40"
          onClick={isSpeaking && !isPaused ? onPause : isPaused ? onResume : onPlay}
          disabled={!canPlay && !isPaused}
          aria-label="Play or Pause"
        >
          {isSpeaking && !isPaused ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
        </button>

        <button
          type="button"
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-urdu-brown shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          onClick={onStop}
          disabled={!isSpeaking && !isPaused}
          aria-label="Stop"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-urdu-brown shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          onClick={onPause}
          disabled={!isSpeaking || isPaused}
        >
          <Pause className="h-3.5 w-3.5" />
          Pause
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-urdu-brown shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          onClick={onResume}
          disabled={!isSpeaking || !isPaused}
        >
          <Play className="h-3.5 w-3.5" />
          Resume
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-urdu-brown shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          onClick={onStop}
          disabled={!isSpeaking && !isPaused}
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      </div>

      <div>
        <p className="mb-2 text-center text-sm text-urdu-brown">رفتار (Speed)</p>
        <div className="grid grid-cols-4 overflow-hidden rounded-full bg-white shadow-inner">
          {speeds.map((option) => {
            const active = speed === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSpeedChange(option)}
                className={`py-2 text-sm transition ${
                  active
                    ? "bg-[linear-gradient(180deg,#e7c889,#c2914d)] font-semibold text-urdu-dark"
                    : "text-urdu-brown hover:bg-amber-50"
                }`}
              >
                {option}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TTSControls;
