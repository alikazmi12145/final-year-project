import React from "react";
import CollectionsManager from "../components/poetry/CollectionsManager";

/**
 * Collections Management Page
 * User's personal collections and favorites
 */

const CollectionsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CollectionsManager />
    </div>
  );
};

export default CollectionsPage;
