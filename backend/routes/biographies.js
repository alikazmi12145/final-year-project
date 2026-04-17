import express from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import Poet from "../models/poet.js";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import { auth, poetAuth, adminAuth } from "../middleware/auth.js";
import RekhtaService from "../services/rekhtaService.js";

const router = express.Router();
const rekhtaService = new RekhtaService();

/**
 * Biography Management Routes
 * Module 3: Poet Biographies - Complete Implementation
 */

// ============= BIOGRAPHY CRUD ROUTES =============

/**
 * @route   POST /api/biographies/add
 * @desc    Create a new poet biography (poet or admin only)
 * @access  Private (Poet/Admin)
 */
router.post(
  "/add",
  [
    auth,
    poetAuth, // Only poets and admins can create biographies
    [
      body("name").notEmpty().withMessage("Poet name is required"),
      body("bio")
        .isLength({ min: 50, max: 5000 })
        .withMessage("Biography must be between 50-5000 characters"),
      body("era")
        .isIn([
          "classical",
          "modern",
          "contemporary",
          "progressive",
          "traditional",
        ])
        .withMessage("Valid era is required"),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const {
        name,
        penName,
        fullName,
        dateOfBirth,
        dateOfDeath,
        birthPlace,
        nationality,
        languages,
        bio,
        shortBio,
        era,
        poeticStyle,
        genres,
        influences,
        achievements,
        famousWorks,
        awards,
        yearsActive,
        memorialStatus,
        archiveStatus,
      } = req.body;

      // Check if poet already exists
      const existingPoet = await Poet.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (existingPoet) {
        return res.status(400).json({
          success: false,
          message: "A poet with this name already exists",
        });
      }

      // Create new poet biography
      const newPoet = new Poet({
        name,
        penName,
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : undefined,
        isDeceased: !!dateOfDeath,
        birthPlace,
        nationality,
        languages,
        bio,
        shortBio,
        era,
        poeticStyle,
        genres,
        influences,
        achievements: achievements || [],
        famousWorks: famousWorks || [],
        awards: awards || [],
        yearsActive,
        memorialStatus: memorialStatus || false,
        archiveStatus: archiveStatus || "active",
        addedBy: req.user.id,
        status: req.user.role === "admin" ? "active" : "pending",
        isVerified: req.user.role === "admin",
      });

      await newPoet.save();

      res.status(201).json({
        success: true,
        message: "Poet biography created successfully",
        poet: newPoet,
      });
    } catch (error) {
      console.error("Error creating poet biography:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create poet biography",
        error: error.message,
      });
    }
  }
);

// ============= SPECIFIC NAMED ROUTES (must come before /:id) =============

/**
 * @route   GET /api/biographies/achievements/:id
 * @desc    Get detailed achievements and works for a poet
 * @access  Public
 */
