import React from "react";
import PoetryRecommendations from "../components/poetry/PoetryRecommendations";

/**
 * AI Recommendations Page
 * Shows personalized, trending, and discovery recommendations
 */

const RecommendationsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream/40 via-white to-amber-50/40 relative overflow-hidden">
      {/* Ambient classical blobs */}
      <div className="pointer-events-none absolute top-20 -right-20 w-72 h-72 bg-urdu-gold/10 rounded-full blur-3xl bsk-float-slow" />
      <div className="pointer-events-none absolute bottom-20 -left-20 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl bsk-drift" />
      <PoetryRecommendations />
    </div>
  );
};

export default RecommendationsPage;
