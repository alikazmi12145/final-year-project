import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import gTTS from "gtts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, "..", "uploads", "tts-temp");

const ensureTempDir = async () => {
  await fs.promises.mkdir(TEMP_DIR, { recursive: true });
};

const containsUrdu = (text = "") => /[\u0600-\u06FF]/.test(text);

const sanitizeText = (text = "") => {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
};

const writeTTSFile = (text, languageCode, filePath, slowMode = false) => {
  return new Promise((resolve, reject) => {
    try {
      const tts = new gTTS(text, languageCode, slowMode);
      tts.save(filePath, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(filePath);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const removeFileQuietly = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore cleanup failures.
  }
};

class TTSController {
  static async downloadRecitation(req, res) {
    try {
      const { text, language = "auto", speed = 1 } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          success: false,
          message: "Poetry text is required.",
        });
      }

      const cleanedText = sanitizeText(text);
      if (!cleanedText) {
        return res.status(400).json({
          success: false,
          message: "Please provide non-empty poetry text.",
        });
      }

      if (cleanedText.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Text is too long. Please keep it under 5000 characters.",
        });
      }

      const isUrdu = language === "ur" || (language === "auto" && containsUrdu(cleanedText));
      const languageCode = isUrdu ? "ur" : "en";
      const parsedSpeed = Number(speed);
      const slowMode = Number.isFinite(parsedSpeed) ? parsedSpeed < 0.9 : false;

      await ensureTempDir();

      const fileName = `recitation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
      const filePath = path.join(TEMP_DIR, fileName);

      await writeTTSFile(cleanedText, languageCode, filePath, slowMode);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

      res.download(filePath, fileName, async (error) => {
        await removeFileQuietly(filePath);

        if (error && !res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Failed to stream generated MP3 file.",
          });
        }
      });
    } catch (error) {
      console.error("TTS download failed:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to generate recitation right now. Please try again.",
      });
    }
  }
}

export default TTSController;
