import Poem from "../models/Poem.js";
import User from "../models/User.js";
import Poet from "../models/poet.js";
import natural from "natural";
import Tesseract from "tesseract.js";
import Fuse from "fuse.js";
import cloudinary from "../config/cloudinary.js";
import RekhtaService from "../services/rekhtaService.js";
import AIPoetryService from "../services/aiPoetryService.js";
import { improveVoiceTranscription } from "../config/openai.js";
import axios from "axios";
import FormData from "form-data";

const rekhtaService = new RekhtaService();

// Python AI Service URL
const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || "http://localhost:5001";


// Helper: Call Python ML service for semantic search
const callSemanticSearch = async (query, topK = 20) => {
  try {
    console.log(`🤖 Calling Python ML service for semantic search: "${query}"`);
    
    const response = await axios.post(
      `${PYTHON_AI_SERVICE_URL}/search/semantic`,
      {
        query,
        top_k: topK,
        threshold: 0.3
      },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (response.data && response.data.success) {
      console.log(`✅ Python ML returned ${response.data.count} semantic matches`);
      return response.data.results;
    }
    
    return [];
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.warn('⚠️  Python ML service not running, falling back to MongoDB search');
    } else {
      console.error('❌ Python ML service error:', error.message);
    }
    return null; // null means fallback to MongoDB
  }
};


