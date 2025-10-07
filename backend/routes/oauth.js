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

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    try {
      const { accessToken, refreshToken } = generateTokens(req.user);
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.CLIENT_URL}/auth/success?token=${accessToken}&refresh=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/auth?error=oauth_failed`);
    }
  }
);

// Facebook OAuth routes
router.get('/facebook',
  passport.authenticate('facebook', { 
    scope: ['email'] 
  })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  (req, res) => {
    try {
      const { accessToken, refreshToken } = generateTokens(req.user);
      
      const redirectUrl = `${process.env.CLIENT_URL}/auth/success?token=${accessToken}&refresh=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Facebook OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/auth?error=oauth_failed`);
    }
  }
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { 
    scope: ['user:email'] 
  })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false }),
  (req, res) => {
    try {
      const { accessToken, refreshToken } = generateTokens(req.user);
      
      const redirectUrl = `${process.env.CLIENT_URL}/auth/success?token=${accessToken}&refresh=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/auth?error=oauth_failed`);
    }
  }
);

export default router;