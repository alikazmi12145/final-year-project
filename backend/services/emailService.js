import nodemailer from "nodemailer";
import crypto from "crypto";

// Multiple email service configurations
const emailConfigs = {
  // Gmail configuration
  gmail: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },

  // Outlook/Hotmail configuration
  outlook: {
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },

  // Yahoo configuration
  yahoo: {
    host: "smtp.mail.yahoo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },

  // SendGrid configuration
  sendgrid: {
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    auth: {
      user: "apikey",
      pass: process.env.SENDGRID_API_KEY,
    },
  },

  // Mailgun configuration
  mailgun: {
    host: "smtp.mailgun.org",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILGUN_USER,
      pass: process.env.MAILGUN_PASS,
    },
  },
};

// Auto-detect email provider or use fallback
function getEmailConfig() {
  const emailUser = process.env.EMAIL_USER;

  if (!emailUser) {
    console.log("⚠️ No email configuration found, using mock email service");
    return null;
  }

  // Auto-detect provider based on email domain
  if (emailUser.includes("@gmail.com")) {
    return emailConfigs.gmail;
  } else if (
    emailUser.includes("@outlook.com") ||
    emailUser.includes("@hotmail.com")
  ) {
    return emailConfigs.outlook;
  } else if (emailUser.includes("@yahoo.com")) {
    return emailConfigs.yahoo;
  } else if (process.env.SENDGRID_API_KEY) {
    return emailConfigs.sendgrid;
  } else if (process.env.MAILGUN_USER) {
    return emailConfigs.mailgun;
  } else {
    // Fallback to custom SMTP if configured
    return {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };
  }
}

// Create transporter with fallback
let transporter = null;
const emailConfig = getEmailConfig();

if (emailConfig) {
  try {
    transporter = nodemailer.createTransporter(emailConfig);
    console.log("✅ Email service configured successfully");

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.log("⚠️ Email service verification failed:", error.message);
        transporter = null;
      } else {
        console.log("✅ Email service ready to send emails");
      }
    });
  } catch (error) {
    console.log("❌ Failed to create email transporter:", error.message);
    transporter = null;
  }
} else {
  console.log("⚠️ Email service not configured - using mock email");
}

// Mock email service for development
const mockEmailService = {
  async sendMail(mailOptions) {
    console.log("📧 MOCK EMAIL SENT:");
    console.log("To:", mailOptions.to);
    console.log("Subject:", mailOptions.subject);
    console.log("Content:", mailOptions.text || mailOptions.html);
    console.log("---");

    return {
      messageId: "mock-message-id-" + Date.now(),
      response: "250 Message queued (mock)",
    };
  },
};

