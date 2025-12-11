import PDFDocument from "pdfkit";
import Poem from "../models/Poem.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Urdu/Arabic font - Using Noto Naskh Arabic (proper Urdu rendering)
const urduFontPath = path.join(__dirname, "../fonts/NotoNaskhArabic-Regular.ttf");

/**
 * PDF Export Service
 * Generates PDF files for poems with proper Urdu text support
 * 
 * Uses Noto Sans Arabic font for proper Urdu/Arabic rendering (compatible with PDFKit)
 * Note: RTL alignment is handled by the align: 'right' option
 */
class PDFExportService {
  /**
   * Generate PDF for a poem with Urdu support
   */
  static async generatePoemPDF(poemId, res) {
    try {
      // Fetch poem with author details
      const poem = await Poem.findById(poemId).populate(
        "author",
        "name fullName profileImage"
      );

      if (!poem) {
        throw new Error("Poem not found");
      }

      // Create PDF document with proper settings for RTL text
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: poem.title || "Poem",
          Author: poem.author?.name || poem.author?.fullName || "Unknown",
          Subject: "Poetry Export from Bazm-E-Sukhan",
          Keywords: "poetry, urdu, poem",
        },
      });

      // Register custom Urdu font
      if (fs.existsSync(urduFontPath)) {
        doc.registerFont("Urdu", urduFontPath);
      } else {
        console.error("⚠️  Urdu font not found at:", urduFontPath);
      }

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="poem-${poem._id}.pdf"`
      );

      // Pipe PDF to response
      doc.pipe(res);

      // Use custom Urdu font for all Urdu text
      const urduFont = "Urdu";
      const fallbackFont = "Times-Roman"; // Fallback if font not loaded

      // Function to add footer on each page
      const addFooter = () => {
        const bottomY = doc.page.height - doc.page.margins.bottom - 50;
        doc
          .moveTo(50, bottomY)
          .lineTo(545, bottomY)
          .strokeColor("#D4AF37")
          .lineWidth(1)
          .stroke();

        doc
          .fontSize(9)
          .font(fs.existsSync(urduFontPath) ? urduFont : fallbackFont)
          .fillColor("#999999")
          .text(
            `تخلیق: ${new Date().toLocaleDateString('ur-PK')}`,
            50,
            bottomY + 5,
            { align: "center", width: 495, features: ['rtla', 'calt', 'liga'] }
          );
        
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#999999")
          .text(
            `Generated: ${new Date().toLocaleDateString()}`,
            50,
            bottomY + 18,
            { align: "center", width: 495 }
          );

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#CCCCCC")
          .text("www.bazm-e-sukhan.com", 50, bottomY + 31, { align: "center", width: 495, link: "https://www.bazm-e-sukhan.com" });
      };

      // Listen for page additions
      doc.on('pageAdded', () => {
        addFooter();
      });

      // Add header with branding
      doc
        .fontSize(28)
        .font(fs.existsSync(urduFontPath) ? urduFont : fallbackFont)
        .fillColor("#8B4513")
        .text("بزمِ سخن", { align: "center", features: ['rtla', 'calt', 'liga'] })
        .moveDown(0.3);

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#666666")
        .text("Bazm-E-Sukhan - Urdu Poetry Platform", { align: "center" })
        .moveDown(1.2);

      // Add decorative line
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#D4AF37")
        .lineWidth(2)
        .stroke()
        .moveDown(1.5);

      // Add poem title
      if (poem.title) {
        doc
          .fontSize(22)
          .font(fs.existsSync(urduFontPath) ? urduFont : fallbackFont)
          .fillColor("#8B4513")
          .text(poem.title, { align: "center", features: ['rtla', 'calt', 'liga'] })
          .moveDown(0.8);
      }

      // Add author information
      const authorName =
        poem.author?.name || poem.author?.fullName || "نامعلوم شاعر";
      doc
        .fontSize(15)
        .font(fs.existsSync(urduFontPath) ? urduFont : fallbackFont)
        .fillColor("#D4AF37")
        .text(`شاعر: ${authorName}`, { align: "center", features: ['rtla', 'calt', 'liga'] })
        .moveDown(0.5);

      // Add category if available
      if (poem.category) {
        const categoryMap = {
          ghazal: "غزل",
          nazm: "نظم",
          rubai: "رباعی",
          qasida: "قصیدہ",
          masnavi: "مثنوی",
          free_verse: "آزاد نظم",
          hamd: "حمد",
          naat: "نعت",
          manqabat: "منقبت",
          marsiya: "مرثیہ",
        };
        const categoryUrdu = categoryMap[poem.category] || poem.category;
        doc
          .fontSize(11)
          .font(fs.existsSync(urduFontPath) ? urduFont : fallbackFont)
          .fillColor("#999999")
          .text(`صنف: ${categoryUrdu}`, { align: "center", features: ['rtla', 'calt', 'liga'] })
          .moveDown(1.8);
      }

      // Add decorative line
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#D4AF37")
        .lineWidth(1)
        .stroke()
        .moveDown(2);

      // Add poem content with proper Urdu font and RTL support
      if (poem.content) {
        // Split content into lines - preserve empty lines for couplet spacing
        const lines = poem.content.split('\n');
        
        doc.fontSize(18).font(fs.existsSync(urduFontPath) ? urduFont : fallbackFont).fillColor("#000000");

        lines.forEach((line, index) => {
          if (line.trim()) {
            // Non-empty line - use proper RTL alignment
            doc.text(line.trim(), {
              align: "right",
              lineGap: 8,
              features: ['rtla', 'calt', 'liga']
            });
          } else if (index < lines.length - 1 && lines[index + 1]?.trim()) {
            // Empty line followed by text - add spacing for couplet break
            doc.moveDown(1.2);
          }
        });
      }

      // Add footer to the last page (first page if single page)
      addFooter();

      // Finalize PDF
      doc.end();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate PDF for multiple poems (collection)
   */
  static async generateCollectionPDF(poemIds, res) {
    try {
      // Fetch all poems
      const poems = await Poem.find({ _id: { $in: poemIds } }).populate(
        "author",
        "name fullName"
      );

      if (poems.length === 0) {
        throw new Error("No poems found");
      }

      // Create PDF document
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="poetry-collection.pdf"`
      );

      doc.pipe(res);

      // Add title page
      doc
        .fontSize(28)
        .font("Helvetica-Bold")
        .fillColor("#8B4513")
        .text("بزم سخن", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(18)
        .font("Helvetica")
        .fillColor("#666666")
        .text("Poetry Collection", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .fillColor("#999999")
        .text(`${poems.length} Poems`, { align: "center" })
        .moveDown(2);

      // Add each poem
      poems.forEach((poem, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // Add poem title
        if (poem.urduTitle) {
          doc
            .fontSize(18)
            .font("Helvetica-Bold")
            .fillColor("#8B4513")
            .text(poem.urduTitle, { align: "right" })
            .moveDown(0.5);
        }

        if (poem.title && poem.title !== poem.urduTitle) {
          doc
            .fontSize(16)
            .font("Helvetica")
            .fillColor("#666666")
            .text(poem.title, { align: "center" })
            .moveDown(0.5);
        }

        // Add author
        const authorName = poem.author?.name || poem.author?.fullName || "Unknown";
        doc
          .fontSize(12)
          .font("Helvetica-Oblique")
          .fillColor("#D4AF37")
          .text(`By: ${authorName}`, { align: "center" })
          .moveDown(1);

        // Add content
        if (poem.verses && poem.verses.length > 0) {
          doc.fontSize(13).font("Helvetica").fillColor("#000000");

          poem.verses.forEach((verse) => {
            if (verse.urdu) {
              doc.text(verse.urdu, { align: "right", lineGap: 5 });
            }
            doc.moveDown(0.5);
          });
        } else if (poem.content) {
          doc
            .fontSize(13)
            .font("Helvetica")
            .fillColor("#000000")
            .text(poem.content, { align: "right", lineGap: 6 });
        }
      });

      // Add footer on last page
      doc.moveDown(2);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#999999")
        .text(`Generated from Bazm-E-Sukhan`, { align: "center" });

      doc.end();
    } catch (error) {
      throw error;
    }
  }
}

export default PDFExportService;
