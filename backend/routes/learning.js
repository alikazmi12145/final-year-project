import express from "express";
import { body, validationResult } from "express-validator";
import LearningResource from "../models/LearningResource.js";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import { auth, adminAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import fs from "fs/promises";
import path from "path";

const router = express.Router();

// Rate limiting
const learningLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

// Comprehensive Urdu rhyming words database
const qaafiaDictionary = {
  // Common Urdu rhyming patterns
  "دل": ["گل", "مل", "قل", "بل", "ہل", "جل"],
  "شب": ["لب", "حب", "رب", "نب", "سب"],
  "آنکھ": ["دیکھ", "دیکھ", "سیکھ"],
  "دن": ["من", "تن", "بن", "سن"],
  "رات": ["بات", "ہات", "سات", "جات"],
  "محبت": ["عادت", "قدرت", "خصوصیت"],
  "زندگی": ["زندگی", "بندگی", "سادگی"],
  "دنیا": ["دنیا", "کریا", "ہویا"],
  "خوشی": ["خوشی", "خاموشی", "جوشی"],
  "غم": ["غم", "سم", "دم", "قم"],
  "پیار": ["یار", "کار", "بار", "دار"],
  "امید": ["امید", "تائید", "وعید"],
  "خواب": ["خراب", "عذاب", "شراب", "باب"],
  "سورج": ["چاند", "ستارہ", "چمک"],
  "چاند": ["چاند", "بند", "کند"],
  "آسمان": ["جہان", "انسان", "مکان", "شان"],
  "زمین": ["یقین", "آمین", "تمکین"],
  "پھول": ["گول", "کول", "مول"],
  "ہوا": ["دوا", "قوا", "جوا"],
  "پانی": ["نانی", "بانی", "شانی"],
  "آگ": ["باغ", "آغ", "بھاگ"],
  "سکون": ["فنون", "شئون", "مضمون"],
  "جنون": ["فنون", "شئون", "سکون"],
  "عشق": ["رشق", "فشق", "بشق"],
  "حسن": ["روشن", "چشن", "کشن"],
  "جمال": ["کمال", "خیال", "مال"],
  "نظر": ["گذر", "سفر", "اثر"],
  "نگاہ": ["راہ", "چاہ", "خواہ"],
  "دعا": ["خدا", "ہوا", "رہا"],
  "رحمت": ["قیامت", "کرامت", "سلامت"],
  "برکت": ["حرکت", "شرکت", "قدرت"]
};

// Harf-e-Ravi (Urdu letters and examples)
const harfRaviDictionary = {
  "ا": {
    name: "الف",
    examples: ["الف", "آم", "اردو", "انسان", "آسمان"],
    words: ["امید", "احترام", "آزادی", "ایمان", "اسلام"],
    poetry: ["آہ کو چاہیے اک عمر اسر ہونے تک", "اس شہر میں ہر شخص پریشان لگتا ہے"]
  },
  "ب": {
    name: "بے",
    examples: ["باب", "بال", "بچہ", "بہار", "برف"],
    words: ["بہت", "بادل", "بندہ", "بزرگ", "بھائی"],
    poetry: ["بہت اچھا ہے دل کا لگا رہنا", "بیاں کرتا ہوں عاشق کا تجربہ"]
  },
  "پ": {
    name: "پے",
    examples: ["پانی", "پھول", "پرندہ", "پیار", "پل"],
    words: ["پکار", "پیدا", "پرانا", "پیغام", "پڑھنا"],
    poetry: ["پیار میں ہر غم کو خوشی سمجھ لیا", "پھولوں کی طرح مسکرانا سیکھ"]
  },
  "ت": {
    name: "تے",
    examples: ["تیر", "توت", "تجربہ", "تمنا", "تسلیم"],
    words: ["تعلیم", "تربیت", "تکلیف", "تاریخ", "تقدیر"],
    poetry: ["تیرے بغیر زندگی کا کوئی مطلب نہیں", "تو ہی سب کچھ ہے میرے لیے"]
  },
  "ٹ": {
    name: "ٹے",
    examples: ["ٹوٹنا", "ٹھنڈا", "ٹکرانا", "ٹھیک", "ٹینکا"],
    words: ["ٹھہرنا", "ٹوپی", "ٹانگ", "ٹیلی فون", "ٹرین"],
    poetry: ["ٹوٹے خوابوں کا سلسلہ", "ٹھہرو ذرا یہ کیا کہہ رہے ہو"]
  }
};

// Poetry meters (Bahr) information
const poetryMeters = {
  "بحر_ہزج": {
    name: "بحر ہزج",
    pattern: "مفعولن مفعولن مفعولن مفعولن",
    description: "یہ غزل کی سب سے مشہور بحر ہے",
    examples: ["مجھے تم سے محبت ہے مجھے تم سے محبت ہے", "کوئی دن گار ہو جائے کوئی دن گار ہو جائے"]
  },
  "بحر_رمل": {
    name: "بحر رمل",
    pattern: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
    description: "یہ بحر نظموں میں استعمال ہوتی ہے",
    examples: ["چلو پھر سے وہی دعوتِ محشر لے چلیں", "یہ کیا جگہ ہے دوستو یہ کیا محفل ہے"]
  },
  "بحر_متقارب": {
    name: "بحر متقارب",
    pattern: "فعولن فعولن فعولن فعولن",
    description: "سادہ اور آسان بحر",
    examples: ["کہیں کوئی مل گیا ہے پرانا دوست", "بہت دن بعد آئے ہو تم یہاں"]
  }
};

// Get all learning resources
router.get("/resources", learningLimit, async (req, res) => {
  try {
    const { category, level, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (category && category !== 'all') query.category = category;
    if (level && level !== 'all') query.level = level;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const resources = await LearningResource.find(query)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LearningResource.countDocuments(query);

    // Add default educational content
    const defaultResources = {
      tutorials: [
        {
          _id: "tutorial_1",
          title: "Basic Ghazal Concepts",
          description: "غزل کی ردیف، قافیہ، اور بحر کو سمجھیں",
          category: "tutorial",
          level: "beginner",
          duration: "30 منٹ",
          content: "غزل اردو شاعری کی سب سے مشہور صنف ہے...",
          tags: ["ghazal", "poetry", "basic"],
          author: { name: "سسٹم" }
        },
        {
          _id: "tutorial_2", 
          title: "نظم کا فن",
          description: "نظم کی مختلف اقسام اور تکنیک",
          category: "tutorial",
          level: "intermediate",
          duration: "45 منٹ",
          content: "نظم آزاد شاعری کی ایک شکل ہے...",
          tags: ["نظم", "آزاد شاعری"],
          author: { name: "سسٹم" }
        },
        {
          _id: "tutorial_3",
          title: "رباعی کی تکنیک",
          description: "چار مصرعوں میں مکمل بات کہنے کا فن",
          category: "tutorial", 
          level: "advanced",
          duration: "25 منٹ",
          content: "رباعی چار مصرعوں پر مشتمل ہوتی ہے...",
          tags: ["رباعی", "کلاسیکی شاعری"],
          author: { name: "سسٹم" }
        }
      ],
      examples: [
        {
          _id: "example_1",
          title: "مشہور غزلوں کے امثال",
          description: "عظیم شعراء کی بہترین غزلیں",
          category: "examples",
          level: "all",
          content: "میر، غالب، اقبال کی منتخب غزلیں...",
          tags: ["غزل", "کلاسیک", "مشاہیر"],
          author: { name: "سسٹم" }
        }
      ]
    };

    res.json({
      success: true,
      resources: [...defaultResources.tutorials, ...defaultResources.examples, ...resources],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total + 4, // Including default resources
        pages: Math.ceil((total + 4) / limit)
      },
      categories: ["tutorial", "examples", "tools", "audio", "reference"],
      levels: ["beginner", "intermediate", "advanced", "expert"]
    });
  } catch (error) {
    console.error("Get learning resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch learning resources"
    });
  }
});

