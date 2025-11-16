import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Send, Pause, Play } from "lucide-react";
import { Button } from "../ui/Button";

const VoiceRecorder = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveform, setWaveform] = useState(Array(40).fill(0));

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context for waveform visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start waveform animation
      visualizeAudio();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("مائیکروفون تک رسائی نہیں مل سکی");
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyserRef.current.getByteFrequencyData(dataArray);

      // Sample the data array for waveform visualization
      const samples = 40;
      const step = Math.floor(bufferLength / samples);
      const newWaveform = [];

      for (let i = 0; i < samples; i++) {
        const value = dataArray[i * step] / 255; // Normalize to 0-1
        newWaveform.push(value);
      }

      setWaveform(newWaveform);

      if (isRecording && !isPaused) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      visualizeAudio();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  };

  const deleteRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setWaveform(Array(40).fill(0));
    if (onCancel) onCancel();
  };

  const sendVoiceMessage = () => {
    if (audioBlob && onSendVoice) {
      onSendVoice(audioBlob, recordingTime);
      deleteRecording();
    }
  };

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center space-x-3 bg-urdu-cream/30 rounded-lg p-3 border-2 border-urdu-gold/50">
      {/* Delete Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={deleteRecording}
        className="text-red-600 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex items-center justify-center h-12 space-x-1">
        {waveform.map((height, index) => (
          <div
            key={index}
            className="w-1 bg-urdu-maroon rounded-full transition-all duration-100"
            style={{
              height: `${Math.max(4, height * 48)}px`,
              opacity: isRecording && !isPaused ? 0.8 : 0.4,
            }}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-sm font-medium text-urdu-brown min-w-[50px] text-center">
        {formatTime(recordingTime)}
      </div>

      {/* Control Buttons */}
      {!isRecording && !audioBlob && (
        <Button
          onClick={startRecording}
          className="bg-urdu-maroon hover:bg-urdu-brown text-white rounded-full p-3"
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}

      {isRecording && !isPaused && (
        <>
          <Button
            onClick={pauseRecording}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <Pause className="w-4 h-4" />
          </Button>
          <Button
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-3"
          >
            <Square className="w-5 h-5" />
          </Button>
        </>
      )}

      {isPaused && (
        <>
          <Button
            onClick={resumeRecording}
            className="bg-urdu-maroon hover:bg-urdu-brown text-white rounded-full p-3"
          >
            <Mic className="w-5 h-5" />
          </Button>
          <Button
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-3"
          >
            <Square className="w-5 h-5" />
          </Button>
        </>
      )}

      {audioBlob && (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <Button
            onClick={togglePlayback}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={sendVoiceMessage}
            className="bg-urdu-maroon hover:bg-urdu-brown text-white rounded-full p-3"
          >
            <Send className="w-5 h-5" />
          </Button>
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;
