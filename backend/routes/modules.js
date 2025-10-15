import express from "express";
const router = express.Router();
import searchService from "../services/searchService.js";
import profileService from "../services/profileService.js";
import poetBiographyService from "../services/poetBiographyService.js";
import poetryCollectionService from "../services/poetryCollectionService.js";
import openaiService from "../services/openaiService.js";
import rekhtaService from "../services/rekhtaService.js";
import { auth } from "../middleware/auth.js";

// ============================
// AI MULTI-MODAL SEARCH ROUTES
// ============================

// Multi-modal search endpoint
router.post("/search/multimodal", async (req, res) => {
  try {
    const result = await searchService.multiModalSearch(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Multi-modal search failed",
      details: error.message,
    });
  }
});

// Advanced search
router.post("/search/advanced", async (req, res) => {
  try {
    const result = await searchService.advancedSearch(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Advanced search failed",
      details: error.message,
    });
  }
});

// Voice search
router.post("/search/voice", async (req, res) => {
  try {
    const result = await searchService.voiceSearch(
      req.body.transcription,
      req.body.filters || {},
      req.body.limit || 20,
      req.body.page || 1
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Voice search failed",
      details: error.message,
    });
  }
});

// Image search (OCR)
router.post("/search/image", async (req, res) => {
  try {
    const result = await searchService.imageSearch(
      req.body.extractedText,
      req.body.filters || {},
      req.body.limit || 20,
      req.body.page || 1
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Image search failed",
      details: error.message,
    });
  }
});

// Semantic search with AI
router.post("/search/semantic", async (req, res) => {
  try {
    const result = await searchService.semanticSearch(
      req.body.query,
      req.body.filters || {},
      req.body.limit || 20,
      req.body.page || 1
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Semantic search failed",
      details: error.message,
    });
  }
});

// Get search suggestions
router.get("/search/suggestions", async (req, res) => {
  try {
    const result = await searchService.getSearchSuggestions(
      req.query.query,
      req.query.limit || 10
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get suggestions",
      details: error.message,
    });
  }
});

// Get popular searches
router.get("/search/popular", async (req, res) => {
  try {
    const result = await searchService.getPopularSearches(
      req.query.limit || 10
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get popular searches",
      details: error.message,
    });
  }
});

// AI search enhancement
router.post("/search/enhance", async (req, res) => {
  try {
    const result = await openaiService.enhanceSearchQuery(req.body.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Search enhancement failed",
      details: error.message,
    });
  }
});

// ============================
// PROFILE MANAGEMENT ROUTES
// ============================

// Get user profile
router.get("/profile/:userId", async (req, res) => {
  try {
    const result = await profileService.getUserProfile(
      req.params.userId,
      req.user?.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get profile",
      details: error.message,
    });
  }
});

// Update user profile (protected)
router.put("/profile/:userId", auth, async (req, res) => {
  try {
    // Check if user is updating their own profile or has admin rights
    if (
      req.params.userId !== req.user.id &&
      !["admin", "moderator"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this profile",
      });
    }

    const result = await profileService.updateUserProfile(
      req.params.userId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
      details: error.message,
    });
  }
});

// Upload profile image (protected)
router.post("/profile/:userId/image", auth, async (req, res) => {
  try {
    if (
      req.params.userId !== req.user.id &&
      !["admin", "moderator"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this profile image",
      });
    }

    const result = await profileService.updateProfileImage(
      req.params.userId,
      req.body.image
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update profile image",
      details: error.message,
    });
  }
});

// Follow/Unfollow user (protected)
router.post("/profile/:userId/follow", auth, async (req, res) => {
  try {
    const result = await profileService.toggleFollow(
      req.user.id,
      req.params.userId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to toggle follow",
      details: error.message,
    });
  }
});

// Get user dashboard (protected)
router.get("/profile/:userId/dashboard", auth, async (req, res) => {
  try {
    if (
      req.params.userId !== req.user.id &&
      !["admin", "moderator"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this dashboard",
      });
    }

    const result = await profileService.getUserDashboard(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get dashboard",
      details: error.message,
    });
  }
});

// Search users
router.get("/profiles/search", async (req, res) => {
  try {
    const result = await profileService.searchUsers(
      req.query.query,
      {
        role: req.query.role,
        location: req.query.location,
        sortBy: req.query.sortBy,
      },
      req.query.limit || 20,
      req.query.page || 1
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to search users",
      details: error.message,
    });
  }
});

