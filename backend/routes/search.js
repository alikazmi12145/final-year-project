import express from "express";
import { body, validationResult } from "express-validator";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import Fuse from "fuse.js";
import natural from "natural";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import {
  textSearch,
  fuzzySearch,
  voiceSearch,
  imageSearch,
  advancedSearch,
  getSmartSuggestions,
  unifiedSearch,
} from "../controllers/searchController.js";

const router = express.Router();

// Rate limiting - moved to top to be available for all routes
const searchLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many search requests from this IP, please try again later.",
});

// Multer configuration for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Unified Search endpoint for all search types
router.post("/", searchLimit, async (req, res) => {
  try {
    const { mode = "text", ...searchParams } = req.body;

    console.log(`🔍 Unified search request - Mode: ${mode}`, searchParams);

    switch (mode) {
      case "text":
        return await textSearch(req, res);
      case "voice":
        return await voiceSearch(req, res);
      case "image":
        return await imageSearch(req, res);
      case "fuzzy":
        return await fuzzySearch(req, res);
      case "advanced":
        return await advancedSearch(req, res);
      default:
        return res.status(400).json({
          success: false,
          message: `Invalid search mode: ${mode}. Valid modes: text, voice, image, fuzzy, advanced`,
        });
    }
  } catch (error) {
    console.error("❌ Unified search error:", error);
    return res.status(500).json({
      success: false,
      message: "Search service error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Health check endpoint for search service
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Search service is running",
    timestamp: new Date().toISOString(),
    aiConfigured:
      process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY !== "your-openai-api-key",
  });
});

// Urdu stop words for better search
const urduStopWords = [
  "کا",
  "کی",
  "کے",
  "میں",
  "کو",
  "سے",
  "پر",
  "اور",
  "یا",
  "لیے",
  "ہے",
  "ہیں",
  "تھا",
  "تھے",
  "گا",
  "گی",
  "گے",
  "نے",
  "کہ",
  "جو",
  "جس",
  "تو",
  "یہ",
  "وہ",
  "اس",
  "ان",
  "کوئی",
  "کچھ",
  "سب",
  "تمام",
  "بہت",
  "زیادہ",
  "کم",
];

// Fuzzy search configuration
const fuseOptions = {
  includeScore: true,
  threshold: 0.3,
  keys: [
    { name: "title", weight: 0.4 },
    { name: "content", weight: 0.3 },
    { name: "category", weight: 0.1 },
    { name: "tags", weight: 0.1 },
    { name: "author.name", weight: 0.1 },
  ],
};

// AI Multi-Modal Search Endpoints
router.post(
  "/text",
  searchLimit,
  [
    body("query").isLength({ min: 1, max: 500 }).trim(),
    body("limit").optional().isInt({ min: 1, max: 100 }),
    body("page").optional().isInt({ min: 1 }),
  ],
  textSearch
);

router.post(
  "/fuzzy",
  searchLimit,
  [
    body("query").isLength({ min: 1, max: 500 }).trim(),
    body("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  fuzzySearch
);

router.post(
  "/voice",
  searchLimit,
  [
    body("transcribedText").isLength({ min: 1, max: 500 }).trim(),
    body("confidence").optional().isFloat({ min: 0, max: 1 }),
  ],
  voiceSearch
);

router.post("/image", searchLimit, [body("image").notEmpty()], imageSearch);

router.post(
  "/advanced",
  searchLimit,
  [
    body("query").optional().isLength({ max: 500 }).trim(),
    body("poetName").optional().isLength({ max: 100 }).trim(),
    body("category").optional().isString(),
    body("mood").optional().isString(),
    body("theme").optional().isString(),
    body("language").optional().isString(),
    body("minRating").optional().isFloat({ min: 0, max: 5 }),
    body("sortBy")
      .optional()
      .isIn(["relevance", "newest", "oldest", "mostViewed", "topRated"]),
    body("limit").optional().isInt({ min: 1, max: 100 }),
    body("page").optional().isInt({ min: 1 }),
  ],
  advancedSearch
);

// Smart AI-powered suggestions
router.post(
  "/suggestions",
  searchLimit,
  [body("partialQuery").isLength({ min: 2, max: 100 }).trim()],
  getSmartSuggestions
);

// 🚀 UNIFIED SEARCH - Combines Database, Rekhta API, and OpenAI
router.post(
  "/unified",
  searchLimit,
  [
    body("query").isLength({ min: 1, max: 500 }).trim(),
    body("limit").optional().isInt({ min: 1, max: 50 }),
    body("page").optional().isInt({ min: 1 }),
    body("useAI").optional().isBoolean(),
    body("includeRekhta").optional().isBoolean(),
    body("sources").optional().isArray(),
  ],
  unifiedSearch
);

// Legacy text search with AI enhancement
router.post(
  "/legacy",
  searchLimit,
  [
    body("query").isLength({ min: 1, max: 500 }).trim(),
    body("filters").optional().isObject(),
    body("advanced").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        query,
        filters = {},
        advanced = false,
        page = 1,
        limit = 20,
        sortBy = "relevance",
      } = req.body;

      // Build search query
      let searchQuery = { status: "published" };

      // Apply filters
      if (filters.category && filters.category !== "all") {
        searchQuery.category = filters.category;
      }
      if (filters.author) {
        const authors = await User.find({
          name: { $regex: query, $options: "i" },
        }).select("_id");
        searchQuery.author = { $in: authors.map((a) => a._id) };
      }
      if (filters.language && filters.language !== "all") {
        searchQuery.language = filters.language;
      }
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        if (start) searchQuery.createdAt = { $gte: new Date(start) };
        if (end)
          searchQuery.createdAt = {
            ...searchQuery.createdAt,
            $lte: new Date(end),
          };
      }

      let results = [];

      if (advanced) {
        // AI-enhanced search with fuzzy matching
        const allPoems = await Poem.find(searchQuery)
          .populate("author", "name isVerified")
          .lean();

        // Create Fuse instance for fuzzy search
        const fuse = new Fuse(allPoems, fuseOptions);
        const fuseResults = fuse.search(query);

        results = fuseResults.map((result) => ({
          ...result.item,
          relevanceScore: 1 - result.score,
          searchType: "fuzzy",
        }));

        // Also perform traditional text search
        const textResults = await Poem.find({
          ...searchQuery,
          $or: [
            { title: { $regex: query, $options: "i" } },
            { content: { $regex: query, $options: "i" } },
            { tags: { $regex: query, $options: "i" } },
          ],
        })
          .populate("author", "name isVerified")
          .lean();

        // Merge and deduplicate results
        const combinedResults = [...results];
        textResults.forEach((textResult) => {
          const exists = results.find(
            (r) => r._id.toString() === textResult._id.toString()
          );
          if (!exists) {
            combinedResults.push({
              ...textResult,
              relevanceScore: 0.8,
              searchType: "text",
            });
          }
        });

        results = combinedResults;
      } else {
        // Simple text search
        results = await Poem.find({
          ...searchQuery,
          $or: [
            { title: { $regex: query, $options: "i" } },
            { content: { $regex: query, $options: "i" } },
          ],
        })
          .populate("author", "name isVerified")
          .lean();

        results = results.map((poem) => ({
          ...poem,
          relevanceScore: calculateRelevanceScore(poem, query),
          searchType: "basic",
        }));
      }

      // Sort results
      if (sortBy === "relevance") {
        results.sort(
          (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
        );
      } else if (sortBy === "date") {
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (sortBy === "popularity") {
        results.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      }

      // Pagination
      const total = results.length;
      const skipCount = (page - 1) * limit;
      const paginatedResults = results.slice(skipCount, skipCount + limit);

      // Enhance results with snippets
      const enhancedResults = paginatedResults.map((poem) => ({
        id: poem._id,
        title: poem.title,
        content: poem.content,
        author: poem.author,
        category: poem.category,
        tags: poem.tags,
        likesCount: poem.likesCount || 0,
        commentsCount: poem.commentsCount || 0,
        createdAt: poem.createdAt,
        relevanceScore: poem.relevanceScore,
        searchType: poem.searchType,
        snippet: generateSnippet(poem.content, query),
      }));

      // Search suggestions
      const suggestions = await generateSearchSuggestions(query);

      res.json({
        success: true,
        results: enhancedResults,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        searchMeta: {
          query,
          totalResults: total,
          searchTime: Date.now(),
          suggestions,
          filters: {
            categories: await Poem.distinct("category"),
            languages: ["urdu", "punjabi", "arabic", "persian"],
          },
        },
      });
    } catch (error) {
      console.error("Text search error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform text search",
      });
    }
  }
);

// Voice search (speech-to-text)
router.post("/voice", searchLimit, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required",
      });
    }

    // For now, return a placeholder response
    // In production, you would integrate with speech-to-text services like:
    // - Google Speech-to-Text API
    // - Azure Speech Services
    // - AWS Transcribe

    res.json({
      success: true,
      message: "Voice search is not yet implemented",
      transcribedText: "Voice search functionality coming soon",
      results: [],
    });
  } catch (error) {
    console.error("Voice search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process voice search",
    });
  }
});

