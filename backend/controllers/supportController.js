import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * Support Controller for Bazm-E-Sukhan Platform
 * Handles support tickets, help requests, and customer service
 */

class SupportController {
  // ============= TICKET MANAGEMENT =============

  /**
   * Create a new support ticket
   */
  static async createTicket(req, res) {
    try {
      const {
        subject,
        description,
        category,
        priority = "medium",
        contactEmail,
        contactPhone,
      } = req.body;

      const userId = req.user?.id;

      // Validation
      if (!subject || !description || !category) {
        return res.status(400).json({
          success: false,
          message: "موضوع، تفصیل اور زمرہ ضروری ہے",
        });
      }

      // Generate ticket number
      const ticketNumber = await generateTicketNumber();

      const ticket = new SupportTicket({
        ticketNumber,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        contactEmail: contactEmail?.trim(),
        contactPhone: contactPhone?.trim(),
        user: userId,
        status: "open",
      });

      // Handle attachments if present
      if (req.files && req.files.attachments) {
        ticket.attachments = req.files.attachments.map((file) => ({
          url: file.path,
          publicId: file.filename,
          filename: file.originalname,
          fileType: file.mimetype,
          uploadedAt: new Date(),
        }));
      }

      await ticket.save();

      // Populate user info if available
      if (userId) {
        await ticket.populate("user", "username profile.fullName email");
      }

      res.status(201).json({
        success: true,
        message: "سپورٹ ٹکٹ کامیابی سے بنایا گیا",
        ticket,
      });
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(500).json({
        success: false,
        message: "سپورٹ ٹکٹ بناتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get all tickets with filtering (Admin/Support only)
   */
  static async getAllTickets(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        priority,
        assignedTo,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        dateRange,
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query = {};

      if (status && status !== "all") {
        query.status = status;
      }

      if (category && category !== "all") {
        query.category = category;
      }

      if (priority && priority !== "all") {
        query.priority = priority;
      }

      if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
        query.assignedTo = assignedTo;
      }

      if (search) {
        query.$or = [
          { ticketNumber: { $regex: search, $options: "i" } },
          { subject: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Date range filter
      if (dateRange) {
        const days = parseInt(dateRange.replace("d", ""));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query.createdAt = { $gte: startDate };
      }

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

      const tickets = await SupportTicket.find(query)
        .populate("user", "username profile.fullName email")
        .populate("assignedTo", "username profile.fullName")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalTickets = await SupportTicket.countDocuments(query);

      res.json({
        success: true,
        tickets,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalTickets / limitNum),
          totalTickets,
          hasNext: pageNum < Math.ceil(totalTickets / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({
        success: false,
        message: "ٹکٹس حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get user's tickets
   */
  static async getUserTickets(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = { user: userId };

      if (status && status !== "all") {
        query.status = status;
      }

      const tickets = await SupportTicket.find(query)
        .populate("assignedTo", "username profile.fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalTickets = await SupportTicket.countDocuments(query);

      res.json({
        success: true,
        tickets,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalTickets / limitNum),
          totalTickets,
          hasNext: pageNum < Math.ceil(totalTickets / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      res.status(500).json({
        success: false,
        message: "آپ کے ٹکٹس حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get ticket by ID or number
   */
  static async getTicketById(req, res) {
    try {
      const { identifier } = req.params; // Can be ID or ticket number
      const userId = req.user?.id;

      let query;
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        query = { _id: identifier };
      } else {
        query = { ticketNumber: identifier };
      }

      const ticket = await SupportTicket.findOne(query)
        .populate("user", "username profile.fullName email")
        .populate("assignedTo", "username profile.fullName")
        .populate("responses.author", "username profile.fullName");

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "ٹکٹ موجود نہیں",
        });
      }

      // Check authorization
      const isOwner = ticket.user && ticket.user._id.toString() === userId;
      const isAdmin = req.user?.role === "admin";
      const isSupport = req.user?.role === "support";
      const isAssigned =
        ticket.assignedTo && ticket.assignedTo._id.toString() === userId;

      if (!isOwner && !isAdmin && !isSupport && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: "اس ٹکٹ تک رسائی کی اجازت نہیں",
        });
      }

      res.json({
        success: true,
        ticket,
      });
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({
        success: false,
        message: "ٹکٹ حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Update ticket status and assignment (Admin/Support only)
   */
  static async updateTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { status, priority, assignedTo, internalNotes } = req.body;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "غلط ٹکٹ ID",
        });
      }

      const ticket = await SupportTicket.findById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "ٹکٹ موجود نہیں",
        });
      }

      // Update fields
      if (
        status &&
        ["open", "in_progress", "resolved", "closed"].includes(status)
      ) {
        ticket.status = status;

        if (status === "resolved") {
          ticket.resolvedAt = new Date();
          ticket.resolvedBy = userId;
        } else if (status === "closed") {
          ticket.closedAt = new Date();
          ticket.closedBy = userId;
        }
      }

      if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
        ticket.priority = priority;
      }

      if (assignedTo !== undefined) {
        if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
          ticket.assignedTo = assignedTo;
          ticket.assignedAt = new Date();
        } else {
          ticket.assignedTo = null;
          ticket.assignedAt = null;
        }
      }

      if (internalNotes) {
        ticket.internalNotes = internalNotes.trim();
      }

      ticket.updatedAt = new Date();
      await ticket.save();

      await ticket.populate([
        { path: "user", select: "username profile.fullName email" },
        { path: "assignedTo", select: "username profile.fullName" },
      ]);

      res.json({
        success: true,
        message: "ٹکٹ کامیابی سے اپ ڈیٹ ہوا",
        ticket,
      });
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({
        success: false,
        message: "ٹکٹ اپ ڈیٹ کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Add response to ticket
   */
  static async addResponse(req, res) {
    try {
      const { ticketId } = req.params;
      const { content, isInternal = false } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "جواب کا مواد ضروری ہے",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "غلط ٹکٹ ID",
        });
      }

      const ticket = await SupportTicket.findById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "ٹکٹ موجود نہیں",
        });
      }

      // Check authorization
      const isOwner = ticket.user && ticket.user.toString() === userId;
      const isAdmin = req.user.role === "admin";
      const isSupport = req.user.role === "support";
      const isAssigned =
        ticket.assignedTo && ticket.assignedTo.toString() === userId;

      if (!isOwner && !isAdmin && !isSupport && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: "اس ٹکٹ میں جواب دینے کی اجازت نہیں",
        });
      }

      const response = {
        author: userId,
        content: content.trim(),
        isInternal: isInternal && (isAdmin || isSupport),
        createdAt: new Date(),
      };

      // Handle attachments if present
      if (req.files && req.files.attachments) {
        response.attachments = req.files.attachments.map((file) => ({
          url: file.path,
          publicId: file.filename,
          filename: file.originalname,
          fileType: file.mimetype,
        }));
      }

      ticket.responses.push(response);
      ticket.lastResponseAt = new Date();
      ticket.lastResponseBy = userId;

      // Update status if it's the first response from support
      if ((isAdmin || isSupport || isAssigned) && ticket.status === "open") {
        ticket.status = "in_progress";
      }

      await ticket.save();

      // Populate the new response
      await ticket.populate("responses.author", "username profile.fullName");
      const newResponse = ticket.responses[ticket.responses.length - 1];

      res.status(201).json({
        success: true,
        message: "جواب کامیابی سے شامل ہوا",
        response: newResponse,
      });
    } catch (error) {
      console.error("Error adding response:", error);
      res.status(500).json({
        success: false,
        message: "جواب شامل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Close ticket
   */
  static async closeTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "غلط ٹکٹ ID",
        });
      }

      const ticket = await SupportTicket.findById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "ٹکٹ موجود نہیں",
        });
      }

      // Check authorization
      const isOwner = ticket.user && ticket.user.toString() === userId;
      const isAdmin = req.user.role === "admin";
      const isSupport = req.user.role === "support";

      if (!isOwner && !isAdmin && !isSupport) {
        return res.status(403).json({
          success: false,
          message: "ٹکٹ بند کرنے کی اجازت نہیں",
        });
      }

      ticket.status = "closed";
      ticket.closedAt = new Date();
      ticket.closedBy = userId;
      if (reason) {
        ticket.closeReason = reason.trim();
      }

      await ticket.save();

      res.json({
        success: true,
        message: "ٹکٹ کامیابی سے بند ہوا",
      });
    } catch (error) {
      console.error("Error closing ticket:", error);
      res.status(500).json({
        success: false,
        message: "ٹکٹ بند کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= STATISTICS & ANALYTICS =============

  /**
   * Get support statistics (Admin/Support only)
   */
  static async getSupportStatistics(req, res) {
    try {
      const { dateRange = "30d" } = req.query;

      // Calculate date range
      let dateFilter = {};
      if (dateRange) {
        const days = parseInt(dateRange.replace("d", ""));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter.createdAt = { $gte: startDate };
      }

      const [
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        categoryStats,
        priorityStats,
        averageResponseTime,
        recentTickets,
      ] = await Promise.all([
        SupportTicket.countDocuments(dateFilter),
        SupportTicket.countDocuments({ ...dateFilter, status: "open" }),
        SupportTicket.countDocuments({ ...dateFilter, status: "in_progress" }),
        SupportTicket.countDocuments({ ...dateFilter, status: "resolved" }),
        SupportTicket.countDocuments({ ...dateFilter, status: "closed" }),
        SupportTicket.aggregate([
          { $match: dateFilter },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        SupportTicket.aggregate([
          { $match: dateFilter },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        SupportTicket.aggregate([
          {
            $match: {
              ...dateFilter,
              lastResponseAt: { $exists: true },
              status: { $in: ["resolved", "closed"] },
            },
          },
          {
            $project: {
              responseTime: {
                $subtract: ["$lastResponseAt", "$createdAt"],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgResponseTime: { $avg: "$responseTime" },
            },
          },
        ]),
        SupportTicket.find(dateFilter)
          .populate("user", "username profile.fullName")
          .sort({ createdAt: -1 })
          .limit(10)
          .select("ticketNumber subject status priority createdAt"),
      ]);

      const statistics = {
        overview: {
          totalTickets,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          closedTickets,
        },
        distribution: {
          byCategory: categoryStats,
          byPriority: priorityStats,
        },
        performance: {
          averageResponseTime: averageResponseTime[0]?.avgResponseTime || 0,
          resolutionRate:
            totalTickets > 0
              ? Math.round(
                  ((resolvedTickets + closedTickets) / totalTickets) * 100
                )
              : 0,
        },
        recentTickets,
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error("Error fetching support statistics:", error);
      res.status(500).json({
        success: false,
        message: "سپورٹ کے اعداد و شمار حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  /**
   * Get support team performance (Admin only)
   */
  static async getTeamPerformance(req, res) {
    try {
      const { dateRange = "30d" } = req.query;

      // Calculate date range
      let dateFilter = {};
      if (dateRange) {
        const days = parseInt(dateRange.replace("d", ""));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter.createdAt = { $gte: startDate };
      }

      const teamPerformance = await SupportTicket.aggregate([
        { $match: { ...dateFilter, assignedTo: { $exists: true } } },
        {
          $group: {
            _id: "$assignedTo",
            totalAssigned: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
              },
            },
            closed: {
              $sum: {
                $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
              },
            },
            avgResponseTime: {
              $avg: {
                $cond: [
                  { $and: [{ $exists: ["$lastResponseAt"] }] },
                  { $subtract: ["$lastResponseAt", "$createdAt"] },
                  null,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "agent",
          },
        },
        { $unwind: "$agent" },
        {
          $project: {
            agent: {
              id: "$agent._id",
              username: "$agent.username",
              fullName: "$agent.profile.fullName",
            },
            totalAssigned: 1,
            resolved: 1,
            closed: 1,
            resolutionRate: {
              $multiply: [
                {
                  $divide: [
                    { $add: ["$resolved", "$closed"] },
                    "$totalAssigned",
                  ],
                },
                100,
              ],
            },
            avgResponseTime: 1,
          },
        },
        { $sort: { resolutionRate: -1 } },
      ]);

      res.json({
        success: true,
        teamPerformance,
      });
    } catch (error) {
      console.error("Error fetching team performance:", error);
      res.status(500).json({
        success: false,
        message: "ٹیم کی کارکردگی حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }

  // ============= KNOWLEDGE BASE =============

  /**
   * Get FAQ and common solutions
   */
  static async getFAQ(req, res) {
    try {
      const { category, search } = req.query;

      // Mock FAQ data - in real app, this would come from database
      let faqData = [
        {
          id: 1,
          question: "میں اپنا پاس ورڈ کیسے تبدیل کروں؟",
          answer: "سیٹنگز میں جا کر پاس ورڈ تبدیل کریں کے آپشن پر کلک کریں۔",
          category: "account",
        },
        {
          id: 2,
          question: "شاعری کیسے شائع کروں؟",
          answer:
            "نئی شاعری کے بٹن پر کلک کر کے اپنی شاعری لکھیں اور شائع کریں۔",
          category: "poetry",
        },
        {
          id: 3,
          question: "میں دوسرے شاعروں کو کیسے فالو کروں؟",
          answer: "شاعر کے پروفائل پر جا کر فالو کے بٹن پر کلک کریں۔",
          category: "social",
        },
      ];

      // Filter by category
      if (category && category !== "all") {
        faqData = faqData.filter((faq) => faq.category === category);
      }

      // Search filter
      if (search) {
        faqData = faqData.filter(
          (faq) => faq.question.includes(search) || faq.answer.includes(search)
        );
      }

      res.json({
        success: true,
        faq: faqData,
      });
    } catch (error) {
      console.error("Error fetching FAQ:", error);
      res.status(500).json({
        success: false,
        message: "عمومی سوالات حاصل کرتے وقت خرابی ہوئی",
        error: error.message,
      });
    }
  }
}

// Helper function to generate unique ticket number
async function generateTicketNumber() {
  const prefix = "BST";
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");

  // Get count of tickets created today
  const todayStart = new Date(date.setHours(0, 0, 0, 0));
  const todayEnd = new Date(date.setHours(23, 59, 59, 999));

  const todayCount = await SupportTicket.countDocuments({
    createdAt: { $gte: todayStart, $lte: todayEnd },
  });

  const sequence = (todayCount + 1).toString().padStart(4, "0");

  return `${prefix}${year}${month}${sequence}`;
}

export default SupportController;