// ============================
// POET BIOGRAPHIES ROUTES
// ============================

// Create poet biography (protected - admin/moderator only)
router.post("/poets/biography", auth, async (req, res) => {
  try {
    if (!["admin", "moderator"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to create poet biographies",
      });
    }

    const result = await poetBiographyService.createPoetBiography(
      req.body,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to create poet biography",
      details: error.message,
    });
  }
});

// Get poet biography
router.get("/poets/biography/:identifier", async (req, res) => {
  try {
    const result = await poetBiographyService.getPoetBiography(
      req.params.identifier,
      req.query.includePoems === "true"
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get poet biography",
      details: error.message,
    });
  }
});

// Update poet biography (protected - admin/moderator only)
router.put("/poets/biography/:poetId", auth, async (req, res) => {
  try {
    if (!["admin", "moderator"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update poet biographies",
      });
    }

    const result = await poetBiographyService.updatePoetBiography(
      req.params.poetId,
      req.body,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update poet biography",
      details: error.message,
    });
  }
});

// Search poets
router.get("/poets/search", async (req, res) => {
  try {
    const searchParams = {
      query: req.query.query,
      era: req.query.era,
      category: req.query.category,
      language: req.query.language,
      birthYear:
        req.query.birthYearStart && req.query.birthYearEnd
          ? {
              start: parseInt(req.query.birthYearStart),
              end: parseInt(req.query.birthYearEnd),
            }
          : null,
      deathYear:
        req.query.deathYearStart && req.query.deathYearEnd
          ? {
              start: parseInt(req.query.deathYearStart),
              end: parseInt(req.query.deathYearEnd),
            }
          : null,
      importance: req.query.importance,
      genres: req.query.genres ? req.query.genres.split(",") : null,
      sortBy: req.query.sortBy || "relevance",
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1,
    };

    const result = await poetBiographyService.searchPoets(searchParams);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to search poets",
      details: error.message,
    });
  }
});

// Get poets by era
router.get("/poets/era/:era", async (req, res) => {
  try {
    const result = await poetBiographyService.getPoetsByEra(
      req.params.era,
      req.query.limit || 20
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get poets by era",
      details: error.message,
    });
  }
});

// Get featured poets
router.get("/poets/featured", async (req, res) => {
  try {
    const result = await poetBiographyService.getFeaturedPoets(
      req.query.limit || 10
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get featured poets",
      details: error.message,
    });
  }
});

// ============================
// POETRY COLLECTION ROUTES
// ============================

// Create poem (protected)
router.post("/poems", auth, async (req, res) => {
  try {
    const result = await poetryCollectionService.createPoem(
      req.body,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to create poem",
      details: error.message,
    });
  }
});

// Get poem by ID
router.get("/poems/:poemId", async (req, res) => {
  try {
    const result = await poetryCollectionService.getPoemById(
      req.params.poemId,
      req.user?.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get poem",
      details: error.message,
    });
  }
});

// Update poem (protected)
router.put("/poems/:poemId", auth, async (req, res) => {
  try {
    const result = await poetryCollectionService.updatePoem(
      req.params.poemId,
      req.body,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update poem",
      details: error.message,
    });
  }
});

// Delete poem (protected)
router.delete("/poems/:poemId", auth, async (req, res) => {
  try {
    const result = await poetryCollectionService.deletePoem(
      req.params.poemId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete poem",
      details: error.message,
    });
  }
});

// Get poems with filters
router.get("/poems", async (req, res) => {
  try {
    const filters = {
      author: req.query.author,
      poet: req.query.poet,
      genre: req.query.genre,
      theme: req.query.theme,
      language: req.query.language,
      mood: req.query.mood,
      tags: req.query.tags ? req.query.tags.split(",") : null,
      dateRange:
        req.query.startDate && req.query.endDate
          ? {
              start: req.query.startDate,
              end: req.query.endDate,
            }
          : null,
      rating: req.query.minRating
        ? {
            min: parseFloat(req.query.minRating),
          }
        : null,
      sortBy: req.query.sortBy,
      status: req.query.status || "published",
    };

    const result = await poetryCollectionService.getPoems(
      filters,
      parseInt(req.query.page) || 1,
      parseInt(req.query.limit) || 20
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get poems",
      details: error.message,
    });
  }
});

