import mongoose from 'mongoose';
import Poem from '../models/Poem.js';
import dotenv from 'dotenv';

dotenv.config();

const publishPoem = async (poemId) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Poem.updateOne(
      { _id: poemId },
      { $set: { published: true, status: 'approved', publishedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Poem ${poemId} has been published and approved`);
      const poem = await Poem.findById(poemId);
      console.log(`   Title: ${poem.title}`);
      console.log(`   Status: ${poem.status}`);
      console.log(`   Published: ${poem.published}`);
    } else {
      console.log(`❌ Poem ${poemId} not found or already published`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

const poemId = process.argv[2] || '691401c8b30597e2edb0a86e';
publishPoem(poemId);