router.get("/achievements/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const poet = await Poet.findById(id).select(
      "name achievements awards famousWorks yearsActive"
    );

    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet not found",
      });
    }

    // Get published poems by this poet
    const publishedPoems = await Poem.find({
      poet: id,
      status: "published",
    })
      .select("title publishedAt views averageRating totalRatings")
      .sort({ publishedAt: -1 });

    res.json({
      success: true,
      poet: {
        name: poet.name,
        achievements: poet.achievements,
        awards: poet.awards,
        famousWorks: poet.famousWorks,
        yearsActive: poet.yearsActive,
        publishedPoems: publishedPoems.length,
        poemsDetails: publishedPoems,
      },
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poet achievements",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/biographies/classical/:poet
 * @desc    Get classical poet biography from Rekhta API
 * @access  Public
 */
router.get("/classical/:poet", async (req, res) => {
  try {
    const { poet } = req.params;

    // First check if we have this poet in our database
    const localPoet = await Poet.findOne({
      $or: [
        { name: { $regex: new RegExp(poet, "i") } },
        { penName: { $regex: new RegExp(poet, "i") } },
      ],
      era: "classical",
    });

    if (localPoet) {
      return res.json({
        success: true,
        source: "local",
        poet: localPoet,
      });
    }

    // If not found locally, fetch from Rekhta
    try {
      const rekhtaData = await rekhtaService.getPoetBiography(poet);

      if (rekhtaData.success) {
        res.json({
          success: true,
          source: "rekhta",
          poet: rekhtaData.biography,
          poems: rekhtaData.samplePoems || [],
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Classical poet not found in Rekhta database",
          availablePoets: rekhtaService.getSupportedPoets(),
        });
      }
    } catch (rekhtaError) {
      console.error("Rekhta API error:", rekhtaError);
      res.status(500).json({
        success: false,
        message: "Unable to fetch classical poet data at this time",
        error: "External service temporarily unavailable",
      });
    }
  } catch (error) {
    console.error("Error fetching classical poet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch classical poet biography",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/biographies/:id
 * @desc    Get a specific poet biography by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const poet = await Poet.findById(id)
      .populate("addedBy", "name email role")
      .populate("verifiedBy", "name email");

    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet biography not found",
      });
    }

    // Get poems by this poet
    const poems = await Poem.find({ poet: id, status: "published" })
      .select("title publishedAt views averageRating")
      .sort({ publishedAt: -1 })
      .limit(10);

    // Get statistics
    const totalPoems = await Poem.countDocuments({
      poet: id,
      status: "published",
    });
    const totalViews = await Poem.aggregate([
      { $match: { poet: mongoose.Types.ObjectId(id), status: "published" } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);

    res.json({
      success: true,
      poet: {
        ...poet.toObject(),
        statistics: {
          totalPoems,
          totalViews: totalViews[0]?.totalViews || 0,
          recentPoems: poems,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching poet biography:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poet biography",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/biographies/:id
 * @desc    Update a poet biography
 * @access  Private (Poet who created it, or Admin)
 */
router.put(
  "/:id",
  [
    auth,
    [
      body("bio")
        .optional()
        .isLength({ min: 50, max: 5000 })
        .withMessage("Biography must be between 50-5000 characters"),
      body("era")
        .optional()
        .isIn([
          "classical",
          "modern",
          "contemporary",
          "progressive",
          "traditional",
        ])
        .withMessage("Valid era is required"),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const poet = await Poet.findById(id);

      if (!poet) {
        return res.status(404).json({
          success: false,
          message: "Poet biography not found",
        });
      }

      // Check authorization
      const canEdit =
        req.user.role === "admin" || poet.addedBy.toString() === req.user.id;

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to edit this biography",
        });
      }

      // Update fields
      const updateFields = { ...req.body };
      delete updateFields._id;
      delete updateFields.addedBy;
      delete updateFields.createdAt;

      // Handle date fields
      if (updateFields.dateOfBirth) {
        updateFields.dateOfBirth = new Date(updateFields.dateOfBirth);
      }
      if (updateFields.dateOfDeath) {
        updateFields.dateOfDeath = new Date(updateFields.dateOfDeath);
        updateFields.isDeceased = true;
      }

      Object.assign(poet, updateFields);
      poet.updatedAt = new Date();

      await poet.save();

      res.json({
        success: true,
        message: "Poet biography updated successfully",
        poet,
      });
    } catch (error) {
      console.error("Error updating poet biography:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update poet biography",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/biographies/:id
 * @desc    Delete a poet biography (soft delete)
 * @access  Private (Admin only)
 */
router.delete("/:id", [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const poet = await Poet.findById(id);

    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet biography not found",
      });
    }

    // Soft delete
    poet.status = "deleted";
    poet.deletedAt = new Date();
    poet.deletedBy = req.user.id;
    await poet.save();

    res.json({
      success: true,
      message: "Poet biography deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting poet biography:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete poet biography",
      error: error.message,
    });
  }
});

// ============= BROWSE AND SEARCH BIOGRAPHIES =============

/**
 * @route   GET /api/biographies
 * @desc    Get all poet biographies with filtering and search
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      era,
      isAlive,
      genre,
      sortBy = "name",
      sortOrder = "asc",
      memorial = false,
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { status: "active" };

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { penName: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } },
        { shortBio: { $regex: search, $options: "i" } },
        { "achievements.title": { $regex: search, $options: "i" } },
      ];
    }

    // Filter by era
    if (era && era !== "all") {
      query.era = era;
    }

    // Filter by living status
    if (isAlive !== undefined) {
      query.isDeceased = isAlive === "false";
    }

    // Filter by genre
    if (genre && genre !== "all") {
      query.genres = { $in: [genre] };
    }

    // Memorial status filter
    if (memorial === "true") {
      query.memorialStatus = true;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const poets = await Poet.find(query)
      .select(
        "name penName shortBio era isDeceased birthPlace memorialStatus profileImage achievements followersCount"
      )
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("addedBy", "name");

    const totalPoets = await Poet.countDocuments(query);

    res.json({
      success: true,
      poets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPoets / limit),
        totalPoets,
        hasNext: skip + poets.length < totalPoets,
        hasPrev: page > 1,
      },
      filters: {
        search,
        era,
        isAlive,
        genre,
        memorial,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching biographies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poet biographies",
      error: error.message,
    });
  }
});

// ============= MEMORIAL AND ARCHIVE FEATURES =============

/**
 * @route   PUT /api/biographies/:id/memorial
 * @desc    Mark poet as memorial (for deceased poets)
 * @access  Private (Admin only)
 */
router.put("/:id/memorial", [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const { memorialStatus, memorialNote } = req.body;

    const poet = await Poet.findById(id);
    if (!poet) {
      return res.status(404).json({
        success: false,
        message: "Poet not found",
      });
    }

    if (!poet.isDeceased) {
      return res.status(400).json({
        success: false,
        message: "Memorial status can only be set for deceased poets",
      });
    }

    poet.memorialStatus = memorialStatus;
    if (memorialNote) {
      poet.memorialNote = memorialNote;
    }
    poet.updatedAt = new Date();

    await poet.save();

    res.json({
      success: true,
      message: "Memorial status updated successfully",
      poet: {
        id: poet._id,
        name: poet.name,
        memorialStatus: poet.memorialStatus,
        memorialNote: poet.memorialNote,
      },
    });
  } catch (error) {
    console.error("Error updating memorial status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update memorial status",
      error: error.message,
    });
  }
});

export default router;
