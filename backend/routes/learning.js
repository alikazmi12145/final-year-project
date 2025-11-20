import express from "express";
import { body, validationResult } from "express-validator";
import LearningResource from "../models/LearningResource.js";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import { auth, adminAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import fs from "fs/promises";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const audioUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/ogg', 'audio/webm'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type. Only MP3, WAV, OGG, and WEBM are allowed.'));
    }
  }
});

// Python AI service URL
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:5001';

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

// Harf-e-Ravi (Complete Urdu alphabet with examples)
const harfRaviDictionary = {
  "ا": { name: "الف", examples: ["آم", "اردو", "انسان", "آسمان", "امید"], words: ["احترام", "آزادی", "ایمان", "اسلام"], poetry: ["آہ کو چاہیے اک عمر اسر ہونے تک", "اس شہر میں ہر شخص پریشان لگتا ہے"] },
  "ب": { name: "بے", examples: ["باب", "بال", "بچہ", "بہار", "برف"], words: ["بہت", "بادل", "بندہ", "بزرگ"], poetry: ["بہت اچھا ہے دل کا لگا رہنا", "بیاں کرتا ہوں عاشق کا تجربہ"] },
  "پ": { name: "پے", examples: ["پانی", "پھول", "پرندہ", "پیار", "پل"], words: ["پکار", "پیدا", "پرانا", "پیغام"], poetry: ["پیار میں ہر غم کو خوشی سمجھ لیا", "پھولوں کی طرح مسکرانا سیکھ"] },
  "ت": { name: "تے", examples: ["تیر", "توت", "تجربہ", "تمنا", "تسلیم"], words: ["تعلیم", "تربیت", "تکلیف", "تاریخ"], poetry: ["تیرے بغیر زندگی کا کوئی مطلب نہیں", "تو ہی سب کچھ ہے میرے لیے"] },
  "ٹ": { name: "ٹے", examples: ["ٹوٹنا", "ٹھنڈا", "ٹکرانا", "ٹھیک"], words: ["ٹھہرنا", "ٹوپی", "ٹانگ", "ٹرین"], poetry: ["ٹوٹے خوابوں کا سلسلہ", "ٹھہرو ذرا یہ کیا کہہ رہے ہو"] },
  "ث": { name: "ثے", examples: ["ثابت", "ثواب", "ثمر", "ثریا"], words: ["ثقافت", "ثبوت", "ثانی"], poetry: ["ثبات ایک تغیر کو ہے زمانے میں"] },
  "ج": { name: "جیم", examples: ["جان", "جہان", "جگر", "جمال"], words: ["جنگ", "جوش", "جذبہ", "جوہر"], poetry: ["جب یاد میں تیری تجھے پایا نہیں", "جو ہو میری قسمت میں اسے مانوں گا"] },
  "چ": { name: "چے", examples: ["چاند", "چمن", "چہرہ", "چشم"], words: ["چاہت", "چپ", "چراغ", "چین"], poetry: ["چپ کیسے رہوں خاموش کیسے ہوں", "چاند کی طرح روشن ہو"] },
  "ح": { name: "حے", examples: ["حال", "حسن", "حیات", "حرف"], words: ["حقیقت", "حکمت", "حمد", "حضور"], poetry: ["حسن والوں کو نہ دل کی خبر ہوتی ہے", "حیرت سے دیکھتا ہوں دنیا کو"] },
  "خ": { name: "خے", examples: ["خواب", "خوشی", "خیال", "خدا"], words: ["خبر", "خلوت", "خاموش", "خوف"], poetry: ["خواب میں تو آیا کر وہ شخص", "خوشی سے محروم نہ رکھ"] },
  "د": { name: "دال", examples: ["دل", "دن", "دنیا", "درد"], words: ["دوست", "دعا", "دیدار", "دیوار"], poetry: ["دل ہی تو ہے نہ سنگ و خشت", "دن رات یاد آتی ہے"] },
  "ڈ": { name: "ڈال", examples: ["ڈر", "ڈاکٹر", "ڈرامہ"], words: ["ڈوب", "ڈھونڈ"], poetry: ["ڈر لگتا ہے کہیں یہ خواب نہ ٹوٹے"] },
  "ذ": { name: "ذال", examples: ["ذات", "ذہن", "ذکر", "ذوق"], words: ["ذلت", "ذخیرہ"], poetry: ["ذکر اس کا اور پھر بیاں اپنا", "ذرا سی خوشی مل جائے تو کیا"] },
  "ر": { name: "رے", examples: ["رات", "راہ", "روح", "رنگ"], words: ["رحمت", "روشنی", "رشتہ"], poetry: ["رات دن گردش میں ہیں سات آسمان", "رہتا ہے خیال اسی کا"] },
  "ڑ": { name: "ڑے", examples: ["پڑھنا", "لڑکا", "بڑا"], words: ["کڑوا", "جھگڑا"], poetry: ["ڑکوں سے گزر کر آیا ہوں"] },
  "ز": { name: "زے", examples: ["زمین", "زندگی", "زبان", "زمانہ"], words: ["زہر", "زیارت", "زینت"], poetry: ["زندگی کیا ہے عناصر میں ظہور ترتیب", "زمانے نے کیا کیا نہیں"] },
  "ژ": { name: "ژے", examples: ["ژالہ", "ژرف"], words: ["پرژہ"], poetry: ["ژالوں کی بارش میں"] },
  "س": { name: "سین", examples: ["سکون", "سفر", "سحر", "سبز"], words: ["سلام", "سدا", "سماں"], poetry: ["سکوت میں بھی کہانی ہے", "سفر میں دھوپ تو ہوگی"] },
  "ش": { name: "شین", examples: ["شام", "شہر", "شعر", "شمع"], words: ["شوق", "شکر", "شراب"], poetry: ["شام سے آنکھ میں نمی سی ہے", "شعر کہنا میرا مقصود نہیں"] },
  "ص": { name: "صواد", examples: ["صبح", "صحرا", "صدا", "صورت"], words: ["صفا", "صبر", "صلح"], poetry: ["صبح ہونے کو ہے شاید", "صدا دیتا ہوں گلی میں"] },
  "ض": { name: "ضواد", examples: ["ضرورت", "ضمیر"], words: ["ضعیف", "ضابطہ"], poetry: ["ضرورت کیا ہے اظہار کی"] },
  "ط": { name: "طوئے", examples: ["طوفان", "طاقت", "طرح"], words: ["طبیعت", "طالب"], poetry: ["طوفان میں کشتی کو چلانا سیکھ"] },
  "ظ": { name: "ظوئے", examples: ["ظلم", "ظہور", "ظرف"], words: ["ظاہر", "ظریف"], poetry: ["ظلم سہتے سہتے تھک گئے"] },
  "ع": { name: "عین", examples: ["عشق", "عالم", "عمر", "عبادت"], words: ["عزت", "علم", "عجیب"], poetry: ["عشق میں غیرت و شرم و لحاظ کیا", "عالم تمام حلقہ دام خیال ہے"] },
  "غ": { name: "غین", examples: ["غم", "غزل", "غرور", "غصہ"], words: ["غبار", "غنیمت", "غذا"], poetry: ["غم دیکھ کر تیرا رونا آیا", "غزل کے اشعار بہت ہیں"] },
  "ف": { name: "فے", examples: ["فن", "فردوس", "فضل", "فریاد"], words: ["فقیر", "فرشتہ", "فکر"], poetry: ["فریاد کی بھی حاجت نہیں رہی", "فن کو سکھانے والا استاد"] },
  "ق": { name: "قاف", examples: ["قلم", "قدم", "قسم", "قبر"], words: ["قافلہ", "قاتل", "قیامت"], poetry: ["قلم اٹھا تو لکھوں کیا", "قدم قدم پہ ہے منزل"] },
  "ک": { name: "کاف", examples: ["کام", "کتاب", "کلام", "کون"], words: ["کرم", "کاغذ", "کبھی"], poetry: ["کبھی ہم خوبصورت تھے یار", "کون ہے جو مجھے یاد کرتا ہے"] },
  "گ": { name: "گاف", examples: ["گل", "گلی", "گناہ", "گھر"], words: ["گفتگو", "گرم", "گیت"], poetry: ["گل کو چمن میں رہنے دو", "گھر میں دل لگتا نہیں"] },
  "ل": { name: "لام", examples: ["لفظ", "لب", "لمحہ", "لکھنا"], words: ["لہو", "لطیف", "لذت"], poetry: ["لفظوں میں بیان نہیں ہو سکتا", "لب پہ آتی ہے دعا"] },
  "م": { name: "میم", examples: ["محبت", "موت", "مٹی", "منزل"], words: ["مسجد", "مضمون", "مہمان"], poetry: ["محبت کرنے والے کم نہ ہوں گے", "موت سے پہلے آدمی غم سے نجات پائے"] },
  "ن": { name: "نون", examples: ["نام", "نظر", "نور", "نگاہ"], words: ["نیک", "نشان", "نیا"], poetry: ["نام لیوا ہوں تیرا نام لے کر", "نظر آتا نہیں دل میں کوئی"] },
  "ں": { name: "نون غنہ", examples: ["ہیں", "میں", "مجھے"], words: ["نہیں", "یہیں"], poetry: ["ہیں اور بھی دنیا میں سخنور بہت اچھے", "میں اکیلا ہی چلا تھا"] },
  "و": { name: "واؤ", examples: ["وطن", "وہ", "وقت", "وعدہ"], words: ["وفا", "ولایت", "وجود"], poetry: ["وہ جو ہم میں تم میں قرار تھا", "وقت بدلتا ہے ساتھ بدلتا ہے"] },
  "ہ": { name: "ہے", examples: ["ہاتھ", "ہوا", "ہر", "ہجر"], words: ["ہزار", "ہمت", "ہمیشہ"], poetry: ["ہاتھ میں جام و دل میں غم", "ہر ایک بات پہ کہتے ہو تم کہ تو کیا ہے"] },
  "ء": { name: "ہمزہ", examples: ["آسماں", "جزء", "شیء"], words: ["ابتداء", "انتہاء"], poetry: ["شیء سے شیء کا فاصلہ دیکھ"] },
  "ی": { name: "یے", examples: ["یار", "یاد", "یہ", "یقین"], words: ["یتیم", "یورپ", "یگانہ"], poetry: ["یاد میں تیری خود کو بھلا بیٹھے", "یہ دنیا اگر مل بھی جائے"] },
  "ے": { name: "بڑی یے", examples: ["ہے", "تھے", "کیسے", "جیسے"], words: ["کے", "سے"], poetry: ["ہے کہاں تمنا کا دوسرا قدم یا رب", "تھے کبھی بہت اچھے دن"] }
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

// ============= AUDIO RECITATIONS =============

/**
 * Upload audio recitation
 * POST /api/learning/audio/upload
 */
router.post("/audio/upload", adminAuth, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    const { title, narrator, description, transcript, category = 'recitation' } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // Cloudinary uses 'video' for audio files
          folder: 'bazm-e-sukhan/audio-recitations',
          format: 'mp3',
          transformation: [
            { audio_codec: 'mp3' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    // Get audio duration from Cloudinary response
    const duration = uploadResult.duration || 0;

    // Create learning resource with audio
    const audioResource = new LearningResource({
      title: title.trim(),
      description: description || 'Audio recitation',
      category: 'audio',
      type: 'audio',
      level: 'all',
      author: req.user.userId,
      media: {
        audio: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          duration: Math.round(duration),
          transcript: transcript || ''
        }
      },
      tags: [category, 'audio', 'recitation', narrator].filter(Boolean)
    });

    await audioResource.save();
    await audioResource.populate('author', 'name');

    res.status(201).json({
      success: true,
      message: 'Audio uploaded successfully',
      audio: audioResource
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload audio',
      error: error.message
    });
  }
});

