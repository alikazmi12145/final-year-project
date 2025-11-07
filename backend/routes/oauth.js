import express from "express";
import jwt from "jsonwebtoken";
import "../config/passport.js"; // Initialize passport strategies
import passport from "passport";

const router = express.Router();

// Helper function to generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      status: user.status,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

// Check if Google OAuth is configured
const isGoogleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET_KEY) &&
  process.env.GOOGLE_CLIENT_ID !== "your-google-client-id-from-console" &&
  (process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret-from-console" ||
   process.env.GOOGLE_SECRET_KEY !== "your-google-secret-key");

// Development mode: Allow bypass for testing (remove in production)
const isDevelopment = process.env.NODE_ENV === "development";
const allowOAuthBypass = isDevelopment && !isGoogleConfigured;

// Google OAuth routes
router.get("/google", (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  if (!isGoogleConfigured && !allowOAuthBypass) {
    return res.redirect(
      `${clientUrl}/auth?error=google_not_configured&message=Google OAuth is not configured. Please contact administrator.`
    );
  }

  // Development bypass: Create a mock Google user
  if (allowOAuthBypass) {
    console.log("🚧 Development Mode: Using mock Google OAuth");
    return res.redirect(
      `${clientUrl}/auth/oauth-success?accessToken=mock-dev-token&refreshToken=mock-refresh-token&dev=true`
    );
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  if (!isGoogleConfigured) {
    return res.redirect(
      `${clientUrl}/auth?error=google_not_configured&message=Google OAuth is not configured. Please contact administrator.`
    );
  }
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Google OAuth authentication error:", err);
      return res.redirect(
        `${clientUrl}/auth?error=oauth_failed&message=Authentication error occurred`
      );
    }

    if (!user) {
      console.error("Google OAuth no user:", info);
      return res.redirect(
        `${clientUrl}/auth?error=oauth_failed&message=User not found or authentication failed`
      );
    }

    // Check if poet account is pending approval
    if (user.role === "poet" && user.status === "pending") {
      return res.redirect(
        `${clientUrl}/auth?error=poet_pending_approval&message=Your poet account is pending admin approval. Please wait for approval.`
      );
    }

    try {
      const { accessToken, refreshToken } = generateTokens(user);

      // Redirect to frontend OAuth success handler with tokens
      const redirectUrl = `${clientUrl}/auth/oauth-success?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (tokenError) {
      console.error("Token generation error:", tokenError);
      res.redirect(
        `${clientUrl}/auth?error=oauth_failed&message=Token generation failed`
      );
    }
  })(req, res, next);
});

export default router;
