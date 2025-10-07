import React from "react";
import PoemDetail from "../components/poetry/PoemDetail";

/**
 * New Poem Detail Page
 * Shows full poem with reviews, ratings, and recommendations
 */

const PoemDetailPageNew = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PoemDetail />
    </div>
  );
};

export default PoemDetailPageNew;
