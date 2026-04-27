import React from "react";
import { Pause, Play, Square } from "lucide-react";

const AudioPlayer = ({
  loading,
  disabled,
  isPlaying,
  isPaused,
  progress,
  displayCurrent,
  displayTotal,
  onPlay,
  onPause,
  onResume,
  onStop,
  onSeek,
}) => {
  return (
    <div className="space-y-4" role="group" aria-label="ElevenLabs Urdu audio player">
      <div className="rounded-xl bg-white p-3 shadow-inner">
        <div className="mb-2 flex items-center justify-between text-sm text-urdu-brown/80">
          <span>{displayCurrent}</span>
          <span>{displayTotal}</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={Number.isFinite(progress) ? progress : 0}
          onChange={(event) => onSeek(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-amber-100 accent-amber-500"
          aria-label="Playback progress"
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-urdu-brown shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          onClick={onStop}
          disabled={disabled || (!isPlaying && !isPaused)}
          aria-label="Stop"
        >
          <Square className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="grid h-24 w-24 place-items-center rounded-full bg-[radial-gradient(circle,#f5e6c9_0%,#e6c181_34%,#b07a34_100%)] text-urdu-dark shadow-[0_0_30px_rgba(212,175,55,0.45)] transition hover:scale-[1.03] disabled:opacity-40"
          onClick={isPlaying ? onPause : isPaused ? onResume : onPlay}
          disabled={disabled || loading}
          aria-label="Play or Pause"
        >
          {isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
        </button>

        <button
          type="button"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-urdu-brown shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          onClick={isPaused ? onResume : onPause}
          disabled={disabled || (!isPlaying && !isPaused)}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
      </div>

      {loading && <p className="text-center text-xs text-urdu-brown/75">Generating AI recitation...</p>}
    </div>
  );
};

export default AudioPlayer;
