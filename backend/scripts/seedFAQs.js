import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import ChatbotFAQ from "../models/ChatbotFAQ.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const faqData = [
  {
    question: {
      urdu: "شاعری کیسے تلاش کریں؟",
      english: "How to search for poetry?",
    },
    answer: {
      urdu: "شاعری تلاش کرنے کے لیے:\n• اوپر search باکس استعمال کریں\n• شاعر کے نام سے تلاش کریں\n• نظم کا عنوان داخل کریں\n• کوئی مصرعہ لکھ کر تلاش کریں\n• آواز سے تلاش بھی کر سکتے ہیں",
      english:
        "To search for poetry:\n• Use the search box at the top\n• Search by poet name\n• Enter poem title\n• Write a verse to search\n• You can also use voice search",
    },
    category: "search",
    intent: "poetry_search",
    keywords: {
      urdu: ["شاعری", "تلاش", "کیسے تلاش کریں", "ڈھونڈیں"],
      english: ["poetry", "search", "find", "how to search"],
    },
    priority: 10,
    suggestions: [
      {
        text: {
          urdu: "آواز سے تلاش کیسے کریں؟",
          english: "How to use voice search?",
        },
        action: "navigate",
        target: "/search",
      },
      {
        text: {
          urdu: "مشہور شعراء",
          english: "Famous poets",
        },
        action: "navigate",
        target: "/poets",
      },
    ],
  },
  {
    question: {
      urdu: "اکاؤنٹ کیسے بنائیں؟",
      english: "How to create an account?",
    },
    answer: {
      urdu: "اکاؤنٹ بنانے کے لیے:\n• صفحہ اول پر 'رجسٹر' بٹن پر کلک کریں\n• اپنی معلومات (نام، ای میل، پاس ورڈ) داخل کریں\n• قارئ یا شاعر کا انتخاب کریں\n• 'رجسٹر' بٹن دبائیں\n• اپنا ای میل verify کریں",
      english:
        "To create an account:\n• Click 'Register' button on homepage\n• Enter your details (name, email, password)\n• Choose reader or poet\n• Click 'Register' button\n• Verify your email",
    },
    category: "account",
    intent: "account_creation",
    keywords: {
      urdu: ["اکاؤنٹ", "رجسٹر", "سائن اپ", "کھاتہ بنانا"],
      english: ["account", "register", "sign up", "create account"],
    },
    priority: 9,
    suggestions: [
      {
        text: {
          urdu: "لاگ ان کریں",
          english: "Login",
        },
        action: "navigate",
        target: "/auth",
      },
      {
        text: {
          urdu: "پاس ورڈ بھول گئے؟",
          english: "Forgot password?",
        },
        action: "navigate",
        target: "/forgot-password",
      },
    ],
  },
  {
    question: {
      urdu: "شاعری اپ لوڈ کیسے کریں؟",
      english: "How to upload poetry?",
    },
    answer: {
      urdu: "شاعری اپ لوڈ کرنے کے لیے:\n• پہلے شاعر اکاؤنٹ بنائیں\n• اپنے Dashboard میں جائیں\n• 'نئی شاعری' پر کلک کریں\n• اپنا کلام لکھیں\n• موضوع اور بحر منتخب کریں\n• 'محفوظ کریں' دبائیں",
      english:
        "To upload poetry:\n• First create a poet account\n• Go to your Dashboard\n• Click 'New Poetry'\n• Write your composition\n• Select topic and meter\n• Click 'Save'",
    },
    category: "poetry",
    intent: "poetry_upload",
    keywords: {
      urdu: ["اپ لوڈ", "شاعری اپ لوڈ", "نظم لکھنا", "غزل"],
      english: ["upload", "submit poetry", "write poem", "ghazal"],
    },
    priority: 8,
    suggestions: [
      {
        text: {
          urdu: "شاعر اکاؤنٹ کی منظوری",
          english: "Poet account approval",
        },
        action: "link",
        target: "#poet-approval",
      },
      {
        text: {
          urdu: "شاعری کے قوانین",
          english: "Poetry guidelines",
        },
        action: "link",
        target: "#guidelines",
      },
    ],
  },
  {
    question: {
      urdu: "مقابلے میں حصہ کیسے لیں؟",
      english: "How to participate in contests?",
    },
    answer: {
      urdu: "مقابلے میں حصہ لینے کے لیے:\n• 'مقابلے' سیکشن میں جائیں\n• اپنی پسند کا مقابلہ منتخب کریں\n• شرائط و ضوابط پڑھیں\n• 'حصہ لیں' بٹن دبائیں\n• اپنی شاعری submit کریں\n• آخری تاریخ سے پہلے جمع کرائیں",
      english:
        "To participate in contests:\n• Go to 'Contests' section\n• Select your preferred contest\n• Read terms and conditions\n• Click 'Participate' button\n• Submit your poetry\n• Submit before deadline",
    },
    category: "contests",
    intent: "contest_participation",
    keywords: {
      urdu: ["مقابلہ", "حصہ لینا", "کونٹسٹ", "مسابقہ"],
      english: ["contest", "participate", "competition", "musabqah"],
    },
    priority: 7,
    suggestions: [
      {
        text: {
          urdu: "موجودہ مقابلے",
          english: "Current contests",
        },
        action: "navigate",
        target: "/contests",
      },
      {
        text: {
          urdu: "انعامات کی تفصیل",
          english: "Prize details",
        },
        action: "link",
        target: "#prizes",
      },
    ],
  },
  {
    question: {
      urdu: "آواز سے تلاش کیسے استعمال کریں؟",
      english: "How to use voice search?",
    },
    answer: {
      urdu: "آواز سے تلاش کے لیے:\n• سرچ بار میں مائیکروفون آئیکن پر کلک کریں\n• جب پوچھا جائے تو مائیکروفون کی اجازت دیں\n• اپنا سوال یا مصرعہ بولیں\n• کچھ سیکنڈ انتظار کریں\n• نتائج ظاہر ہوں گے",
      english:
        "For voice search:\n• Click microphone icon in search bar\n• Allow microphone permission when asked\n• Speak your question or verse\n• Wait a few seconds\n• Results will appear",
    },
    category: "search",
    intent: "voice_search",
    keywords: {
      urdu: ["آواز", "وائس سرچ", "مائیکروفون", "بول کر تلاش"],
      english: ["voice", "voice search", "microphone", "speak search"],
    },
    priority: 6,
    suggestions: [
      {
        text: {
          urdu: "عام تلاش",
          english: "Normal search",
        },
        action: "navigate",
        target: "/search",
      },
      {
        text: {
          urdu: "تصویر سے تلاش",
          english: "Image search",
        },
        action: "link",
        target: "#image-search",
      },
    ],
  },
  {
    question: {
      urdu: "پاس ورڈ کیسے بدلیں؟",
      english: "How to change password?",
    },
    answer: {
      urdu: "پاس ورڈ بدلنے کے لیے:\n• اپنے پروفائل میں جائیں\n• 'ترتیبات' پر کلک کریں\n• 'پاس ورڈ تبدیل کریں' منتخب کریں\n• پرانا پاس ورڈ داخل کریں\n• نیا پاس ورڈ دو بار لکھیں\n• 'محفوظ کریں' دبائیں",
      english:
        "To change password:\n• Go to your profile\n• Click 'Settings'\n• Select 'Change Password'\n• Enter old password\n• Write new password twice\n• Click 'Save'",
    },
    category: "account",
    intent: "password_change",
    keywords: {
      urdu: ["پاس ورڈ", "تبدیل کریں", "بھول گئے", "ری سیٹ"],
      english: ["password", "change", "forgot", "reset"],
    },
    priority: 8,
  },
  {
    question: {
      urdu: "دوسرے شاعروں سے رابطہ کیسے کریں؟",
      english: "How to contact other poets?",
    },
    answer: {
      urdu: "شاعروں سے رابطہ کرنے کے لیے:\n• شاعر کے پروفائل پر جائیں\n• 'پیغام بھیجیں' بٹن پر کلک کریں\n• اپنا پیغام لکھیں\n• 'بھیجیں' دبائیں\n• آپ کے چیٹ سیکشن میں گفتگو شروع ہوگی",
      english:
        "To contact poets:\n• Go to poet's profile\n• Click 'Send Message' button\n• Write your message\n• Click 'Send'\n• Chat will start in your chat section",
    },
    category: "navigation",
    intent: "contact_poets",
    keywords: {
      urdu: ["رابطہ", "پیغام", "چیٹ", "شاعر سے بات"],
      english: ["contact", "message", "chat", "talk to poet"],
    },
    priority: 7,
    suggestions: [
      {
        text: {
          urdu: "چیٹ کھولیں",
          english: "Open chat",
        },
        action: "navigate",
        target: "/chat",
      },
      {
        text: {
          urdu: "مشہور شعراء",
          english: "Famous poets",
        },
        action: "navigate",
        target: "/poets",
      },
    ],
  },
  {
    question: {
      urdu: "تکنیکی مسئلہ ہے، کیا کروں؟",
      english: "Having technical issue, what to do?",
    },
    answer: {
      urdu: "تکنیکی مسئلے کے لیے:\n• پہلے صفحہ refresh کریں\n• براؤزر کی cache صاف کریں\n• دوبارہ لاگ ان کریں\n• اگر مسئلہ برقرار ہو تو سپورٹ ٹکٹ بنائیں\n• ہماری ٹیم جلد آپ کی مدد کرے گی",
      english:
        "For technical issues:\n• First refresh the page\n• Clear browser cache\n• Log in again\n• If problem persists, create support ticket\n• Our team will help you soon",
    },
    category: "technical",
    intent: "technical_support",
    keywords: {
      urdu: ["تکنیکی", "مسئلہ", "خرابی", "کام نہیں کر رہا"],
      english: ["technical", "issue", "problem", "not working"],
    },
    priority: 9,
    suggestions: [
      {
        text: {
          urdu: "سپورٹ ٹکٹ بنائیں",
          english: "Create support ticket",
        },
        action: "navigate",
        target: "/chat?tab=support",
      },
    ],
  },
];

async function seedFAQs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Clear existing FAQs
    await ChatbotFAQ.deleteMany({});
    console.log("🗑️  Cleared existing FAQs");

    // Insert FAQ data
    const faqs = await ChatbotFAQ.insertMany(faqData);
    console.log(`✅ Inserted ${faqs.length} FAQs`);

    console.log("\n📊 FAQ Categories:");
    const categories = await ChatbotFAQ.distinct("category");
    categories.forEach((cat) => {
      console.log(`  • ${cat}`);
    });

    console.log("\n✅ FAQ seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding FAQs:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run seeding
seedFAQs();
