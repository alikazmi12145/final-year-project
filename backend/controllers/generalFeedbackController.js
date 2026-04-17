import GeneralFeedback from "../models/GeneralFeedback.js";

// ==============================================
// General Feedback Controller - User feedback with admin management
// ==============================================

// ── SUBMIT FEEDBACK ──
export const submitFeedback = async (req, res) => {
  try {
    const { name, email, message, rating } = req.body;

    const feedback = await GeneralFeedback.create({
      name,
      email,
      message,
      rating,
      user: req.user?.userId || null,
    });

    res.status(201).json({
      success: true,
      message: "آپ کی رائے کامیابی سے جمع ہو گئی۔ شکریہ!",
      data: feedback,
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    res.status(500).json({
      success: false,
      message: "رائے جمع کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── GET ALL FEEDBACK (Admin Only - Paginated) ──
export const getAllFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, sortBy = "createdAt" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (rating) {
      query.rating = parseInt(rating);
    }

    const total = await GeneralFeedback.countDocuments(query);

    const feedback = await GeneralFeedback.find(query)
      .populate("user", "name profileImage")
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Calculate average rating
    const avgResult = await GeneralFeedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const avgRating = avgResult[0]?.avgRating?.toFixed(1) || 0;

    // Rating distribution
    const distribution = await GeneralFeedback.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: feedback,
      stats: {
        averageRating: parseFloat(avgRating),
        totalFeedback: total,
        distribution: distribution.map((d) => ({ rating: d._id, count: d.count })),
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "رائے لوڈ کرنے میں خرابی",
      error: error.message,
    });
  }
};

// ── DELETE FEEDBACK (Admin Only) ──
export const deleteFeedback = async (req, res) => {
  try {
    const feedback = await GeneralFeedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "رائے نہیں ملی",
      });
    }

    res.json({
      success: true,
      message: "رائے کامیابی سے حذف ہو گئی",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "رائے حذف کرنے میں خرابی",
      error: error.message,
    });
  }
};
