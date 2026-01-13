import React, { useState, useRef, useEffect } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Settings,
  Maximize,
  Minimize,
  User,
} from "lucide-react";
import { Button } from "../ui/Button";

const VideoCallWindow = ({ 
  isActive, 
  onEndCall, 
  recipientName,
  recipientId,
  isVideoCall = true,
  isIncoming = false,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(isIncoming ? "incoming" : "connecting"); // incoming, connecting, connected, ended

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isActive && callStatus === "connecting") {
      initializeMedia();
    }

    return () => {
      cleanup();
    };
  }, [isActive]);

  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const initializeMedia = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("آپ کا براؤزر آڈیو/ویڈیو کال کو سپورٹ نہیں کرتا");
      }

      const constraints = {
        audio: true,
        video: isVideoCall
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      console.log("🎥 Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Media stream obtained:", stream.getTracks().map(t => t.kind));
      
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Ensure video plays
        localVideoRef.current.play().catch(e => console.log("Video play error:", e));
      }

      // Simulate connection (In production, use WebRTC with signaling server)
      setTimeout(() => {
        setCallStatus("connected");
      }, 2000);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      
      let errorMessage = "کیمرا یا مائیکروفون تک رسائی نہیں مل سکی";
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "براہ کرم کیمرا اور مائیکروفون کی اجازت دیں";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "کیمرا یا مائیکروفون نہیں ملا";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "کیمرا یا مائیکروفون پہلے سے استعمال میں ہے";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "مطلوبہ کیمرا سیٹنگز دستیاب نہیں";
      }
      
      alert(errorMessage);
      setCallStatus("ended");
      if (onEndCall) onEndCall();
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    cleanup();
    if (onEndCall) onEndCall();
  };

  const handleAcceptCall = () => {
    setCallStatus("connecting");
    initializeMedia();
  };

  const handleRejectCall = () => {
    setCallStatus("ended");
    if (onEndCall) onEndCall();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!isActive) return null;

  return (
    <div
      className={`fixed ${
        isFullscreen ? "inset-0" : "bottom-4 right-4 w-96 h-[500px]"
      } bg-gray-900 rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-urdu-maroon to-urdu-brown p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold nastaleeq-primary">
                {recipientName || "نامعلوم"}
              </h3>
              <p className="text-xs text-white/70">
                {callStatus === "connecting" && "منسلک ہو رہا ہے..."}
                {callStatus === "connected" && formatDuration(callDuration)}
                {callStatus === "incoming" && "آنے والی کال"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-black">
        {/* Remote Video (Main) */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          {callStatus === "connected" ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12" />
              </div>
              <p className="nastaleeq-primary">
                {callStatus === "connecting" && "منسلک ہو رہا ہے..."}
                {callStatus === "incoming" && "آنے والی کال"}
              </p>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        {isVideoEnabled && (callStatus === "connected" || callStatus === "connecting") && (
          <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            {callStatus === "connecting" && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        {callStatus === "incoming" ? (
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={handleRejectCall}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button
              onClick={handleAcceptCall}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4"
            >
              <Phone className="w-6 h-6" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-4">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                isMuted
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gray-700 hover:bg-gray-600"
              } text-white`}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Video Toggle */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  !isVideoEnabled
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-700 hover:bg-gray-600"
                } text-white`}
              >
                {isVideoEnabled ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
              </button>
            )}

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            {/* Settings */}
            <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* CSS for mirror effect */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default VideoCallWindow;