// Image search with OCR
router.post("/image", searchLimit, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    // For now, return a placeholder response
    // In production, you would integrate with OCR services like:
    // - Tesseract.js for client-side OCR
    // - Google Cloud Vision API
    // - Azure Computer Vision
    // - AWS Textract

    res.json({
      success: true,
      message: "Image search is not yet implemented",
      extractedText: "Image OCR functionality coming soon",
      results: [],
    });
  } catch (error) {
    console.error("Image search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process image search",
    });
  }
});

// Semantic search (meaning-based)
router.post(
  "/semantic",
  searchLimit,
  [
    body("query").isLength({ min: 1, max: 500 }).trim(),
    body("context").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { query, context } = req.body;

      // Semantic search using natural language processing
      const synonyms = findSynonyms(query);
      const relatedTerms = findRelatedTerms(query);

      // Build semantic search query
      const searchTerms = [query, ...synonyms, ...relatedTerms];
      const searchRegex = searchTerms.join("|");

      const results = await Poem.find({
        status: "published",
        $or: [
          { title: { $regex: searchRegex, $options: "i" } },
          { content: { $regex: searchRegex, $options: "i" } },
          { tags: { $regex: searchRegex, $options: "i" } },
        ],
      })
        .populate("author", "name isVerified")
        .limit(50)
        .lean();

      // Calculate semantic similarity scores
      const enhancedResults = results.map((poem) => ({
        ...poem,
        semanticScore: calculateSemanticScore(poem, searchTerms),
        matchedTerms: findMatchedTerms(poem, searchTerms),
      }));

      // Sort by semantic relevance
      enhancedResults.sort((a, b) => b.semanticScore - a.semanticScore);

      res.json({
        success: true,
        results: enhancedResults.slice(0, 20),
        searchMeta: {
          originalQuery: query,
          expandedTerms: searchTerms,
          context: context || null,
        },
      });
    } catch (error) {
      console.error("Semantic search error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform semantic search",
      });
    }
  }
);

