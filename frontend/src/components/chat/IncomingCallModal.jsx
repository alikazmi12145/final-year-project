import React, { useEffect, useState } from "react";
import { Phone, Video, PhoneOff, User } from "lucide-react";
import { Button } from "../ui/Button";

const IncomingCallModal = ({ 
  isOpen, 
  callerName, 
  callerImage,
  isVideoCall = false,
  onAccept, 
  onReject 
}) => {
  const [ringingTime, setRingingTime] = useState(0);

  useEffect(() => {
    let timer;
    if (isOpen) {
      timer = setInterval(() => {
        setRingingTime((prev) => prev + 1);
      }, 1000);

      // Auto-reject after 30 seconds
      const autoRejectTimer = setTimeout(() => {
        if (onReject) onReject();
      }, 30000);

      return () => {
        clearInterval(timer);
        clearTimeout(autoRejectTimer);
      };
    } else {
      setRingingTime(0);
    }
  }, [isOpen, onReject]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-white animate-scale-in">
        {/* Caller Info */}
        <div className="text-center mb-8">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 animate-pulse-slow">
              {callerImage ? (
                <img
                  src={callerImage}
                  alt={callerName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-12 h-12" />
              )}
            </div>
            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping-slow" />
          </div>

          {/* Caller Name */}
          <h2 className="text-2xl font-bold mb-2 nastaleeq-heading">
            {callerName || "نامعلوم کالر"}
          </h2>

          {/* Call Type */}
          <p className="text-white/80 flex items-center justify-center space-x-2 nastaleeq-primary">
            {isVideoCall ? (
              <>
                <Video className="w-5 h-5" />
                <span>ویڈیو کال</span>
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                <span>آواز کی کال</span>
              </>
            )}
          </p>

          {/* Ringing indicator */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-8">
          {/* Reject Button */}
          <button
            onClick={onReject}
            className="group relative"
            title="رد کریں"
          >
            <div className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 active:scale-95">
              <PhoneOff className="w-7 h-7" />
            </div>
            <p className="text-sm mt-2 nastaleeq-primary opacity-80">رد کریں</p>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="group relative animate-pulse-slow"
            title="قبول کریں"
          >
            <div className="w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 active:scale-95">
              {isVideoCall ? (
                <Video className="w-7 h-7" />
              ) : (
                <Phone className="w-7 h-7" />
              )}
            </div>
            <p className="text-sm mt-2 nastaleeq-primary opacity-80">قبول کریں</p>
          </button>
        </div>

        {/* Duration */}
        <p className="text-center text-white/60 text-sm mt-6">
          {ringingTime > 0 && `${ringingTime} سیکنڈ`}
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes ping-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default IncomingCallModal;
