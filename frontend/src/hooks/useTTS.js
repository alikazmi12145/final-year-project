import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const URDU_REGEX = /[\u0600-\u06FF]/;

const containsUrdu = (text = "") => URDU_REGEX.test(text);

const normalizeSpeed = (value) => {
  const allowed = [0.5, 1, 1.5, 2];
  return allowed.includes(value) ? value : 1;
};

const buildVoiceLabel = (voice) => {
  const lang = voice.lang ? ` (${voice.lang})` : "";
  return `${voice.name}${lang}`;
};

const uniqueByVoiceURI = (voices) => {
  const seen = new Set();
  return voices.filter((voice) => {
    if (!voice?.voiceURI || seen.has(voice.voiceURI)) {
      return false;
    }
    seen.add(voice.voiceURI);
    return true;
  });
};

const getPreferredVoice = (voices, wantsUrdu) => {
  if (!voices.length) {
    return null;
  }

  const urduVoice = voices.find((voice) => /\bur\b|urdu|pakistan/i.test(`${voice.lang} ${voice.name}`));
  if (wantsUrdu && urduVoice) {
    return urduVoice;
  }

  if (wantsUrdu) {
    const regionalFallback = voices.find((voice) => /\bhi\b|hindi|arabic|ar\b/i.test(`${voice.lang} ${voice.name}`));
    if (regionalFallback) {
      return regionalFallback;
    }
  }

  return voices[0];
};

