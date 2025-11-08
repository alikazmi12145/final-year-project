import Newsletter from "../models/Newsletter.js";
import { emailService } from "../services/emailService.js";

// Subscribe to newsletter
export const subscribe = async (req, res) => {
  try {
    const { email, source = "footer" } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "ایمیل درکار ہے / Email is required",
      });
    }

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ email });

    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "یہ ایمیل پہلے سے رجسٹرڈ ہے / This email is already subscribed",
        });
      } else {
        // Reactivate subscription
        existingSubscriber.isActive = true;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = null;
        await existingSubscriber.save();

        return res.status(200).json({
          success: true,
          message:
            "آپ کی سبسکرپشن دوبارہ فعال ہو گئی / Your subscription has been reactivated",
        });
      }
    }

    // Create new subscriber
    const newSubscriber = new Newsletter({
      email,
      source,
    });

    await newSubscriber.save();

    // Send welcome email
    try {
      // Create a simple transporter for newsletter emails
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Bazm-e-Sukhan" <${process.env.EMAIL_USER || 'noreply@bazm-e-sukhan.com'}>`,
        to: email,
        subject: "بزمِ سخن میں خوش آمدید! Welcome to Bazm-e-Sukhan!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(to bottom, #f5f3ef, #ffffff); border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #78350f; font-size: 36px; margin: 0; font-weight: bold;">بزمِ سخن</h1>
              <p style="color: #92400e; font-size: 18px; margin: 10px 0;">Bazm-e-Sukhan</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #78350f; text-align: center; margin-bottom: 20px;">خوش آمدید! Welcome!</h2>
              
              <p style="color: #44403c; line-height: 1.8; text-align: right; direction: rtl;">
                عزیز دوست،<br><br>
                بزمِ سخن میں آپ کا خیر مقدم ہے! آپ کی شمولیت سے ہم بہت خوش ہیں۔ اب آپ کو اردو شاعری کی دنیا کی تازہ ترین خبریں، کلاسیکی اور جدید اشعار، اور شعری مقابلوں کی معلومات باقاعدگی سے موصول ہوتی رہیں گی۔
              </p>
              
              <div style="height: 1px; background: linear-gradient(to right, transparent, #d97706, transparent); margin: 30px 0;"></div>
              
              <p style="color: #44403c; line-height: 1.8;">
                Dear Friend,<br><br>
                Welcome to Bazm-e-Sukhan! We're thrilled to have you join our community. You'll now receive regular updates about the latest in Urdu poetry, classical and modern verses, and information about poetry competitions.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:5173" style="display: inline-block; background: linear-gradient(to right, #d97706, #f59e0b); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  شاعری دیکھیں / Explore Poetry
                </a>
              </div>
              
              <p style="color: #78716c; font-size: 14px; text-align: center; margin-top: 30px;">
                شکریہ / Thank you for being part of our poetry community!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #78716c; font-size: 12px;">
              <p>اگر آپ یہ خط نہیں چاہتے تو سبسکرپشن منسوخ کر سکتے ہیں</p>
              <p>If you did not subscribe, you can unsubscribe at any time</p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the subscription if email fails
    }

    res.status(201).json({
      success: true,
      message:
        "شکریہ! آپ کو باقاعدگی سے اپ ڈیٹس ملیں گے / Thank you! You will receive regular updates",
      data: {
        email: newSubscriber.email,
        subscribedAt: newSubscriber.subscribedAt,
      },
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({
      success: false,
      message: "سرور میں خرابی / Server error",
      error: error.message,
    });
  }
};

// Unsubscribe from newsletter
export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "ایمیل درکار ہے / Email is required",
      });
    }

    const subscriber = await Newsletter.findOne({ email });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "یہ ایمیل رجسٹرڈ نہیں ہے / This email is not subscribed",
      });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.status(200).json({
      success: true,
      message:
        "آپ کی سبسکرپشن منسوخ ہو گئی / Your subscription has been cancelled",
    });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    res.status(500).json({
      success: false,
      message: "سرور میں خرابی / Server error",
      error: error.message,
    });
  }
};

// Get all subscribers (admin only)
export const getAllSubscribers = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 50 } = req.query;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const subscribers = await Newsletter.find(query)
      .sort({ subscribedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Newsletter.countDocuments(query);

    res.status(200).json({
      success: true,
      data: subscribers,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({
      success: false,
      message: "سرور میں خرابی / Server error",
      error: error.message,
    });
  }
};

// Get subscriber stats (admin only)
export const getStats = async (req, res) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments();
    const activeSubscribers = await Newsletter.countDocuments({
      isActive: true,
    });
    const inactiveSubscribers = await Newsletter.countDocuments({
      isActive: false,
    });

    // Get subscribers by source
    const bySource = await Newsletter.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent subscribers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubscribers = await Newsletter.countDocuments({
      subscribedAt: { $gte: thirtyDaysAgo },
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalSubscribers,
        active: activeSubscribers,
        inactive: inactiveSubscribers,
        bySource,
        recentSubscribers,
      },
    });
  } catch (error) {
    console.error("Get newsletter stats error:", error);
    res.status(500).json({
      success: false,
      message: "سرور میں خرابی / Server error",
      error: error.message,
    });
  }
};

export default {
  subscribe,
  unsubscribe,
  getAllSubscribers,
  getStats,
};
