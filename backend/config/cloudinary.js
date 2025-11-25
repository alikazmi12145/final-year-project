import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify configuration
const config = cloudinary.config();
console.log('☁️ Cloudinary Configuration:', {
  cloud_name: config.cloud_name ? '✓ Configured' : '✗ Missing',
  api_key: config.api_key ? '✓ Configured' : '✗ Missing',
  api_secret: config.api_secret ? '✓ Configured' : '✗ Missing'
});

if (!config.cloud_name || !config.api_key || !config.api_secret) {
  console.error('⚠️ WARNING: Cloudinary credentials are not properly configured!');
  console.error('Please check your .env file and ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.');
}

export default cloudinary;
