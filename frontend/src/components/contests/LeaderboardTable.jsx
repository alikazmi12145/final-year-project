import React from "react";
import { Trophy, Medal, Award, User } from "lucide-react";

const rankColors = {
  1: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white",
  2: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800",
  3: "bg-gradient-to-r from-orange-300 to-orange-400 text-white",
};

const rankIcons = {
  1: <Trophy className="w-5 h-5" />,
  2: <Medal className="w-5 h-5" />,
  3: <Award className="w-5 h-5" />,
};

const LeaderboardTable = ({ entries = [], type = "contest", title = "Leaderboard" }) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>ابھی کوئی ڈیٹا نہیں / No data yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-urdu-gold" />
        {title}
      </h3>

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const rank = entry.rank || index + 1;
          return (
            <div
              key={entry.user?._id || index}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                rank <= 3 ? "bg-urdu-cream/40" : "hover:bg-gray-50"
              }`}
            >
              {/* Rank Badge */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  rankColors[rank] || "bg-gray-100 text-gray-600"
                }`}
              >
                {rankIcons[rank] || rank}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-urdu-brown truncate">
                  {entry.user?.name || "نامعلوم"}
                </div>
                {type === "contest" && entry.submission?.title && (
                  <div className="text-xs text-gray-500 truncate">
                    {entry.submission.title}
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="text-right">
                {type === "contest" ? (
                  <>
                    <div className="font-semibold text-urdu-brown">
                      {entry.rating?.toFixed(1) || entry.votesCount || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.votesCount ?? 0} votes
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-urdu-brown">
                      {entry.bestPercentage ?? entry.percentage ?? 0}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.bestScore ?? entry.score ?? 0} pts
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeaderboardTable;
