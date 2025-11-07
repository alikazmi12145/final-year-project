import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("token");

      if (token) {
        const response = await authAPI.getMe();

        if (response.data.success) {
          setUser(response.data.user);
        } else {
          localStorage.removeItem("token");
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      // Clear any existing tokens first
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");

      setError("");
      setLoading(true);

      const response = await authAPI.login(credentials);

      if (response.data.success) {
        const token = response.data.accessToken || response.data.token;
        localStorage.setItem("token", token);
        setUser(response.data.user);

        // Redirect based on role or intended path
        const intendedPath =
          location.state?.from?.pathname ||
          getDefaultRoute(response.data.user.role);

        navigate(intendedPath, { replace: true });
        return { success: true };
      } else {
        setError(response.data.message || "Login failed");
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error("Login error:", error);

      let message = "Login failed. Please try again.";

      if (error.response?.status === 401) {
        message = "Invalid email or password";
      } else if (error.response?.status === 403) {
        const responseData = error.response.data;
        message =
          responseData?.message ||
          "Account access denied. Please check your account status.";

        // Return the specific error code for handling in UI
        return {
          success: false,
          message,
          code: responseData?.code,
        };
      } else if (error.response?.status === 500) {
        message = "Server error. Please try again later.";
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (
        error.code === "NETWORK_ERROR" ||
        error.message.includes("Network Error")
      ) {
        message =
          "Cannot connect to server. Please check if the server is running.";
      }

      setError(message);
      return { success: false, message, code: error.response?.data?.code };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError("");
      setLoading(true);

      const response = await authAPI.register(userData);

      if (response.data.success) {
        // For poet accounts requiring approval, don't log them in yet
        if (response.data.requiresApproval) {
          return {
            success: true,
            requiresApproval: true,
            message: response.data.message,
          };
        }

        // For readers or auto-approved accounts, proceed with login
        const token = response.data.accessToken || response.data.token;
        localStorage.setItem("token", token);
        setUser(response.data.user);

        navigate(getDefaultRoute(response.data.user.role), { replace: true });
        return { success: true };
      } else {
        setError(response.data.message || "Registration failed");
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error("Registration error:", error);
      const message =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("token");
      setUser(null);
      setError("");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const socialLogin = async (provider) => {
    try {
      setError("");
      setLoading(true);

      // Redirect to backend OAuth endpoint
      const baseURL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      // Remove any trailing /api if it exists, then add the full path
      const cleanBaseURL = baseURL.replace(/\/api$/, "");
      window.location.href = `${cleanBaseURL}/api/auth/${provider}`;
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setError(`${provider} login failed. Please try again.`);
      setLoading(false);
    }
  };

  const loginWithTokens = async (accessToken, refreshToken) => {
    try {
      setError("");
      setLoading(true);

      // Store tokens
      localStorage.setItem("token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      // Get user profile
      const response = await authAPI.getMe();

      if (response.data.success) {
        setUser(response.data.user);
        return { success: true };
      } else {
        throw new Error(response.data.message || "Failed to get user profile");
      }
    } catch (error) {
      console.error("OAuth login error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setError("OAuth login failed. Please try again.");
      return { success: false, message: "OAuth login failed" };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError("");
      setLoading(true);

      const response = await authAPI.forgotPassword(email);

      if (response.data.success) {
        return { success: true };
      } else {
        setError(response.data.message || "Failed to send reset email");
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      const message =
        error.response?.data?.message || "Failed to send reset email";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token, password) => {
    try {
      setError("");
      setLoading(true);

      const response = await authAPI.resetPassword({ token, password });

      if (response.data.success) {
        return { success: true };
      } else {
        setError(response.data.message || "Failed to reset password");
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error("Reset password error:", error);
      const message =
        error.response?.data?.message || "Failed to reset password";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token) => {
    try {
      setError("");
      setLoading(true);

      const response = await authAPI.verifyEmail(token);

      if (response.data.success) {
        // Update user data after verification
        setUser((prev) => ({ ...prev, isVerified: true }));
        return { success: true };
      } else {
        setError(response.data.message || "Email verification failed");
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error("Email verification error:", error);
      const message =
        error.response?.data?.message || "Email verification failed";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      setError("");
      setLoading(true);

      const response = await authAPI.resendVerificationEmail();

      if (response.data.success) {
        return { success: true };
      } else {
        setError(response.data.message || "Failed to send verification email");
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      const message =
        error.response?.data?.message || "Failed to send verification email";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const getDefaultRoute = (role) => {
    switch (role) {
      case "admin":
        return "/admin"; // top-level route exists in App.jsx
      case "poet":
        return "/poet";
      case "moderator":
        return "/moderator";
      default:
        return "/";
    }
  };

  const hasRole = (requiredRole) => {
    if (!user) return false;
    if (user.role === "admin") return true; // Admin has all access
    return user.role === requiredRole;
  };

  const hasAnyRole = (roles) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return roles.includes(user.role);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  const updateProfile = async (profileData) => {
    try {
      setError("");
      setLoading(true);

      // Use the users API endpoint for profile updates
      const response = await authAPI.getMe(); // Get current user first
      const updatedResponse = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
        }/api/users/me`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(profileData),
        }
      );

      const result = await updatedResponse.json();

      if (result.success) {
        setUser(result.user);
        return { success: true, user: result.user };
      } else {
        setError(result.message || "Profile update failed");
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("Profile update error:", error);
      const message = error.response?.data?.message || "Profile update failed";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    setError,
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    socialLogin,
    loginWithTokens,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
    isAdmin: user?.role === "admin",
    isPoet: user?.role === "poet",
    isReader: user?.role === "reader",
    isModerator: user?.role === "moderator",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
