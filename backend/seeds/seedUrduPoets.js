import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// import Poet from "./models/Poet.js"; // adjust path if needed
import Poet from "../models/poet.js";

const seedUrduPoets = async () => {
  

  await mongoose.connect("mongodb+srv://ali:12345@cluster0.3nhm5vo.mongodb.net/bazm-e-sukhan?retryWrites=true&w=majority&ssl=true", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const poets = [
    {
      name: "مرزا اسداللہ خان غالب",
      penName: "غالب",
      fullName: "مرزا اسداللہ بیگ خان",
      dateOfBirth: new Date("1797-12-27"),
      dateOfDeath: new Date("1869-02-15"),
      isDeceased: true,
      birthPlace: {
        city: "دہلی",
        region: "مغل سلطنت",
        country: "برطانوی ہند (موجودہ بھارت)"
      },
      nationality: "ہندوستانی",
      languages: ["urdu"],
      bio: "مرزا غالب اردو کے سب سے عظیم شعرا میں شمار ہوتے ہیں۔ ان کے کلام میں فلسفہ، عشق اور انسانی احساسات کی گہرائی پائی جاتی ہے۔",
      shortBio: "اردو غزل کے عظیم شاعر۔",
      era: "classical",
      period: { from: 1797, to: 1869 },
      poeticStyle: ["ghazal"],
      schoolOfThought: "traditional",
      profileImage: {
        url: "https://upload.wikimedia.org/wikipedia/commons/5/52/Mirza_Ghalib.jpg",
        publicId: "ghalib_profile"
      },
      tags: ["غزل", "اردو کلاسیکل شاعری", "دہلی اسکول"],
      featured: true,
    },
    {
      name: "میر تقی میر",
      penName: "میر",
      fullName: "میر محمد تقی میر",
      dateOfBirth: new Date("1723-02-01"),
      dateOfDeath: new Date("1810-09-21"),
      isDeceased: true,
      birthPlace: {
        city: "آگرہ",
        region: "اتر پردیش",
        country: "برطانوی ہند (موجودہ بھارت)"
      },
      nationality: "ہندوستانی",
      languages: ["urdu"],
      bio: "میر تقی میر اردو غزل کے بانیوں میں سے ہیں۔ ان کے کلام میں درد، عشق اور انسان دوستی کا گہرا رنگ ملتا ہے۔",
      shortBio: "اردو غزل کے بانی شاعر۔",
      era: "classical",
      period: { from: 1723, to: 1810 },
      poeticStyle: ["ghazal"],
      schoolOfThought: "traditional",
      profileImage: {
        url: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Mir_Taqi_Mir.jpg",
        publicId: "mir_taqi_mir"
      },
      tags: ["کلاسیکل", "غزل", "درد و غم"],
      featured: true,
    },
    {
      name: "علامہ محمد اقبال",
      penName: "اقبال",
      fullName: "محمد اقبال",
      dateOfBirth: new Date("1877-11-09"),
      dateOfDeath: new Date("1938-04-21"),
      isDeceased: true,
      birthPlace: {
        city: "سیالکوٹ",
        region: "پنجاب",
        country: "برطانوی ہند (موجودہ پاکستان)"
      },
      nationality: "پاکستانی",
      languages: ["urdu"],
      bio: "اقبال شاعر مشرق کہلاتے ہیں۔ ان کے کلام میں خودی، اسلام اور روحانی بیداری کا پیغام ہے۔",
      shortBio: "شاعرِ مشرق۔",
      era: "classical",
      period: { from: 1877, to: 1938 },
      poeticStyle: ["nazm", "ghazal"],
      schoolOfThought: "sufi",
      profileImage: {
        url: "https://upload.wikimedia.org/wikipedia/commons/2/28/Allama_Iqbal.jpg",
        publicId: "iqbal_profile"
      },
      tags: ["خودی", "اسلامی فلسفہ", "شاعرِ مشرق"],
      featured: true,
    },
    {
      name: "خوشحال خان خٹک",
      penName: "خوشحال",
      fullName: "خوشحال خان خٹک",
      dateOfBirth: new Date("1613-01-01"),
      dateOfDeath: new Date("1689-02-25"),
      isDeceased: true,
      birthPlace: {
        city: "اکورا خٹک",
        region: "خیبر پختونخوا",
        country: "مغل سلطنت (موجودہ پاکستان)"
      },
      nationality: "پٹھان / پاکستانی",
      languages: ["urdu", "punjabi", "other"],
      bio: "خوشحال خان خٹک ایک مجاہد شاعر تھے جنہوں نے غیرت، بہادری اور حب الوطنی پر شاعری کی۔",
      shortBio: "مجاہد اور فلسفی شاعر۔",
      era: "classical",
      period: { from: 1613, to: 1689 },
      poeticStyle: ["nazm", "ghazal"],
      schoolOfThought: "political",
      profileImage: {
        url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Khushal_Khan_Khattak.jpg",
        publicId: "khushal_khan"
      },
      tags: ["پٹھان شاعر", "حب الوطنی", "کلاسیکل"],
      featured: true,
    },
    {
      name: "ولی دکنی",
      penName: "ولی",
      fullName: "ولی محمد ولی",
      dateOfBirth: new Date("1667-01-01"),
      dateOfDeath: new Date("1707-01-01"),
      isDeceased: true,
      birthPlace: {
        city: "اورنگ آباد",
        region: "دکن",
        country: "مغل سلطنت (موجودہ بھارت)"
      },
      nationality: "ہندوستانی",
      languages: ["urdu"],
      bio: "ولی دکنی کو اردو شاعری کا بابا آدم کہا جاتا ہے۔ انہوں نے اردو غزل کو پہچان دی۔",
      shortBio: "اردو شاعری کے بانی۔",
      era: "classical",
      period: { from: 1667, to: 1707 },
      poeticStyle: ["ghazal"],
      schoolOfThought: "traditional",
      profileImage: {
        url: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Wali_Dakhni.jpg",
        publicId: "wali_dakhni"
      },
      tags: ["دکنی", "غزل", "کلاسیکل شاعر"],
      featured: true,
    }
  ];

  try {
    await Poet.deleteMany({});
    const created = await Poet.insertMany(poets);
    console.log("✅ 5 Classical Urdu Poets Added:");
    created.forEach((p) => console.log(`- ${p.name} (${p.penName})`));
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    mongoose.disconnect();
  }
};

seedUrduPoets();
