import React from "react";
import PoetryCollection from "../components/poetry/PoetryCollection";

/**
 * Poetry Collection Page
 * Main page for browsing poems with filtering and search
 */

const PoetryCollectionPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PoetryCollection />
    </div>
  );
};

export default PoetryCollectionPage;
