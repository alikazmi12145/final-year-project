import React, { useState } from "react";
import { ThumbsUp, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";

const VotingSection = ({ submissions = [], onVote, userHasVoted = false, loading = false }) => {
  const [selectedId, setSelectedId] = useState("");
  const [rating, setRating] = useState(5);

  const handleVote = () => {
    if (!selectedId) return;
    onVote(selectedId, rating);
  };

  if (userHasVoted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
        <ThumbsUp className="w-5 h-5 text-green-600" />
        <span className="text-green-700 font-medium">
          آپ نے اپنا ووٹ دے دیا ہے / You have already voted
        </span>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-gray-400" />
        <span className="text-gray-500">ابھی کوئی جمع شدہ شاعری نہیں / No submissions yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-urdu-brown flex items-center gap-2">
        <ThumbsUp className="w-5 h-5 text-urdu-gold" />
        ووٹ دیں / Vote
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {submissions.map((sub) => (
          <label
            key={sub._id}
            className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedId === sub._id
                ? "border-urdu-gold bg-urdu-cream/30"
                : "border-gray-200 hover:border-urdu-gold/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="vote"
                value={sub._id}
                checked={selectedId === sub._id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1 accent-urdu-brown"
              />
              <div className="flex-1">
                <div className="font-medium text-urdu-brown">
                  {sub.submission?.title || sub.poem?.title || "بلا عنوان"}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {sub.user?.name || "نامعلوم"} •{" "}
                  {sub.votesCount ?? sub.votes?.length ?? 0} votes
                </div>
                {(sub.submission?.content || sub.poem?.content) && (
                  <p className="text-sm text-urdu-maroon mt-1 line-clamp-2 font-urdu">
                    {sub.submission?.content || sub.poem?.content}
                  </p>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Rating slider */}
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-1">
          ریٹنگ / Rating: {rating}/10
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={rating}
          onChange={(e) => setRating(parseInt(e.target.value))}
          className="w-full accent-urdu-brown"
        />
      </div>

      <Button
        variant="primary"
        size="small"
        onClick={handleVote}
        disabled={!selectedId || loading}
        loading={loading}
      >
        <ThumbsUp className="w-4 h-4 mr-1" />
        ووٹ دیں / Cast Vote
      </Button>
    </div>
  );
};

export default VotingSection;
