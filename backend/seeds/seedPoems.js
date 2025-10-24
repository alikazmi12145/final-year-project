// seedPoems.js
import mongoose from "mongoose";
import Poem from "../models/Poem.js";
import User from "../models/User.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://ali:12345@cluster0.3nhm5vo.mongodb.net/bazm-e-sukhan?retryWrites=true&w=majority&ssl=true";
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Poets
const poets = [
  { id: "68fb81df411b042d8d2dd27a", name: "علامہ محمد اقبال" },
  { id: "68fb81df411b042d8d2dd278", name: "مرزا اسداللہ خان غالب" },
  { id: "68fb81df411b042d8d2dd279", name: "میر تقی میر" },
  { id: "68fb81df411b042d8d2dd27b", name: "خوشحال خان خٹک" },
  { id: "68fb81df411b042d8d2dd27c", name: "ولی دکنی" },
];

// Sample poems (5 per poet)
const poemTemplates = {
  "علامہ محمد اقبال": [
    "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے، بتا تیری رضا کیا ہے؟",
    "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں",
    "نہیں ہے ناامید اقبال اپنی کشتِ ریزہ سے\nچمن میں پھولوں کی طرح بکھرے ہیں ارمان بھی",
    "خواب نہیں یہ کہ کوئی منزل آسان ہو\nخودی سے ہی پیدا ہوتا ہے انسان",
    "دل کو تجھ سے لگانا ہے، وقت کو نہیں\nاقبال کہتا ہے، حوصلہ ہی رہنما ہے",
  ],
  "مرزا اسداللہ خان غالب": [
    "دل ہی تو ہے نہ سنگ و خشت، درد سے بھر نہ آئے کیوں\nروئیں گے ہم ہزار بار، کوئی ہمیں ستائے کیوں",
    "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے\nبہت نکلے میرے ارمان لیکن پھر بھی کم نکلے",
    "دل سے دل تک کا سفر، غالب کا پیغام ہے\nعشق کے رنگ میں ہر اک رنگ کا مقام ہے",
    "کوئی امید بر نہیں آتی، کوئی صورت نظر نہیں آتی\nغم دل کے سوا، کچھ بھی نہیں آتا",
    "ہوئی مدت کہ غالب مر گیا، پر یادیں اس کی زندہ ہیں\nہر مصرعے میں زندگی کی کیفیت ہے",
  ],
  "میر تقی میر": [
    "پتا پتا، بوٹا بوٹا حال ہمارا جانے ہے\nجانے نہ جانے گل ہی نہ جانے، باغ تو سارا جانے ہے",
    "دل کی خوشبو سے مہک گیا فضا کا ہر کونہ\nمیر نے کہا یہ عشق بھی کیا شے ہے",
    "غم اور درد کی کہانی، میر کے ہر شعر میں ہے\nمحبت کی زبان، ہر دل کے قریب ہے",
    "ہجر اور وصال کی گلیوں میں میر نے قدم رکھا\nدل کی دنیا میں روشنی کا پیام لایا",
    "میر کہتا ہے، عشق نہ ہو تو زندگی ویران ہے\nدل کی بستی میں صرف یادیں شادان ہیں",
  ],
  "خوشحال خان خٹک": [
    "جو غیرت نہ رکھے دل میں، وہ مرد نہیں\nخوشحال کہتا ہے، وہ درد نہیں",
    "بازو میں طاقت، دل میں حوصلہ رکھو\nزمین و آسمان بھی تمہیں دیکھے گا",
    "محبت وطن سے ہو، تو زندگی روشن ہو\nخوشحال کے اشعار میں یہی سبق ہے",
    "دل میں حوصلہ، عمل میں قوت رکھو\nکامیابی تمہارے قدم چومے گی",
    "شاعر ہونا آسان نہیں، دل میں جذبہ ہونا چاہیے\nخوشحال کہتا ہے، یہی اصل خوبی ہے",
  ],
  "ولی دکنی": [
    "عشق نے دل کو جلایا، نور میں بدل دیا\nولی نے ہر مصرعے میں، اک جہاں بدل دیا",
    "دل کی محفل میں ہر نظر کو روشن کر دو\nشاعری سے زندگی کو ہمیش روشن کر دو",
    "ولی کہتا ہے، محبت اور یقین زندگی کی بنیاد ہیں\nشعر میں چھپی حقیقت، دل کو چھو لیتی ہے",
    "دل کی دنیا، لفظوں سے سجاؤ\nولی کے اشعار سے ہر لمحہ نکھارو",
    "محبت میں درد بھی ہوتا ہے، خوشی بھی\nولی دکنی کے اشعار میں زندگی کا ہر رنگ ہے",
  ],
};

// Function to create poems
const createPoems = async () => {
  try {
    // Get or create a system user for author field
    let systemUser = await User.findOne({ email: "test@admin.com" });
    if (!systemUser) {
      systemUser = await User.create({
        name: "System",
        email: "system@test.com",
        password: "Admin@123",
        role: "admin",
        isVerified: true,
      });
      console.log("System user created");
    }

    // Clear existing poems
    await Poem.deleteMany({});
    console.log("Existing poems cleared");

    for (const poet of poets) {
      for (let i = 0; i < 5; i++) {
        const poem = new Poem({
          title: `شعر ${i + 1}`,
          content: poemTemplates[poet.name][i],
          poet: poet.id, // Reference to Poet model
          author: systemUser._id, // Reference to User model
          category: "ghazal",
          subcategory: "classical",
          tags: ["کلاسیکل", "اردو", poet.name],
          mood: "philosophical",
          theme: "love",
          poetryLanguage: "urdu",
          script: "nastaliq",
          published: true,
          status: "approved", // Set status to approved so it shows up
        });
        await poem.save();
        console.log(`Poem ${i + 1} for ${poet.name} created`);
      }
    }
    console.log("All poems created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating poems:", error);
    process.exit(1);
  }
};

createPoems();
