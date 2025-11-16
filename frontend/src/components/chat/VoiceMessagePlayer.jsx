import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Download } from "lucide-react";

const VoiceMessagePlayer = ({ audioUrl, duration, isOwnMessage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveform, setWaveform] = useState(Array(30).fill(0.3));
  const audioRef = useRef(null);

  useEffect(() => {
    // Generate random waveform for visual effect
    const generateWaveform = () => {
      return Array(30)
        .fill(0)
        .map(() => Math.random() * 0.8 + 0.2);
    };
    setWaveform(generateWaveform());
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = audioRef.current?.duration
    ? (currentTime / audioRef.current.duration) * 100
    : 0;

  return (
    <div
      className={`flex items-center space-x-3 p-2 rounded-lg min-w-[250px] ${
        isOwnMessage ? "bg-white/20" : "bg-gray-100"
      }`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        className={`p-2 rounded-full transition-colors flex-shrink-0 ${
          isOwnMessage
            ? "bg-white/30 hover:bg-white/50 text-white"
            : "bg-urdu-maroon hover:bg-urdu-brown text-white"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      {/* Waveform with Progress */}
      <div className="flex-1 flex flex-col space-y-1">
        <div
          className="flex items-center justify-center h-8 space-x-0.5 cursor-pointer"
          onClick={handleSeek}
        >
          {waveform.map((height, index) => {
            const barProgress = (index / waveform.length) * 100;
            const isActive = barProgress <= progress;
            
            return (
              <div
                key={index}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isOwnMessage
                    ? isActive
                      ? "bg-white"
                      : "bg-white/30"
                    : isActive
                    ? "bg-urdu-maroon"
                    : "bg-gray-300"
                }`}
                style={{
                  height: `${height * 32}px`,
                }}
              />
            );
          })}
        </div>

        {/* Time Display */}
        <div
          className={`text-xs ${
            isOwnMessage ? "text-white/70" : "text-gray-600"
          }`}
        >
          {isPlaying
            ? formatTime(currentTime)
            : duration
            ? formatTime(duration)
            : "0:00"}
        </div>
      </div>

      {/* Download Button */}
      <a
        href={audioUrl}
        download="voice-message.webm"
        className={`p-2 rounded-full transition-colors flex-shrink-0 ${
          isOwnMessage
            ? "hover:bg-white/20 text-white/70 hover:text-white"
            : "hover:bg-gray-200 text-gray-600 hover:text-gray-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
};

export default VoiceMessagePlayer;
