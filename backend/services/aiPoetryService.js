/**
 * AI Poetry Service – OpenAI GPT-4o powered
 * Provides poem analysis, personalized recommendations, thematic analysis,
 * writing suggestions, and evaluation.
 *
 * Falls back to deterministic static responses when OpenAI is not configured
 * or a call fails, so the API contract never breaks the UI.
 */
import { chatGPT, isOpenAIConfigured } from "../utils/openaiClient.js";

const FALLBACK = {
  analysis: {
    summary: "یہ شاعری جذبات اور خیالات کا خوبصورت اظہار ہے۔",
    literaryDevices: ["استعارہ", "تشبیہ"],
    themes: ["محبت", "زندگی"],
    emotions: ["خوشی", "غم"],
    culturalContext: "اردو شاعری کی روایتی اقدار کے مطابق",
    linguisticAnalysis: "سادہ اور موثر زبان کا استعمال",
    interpretation: "شاعر نے اپنے جذبات کو خوبصورتی سے بیان کیا ہے۔",
    confidence: 0.6,
  },
  thematic: {
    commonThemes: ["محبت", "زندگی", "قدرت"],
    emotionalTone: "مختلط",
    literaryStyle: "کلاسیکی",
    culturalElements: ["اردو ادب"],
    temporalContext: "معاصر",
    insights: "تجزیہ دستیاب نہیں",
  },
  writing: {
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
    tips: ["سادہ زبان استعمال کریں", "جذبات کو صاف انداز میں بیان کریں"],
  },
  evaluation: {
    overallScore: 7.5,
    scores: {
      literaryQuality: 7,
      emotionalImpact: 8,
      linguisticBeauty: 7,
      originality: 8,
      technicalSkill: 7,
    },
    strengths: ["جذباتی اظہار", "ادبی معیار"],
    improvements: ["مزید تخلیقی انداز"],
    feedback: "بہترین کوشش ہے، جذبات کا اظہار خوب ہے۔",
    confidence: 0.6,
  },
};

class AIPoetryService {
  static isConfigured() {
    return isOpenAIConfigured();
  }

  /**
   * Analyze a poem using GPT-4o.
   * @param {string} poemText
   */
  static async analyzePoem(poemText) {
    const text = (poemText || "").toString().trim();
    if (!text) {
      return { success: true, analysis: { ...FALLBACK.analysis, fallback: true, analyzedAt: new Date().toISOString() } };
    }

    const result = await chatGPT({
      system:
        "You are an expert critic of Urdu poetry. Respond in JSON only. All textual values (summary, interpretation, themes, emotions, literaryDevices, culturalContext, linguisticAnalysis) MUST be written in Urdu (Nastaliq).",
      user: `Analyze this Urdu poem and return a JSON object with keys: summary, literaryDevices (array), themes (array), emotions (array), culturalContext, linguisticAnalysis, interpretation.\n\nPoem:\n${text}`,
      json: true,
      temperature: 0.6,
      maxTokens: 800,
    });

    if (!result || typeof result !== "object") {
      return {
        success: true,
        analysis: { ...FALLBACK.analysis, fallback: true, analyzedAt: new Date().toISOString() },
      };
    }

    return {
      success: true,
      analysis: {
        summary: result.summary || FALLBACK.analysis.summary,
        literaryDevices: Array.isArray(result.literaryDevices) ? result.literaryDevices : FALLBACK.analysis.literaryDevices,
        themes: Array.isArray(result.themes) ? result.themes : FALLBACK.analysis.themes,
        emotions: Array.isArray(result.emotions) ? result.emotions : FALLBACK.analysis.emotions,
        culturalContext: result.culturalContext || FALLBACK.analysis.culturalContext,
        linguisticAnalysis: result.linguisticAnalysis || FALLBACK.analysis.linguisticAnalysis,
        interpretation: result.interpretation || FALLBACK.analysis.interpretation,
        confidence: 0.9,
        analyzedAt: new Date().toISOString(),
        fallback: false,
      },
    };
  }

