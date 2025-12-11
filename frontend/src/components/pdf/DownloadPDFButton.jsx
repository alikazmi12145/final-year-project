import React, { useState } from "react";
import { Download, FileText } from "lucide-react";
import usePDFExport from "../../hooks/usePDFExport";

/**
 * Download PDF Button Component
 * Exports poem(s) as PDF
 */
const DownloadPDFButton = ({
  poemId,
  poemIds,
  filename,
  size = "md",
  variant = "primary",
  showLabel = true,
  className = "",
}) => {
  const { loading, exportPoemPDF, exportCollectionPDF } = usePDFExport();
  const [success, setSuccess] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (poemIds && poemIds.length > 0) {
        // Export collection
        await exportCollectionPDF(poemIds, filename);
      } else if (poemId) {
        // Export single poem
        await exportPoemPDF(poemId);
      } else {
        alert("No poem specified for export");
        return;
      }

      // Show success state
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const variants = {
    primary: "bg-urdu-gold text-white hover:bg-urdu-brown",
    secondary: "bg-white text-urdu-gold border-2 border-urdu-gold hover:bg-urdu-cream",
    outline: "bg-transparent text-urdu-gold border-2 border-urdu-gold hover:bg-urdu-gold hover:text-white",
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading || success}
      className={`
        ${sizes[size]}
        ${variants[variant]}
        inline-flex items-center justify-center gap-2
        rounded-lg font-medium
        transition-all duration-300
        ${loading || success ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg hover:scale-105"}
        focus:outline-none focus:ring-2 focus:ring-urdu-gold focus:ring-offset-2
        ${className}
      `}
      title={poemIds ? `Export ${poemIds.length} poems as PDF` : "Export as PDF"}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
          {showLabel && <span>Generating...</span>}
        </>
      ) : success ? (
        <>
          <FileText size={iconSizes[size]} className="animate-bounce" />
          {showLabel && <span>Downloaded!</span>}
        </>
      ) : (
        <>
          <Download size={iconSizes[size]} />
          {showLabel && <span>Download PDF</span>}
        </>
      )}
    </button>
  );
};

export default DownloadPDFButton;
