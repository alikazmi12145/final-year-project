/**
 * Skeleton.jsx
 * Generic shimmer skeleton block used by copyright pages.
 */
import React from "react";

export const Skeleton = ({ className = "" }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-urdu-cream/40 via-urdu-cream/70 to-urdu-cream/40 rounded-lg ${className}`}
  />
);

export const SkeletonRow = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);

export default Skeleton;
