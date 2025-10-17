import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";

// Check if Google OAuth is properly configured
const isGoogleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== "your-google-client-id-from-console" &&
  process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret-from-console";

if (!isGoogleConfigured) {
  console.log("⚠️ Google OAuth not configured - using placeholder strategy");
}

// OAuth Configuration - Google Strategy
if (isGoogleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
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
              facebook: {},
              github: {},
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

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ["id", "displayName", "email", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ "oauth.facebook.id": profile.id });

        if (user) {
          return done(null, user);
        }

        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.oauth.facebook = {
              id: profile.id,
              email: email,
            };
            await user.save();
            return done(null, user);
          }
        }

        user = new User({
          name: profile.displayName,
          email: email || `facebook_${profile.id}@bazm-e-sukhan.com`,
          role: "reader",
          status: "active",
          isVerified: true,
          profileImage: profile.photos?.[0]?.value,
          oauth: {
            facebook: {
              id: profile.id,
              email: email,
            },
          },
          emailVerification: {
            isVerified: true,
            verifiedAt: new Date(),
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

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/auth/github/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ "oauth.github.id": profile.id });

        if (user) {
          return done(null, user);
        }

        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.oauth.github = {
              id: profile.id,
              username: profile.username,
              email: email,
            };
            await user.save();
            return done(null, user);
          }
        }

        user = new User({
          name: profile.displayName || profile.username,
          email: email || `github_${profile.username}@bazm-e-sukhan.com`,
          role: "reader",
          status: "active",
          isVerified: true,
          profileImage: profile.photos?.[0]?.value,
          oauth: {
            github: {
              id: profile.id,
              username: profile.username,
              email: email,
            },
          },
          emailVerification: {
            isVerified: true,
            verifiedAt: new Date(),
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

export default passport;
