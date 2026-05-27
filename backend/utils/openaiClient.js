/**
 * Shared OpenAI GPT-4o client utility
 * Used by AI search, recommendations, analysis, translation, and writing-suggestion features.
 */
import OpenAI from "openai";

let _client = null;

export const getOpenAI = () => {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  _client = new OpenAI({ apiKey: key });
  return _client;
};

export const isOpenAIConfigured = () => Boolean(process.env.OPENAI_API_KEY);

/**
 * Run a GPT-4o chat completion.
 * @param {object} opts
 * @param {string} opts.system - System prompt
 * @param {string} opts.user - User prompt
 * @param {boolean} [opts.json=false] - Request JSON output
 * @param {number} [opts.temperature=0.7]
 * @param {number} [opts.maxTokens=900]
 * @returns {Promise<string|object|null>} Response text (or parsed JSON when json=true). Null on failure.
 */
export const chatGPT = async ({
  system,
  user,
  json = false,
  temperature = 0.7,
  maxTokens = 900,
  model = "gpt-4o-mini",
}) => {
  const client = getOpenAI();
  if (!client) return null;
  try {
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    });
    const text = resp.choices?.[0]?.message?.content?.trim() || "";
    if (!json) return text;
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON block
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  } catch (err) {
    console.warn("[openaiClient] GPT call failed:", err?.message || err);
    return null;
  }
};
