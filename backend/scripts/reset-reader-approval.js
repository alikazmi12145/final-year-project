import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function resetReaderApproval() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const userSchema = new mongoose.Schema({
      name: String, 
      email: String, 
      role: String, 
      status: String, 
      isApproved: Boolean
    });
    
    // Check if model already exists to avoid OverwriteModelError
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    
    // Find and update all readers to pending status
    const result = await User.updateMany(
      { role: 'reader', isApproved: true },
      { $set: { status: 'pending', isApproved: false } }
    );
    
    console.log('Updated readers:', result.modifiedCount);
    
    // Show updated readers
    const readers = await User.find({ role: 'reader' }).select('name email status isApproved');
    console.log('Current readers:');
    readers.forEach(r => console.log(`  - ${r.name} (${r.email}): status=${r.status}, isApproved=${r.isApproved}`));
    
    await mongoose.disconnect();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetReaderApproval();
