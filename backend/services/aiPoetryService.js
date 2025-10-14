import OpenAI from "openai";

// Check if OpenAI API key is properly configured
const isOpenAIConfigured =
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY !== "your-openai-api-key" &&
  process.env.OPENAI_API_KEY.length > 10;

const openai = isOpenAIConfigured
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 8000, // 8 second timeout
    })
  : null;

/**
 * AI Poetry Analysis Service
 * Provides AI-powered analysis, explanations, and insights for Urdu poetry
 */

class AIPoetryService {
  /**
   * Generate detailed explanation and analysis of a poem
   * @param {object} poem - Poem object with title, content, author
   * @returns {object} - AI-generated analysis
   */
  static async analyzePoemContent(poem) {
    try {
      console.log(`🤖 Analyzing poem: ${poem.title}`);

      // Check if OpenAI is configured
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === "your-openai-api-key"
      ) {
        return {
          success: false,
          reason: "OpenAI API not configured",
          analysis: {
            summary: "AI تجزیہ دستیاب نہیں", // AI analysis not available
            literaryDevices: [],
            themes: [],
            emotions: [],
            culturalContext: "",
            linguisticAnalysis: "",
            interpretation: "",
          },
        };
      }

      const prompt = `
تجزیہ کریں اس اردو شاعری کا:

عنوان: "${poem.title}"
شاعر: "${poem.author?.name || "نامعلوم"}"
متن:
"${poem.content}"

براہ کرم فراہم کریں:
1. مختصر خلاصہ اور بنیادی پیغام
2. ادبی آلات (تشبیہ، استعارہ، تلمیح وغیرہ)
3. بنیادی موضوعات اور خیالات
4. جذباتی کیفیت اور احساسات
5. ثقافتی اور تاریخی تناظر
6. زبان اور اسلوب کا تجزیہ
7. ممکنہ تشریح اور معنی

JSON میں جواب دیں:
{
  "summary": "خلاصہ",
  "literaryDevices": ["آلہ1", "آلہ2"],
  "themes": ["موضوع1", "موضوع2"],
  "emotions": ["جذبہ1", "جذبہ2"],
  "culturalContext": "ثقافتی تناظر",
  "linguisticAnalysis": "لسانی تجزیہ",
  "interpretation": "تشریح"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "آپ اردو شاعری اور ادب کے ماہر ہیں۔ کلاسیکی اور جدید اردو شاعری کا گہرا علم رکھتے ہیں۔",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        analysis: {
          ...analysis,
          analyzedAt: new Date().toISOString(),
          confidence: 0.85,
        },
      };
    } catch (error) {
      console.error("AI analysis error:", error);

      // Handle quota exceeded gracefully
      if (error.status === 429 || error.code === "insufficient_quota") {
        return {
          success: true,
          analysis: {
            summary: "یہ شاعری جذبات اور خیالات کا خوبصورت اظہار ہے۔",
            literaryDevices: ["استعارہ", "تشبیہ"],
            themes: ["محبت", "زندگی"],
            emotions: ["خوشی", "غم"],
            culturalContext: "اردو شاعری کی روایتی اقدار کے مطابق",
            linguisticAnalysis: "سادہ اور موثر زبان کا استعمال",
            interpretation: "شاعر نے اپنے جذبات کو خوبصورتی سے بیان کیا ہے۔",
            analyzedAt: new Date().toISOString(),
            confidence: 0.6,
            fallback: true,
          },
        };
      }

      return {
        success: false,
        error: error.message,
        analysis: {
          summary: "تجزیہ دستیاب نہیں",
          literaryDevices: [],
          themes: [],
          emotions: [],
          culturalContext: "",
          linguisticAnalysis: "",
          interpretation: "",
        },
      };
    }
  }

  /**
   * Generate personalized poem recommendations based on user preferences
   * @param {object} userProfile - User's reading history and preferences
   * @param {array} availablePoems - Pool of poems to recommend from
   * @returns {object} - AI-powered recommendations
   */
  static async generatePersonalizedRecommendations(
    userProfile,
    availablePoems
  ) {
    try {
      console.log(`🤖 Generating personalized recommendations for user`);

      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === "your-openai-api-key"
      ) {
        // Return basic recommendations without AI
        return {
          success: true,
          recommendations: availablePoems.slice(0, 10),
          reasoning: "بنیادی تجاویز (AI دستیاب نہیں)",
          fallback: true,
        };
      }

      const userPreferences = {
        favoriteCategories: userProfile.favoriteCategories || [],
        favoritePoets: userProfile.favoritePoets || [],
        recentInteractions: userProfile.recentInteractions || [],
        preferredThemes: userProfile.preferredThemes || [],
        readingHistory: userProfile.readingHistory || [],
      };

      const prompt = `
صارف کی ترجیحات:
- پسندیدہ اصناف: ${userPreferences.favoriteCategories.join(", ")}
- پسندیدہ شعراء: ${userPreferences.favoritePoets.join(", ")}
- پسندیدہ موضوعات: ${userPreferences.preferredThemes.join(", ")}

دستیاب شاعری کی فہرست سے بہترین 10 تجاویز دیں جو صارف کی ترجیحات سے میل کھاتی ہوں۔

JSON میں جواب دیں:
{
  "recommendedPoemIds": ["id1", "id2", "id3", ...],
  "reasoning": "تجاویز کی وجوہات",
  "diversityScore": 0.8,
  "confidenceScore": 0.9
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "آپ شاعری کی تجاویز دینے میں ماہر ہیں اور صارفین کی ترجیحات کو سمجھتے ہیں۔",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.6,
      });

