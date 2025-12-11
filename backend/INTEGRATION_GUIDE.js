// ============================================
// BOOKMARKS & READING HISTORY MODULE SETUP
// ============================================
// Add these lines to your backend/server.js file

// 1. Import the routes (add at top with other imports)
import bookmarkRoutes from "./routes/bookmarks.js";
import historyRoutes from "./routes/history.js";
import pdfExportRoutes from "./routes/pdfExport.js";

// 2. Register the routes (add after other route registrations)
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/pdf", pdfExportRoutes);

// 3. That's it! The module is now ready to use.

// ============================================
// QUICK TEST
// ============================================
// Test the endpoints using curl or Postman:

// Add bookmark:
// POST http://localhost:5000/api/bookmarks
// Headers: { Authorization: "Bearer YOUR_JWT_TOKEN" }
// Body: { "poemId": "VALID_POEM_ID" }

// Get bookmarks:
// GET http://localhost:5000/api/bookmarks
// Headers: { Authorization: "Bearer YOUR_JWT_TOKEN" }

// Add to history:
// POST http://localhost:5000/api/history
// Headers: { Authorization: "Bearer YOUR_JWT_TOKEN" }
// Body: { "poemId": "VALID_POEM_ID" }

// Export PDF:
// GET http://localhost:5000/api/pdf/poem/VALID_POEM_ID
// Headers: { Authorization: "Bearer YOUR_JWT_TOKEN" }
