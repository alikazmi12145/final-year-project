
class OpenAIService {
  /**
   * Extract and correct Urdu text from image OCR using GPT-4 Vision
   * This helps fix garbled OCR text and extract proper Urdu couplets
   */
  async improveUrduOCR(ocrText, imageBase64 = null) {
    try {
      // If OpenAI is not configured, return original text with keywords
      if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ OpenAI not configured, using basic keyword extraction");
        const words = ocrText
          .split(/\s+/)
          .map(word => word.replace(/[^\u0600-\u06FFa-zA-Z]/g, ''))
          .filter(word => word.length >= 3 && /[\u0600-\u06FF]/.test(word));
        
        return {
          success: true,
          correctedText: ocrText,
          keywords: [...new Set(words)].slice(0, 10),
          confidence: 0.5,
        };
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      console.log("🤖 Using OpenAI to improve Urdu OCR text...");

      const prompt = `You are an Urdu poetry expert. The following text was extracted from an image using OCR but may have errors:

"${ocrText}"

Please:
1. Correct any OCR errors and provide the proper Urdu text
2. Identify if this is a couplet (sher) from a famous poem
3. Extract 5-10 important Urdu keywords that can be used to search for the complete poem
4. If you recognize the poet, mention their name

Respond in JSON format:
{
  "correctedText": "corrected Urdu text here",
  "keywords": ["keyword1", "keyword2", ...],
  "poetName": "poet name if recognized",
  "isRecognized": true/false
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert in Urdu poetry and can correct OCR errors in Urdu text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        correctedText: result.correctedText || ocrText,
        keywords: result.keywords || [],
        poetName: result.poetName || null,
        isRecognized: result.isRecognized || false,
        confidence: result.isRecognized ? 0.9 : 0.7,
      };
    } catch (error) {
      console.error("❌ OpenAI OCR improvement failed:", error.message);
      
      // Fallback: basic keyword extraction
      const words = ocrText
        .split(/\s+/)
        .map(word => word.replace(/[^\u0600-\u06FFa-zA-Z]/g, ''))
        .filter(word => word.length >= 3 && /[\u0600-\u06FF]/.test(word));
      
      return {
        success: false,
        correctedText: ocrText,
        keywords: [...new Set(words)].slice(0, 10),
        confidence: 0.5,
        error: error.message,
      };
    }
  }

  // Fallback analysis only
  async analyzePoetryTone(poemTitle, poetName, poemText) {
    return {
      success: true,
      data: {
        primaryTone: "fallback",
        secondaryTones: [],
        emotions: [],
        themes: [],
        mood: "unknown",
        literaryDevices: [],
        era: "unknown",
        complexity: "unknown",
        recommendation: "AI analysis unavailable",
        similarPoets: [],
        keywords: [],
      },
      usage: null,
    };
  }

  // Generate "You may also like" suggestions
  async getSimilarPoetry(currentPoem, availablePoems = []) {
    return {
      success: true,
      data: {
        suggestions: [],
        reasoning: "AI suggestions unavailable. Fallback only.",
      },
      usage: null,
    };
  }

  // Summarize poetry for quick understanding
  async summarizePoetry(poemText, poemTitle, poetName) {
    return {
      success: true,
      data: {
        summary: "AI summary unavailable.",
        mainTheme: "unknown",
        keyMessage: "unknown",
        readingTime: "unknown",
        difficulty: "unknown",
        culturalSignificance: "unknown",
        quotableLines: [],
      },
      usage: null,
    };
  }

  // Enhance search query for better results
  async enhanceSearchQuery(userQuery) {
    return {
      success: true,
      data: {
        enhancedQuery: userQuery,
        synonyms: [],
        relatedConcepts: [],
        searchFilters: {
          genres: [],
          themes: [],
          emotions: [],
          poets: [],
        },
        originalIntent: "unknown",
      },
      usage: null,
    };
  }
// OpenAIService removed. All AI features are disabled. Use fallback logic only.
}

export default OpenAIService;
