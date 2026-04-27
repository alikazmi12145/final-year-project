import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const DEFAULT_DELAY_MS = 420;

const splitPoetryLines = (text = "") =>
  text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const formatErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (payload?.message) {
      return payload.message;
    }
  } catch {
    // Fall through to generic message.
  }
  return "Unable to generate recitation audio.";
};

const useElevenTTS = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  const audioRef = useRef(null);
  const objectUrlRef = useRef("");
  const playTokenRef = useRef(0);
  const playbackResolverRef = useRef(null);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      window.URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }, []);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const onTimeUpdate = () => {
      const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const total = Number.isFinite(audio.duration) ? audio.duration : 0;
      setCurrentTime(time);
      setDuration(total);
      setProgress(total > 0 ? (time / total) * 100 : 0);
    };

    const onPause = () => {
      if (!audio.ended) {
        setIsPaused(true);
        setIsPlaying(false);
      }
    };

    const onPlay = () => {
      setIsPaused(false);
      setIsPlaying(true);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      cleanupObjectUrl();
    };
  }, [cleanupObjectUrl]);

  const requestAudioBlob = useCallback(async ({ text, voiceId }) => {
    const response = await fetch(`${API_BASE_URL}/tts/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      throw new Error(await formatErrorMessage(response));
    }

    const rawBlob = await response.blob();
    if (!rawBlob || rawBlob.size === 0) {
      throw new Error("Generated audio is empty.");
    }
    // Explicitly set MIME type so the browser always treats it as audio/mpeg
    const blob = new Blob([rawBlob], { type: "audio/mpeg" });

    return blob;
  }, []);

  const wait = useCallback((ms) => new Promise((resolve) => window.setTimeout(resolve, ms)), []);

  const settleCurrentPlayback = useCallback(() => {
    if (typeof playbackResolverRef.current === "function") {
      playbackResolverRef.current();
      playbackResolverRef.current = null;
    }
  }, []);

  const playBlobAndWait = useCallback(
    async (blob, token) => {
      const audio = audioRef.current;
      if (!audio) {
        throw new Error("Audio engine is not ready.");
      }

      cleanupObjectUrl();
      const objectUrl = window.URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;

      return new Promise((resolve, reject) => {
        const finalize = (handler) => {
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("error", handleError);
          playbackResolverRef.current = null;
          handler();
        };

        const handleEnded = () => finalize(resolve);
        const handleError = () => finalize(() => reject(new Error("Audio playback failed.")));

        playbackResolverRef.current = () => finalize(resolve);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        audio.src = objectUrl;
        audio.load(); // explicitly trigger load before play
        audio
          .play()
          .then(() => {
            if (playTokenRef.current !== token) {
              finalize(resolve);
            }
          })
          .catch((playbackError) => {
            finalize(() => reject(playbackError));
          });
      });
    },
    [cleanupObjectUrl]
  );

  const stopAudio = useCallback(() => {
    playTokenRef.current += 1;
    settleCurrentPlayback();

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }

    cleanupObjectUrl();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setActiveLineIndex(-1);
  }, [cleanupObjectUrl, settleCurrentPlayback]);

  const pauseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const resumeAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    await audio.play();
    setIsPaused(false);
    setIsPlaying(true);
  }, []);

  const seekTo = useCallback((nextProgress) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    const bounded = Math.max(0, Math.min(100, Number(nextProgress)));
    audio.currentTime = (bounded / 100) * audio.duration;
  }, []);

  const playAudio = useCallback(
    async ({ text, voiceId, recitationMode = true, lineDelayMs = DEFAULT_DELAY_MS }) => {
      const normalizedText = (text || "").trim();
      if (!normalizedText) {
        setError("Please provide poetry text before playback.");
        return;
      }

      setError("");
      stopAudio();

      const token = playTokenRef.current;
      const lines = recitationMode ? splitPoetryLines(normalizedText) : [normalizedText];

      if (!lines.length) {
        setError("No readable lines were found for recitation.");
        return;
      }

      try {
        for (let index = 0; index < lines.length; index += 1) {
          if (playTokenRef.current !== token) {
            return;
          }

          setActiveLineIndex(index);
          setLoading(true);
          const blob = await requestAudioBlob({ text: lines[index], voiceId });
          setLoading(false);

          if (playTokenRef.current !== token) {
            return;
          }

          await playBlobAndWait(blob, token);

          if (index < lines.length - 1) {
            await wait(lineDelayMs);
          }
        }
      } catch (playError) {
        setError(playError?.message || "Playback failed. Please try again.");
      } finally {
        setLoading(false);
        if (playTokenRef.current === token) {
          setIsPlaying(false);
          setIsPaused(false);
          setActiveLineIndex(-1);
        }
      }
    },
    [playBlobAndWait, requestAudioBlob, stopAudio, wait]
  );

  const downloadAudio = useCallback(
    async ({ text, voiceId, fileName = "urdu-poetry-recitation.mp3" }) => {
      const normalizedText = (text || "").trim();
      if (!normalizedText) {
        throw new Error("Please provide poetry text before downloading.");
      }

      setError("");
      setLoading(true);

      try {
        const blob = await requestAudioBlob({ text: normalizedText, voiceId });
        const downloadUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(downloadUrl);
      } finally {
        setLoading(false);
      }
    },
    [requestAudioBlob]
  );

  const displayTime = useMemo(() => {
    const toClock = (value) => {
      const total = Math.max(0, Math.floor(value));
      const mm = String(Math.floor(total / 60)).padStart(2, "0");
      const ss = String(total % 60).padStart(2, "0");
      return `${mm}:${ss}`;
    };

    return {
      current: toClock(currentTime),
      total: toClock(duration),
    };
  }, [currentTime, duration]);

  return {
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    downloadAudio,
    loading,
    error,
    clearError,
    isPlaying,
    isPaused,
    progress,
    currentTime,
    duration,
    displayTime,
    activeLineIndex,
  };
};

export default useElevenTTS;
