const PoetBiography = require("../models/PoetBiography");
const Poem = require("../models/Poem");
const rekhtaService = require("./rekhtaService");
const openaiService = require("./openaiService");
const mongoose = require("mongoose");

class PoetBiographyService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 30; // 30 minutes cache
  }

  // Cache management
  getCacheKey(type, params) {
    return `${type}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Create comprehensive poet biography
  async createPoetBiography(poetData, userId) {
    try {
      // Generate slug from name
      const slug = poetData.name
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, "-");

      // Check if poet already exists
      const existingPoet = await PoetBiography.findOne({
        $or: [
          { slug },
          { name: poetData.name },
          { nameInUrdu: poetData.nameInUrdu },
        ],
      });

      if (existingPoet) {
        return {
          success: false,
          error: "Poet biography already exists",
          existingPoet: existingPoet._id,
        };
      }

      // Create new poet biography
      const poetBiography = new PoetBiography({
        ...poetData,
        slug,
        createdBy: userId,
        lastUpdatedBy: userId,
        status: "pending",
        searchKeywords: this.generateSearchKeywords(poetData),
        tags: this.generateTags(poetData),
      });

      const savedPoet = await poetBiography.save();

      // Try to enrich with external data
      this.enrichWithExternalData(savedPoet._id);

      return {
        success: true,
        data: savedPoet,
        message: "Poet biography created successfully",
      };
    } catch (error) {
      console.error("Create poet biography error:", error);
      return {
        success: false,
        error: "Failed to create poet biography",
        details: error.message,
      };
    }
  }

  // Get poet biography by ID or slug
  async getPoetBiography(identifier, includePoems = true) {
    try {
      const cacheKey = this.getCacheKey("biography", {
        identifier,
        includePoems,
      });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Find by ID or slug
      const query = mongoose.Types.ObjectId.isValid(identifier)
        ? { _id: identifier }
        : { slug: identifier };

      const poet = await PoetBiography.findOne(query)
        .populate("createdBy", "name username")
        .populate("lastUpdatedBy", "name username")
        .populate("verifiedBy", "name username")
        .lean();

      if (!poet) {
        return {
          success: false,
          error: "Poet biography not found",
        };
      }

      let enrichedData = { ...poet };

      // Include related poems if requested
      if (includePoems) {
        const poems = await this.getPoetPoems(poet._id);
        enrichedData.poems = poems.data || [];
        enrichedData.poemStats = this.calculatePoemStats(poems.data || []);
      }

      // Get related poets
      enrichedData.relatedPoets = await this.getRelatedPoets(poet._id);

      // Get contemporary poets
      enrichedData.contemporaries = await this.getContemporaryPoets(poet);

      // Generate timeline
      enrichedData.timeline = this.generateTimeline(poet);

      // Calculate influence score
      enrichedData.influenceScore = await this.calculateInfluenceScore(poet);

      const result = {
        success: true,
        data: enrichedData,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Get poet biography error:", error);
      return {
        success: false,
        error: "Failed to get poet biography",
        details: error.message,
      };
    }
  }

  // Update poet biography
  async updatePoetBiography(poetId, updateData, userId) {
    try {
      const poet = await PoetBiography.findById(poetId);
      if (!poet) {
        return {
          success: false,
          error: "Poet biography not found",
        };
      }

      // Update fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          poet[key] = updateData[key];
        }
      });

      poet.lastUpdatedBy = userId;
      poet.updatedAt = new Date();

      // Regenerate search keywords and tags
      poet.searchKeywords = this.generateSearchKeywords(poet);
      poet.tags = this.generateTags(poet);

      const updatedPoet = await poet.save();

      // Clear cache
      this.clearCacheForPoet(poetId);

      return {
        success: true,
        data: updatedPoet,
        message: "Poet biography updated successfully",
      };
    } catch (error) {
      console.error("Update poet biography error:", error);
      return {
        success: false,
        error: "Failed to update poet biography",
        details: error.message,
      };
    }
  }

  // Search poet biographies
  async searchPoets(searchParams) {
    try {
      const {
        query,
        era,
        category,
        language,
        birthYear,
        deathYear,
        importance,
        genres,
        sortBy = "relevance",
        limit = 20,
        page = 1,
      } = searchParams;

      const cacheKey = this.getCacheKey("search", searchParams);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      let searchQuery = { status: "verified" };
      const skip = (page - 1) * limit;

      // Text search
      if (query && query.trim()) {
        searchQuery.$or = [
          { name: { $regex: query, $options: "i" } },
          { nameInUrdu: { $regex: query, $options: "i" } },
          { nameInEnglish: { $regex: query, $options: "i" } },
          { fullName: { $regex: query, $options: "i" } },
          { aliases: { $in: [new RegExp(query, "i")] } },
          { tags: { $in: [new RegExp(query, "i")] } },
          { searchKeywords: { $in: [new RegExp(query, "i")] } },
        ];
      }

      // Era filter
      if (era) {
        searchQuery["era.name"] = { $regex: era, $options: "i" };
      }

      // Category filter
      if (category) {
        searchQuery.category = category;
      }

      // Language filter
      if (language) {
        searchQuery["languages.language"] = { $regex: language, $options: "i" };
      }

      // Birth year range
      if (birthYear) {
        if (birthYear.start && birthYear.end) {
          searchQuery["birthDate.year"] = {
            $gte: birthYear.start,
            $lte: birthYear.end,
          };
        } else if (birthYear.start) {
          searchQuery["birthDate.year"] = { $gte: birthYear.start };
        } else if (birthYear.end) {
          searchQuery["birthDate.year"] = { $lte: birthYear.end };
        }
      }

      // Death year range
      if (deathYear) {
        if (deathYear.start && deathYear.end) {
          searchQuery["deathDate.year"] = {
            $gte: deathYear.start,
            $lte: deathYear.end,
          };
        } else if (deathYear.start) {
          searchQuery["deathDate.year"] = { $gte: deathYear.start };
        } else if (deathYear.end) {
          searchQuery["deathDate.year"] = { $lte: deathYear.end };
        }
      }

      // Importance filter
      if (importance) {
        searchQuery.importance = importance;
      }

      // Genres filter
      if (genres && genres.length > 0) {
        searchQuery["genres.name"] = {
          $in: genres.map((g) => new RegExp(g, "i")),
        };
      }

      // Sort options
      let sortOptions = {};
      switch (sortBy) {
        case "name":
          sortOptions = { name: 1 };
          break;
        case "birthYear":
          sortOptions = { "birthDate.year": 1 };
          break;
        case "deathYear":
          sortOptions = { "deathDate.year": -1 };
          break;
        case "importance":
          sortOptions = { importance: 1, "statistics.influenceScore": -1 };
          break;
        case "popularity":
          sortOptions = {
            "statistics.totalViews": -1,
            "statistics.totalLikes": -1,
          };
          break;
        default:
          sortOptions = {
            "statistics.influenceScore": -1,
            "statistics.totalViews": -1,
          };
      }

      const poets = await PoetBiography.find(searchQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select(
          "name nameInUrdu nameInEnglish birthDate deathDate era category importance images statistics slug"
        )
        .lean();

      const totalCount = await PoetBiography.countDocuments(searchQuery);

      const result = {
        success: true,
        data: {
          poets,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNext: skip + poets.length < totalCount,
            hasPrev: page > 1,
          },
        },
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Search poets error:", error);
      return {
        success: false,
        error: "Failed to search poets",
        details: error.message,
      };
    }
  }

  // Get poets by era
  async getPoetsByEra(era, limit = 20) {
    try {
      const cacheKey = this.getCacheKey("era", { era, limit });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const poets = await PoetBiography.find({
        "era.name": { $regex: era, $options: "i" },
        status: "verified",
      })
        .sort({ "statistics.influenceScore": -1, "birthDate.year": 1 })
        .limit(limit)
        .select(
          "name nameInUrdu nameInEnglish birthDate deathDate importance images statistics slug"
        )
        .lean();

      const result = {
        success: true,
        data: poets,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Get poets by era error:", error);
      return {
        success: false,
        error: "Failed to get poets by era",
        details: error.message,
      };
    }
  }

  // Get featured poets
  async getFeaturedPoets(limit = 10) {
    try {
      const cacheKey = this.getCacheKey("featured", { limit });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const poets = await PoetBiography.find({
        status: "verified",
        importance: { $in: ["legendary", "major"] },
      })
        .sort({ "statistics.influenceScore": -1, "statistics.totalViews": -1 })
        .limit(limit)
        .select(
          "name nameInUrdu nameInEnglish birthDate deathDate era importance images statistics slug"
        )
        .lean();

      const result = {
        success: true,
        data: poets,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Get featured poets error:", error);
      return {
        success: false,
        error: "Failed to get featured poets",
        details: error.message,
      };
    }
  }

  // Get poet's poems from database
  async getPoetPoems(poetId, limit = 50) {
    try {
      const poems = await Poem.find({
        poet: poetId,
        status: "published",
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("author", "name username")
        .lean();

      return {
        success: true,
        data: poems,
      };
    } catch (error) {
      console.error("Get poet poems error:", error);
      return {
        success: false,
        error: "Failed to get poet poems",
        details: error.message,
      };
    }
  }

  // Get related poets (same era, genre, etc.)
  async getRelatedPoets(poetId, limit = 5) {
    try {
      const poet = await PoetBiography.findById(poetId);
      if (!poet) return [];

      const relatedPoets = await PoetBiography.find({
        _id: { $ne: poetId },
        status: "verified",
        $or: [
          { "era.name": poet.era?.name },
          { category: poet.category },
          { "genres.name": { $in: poet.genres.map((g) => g.name) } },
          {
            "languages.language": {
              $in: poet.languages.map((l) => l.language),
            },
          },
        ],
      })
        .sort({ "statistics.influenceScore": -1 })
        .limit(limit)
        .select("name nameInUrdu images slug importance")
        .lean();

      return relatedPoets;
    } catch (error) {
      console.error("Get related poets error:", error);
      return [];
    }
  }

  // Get contemporary poets
  async getContemporaryPoets(poet, limit = 5) {
    try {
      if (!poet.birthDate?.year) return [];

      const birthYear = poet.birthDate.year;
      const deathYear = poet.deathDate?.year || new Date().getFullYear();

      const contemporaries = await PoetBiography.find({
        _id: { $ne: poet._id },
        status: "verified",
        $or: [
          {
            "birthDate.year": { $gte: birthYear - 50, $lte: birthYear + 50 },
          },
          {
            "deathDate.year": { $gte: birthYear, $lte: deathYear },
          },
        ],
      })
        .sort({ "statistics.influenceScore": -1 })
        .limit(limit)
        .select("name nameInUrdu birthDate deathDate images slug importance")
        .lean();

      return contemporaries;
    } catch (error) {
      console.error("Get contemporary poets error:", error);
      return [];
    }
  }

  // Generate timeline of poet's life
  generateTimeline(poet) {
    const timeline = [];

    // Birth
    if (poet.birthDate?.year) {
      timeline.push({
        year: poet.birthDate.year,
        event: `ولادت${
          poet.birthPlace?.city ? ` - ${poet.birthPlace.city}` : ""
        }`,
        type: "birth",
        importance: "high",
      });
    }

    // Education
    poet.education?.forEach((edu) => {
      if (edu.period) {
        const yearMatch = edu.period.match(/\d{4}/);
        if (yearMatch) {
          timeline.push({
            year: parseInt(yearMatch[0]),
            event: `تعلیم - ${edu.institution}`,
            type: "education",
            importance: "medium",
            details: edu.field,
          });
        }
      }
    });

    // Career
    poet.profession?.forEach((prof) => {
      if (prof.period) {
        const yearMatch = prof.period.match(/\d{4}/);
        if (yearMatch) {
          timeline.push({
            year: parseInt(yearMatch[0]),
            event: `ملازمت - ${prof.title}`,
            type: "career",
            importance: "medium",
            details: prof.employer,
          });
        }
      }
    });

    // Notable works
    poet.notableWorks?.forEach((work) => {
      if (work.yearWritten || work.yearPublished) {
        timeline.push({
          year: work.yearWritten || work.yearPublished,
          event: `تصنیف - ${work.title}`,
          type: "work",
          importance: "high",
          details: work.description,
        });
      }
    });

    // Historical events
    poet.historicalEvents?.forEach((event) => {
      if (event.year) {
        timeline.push({
          year: event.year,
          event: event.event,
          type: "historical",
          importance: "low",
          details: event.impact,
        });
      }
    });

    // Death
    if (poet.deathDate?.year) {
      timeline.push({
        year: poet.deathDate.year,
        event: `وفات${
          poet.deathPlace?.city ? ` - ${poet.deathPlace.city}` : ""
        }`,
        type: "death",
        importance: "high",
      });
    }

    // Sort by year
    return timeline.sort((a, b) => a.year - b.year);
  }

  // Calculate influence score
  async calculateInfluenceScore(poet) {
    try {
      let score = 0;

      // Base importance score
      const importanceScores = {
        legendary: 100,
        major: 80,
        notable: 60,
        minor: 40,
        regional: 20,
      };
      score += importanceScores[poet.importance] || 50;

      // Number of works
      score += Math.min(poet.notableWorks?.length * 5, 50);

      // Students and influenced poets
      score += Math.min(poet.students?.length * 3, 30);
      score += Math.min(poet.influenced?.length * 4, 40);

      // Modern recognition
      score += Math.min(poet.modernRecognition?.length * 5, 25);
      score += Math.min(poet.awards?.length * 7, 35);

      // Statistical metrics
      score += Math.min(poet.statistics?.totalViews / 100, 20);
      score += Math.min(poet.statistics?.totalLikes / 10, 15);
      score += poet.statistics?.averageRating * 4;

      // Era bonus (classical poets get bonus)
      if (poet.deathDate?.year && poet.deathDate.year < 1900) {
        score += 20;
      }

      // Genre mastery
      const masterGenres =
        poet.genres?.filter((g) => g.expertise === "master").length || 0;
      score += masterGenres * 10;

      // Language proficiency
      const nativeLanguages =
        poet.languages?.filter(
          (l) => l.proficiency === "native" || l.proficiency === "master"
        ).length || 0;
      score += nativeLanguages * 5;

      return Math.min(Math.round(score), 500); // Cap at 500
    } catch (error) {
      console.error("Calculate influence score error:", error);
      return 0;
    }
  }

  // Calculate poem statistics
  calculatePoemStats(poems) {
    if (!poems || poems.length === 0) {
      return {
        totalPoems: 0,
        totalViews: 0,
        totalLikes: 0,
        averageRating: 0,
        genreDistribution: [],
        popularPoems: [],
      };
    }

    const stats = {
      totalPoems: poems.length,
      totalViews: poems.reduce((sum, poem) => sum + (poem.viewCount || 0), 0),
      totalLikes: poems.reduce((sum, poem) => sum + (poem.likesCount || 0), 0),
      averageRating:
        poems.reduce((sum, poem) => sum + (poem.averageRating || 0), 0) /
        poems.length,
    };

    // Genre distribution
    const genreCounts = {};
    poems.forEach((poem) => {
      if (poem.genre) {
        genreCounts[poem.genre] = (genreCounts[poem.genre] || 0) + 1;
      }
    });
    stats.genreDistribution = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);

    // Popular poems
    stats.popularPoems = poems
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5)
      .map((poem) => ({
        title: poem.title,
        viewCount: poem.viewCount,
        likesCount: poem.likesCount,
        averageRating: poem.averageRating,
      }));

    return stats;
  }

  // Generate search keywords
  generateSearchKeywords(poet) {
    const keywords = [
      poet.name,
      poet.nameInUrdu,
      poet.nameInEnglish,
      poet.fullName,
      ...(poet.aliases || []),
      poet.birthPlace?.city,
      poet.birthPlace?.region,
      poet.era?.name,
      poet.category,
      ...(poet.genres?.map((g) => g.name) || []),
      ...(poet.languages?.map((l) => l.language) || []),
    ].filter(Boolean);

    return [...new Set(keywords.map((k) => k.toLowerCase()))];
  }

  // Generate tags
  generateTags(poet) {
    const tags = [
      poet.era?.name,
      poet.category,
      poet.importance,
      ...(poet.genres?.map((g) => g.name) || []),
      ...(poet.languages?.map((l) => l.language) || []),
      poet.birthPlace?.city,
      poet.birthPlace?.country,
      ...(poet.tags || []),
    ].filter(Boolean);

    return [...new Set(tags.map((t) => t.toLowerCase()))];
  }

  // Enrich poet data with external sources
  async enrichWithExternalData(poetId) {
    try {
      const poet = await PoetBiography.findById(poetId);
      if (!poet) return;

      // Try to get data from Rekhta
      const rekhtaData = await rekhtaService.searchPoets(poet.name);
      if (rekhtaData.success && rekhtaData.data?.poets?.length > 0) {
        const rekhtaPoet = rekhtaData.data.poets[0];

        // Merge Rekhta data
        const updates = {};
        if (rekhtaPoet.biography && !poet.biography) {
          updates.biography = rekhtaPoet.biography;
        }
        if (rekhtaPoet.birthYear && !poet.birthDate?.year) {
          updates["birthDate.year"] = parseInt(rekhtaPoet.birthYear);
        }
        if (rekhtaPoet.deathYear && !poet.deathDate?.year) {
          updates["deathDate.year"] = parseInt(rekhtaPoet.deathYear);
        }

        if (Object.keys(updates).length > 0) {
          await PoetBiography.findByIdAndUpdate(poetId, updates);
        }
      }
    } catch (error) {
      console.error("Enrich external data error:", error);
    }
  }

  // Clear cache for specific poet
  clearCacheForPoet(poetId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(poetId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // Clear all cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

module.exports = new PoetBiographyService();