// Qaafia (Rhyming words) search
router.get("/qaafia/:word", learningLimit, async (req, res) => {
  try {
    const word = req.params.word.trim();
    const { limit = 20, advanced = false } = req.query;

    // Check in our comprehensive dictionary first
    let rhymes = qaafiaDictionary[word] || [];

    // If not found in dictionary, try pattern matching
    if (rhymes.length === 0) {
      // Extract last syllable/sound pattern
      const lastChar = word.slice(-1);
      const lastTwoChars = word.slice(-2);

      // Find words with similar endings
      const allWords = Object.keys(qaafiaDictionary);
      rhymes = allWords.filter(w => {
        return w.endsWith(lastChar) || w.endsWith(lastTwoChars);
      }).slice(0, limit);

      // If still no matches, find words from our database
      if (rhymes.length === 0) {
        const poetWords = await Poem.aggregate([
          { $unwind: "$content" },
          { $match: { "content": { $regex: lastChar + "$", $options: "i" } } },
          { $group: { _id: null, words: { $addToSet: "$content" } } },
          { $project: { words: { $slice: ["$words", parseInt(limit)] } } }
        ]);

        rhymes = poetWords.length > 0 ? poetWords[0].words : [];
      }
    }

    // Advanced analysis if requested
    let analysis = {};
    if (advanced === 'true') {
      analysis = {
        wordLength: word.length,
        syllablePattern: analyzeSyllables(word),
        meterSuggestions: findMeterSuggestions(word),
        relatedWords: findRelatedWords(word),
        poetryExamples: await findPoetryExamples(word)
      };
    }

    res.json({
      success: true,
      word,
      rhymes: rhymes.slice(0, parseInt(limit)),
      total: rhymes.length,
      analysis: advanced === 'true' ? analysis : undefined
    });
  } catch (error) {
    console.error("Qaafia search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search rhyming words"
    });
  }
});