// Helper: Create/Update semantic index in Python service
const updateSemanticIndex = async (poems) => {
  try {
    console.log(`📚 Updating semantic index with ${poems.length} poems...`);
    
    const response = await axios.post(
      `${PYTHON_AI_SERVICE_URL}/index/update`,
      { poems },
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (response.data && response.data.success) {
      console.log('✅ Semantic index updated successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Failed to update semantic index:', error.message);
    return false;
  }
};


// Timeout wrapper for AI functions to prevent hanging
const withTimeout = (asyncFn, timeoutMs = 5000) => {
  return async (...args) => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Function timeout")), timeoutMs)
    );

    try {
      return await Promise.race([asyncFn(...args), timeoutPromise]);
    } catch (error) {
      console.warn(`Function timed out or failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  };
};

// Helper function to create fuzzy search instance
const createFuseInstance = (data, keys) => {
  return new Fuse(data, {
    keys,
    threshold: 0.3, // Lower = more strict matching
    distance: 100,
    includeScore: true,
    includeMatches: true,
  });
};

// Helper function to clean and process Urdu text
const processUrduText = (text) => {
  // Remove extra whitespace and normalize
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // Remove diacritics
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

// 1. Enhanced Text Search with dynamic MongoDB integration
export const textSearch = async (req, res) => {
  try {
    console.log("📥 Text search request body:", req.body);
    console.log("📥 Text search request query:", req.query);
    
    // Check req.body first, then fallback to req.query
    const params = Object.keys(req.body).length > 0 ? req.body : req.query;
    
    const {
      query,
      category,
      mood,
      theme,
      language,
      sortBy = "relevance",
      useAI = true,
      page = 1,
      limit = 20,
    } = params;

    console.log("🔍 Extracted query parameter:", query);

    if (!query || query.trim().length === 0) {
      console.error("❌ Query parameter missing or empty");
      return res.status(400).json({
        success: false,
        message: "Search query is required",
        receivedBody: req.body,
        receivedQuery: req.query,
      });
    }

    // ===== TRY PYTHON ML SEMANTIC SEARCH FIRST =====
    let mlResults = await callSemanticSearch(query, limit);
    
    if (mlResults && mlResults.length > 0) {
      console.log(`✅ Using ML semantic search results: ${mlResults.length} poems`);
      
      // Apply filters to ML results if provided
      if (category && category !== "all") {
        mlResults = mlResults.filter(p => p.category === category);
      }
      if (mood && mood !== "all") {
        mlResults = mlResults.filter(p => p.metadata?.mood === mood);
      }
      if (theme && theme !== "all") {
        mlResults = mlResults.filter(p => p.metadata?.theme === theme);
      }
      if (language && language !== "all") {
        mlResults = mlResults.filter(p => p.language === language);
      }
      
      return res.json({
        success: true,
        results: mlResults.slice(0, limit),
        count: mlResults.length,
        page: 1,
        totalPages: 1,
        searchMethod: "semantic_ml",
        hasNext: false,
        hasPrev: false,
      });
    }

    // ===== FALLBACK TO MONGODB SEARCH =====
    console.log("⚠️  Falling back to MongoDB search...");

    let searchQuery = {};
    let sortOptions = {};

    // Build MongoDB search query with regex for multi-field search
    const searchTerms = query.trim().split(/\s+/);
    const regexPattern = searchTerms
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    console.log("🔍 Regex pattern:", regexPattern);
    console.log("🔍 Search terms:", searchTerms);

    // Multi-field search with regex - Use RegExp objects instead of $regex/$options
    const searchRegex = new RegExp(regexPattern, "i");
    
    // Search for matching authors (since author is ObjectId reference)
    const matchingUsers = await User.find({
      $or: [
        { name: searchRegex },
        { "profile.penName": searchRegex },
      ],
    }).select("_id");
    
    const matchingUserIds = matchingUsers.map((user) => user._id);
    console.log("🔍 Found matching authors:", matchingUserIds.length);

    // Build the $or conditions for poem search
    const orConditions = [
      { title: searchRegex },
      { content: searchRegex },
      { "metadata.theme": searchRegex },
      {
        "metadata.keywords": {
          $in: searchTerms.map((term) => new RegExp(term, "i")),
        },
      },
    ];

    // Add author search if we found matching users
    if (matchingUserIds.length > 0) {
      orConditions.push({ author: { $in: matchingUserIds } });
    }

    searchQuery.$or = orConditions;

    // Add filters
    if (category && category !== "all") {
      searchQuery.category = category;
    }
    if (mood && mood !== "all") {
      searchQuery["metadata.mood"] = mood;
    }
    if (theme && theme !== "all") {
      searchQuery["metadata.theme"] = theme;
    }
    if (language && language !== "all") {
      searchQuery.language = language;
    }

    // Only show published poems
    searchQuery.status = "published";

    // Sort options
    switch (sortBy) {
      case "newest":
        sortOptions = { createdAt: -1 };
        break;
      case "oldest":
        sortOptions = { createdAt: 1 };
        break;
      case "mostViewed":
        sortOptions = { views: -1 };
        break;
      case "topRated":
        sortOptions = { rating: -1 };
        break;
      default:
        sortOptions = { views: -1, rating: -1 };
    }

    const skipCount1 = (parseInt(page) - 1) * parseInt(limit);

    // Execute search with population
    const [poems, totalCount] = await Promise.all([
      Poem.find(searchQuery)
        .sort(sortOptions)
        .skip(skipCount1)
        .limit(parseInt(limit))
        .populate("author", "name profile.penName")
        .lean(),
      Poem.countDocuments(searchQuery),
    ]);

    // Process results for better presentation
    const processedResults = poems.map((poem) => ({
      _id: poem._id,
      title: poem.title,
      content: poem.content,
      snippet: poem.content.substring(0, 150) + "...",
      author: poem.author?.name || poem.author?.profile?.penName || "Unknown",
      category: poem.category,
      mood: poem.metadata?.mood,
      theme: poem.metadata?.theme,
      views: poem.views || 0,
      rating: poem.rating || 0,
      createdAt: poem.createdAt,
      language: poem.language || "urdu",
    }));

    // Prepare variables for combined results
    let finalResults = processedResults;
    let externalResults = [];

    // Apply Fuse.js fuzzy search for better relevance (only if we have DB results)
    if (processedResults.length > 0) {
      const fuse = createFuseInstance(processedResults, [
        "title",
        "content",
        "author",
        "category",
        "mood",
        "theme",
      ]);

      const fuzzyResults = fuse.search(query);
      const fuzzyMatches = fuzzyResults.map((result) => ({
        ...result.item,
        score: result.score,
        matches: result.matches,
      }));

      // Use fuzzy matches if available
      finalResults = fuzzyMatches.length > 0 ? fuzzyMatches : processedResults;
    }

    // ALWAYS fetch from external sources (Rekhta) to enrich results
    try {
      console.log("🌐 Fetching results from Rekhta.org...");
      const rekhtaResponse = await rekhtaService.searchPoems(query, 20);
      
      // rekhtaService returns {success, results, query, type} object
      if (rekhtaResponse && rekhtaResponse.success && rekhtaResponse.results && rekhtaResponse.results.length > 0) {
        console.log(`✅ Found ${rekhtaResponse.results.length} poems from Rekhta`);
        externalResults = rekhtaResponse.results.map((poem) => ({
          _id: `rekhta_${poem.url || Math.random()}`,
          title: poem.title || "بے عنوان",
          content: poem.content || "",
          snippet: (poem.content || "").substring(0, 150) + "...",
          author: poem.poet || "Unknown Poet",
          category: poem.type || "ghazal",
          views: 0,
          rating: 0,
          source: "rekhta",
          externalUrl: poem.url || "",
          createdAt: new Date(),
          language: "urdu",
        }));
      } else {
        console.log("⚠️ No results from Rekhta web scraping, trying fallback...");
        
        // Try to use fallback data for famous poets
        const poetKeywords = ["ghalib", "غالب", "iqbal", "اقبال", "faiz", "فیض"];
        const matchedPoet = poetKeywords.find(keyword => 
          query.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (matchedPoet) {
          const poetSlug = matchedPoet.includes("ghalib") || matchedPoet.includes("غالب") ? "ghalib"
                          : matchedPoet.includes("iqbal") || matchedPoet.includes("اقبال") ? "iqbal"
                          : matchedPoet.includes("faiz") || matchedPoet.includes("فیض") ? "faiz"
                          : null;
          
          if (poetSlug) {
            console.log(`🔄 Using fallback data for poet: ${poetSlug}`);
            const fallbackData = await rekhtaService.getPoemsByPoet(poetSlug);
            
            console.log(`📊 Fallback data received:`, {
              success: fallbackData?.success,
              poemsCount: fallbackData?.poems?.length,
              hasPoet: !!fallbackData?.poet,
              poetName: fallbackData?.poet?.name
            });
            
            if (fallbackData && fallbackData.success && fallbackData.poems && fallbackData.poems.length > 0) {
              externalResults = fallbackData.poems.map((poem) => ({
                _id: `rekhta_fallback_${Math.random()}`,
                title: poem.title || "بے عنوان",
                content: poem.content || "",
                snippet: (poem.content || "").substring(0, 150) + "...",
                author: fallbackData.poet?.name || "Unknown Poet",
                category: poem.type || "شعر",
                views: 0,
                rating: 0,
                source: "rekhta_fallback",
                externalUrl: poem.url || "",
                createdAt: new Date(),
                language: "urdu",
              }));
              console.log(`✅ Found ${externalResults.length} poems from fallback data`);
            } else {
              console.log(`❌ Fallback data invalid or empty:`, fallbackData);
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch from Rekhta:", error.message);
    }

    const combinedResults = [...finalResults, ...externalResults];

    // If still no results, return empty with helpful message
    if (combinedResults.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: `No poems found for "${query}". Try different keywords or check spelling.`,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
        query: {
          original: query,
          processed: searchTerms,
          filters: { category, mood, theme, language, sortBy },
        },
        searchType: "text",
        aiEnhanced: useAI === "true",
        sources: {
          database: 0,
          external: 0,
        },
      });
    }

    return res.json({
      success: true,
      results: combinedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount + externalResults.length,
        pages: Math.ceil((totalCount + externalResults.length) / parseInt(limit)),
      },
      query: {
        original: query,
        processed: searchTerms,
        filters: { category, mood, theme, language, sortBy },
      },
      searchType: "text",
      aiEnhanced: useAI === "true",
      sources: {
        database: finalResults.length,
        external: externalResults.length,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

// Voice Search Controller (uses text search internally)
export const voiceSearchController = async (req, res) => {
  try {
    const { transcript, filters = {} } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Voice transcript is required",
      });
    }

    // Use the textSearch logic with the transcript
    const searchParams = {
      query: transcript.trim(),
      ...filters,
    };

    // Forward to text search
    req.body = searchParams;
    return textSearch(req, res);
  } catch (error) {
    console.error("Voice search error:", error);
    return res.status(500).json({
      success: false,
      message: "Voice search failed",
      error: error.message,
    });
  }
};

// 2. Fuzzy Search for misspellings and similar words
export const fuzzySearch = async (req, res) => {
  try {
    const { query, limit = 30 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Get all published poems for fuzzy search
    const allPoems = await Poem.find({ status: "published" })
      .populate("poet", "name bio")
      .populate("author", "username profile.fullName")
      .select(
        "title content searchKeywords category mood theme views averageRating"
      );

    // Create fuzzy search instance
    const fuse = createFuseInstance(allPoems, [
      "title",
      "content",
      "searchKeywords",
      "category",
      "mood",
      "theme",
    ]);

    // Perform fuzzy search
    const fuzzyResults = fuse.search(query, { limit });

    const results = fuzzyResults.map((result) => ({
      ...result.item.toObject(),
      fuzzyScore: result.score,
      matches: result.matches,
      excerpt:
        result.item.content.substring(0, 200) +
        (result.item.content.length > 200 ? "..." : ""),
    }));

    res.json({
      success: true,
      results,
      searchType: "fuzzy",
      originalQuery: query,
    });
  } catch (error) {
    console.error("Fuzzy search error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Voice Search with ChatGPT transcription improvement
export const voiceSearch = async (req, res) => {
  try {
    const { transcribedText, confidence = 0 } = req.body;

    if (!transcribedText || transcribedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Transcribed text is required",
      });
    }

    let improvedTranscription = transcribedText;
    let improvementData = null;

    // Use ChatGPT to improve voice transcription for low confidence
    if (confidence < 0.8) {
      try {
        improvementData = await improveVoiceTranscription(
          transcribedText,
          confidence
        );
        if (improvementData.success) {
          improvedTranscription = improvementData.improvedText;
        }
      } catch (error) {
        console.warn(
          "Voice improvement failed, using original:",
          error.message
        );
      }
    }

    // Determine search method based on improved confidence
    const finalConfidence = improvementData?.confidence || confidence;
    const searchMethod = finalConfidence < 0.7 ? "fuzzy" : "semantic_ml";

    let results = [];
    let externalResults = [];
    
    // ===== TRY ML SEMANTIC SEARCH FIRST =====
    if (searchMethod === "semantic_ml") {
      results = await callSemanticSearch(improvedTranscription, 20);
      
      if (results && results.length > 0) {
        console.log(`✅ Voice search: ML semantic returned ${results.length} results`);
      }
    }
    
    // ===== FALLBACK TO MONGODB SEARCH =====
    if (!results || results.length === 0) {
      console.log("⚠️  Voice search: Falling back to MongoDB search...");
      
      const allPoems = await Poem.find({ status: "published" })
        .populate("poet", "name bio profileImage")
        .populate("author", "username profile.fullName")
        .select("title content searchKeywords category mood theme");

      const fuse = createFuseInstance(allPoems, [
        "title",
        "content",
        "searchKeywords",
        "category",
        "mood",
        "theme",
      ]);
      const fuzzyResults = fuse.search(improvedTranscription, { limit: 20 });

      results = fuzzyResults.map((result) => ({
        ...result.item.toObject(),
        fuzzyScore: result.score,
        source: "database",
        excerpt:
          result.item.content.substring(0, 200) +
          (result.item.content.length > 200 ? "..." : ""),
      }));
    }

    // ===== ALWAYS FETCH FROM REKHTA FOR MORE RESULTS =====
    try {
      console.log("🌐 Voice search: Fetching from Rekhta.org...");
      
      // Detect if query contains poet keywords
      const poetKeywords = {
        "ghalib": ["ghalib", "غالب", "mirza ghalib", "میرزا غالب"],
        "iqbal": ["iqbal", "اقبال", "allama iqbal", "علامہ اقبال"],
        "faiz": ["faiz", "فیض", "faiz ahmad", "فیض احمد فیض"],
      };
      
      let poetSlug = null;
      const lowerQuery = improvedTranscription.toLowerCase();
      
      for (const [slug, keywords] of Object.entries(poetKeywords)) {
        if (keywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()))) {
          poetSlug = slug;
          break;
        }
      }
      
      let rekhtaResponse;
      
      if (poetSlug) {
        // Use getPoemsByPoet for known poets (has fallback data)
        console.log(`✅ Detected poet: ${poetSlug}, fetching poems...`);
        rekhtaResponse = await rekhtaService.getPoemsByPoet(poetSlug, 1, 20);
        
        if (rekhtaResponse && rekhtaResponse.success && rekhtaResponse.poems && rekhtaResponse.poems.length > 0) {
          console.log(`✅ Found ${rekhtaResponse.poems.length} poems for ${poetSlug}`);
          externalResults = rekhtaResponse.poems.map((poem) => ({
            _id: `rekhta_${poem.url || Math.random()}`,
            title: poem.title || "بے عنوان",
            content: poem.content || "",
            snippet: (poem.content || "").substring(0, 150) + "...",
            author: { name: rekhtaResponse.poet?.name || "Unknown Poet" },
            poet: { name: rekhtaResponse.poet?.name || "Unknown Poet" },
            category: poem.type || "ghazal",
            views: 0,
            rating: 0,
            source: "rekhta",
            externalUrl: poem.url || "",
            createdAt: new Date(),
            language: "urdu",
          }));
        }
      } else {
        // Try general search (may return empty results)
        rekhtaResponse = await rekhtaService.searchPoems(improvedTranscription, 20);
        
        if (rekhtaResponse && rekhtaResponse.success && rekhtaResponse.results && rekhtaResponse.results.length > 0) {
          console.log(`✅ Found ${rekhtaResponse.results.length} poems from Rekhta`);
          externalResults = rekhtaResponse.results.map((poem) => ({
            _id: `rekhta_${poem.url || Math.random()}`,
            title: poem.title || "بے عنوان",
            content: poem.content || "",
            snippet: (poem.content || "").substring(0, 150) + "...",
            author: { name: poem.poet || "Unknown Poet" },
            poet: { name: poem.poet || "Unknown Poet" },
            category: poem.type || "ghazal",
            views: 0,
            rating: 0,
            source: "rekhta",
            externalUrl: poem.url || "",
            createdAt: new Date(),
            language: "urdu",
          }));
        }
      }
    } catch (rekhtaError) {
      console.error("⚠️  Rekhta fetch failed:", rekhtaError.message);
    }

    // Combine results (database first, then external)
    const combinedResults = [...results, ...externalResults].slice(0, 20);

    res.json({
      success: true,
      results: combinedResults,
      searchType: "voice",
      originalTranscription: transcribedText,
      improvedTranscription: improvedTranscription,
      originalConfidence: confidence,
      finalConfidence: finalConfidence,
      method: searchMethod,
      improvementData: improvementData,
      databaseCount: results.length,
      externalCount: externalResults.length,
      totalCount: combinedResults.length,
    });
  } catch (error) {
    console.error("Voice search error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Image-based search using OCR with ChatGPT text analysis
export const imageSearch = async (req, res) => {
  try {
    const { image, extractedText: preExtractedText, ocrConfidence: preOcrConfidence, useRekhta } = req.body;

    let extractedText = preExtractedText || "";
    let ocrConfidence = preOcrConfidence || 0;
    let ocrMethod = "frontend_tesseract";
    let rekhtaMatches = [];
    let bestRekhtaMatch = null;

    // ===== TRY PYTHON AI OCR WITH REKHTA INTEGRATION =====
    if (image && image.startsWith("data:") && useRekhta !== false) {
      try {
        console.log("🐍 Trying Python AI OCR with Rekhta integration...");
        
        // Convert base64 to FormData for file upload
        const base64Data = image.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const formData = new FormData();
        formData.append('file', buffer, { filename: 'poetry-image.jpg', contentType: 'image/jpeg' });
        formData.append('auto_detect_language', 'true');
        formData.append('max_rekhta_results', '5');

        const rekhtaResponse = await axios.post(
          `${PYTHON_AI_SERVICE_URL}/analyze/image-with-rekhta`,
          formData,
          { 
            timeout: 30000,
            headers: formData.getHeaders ? formData.getHeaders() : {}
          }
        );

        if (rekhtaResponse.data && rekhtaResponse.data.success) {
          const { ocr, rekhta } = rekhtaResponse.data;
          
          if (ocr && ocr.text) {
            extractedText = ocr.text;
            ocrConfidence = ocr.confidence || 0.8;
            ocrMethod = "python_ml_tesseract_with_rekhta";
            
            console.log(`✅ Python OCR extracted (${(ocrConfidence * 100).toFixed(1)}% confidence): "${extractedText.substring(0, 100)}..."`);
            console.log(`🌍 Detected language: ${ocr.detected_language}`);
            
            // Store Rekhta matches
            if (rekhta && rekhta.success && rekhta.matches) {
              rekhtaMatches = rekhta.matches;
              bestRekhtaMatch = rekhta.best_match;
              console.log(`✅ Found ${rekhtaMatches.length} Rekhta matches`);
              if (bestRekhtaMatch) {
                console.log(`🏆 Best match: "${bestRekhtaMatch.title}" by ${bestRekhtaMatch.poet} (${bestRekhtaMatch.match_score?.toFixed(1)}%)`);
              }
            }
          }
        }
      } catch (rekhtaError) {
        console.warn("⚠️ Python OCR with Rekhta failed, falling back to standard OCR:", rekhtaError.message);
      }
    }

    // ===== FALLBACK: TRY PYTHON AI OCR WITHOUT REKHTA =====
    if (!extractedText && image && image.startsWith("data:")) {
      try {
        console.log("🐍 Trying standard Python AI OCR...");
        
        // Upload to Cloudinary first if needed
        let imageUrl = image;
        if (image.startsWith("data:")) {
          try {
            const uploadedImage = await cloudinary.uploader.upload(image, {
              folder: "poetry-search",
              resource_type: "image",
            });
            imageUrl = uploadedImage.secure_url;
          } catch (uploadError) {
            console.warn("⚠️ Cloudinary upload failed, using base64");
          }
        }

        const ocrResponse = await axios.post(
          `${PYTHON_AI_SERVICE_URL}/analyze/image`,
          { url: imageUrl, image: image },
          { timeout: 20000 }
        );

        if (ocrResponse.data && ocrResponse.data.success && ocrResponse.data.text) {
          extractedText = ocrResponse.data.text;
          ocrConfidence = ocrResponse.data.confidence || 0.8;
          ocrMethod = "python_ml_tesseract";
          
          console.log(`✅ Python OCR extracted (${(ocrConfidence * 100).toFixed(1)}% confidence): "${extractedText.substring(0, 100)}..."`);
          
          // Check if OCR flagged text as garbled
          if (ocrResponse.data.is_garbled || ocrResponse.data.quality === 'poor') {
            console.warn(`⚠️ OCR text is flagged as garbled or poor quality`);
            
            // If text is very garbled, reject it early
            if (ocrConfidence < 0.5 || extractedText.length < 10) {
              return res.json({
                success: true,
                results: [],
                message: "تصویر کا معیار خراب ہے۔ براہ کرم صاف اور واضح تصویر استعمال کریں۔ / Image quality is too poor. Please use a clear, high-quality image with good lighting.",
                extractedText: extractedText,
                ocrQuality: 'poor',
                suggestions: [
                  "Use better lighting",
                  "Keep camera steady",
                  "Use higher resolution image",
                  "Ensure text is clearly visible"
                ]
              });
            }
          }
        }
      } catch (pyError) {
        console.warn("⚠️ Python OCR failed:", pyError.message);
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.json({
        success: true,
        results: [],
        message: "Could not extract text from image. Please try a clearer image.",
        extractedText: "",
      });
    }

    console.log(`📝 Working with text: "${extractedText.substring(0, 100)}..."`);

    // ===== VALIDATE EXTRACTED TEXT =====
    // Check if text contains meaningful Urdu or English content
    const hasUrdu = /[\u0600-\u06FF]/.test(extractedText);
    const hasEnglish = /[a-zA-Z]/.test(extractedText);
    const urduWords = extractedText.match(/[\u0600-\u06FF]+/g) || [];
    const englishWords = extractedText.match(/[a-zA-Z]+/g) || [];
    
    // Calculate meaningful content ratio
    const totalLength = extractedText.length;
    const meaningfulLength = urduWords.join('').length + englishWords.join('').length;
    const meaningfulRatio = totalLength > 0 ? meaningfulLength / totalLength : 0;
    
    console.log(`📊 Text analysis: Urdu words: ${urduWords.length}, English words: ${englishWords.length}, Meaningful ratio: ${(meaningfulRatio * 100).toFixed(1)}%`);
    
    // If text is mostly garbage (< 30% meaningful content), reject it
    if (meaningfulRatio < 0.3 && totalLength > 5) {
      console.warn(`⚠️ Text appears to be mostly garbage (${(meaningfulRatio * 100).toFixed(1)}% meaningful)`);
      return res.json({
        success: true,
        results: [],
        message: "تصویر سے صحیح متن نہیں نکل سکا۔ براہ کرم بہتر تصویر استعمال کریں۔ / Could not extract valid text. Please use a better quality image.",
        extractedText: extractedText,
        ocrQuality: 'invalid',
        suggestions: [
          "تصویر میں متن واضح ہونا چاہیے / Text should be clearly visible",
          "اچھی روشنی استعمال کریں / Use good lighting", 
          "تصویر blur نہیں ہونی چاہیے / Image should not be blurry",
          "صاف background ہو / Use clean background"
        ]
      });
    }

    // ===== EXTRACT KEYWORDS (IMPORTANT URDU WORDS) =====
    const words = extractedText
      .split(/\s+/)
      .map(word => word.replace(/[^\u0600-\u06FFa-zA-Z]/g, ''))
      .filter(word => word.length >= 3 && /[\u0600-\u06FF]/.test(word));
    
    // Temporary keywords for initial processing - will be replaced by AI
    let searchKeywords = [...new Set(words)].slice(0, 10);
        console.log(`📝 Working with text: "${extractedText.substring(0, 100)}..."`);

    // ===== IMPROVE OCR TEXT USING OPENAI =====
    let correctedText = extractedText;
    let detectedPoet = null;
    let improvedByAI = false;

    try {
      console.log("🤖 Using OpenAI to improve OCR and extract keywords...");
      const OpenAIService = (await import('../services/openaiService.js')).default;
      const openaiService = new OpenAIService();
      
      const improvement = await openaiService.improveUrduOCR(extractedText);
      
      if (improvement.success && improvement.keywords.length > 0) {
        correctedText = improvement.correctedText;
        searchKeywords = improvement.keywords;
        detectedPoet = improvement.poetName;
        improvedByAI = true;
        
        console.log(`✅ AI improved text: "${correctedText.substring(0, 100)}..."`);
        console.log(`📝 AI extracted keywords: ${searchKeywords.slice(0, 5).join(', ')}`);
        if (detectedPoet) {
          console.log(`👤 AI detected poet: ${detectedPoet}`);
        }
      }
    } catch (aiError) {
      console.warn("⚠️ OpenAI improvement failed, using basic extraction:", aiError.message);
    }

    // ===== FALLBACK: BASIC KEYWORD EXTRACTION =====
    if (searchKeywords.length === 0) {
      console.log("📝 Using basic keyword extraction...");
      const words = extractedText
        .split(/\s+/)
        .map(word => word.replace(/[^\u0600-\u06FFa-zA-Z]/g, ''))
        .filter(word => word.length >= 3 && /[\u0600-\u06FF]/.test(word));
      
      searchKeywords = [...new Set(words)].slice(0, 10);
      console.log(`📝 Extracted ${searchKeywords.length} keywords: ${searchKeywords.slice(0, 5).join(', ')}...`);
    }

    // ===== PRIORITIZE REKHTA (EXTERNAL SOURCE) =====
    let externalResults = [];
    
    // Strategy 1: Search Rekhta with keywords - but FILTER results to only relevant poems
    if (searchKeywords.length >= 2) {
      try {
        const searchQuery = searchKeywords.slice(0, 4).join(' ');
        console.log(`🌐 Searching Rekhta with: "${searchQuery}"`);
        
        const rekhtaResponse = await rekhtaService.searchPoems(searchQuery, 20);
        
        if (rekhtaResponse && rekhtaResponse.success && rekhtaResponse.results && rekhtaResponse.results.length > 0) {
          console.log(`✅ Rekhta search returned ${rekhtaResponse.results.length} poems`);
          
          // FILTER: Only keep poems that contain at least 2 of the search keywords
          // This prevents returning completely unrelated poems
          const minKeywordMatches = Math.max(2, Math.floor(searchKeywords.length / 2));
          
          externalResults = rekhtaResponse.results
            .map((poem) => {
              const content = (poem.content || '').toLowerCase();
              const matchCount = searchKeywords.filter(keyword => 
                content.includes(keyword.toLowerCase())
              ).length;
              
              return {
                _id: `rekhta_${poem.url || Math.random()}`,
                title: poem.title || "بے عنوان",
                content: poem.content || "",
                snippet: (poem.content || "").substring(0, 200) + "...",
                author: { name: poem.poet || "Unknown Poet" },
                poet: { name: poem.poet || "Unknown Poet" },
                category: poem.type || "ghazal",
                source: "rekhta",
                externalUrl: poem.url || "https://www.rekhta.org",
                language: "urdu",
                matchCount: matchCount,
              };
            })
            .filter(poem => poem.matchCount >= minKeywordMatches)
            .sort((a, b) => b.matchCount - a.matchCount)
            .slice(0, 15);
          
          console.log(`📊 Filtered to ${externalResults.length} relevant poems (min ${minKeywordMatches} keywords matched)`);
        }
      } catch (rekhtaError) {
        console.error("⚠️ Rekhta search error:", rekhtaError.message);
      }
    }

    // Strategy 2: Detect famous poet (from AI or pattern matching)
    const poetPatterns = {
      "ghalib": /غالب|ghalib|mirza|میرزا/i,
      "iqbal": /اقبال|iqbal|allama|علامہ/i,
      "faiz": /فیض|faiz|ahmad|احمد/i,
      "mir": /میر|mir|taqi|تقی/i,
    };

    // If AI didn't detect poet, try pattern matching
    if (!detectedPoet) {
      for (const [poet, pattern] of Object.entries(poetPatterns)) {
        if (pattern.test(extractedText) || searchKeywords.some(kw => pattern.test(kw))) {
          detectedPoet = poet;
          break;
        }
      }
    } else {
      // Normalize AI-detected poet name to slug
      const poetLower = detectedPoet.toLowerCase();
      if (poetLower.includes('ghalib') || poetLower.includes('غالب')) {
        detectedPoet = 'ghalib';
      } else if (poetLower.includes('iqbal') || poetLower.includes('اقبال')) {
        detectedPoet = 'iqbal';
      } else if (poetLower.includes('faiz') || poetLower.includes('فیض')) {
        detectedPoet = 'faiz';
      } else if (poetLower.includes('mir') || poetLower.includes('میر')) {
        detectedPoet = 'mir';
      }
    }

    if (detectedPoet && externalResults.length === 0) {
      try {
        console.log(`� Detected poet: ${detectedPoet}, fetching their poems...`);
        const poetResponse = await rekhtaService.getPoemsByPoet(detectedPoet, 1, 10);
        
        if (poetResponse && poetResponse.success && poetResponse.poems) {
          console.log(`✅ Found ${poetResponse.poems.length} poems by ${detectedPoet}`);
          
          // FILTER: Only keep poems containing at least one keyword
          const filteredPoems = poetResponse.poems.filter(poem => {
            const content = (poem.content || '').toLowerCase();
            return searchKeywords.some(keyword => content.includes(keyword.toLowerCase()));
          });
          
          console.log(`📊 Filtered to ${filteredPoems.length} relevant poems from ${detectedPoet}`);
          
          const poetPoems = filteredPoems.map((poem) => ({
            _id: `rekhta_poet_${poem.url || Math.random()}`,
            title: poem.title || "بے عنوان",
            content: poem.content || "",
            snippet: (poem.content || "").substring(0, 200) + "...",
            author: { name: poetResponse.poet?.name || detectedPoet },
            poet: { name: poetResponse.poet?.name || detectedPoet },
            category: poem.type || "ghazal",
            source: "rekhta",
            externalUrl: poem.url || "https://www.rekhta.org",
            language: "urdu",
          }));
          
          externalResults = poetPoems.slice(0, 10); // Limit to 10 most relevant
        }
      } catch (poetError) {
        console.error("⚠️ Poet poems fetch error:", poetError.message);
      }
    }

    // ===== ONLY CHECK DATABASE IF REKHTA RETURNS NOTHING =====
    let databaseResults = [];
    
    if (externalResults.length === 0 && searchKeywords.length > 0) {
      console.log("🔍 No Rekhta results, checking local database...");
      
      try {
        const keywordRegexes = searchKeywords.slice(0, 5).map(kw => new RegExp(kw, 'i'));
        
        databaseResults = await Poem.find({
          status: "published",
          $or: keywordRegexes.map(regex => ({ content: regex }))
        })
        .populate("poet", "name bio profileImage")
        .populate("author", "username profile.fullName")
        .limit(5)
        .lean();
        
        if (databaseResults.length > 0) {
          console.log(`✅ Found ${databaseResults.length} poems in local database`);
          databaseResults = databaseResults.map(poem => ({
            ...poem,
            source: "database",
          }));
        }
      } catch (dbError) {
        console.error("⚠️ Database search error:", dbError.message);
      }
    }

    // ===== COMBINE RESULTS (PRIORITIZE EXTERNAL) =====
    const combinedResults = [...externalResults, ...databaseResults].slice(0, 20);

    return res.json({
      success: true,
      results: combinedResults,
      extractedText: extractedText,
      correctedText: correctedText !== extractedText ? correctedText : undefined,
      improvedByAI: improvedByAI,
      searchKeywords: searchKeywords.slice(0, 5),
      detectedPoet: detectedPoet,
      ocrConfidence: ocrConfidence,
      ocrMethod: ocrMethod,
      externalCount: externalResults.length,
      databaseCount: databaseResults.length,
      totalCount: combinedResults.length,
      // Add Rekhta matches if available
      rekhtaMatches: rekhtaMatches.length > 0 ? rekhtaMatches : undefined,
      bestRekhtaMatch: bestRekhtaMatch || undefined,
      hasRekhtaMatch: rekhtaMatches.length > 0,
      message: combinedResults.length === 0 
        ? "No poems found. Try uploading a clearer image or check if the text is readable." 
        : `Found ${combinedResults.length} poems${detectedPoet ? ` (detected poet: ${detectedPoet})` : ''} - ${externalResults.length} from Rekhta, ${databaseResults.length} from database.`
    });

  } catch (error) {
    console.error("❌ Image search error:", error);
    return res.status(500).json({
      success: false,
      message: "Image search failed",
      error: error.message,
    });
  }
};

// 5. Smart Search Suggestions - Simplified version without OpenAI dependency
export const getSmartSuggestions = async (req, res) => {
  try {
    // Handle both GET (query params) and POST (body) requests
    const query = req.query.query || req.body.partialQuery || req.body.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: [],
        message: "Query too short for suggestions",
      });
    }

    // Hardcoded smart suggestions based on Urdu poetry patterns
    const smartSuggestions = [
      "محبت کی شاعری",
      "غالب کے اشعار",
      "اقبال کی نظمیں",
      "دکھ کے گیت",
      "فراق کی غزلیں",
      "میر تقی میر",
      "عشق کی باتیں",
      "زندگی کے گیت",
      "حافظ شیرازی",
      "سعدی کے اشعار",
      "غزل کی دنیا",
      "نظم آزاد",
      "قلندر کی بات",
      "صوفی شاعری",
    ];

    // Filter suggestions based on partial query
    const filteredSuggestions = smartSuggestions.filter(
      (suggestion) =>
        suggestion.includes(query) ||
        query.includes(suggestion.split(" ")[0]) ||
        query.length < 3
    );

    // Always return at least some suggestions
    const finalSuggestions =
      filteredSuggestions.length > 0
        ? filteredSuggestions.slice(0, 8)
        : smartSuggestions.slice(0, 6);

    res.json({
      success: true,
      suggestions: finalSuggestions,
      totalSuggestions: finalSuggestions.length,
      query: query,
    });
  } catch (error) {
    console.error("Smart suggestions error:", error);
    // Always return a success response with fallback data
    res.json({
      success: true,
      suggestions: [
        "محبت کی شاعری",
        "غالب کے اشعار",
        "اقبال کی نظمیں",
        "دکھ کے گیت",
      ],
      message: "Using fallback suggestions",
    });
  }
};

// 6. Advanced search with multiple filters
export const advancedSearch = async (req, res) => {
  try {
    const {
      query,
      poetName,
      category,
      mood,
      theme,
      language,
      dateRange,
      minRating,
      sortBy = "relevance",
      limit = 50,
      page = 1,
    } = req.body;

    let searchQuery = { status: "published" };
    const skipCount3 = (page - 1) * limit;

    // Text search
    if (query && query.trim().length > 0) {
      const processedQuery = processUrduText(query);
      searchQuery.$or = [
        { title: { $regex: processedQuery, $options: "i" } },
        { content: { $regex: processedQuery, $options: "i" } },
        { searchKeywords: { $in: processedQuery.split(" ") } },
      ];
    }

    // Poet filter
    if (poetName && poetName.trim().length > 0) {
      const poets = await Poet.find({
        name: { $regex: poetName, $options: "i" },
      }).select("_id");
      if (poets.length > 0) {
        searchQuery.poet = { $in: poets.map((p) => p._id) };
      }
    }

    // Category filter
    if (category && category !== "all") {
      searchQuery.category = category;
    }

    // Mood filter
    if (mood && mood !== "all") {
      searchQuery.mood = mood;
    }

    // Theme filter
    if (theme && theme !== "all") {
      searchQuery.theme = theme;
    }

    // Language filter
    if (language && language !== "all") {
      searchQuery.poetryLanguage = language;
    }

    // Date range filter
    if (dateRange && dateRange.start && dateRange.end) {
      searchQuery.publishedAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end),
      };
    }

    // Minimum rating filter
    if (minRating && minRating > 0) {
      searchQuery.averageRating = { $gte: minRating };
    }

    // Sort options
    let sortOptions = {};
    switch (sortBy) {
      case "newest":
        sortOptions = { publishedAt: -1 };
        break;
      case "oldest":
        sortOptions = { publishedAt: 1 };
        break;
      case "mostViewed":
        sortOptions = { views: -1 };
        break;
      case "topRated":
        sortOptions = { averageRating: -1 };
        break;
      case "relevance":
      default:
        sortOptions = { views: -1, averageRating: -1, publishedAt: -1 };
        break;
    }

    const results = await Poem.find(searchQuery)
      .populate("poet", "name bio profileImage")
      .populate("author", "username profile.fullName")
      .sort(sortOptions)
      .skip(skipCount3)
      .limit(limit);

    const totalCount = await Poem.countDocuments(searchQuery);

    res.json({
      success: true,
      results: results.map((poem) => ({
        ...poem.toObject(),
        excerpt:
          poem.content.substring(0, 200) +
          (poem.content.length > 200 ? "..." : ""),
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        hasNext: skipCount3 + results.length < totalCount,
        hasPrev: page > 1,
      },
      filters: {
        query,
        poetName,
        category,
        mood,
        theme,
        language,
        dateRange,
        minRating,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Advanced search error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Unified Search - Uses Local Database and OpenAI (Rekhta disabled)
export const unifiedSearch = async (req, res) => {
  try {
    const {
      query,
      limit = 20,
      page = 1,
      useAI = true,
      includeRekhta = false, // Disabled by default
      sources = ["database", "ai"], // Only use database and AI by default
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    console.log(
      `🔍 Unified search for: "${query}" across sources: ${sources.join(", ")}`
    );

    const results = {
      success: true,
      query: query,
      sources: {
        database: { poems: [], count: 0, source: "Local Database" },
        rekhta: { poems: [], count: 0, source: "Rekhta.org" },
        ai: { suggestions: [], recommendations: [], source: "OpenAI" },
      },
      combined: [],
      searchTime: new Date().toISOString(),
    };

    // 1. Search Local Database
    if (sources.includes("database")) {
      try {
        console.log("🔍 Searching local database...");
        const processedQuery = processUrduText(query);

        const databaseResults = await Poem.find({
          $or: [
            { title: { $regex: processedQuery, $options: "i" } },
            { content: { $regex: processedQuery, $options: "i" } },
            { searchKeywords: { $in: processedQuery.split(" ") } },
          ],
          status: "published",
        })
          .populate("poet", "name bio profileImage")
          .populate("author", "username profile.fullName")
          .sort({ views: -1, averageRating: -1 })
          .limit(Math.floor(limit / 2)); // Reserve half for database

        results.sources.database.poems = databaseResults.map((poem) => ({
          ...poem.toObject(),
          source: "database",
          excerpt:
            poem.content.substring(0, 200) +
            (poem.content.length > 200 ? "..." : ""),
          relevanceScore: calculateRelevanceScore(poem, query),
        }));
        results.sources.database.count = databaseResults.length;

        console.log(
          `✅ Found ${databaseResults.length} poems in local database`
        );
      } catch (error) {
        console.error("❌ Database search error:", error);
        results.sources.database.error = error.message;
      }
    }

    // 2. Search Rekhta API - DISABLED (Using local database only)
    // Commented out to use only local database
    /*
    if (sources.includes("rekhta") && includeRekhta) {
      try {
        console.log("🔍 Searching Rekhta API...");

        // First try searching for poems
        const rekhtaSearchResults = await RekhtaService.searchPoems(
          query,
          "poem"
        );

        if (
          rekhtaSearchResults.success &&
          rekhtaSearchResults.results.length > 0
        ) {
          results.sources.rekhta.poems = rekhtaSearchResults.results
            .slice(0, Math.floor(limit / 3))
            .map((poem) => ({
              title: poem.title,
              content: poem.content,
              url: poem.url,
              type: poem.type,
              source: "rekhta",
              excerpt:
                poem.content.substring(0, 200) +
                (poem.content.length > 200 ? "..." : ""),
              relevanceScore: calculateTextRelevance(poem.content, query),
            }));
          results.sources.rekhta.count = rekhtaSearchResults.results.length;
          console.log(
            `✅ Found ${rekhtaSearchResults.results.length} poems from Rekhta`
          );
        } else {
          // Try searching for poet-specific content
          const poetQuery = extractPoetName(query);
          if (poetQuery) {
            console.log(`🔍 Searching for poet: ${poetQuery}`);
            const poetResults = await RekhtaService.getPoemsByPoet(
              poetQuery,
              1,
              5
            );

            if (poetResults.success && poetResults.poems.length > 0) {
              results.sources.rekhta.poems = poetResults.poems.map((poem) => ({
                ...poem,
                source: "rekhta",
                poet: poetResults.poet,
                excerpt:
                  poem.content.substring(0, 200) +
                  (poem.content.length > 200 ? "..." : ""),
                relevanceScore: calculateTextRelevance(poem.content, query),
              }));
              results.sources.rekhta.count = poetResults.poems.length;
              console.log(
                `✅ Found ${poetResults.poems.length} poems by poet ${poetQuery}`
              );
            }
          }
        }

        // Get featured poems as fallback
        if (results.sources.rekhta.count === 0) {
          console.log("🔍 Getting featured poems as fallback...");
          const featuredResults = await RekhtaService.getFeaturedPoems();
          if (featuredResults.success) {
            results.sources.rekhta.poems = featuredResults.poems
              .slice(0, 3)
              .map((poem) => ({
                ...poem,
                source: "rekhta",
                excerpt:
                  poem.content.substring(0, 200) +
                  (poem.content.length > 200 ? "..." : ""),
                relevanceScore: 0.3, // Low relevance for featured content
              }));
            results.sources.rekhta.count = featuredResults.poems.length;
            results.sources.rekhta.note =
              "Featured poems (no direct matches found)";
          }
        }
      } catch (error) {
        console.error("❌ Rekhta search error:", error);
        results.sources.rekhta.error = error.message;
      }
    }
    */

    // 3. AI-Enhanced Suggestions and Analysis
    if (sources.includes("ai") && useAI) {
      try {
        console.log("🔍 Getting AI suggestions...");

        // Get AI writing suggestions for the query
        const suggestions = await AIPoetryService.generateWritingSuggestions(
          query,
          "ghazal"
        );
        if (suggestions.success) {
          results.sources.ai.suggestions = suggestions.suggestions;
          console.log(`✅ Generated AI writing suggestions`);
        }

        // Get AI recommendations based on available poems
        const allPoems = [
          ...results.sources.database.poems,
          // Rekhta disabled - using local database only
        ];
        if (allPoems.length > 0) {
          // Build dynamic user profile based on search context
          const userProfile = {
            favoriteCategories: [query],
            favoritePoets: [extractPoetName(query)].filter(Boolean),
            preferredThemes: [query],
          };

          const recommendations =
            await AIPoetryService.generatePersonalizedRecommendations(
              userProfile,
              allPoems
            );

          if (recommendations.success) {
            results.sources.ai.recommendations =
              recommendations.recommendations;
            results.sources.ai.reasoning = recommendations.reasoning;
            console.log(`✅ Generated AI recommendations`);
          }
        }
      } catch (error) {
        console.error("❌ AI processing error:", error);
        results.sources.ai.error = error.message;
      }
    }

    // 4. Combine and rank all results
    const combinedPoems = [
      ...results.sources.database.poems,
      ...results.sources.rekhta.poems,
    ];

    // Sort by relevance score and source priority
    combinedPoems.sort((a, b) => {
      // Prioritize database results slightly
      if (a.source === "database" && b.source !== "database") return -0.1;
      if (b.source === "database" && a.source !== "database") return 0.1;

      return b.relevanceScore - a.relevanceScore;
    });

    results.combined = combinedPoems.slice(0, limit);

    // 5. Add summary statistics
    results.summary = {
      totalResults: combinedPoems.length,
      databaseResults: results.sources.database.count,
      rekhtaResults: results.sources.rekhta.count,
      aiSuggestions: results.sources.ai.suggestions?.length || 0,
      searchComplete: true,
      searchDuration: `${
        Date.now() - new Date(results.searchTime).getTime()
      }ms`,
    };

    console.log(
      `🎉 Unified search complete: ${results.combined.length} total results`
    );

    res.json(results);
  } catch (error) {
    console.error("Unified search error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      query: req.body.query || "Unknown query",
    });
  }
};


// Initialize Semantic Index
export const initializeSemanticIndex = async (req, res) => {
  try {
    console.log("📚 Initializing semantic index from MongoDB...");
    
    // Fetch all published poems
    const poems = await Poem.find({ status: "published" })
      .populate("poet", "name")
      .populate("author", "username profile.fullName")
      .select("title content author poet category language metadata createdAt")
      .lean();
    
    if (poems.length === 0) {
      return res.json({
        success: false,
        message: "No poems found in database to index",
      });
    }
    
    console.log(`📚 Found ${poems.length} poems to index`);
    
    // Format poems for Python service
    const formattedPoems = poems.map(poem => ({
      _id: poem._id.toString(),
      title: poem.title || "",
      content: poem.content || "",
      author: poem.author?.username || poem.author?.profile?.fullName || "",
      poet: poem.poet?.name || "",
      category: poem.category || "",
      language: poem.language || "",
      metadata: poem.metadata || {},
      createdAt: poem.createdAt
    }));
    
    // Send to Python ML service
    try {
      const response = await axios.post(
        `${PYTHON_AI_SERVICE_URL}/index/create`,
        { poems: formattedPoems },
        {
          timeout: 60000, // 60 seconds for large datasets
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (response.data && response.data.success) {
        console.log("✅ Semantic index created successfully!");
        
        return res.json({
          success: true,
          message: `Semantic index initialized with ${poems.length} poems`,
          poemCount: poems.length,
          indexData: response.data
        });
      } else {
        throw new Error("Python service returned unsuccessful response");
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: "Python ML service is not running. Please start it first.",
          error: "Service unavailable"
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("❌ Failed to initialize semantic index:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initialize semantic index",
      error: error.message,
    });
  }
};


// Helper functions for unified search
function calculateRelevanceScore(poem, query) {
  const queryLower = query.toLowerCase();
  const titleLower = poem.title.toLowerCase();
  const contentLower = poem.content.toLowerCase();

  let score = 0;

  // Title exact match gets highest score
  if (titleLower.includes(queryLower)) score += 100;

  // Content matches
  const contentMatches = (
    contentLower.match(new RegExp(queryLower, "gi")) || []
  ).length;
  score += contentMatches * 10;

  // Popularity bonus
  score += Math.log(poem.views + 1) * 2;
  score += poem.averageRating * 5;

  return score;
}

function calculateTextRelevance(text, query) {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  const matches = (textLower.match(new RegExp(queryLower, "gi")) || []).length;
  return matches * 10 + (textLower.includes(queryLower) ? 50 : 0);
}

function extractPoetName(query) {
  const commonPoets = {
    غالب: "ghalib",
    ghalib: "ghalib",
    mirza: "ghalib",
    "mirza ghalib": "ghalib",
    اقبال: "iqbal",
    iqbal: "iqbal",
    "allama iqbal": "iqbal",
    "علامہ اقبال": "iqbal",
    فیض: "faiz",
    faiz: "faiz",
    "faiz ahmed faiz": "faiz",
    "فیض احمد فیض": "faiz",
    میر: "mir",
    mir: "mir",
    "mir taqi mir": "mir",
    "میر تقی میر": "mir",
    ذوق: "zauq",
    zauq: "zauq",
    "ibrahim zauq": "zauq",
    "ابراہیم ذوق": "zauq",
  };

  const queryLower = query.toLowerCase();
  for (const [poet, slug] of Object.entries(commonPoets)) {
    if (queryLower.includes(poet.toLowerCase())) {
      return slug;
    }
  }
  return null;
}