// Multi-modal search (combines text, voice, and image)
router.post(
  "/multimodal",
  searchLimit,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  [
    body("textQuery").optional().isString(),
    body("searchMode").isIn(["comprehensive", "quick"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { textQuery, searchMode = "quick" } = req.body;
      const { image, audio } = req.files || {};

      let combinedQuery = textQuery || "";
      const searchSources = [];

      // Process text input
      if (textQuery) {
        searchSources.push({
          type: "text",
          query: textQuery,
          confidence: 1.0,
        });
      }

      // Process image input (OCR placeholder)
      if (image && image[0]) {
        searchSources.push({
          type: "image",
          query: "OCR text extraction placeholder",
          confidence: 0.8,
        });
      }

      // Process audio input (speech-to-text placeholder)
      if (audio && audio[0]) {
        searchSources.push({
          type: "voice",
          query: "Speech transcription placeholder",
          confidence: 0.9,
        });
      }

      // Combine all queries
      const allQueries = searchSources.map((s) => s.query).filter(Boolean);
      combinedQuery = allQueries.join(" ");

      if (!combinedQuery.trim()) {
        return res.status(400).json({
          success: false,
          message: "At least one search input is required",
        });
      }

      // Perform comprehensive search
      const results = await Poem.find({
        status: "published",
        $or: [
          { title: { $regex: combinedQuery, $options: "i" } },
          { content: { $regex: combinedQuery, $options: "i" } },
          { tags: { $regex: combinedQuery, $options: "i" } },
        ],
      })
        .populate("author", "name isVerified")
        .limit(30)
        .lean();

      // Calculate multi-modal relevance scores
      const enhancedResults = results.map((poem) => {
        const textScore = calculateRelevanceScore(poem, combinedQuery);
        const modalityBonus = searchSources.length * 0.1; // Bonus for multiple search modes

        return {
          ...poem,
          relevanceScore: textScore + modalityBonus,
          searchSources: searchSources.map((s) => ({
            type: s.type,
            confidence: s.confidence,
          })),
        };
      });

      enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      res.json({
        success: true,
        results: enhancedResults,
        searchMeta: {
          combinedQuery,
          searchSources,
          searchMode,
          totalInputs: searchSources.length,
        },
      });
    } catch (error) {
      console.error("Multi-modal search error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform multi-modal search",
      });
    }
  }
);

