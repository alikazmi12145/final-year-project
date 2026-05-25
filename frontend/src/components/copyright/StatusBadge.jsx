/**
 * StatusBadge.jsx
 * Tiny reusable pill for copyright report status.
 */
import React from "react";
import { STATUS_META } from "../../services/copyrightAPI";

const COLOR = {
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  red: "bg-red-100 text-red-800 border-red-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
};

const StatusBadge = ({ status, className = "" }) => {
  const meta = STATUS_META[status] || { label: status, color: "gray" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium urdu-text ${
        COLOR[meta.color]
      } ${className}`}
    >
      {meta.label}
    </span>
  );
};

export default StatusBadge;
