import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
const User = (await import('../models/User.js')).default;
const admins = await User.find({role:'admin'}).select('name email role status isApproved').lean();
console.log(JSON.stringify(admins, null, 2));
process.exit(0);
