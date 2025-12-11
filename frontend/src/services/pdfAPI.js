import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * PDF Export API Service
 * Handles PDF generation and download
 */
class PDFAPI {
  /**
   * Export single poem as PDF
   */
  static async exportPoemPDF(poemId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/pdf/poem/${poemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob", // Important for binary data
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `poem-${poemId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: "PDF downloaded successfully" };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Export multiple poems as PDF collection
   */
  static async exportCollectionPDF(poemIds, filename = "poetry-collection.pdf") {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/pdf/collection`,
        { poemIds },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: "PDF collection downloaded successfully" };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  static handleError(error) {
    if (error.response) {
      // Try to read error message from blob
      if (error.response.data instanceof Blob) {
        return new Error("Failed to generate PDF");
      }
      return new Error(error.response.data.message || "Request failed");
    } else if (error.request) {
      return new Error("No response from server");
    } else {
      return new Error(error.message || "Request failed");
    }
  }
}

export default PDFAPI;
