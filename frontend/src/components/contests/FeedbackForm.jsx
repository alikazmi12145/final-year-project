import React, { useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "../ui/Button";

const FeedbackForm = ({ onSubmit, loading = false }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) return;
    onSubmit({ rating, comment });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-2">
          <MessageSquare className="inline w-4 h-4 mr-1" />
          آپ کی رائے / Your Feedback
        </label>

        {/* Star Rating */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-7 h-7 ${
                  star <= (hoverRating || rating)
                    ? "text-urdu-gold fill-current"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-urdu-maroon ml-2">
              {rating}/5
            </span>
          )}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="اپنی رائے لکھیں... / Write your feedback..."
          rows={3}
          maxLength={1000}
          className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none resize-none bg-white/80"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="small"
        loading={loading}
        disabled={rating === 0 || loading}
      >
        رائے جمع کریں / Submit Feedback
      </Button>
    </form>
  );
};

export default FeedbackForm;
