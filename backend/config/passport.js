import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

// Check if Google OAuth is properly configured
const isGoogleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET_KEY) &&
  process.env.GOOGLE_CLIENT_ID !== "your-google-client-id-from-console" &&
  (process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret-from-console" ||
   process.env.GOOGLE_SECRET_KEY !== "your-google-secret-key");

if (!isGoogleConfigured) {
  console.log("⚠️ Google OAuth not configured - using placeholder strategy");
}

// OAuth Configuration - Google Strategy
if (isGoogleConfigured) {
  const serverUrl = process.env.SERVER_URL || "http://localhost:5001";
  const callbackURL = `${serverUrl}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET_KEY;

  console.log("✅ Google OAuth configured successfully");

  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Google ID
          let user = await User.findOne({ "oauth.google.id": profile.id });

          if (user) {
            return done(null, user);
          }

          // Check if user exists with this email
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google account to existing user
            user.oauth.google = {
              id: profile.id,
              email: profile.emails[0].value,
            };
            await user.save();
            return done(null, user);
          }

          // Create new user
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            role: "reader",
            status: "active",
            isVerified: true, // Google emails are pre-verified
            isApproved: true,
            profileImage: {
              url: profile.photos?.[0]?.value || "",
              publicId: "",
            },
            oauth: {
              google: {
                id: profile.id,
                email: profile.emails[0].value,
              },
            },
            emailVerification: {
              isVerified: true,
              verifiedAt: new Date(),
            },
            preferences: {
              language: "urdu",
              theme: "cultural",
              notifications: {
                email: true,
                push: false,
                contests: true,
                newPoetry: true,
              },
            },
          });

          await user.save();
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
