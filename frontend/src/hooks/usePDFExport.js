import { useState, useCallback } from "react";
import PDFAPI from "../services/pdfAPI";

/**
 * Custom hook for PDF export functionality
 * @returns {Object} PDF export state and methods
 */
export const usePDFExport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Export single poem as PDF
   */
  const exportPoemPDF = useCallback(async (poemId) => {
    try {
      setLoading(true);
      setError(null);
      await PDFAPI.exportPoemPDF(poemId);
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error("Export poem PDF error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Export multiple poems as PDF collection
   */
  const exportCollectionPDF = useCallback(
    async (poemIds, filename = "poetry-collection.pdf") => {
      try {
        setLoading(true);
        setError(null);
        await PDFAPI.exportCollectionPDF(poemIds, filename);
        return { success: true };
      } catch (err) {
        setError(err.message);
        console.error("Export collection PDF error:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    exportPoemPDF,
    exportCollectionPDF,
  };
};

export default usePDFExport;