  /**
   * Pick + rank personalized poem recommendations.
   * @param {object} userProfile
   * @param {Array} availablePoems Mongoose docs or plain objects
   */
  static async generatePersonalizedRecommendations(userProfile, availablePoems) {
    const pool = Array.isArray(availablePoems) ? availablePoems : [];
    if (pool.length === 0) {
      return {
        success: true,
        recommendations: [],
        reasoning: "کوئی موزوں شاعری دستیاب نہیں",
        diversityScore: 0,
        confidenceScore: 0,
        fallback: true,
        generatedAt: new Date().toISOString(),
      };
    }

    if (!isOpenAIConfigured()) {
      return {
        success: true,
        recommendations: pool.slice(0, 10),
        reasoning: "بنیادی تجاویز",
        diversityScore: 0.5,
        confidenceScore: 0.5,
        fallback: true,
        generatedAt: new Date().toISOString(),
      };
    }

    // Build compact prompt: just id + title + category + theme + first lines
    const candidates = pool.slice(0, 30).map((p, idx) => ({
      idx,
      id: String(p._id || p.id || idx),
      title: p.title || "بے عنوان",
      category: p.category || "",
      theme: p.theme || "",
      mood: p.mood || "",
      author: p.author?.name || p.author || "",
      snippet: ((p.content || p.text || "") + "").slice(0, 120),
    }));

    const profile = {
      favoriteCategories: userProfile?.favoriteCategories || [],
      favoritePoets: userProfile?.favoritePoets || [],
      preferredThemes: userProfile?.preferredThemes || [],
    };

    const result = await chatGPT({
      system:
        "You are an Urdu poetry recommendation engine. Pick the 10 most relevant poems for the user. Respond as JSON. The 'reasoning' value MUST be a short Urdu sentence (Nastaliq).",
      user: `User profile: ${JSON.stringify(profile)}\n\nCandidate poems:\n${JSON.stringify(
        candidates
      )}\n\nReturn JSON: { "selectedIds": ["id1", "id2", ...up to 10], "reasoning": "<Urdu reason>", "diversityScore": 0-1, "confidenceScore": 0-1 }`,
      json: true,
      temperature: 0.5,
      maxTokens: 600,
    });

    if (!result || !Array.isArray(result.selectedIds)) {
      return {
        success: true,
        recommendations: pool.slice(0, 10),
        reasoning: "بنیادی تجاویز",
        diversityScore: 0.5,
        confidenceScore: 0.5,
        fallback: true,
        generatedAt: new Date().toISOString(),
      };
    }

    const ranked = [];
    const byId = new Map(candidates.map((c) => [c.id, c]));
    result.selectedIds.forEach((id) => {
      const cand = byId.get(String(id));
      if (cand) {
        const poem = pool[cand.idx];
        if (poem) ranked.push(poem);
      }
    });

    // Pad if AI returned fewer than 10
    if (ranked.length < 10) {
      pool.forEach((p) => {
        if (ranked.length < 10 && !ranked.includes(p)) ranked.push(p);
      });
    }

    return {
      success: true,
      recommendations: ranked,
      reasoning: result.reasoning || "آپ کی پسند کے مطابق منتخب کلام",
      diversityScore: typeof result.diversityScore === "number" ? result.diversityScore : 0.7,
      confidenceScore: typeof result.confidenceScore === "number" ? result.confidenceScore : 0.8,
      fallback: false,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Cross-poem thematic analysis.
   * @param {Array} poems
   */
  static async generateThematicAnalysis(poems) {
    const list = Array.isArray(poems) ? poems : [];
    if (list.length === 0 || !isOpenAIConfigured()) {
      return {
        success: true,
        analysis: {
          ...FALLBACK.thematic,
          poemCount: list.length,
          analyzedAt: new Date().toISOString(),
          fallback: true,
        },
      };
    }

    const snippets = list.slice(0, 20).map((p, idx) => ({
      idx,
      title: p.title || "بے عنوان",
      snippet: ((p.content || p.text || "") + "").slice(0, 200),
    }));

    const result = await chatGPT({
      system:
        "You are an Urdu literature scholar. Respond in JSON only. All textual values MUST be Urdu (Nastaliq).",
      user: `Perform thematic analysis across these ${snippets.length} Urdu poems and return JSON: { commonThemes (array), emotionalTone, literaryStyle, culturalElements (array), temporalContext, insights }.\n\nPoems:\n${JSON.stringify(snippets)}`,
      json: true,
      temperature: 0.6,
      maxTokens: 700,
    });

    if (!result || typeof result !== "object") {
      return {
        success: true,
        analysis: {
          ...FALLBACK.thematic,
          poemCount: list.length,
          analyzedAt: new Date().toISOString(),
          fallback: true,
        },
      };
    }

    return {
      success: true,
      analysis: {
        commonThemes: Array.isArray(result.commonThemes) ? result.commonThemes : FALLBACK.thematic.commonThemes,
        emotionalTone: result.emotionalTone || FALLBACK.thematic.emotionalTone,
        literaryStyle: result.literaryStyle || FALLBACK.thematic.literaryStyle,
        culturalElements: Array.isArray(result.culturalElements) ? result.culturalElements : FALLBACK.thematic.culturalElements,
        temporalContext: result.temporalContext || FALLBACK.thematic.temporalContext,
        insights: result.insights || FALLBACK.thematic.insights,
        poemCount: list.length,
        analyzedAt: new Date().toISOString(),
        fallback: false,
      },
    };
  }

  /**
   * Writing suggestions for a poet starting a new poem.
   */
  static async generateWritingSuggestions(theme, style = "ghazal") {
    if (!isOpenAIConfigured()) {
      return {
        success: true,
        suggestions: {
          ...FALLBACK.writing,
          theme,
          style,
          fallback: true,
          generatedAt: new Date().toISOString(),
        },
      };
    }

    const result = await chatGPT({
      system:
        "You are an expert Urdu poet and mentor. Respond as JSON only. All textual values MUST be in Urdu (Nastaliq) except rhymeSchemes.",
      user: `Generate writing suggestions for an Urdu ${style} on the theme "${theme || "محبت"}". Return JSON: { keyWords (array of Urdu words), rhymeSchemes (array of patterns like "aa","aaba"), openingLines (array of 3 Urdu opening verses), metaphors (array), emotionalTones (array), culturalReferences (array), tips (array of Urdu tips) }.`,
      json: true,
      temperature: 0.8,
      maxTokens: 700,
    });

    if (!result || typeof result !== "object") {
      return {
        success: true,
        suggestions: {
          ...FALLBACK.writing,
          theme,
          style,
          fallback: true,
          generatedAt: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      suggestions: {
        keyWords: Array.isArray(result.keyWords) ? result.keyWords : FALLBACK.writing.keyWords,
        rhymeSchemes: Array.isArray(result.rhymeSchemes) ? result.rhymeSchemes : FALLBACK.writing.rhymeSchemes,
        openingLines: Array.isArray(result.openingLines) ? result.openingLines : FALLBACK.writing.openingLines,
        metaphors: Array.isArray(result.metaphors) ? result.metaphors : FALLBACK.writing.metaphors,
        emotionalTones: Array.isArray(result.emotionalTones) ? result.emotionalTones : FALLBACK.writing.emotionalTones,
        culturalReferences: Array.isArray(result.culturalReferences) ? result.culturalReferences : FALLBACK.writing.culturalReferences,
        tips: Array.isArray(result.tips) ? result.tips : FALLBACK.writing.tips,
        theme,
        style,
        fallback: false,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Evaluate a poem on multiple criteria.
   */
  static async evaluatePoem(poem) {
    const text = (poem?.content || poem?.text || poem || "").toString().trim();
    if (!text || !isOpenAIConfigured()) {
      return {
        success: true,
        evaluation: {
          ...FALLBACK.evaluation,
          evaluatedAt: new Date().toISOString(),
          fallback: true,
        },
      };
    }

    const result = await chatGPT({
      system:
        "You are a strict Urdu poetry judge. Respond as JSON only. Scores are 0-10 integers. Feedback / strengths / improvements MUST be in Urdu (Nastaliq).",
      user: `Evaluate this Urdu poem and return JSON: { overallScore (0-10 number), scores: { literaryQuality, emotionalImpact, linguisticBeauty, originality, technicalSkill }, strengths (array of Urdu), improvements (array of Urdu), feedback (Urdu paragraph) }.\n\nPoem:\n${text}`,
      json: true,
      temperature: 0.4,
      maxTokens: 600,
    });

    if (!result || typeof result !== "object") {
      return {
        success: true,
        evaluation: {
          ...FALLBACK.evaluation,
          evaluatedAt: new Date().toISOString(),
          fallback: true,
        },
      };
    }

    return {
      success: true,
      evaluation: {
        overallScore: typeof result.overallScore === "number" ? result.overallScore : FALLBACK.evaluation.overallScore,
        scores: result.scores && typeof result.scores === "object" ? result.scores : FALLBACK.evaluation.scores,
        strengths: Array.isArray(result.strengths) ? result.strengths : FALLBACK.evaluation.strengths,
        improvements: Array.isArray(result.improvements) ? result.improvements : FALLBACK.evaluation.improvements,
        feedback: result.feedback || FALLBACK.evaluation.feedback,
        evaluatedAt: new Date().toISOString(),
        confidence: 0.9,
        fallback: false,
      },
    };
  }

  /**
   * Constructive feedback / writing improvement suggestions for a draft.
   */
  static async generatePoetFeedback(content, language = "urdu") {
    if (!content || !isOpenAIConfigured()) {
      return {
        success: true,
        data: {
          impression: "بہترین کوشش ہے۔",
          improvements: ["مزید استعاروں کا استعمال کریں"],
          wordChoices: [],
          context: "اردو شاعری کی روایت",
          encouragement: "تخلیقی سفر جاری رکھیں۔",
          fallback: true,
        },
      };
    }

    const result = await chatGPT({
      system:
        "You are an expert Urdu poetry mentor. Respond as JSON only. All textual values MUST be in Urdu (Nastaliq).",
      user: `Provide constructive feedback for this ${language} poem. Return JSON: { impression, improvements (array), wordChoices (array of {original, suggestion}), context, encouragement }.\n\nPoem:\n${content}`,
      json: true,
      temperature: 0.6,
      maxTokens: 700,
    });

    if (!result || typeof result !== "object") {
      return {
        success: true,
        data: {
          impression: "بہترین کوشش ہے۔",
          improvements: ["مزید استعاروں کا استعمال کریں"],
          wordChoices: [],
          context: "اردو شاعری کی روایت",
          encouragement: "تخلیقی سفر جاری رکھیں۔",
          fallback: true,
        },
      };
    }

    return { success: true, data: { ...result, fallback: false } };
  }

  /**
   * Translate a poem between Urdu <-> English while preserving meaning.
   */
  static async translatePoem(content, fromLanguage, toLanguage) {
    if (!content || !isOpenAIConfigured()) {
      return {
        success: false,
        message: "ترجمہ دستیاب نہیں",
        data: {},
      };
    }

    const result = await chatGPT({
      system:
        "You are a literary translator specialising in Urdu poetry. Preserve rhythm, imagery and emotional depth.",
      user: `Translate the following ${fromLanguage} poem into ${toLanguage}. Return ONLY the translated poem (no commentary, no quotes).\n\nOriginal:\n${content}`,
      json: false,
      temperature: 0.6,
      maxTokens: 700,
    });

    if (!result) {
      return { success: false, message: "ترجمہ ناکام رہا", data: {} };
    }

    return {
      success: true,
      data: {
        translation: result,
        fromLanguage,
        toLanguage,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export default AIPoetryService;
