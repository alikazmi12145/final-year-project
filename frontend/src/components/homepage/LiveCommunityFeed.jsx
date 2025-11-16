import React, { useState, useEffect, useRef } from "react";
import { Activity, User, MessageCircle, Heart, FileText, Sparkles } from "lucide-react";
import axios from "axios";

// Create a dedicated axios instance with explicit empty baseURL to override any global defaults
const homepageAxios = axios.create({
  baseURL: '', // Explicitly empty to prevent inheritance of global defaults
});

const LiveCommunityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const tickerRef = useRef(null);

  useEffect(() => {
    fetchRecentActivities();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentActivities = async () => {
    try {
      // Use absolute URL to bypass any axios defaults
      const response = await homepageAxios.get('http://localhost:5000/api/homepage/live-feed');

      if (response.data.success) {
        setActivities(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching live feed:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "new_poem":
        return <FileText className="w-4 h-4" />;
      case "comment":
        return <MessageCircle className="w-4 h-4" />;
      case "like":
        return <Heart className="w-4 h-4" />;
      case "follow":
        return <User className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "new_poem":
        return "bg-blue-500";
      case "comment":
        return "bg-green-500";
      case "like":
        return "bg-red-500";
      case "follow":
        return "bg-purple-500";
      default:
        return "bg-amber-500";
    }
  };

  // Show placeholder if no activities yet
  if (loading || !activities || activities.length === 0) {
    return (
      <div className="relative z-10 py-12 px-4 bg-gradient-to-r from-amber-900 via-orange-900 to-amber-900 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse mr-3" />
            <h3 className="nastaleeq-heading text-2xl font-bold text-white" dir="rtl">
              حالیہ سرگرمیاں
            </h3>
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse ml-3" />
          </div>
          <p className="nastaleeq-primary text-amber-200 text-lg" dir="rtl">
            {loading ? "لوڈ ہو رہا ہے..." : "ابھی کوئی نئی سرگرمی نہیں ہے"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 py-12 px-4 bg-gradient-to-r from-amber-900 via-orange-900 to-amber-900 overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 20h20v20H0V20zm10 0h10v10H10V20z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }}
      ></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="w-6 h-6 text-amber-300 animate-pulse mr-3" />
          <h3
            className="nastaleeq-heading text-2xl font-bold text-white"
            dir="rtl"
          >
            حالیہ سرگرمیاں
          </h3>
          <Sparkles className="w-6 h-6 text-amber-300 animate-pulse ml-3" />
        </div>

        {/* Scrolling Ticker */}
        <div className="relative overflow-hidden py-4">
          <div
            ref={tickerRef}
            className="flex space-x-6 space-x-reverse animate-scroll"
          >
            {/* Duplicate activities for seamless loop */}
            {[...activities, ...activities].map((activity, index) => (
              <div
                key={`${activity._id}-${index}`}
                className="flex-shrink-0 group"
              >
                <div className="flex items-center space-x-3 space-x-reverse bg-white/10 backdrop-blur-sm hover:bg-white/20 px-6 py-3 rounded-full border border-white/20 hover:border-amber-300 transition-all duration-300 cursor-pointer">
                  {/* Icon Badge */}
                  <div
                    className={`${getActivityColor(
                      activity.type
                    )} p-2 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform animate-pulse`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Activity Text */}
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span
                      className="nastaleeq-primary text-white font-medium whitespace-nowrap"
                      dir="rtl"
                    >
                      {activity.message}
                    </span>
                    {activity.user && (
                      <span className="text-amber-300 font-semibold">
                        •
                      </span>
                    )}
                    {activity.user && (
                      <span
                        className="nastaleeq-primary text-amber-300 font-bold"
                        dir="rtl"
                      >
                        {activity.user}
                      </span>
                    )}
                  </div>

                  {/* Time Badge */}
                  {activity.timeAgo && (
                    <span className="text-xs text-amber-200 bg-black/20 px-2 py-1 rounded-full">
                      {activity.timeAgo}
                    </span>
                  )}

                  {/* Glow Effect on Hover */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400/30 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Badge */}
        <div className="text-center mt-4">
          <span
            className="nastaleeq-primary text-sm text-amber-300/80 bg-black/20 px-4 py-2 rounded-full inline-block"
            dir="rtl"
          >
            براہ راست کمیونٹی کی سرگرمیاں
          </span>
        </div>
      </div>

      {/* CSS Animation for Scrolling */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 40s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default LiveCommunityFeed;