// Rate poem (protected)
router.post("/poems/:poemId/rate", auth, async (req, res) => {
  try {
    const result = await poetryCollectionService.ratePoem(
      req.params.poemId,
      req.user.id,
      req.body.rating
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to rate poem",
      details: error.message,
    });
  }
});

// Like/Unlike poem (protected)
router.post("/poems/:poemId/like", auth, async (req, res) => {
  try {
    const result = await poetryCollectionService.toggleLike(
      req.params.poemId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to toggle like",
      details: error.message,
    });
  }
});

// Add comment to poem (protected)
router.post("/poems/:poemId/comment", auth, async (req, res) => {
  try {
    const result = await poetryCollectionService.addComment(
      req.params.poemId,
      req.user.id,
      req.body.text,
      req.body.rating
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to add comment",
      details: error.message,
    });
  }
});

// Get similar poems
router.get("/poems/:poemId/similar", async (req, res) => {
  try {
    const result = await poetryCollectionService.getSimilarPoems(
      req.params.poemId,
      req.query.limit || 5
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get similar poems",
      details: error.message,
    });
  }
});

// Get trending poems
router.get("/poems/trending/:timeframe", async (req, res) => {
  try {
    const result = await poetryCollectionService.getTrendingPoems(
      req.params.timeframe,
      req.query.limit || 10
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get trending poems",
      details: error.message,
    });
  }
});

// Import poem from external source (protected)
router.post("/poems/import/:source/:poemId", auth, async (req, res) => {
  try {
    const result = await poetryCollectionService.importExternalPoem(
      req.params.source,
      req.params.poemId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to import poem",
      details: error.message,
    });
  }
});

// ============================
// EXTERNAL API INTEGRATION ROUTES
// ============================

// Rekhta API - Search poems
router.get("/external/rekhta/search", async (req, res) => {
  try {
    const result = await rekhtaService.searchPoems(
      req.query.query,
      req.query.type || "poem"
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Rekhta search failed",
      details: error.message,
    });
  }
});

// Rekhta API - Get poet details
router.get("/external/rekhta/poet/:poetSlug", async (req, res) => {
  try {
    const result = await rekhtaService.getPoetDetails(req.params.poetSlug);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get Rekhta poet details",
      details: error.message,
    });
  }
});

// Rekhta API - Get poem details
router.get("/external/rekhta/poem/:poemId", async (req, res) => {
  try {
    const result = await rekhtaService.getPoemDetails(req.params.poemId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get Rekhta poem details",
      details: error.message,
    });
  }
});

// OpenAI API - Get poetry recommendations
router.post("/ai/recommendations", async (req, res) => {
  try {
    const result = await openaiService.getPoetryRecommendations(
      req.body.query,
      req.body.options || {}
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "AI recommendations failed",
      details: error.message,
    });
  }
});

// OpenAI API - Analyze poetry tone
router.post("/ai/analyze", async (req, res) => {
  try {
    const result = await openaiService.analyzePoetryTone(req.body.content);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "AI analysis failed",
      details: error.message,
    });
  }
});

// OpenAI API - Translate poetry
router.post("/ai/translate", async (req, res) => {
  try {
    const result = await openaiService.translatePoetry(
      req.body.content,
      req.body.targetLanguage || "english"
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "AI translation failed",
      details: error.message,
    });
  }
});

// ============================
// ANALYTICS AND STATISTICS ROUTES
// ============================

// Get platform statistics
router.get("/analytics/stats", async (req, res) => {
  try {
    const searchStats = searchService.getSearchStats();
    const profileStats = profileService.getCacheStats();
    const poetryStats = poetryCollectionService.getCacheStats();

    res.json({
      success: true,
      data: {
        search: searchStats,
        profiles: profileStats,
        poetry: poetryStats,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get analytics",
      details: error.message,
    });
  }
});

// Clear all caches (admin only)
router.post("/analytics/clear-cache", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
      });
    }

    searchService.clearCache();
    profileService.clearCache();
    poetBiographyService.clearCache();
    poetryCollectionService.clearCache();

    res.json({
      success: true,
      message: "All caches cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to clear caches",
      details: error.message,
    });
  }
});

export default router;
