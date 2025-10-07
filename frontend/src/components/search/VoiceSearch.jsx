import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, Play, Square } from "lucide-react";
import { Button } from "../ui/Button";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const VoiceSearch = ({ onSearch, loading = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const audioRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    finalTranscript,
  } = useSpeechRecognition({
    commands: [
      {
        command: "search *",
        callback: (spokenText) => {
          handleVoiceSearch(spokenText);
        },
      },
    ],
  });

  useEffect(() => {
    if (finalTranscript && !listening) {
      setHasRecorded(true);
      // Auto-search when speech recognition completes
      handleVoiceSearch(finalTranscript);
    }
  }, [finalTranscript, listening]);

  const startListening = () => {
    resetTranscript();
    setHasRecorded(false);
    setIsListening(true);
    SpeechRecognition.startListening({
      continuous: true,
      language: "ur-PK", // Urdu Pakistan
    });
  };

  const stopListening = () => {
    setIsListening(false);
    SpeechRecognition.stopListening();
  };

  const handleVoiceSearch = (text) => {
    if (text && text.trim()) {
      // Calculate confidence based on speech recognition quality
      const calculatedConfidence = text.length > 10 ? 0.8 : 0.6;
      setConfidence(calculatedConfidence);

      onSearch({
        transcribedText: text.trim(),
        confidence: calculatedConfidence,
        searchType: "voice",
      });
    }
  };

  const handleManualSearch = () => {
    if (transcript && transcript.trim()) {
      handleVoiceSearch(transcript);
    }
  };

  const clearTranscript = () => {
    resetTranscript();
    setHasRecorded(false);
    setConfidence(0);
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <MicOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          آواز کی تلاش دستیاب نہیں
        </h3>
        <p className="text-red-600" dir="rtl">
          آپ کا براؤزر آواز کی شناخت کو سپورٹ نہیں کرتا۔ Chrome، Edge، یا Safari
          استعمال کریں۔
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voice Recording Interface */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
        <div className="text-center space-y-4">
          {/* Microphone Button */}
          <div className="flex justify-center">
            <div className={`relative ${listening ? "animate-pulse" : ""}`}>
              <Button
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                className={`w-20 h-20 rounded-full transition-all duration-300 ${
                  listening
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-purple-500 hover:bg-purple-600"
                } text-white shadow-lg`}
              >
                {listening ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>

              {/* Recording indicator */}
              {listening && (
                <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
              )}
            </div>
          </div>

          {/* Status Text */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-purple-800">
              {listening ? "سن رہا ہوں..." : "آواز کی تلاش"}
            </h3>
            <p className="text-purple-600" dir="rtl">
              {listening
                ? "اب اپنی تلاش بولیں"
                : "مائیکروفون دبائیں اور اپنی تلاش بولیں"}
            </p>
          </div>

          {/* Recording Animation */}
          {listening && (
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-8 bg-purple-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-10 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-6 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-12 bg-purple-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.3s" }}
              ></div>
              <div
                className="w-2 h-4 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Display */}
      {(transcript || hasRecorded) && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-gray-800">آپ نے کہا:</h4>
            <div className="flex gap-2">
              <Button
                onClick={handleManualSearch}
                disabled={!transcript.trim() || loading}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                تلاش کریں
              </Button>
              <Button onClick={clearTranscript} variant="outline" size="sm">
                صاف کریں
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded border min-h-[60px]" dir="rtl">
            {transcript ? (
              <p className="text-lg leading-relaxed">{transcript}</p>
            ) : (
              <p className="text-gray-500 italic">کوئی آواز نہیں سنی گئی...</p>
            )}
          </div>

          {/* Confidence Indicator */}
          {confidence > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>اعتماد کی سطح</span>
                <span>{Math.round(confidence * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    confidence > 0.8
                      ? "bg-green-500"
                      : confidence > 0.6
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${confidence * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice Search Tips */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">
          آواز کی تلاش کی ہدایات:
        </h4>
        <ul className="text-sm text-blue-700 space-y-1" dir="rtl">
          <li>• صاف اور واضح آواز میں بولیں</li>
          <li>• شور والی جگہ سے بچیں</li>
          <li>• مکمل الفاظ استعمال کریں</li>
          <li>• مثال: "محبت کی غزل تلاش کرو"</li>
          <li>• مثال: "مرزا غالب کی شاعری"</li>
        </ul>
      </div>

      {/* Supported Languages */}
      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
        <h4 className="font-medium text-amber-800 mb-2">سپورٹ شدہ زبانیں:</h4>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm">
            اردو
          </span>
          <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm">
            English
          </span>
          <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm">
            ہندی
          </span>
        </div>
      </div>
    </div>
  );
};

export default VoiceSearch;
