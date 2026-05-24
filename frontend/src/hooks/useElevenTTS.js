/**
 * useElevenTTS — React hook powering the Urdu Poetry Text-to-Speech player.
 *
 * NOTE
 * ----
 * The public surface (returned object shape) of this hook is unchanged, so
 * components that consume it (PoetryPlayer.jsx, AudioPlayer.jsx) do NOT need
 * to be modified. Internally it now talks to the new production backend:
 *
 *   POST /api/tts/generate   →  { success, data: { audioUrl, duration, ... } }
 *
 * The single MP3 URL returned by the backend is played through one HTMLAudio
 * element, which gives us:
 *   - real (browser-reported) duration
 *   - accurate seek (Range-supported audio stream on the backend)
 *   - reliable play / pause / resume / stop
 *   - mobile-browser compatibility
 *
 * A Web Speech API fallback is preserved for cases when the network is
 * offline or the backend has no TTS provider configured at all.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// ── Pure helpers ─────────────────────────────────────────────────────────────

const isUrduScript = (text = "") => /[\u0600-\u06FF]/.test(text);

const splitPoetryLines = (text = "") =>
  text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const formatClock = (seconds) => {
  const n = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
};

// ── Web Speech API (offline / no-key fallback for Urdu) ──────────────────────

const getUrduVoice = () => {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "ur-PK") ||
    voices.find((v) => v.lang === "ur") ||
    voices.find((v) => v.lang.startsWith("ur")) ||
    null
  );
};

const webSpeakLine = (text, rate = 0.85) =>
  new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ur-PK";
    utterance.rate = rate;
    const voice = getUrduVoice();
    if (voice) utterance.voice = voice;
    utterance.onend   = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });

// ─────────────────────────────────────────────────────────────────────────────

const useElevenTTS = () => {
  // ── Refs (no re-render needed) ────────────────────────────────────────────
  const audioRef    = useRef(null);
  const abortCtlRef = useRef(null);  // AbortController for in-flight fetch
  const abortRef    = useRef(false); // signals the Web-Speech loop to stop

  // ── State ─────────────────────────────────────────────────────────────────
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [isPaused,        setIsPaused]        = useState(false);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [progress,        setProgress]        = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [playbackRate,    setPlaybackRateState] = useState(1);

  const [hasWebSpeechUrdu, setHasWebSpeechUrdu] = useState(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return false;
    return window.speechSynthesis.getVoices().some((v) => v.lang.startsWith("ur"));
  });

  // ── Create the hidden <audio> element exactly once ────────────────────────
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.volume  = 1;
    // NOTE: do NOT set crossOrigin — when the server doesn't return
    // Access-Control-Allow-Origin, browsers (Chrome/Edge) refuse to *play*
    // the audio at all, even though the file loads. We don't need canvas
    // access, so anonymous CORS just causes silent failures.
    audio.style.cssText = "display:none;position:fixed;pointer-events:none;";
    document.body.appendChild(audio);
    audioRef.current = audio;

    const onTime  = () => {
      const t = audio.currentTime || 0;
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      setCurrentTime(t);
      setDuration(d);
      setProgress(d > 0 ? (t / d) * 100 : 0);
    };
    const onMeta  = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onPlay  = () => { setIsPlaying(true);  setIsPaused(false); };
    const onPause = () => { if (!audio.ended) { setIsPlaying(false); setIsPaused(true); } };
    const onEnded = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveLineIndex(-1);
      setProgress(100);
    };
    const onError = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setError("Audio playback failed. Please try again.");
    };

    audio.addEventListener("timeupdate",      onTime);
    audio.addEventListener("loadedmetadata",  onMeta);
    audio.addEventListener("play",            onPlay);
    audio.addEventListener("pause",           onPause);
    audio.addEventListener("ended",           onEnded);
    audio.addEventListener("error",           onError);

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.removeEventListener("timeupdate",     onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("ended",          onEnded);
      audio.removeEventListener("error",          onError);
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      if (abortCtlRef.current) abortCtlRef.current.abort();
    };
  }, []);

  // ── Detect native Urdu voice (Chrome fires voiceschanged async) ───────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const check = () =>
      setHasWebSpeechUrdu(
        window.speechSynthesis.getVoices().some((v) => v.lang.startsWith("ur"))
      );
    window.speechSynthesis.addEventListener("voiceschanged", check);
    check();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", check);
  }, []);

  // ── Backend call: generate (or retrieve cached) MP3 URL ───────────────────
  const requestRecitation = useCallback(async ({
    text,
    voice,
    mode = "poetry",
    speed = 1,
    provider = "auto",
  }) => {
    if (abortCtlRef.current) abortCtlRef.current.abort();
    const controller = new AbortController();
    abortCtlRef.current = controller;

    const res = await fetch(`${API_BASE_URL}/tts/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text, voice, mode, speed, provider }),
      signal:  controller.signal,
    });

    let payload = null;
    try { payload = await res.json(); } catch { /* non-JSON server error */ }

    if (!res.ok || !payload?.success) {
      const msg = payload?.message || `TTS request failed (HTTP ${res.status})`;
      throw new Error(msg);
    }
    return payload.data;
  }, []);

  // ── stopAudio ─────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    abortRef.current = true;
    if (abortCtlRef.current) { abortCtlRef.current.abort(); abortCtlRef.current = null; }

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }

    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentTime(0);
    setActiveLineIndex(-1);
    setLoading(false);
  }, []);

  // ── pauseAudio ────────────────────────────────────────────────────────────
  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
    if (window.speechSynthesis?.speaking) window.speechSynthesis.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  // ── resumeAudio ───────────────────────────────────────────────────────────
  const resumeAudio = useCallback(async () => {
    if (window.speechSynthesis?.paused) { window.speechSynthesis.resume(); return; }
    const audio = audioRef.current;
    if (!audio?.src) return;
    try {
      await audio.play();
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      if (err.name !== "AbortError") setError("Unable to resume playback.");
    }
  }, []);

  // ── seekTo (0–100 %) ──────────────────────────────────────────────────────
  const seekTo = useCallback((pct) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration === 0) return;
    const clamped = Math.max(0, Math.min(100, Number(pct)));
    audio.currentTime = (clamped / 100) * audio.duration;
  }, []);

  // ── setPlaybackRate ───────────────────────────────────────────────────────
  const setPlaybackRate = useCallback((rate) => {
    const safe = Math.max(0.5, Math.min(2, Number(rate) || 1));
    setPlaybackRateState(safe);
    if (audioRef.current) audioRef.current.playbackRate = safe;
  }, []);

  // ── playAudio — main entry point ──────────────────────────────────────────
  const playAudio = useCallback(
    async ({
      text,
      voiceId,
      voice,
      recitationMode = true,
      lineDelayMs = 420,        // kept for API compatibility, used by Web Speech fallback
      speed = 1,
      provider = "auto",
    }) => {
      const normalizedText = (text || "").trim();
      if (!normalizedText) {
        setError("Please provide poetry text before playback.");
        return;
      }

      stopAudio();
      abortRef.current = false;
      setError("");
      setLoading(true);

      try {
        // ── Path A: backend (Google / ElevenLabs / gTTS) ───────────────────
        const data = await requestRecitation({
          text:     normalizedText,
          voice:    voice || voiceId,
          mode:     recitationMode ? "poetry" : "normal",
          speed,
          provider,
        });

        const audio = audioRef.current;
        if (!audio) throw new Error("Audio element not ready.");

        audio.src = data.audioUrl;
        audio.playbackRate = playbackRate;
        audio.load();
        await audio.play();
        setLoading(false);
      } catch (err) {
        setLoading(false);
        if (err.name === "AbortError") return;
        console.warn("[TTS] backend failed → trying Web Speech:", err.message);

        // ── Path B: Web Speech fallback (only if Urdu voice present) ───────
        if (isUrduScript(normalizedText) && hasWebSpeechUrdu) {
          const lines = recitationMode ? splitPoetryLines(normalizedText) : [normalizedText];
          setIsPlaying(true);
          try {
            for (let i = 0; i < lines.length; i += 1) {
              if (abortRef.current) break;
              setActiveLineIndex(i);
              await webSpeakLine(lines[i], Math.max(0.5, Math.min(1.5, speed * 0.9)));
              if (abortRef.current) break;
              if (i < lines.length - 1) await sleep(lineDelayMs);
            }
          } finally {
            if (!abortRef.current) {
              setIsPlaying(false);
              setIsPaused(false);
              setActiveLineIndex(-1);
            }
          }
          return;
        }

        setError(err.message || "Playback failed. Please try again.");
      }
    },
    [hasWebSpeechUrdu, playbackRate, requestRecitation, stopAudio]
  );

  // ── downloadAudio ─────────────────────────────────────────────────────────
  const downloadAudio = useCallback(
    async ({
      text,
      voiceId,
      voice,
      fileName = "urdu-poetry-recitation.mp3",
      speed = 1,
      recitationMode = true,
      provider = "auto",
    }) => {
      const normalizedText = (text || "").trim();
      if (!normalizedText) throw new Error("Please provide poetry text before downloading.");

      setError("");
      setLoading(true);
      try {
        const data = await requestRecitation({
          text: normalizedText,
          voice: voice || voiceId,
          mode: recitationMode ? "poetry" : "normal",
          speed,
          provider,
        });

        // Fetch the MP3 as a blob so the browser triggers a real "Save As"
        // dialog instead of opening it in a new tab.
        const blobRes = await fetch(data.audioUrl);
        if (!blobRes.ok) throw new Error("Could not download generated audio.");
        const blob = await blobRes.blob();

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err.message || "Download failed.");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [requestRecitation]
  );

  // ── Display time (MM:SS) ──────────────────────────────────────────────────
  const displayTime = useMemo(
    () => ({ current: formatClock(currentTime), total: formatClock(duration) }),
    [currentTime, duration]
  );

  const clearError = useCallback(() => setError(""), []);

  return {
    // Actions
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    setPlaybackRate,
    downloadAudio,
    clearError,
    // State
    loading,
    error,
    isPlaying,
    isPaused,
    progress,
    currentTime,
    duration,
    displayTime,
    activeLineIndex,
    playbackRate,
    hasWebSpeechUrdu,
  };
};

export default useElevenTTS;
