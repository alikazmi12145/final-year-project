/**
 * useElevenTTS – React hook for Urdu Poetry Text-to-Speech.
 *
 * Playback priority:
 *   1. ElevenLabs via POST /api/tts/generate  (best quality, needs ELEVENLABS_API_KEY)
 *   2. Web Speech API with native Urdu OS voice (Windows 10/11 / Android / Chrome)
 *
 * Why Web Speech for Urdu:
 *   The backend gTTS (npm) fallback sends Arabic-script Urdu to Google Translate TTS
 *   which returns a valid-length but completely silent MP3. The browser's native Urdu
 *   voice (Microsoft Urdu Online on Windows, Google Urdu on Android/Chrome) actually
 *   pronounces the text correctly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const DEFAULT_DELAY_MS = 420;
/** Valid spoken-word MP3 is always > 1 KB; smaller = silent header-only file. */
const MIN_AUDIO_BYTES = 1024;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** True when text contains Arabic-script characters (Urdu / Arabic / Farsi). */
const isUrduScript = (text = "") => /[\u0600-\u06FF]/.test(text);

/** Split poem into non-empty trimmed lines. */
const splitPoetryLines = (text = "") =>
  text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Merge lines shorter than minLen chars with the next line.
 * TTS engines cannot voice single-word / punctuation-only fragments reliably.
 */
const bundleShortLines = (lines, minLen = 6) => {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length < minLen && i + 1 < lines.length) {
      out.push(`${lines[i]} ${lines[i + 1]}`);
      i++;
    } else {
      out.push(lines[i]);
    }
  }
  return out;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Web Speech API (Urdu native voice) ──────────────────────────────────────

/** Return the best available Urdu voice from the browser's speech synthesis. */
const getUrduVoice = () => {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "ur-PK") ||
    voices.find((v) => v.lang === "ur") ||
    voices.find((v) => v.lang.startsWith("ur")) ||
    null
  );
};

/**
 * Speak a single line via the Web Speech API.
 * Resolves when done (or on error) so the caller's loop can continue.
 */
const webSpeakLine = (text) =>
  new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel(); // stop any previous utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ur-PK";
    utterance.rate = 0.85; // slightly slower — better for poetry
    const voice = getUrduVoice();
    if (voice) utterance.voice = voice;
    utterance.onend   = resolve;
    utterance.onerror = resolve; // skip on error; don't break the recitation
    window.speechSynthesis.speak(utterance);
  });

// ─────────────────────────────────────────────────────────────────────────────

