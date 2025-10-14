import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";
import Poem from "../models/Poem.js";
import Poet from "../models/poet.js";
import Contest from "../models/Contest.js";
import connectDB from "../config/database.js";

dotenv.config();

const seedData = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await User.deleteMany({});
    await Poem.deleteMany({});
    await Poet.deleteMany({});
    await Contest.deleteMany({});

    // Create admin user
    console.log("👑 Creating admin user...");
    const adminPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || "Admin@123456",
      12
    );
    const admin = new User({
      name: "Administrator",
      email: process.env.ADMIN_EMAIL || "admin@bazm-e-sukhan.com",
      password: adminPassword,
      role: "admin",
      isApproved: true,
      isVerified: true,
      status: "active",
      emailVerification: {
        isVerified: true,
      },
      bio: "System Administrator of Bazm-e-Sukhan platform",
      preferences: {
        language: "urdu",
        theme: "cultural",
      },
    });
    await admin.save();
    console.log("✅ Admin user created");

    // Create moderator user
    console.log("🛡️  Creating moderator user...");
    const moderatorPassword = await bcrypt.hash("Moderator@123", 12);
    const moderator = new User({
      name: "Moderator",
      email: "moderator@bazm-e-sukhan.com",
      password: moderatorPassword,
      role: "moderator",
      isApproved: true,
      isVerified: true,
      status: "active",
      emailVerification: {
        isVerified: true,
      },
      bio: "Content moderator for Bazm-e-Sukhan platform",
    });
    await moderator.save();
    console.log("✅ Moderator user created");

    // Create famous poets
    console.log("📚 Creating famous poets...");
    const poets = [
      {
        name: "Mirza Ghalib",
        urduName: "مرزا غالب",
        birthDate: new Date("1797-12-27"),
        deathDate: new Date("1869-02-15"),
        birthPlace: "Agra, India",
        biography:
          "Mirza Asadullah Khan Ghalib was a classical Urdu and Persian poet from the Mughal Empire during British colonial rule.",
        period: "Mughal Era",
        era: "classical",
        specializations: ["ghazal", "qasida", "rubai"],
        famousWorks: ["Diwan-e-Ghalib", "Urdu Diwan"],
        achievements: ["Greatest Urdu poet", "Master of Ghazal"],
        isLegendary: true,
      },
      {
        name: "Allama Iqbal",
        urduName: "علامہ اقبال",
        birthDate: new Date("1877-11-09"),
        deathDate: new Date("1938-04-21"),
        birthPlace: "Sialkot, Punjab",
        biography:
          "Sir Muhammad Iqbal was a poet, philosopher, theorist, and barrister who is widely regarded as having inspired the Pakistan Movement.",
        period: "Modern Era",
        era: "modern",
        specializations: ["nazm", "ghazal"],
        famousWorks: ["Bang-e-Dara", "Bal-e-Jibril", "Zarb-e-Kaleem"],
        achievements: ["Poet of the East", "Spiritual father of Pakistan"],
        isLegendary: true,
      },
      {
        name: "Faiz Ahmed Faiz",
        urduName: "فیض احمد فیض",
        birthDate: new Date("1911-02-13"),
        deathDate: new Date("1984-11-20"),
        birthPlace: "Sialkot, Punjab",
        biography:
          "Faiz Ahmed Faiz was a Pakistani poet and author and one of the most celebrated writers of the Urdu language.",
        period: "Contemporary",
        era: "progressive",
        specializations: ["nazm", "ghazal"],
        famousWorks: ["Naqsh-e-Faryadi", "Dast-e-Saba", "Zindan-Nama"],
        achievements: ["Lenin Peace Prize", "Progressive poet"],
        isLegendary: true,
      },
    ];

    const createdPoets = [];
    for (const poetData of poets) {
      const poet = new Poet(poetData);
      await poet.save();
      createdPoets.push(poet);
    }
    console.log("✅ Famous poets created");

    // Create poet users
    console.log("🎭 Creating poet users...");
    const poetUsers = [];
    for (let i = 0; i < createdPoets.length; i++) {
      const poetData = poets[i];
      const poetPassword = await bcrypt.hash("Poet@123456", 12);
      const poetUser = new User({
        name: poetData.name,
        email: `${poetData.name
          .toLowerCase()
          .replace(/ /g, ".")}@bazm-e-sukhan.com`,
        password: poetPassword,
        role: "poet",
        isApproved: true,
        isVerified: true,
        status: "active",
        emailVerification: {
          isVerified: true,
        },
        bio: poetData.biography.substring(0, 500),
        verificationBadge: "gold",
      });
      await poetUser.save();
      poetUsers.push(poetUser);
    }
    console.log("✅ Poet users created");

    // Create reader users
    console.log("👥 Creating reader users...");
    const readerUsers = [];
    const readerNames = [
      "Ahmed Ali",
      "Sara Khan",
      "Muhammad Hassan",
      "Fatima Sheikh",
      "Ali Raza",
    ];

    for (let i = 0; i < readerNames.length; i++) {
      const readerPassword = await bcrypt.hash("Reader@123", 12);
      const reader = new User({
        name: readerNames[i],
        email: `reader${i + 1}@bazm-e-sukhan.com`,
        password: readerPassword,
        role: "poet",
        isApproved: true,
        isVerified: true,
        status: "active",
        emailVerification: {
          isVerified: true,
        },
        bio: `Poetry enthusiast and reader at Bazm-e-Sukhan`,
      });
      await reader.save();
      readerUsers.push(reader);
    }
    console.log("✅ Reader users created");

    // Create sample poems
    console.log("🎨 Creating sample poems...");
    const samplePoems = [
      {
        title: "دل ہی تو ہے",
        content: `دل ہی تو ہے نہ سنگ و خشت درد سے بھر نہ آئے کیوں
روئیں گے ہم ہزار بار کوئی ہمیں ستائے کیوں

قتل میرے بعد کوشیش کا کچھ نہیں فائدہ
ہم کی کیاکر ڈالیں گے یہ لشکر آئے کیوں

دل میں صد خوں ہے صیاد کا، گھر میں بے یقینی
یہ سمجھ کر دل بھی گھر سے نکلا نہ جائے کیوں`,
        poet: createdPoets[0]._id,
        author: poetUsers[0]._id,
        category: "ghazal",
        theme: "love",
        mood: "sad",
        published: true,
        status: "published",
        tags: ["love", "heart", "pain", "ghalib"],
        featured: true,
      },
      {
        title: "شکوہ",
        content: `کیوں زیاں کار بندہ مومن کا احسان مانا جائے
یا کہ کہہ دے کوئی کہ تیرا گماں گذارا جائے

یوں ہی ہمیشہ الٹ نہ کرنا کمان پیچھے
پیٹ کی لیے آڑ ہی کہیں وہ تیر آئے جائے`,
        poet: createdPoets[1]._id,
        author: poetUsers[1]._id,
        category: "nazm",
        theme: "prayer",
        mood: "philosophical",
        published: true,
        status: "published",
        tags: ["iqbal", "philosophy", "spirituality"],
        featured: true,
      },
      {
        title: "مجھ سے پہلی سی محبت",
        content: `مجھ سے پہلی سی محبت میری محبوب نہ مانگ
میں نے سمجھا تھا کہ تو ہے تو درخشاں ہے حیات
تیرا غم ہے تو غم دہر کا جھگڑا کیا ہے
تیری صورت سے ہے عالم میں بہاروں کو ثبات`,
        poet: createdPoets[2]._id,
        author: poetUsers[2]._id,
        category: "nazm",
        theme: "love",
        mood: "romantic",
        published: true,
        status: "published",
        tags: ["faiz", "love", "romance", "progressive"],
        featured: true,
      },
    ];

    const createdPoems = [];
    for (const poemData of samplePoems) {
      const poem = new Poem(poemData);
      await poem.save();
      createdPoems.push(poem);
    }
    console.log("✅ Sample poems created");

    /* Skipping contest creation for now due to validation issues
    // Create a sample contest
    console.log("🏆 Creating sample contest...");
    const contest = new Contest({
      title: "غزل کی مقابلہ - 2025",
      description: "ایک بہترین غزل لکھیں اور انعام جیتیں۔ یہ مقابلہ تمام شاعروں کے لیے کھلا ہے۔",
      category: "ghazal",
      theme: "محبت اور جدائی",
      rules: [
        "غزل میں کم از کم 5 اشعار ہونے چاہیے",
        "ردیف اور قافیہ کا التزام ضروری ہے",
        "صرف اردو زبان میں شعر لکھے جائیں",
        "پہلے سے شائع شدہ شعر قبول نہیں"
      ],
      prizes: [
        { position: 1, prize: "10,000 روپے اور سند", description: "پہلی پوزیشن" },
        { position: 2, prize: "7,000 روپے اور سند", description: "دوسری پوزیشن" },
        { position: 3, prize: "5,000 روپے اور سند", description: "تیسری پوزیشن" }
      ],
      submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      votingDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      organizer: admin._id,
      judges: [moderator._id, poetUsers[0]._id],
      status: "active",
      maxParticipants: 100,
      entryFee: 0,
      language: "urdu",
      publicVoting: true
    });
    await contest.save();
    console.log("✅ Sample contest created");

    // Add some engagement to poems
    console.log("❤️  Adding engagement data...");
    for (let i = 0; i < createdPoems.length; i++) {
      const poem = createdPoems[i];
      
      // Add likes from random users
      const likingUsers = readerUsers.slice(0, Math.floor(Math.random() * readerUsers.length));
      for (const user of likingUsers) {
        await poem.addLike(user._id);
      }
      
      // Add views
      poem.views = Math.floor(Math.random() * 1000) + 100;
      
      // Add some ratings
      for (let j = 0; j < Math.min(3, readerUsers.length); j++) {
        const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars
        await poem.addRating(readerUsers[j]._id, rating, "بہت خوبصورت کلام!");
      }
      
      await poem.save();
    }
    console.log("✅ Engagement data added");
    */ // End of contest creation comment

    console.log(`
🎉 Database seeding completed successfully!

Created:
- 1 Admin user (${admin.email})
- 1 Moderator user (${moderator.email})
- ${createdPoets.length} Famous poets in database
- ${poetUsers.length} Poet users
- ${readerUsers.length} Reader users
- ${createdPoems.length} Sample poems

Login credentials:
- Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || "Admin@123456"}
- Moderator: ${moderator.email} / Moderator@123
- Poets: [poet-name]@bazm-e-sukhan.com / Poet@123456
- Readers: reader[1-5]@bazm-e-sukhan.com / Reader@123

🚀 You can now start the server and test the application!
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

// Run the seeding
seedData();
