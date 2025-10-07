import React from "react";
import PoetryRecommendations from "../components/poetry/PoetryRecommendations";

/**
 * AI Recommendations Page
 * Shows personalized, trending, and discovery recommendations
 */

const RecommendationsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PoetryRecommendations />
    </div>
  );
};

export default RecommendationsPage;
