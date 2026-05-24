import crypto from "crypto";

/**
 * Build a stable SHA-256 hash for a TTS request so identical recitations
 * can be reused from disk + MongoDB instead of regenerating.
 */
export const buildRecitationHash = ({
  normalizedText,
  provider,
  voice,
  mode,
  speed,
  language,
}) => {
  const payload = [
    "v5", // bumped: removed poet personas, retained tarannum cadence + retry
    normalizedText || "",
    provider || "",
    voice || "",
    mode || "poetry",
    Number(speed || 1).toFixed(2),
    language || "ur-PK",
  ].join("::");

  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
};