      const aiRecommendations = JSON.parse(response.choices[0].message.content);

      // Filter available poems based on AI recommendations
      const recommendedPoems = availablePoems.filter((poem) =>
        aiRecommendations.recommendedPoemIds.includes(poem._id.toString())
      );

      return {
        success: true,
        recommendations: recommendedPoems,
        reasoning: aiRecommendations.reasoning,
        diversityScore: aiRecommendations.diversityScore,
        confidenceScore: aiRecommendations.confidenceScore,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("AI recommendations error:", error);

      // Fallback to basic recommendations
      return {
        success: true,
        recommendations: availablePoems.slice(0, 10),
        reasoning: "بنیادی تجاویز (AI میں خرابی)",
        fallback: true,
        error: error.message,
      };
    }
  }

  /**
   * Generate thematic analysis of multiple poems
   * @param {array} poems - Array of poems to analyze
   * @returns {object} - Thematic analysis
   */
  static async generateThematicAnalysis(poems) {
    try {
      console.log(`🤖 Generating thematic analysis for ${poems.length} poems`);

      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === "your-openai-api-key"
      ) {
        return {
          success: false,
          reason: "OpenAI API not configured",
          analysis: {
            commonThemes: ["محبت", "زندگی", "قدرت"],
            emotionalTone: "مختلط",
            literaryStyle: "کلاسیکی",
            culturalElements: [],
          },
        };
      }

      const poemSummaries = poems.map((poem) => ({
        title: poem.title,
        author: poem.author?.name,
        excerpt: poem.content.substring(0, 200),
      }));

      const prompt = `
ان اردو نظموں کا موضوعاتی تجزیہ کریں:

${poemSummaries
  .map((p, i) => `${i + 1}. "${p.title}" - ${p.author}\n"${p.excerpt}..."`)
  .join("\n\n")}

فراہم کریں:
1. مشترکہ موضوعات
2. جذباتی کیفیت
3. ادبی اسلوب
4. ثقافتی عناصر
5. زمانی تناظر

JSON میں جواب:
{
  "commonThemes": ["موضوع1", "موضوع2"],
  "emotionalTone": "جذباتی کیفیت",
  "literaryStyle": "ادبی اسلوب",
  "culturalElements": ["عنصر1", "عنصر2"],
  "temporalContext": "زمانی تناظر",
  "insights": "خاص نکات"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "آپ ادبی تجزیہ کار ہیں جو اردو شاعری کے موضوعات اور رجحانات کا تجزیہ کرتے ہیں۔",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.5,
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        analysis: {
          ...analysis,
          poemCount: poems.length,
          analyzedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Thematic analysis error:", error);

      return {
        success: false,
        error: error.message,
        analysis: {
          commonThemes: ["محبت", "زندگی"],
          emotionalTone: "مختلط جذبات",
          literaryStyle: "روایتی",
          culturalElements: ["اردو ادب"],
          temporalContext: "معاصر",
          insights: "تجزیہ دستیاب نہیں",
        },
      };
    }
  }

  /**
   * Generate writing suggestions for poets
   * @param {string} theme - Desired theme for the poem
   * @param {string} style - Preferred style (ghazal, nazm, etc.)
   * @returns {object} - Writing suggestions
   */
  static async generateWritingSuggestions(theme, style = "ghazal") {
    try {
      console.log(
        `🤖 Generating writing suggestions for theme: ${theme}, style: ${style}`
      );

      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === "your-openai-api-key"
      ) {
        return {
          success: false,
          reason: "OpenAI API not configured",
          suggestions: {
            keyWords: ["محبت", "دل", "آنکھیں"],
            rhymeSchemes: ["aa", "aaba"],
            openingLines: ["دل میں چھپے ہیں کیا راز"],
            metaphors: ["دل = پرندہ", "آنکھیں = ستارے"],
          },
        };
      }

      const prompt = `
اردو ${style} لکھنے کے لیے "${theme}" کے موضوع پر تجاویز دیں:

1. کلیدی الفاظ اور اظہار
2. قافیہ اور ردیف کی تجاویز
3. ابتدائی اشعار کی مثالیں
4. استعارے اور تشبیہات
5. موضوع کے مطابق جذباتی کیفیت

JSON میں جواب:
{
  "keyWords": ["کلیدی الفاظ"],
  "rhymeSchemes": ["قافیہ کی شکل"],
  "openingLines": ["ابتدائی مصرعے"],
  "metaphors": ["استعارے"],
  "emotionalTones": ["جذباتی کیفیات"],
  "culturalReferences": ["ثقافتی حوالے"],
  "tips": ["تجاویز"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "آپ اردو شاعری کے استاد ہیں جو نئے شعراء کی رہنمائی کرتے ہیں۔",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1200,
        temperature: 0.8,
      });

      const suggestions = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        suggestions: {
          ...suggestions,
          theme,
          style,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Writing suggestions error:", error);

      // Handle quota exceeded gracefully
      if (error.status === 429 || error.code === "insufficient_quota") {
        return {
          success: true,
          suggestions: {
            keyWords: ["محبت", "دل", "نگاہ", "خواب", "یاد"],
            rhymeSchemes: ["aa", "aaba", "abab"],
            openingLines: [
              "دل میں بسا ہے عشق کا جادو",
              "نگاہوں میں چھپے ہیں کیا راز",
              "خوابوں کی دنیا میں کھو جانا",
            ],
            metaphors: ["دل = آئینہ", "آنکھیں = ستارے", "محبت = آگ"],
            emotionalTones: ["رومانی", "درد بھرا", "امید افزا"],
            culturalReferences: ["چاند", "بلبل", "گلاب"],
            tips: [
              "سادہ زبان استعمال کریں",
              "جذبات کو صاف انداز میں بیان کریں",
            ],
            theme,
            style,
            fallback: true,
            generatedAt: new Date().toISOString(),
          },
        };
      }

      return {
        success: false,
        error: error.message,
        suggestions: {
          keyWords: [],
          rhymeSchemes: [],
          openingLines: [],
          metaphors: [],
          emotionalTones: [],
          culturalReferences: [],
          tips: [],
        },
      };
    }
  }

  /**
   * Evaluate and score a poem based on various criteria
   * @param {object} poem - Poem to evaluate
   * @returns {object} - Evaluation scores and feedback
   */
  static async evaluatePoem(poem) {
    try {
      console.log(`🤖 Evaluating poem: ${poem.title}`);

      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === "your-openai-api-key"
      ) {
        return {
          success: false,
          reason: "OpenAI API not configured",
          evaluation: {
            overallScore: 7.5,
            literaryQuality: 7,
            emotionalImpact: 8,
            linguisticBeauty: 7,
            originality: 8,
            feedback: "AI evaluation دستیاب نہیں",
          },
        };
      }

      const prompt = `
اس اردو شاعری کا تجزیہ اور نمبریں دیں:

عنوان: "${poem.title}"
متن: "${poem.content}"

درج ذیل پیمانوں پر 1-10 پیمانے پر نمبریں دیں:
1. ادبی معیار (Literary Quality)
2. جذباتی اثر (Emotional Impact)  
3. لسانی خوبصورتی (Linguistic Beauty)
4. اصلیت (Originality)
5. تکنیکی مہارت (Technical Skill)

JSON میں جواب:
{
  "overallScore": 8.5,
  "scores": {
    "literaryQuality": 8,
    "emotionalImpact": 9,
    "linguisticBeauty": 8,
    "originality": 8,
    "technicalSkill": 9
  },
  "strengths": ["طاقت کے پہلو"],
  "improvements": ["بہتری کی تجاویز"],
  "feedback": "تفصیلی رائے"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "آپ اردو شاعری کے نقاد اور استاد ہیں جو منصفانہ تجزیہ کرتے ہیں۔",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.4,
      });

      const evaluation = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        evaluation: {
          ...evaluation,
          evaluatedAt: new Date().toISOString(),
          confidence: 0.8,
        },
      };
    } catch (error) {
      console.error("Poem evaluation error:", error);

      return {
        success: false,
        error: error.message,
        evaluation: {
          overallScore: 0,
          scores: {
            literaryQuality: 0,
            emotionalImpact: 0,
            linguisticBeauty: 0,
            originality: 0,
            technicalSkill: 0,
          },
          strengths: [],
          improvements: [],
          feedback: "تجزیہ دستیاب نہیں",
        },
      };
    }
  }
}

export default AIPoetryService;
