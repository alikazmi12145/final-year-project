/**
 * Thin client for the backend TTS API.
 * Keeps fetch logic out of components — used by useElevenTTS and any other
 * future consumer that needs to manage recitations.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const handleJson = async (res) => {
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Request failed (HTTP ${res.status})`);
  }
  return data;
};

export const generateRecitation = async (
  { text, mode = "poetry", voice, speed = 1, provider = "auto", language = "ur-PK" },
  { signal } = {}
) => {
  const res = await fetch(`${API_BASE_URL}/tts/generate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ text, mode, voice, speed, provider, language }),
    signal,
  });
  const json = await handleJson(res);
  return json.data;
};

export const fetchRecitation = async (id, { signal } = {}) => {
  const res = await fetch(`${API_BASE_URL}/tts/${id}`, { signal });
  const json = await handleJson(res);
  return json.data;
};

export const deleteRecitation = async (id) => {
  const res = await fetch(`${API_BASE_URL}/tts/${id}`, { method: "DELETE" });
  return handleJson(res);
};

export const fetchVoices = async ({ signal } = {}) => {
  const res = await fetch(`${API_BASE_URL}/tts/voices`, { signal });
  const json = await handleJson(res);
  return json;
};

export default {
  generateRecitation,
  fetchRecitation,
  deleteRecitation,
  fetchVoices,
};
