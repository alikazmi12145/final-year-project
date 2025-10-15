const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class OpenAIService {
  // Poetry Recommendations based on theme and emotion
  async getPoetryRecommendations(userPreferences, readerHistory = []) {
    try {
      const prompt = `
Based on the following preferences and reading history, recommend 5 Urdu/Hindi poems:

User Preferences:
- Theme: ${userPreferences.theme}
- Emotion: ${userPreferences.emotion}
- Genre: ${userPreferences.genre || "any"}
- Poet Preference: ${userPreferences.poetPreference || "any"}

Recent Reading History: ${readerHistory
        .map((p) => `"${p.title}" by ${p.author}`)
        .join(", ")}

Please provide recommendations in this JSON format:
{
  "recommendations": [
    {
      "title": "poem title",
      "author": "poet name",
      "theme": "main theme",
      "emotion": "primary emotion",
      "genre": "poetry genre",
      "reasoning": "why this poem fits the preferences",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ]
}

Focus on classical and contemporary Urdu/Hindi poetry. Include diverse poets and styles.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in Urdu and Hindi poetry with deep knowledge of classical and contemporary poets. Provide thoughtful recommendations based on user preferences.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      const recommendations = JSON.parse(content);

      return {
        success: true,
        data: recommendations,
        usage: response.usage,
      };
    } catch (error) {
      console.error("OpenAI Poetry Recommendations Error:", error);
      return {
        success: false,
        error: "Failed to generate poetry recommendations",
        details: error.message,
      };
    }
  }

  // Poetry Translation (Urdu <-> English)
  async translatePoetry(text, fromLang, toLang) {
    try {
      const prompt = `
Translate the following ${fromLang} poetry to ${toLang} while preserving:
- Poetic meter and rhythm as much as possible
- Emotional tone and imagery
- Cultural context and metaphors
- Rhyme scheme where applicable

Original Text:
${text}

Provide the translation in this JSON format:
{
  "translation": "translated text",
  "originalLanguage": "${fromLang}",
  "targetLanguage": "${toLang}",
  "translationNotes": "brief notes about preservation of poetic elements",
  "difficulty": "translation difficulty level (easy/medium/hard)",
  "culturalContext": "important cultural elements to understand"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert translator specializing in Urdu, Hindi, and English poetry. You understand the nuances of poetic translation and cultural context.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      const translation = JSON.parse(content);

      return {
        success: true,
        data: translation,
        usage: response.usage,
      };
    } catch (error) {
      console.error("OpenAI Translation Error:", error);
      return {
        success: false,
        error: "Failed to translate poetry",
        details: error.message,
      };
    }
  }

  // Poetry Tone Analysis
  async analyzePoetryTone(poemText, poemTitle = "", poetName = "") {
    try {
      const prompt = `
Analyze the tone and emotional content of this poetry:

Title: ${poemTitle}
Poet: ${poetName}
Text: ${poemText}

Provide analysis in this JSON format:
{
  "primaryTone": "main emotional tone",
  "secondaryTones": ["additional tones"],
  "emotions": ["detected emotions"],
  "themes": ["main themes"],
  "mood": "overall mood",
  "literaryDevices": ["metaphor", "imagery", etc.],
  "era": "estimated time period or style",
  "complexity": "beginner/intermediate/advanced",
  "recommendation": "why readers might enjoy this poem",
  "similarPoets": ["poets with similar style"],
  "keywords": ["searchable keywords for this poem"]
}

Focus on Urdu/Hindi poetry traditions and cultural context.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a literary critic and poetry analyst with expertise in Urdu and Hindi poetry. Provide insightful analysis of poetic works.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.4,
      });

      const content = response.choices[0].message.content;
      const analysis = JSON.parse(content);

      return {
        success: true,
        data: analysis,
        usage: response.usage,
      };
    } catch (error) {
      console.error("OpenAI Tone Analysis Error:", error);
      return {
        success: false,
        error: "Failed to analyze poetry tone",
        details: error.message,
      };
    }
  }

  // Generate "You may also like" suggestions
  async getSimilarPoetry(currentPoem, availablePoems = []) {
    try {
      const prompt = `
Based on this poem, suggest 3-5 similar poems from the available collection:

Current Poem:
Title: ${currentPoem.title}
Author: ${currentPoem.author}
Genre: ${currentPoem.genre}
Content: ${currentPoem.content?.substring(0, 500)}...

Available Poems to Choose From:
${availablePoems
  .slice(0, 20)
  .map((p) => `"${p.title}" by ${p.author} (${p.genre})`)
  .join("\n")}

Provide suggestions in this JSON format:
{
  "suggestions": [
    {
      "title": "poem title",
      "author": "poet name",
      "genre": "genre",
      "similarity_reason": "why this is similar",
      "similarity_score": 0.85
    }
  ],
  "reasoning": "overall explanation of the recommendation logic"
}

Consider theme, style, emotion, meter, and historical period for similarity.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a poetry recommendation engine with deep knowledge of Urdu and Hindi literature. Find meaningful connections between poems.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.6,
      });

      const content = response.choices[0].message.content;
      const suggestions = JSON.parse(content);

      return {
        success: true,
        data: suggestions,
        usage: response.usage,
      };
    } catch (error) {
      console.error("OpenAI Similar Poetry Error:", error);
      return {
        success: false,
        error: "Failed to find similar poetry",
        details: error.message,
      };
    }
  }

  // Summarize poetry for quick understanding
  async summarizePoetry(poemText, poemTitle, poetName) {
    try {
      const prompt = `
Provide a concise summary of this poetry for readers:

Title: ${poemTitle}
Poet: ${poetName}
Text: ${poemText}

Create a summary in this JSON format:
{
  "summary": "2-3 sentence summary of the poem's content and message",
  "mainTheme": "primary theme",
  "keyMessage": "the poet's main message or lesson",
  "readingTime": "estimated reading time",
  "difficulty": "reading difficulty level",
  "culturalSignificance": "brief note on cultural or historical importance",
  "quotableLines": ["1-2 most impactful lines from the poem"]
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a literature teacher who creates accessible summaries of poetry for students and general readers.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      const summary = JSON.parse(content);

      return {
        success: true,
        data: summary,
        usage: response.usage,
      };
    } catch (error) {
      console.error("OpenAI Poetry Summary Error:", error);
      return {
        success: false,
        error: "Failed to summarize poetry",
        details: error.message,
      };
    }
  }

  // Enhance search query for better results
  async enhanceSearchQuery(userQuery) {
    try {
      const prompt = `
Enhance this poetry search query to find better results:

User Query: "${userQuery}"

Generate an enhanced search in this JSON format:
{
  "enhancedQuery": "improved search terms",
  "synonyms": ["alternative terms"],
  "relatedConcepts": ["related poetry concepts"],
  "searchFilters": {
    "genres": ["suggested genres"],
    "themes": ["suggested themes"],
    "emotions": ["suggested emotions"],
    "poets": ["suggested poets if applicable"]
  },
  "originalIntent": "what the user is likely looking for"
}

Consider Urdu/Hindi poetry terminology and cultural context.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a search optimization expert for poetry databases, specializing in Urdu and Hindi literature.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.5,
      });

      const content = response.choices[0].message.content;
      const enhanced = JSON.parse(content);

      return {
        success: true,
        data: enhanced,
        usage: response.usage,
      };
    } catch (error) {
      console.error("OpenAI Search Enhancement Error:", error);
      return {
        success: false,
        error: "Failed to enhance search query",
        details: error.message,
      };
    }
  }
}

module.exports = new OpenAIService();