// Email templates
const emailTemplates = {
  // Email verification template
  emailVerification: (user, verificationUrl) => ({
    subject: "Bazm-e-Sukhan - Email تصدیق کریں",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #DAA520, #B8860B); color: white;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0;">🌟 Bazm-e-Sukhan</h1>
          <p style="color: #FFE4B5; margin: 5px 0;">اردو شاعری کا گھر</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; color: #333; margin: 20px 0;">
          <h2 style="color: #8B4513; text-align: center;">خوش آمدید، ${user.name}!</h2>
          
          <p style="text-align: center; font-size: 16px; line-height: 1.6;" dir="rtl">
            آپ کا اکاؤنٹ کامیابی سے بن گیا ہے۔ اب اپنی ای میل کی تصدیق کریں۔
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #DAA520, #B8860B); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(218, 165, 32, 0.3);">
              📧 ای میل کی تصدیق کریں
            </a>
          </div>
          
          <div style="background: #F5F5DC; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #8B4513; font-size: 14px;">
              <strong>نوٹ:</strong> یہ لنک 24 گھنٹے کے لیے فعال ہے۔
            </p>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">
            اگر آپ نے یہ اکاؤنٹ نہیں بنایا تو اس ای میل کو نظرانداز کریں۔
          </p>
        </div>
        
        <div style="text-align: center; color: #FFE4B5; font-size: 12px;">
          <p>© 2025 Bazm-e-Sukhan. تمام حقوق محفوظ ہیں۔</p>
        </div>
      </div>
    `,
    text: `
خوش آمدید ${user.name}!

آپ کا Bazm-e-Sukhan اکاؤنٹ کامیابی سے بن گیا ہے۔

اپنی ای میل کی تصدیق کے لیے اس لنک پر کلک کریں:
${verificationUrl}

یہ لنک 24 گھنٹے کے لیے فعال ہے۔

شکریہ،
Bazm-e-Sukhan ٹیم
    `,
  }),

  // Password reset template
  passwordReset: (user, resetUrl) => ({
    subject: "Bazm-e-Sukhan - پاس ورڈ ری سیٹ کریں",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #DC143C, #B22222); color: white;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0;">🔐 Bazm-e-Sukhan</h1>
          <p style="color: #FFB6C1; margin: 5px 0;">پاس ورڈ ری سیٹ</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; color: #333; margin: 20px 0;">
          <h2 style="color: #8B4513; text-align: center;">سلام، ${user.name}!</h2>
          
          <p style="text-align: center; font-size: 16px; line-height: 1.6;" dir="rtl">
            آپ نے اپنا پاس ورڈ ری سیٹ کرنے کی درخواست کی ہے۔
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #DC143C, #B22222); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(220, 20, 60, 0.3);">
              🔑 نیا پاس ورڈ بنائیں
            </a>
          </div>
          
          <div style="background: #FFF0F0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC143C;">
            <p style="margin: 0; color: #8B0000; font-size: 14px;">
              <strong>اہم:</strong> یہ لنک صرف 1 گھنٹے کے لیے فعال ہے۔
            </p>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">
            اگر آپ نے یہ درخواست نہیں کی تو اس ای میل کو نظرانداز کریں۔
          </p>
        </div>
        
        <div style="text-align: center; color: #FFB6C1; font-size: 12px;">
          <p>© 2025 Bazm-e-Sukhan. محفوظ اور محفوظ۔</p>
        </div>
      </div>
    `,
    text: `
سلام ${user.name}!

آپ نے اپنا پاس ورڈ ری سیٹ کرنے کی درخواست کی ہے۔

نیا پاس ورڈ بنانے کے لیے اس لنک پر کلک کریں:
${resetUrl}

یہ لنک صرف 1 گھنٹے کے لیے فعال ہے۔

اگر آپ نے یہ درخواست نہیں کی تو اس ای میل کو نظرانداز کریں۔

شکریہ،
Bazm-e-Sukhan ٹیم
    `,
  }),

  // Welcome email for verified users
  welcome: (user) => ({
    subject: "Bazm-e-Sukhan میں خوش آمدید! 🌟",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #228B22, #32CD32); color: white;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0;">🎉 Bazm-e-Sukhan</h1>
          <p style="color: #98FB98; margin: 5px 0;">آپ کا خیر مقدم</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; color: #333; margin: 20px 0;">
          <h2 style="color: #8B4513; text-align: center;">مبارک ہو، ${
            user.name
          }! 🎊</h2>
          
          <p style="text-align: center; font-size: 16px; line-height: 1.6;" dir="rtl">
            آپ کی ای میل کامیابی سے تصدیق ہو گئی۔ اب آپ Bazm-e-Sukhan کے تمام فیچرز استعمال کر سکتے ہیں!
          </p>
          
          <div style="background: #F0FFF0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #228B22; margin-top: 0;">آپ کیا کر سکتے ہیں:</h3>
            <ul style="color: #333; line-height: 1.8;" dir="rtl">
              <li>🔍 شاعری تلاش کریں (متن، آواز، تصویر)</li>
              <li>📚 اپنی پسندیدہ نظمیں محفوظ کریں</li>
              <li>✍️ ${
                user.role === "poet"
                  ? "اپنی شاعری شیئر کریں"
                  : "شاعری پڑھیں اور لطف اٹھائیں"
              }</li>
              <li>👥 دوسرے شعراء سے جڑیں</li>
              <li>🏆 مقابلوں میں حصہ لیں</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/poetry" 
               style="background: linear-gradient(135deg, #228B22, #32CD32); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(34, 139, 34, 0.3);">
              📖 شاعری کی دنیا میں داخل ہوں
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #98FB98; font-size: 12px;">
          <p>شاعری کے ساتھ آپ کا سفر شروع ہو رہا ہے! 🌟</p>
        </div>
      </div>
    `,
    text: `
مبارک ہو ${user.name}!

آپ کی ای میل کامیابی سے تصدیق ہو گئی۔ اب آپ Bazm-e-Sukhan کے تمام فیچرز استعمال کر سکتے ہیں!

آپ کیا کر سکتے ہیں:
- شاعری تلاش کریں
- اپنی پسندیدہ نظمیں محفوظ کریں
- شاعری پڑھیں اور شیئر کریں
- دوسرے شعراء سے جڑیں

شاعری کی دنیا میں خوش آمدید!
Bazm-e-Sukhan ٹیم
    `,
  }),

  // Poet approval notification
  poetApproval: (user) => ({
    subject: "🎉 آپ کو شاعر کے طور پر منظوری مل گئی!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #9932CC, #8A2BE2); color: white;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0;">👑 Bazm-e-Sukhan</h1>
          <p style="color: #DDA0DD; margin: 5px 0;">شاعر کی منظوری</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; color: #333; margin: 20px 0;">
          <h2 style="color: #8B4513; text-align: center;">مبارک ہو، ${user.name}! 🎊</h2>
          
          <p style="text-align: center; font-size: 16px; line-height: 1.6;" dir="rtl">
            آپ کو Bazm-e-Sukhan میں شاعر کے طور پر منظوری مل گئی ہے!
          </p>
          
          <div style="background: #F8F0FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #9932CC; margin-top: 0;">اب آپ کر سکتے ہیں:</h3>
            <ul style="color: #333; line-height: 1.8;" dir="rtl">
              <li>✍️ اپنی شاعری پبلش کریں</li>
              <li>📝 اپنا شاعر پروفائل مکمل کریں</li>
              <li>🏆 شاعری کے مقابلوں میں حصہ لیں</li>
              <li>👥 اپنے فالورز بنائیں</li>
              <li>📈 اپنی شاعری کی رپورٹس دیکھیں</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background: linear-gradient(135deg, #9932CC, #8A2BE2); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(153, 50, 204, 0.3);">
              🚀 اپنا ڈیش بورڈ دیکھیں
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #DDA0DD; font-size: 12px;">
          <p>آپ کے شاعری کے سفر کی کامیابی کے لیے دعا گو! 🌟</p>
        </div>
      </div>
    `,
    text: `
مبارک ہو ${user.name}!

آپ کو Bazm-e-Sukhan میں شاعر کے طور پر منظوری مل گئی ہے!

اب آپ اپنی شاعری پبلش کر سکتے ہیں اور تمام شاعری کے فیچرز استعمال کر سکتے ہیں۔

اپنا ڈیش بورڈ دیکھنے کے لیے لاگ ان کریں۔

شکریہ،
Bazm-e-Sukhan ٹیم
    `,
  }),
};