const useElevenTTS = () => {
  // ── Refs (no re-render needed) ────────────────────────────────────────────
  const audioRef   = useRef(null);  // hidden <audio> DOM element
  const blobUrlRef = useRef("");    // current blob: URL — kept for cleanup
  const abortRef   = useRef(false); // set true by stopAudio to break loops

  // ── State ─────────────────────────────────────────────────────────────────
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [isPaused,        setIsPaused]        = useState(false);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [progress,        setProgress]        = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  /**
   * True when the browser/OS has a native Urdu voice installed.
   * Examples: "Microsoft Urdu Online" (Windows 10/11), Google Urdu (Android/Chrome).
   * When true, playback uses Web Speech API instead of the gTTS backend fallback,
   * which generates silent MP3 files for Arabic-script Urdu text.
   */
  const [hasWebSpeechUrdu, setHasWebSpeechUrdu] = useState(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return false;
    return window.speechSynthesis.getVoices().some((v) => v.lang.startsWith("ur"));
  });

  // ── Create the hidden <audio> element once ────────────────────────────────
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.volume  = 1;
    audio.muted   = false;
    // Must be attached to the DOM for browsers to fire timeupdate / ended reliably.
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
    const onPlay  = () => { setIsPlaying(true);  setIsPaused(false); };
    const onPause = () => { if (!audio.ended) { setIsPlaying(false); setIsPaused(true); } };
    const onEnded = () => { setIsPlaying(false); setIsPaused(false); };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play",       onPlay);
    audio.addEventListener("pause",      onPause);
    audio.addEventListener("ended",      onEnded);

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play",       onPlay);
      audio.removeEventListener("pause",      onPause);
      audio.removeEventListener("ended",      onEnded);
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // ── Detect native Urdu voice (Chrome fires voiceschanged; Firefox is sync) ─
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

  // ── Fetch one chunk from the backend (ElevenLabs) and return an audio Blob ─
  const fetchAudioBlob = useCallback(async (text, voiceId) => {
    const res = await fetch(`${API_BASE_URL}/tts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!res.ok) {
      let msg = `TTS request failed (HTTP ${res.status})`;
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
      } catch { /* keep default msg */ }
      throw new Error(msg);
    }

    const raw = await res.blob();
    // Debug: log response size so you can verify audio is not empty.
    console.log(`[TTS] received ${raw.size} bytes  mime: ${raw.type}`);

    if (!raw.size) throw new Error("Server returned an empty audio file.");
    if (raw.size < MIN_AUDIO_BYTES) {
      throw new Error(
        `Audio too small (${raw.size} B) — file is likely silent. ` +
        "Check that ELEVENLABS_API_KEY is set in backend/.env"
      );
    }

    // Pin the MIME type so browsers always decode it as MP3.
    return new Blob([raw], { type: "audio/mpeg" });
  }, []);

  // ── Load a Blob into <audio> and wait until playback finishes ─────────────
  const playBlob = useCallback(
    (blob) =>
      new Promise((resolve, reject) => {
        const audio = audioRef.current;
        if (!audio) return reject(new Error("Audio element not initialised."));

        // Release the previous blob URL to avoid memory leaks.
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = "";
        }

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const onEnded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error("Audio playback error.")); };
        const cleanup = () => {
          audio.removeEventListener("ended", onEnded);
          audio.removeEventListener("error", onError);
        };

        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);

        // Setting .src triggers load automatically — no need to call audio.load().
        // Call play() directly; the browser buffers in the background.
        audio.src = url;
        audio.play().catch((err) => {
          // AbortError = a newer play() preempted this one — perfectly safe.
          if (err.name !== "AbortError") { cleanup(); reject(err); }
        });
      }),
    []
  );

  // ── stopAudio ─────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    abortRef.current = true; // signal the recitation loop to exit

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }

    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
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
    await audio.play().catch(() => {});
    setIsPlaying(true);
    setIsPaused(false);
  }, []);

  // ── seekTo (0–100 %) ──────────────────────────────────────────────────────
  const seekTo = useCallback((pct) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration === 0) return;
    audio.currentTime = (Math.max(0, Math.min(100, Number(pct))) / 100) * audio.duration;
  }, []);

  // ── playAudio — main entry point ──────────────────────────────────────────
  const playAudio = useCallback(
    async ({ text, voiceId, recitationMode = true, lineDelayMs = DEFAULT_DELAY_MS }) => {
      const normalizedText = (text || "").trim();
      if (!normalizedText) {
        setError("Please provide poetry text before playback.");
        return;
      }

      // Cancel whatever is currently playing and reset state.
      stopAudio();
      abortRef.current = false;
      setError("");

      const rawLines = recitationMode ? splitPoetryLines(normalizedText) : [normalizedText];
      const lines    = recitationMode ? bundleShortLines(rawLines)        : rawLines;
      if (!lines.length) { setError("No readable lines were found for recitation."); return; }

      // ── Path A: Web Speech API ──────────────────────────────────────────────
      // Use when the text is Urdu AND the OS/browser has a native Urdu voice.
      // This skips the gTTS backend which produces silent MP3 for Arabic script.
      if (isUrduScript(normalizedText) && hasWebSpeechUrdu) {
        setIsPlaying(true);
        try {
          for (let i = 0; i < lines.length; i++) {
            if (abortRef.current) break;
            setActiveLineIndex(i);
            await webSpeakLine(lines[i]);
            if (abortRef.current) break;
            if (i < lines.length - 1) await sleep(lineDelayMs);
          }
        } catch (wsErr) {
          setError(wsErr?.message || "Playback failed. Please try again.");
        } finally {
          if (!abortRef.current) {
            setIsPlaying(false);
            setIsPaused(false);
            setActiveLineIndex(-1);
          }
        }
        return;
      }

      // ── Path B: ElevenLabs via backend ─────────────────────────────────────
      try {
        for (let i = 0; i < lines.length; i++) {
          if (abortRef.current) break;
          setActiveLineIndex(i);
          setLoading(true);

          try {
            const blob = await fetchAudioBlob(lines[i], voiceId);
            setLoading(false);
            if (abortRef.current) break;
            await playBlob(blob);
          } catch (lineErr) {
            setLoading(false);
            // Skip one bad line; warn in console; keep going.
            console.warn(`[TTS] skipping line ${i}:`, lineErr.message);
            if (abortRef.current) break;
          }

          if (i < lines.length - 1 && !abortRef.current) await sleep(lineDelayMs);
        }
      } catch (playErr) {
        setError(playErr?.message || "Playback failed. Please try again.");
      } finally {
        setLoading(false);
        if (!abortRef.current) {
          setIsPlaying(false);
          setIsPaused(false);
          setActiveLineIndex(-1);
        }
      }
    },
    [fetchAudioBlob, hasWebSpeechUrdu, playBlob, stopAudio]
  );

  // ── downloadAudio ─────────────────────────────────────────────────────────
  const downloadAudio = useCallback(
    async ({ text, voiceId, fileName = "urdu-poetry-recitation.mp3" }) => {
      const normalizedText = (text || "").trim();
      if (!normalizedText) throw new Error("Please provide poetry text before downloading.");

      setError("");
      setLoading(true);

      try {
        const blob = await fetchAudioBlob(normalizedText, voiceId);
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (dlErr) {
        setError(dlErr?.message || "Download failed.");
        throw dlErr;
      } finally {
        setLoading(false);
      }
    },
    [fetchAudioBlob]
  );

  // ── Display time (MM:SS) ──────────────────────────────────────────────────
  const displayTime = useMemo(() => {
    const fmt = (s) => {
      const n = Math.max(0, Math.floor(s || 0));
      return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
    };
    return { current: fmt(currentTime), total: fmt(duration) };
  }, [currentTime, duration]);

  const clearError = useCallback(() => setError(""), []);

  return {
    // Actions
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
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
    hasWebSpeechUrdu,
  };
};

export default useElevenTTS;
