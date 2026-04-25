import React, { useEffect, useMemo, useRef, useState } from "react";
import TTSControls from "./TTSControls";
import VoiceSelector from "./VoiceSelector";
import DownloadButton from "./DownloadButton";
import useTTS from "../../hooks/useTTS";
import { Mic, Feather, Disc, Upload } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const formatFileName = (title = "urdu-poetry-recitation") => {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return normalized ? `${normalized}.mp3` : "urdu-poetry-recitation.mp3";
};

const splitLines = (value) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const isUrduText = (value = "") => /[\u0600-\u06FF]/.test(value);

const parseImportedPoetry = (content = "") => {
  const trimmed = content.trim();
  if (!trimmed) {
    return { poetName: "", text: "" };
  }

  try {
    const payload = JSON.parse(trimmed);
    if (payload && typeof payload === "object") {
      const poetName = (payload.poetName || payload.poet || "").toString().trim();
      const text = (payload.text || payload.poetry || "").toString().trim();
      if (text) {
        return { poetName, text };
      }
    }
  } catch {
    // Treat as plain text when JSON parsing fails.
  }

  const lines = trimmed.split(/\r?\n/);
  const firstLine = (lines[0] || "").trim();
  const poetLineMatch = firstLine.match(/^(?:شاعر|poet)\s*[:：]\s*(.+)$/i);

  if (poetLineMatch) {
    return {
      poetName: poetLineMatch[1].trim(),
      text: lines.slice(1).join("\n").trim(),
    };
  }

  return { poetName: "", text: trimmed };
};

const extractTextFromPdf = async (file) => {
  const pdfBytes = new Uint8Array(await file.arrayBuffer());

  const collectPdfText = async (getDocument) => {
    const loadingTask = getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (text) {
        pages.push(text);
      }
    }

    return pages.join("\n\n").trim();
  };

  try {
    const [pdfjsLib, workerSrcModule] = await Promise.all([
      import("pdfjs-dist/build/pdf.mjs"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);

    if (pdfjsLib.GlobalWorkerOptions && workerSrcModule?.default) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrcModule.default;
    }

    const extracted = await collectPdfText(pdfjsLib.getDocument);
    if (extracted) {
      return extracted;
    }
  } catch {
    // Fall back to legacy parser without worker if modern parser path fails.
  }

  const legacyPdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const legacyLoadingTask = legacyPdfjsLib.getDocument({
    data: pdfBytes,
    disableWorker: true,
    useSystemFonts: true,
  });
  const legacyPdf = await legacyLoadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= legacyPdf.numPages; pageNumber += 1) {
    const page = await legacyPdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      pages.push(text);
    }
  }

  const extractedText = pages.join("\n\n").trim();
  if (!extractedText) {
    throw new Error("PDF میں readable text نہیں ملا۔ یہ scanned/image-based PDF ہو سکتی ہے۔");
  }

  return extractedText;
};