export const useTTS = ({ initialText = "", initialSpeed = 1 } = {}) => {
  const [text, setText] = useState(initialText);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [speed, setSpeed] = useState(normalizeSpeed(initialSpeed));
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const synthRef = useRef(null);
  const sequenceRef = useRef({
    lines: [],
    current: 0,
    recitationMode: true,
    pauseBetweenLinesMs: 450,
    isCancelled: false,
    isManuallyPaused: false,
  });
  const timeoutRef = useRef(null);

  const isSupported = useMemo(() => {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }, []);

  const selectedVoice = useMemo(() => {
    if (!selectedVoiceURI) {
      return null;
    }
    return voices.find((voice) => voice.voiceURI === selectedVoiceURI) || null;
  }, [voices, selectedVoiceURI]);

  const cleanupTimeout = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetPlaybackState = useCallback(() => {
    cleanupTimeout();
    sequenceRef.current.current = 0;
    sequenceRef.current.lines = [];
    sequenceRef.current.isCancelled = false;
    sequenceRef.current.isManuallyPaused = false;
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
  }, [cleanupTimeout]);

  const stop = useCallback(() => {
    cleanupTimeout();
    sequenceRef.current.isCancelled = true;
    sequenceRef.current.isManuallyPaused = false;
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
  }, [cleanupTimeout]);

  const speakNextLine = useCallback(() => {
    const sequence = sequenceRef.current;

    if (!isSupported || sequence.isCancelled || sequence.isManuallyPaused) {
      return;
    }

    if (!sequence.lines.length || sequence.current >= sequence.lines.length) {
      resetPlaybackState();
      return;
    }

    const line = sequence.lines[sequence.current];
    setCurrentLineIndex(sequence.current);

    const utterance = new SpeechSynthesisUtterance(line);
    const voiceToUse = selectedVoice || getPreferredVoice(voices, containsUrdu(line));
    utterance.voice = voiceToUse || null;
    utterance.lang = voiceToUse?.lang || (containsUrdu(line) ? "ur-PK" : "en-US");
    utterance.rate = speed;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      sequenceRef.current.isManuallyPaused = false;
    };

    utterance.onend = () => {
      if (sequenceRef.current.isCancelled) {
        return;
      }

      sequenceRef.current.current += 1;

      if (sequenceRef.current.current >= sequenceRef.current.lines.length) {
        resetPlaybackState();
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        if (!sequenceRef.current.isManuallyPaused) {
          speakNextLine();
        }
      }, sequenceRef.current.recitationMode ? sequenceRef.current.pauseBetweenLinesMs : 75);
    };

    utterance.onerror = () => {
      setError("Speech playback failed. Please try another voice or reduce speed.");
      stop();
    };

    synthRef.current.speak(utterance);
  }, [isSupported, resetPlaybackState, selectedVoice, speed, stop, voices]);

  const play = useCallback(
    ({ customText, recitationMode = true, pauseBetweenLinesMs = 450 } = {}) => {
      if (!isSupported) {
        setError("Your browser does not support Speech Synthesis.");
        return;
      }

      const rawText = (customText ?? text ?? "").trim();
      if (!rawText) {
        setError("Please provide Urdu poetry text before playing.");
        return;
      }

      setError("");
      setWarning("");

      // Stop any previous speech to avoid overlapping recitations.
      stop();

      const lines = rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        setError("No speakable lines found. Please check the text formatting.");
        return;
      }

      const wantsUrdu = containsUrdu(rawText);
      const fallbackVoice = getPreferredVoice(voices, wantsUrdu);

      if (wantsUrdu && fallbackVoice && !/\bur\b|urdu|pakistan/i.test(`${fallbackVoice.lang} ${fallbackVoice.name}`)) {
        setWarning("Dedicated Urdu voice is unavailable. Using closest available voice.");
      }

      if (wantsUrdu && !fallbackVoice) {
        setWarning("No system voice detected. Speech may fail until voices are loaded.");
      }

      sequenceRef.current = {
        lines,
        current: 0,
        recitationMode,
        pauseBetweenLinesMs,
        isCancelled: false,
        isManuallyPaused: false,
      };

      // Give the browser a short tick after cancel() before queuing the next utterance.
      window.setTimeout(() => {
        if (!sequenceRef.current.isCancelled) {
          speakNextLine();
        }
      }, 60);
    },
    [isSupported, speakNextLine, stop, text, voices]
  );

  const pause = useCallback(() => {
    if (!isSupported || !synthRef.current) {
      return;
    }
    sequenceRef.current.isManuallyPaused = true;
    if (synthRef.current.speaking) {
      synthRef.current.pause();
    }
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported || !synthRef.current) {
      return;
    }
    sequenceRef.current.isManuallyPaused = false;
    if (synthRef.current.paused) {
      synthRef.current.resume();
    } else if (!synthRef.current.speaking && sequenceRef.current.lines.length > 0) {
      speakNextLine();
    }
    setIsPaused(false);
  }, [isSupported, speakNextLine]);

  useEffect(() => {
    setText(initialText || "");
  }, [initialText]);

  useEffect(() => {
    if (!isSupported) {
      setError("Speech synthesis is not supported in this browser.");
      return undefined;
    }

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const refreshVoices = () => {
      const loadedVoices = uniqueByVoiceURI(synth.getVoices());
      setVoices(loadedVoices);

      if (!loadedVoices.length) {
        setWarning("No speech voices are available yet. Try again in a moment.");
        return;
      }

      setWarning((prev) => (prev.includes("No speech voices") ? "" : prev));

      setSelectedVoiceURI((currentVoice) => {
        if (currentVoice && loadedVoices.some((voice) => voice.voiceURI === currentVoice)) {
          return currentVoice;
        }

        const preferred = getPreferredVoice(loadedVoices, containsUrdu(text || initialText));
        return preferred?.voiceURI || "";
      });
    };

    refreshVoices();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", refreshVoices);
    } else {
      synth.onvoiceschanged = refreshVoices;
    }

    return () => {
      if (typeof synth.removeEventListener === "function") {
        synth.removeEventListener("voiceschanged", refreshVoices);
      } else {
        synth.onvoiceschanged = null;
      }
      stop();
    };
  }, [initialText, isSupported, stop]);

  const availableVoices = useMemo(() => {
    return voices.map((voice) => ({
      value: voice.voiceURI,
      label: buildVoiceLabel(voice),
      lang: voice.lang,
      isUrduLike: /\bur\b|urdu|pakistan/i.test(`${voice.lang} ${voice.name}`),
    }));
  }, [voices]);

  return {
    text,
    setText,
    speed,
    setSpeed: (value) => setSpeed(normalizeSpeed(value)),
    isSupported,
    isSpeaking,
    isPaused,
    currentLineIndex,
    error,
    warning,
    availableVoices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    play,
    pause,
    resume,
    stop,
  };
};

export default useTTS;
