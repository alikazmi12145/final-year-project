import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Poem from '../models/Poem.js';

dotenv.config();

const publishPoem = async (poemId) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const poem = await Poem.findById(poemId);
    
    if (!poem) {
      console.log('❌ Poem not found');
      process.exit(1);
    }

    console.log('📝 Current poem status:', {
      title: poem.title,
      published: poem.published,
      status: poem.status
    });

    poem.published = true;
    poem.status = 'approved';
    await poem.save();

    console.log('✅ Poem published successfully');
    console.log('📝 New poem status:', {
      published: poem.published,
      status: poem.status
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

const poemId = process.argv[2];
if (!poemId) {
  console.log('❌ Please provide poem ID');
  console.log('Usage: node scripts/publish-poem-by-id.js <poemId>');
  process.exit(1);
}

publishPoem(poemId);
