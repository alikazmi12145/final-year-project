import mongoose from "mongoose";

/**
 * Recitation
 * Stores every generated Urdu poetry TTS audio file with a deterministic
 * hash signature so identical (text + voice + mode + speed + provider)
 * requests reuse the same MP3 instead of regenerating.
 */
const RecitationSchema = new mongoose.Schema(
  {
    originalText:   { type: String, required: true, trim: true },
    normalizedText: { type: String, required: true, trim: true, index: true },
    audioUrl:       { type: String, required: true },     // public relative URL (/storage/recitations/xxx.mp3)
    audioFileName:  { type: String, required: true },     // physical filename on disk
    fileSize:       { type: Number, default: 0 },         // bytes
    duration:       { type: Number, default: 0 },         // seconds (estimated or measured)
    provider:       { type: String, enum: ["google", "elevenlabs", "edge", "gtts"], required: true },
    voice:          { type: String, required: true },
    mode:           { type: String, enum: ["normal", "poetry"], default: "poetry" },
    speed:          { type: Number, default: 1 },
    language:       { type: String, default: "ur-PK" },
    hashSignature:  { type: String, required: true, unique: true, index: true },
    accessCount:    { type: Number, default: 0 },
    lastAccessedAt: { type: Date,   default: Date.now },
  },
  { timestamps: true }
);

RecitationSchema.index({ createdAt: -1 });

export default mongoose.models.Recitation ||
  mongoose.model("Recitation", RecitationSchema);