/**
 * Get all audio recitations
 * GET /api/learning/audio
 */
router.get("/audio", learningLimit, async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = { 
      category: 'audio',
      'media.audio.url': { $exists: true, $ne: null }
    };

    if (category && category !== 'all') {
      query.tags = category;
    }

    const audioResources = await LearningResource.find(query)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await LearningResource.countDocuments(query);

    res.json({
      success: true,
      audios: audioResources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get audio recitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audio recitations'
    });
  }
});

/**
 * Delete audio recitation
 * DELETE /api/learning/audio/:id
 */
router.delete("/audio/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const audioResource = await LearningResource.findById(id);

    if (!audioResource) {
      return res.status(404).json({
        success: false,
        message: 'Audio not found'
      });
    }

    // Delete from Cloudinary
    if (audioResource.media?.audio?.publicId) {
      try {
        await cloudinary.uploader.destroy(audioResource.media.audio.publicId, {
          resource_type: 'video'
        });
      } catch (cloudError) {
        console.error('Cloudinary deletion error:', cloudError);
      }
    }

    // Delete from database
    await LearningResource.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Audio deleted successfully'
    });
  } catch (error) {
    console.error('Delete audio error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete audio'
    });
  }
});

// ============= AI-POWERED FEATURES (PROXY TO PYTHON SERVICE) =============