// Search suggestions
router.get("/suggestions", searchLimit, getSmartSuggestions);

// Helper functions
function calculateRelevanceScore(poem, query) {
  const queryLower = query.toLowerCase();
  const titleMatches =
    (poem.title?.toLowerCase().includes(queryLower) ? 1 : 0) * 0.4;
  const contentMatches =
    (poem.content?.toLowerCase().includes(queryLower) ? 1 : 0) * 0.3;
  const tagMatches =
    (poem.tags?.some((tag) => tag.toLowerCase().includes(queryLower)) ? 1 : 0) *
    0.2;
  const authorMatches =
    (poem.author?.name?.toLowerCase().includes(queryLower) ? 1 : 0) * 0.1;

  return titleMatches + contentMatches + tagMatches + authorMatches;
}

function generateSnippet(content, query) {
  const words = content.split(" ");
  const queryWords = query.toLowerCase().split(" ");

  // Find the first occurrence of any query word
  let startIndex = 0;
  for (let i = 0; i < words.length; i++) {
    if (queryWords.some((qw) => words[i].toLowerCase().includes(qw))) {
      startIndex = Math.max(0, i - 10);
      break;
    }
  }

  const snippet = words.slice(startIndex, startIndex + 30).join(" ");
  return snippet.length < content.length ? snippet + "..." : snippet;
}

function findSynonyms(word) {
  // Basic Urdu synonyms dictionary
  const synonymDict = {
    محبت: ["عشق", "پیار", "لگاؤ", "چاہت"],
    خوشی: ["مسرت", "فرح", "شادمانی", "انبساط"],
    غم: ["اداسی", "رنج", "حزن", "ملال"],
    دل: ["قلب", "جی", "خاطر", "ضمیر"],
    آنکھ: ["نیتر", "چشم", "نظر", "ناظر"],
  };

  return synonymDict[word] || [];
}

function findRelatedTerms(word) {
  // Basic semantic relationships
  const relatedDict = {
    محبت: ["دوستی", "خلوص", "وفا", "عاشق"],
    موت: ["زندگی", "مرگ", "اجل", "فنا"],
    شاعری: ["غزل", "نظم", "شعر", "ادب"],
  };

  return relatedDict[word] || [];
}

function calculateSemanticScore(poem, searchTerms) {
  let score = 0;
  const text = `${poem.title} ${poem.content}`.toLowerCase();

  searchTerms.forEach((term) => {
    if (text.includes(term.toLowerCase())) {
      score += 1;
    }
  });

  return score / searchTerms.length;
}

function findMatchedTerms(poem, searchTerms) {
  const text = `${poem.title} ${poem.content}`.toLowerCase();
  return searchTerms.filter((term) => text.includes(term.toLowerCase()));
}

async function generateSearchSuggestions(query) {
  // Generate contextual suggestions based on the query
  const suggestions = [];

  // Add category suggestions
  if (query.includes("غزل") || query.includes("عشق")) {
    suggestions.push("غزل محبت", "عشقیہ شاعری");
  }
  if (query.includes("نظم") || query.includes("آزاد")) {
    suggestions.push("آزاد نظم", "جدید شاعری");
  }

  return suggestions.slice(0, 5);
}

export default router;
