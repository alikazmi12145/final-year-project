import PDFExportService from "../services/pdfExportService.js";

/**
 * PDF Export Controller
 * Handles PDF generation requests
 */
class PDFExportController {
  /**
   * Export single poem as PDF
   * @route GET /api/poems/:poemId/export/pdf
   */
  static async exportPoemPDF(req, res) {
    try {
      const { poemId } = req.params;

      if (!poemId) {
        return res.status(400).json({
          success: false,
          message: "Poem ID is required",
        });
      }

      await PDFExportService.generatePoemPDF(poemId, res);
    } catch (error) {
      console.error("Export poem PDF error:", error);

      // Check if headers already sent
      if (!res.headersSent) {
        return res.status(error.message === "Poem not found" ? 404 : 500).json({
          success: false,
          message: error.message || "Failed to generate PDF",
        });
      }
    }
  }

  /**
   * Export multiple poems as PDF collection
   * @route POST /api/poems/export/collection/pdf
   */
  static async exportCollectionPDF(req, res) {
    try {
      const { poemIds } = req.body;

      if (!poemIds || !Array.isArray(poemIds) || poemIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Poem IDs array is required",
        });
      }

      await PDFExportService.generateCollectionPDF(poemIds, res);
    } catch (error) {
      console.error("Export collection PDF error:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: error.message || "Failed to generate PDF collection",
        });
      }
    }
  }
}

export default PDFExportController;