/**
 * AI Qaafia Search (Proxy to Python AI service)
 * POST /api/learning/ai/qaafia
 */
router.post("/ai/qaafia", learningLimit, async (req, res) => {
  try {
    const { word, limit = 20, min_similarity = 0.5 } = req.body;

    if (!word) {
      return res.status(400).json({
        success: false,
        message: 'Word is required'
      });
    }

    // Call Python AI service
    const response = await axios.post(`${PYTHON_AI_URL}/ai/qaafia-search`, {
      word,
      limit,
      min_similarity
    });

    res.json(response.data);
  } catch (error) {
    console.error('AI Qaafia search error:', error);
    
    // Fallback to basic search if Python service is down
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable. Please try again later.',
        fallback: true
      });
    }

    res.status(500).json({
      success: false,
      message: 'AI Qaafia search failed',
      error: error.message
    });
  }
});

/**
 * AI Harf-e-Ravi Extract (Proxy to Python AI service)
 * POST /api/learning/ai/harf-ravi
 */
router.post("/ai/harf-ravi", learningLimit, async (req, res) => {
  try {
    const { text, extract_all = true } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    // Call Python AI service
    const response = await axios.post(`${PYTHON_AI_URL}/ai/harf-ravi-extract`, {
      text,
      extract_all
    });

    res.json(response.data);
  } catch (error) {
    console.error('AI Harf-e-Ravi extraction error:', error);
    
    // Fallback if Python service is down
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable. Please try again later.',
        fallback: true
      });
    }

    res.status(500).json({
      success: false,
      message: 'AI Harf-e-Ravi extraction failed',
      error: error.message
    });
  }
});

export default router;