// Email service functions
export const emailService = {
  // Send any email
  async sendEmail(to, template, data = {}) {
    try {
      const emailTemplate = emailTemplates[template];
      if (!emailTemplate) {
        throw new Error(`Email template "${template}" not found`);
      }

      const mailContent = emailTemplate(
        data.user || { name: "User" },
        data.url || "#"
      );

      const mailOptions = {
        from: {
          name: "Bazm-e-Sukhan",
          address: process.env.EMAIL_USER || "noreply@bazm-e-sukhan.com",
        },
        to: to,
        subject: mailContent.subject,
        text: mailContent.text,
        html: mailContent.html,
      };

      // Use real transporter if available, otherwise mock
      const emailTransporter = transporter || mockEmailService;
      const result = await emailTransporter.sendMail(mailOptions);

      console.log(`✅ Email sent to ${to}: ${mailContent.subject}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  },

  // Send verification email
  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    return this.sendEmail(user.email, "emailVerification", {
      user,
      url: verificationUrl,
    });
  },

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    return this.sendEmail(user.email, "passwordReset", { user, url: resetUrl });
  },

  // Send welcome email
  async sendWelcomeEmail(user) {
    return this.sendEmail(user.email, "welcome", { user });
  },

  // Send poet approval email
  async sendPoetApprovalEmail(user) {
    return this.sendEmail(user.email, "poetApproval", { user });
  },

  // Generate secure tokens
  generateVerificationToken() {
    return crypto.randomBytes(32).toString("hex");
  },

  generateResetToken() {
    return crypto.randomBytes(32).toString("hex");
  },

  // Test email configuration
  async testEmailConfig() {
    if (!transporter) {
      return {
        success: false,
        message:
          "Email service not configured. Update .env file with email credentials.",
      };
    }

    try {
      await transporter.verify();
      return { success: true, message: "Email service is working correctly!" };
    } catch (error) {
      return {
        success: false,
        message: `Email service test failed: ${error.message}`,
      };
    }
  },
};

export default emailService;
