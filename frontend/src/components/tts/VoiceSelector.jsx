import React from "react";

const VoiceSelector = ({ voices, selectedVoiceURI, onChange, disabled }) => {
  return (
    <label className="w-full text-right sm:w-auto" htmlFor="tts-voice-selector">
      <span className="mb-1 block text-xs font-semibold text-urdu-brown">Voice</span>
      <select
        id="tts-voice-selector"
        className="w-full min-w-[220px] rounded-lg bg-white px-3 py-2 text-sm text-urdu-brown shadow-sm outline-none focus:ring-2 focus:ring-urdu-gold/25 disabled:cursor-not-allowed disabled:opacity-55"
        value={selectedVoiceURI}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {voices.length === 0 ? (
          <option value="">No voices available</option>
        ) : (
          voices.map((voice) => (
            <option key={voice.value} value={voice.value}>
              {voice.isUrduLike ? `Urdu: ${voice.label}` : voice.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
};

export default VoiceSelector;
