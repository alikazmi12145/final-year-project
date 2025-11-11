import express from "express";
import RekhtaService from "../services/rekhtaService.js";
import { optionalAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const rekhtaService = new RekhtaService();

// Rate limiting for Rekhta API calls
const rekhtaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    success: false,
    message: "بہت زیادہ درخواستیں، براہ کرم 15 منٹ بعد کوشش کریں", // Too many requests, please try again after 15 minutes
  },
});

/**
 * @route   GET /api/rekhta/poets
 * @desc    Get list of supported classical poets
 * @access  Public
 */
router.get("/poets", rekhtaRateLimit, (req, res) => {
  try {
    const poets = rekhtaService.getSupportedPoets();

    res.json({
      success: true,
      poets: poets,
      message: "کلاسیکی شعراء کی فہرست", // List of classical poets
    });
  } catch (error) {
    console.error("Error getting supported poets:", error);
    res.status(500).json({
      success: false,
      message: "شعراء کی فہرست حاصل کرتے وقت خرابی ہوئی",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/rekhta/:poet
 * @desc    Fetch poems from Rekhta API for a specific poet
 * @access  Public
 * @params  ?page=1&limit=20
 */
router.get("/:poet", rekhtaRateLimit, optionalAuth, async (req, res) => {
  try {
    const { poet } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate poet parameter
    if (!poet || poet.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "شاعر کا نام ضروری ہے", // Poet name is required
      });
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20)); // Max 50 poems per request

    console.log(`🔍 Fetching poems for poet: ${poet}`);

    const result = await rekhtaService.getPoemsByPoet(poet, pageNum, limitNum);

    if (result.success) {
      res.json({
        success: true,
        ...result,
        message: `${result.poet.name} کی شاعری کامیابی سے حاصل ہوئی`, // Successfully fetched poetry
        usage: {
          note: "یہ ڈیٹا Rekhta.org سے حاصل کیا گیا ہے", // This data is fetched from Rekhta.org
          disclaimer: "تمام مواد کے حقوق اصل مصنفین کے پاس محفوظ ہیں", // All content rights are reserved with original authors
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error || `${poet} کی شاعری دستیاب نہیں`, // Poetry not available
        availablePoets:
          result.availablePoets || rekhtaService.getSupportedPoets(),
      });
    }
  } catch (error) {
    console.error(`Error fetching poems for ${req.params.poet}:`, error);
    res.status(500).json({
      success: false,
      message: "شاعری حاصل کرتے وقت خرابی ہوئی", // Error occurred while fetching poetry
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/rekhta/search/:query
 * @desc    Search poems on Rekhta
 * @access  Public
 * @params  ?type=poem&page=1&limit=20
 */
router.get(
  "/search/:query",
  rekhtaRateLimit,
  optionalAuth,
  async (req, res) => {
    try {
      const { query } = req.params;
      const { type = "poem", page = 1, limit = 20 } = req.query;

      // Validate search query
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "تلاش کے لیے کم از کم 2 حروف درکار ہیں", // At least 2 characters required for search
        });
      }

      // Validate search type
      const validTypes = ["poem", "poet", "ghazal", "nazm"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "غلط تلاش کی قسم", // Invalid search type
          validTypes: validTypes,
        });
      }

      console.log(`🔍 Searching Rekhta for: "${query}" (type: ${type})`);

      const result = await rekhtaService.searchPoems(
        decodeURIComponent(query),
        type
      );

      if (result.success) {
        // Apply pagination to results
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;

        const paginatedResults = result.results.slice(startIndex, endIndex);

        res.json({
          success: true,
          results: paginatedResults,
          pagination: {
            currentPage: pageNum,
            totalResults: result.results.length,
            totalPages: Math.ceil(result.results.length / limitNum),
            hasMore: endIndex < result.results.length,
            hasPrev: pageNum > 1,
          },
          query: result.query,
          type: result.type,
          source: result.source,
          fetchedAt: result.fetchedAt,
          message: `"${query}" کے لیے ${paginatedResults.length} نتائج ملے`, // Found {count} results for "{query}"
        });
      } else {
        res.status(404).json({
          success: false,
          message: `"${query}" کے لیے کوئی نتائج نہیں ملے`, // No results found for "{query}"
          suggestions: [
            "املا کی جانچ کریں", // Check spelling
            "کم الفاظ استعمال کریں", // Use fewer words
            "مختلف کلیدی الفاظ آزمائیں", // Try different keywords
          ],
        });
      }
    } catch (error) {
      console.error(`Error searching Rekhta for ${req.params.query}:`, error);
      res.status(500).json({
        success: false,
        message: "تلاش کرتے وقت خرابی ہوئی", // Error occurred while searching
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/rekhta/featured
 * @desc    Get featured/popular poems from Rekhta
 * @access  Public
 */
router.get("/featured", rekhtaRateLimit, optionalAuth, async (req, res) => {
  try {
    console.log("🔍 Fetching featured poems from Rekhta");

    const result = await rekhtaService.getFeaturedPoems();

    if (result.success) {
      res.json({
        success: true,
        ...result,
        message: "نمایاں شاعری کامیابی سے حاصل ہوئی", // Featured poetry successfully fetched
      });
    } else {
      res.status(500).json({
        success: false,
        message: "نمایاں شاعری حاصل کرنے میں خرابی ہوئی", // Error fetching featured poetry
      });
    }
  } catch (error) {
    console.error("Error fetching featured poems:", error);
    res.status(500).json({
      success: false,
      message: "نمایاں شاعری حاصل کرتے وقت خرابی ہوئی",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/rekhta/random
 * @desc    Get random classical poems
 * @access  Public
 * @params  ?count=5
 */
router.get("/random", rekhtaRateLimit, optionalAuth, async (req, res) => {
  try {
    const { count = 5 } = req.query;
    const numPoems = Math.min(20, Math.max(1, parseInt(count) || 5)); // Between 1-20

    console.log(`🎲 Fetching ${numPoems} random classical poems`);

    // Get random poets and fetch one poem from each
    const supportedPoets = rekhtaService.getSupportedPoets();
    const randomPoets = supportedPoets
      .sort(() => 0.5 - Math.random())
      .slice(0, numPoems);

    const randomPoems = [];

    for (const poetInfo of randomPoets) {
      try {
        const result = await rekhtaService.getPoemsByPoet(poetInfo.slug, 1, 1);
        if (result.success && result.poems.length > 0) {
          randomPoems.push({
            ...result.poems[0],
            poet: result.poet,
          });
        }
      } catch (error) {
        console.log(
          `⚠️ Failed to fetch poem from ${poetInfo.name}:`,
          error.message
        );
        // Continue with other poets
      }
    }

    res.json({
      success: true,
      poems: randomPoems,
      count: randomPoems.length,
      message: `${randomPoems.length} بے ترتیب کلاسیکی شاعری حاصل ہوئی`, // Random classical poems fetched
      source: "Rekhta.org",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching random poems:", error);
    res.status(500).json({
      success: false,
      message: "بے ترتیب شاعری حاصل کرتے وقت خرابی ہوئی", // Error fetching random poetry
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/rekhta/poet/:poet/info
 * @desc    Get detailed information about a specific poet
 * @access  Public
 */
router.get(
  "/poet/:poet/info",
  rekhtaRateLimit,
  optionalAuth,
  async (req, res) => {
    try {
      const { poet } = req.params;

      console.log(`📖 Fetching detailed info for poet: ${poet}`);

      const result = await rekhtaService.getPoemsByPoet(poet, 1, 1);

      if (result.success) {
        res.json({
          success: true,
          poet: result.poet,
          samplePoems: result.poems,
          message: `${result.poet.name} کی تفصیلات کامیابی سے حاصل ہوئیں`, // Poet details successfully fetched
          source: result.source,
          fetchedAt: result.fetchedAt,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.error || `${poet} کی تفصیلات دستیاب نہیں`, // Poet details not available
          availablePoets:
            result.availablePoets || rekhtaService.getSupportedPoets(),
        });
      }
    } catch (error) {
      console.error(`Error fetching poet info for ${req.params.poet}:`, error);
      res.status(500).json({
        success: false,
        message: "شاعر کی تفصیلات حاصل کرتے وقت خرابی ہوئی", // Error fetching poet details
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/rekhta/categories
 * @desc    Get available poetry categories and forms
 * @access  Public
 */
router.get("/categories", (req, res) => {
  try {
    const categories = {
      poetryForms: [
        {
          key: "ghazal",
          name: "غزل",
          description: "Classical form with rhyme and meter",
        },
        {
          key: "nazm",
          name: "نظم",
          description: "Free verse or structured poem",
        },
        { key: "rubai", name: "رباعی", description: "Four-line poem" },
        {
          key: "qawwali",
          name: "قوالی",
          description: "Devotional singing poetry",
        },
        { key: "marsiya", name: "مرثیہ", description: "Elegiac poetry" },
        { key: "hamd", name: "حمد", description: "Praise of Allah" },
        { key: "naat", name: "نعت", description: "Praise of Prophet Muhammad" },
      ],
      themes: [
        { key: "love", name: "محبت", description: "Love and romance" },
        {
          key: "separation",
          name: "جدائی",
          description: "Separation and longing",
        },
        { key: "nature", name: "قدرت", description: "Nature and beauty" },
        {
          key: "spirituality",
          name: "روحانیت",
          description: "Spiritual and mystical",
        },
        {
          key: "philosophy",
          name: "فلسفہ",
          description: "Philosophy and wisdom",
        },
        {
          key: "patriotism",
          name: "وطن پرستی",
          description: "Patriotic themes",
        },
      ],
      eras: [
        {
          key: "classical",
          name: "کلاسیکی",
          description: "Classical era (18th-19th century)",
        },
        {
          key: "modern",
          name: "جدید",
          description: "Modern era (20th century)",
        },
        {
          key: "contemporary",
          name: "عصری",
          description: "Contemporary era (21st century)",
        },
      ],
    };

    res.json({
      success: true,
      categories: categories,
      message: "شاعری کی اقسام اور موضوعات", // Poetry types and themes
    });
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({
      success: false,
      message: "اقسام حاصل کرتے وقت خرابی ہوئی",
      error: error.message,
    });
  }
});

export default router;
