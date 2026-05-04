import React, { useEffect } from "react";
import { X } from "lucide-react";
import PoetryPlayer from "./PoetryPlayer";

/**
 * TTSModal – opens the نغمہ سخن TTS player in a modal overlay.
 *
 * Props:
 *  isOpen   (bool)   – controls visibility
 *  onClose  (fn)     – called when user dismisses the modal
 *  text     (string) – initial poem content
 *  poetName (string) – poet name pre-filled in the player
 *  title    (string) – poem title used for the download file name
 */
const TTSModal = ({ isOpen, onClose, text = "", poetName = "", title = "" }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
      aria-label="نغمہ سخن – Urdu Poetry TTS"
    >
      {/* Modal Panel */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-urdu-cream/70 via-white to-amber-50 shadow-2xl ring-1 ring-urdu-gold/20">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white text-urdu-maroon shadow-md transition hover:scale-105"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="relative px-5 py-7 sm:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(212,175,55,0.10),rgba(212,175,55,0.02)_35%,rgba(212,175,55,0.10)_95%)]" />
          <div className="relative text-center">
            <h2 className="cultural-title text-4xl font-bold tracking-wide text-urdu-maroon sm:text-5xl">
              نغمۂ سخن
            </h2>
          </div>
        </div>

        {/* TTS Player */}
        <div className="p-3 sm:p-6">
          <PoetryPlayer
            title={title}
            initialText={text}
            poetName={poetName}
            showEditor={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TTSModal;