// Harf-e-Ravi (Letter guide) search
router.get("/harf-ravi/:letter?", learningLimit, async (req, res) => {
  try {
    const letter = req.params.letter;

    if (letter) {
      // Get specific letter information
      const letterInfo = harfRaviDictionary[letter];
      
      if (!letterInfo) {
        return res.status(404).json({
          success: false,
          message: "Letter not found in dictionary"
        });
      }

      res.json({
        success: true,
        letter,
        info: letterInfo
      });
    } else {
      // Get all letters
      const allLetters = Object.keys(harfRaviDictionary).map(key => ({
        letter: key,
        name: harfRaviDictionary[key].name,
        exampleCount: harfRaviDictionary[key].examples.length
      }));

      res.json({
        success: true,
        letters: allLetters,
        total: allLetters.length
      });
    }
  } catch (error) {
    console.error("Harf-e-Ravi error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch letter information"
    });
  }
});

// Poetry meters (Bahr) information
router.get("/meters/:meter?", learningLimit, async (req, res) => {
  try {
    const meter = req.params.meter;

    if (meter) {
      const meterInfo = poetryMeters[meter];
      
      if (!meterInfo) {
        return res.status(404).json({
          success: false,
          message: "Meter not found"
        });
      }

      res.json({
        success: true,
        meter,
        info: meterInfo
      });
    } else {
      const allMeters = Object.keys(poetryMeters).map(key => ({
        key,
        name: poetryMeters[key].name,
        pattern: poetryMeters[key].pattern,
        description: poetryMeters[key].description
      }));

      res.json({
        success: true,
        meters: allMeters,
        total: allMeters.length
      });
    }
  } catch (error) {
    console.error("Poetry meters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meter information"
    });
  }
});

// Word analysis tool
router.post("/analyze-word", learningLimit, [
  body("word").isLength({ min: 1, max: 50 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { word } = req.body;

    const analysis = {
      word,
      length: word.length,
      rhymes: qaafiaDictionary[word] || [],
      syllables: analyzeSyllables(word),
      meterCompatibility: findMeterSuggestions(word),
      poetryUsage: await findPoetryExamples(word),
      relatedWords: findRelatedWords(word),
      difficulty: calculateWordDifficulty(word)
    };

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error("Word analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze word"
    });
  }
});

// Create learning resource (admin only)
router.post("/", adminAuth, [
  body("title").isLength({ min: 5, max: 200 }).trim(),
  body("description").isLength({ min: 20, max: 1000 }).trim(),
  body("category").isIn(["tutorial", "examples", "tools", "audio", "reference"]),
  body("level").isIn(["beginner", "intermediate", "advanced", "expert"]),
  body("content").isLength({ min: 50 }),
  body("tags").optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed", 
        errors: errors.array()
      });
    }

    const resource = new LearningResource({
      ...req.body,
      author: req.user.userId
    });

    await resource.save();
    await resource.populate('author', 'name');

    res.status(201).json({
      success: true,
      message: "Learning resource created successfully",
      resource
    });
  } catch (error) {
    console.error("Create learning resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create learning resource"
    });
  }
});

// Helper functions
function analyzeSyllables(word) {
  // Simple syllable analysis for Urdu words
  const vowels = ['ا', 'آ', 'ع', 'ی', 'و', 'ے', 'ای', 'اؤ'];
  let syllableCount = 0;
  
  for (let char of word) {
    if (vowels.includes(char)) {
      syllableCount++;
    }
  }
  
  return Math.max(1, syllableCount);
}

function findMeterSuggestions(word) {
  const syllables = analyzeSyllables(word);
  const suggestions = [];

  // Suggest meters based on syllable count
  if (syllables <= 3) {
    suggestions.push("بحر_ہزج", "بحر_متقارب");
  }
  if (syllables >= 4) {
    suggestions.push("بحر_رمل");
  }

  return suggestions.map(key => poetryMeters[key]).filter(Boolean);
}

function findRelatedWords(word) {
  // Find semantically related words
  const related = [];
  const lastChar = word.slice(-1);
  
  // Find words with same ending
  Object.keys(qaafiaDictionary).forEach(key => {
    if (key.endsWith(lastChar) && key !== word) {
      related.push(key);
    }
  });

  return related.slice(0, 10);
}

async function findPoetryExamples(word) {
  try {
    // Find poems containing the word
    const poems = await Poem.find({
      content: { $regex: word, $options: 'i' }
    })
    .select('title author content category')
    .populate('author', 'name')
    .limit(5)
    .lean();

    return poems.map(poem => ({
      title: poem.title,
      author: poem.author?.name,
      excerpt: poem.content.substring(0, 100) + '...',
      category: poem.category
    }));
  } catch (error) {
    console.error("Find poetry examples error:", error);
    return [];
  }
}

function calculateWordDifficulty(word) {
  const length = word.length;
  const commonWords = ['دل', 'آنکھ', 'ہاتھ', 'گھر', 'دن', 'رات'];
  
  if (commonWords.includes(word)) return 'easy';
  if (length <= 3) return 'easy';
  if (length <= 6) return 'medium';
  return 'hard';
}

export default router;
