import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_ROOT = path.join(__dirname, "..");

// All persisted MP3s live here. Served statically by Express at /storage/recitations/*
export const RECITATION_DIR = path.join(BACKEND_ROOT, "storage", "recitations");
export const PUBLIC_RECITATION_PREFIX = "/storage/recitations";

const ensureDir = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

/** Write a binary MP3 buffer to permanent storage. Returns its public URL + path. */
export const saveRecitationBuffer = async (buffer, fileName) => {
  await ensureDir(RECITATION_DIR);
  const absPath = path.join(RECITATION_DIR, fileName);
  await fs.promises.writeFile(absPath, buffer);
  return {
    absPath,
    fileName,
    publicUrl: `${PUBLIC_RECITATION_PREFIX}/${fileName}`,
    fileSize: buffer.length,
  };
};

/** Resolve a stored filename to its absolute path (or null if missing/escapes). */
export const resolveRecitationPath = (fileName) => {
  if (!fileName || typeof fileName !== "string") return null;
  const safe = path.basename(fileName); // strip any traversal attempt
  if (safe !== fileName) return null;
  const abs = path.join(RECITATION_DIR, safe);
  if (!fs.existsSync(abs)) return null;
  return abs;
};

/** Quietly delete a stored MP3. Never throws. */
export const deleteRecitationFile = async (fileName) => {
  const abs = resolveRecitationPath(fileName);
  if (!abs) return false;
  try {
    await fs.promises.unlink(abs);
    return true;
  } catch {
    return false;
  }
};

export const recitationFileExists = (fileName) =>
  Boolean(resolveRecitationPath(fileName));
