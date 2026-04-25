import React from "react";

const DownloadButton = ({ onDownload, isLoading, disabled }) => {
  return (
    <button
      type="button"
      className="w-full rounded-xl bg-[linear-gradient(180deg,#f5e7c8_0%,#e3c58c_45%,#c59353_100%)] px-5 py-3 text-base font-semibold text-urdu-dark shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_18px_rgba(45,27,14,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onDownload}
      disabled={disabled || isLoading}
    >
      {isLoading ? "Generating MP3..." : "Download MP3"}
    </button>
  );
};

export default DownloadButton;
