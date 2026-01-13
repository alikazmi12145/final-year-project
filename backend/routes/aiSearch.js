/**
 * AI Search Routes - OpenAI GPT-4o Powered Endpoints
 * Integrates urdu-ai-search module functionality
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  semanticPoetrySearch,
  extractTextFromImage,
  findRhymes,
  analyzeHarfRavi,
  generateSpeech,
  analyzePoem,
  checkAIServiceStatus
} from '../services/aiSearchService.js';
import Poem from '../models/Poem.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

/**
 * Health check for AI services
 * GET /api/ai-search/health
 */
router.get('/health', (req, res) => {
  const status = checkAIServiceStatus();
  res.json({
    success: true,
    status: 'AI Search Service is running',
    ...status,
    timestamp: new Date().toISOString()
  });
});

/**
 * AI-Powered Semantic Poetry Search
 * POST /api/ai-search/semantic
 * 
 * Body: { query: string, maxResults?: number }
 */
router.post('/semantic', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log(`🔍 AI Semantic Search: "${query}"`);

    // Get AI analysis
    const aiResult = await semanticPoetrySearch(query, { maxResults });

    // If AI returned suggestions, search local database
    let localResults = [];
    if (aiResult.success && aiResult.keywords) {
      const searchKeywords = [
        ...(aiResult.keywords.urdu_keywords || []),
        ...(aiResult.keywords.english_keywords || []),
        query
      ];

      // Build regex pattern for MongoDB search
      const regexPattern = searchKeywords
        .filter(k => k && k.length > 1)
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

      if (regexPattern) {
        const searchRegex = new RegExp(regexPattern, 'i');

        // Search local database
        localResults = await Poem.find({
          status: 'published',
          $or: [
            { title: searchRegex },
            { content: searchRegex },
            { 'metadata.theme': searchRegex },
            { 'metadata.keywords': { $in: searchKeywords.map(k => new RegExp(k, 'i')) } }
          ]
        })
          .populate('author', 'name profile.penName profileImage')
          .sort({ 'metrics.views': -1 })
          .limit(maxResults)
          .lean();
      }
    }

    // Combine results
    const combinedResults = {
      success: true,
      query,
      ai_analysis: aiResult.success ? {
        interpretation: aiResult.analysis,
        keywords: aiResult.keywords,
        ai_suggestions: aiResult.similar_poems,
        recommendations: aiResult.recommendations
      } : null,
      local_results: localResults.map(poem => ({
        _id: poem._id,
        title: poem.title,
        content: poem.content?.substring(0, 300) + '...',
        author: poem.author?.name || poem.author?.profile?.penName || 'Unknown',
        authorImage: poem.author?.profileImage,
        category: poem.category,
        language: poem.language,
        metrics: poem.metrics,
        relevance: 'local_match'
      })),
      total_results: localResults.length,
      search_method: aiResult.success ? 'ai_semantic_enhanced' : 'fallback_regex',
      timestamp: new Date().toISOString()
    };

    res.json(combinedResults);

  } catch (error) {
    console.error('❌ Semantic search error:', error);
    res.status(500).json({
      success: false,
      error: 'Semantic search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * AI-Powered Image OCR for Poetry
 * POST /api/ai-search/image
 * 
 * Form data: file (image), searchAfterOCR? (boolean)
 */
router.post('/image', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    filePath = req.file.path;
    const searchAfterOCR = req.body.searchAfterOCR !== 'false';

    console.log(`📸 Processing image: ${req.file.originalname}`);

    // Read file and convert to base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');

    // Extract text using GPT-4o Vision
    const ocrResult = await extractTextFromImage(base64Image, req.file.originalname);

    if (!ocrResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to extract text from image',
        details: ocrResult.error
      });
    }

    let searchResults = null;
    
    // Optionally search for the extracted poetry
    if (searchAfterOCR && ocrResult.text) {
      const aiSearch = await semanticPoetrySearch(ocrResult.text, { maxResults: 5 });
      
      // Also search local database
      const extractedWords = ocrResult.text
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 10);

      const regexPattern = extractedWords
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

      if (regexPattern) {
        const localMatches = await Poem.find({
          status: 'published',
          $or: [
            { content: new RegExp(regexPattern, 'i') },
            { title: new RegExp(regexPattern, 'i') }
          ]
        })
          .populate('author', 'name profile.penName')
          .limit(5)
          .lean();

        searchResults = {
          ai_matches: aiSearch.success ? aiSearch.similar_poems : [],
          local_matches: localMatches.map(p => ({
            _id: p._id,
            title: p.title,
            author: p.author?.name || p.author?.profile?.penName,
            content_preview: p.content?.substring(0, 200)
          }))
        };
      }
    }

    res.json({
      success: true,
      ocr: {
        extracted_text: ocrResult.text,
        confidence: ocrResult.confidence,
        method: ocrResult.method
      },
      search_results: searchResults,
      filename: req.file.originalname,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Image processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Image processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Cleanup temp file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

/**
 * AI-Powered Qaafia (Rhyme) Finder
 * POST /api/ai-search/qaafia
 * 
 * Body: { word: string, limit?: number, useAI?: boolean }
 */
router.post('/qaafia', async (req, res) => {
  try {
    const { word, limit = 20, useAI = true } = req.body;

    if (!word || word.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Word is required'
      });
    }

    console.log(`🎵 Finding rhymes for: ${word}`);

    const result = await findRhymes(word.trim(), { limit, useAI });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Qaafia search error:', error);
    res.status(500).json({
      success: false,
      error: 'Qaafia search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * AI-Powered Harf-e-Ravi (Rhyme Letter) Analysis
 * POST /api/ai-search/harf-ravi
 * 
 * Body: { text: string }
 */
router.post('/harf-ravi', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Poetry text is required'
      });
    }

    console.log(`📝 Analyzing Harf-e-Ravi`);

    const result = await analyzeHarfRavi(text.trim());

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Harf-e-Ravi analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Harf-e-Ravi analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * AI-Powered Poem Analysis
 * POST /api/ai-search/analyze
 * 
 * Body: { text: string }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Poetry text is required'
      });
    }

    console.log(`📖 Analyzing poem`);

    const result = await analyzePoem(text.trim());

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Poem analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Poem analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Text-to-Speech for Poetry
 * POST /api/ai-search/tts
 * 
 * Body: { text: string, voice?: string, speed?: number }
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, voice = 'onyx', speed = 1.0 } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    console.log(`🔊 Generating TTS`);

    const result = await generateSpeech(text.trim(), { voice, speed });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'TTS generation failed'
      });
    }

    res.json({
      success: true,
      audio_url: result.path,
      duration_estimate: result.duration_estimate,
      voice: result.voice,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ TTS error:', error);
    res.status(500).json({
      success: false,
      error: 'TTS generation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Combined multimodal search endpoint
 * POST /api/ai-search/multimodal
 * 
 * Body: { 
 *   mode: 'text' | 'image' | 'voice',
 *   query?: string,
 *   audioData?: string (base64),
 *   filters?: object
 * }
 */
router.post('/multimodal', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    const { mode = 'text', query, filters = {} } = req.body;

    console.log(`🔍 Multimodal search - Mode: ${mode}`);

    let searchQuery = query;
    let ocrResult = null;

    // Handle image mode
    if (mode === 'image' && req.file) {
      filePath = req.file.path;
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      ocrResult = await extractTextFromImage(base64Image, req.file.originalname);
      
      if (ocrResult.success) {
        searchQuery = ocrResult.text;
      }
    }

    // Perform semantic search
    let results = { local_results: [], ai_analysis: null };
    
    if (searchQuery && searchQuery.trim()) {
      const aiResult = await semanticPoetrySearch(searchQuery, { maxResults: 20 });
      
      // Build MongoDB query
      const searchRegex = new RegExp(
        searchQuery.split(/\s+/)
          .filter(w => w.length > 1)
          .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|'),
        'i'
      );

      let mongoQuery = {
        status: 'published',
        $or: [
          { title: searchRegex },
          { content: searchRegex }
        ]
      };

      // Apply filters
      if (filters.category) mongoQuery.category = filters.category;
      if (filters.language) mongoQuery.language = filters.language;

      const localResults = await Poem.find(mongoQuery)
        .populate('author', 'name profile.penName profileImage')
        .sort({ 'metrics.views': -1 })
        .limit(20)
        .lean();

      results = {
        local_results: localResults,
        ai_analysis: aiResult.success ? aiResult : null
      };
    }

    res.json({
      success: true,
      mode,
      query: searchQuery,
      ocr: ocrResult,
      results: results.local_results.map(p => ({
        _id: p._id,
        title: p.title,
        content: p.content?.substring(0, 300),
        author: p.author?.name || p.author?.profile?.penName,
        authorImage: p.author?.profileImage,
        category: p.category,
        language: p.language
      })),
      ai_analysis: results.ai_analysis,
      total: results.local_results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Multimodal search error:', error);
    res.status(500).json({
      success: false,
      error: 'Multimodal search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

export default router;