const PoetryPlayer = ({
  initialText = "",
  title = "Urdu Poetry Recitation",
  poetName = "نامعلوم",
  showEditor = true,
}) => {
  const hasTitle = typeof title === "string" && title.trim().length > 0;
  const fileInputRef = useRef(null);
  const [editablePoetName, setEditablePoetName] = useState(poetName || "");
  const [importError, setImportError] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState("");
  const [recitationMode, setRecitationMode] = useState(true);

  const {
    text,
    setText,
    speed,
    setSpeed,
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
  } = useTTS({ initialText });

  useEffect(() => {
    setEditablePoetName(poetName || "");
  }, [poetName]);

  const poetryLines = useMemo(() => splitLines(text), [text]);
  const approxDuration = useMemo(() => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const seconds = Math.max(30, Math.round((words / 2.4) * (1 / speed)));
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [text, speed]);

  const waveformBars = useMemo(
    () => [4, 8, 12, 7, 10, 15, 9, 6, 14, 18, 11, 7, 13, 16, 8, 6, 11, 14, 10, 7, 12, 9, 6, 8],
    []
  );

  const handleAiSearchFallbackDownload = async (preparedText) => {
    const fallbackResponse = await fetch(`${API_BASE_URL}/ai-search/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: preparedText,
        speed,
      }),
    });

    if (!fallbackResponse.ok) {
      throw new Error("Both TTS download services failed.");
    }

    const payload = await fallbackResponse.json();
    if (!payload?.audio_url) {
      throw new Error("Fallback TTS did not return downloadable audio.");
    }

    const audioResponse = await fetch(payload.audio_url);
    if (!audioResponse.ok) {
      throw new Error("Fallback audio file could not be fetched.");
    }

    return audioResponse.blob();
  };

  const handleDownload = async () => {
    const preparedText = text.trim();
    if (!preparedText) {
      return;
    }

    setDownloadError("");
    setDownloadSuccess("");
    setDownloadLoading(true);

    try {
      let blob = null;
      const response = await fetch(`${API_BASE_URL}/tts/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: preparedText,
          speed,
          language: isUrduText(preparedText) ? "ur" : "auto",
        }),
      });

      if (response.ok) {
        blob = await response.blob();
      } else {
        let message = "Failed to generate MP3 file.";
        try {
          const payload = await response.json();
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Ignore JSON parsing errors for binary/error responses.
        }

        try {
          blob = await handleAiSearchFallbackDownload(preparedText);
        } catch {
          throw new Error(message);
        }
      }

      const fileUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = formatFileName(title);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(fileUrl);
      setDownloadSuccess("MP3 generated and downloaded successfully.");
    } catch (downloadErrorValue) {
      setDownloadError(downloadErrorValue.message || "MP3 generation failed. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handlePlay = () => {
    play({
      customText: text,
      recitationMode,
      pauseBetweenLinesMs: 500,
    });
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportFile = async (event) => {
    const [file] = Array.from(event.target.files || []);
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const isPdfFile = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const content = isPdfFile ? await extractTextFromPdf(file) : await file.text();
      const parsed = parseImportedPoetry(content);

      if (!parsed.text) {
        setImportError("Imported file has no readable poetry text.");
        return;
      }

      setText(parsed.text);
      if (parsed.poetName) {
        setEditablePoetName(parsed.poetName);
      }
      setImportError("");
    } catch (importFileError) {
      setImportError(importFileError?.message || "Could not import this file. Please upload .txt, .json, or .pdf.");
    }
  };

  return (
    <section
      className="rounded-[28px] border-0 ring-0 bg-transparent p-4 text-urdu-brown shadow-none sm:p-7"
      aria-label="Urdu Poetry Text to Speech Player"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {hasTitle ? (
          <h2 className="flex items-center gap-2 text-right text-xl font-semibold text-urdu-maroon sm:text-3xl">
            <Mic className="h-5 w-5 text-urdu-gold" />
            {title}
          </h2>
        ) : (
          <span aria-hidden="true" />
        )}
        <div className="rounded-full bg-urdu-gold/15 px-4 py-2 text-sm font-semibold text-urdu-brown shadow-inner">
          {recitationMode ? "Recitation Mode" : "Normal Mode"}
        </div>
      </div>

      {!isSupported && (
        <div className="mb-3 rounded-lg border border-red-400/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">
          Speech synthesis is not supported in this browser. Please use a modern Chromium, Firefox, or Safari build.
        </div>
      )}

      {warning && <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-urdu-brown">{warning}</div>}
      {error && <div className="mb-3 rounded-lg border border-red-400/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">{error}</div>}
      {importError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</div>}
      {downloadError && <div className="mb-3 rounded-lg border border-red-400/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">{downloadError}</div>}
      {downloadSuccess && <div className="mb-3 rounded-lg border border-emerald-400/40 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-100">{downloadSuccess}</div>}

      {showEditor && (
        <div className="mb-4 rounded-2xl bg-white/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label className="w-full text-right sm:w-auto" htmlFor="poet-input">
              <span className="mb-1 block text-xs font-semibold text-urdu-brown">شاعر / Poet</span>
              <input
                id="poet-input"
                type="text"
                value={editablePoetName}
                onChange={(event) => setEditablePoetName(event.target.value)}
                placeholder="مثال: فیض احمد فیض"
                className="w-full min-w-[220px] rounded-lg bg-amber-50 px-3 py-2 text-right text-sm text-urdu-brown outline-none focus:ring-2 focus:ring-urdu-gold/30"
                dir="rtl"
              />
            </label>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json,.pdf,text/plain,application/json,application/pdf"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                type="button"
                onClick={handleImportClick}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-urdu-brown transition hover:bg-amber-200"
              >
                <Upload className="h-4 w-4" />
                Import File
              </button>
            </div>
          </div>

          <label htmlFor="poetry-input" className="mb-2 block text-right text-sm font-semibold text-urdu-brown">
            Poetry Text / شاعری
          </label>
          <textarea
            id="poetry-input"
            className="min-h-[180px] w-full rounded-xl bg-amber-50 px-3 py-2 text-right text-[1.02rem] leading-9 text-urdu-brown outline-none focus:ring-2 focus:ring-urdu-gold/30"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="اردو شاعری درج کریں..."
            dir="rtl"
            rows={6}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-urdu-cream/70 to-white p-4 shadow-md">
          <div className="mb-3 flex items-center justify-between text-sm text-urdu-brown">
            <div className="text-right">
              <p className="text-xs text-urdu-brown/70">شاعر</p>
              <p className="font-semibold text-urdu-maroon">{editablePoetName || "-"}</p>
            </div>
            <Feather className="h-5 w-5 text-urdu-gold" />
          </div>
          <div className="rounded-xl bg-white p-2" dir="rtl" aria-live="polite">
            {poetryLines.length === 0 ? (
              <p className="py-4 text-center text-urdu-brown/75">آپ کی شاعری یہاں نظر آئے گی</p>
            ) : (
              poetryLines.map((line, index) => (
                <button
                  key={`${line}-${index}`}
                  type="button"
                  className={`mb-1 w-full rounded-md px-3 py-3 text-right text-lg leading-8 transition ${
                    currentLineIndex === index
                      ? "bg-[linear-gradient(90deg,rgba(212,175,55,0.30),rgba(212,175,55,0.07))] text-urdu-maroon shadow-[inset_0_0_0_1px_rgba(212,175,55,0.45)]"
                      : "text-urdu-brown hover:bg-amber-50"
                  }`}
                >
                  {line}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-urdu-cream/70 to-white p-4 shadow-md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <VoiceSelector
              voices={availableVoices}
              selectedVoiceURI={selectedVoiceURI}
              onChange={setSelectedVoiceURI}
              disabled={!isSupported}
            />
            <label className="inline-flex items-center gap-2 rounded-full bg-urdu-gold/15 px-3 py-1 text-xs text-urdu-brown shadow-inner">
              <input
                type="checkbox"
                checked={recitationMode}
                onChange={(event) => setRecitationMode(event.target.checked)}
                className="h-3 w-3 accent-urdu-gold"
              />
              Recitation Mode
            </label>
          </div>

          <div className="mb-4 rounded-xl bg-white p-3 shadow-inner">
            <div className="mb-2 text-right text-xl text-urdu-maroon">{poetryLines[currentLineIndex] || poetryLines[0] || ""}</div>
            <div className="mb-2 flex h-8 items-end gap-[3px]">
              {waveformBars.map((bar, idx) => (
                <span
                  key={`${bar}-${idx}`}
                  className="block w-[2px] rounded-full bg-urdu-gold/85"
                  style={{ height: `${bar + (isSpeaking ? ((idx % 4) + 1) * 2 : 0)}px` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm text-urdu-brown/80">
              <span>{isSpeaking ? "Speaking" : "00:00"}</span>
              <span>{approxDuration}</span>
            </div>
          </div>

          <TTSControls
            canPlay={Boolean(text.trim()) && isSupported}
            isSpeaking={isSpeaking}
            isPaused={isPaused}
            speed={speed}
            onSpeedChange={setSpeed}
            onPlay={handlePlay}
            onPause={pause}
            onResume={resume}
            onStop={stop}
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-gradient-to-r from-urdu-brown via-urdu-maroon to-urdu-brown p-4 shadow-[0_10px_22px_rgba(45,27,14,0.24)]">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-right sm:text-right">
            <div className="mb-1 flex items-center justify-end gap-2 text-2xl text-urdu-gold"><Disc className="h-6 w-6" />
              <span className="text-sm font-semibold text-urdu-cream">اس تلاوت کو MP3 میں ڈاؤنلوڈ کریں</span>
            </div>
            <p className="text-sm text-urdu-gold/90">اعلی معیار کی آواز میں شاعری کی تلاوت</p>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[280px]">
            <DownloadButton
              isLoading={downloadLoading}
              disabled={!text.trim()}
              onDownload={handleDownload}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PoetryPlayer;
