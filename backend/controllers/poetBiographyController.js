import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import PoetBiography from "../models/PoetBiography.js";
import mongoose from "mongoose";

/**
 * Poet Biography Controller for Bazm-E-Sukhan Platform
 * Handles classical and modern poet biographies, their works, and related information
 */

class PoetBiographyController {
  // ============= POET BIOGRAPHY MANAGEMENT =============

  /**
   * Get all poet biographies with pagination and filtering
   */
  static async getAllPoetBiographies(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        era,
        style,
        language,
        search,
        sortBy = "name",
        sortOrder = "asc",
        featured = false,
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query = { status: "published" };

      if (era && era !== "all") {
        query.era = era;
      }

      if (style && style !== "all") {
        query.poetryStyle = { $in: [style] };
      }

      if (language && language !== "all") {
        query.languages = { $in: [language] };
      }

      if (featured === "true") {
        query.featured = true;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { urduName: { $regex: search, $options: "i" } },
          { biography: { $regex: search, $options: "i" } },
          { famousWorks: { $regex: search, $options: "i" } },
        ];
      }

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const biographies = await PoetBiography.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalBiographies = await PoetBiography.countDocuments(query);

      res.json({
        success: true,
        biographies,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalBiographies / limitNum),
          totalBiographies,
          hasNext: pageNum < Math.ceil(totalBiographies / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching poet biographies:", error);
      res.status(500).json({
        success: false,
        message: "شعراء کی سوانح حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get single poet biography by ID
   */
  static async getPoetBiographyById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعر ID",
        });
      }

      const biography = await PoetBiography.findById(id);

      if (!biography) {
        return res.status(404).json({
          success: false,
          message: "شاعر کی سوانح موجود نہیں",
        });
      }

      // Get related poems if poet exists in poems collection
      const relatedPoems = await Poem.find({
        $or: [
          { "poet.name": biography.name },
          { "poet.urduName": biography.urduName },
          { author: biography.name },
        ],
        status: "published",
      })
        .select("title content category views averageRating")
        .limit(10);

      // Increment view count
      await PoetBiography.findByIdAndUpdate(id, { $inc: { views: 1 } });

      res.json({
        success: true,
        biography,
        relatedPoems,
      });
    } catch (error) {
      console.error("Error fetching poet biography:", error);
      res.status(500).json({
        success: false,
        message: "شاعر کی سوانح حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Create new poet biography (Admin/Moderator only)
   */
  static async createPoetBiography(req, res) {
    try {
      const {
        name,
        urduName,
        penName,
        biography,
        birthDate,
        deathDate,
        birthPlace,
        era,
        poetryStyle,
        languages,
        famousWorks,
        influences,
        achievements,
        personalLife,
        literaryStyle,
        themes,
        quotes,
        references,
        featured = false,
      } = req.body;

      // Check if poet already exists
      const existingPoet = await PoetBiography.findOne({
        $or: [{ name: name }, { urduName: urduName }, { penName: penName }],
      });

      if (existingPoet) {
        return res.status(400).json({
          success: false,
          message: "یہ شاعر پہلے سے موجود ہے",
        });
      }

      const poetBiography = new PoetBiography({
        name: name.trim(),
        urduName: urduName?.trim(),
        penName: penName?.trim(),
        biography: biography.trim(),
        birthDate: birthDate ? new Date(birthDate) : null,
        deathDate: deathDate ? new Date(deathDate) : null,
        birthPlace: birthPlace?.trim(),
        era,
        poetryStyle: poetryStyle || [],
        languages: languages || ["urdu"],
        famousWorks: famousWorks || [],
        influences: influences || [],
        achievements: achievements || [],
        personalLife: personalLife?.trim(),
        literaryStyle: literaryStyle?.trim(),
        themes: themes || [],
        quotes: quotes || [],
        references: references || [],
        featured,
        addedBy: req.user.id,
        status: "published",
      });

      // Handle image upload if present
      if (req.file) {
        poetBiography.profileImage = {
          url: req.file.path,
          publicId: req.file.filename,
          caption: `${name} کی تصویر`,
        };
      }

      await poetBiography.save();

      res.status(201).json({
        success: true,
        message: "شاعر کی سوانح کامیابی سے شامل ہوئی",
        biography: poetBiography,
      });
    } catch (error) {
      console.error("Error creating poet biography:", error);
      res.status(500).json({
        success: false,
        message: "شاعر کی سوانح شامل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update poet biography (Admin/Moderator only)
   */
  static async updatePoetBiography(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعر ID",
        });
      }

      const biography = await PoetBiography.findById(id);

      if (!biography) {
        return res.status(404).json({
          success: false,
          message: "شاعر کی سوانح موجود نہیں",
        });
      }

      // Update fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          biography[key] = updateData[key];
        }
      });

      // Handle new image upload
      if (req.file) {
        biography.profileImage = {
          url: req.file.path,
          publicId: req.file.filename,
          caption: `${biography.name} کی تصویر`,
        };
      }

      biography.updatedAt = new Date();
      await biography.save();

      res.json({
        success: true,
        message: "شاعر کی سوانح کامیابی سے اپ ڈیٹ ہوئی",
        biography,
      });
    } catch (error) {
      console.error("Error updating poet biography:", error);
      res.status(500).json({
        success: false,
        message: "شاعر کی سوانح اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Delete poet biography (Admin only)
   */
  static async deletePoetBiography(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "غلط شاعر ID",
        });
      }

      const biography = await PoetBiography.findByIdAndDelete(id);

      if (!biography) {
        return res.status(404).json({
          success: false,
          message: "شاعر کی سوانح موجود نہیں",
        });
      }

      res.json({
        success: true,
        message: "شاعر کی سوانح ڈیلیٹ ہو گئی",
      });
    } catch (error) {
      console.error("Error deleting poet biography:", error);
      res.status(500).json({
        success: false,
        message: "شاعر کی سوانح ڈیلیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= FEATURED POETS =============

  /**
   * Get featured poets
   */
  static async getFeaturedPoets(req, res) {
    try {
      const { limit = 6 } = req.query;

      const featuredPoets = await PoetBiography.find({
        featured: true,
        status: "published",
      })
        .sort({ views: -1, updatedAt: -1 })
        .limit(parseInt(limit))
        .select("name urduName penName biography profileImage era poetryStyle");

      res.json({
        success: true,
        featuredPoets,
      });
    } catch (error) {
      console.error("Error fetching featured poets:", error);
      res.status(500).json({
        success: false,
        message: "نمایاں شعراء حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get poets by era
   */
  static async getPoetsByEra(req, res) {
    try {
      const { era } = req.params;
      const { page = 1, limit = 12 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const poets = await PoetBiography.find({
        era: era,
        status: "published",
      })
        .sort({ views: -1, name: 1 })
        .skip(skip)
        .limit(limitNum)
        .select(
          "name urduName penName biography profileImage poetryStyle languages"
        );

      const totalPoets = await PoetBiography.countDocuments({
        era: era,
        status: "published",
      });

      res.json({
        success: true,
        poets,
        era,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalPoets / limitNum),
          totalPoets,
          hasNext: pageNum < Math.ceil(totalPoets / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching poets by era:", error);
      res.status(500).json({
        success: false,
        message: "دور کے شعراء حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= SEARCH & FILTERING =============

  /**
   * Search poets
   */
  static async searchPoets(req, res) {
    try {
      const { query, era, style, language, limit = 20 } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "تلاش کے لیے کلیدی الفاظ درکار ہیں",
        });
      }

      let searchQuery = {
        status: "published",
        $or: [
          { name: { $regex: query, $options: "i" } },
          { urduName: { $regex: query, $options: "i" } },
          { penName: { $regex: query, $options: "i" } },
          { biography: { $regex: query, $options: "i" } },
          { famousWorks: { $regex: query, $options: "i" } },
          { themes: { $regex: query, $options: "i" } },
        ],
      };

      // Add filters
      if (era && era !== "all") {
        searchQuery.era = era;
      }

      if (style && style !== "all") {
        searchQuery.poetryStyle = { $in: [style] };
      }

      if (language && language !== "all") {
        searchQuery.languages = { $in: [language] };
      }

      const poets = await PoetBiography.find(searchQuery)
        .sort({ views: -1, name: 1 })
        .limit(parseInt(limit))
        .select(
          "name urduName penName biography profileImage era poetryStyle languages"
        );

      res.json({
        success: true,
        poets,
        query,
        totalResults: poets.length,
      });
    } catch (error) {
      console.error("Error searching poets:", error);
      res.status(500).json({
        success: false,
        message: "شعراء کی تلاش میں خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= STATISTICS & ANALYTICS =============

  /**
   * Get poet biography statistics
   */
  static async getStatistics(req, res) {
    try {
      // Get era distribution
      const eraDistribution = await PoetBiography.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$era", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get style distribution
      const styleDistribution = await PoetBiography.aggregate([
        { $match: { status: "published" } },
        { $unwind: "$poetryStyle" },
        { $group: { _id: "$poetryStyle", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get language distribution
      const languageDistribution = await PoetBiography.aggregate([
        { $match: { status: "published" } },
        { $unwind: "$languages" },
        { $group: { _id: "$languages", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get total counts
      const [totalPoets, featuredPoets, totalViews] = await Promise.all([
        PoetBiography.countDocuments({ status: "published" }),
        PoetBiography.countDocuments({ status: "published", featured: true }),
        PoetBiography.aggregate([
          { $match: { status: "published" } },
          { $group: { _id: null, totalViews: { $sum: "$views" } } },
        ]),
      ]);

      const statistics = {
        overview: {
          totalPoets,
          featuredPoets,
          totalViews: totalViews[0]?.totalViews || 0,
        },
        distributions: {
          byEra: eraDistribution,
          byStyle: styleDistribution,
          byLanguage: languageDistribution,
        },
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({
        success: false,
        message: "اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get most viewed poets
   */
  static async getMostViewedPoets(req, res) {
    try {
      const { limit = 10, timeframe = "all" } = req.query;

      let query = { status: "published" };

      // Add timeframe filter if needed
      if (timeframe !== "all") {
        let startDate = new Date();
        switch (timeframe) {
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
        query.updatedAt = { $gte: startDate };
      }

      const poets = await PoetBiography.find(query)
        .sort({ views: -1 })
        .limit(parseInt(limit))
        .select(
          "name urduName penName biography profileImage views era poetryStyle"
        );

      res.json({
        success: true,
        poets,
        timeframe,
      });
    } catch (error) {
      console.error("Error fetching most viewed poets:", error);
      res.status(500).json({
        success: false,
        message: "مقبول شعراء حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= UTILITY FUNCTIONS =============

  /**
   * Get available eras
   */
  static async getAvailableEras(req, res) {
    try {
      const eras = await PoetBiography.distinct("era", { status: "published" });

      res.json({
        success: true,
        eras: eras.filter(Boolean), // Remove null/undefined values
      });
    } catch (error) {
      console.error("Error fetching eras:", error);
      res.status(500).json({
        success: false,
        message: "ادوار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get available poetry styles
   */
  static async getAvailableStyles(req, res) {
    try {
      const styles = await PoetBiography.aggregate([
        { $match: { status: "published" } },
        { $unwind: "$poetryStyle" },
        { $group: { _id: "$poetryStyle" } },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        success: true,
        styles: styles.map((style) => style._id).filter(Boolean),
      });
    } catch (error) {
      console.error("Error fetching styles:", error);
      res.status(500).json({
        success: false,
        message: "شاعری کی اقسام حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get random poet for discovery
   */
  static async getRandomPoet(req, res) {
    try {
      const [randomPoet] = await PoetBiography.aggregate([
        { $match: { status: "published" } },
        { $sample: { size: 1 } },
      ]);

      if (!randomPoet) {
        return res.status(404).json({
          success: false,
          message: "کوئی شاعر موجود نہیں",
        });
      }

      // Get related poems
      const relatedPoems = await Poem.find({
        $or: [
          { "poet.name": randomPoet.name },
          { "poet.urduName": randomPoet.urduName },
          { author: randomPoet.name },
        ],
        status: "published",
      })
        .select("title content category")
        .limit(3);

      res.json({
        success: true,
        poet: randomPoet,
        relatedPoems,
      });
    } catch (error) {
      console.error("Error fetching random poet:", error);
      res.status(500).json({
        success: false,
        message: "بے ترتیب شاعر حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

export default PoetBiographyController;
