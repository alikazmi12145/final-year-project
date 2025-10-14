import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { CulturalElements } from "../components/ui/CulturalElements";
import api from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    setTokenValid(true);
  }, [token]);

  const validateForm = () => {
    const newErrors = {};

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/auth/reset-password", {
        token,
        password: formData.password,
      });

      if (response.data.success) {
        setIsSubmitted(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/auth?tab=login", {
            state: {
              message: "Password reset successfully! You can now log in.",
            },
          });
        }, 3000);
      } else {
        setErrors({
          submit: response.data.message || "Password reset failed",
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);

      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else if (error.response?.status === 400) {
        setErrors({ submit: "Invalid or expired reset token" });
      } else {
        setErrors({ submit: "Password reset failed. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt(
      "Please enter your email address to request a new reset link:"
    );
    if (!email) return;

    try {
      setIsLoading(true);
      const response = await api.post("/auth/forgot-password", { email });

      if (response.data.success) {
        alert("Password reset link sent! Please check your inbox.");
      } else {
        alert("Failed to send reset email: " + response.data.message);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      alert("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <CulturalElements />

        <Card className="w-full max-w-md p-8 text-center relative z-10 bg-white/90 backdrop-blur-sm">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Invalid Reset Link
          </h1>
          <h2 className="text-lg text-gray-600 mb-4" dir="rtl">
            غلط ری سیٹ لنک
          </h2>

          <div className="space-y-4">
            <p className="text-gray-600">
              The password reset link is invalid or missing.
            </p>
            <p className="text-sm text-gray-500" dir="rtl">
              پاس ورڈ ری سیٹ لنک غلط ہے یا موجود نہیں۔
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleForgotPassword}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner size="small" /> : null}
                Request New Reset Link
              </Button>

              <Button
                onClick={() => navigate("/auth?tab=login")}
                variant="ghost"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <CulturalElements />

        <Card className="w-full max-w-md p-8 text-center relative z-10 bg-white/90 backdrop-blur-sm">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Password Reset Successfully
          </h1>
          <h2 className="text-lg text-gray-600 mb-4" dir="rtl">
            پاس ورڈ کامیابی سے ری سیٹ ہو گیا
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-800">
                <p className="font-medium">🎉 Success!</p>
                <p className="text-sm mt-2">
                  Your password has been reset successfully. Redirecting to
                  login...
                </p>
                <p className="text-sm mt-2 text-right" dir="rtl">
                  آپ کا پاس ورڈ کامیابی سے ری سیٹ ہو گیا۔ لاگ ان پیج پر بھیج رہے
                  ہیں...
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate("/auth?tab=login")}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Continue to Login / لاگ ان کریں
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <CulturalElements />

      <Card className="w-full max-w-md p-8 relative z-10 bg-white/90 backdrop-blur-sm">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Reset Password
          </h1>
          <h2 className="text-lg text-gray-600 mb-4" dir="rtl">
            نیا پاس ورڈ بنائیں
          </h2>
          <p className="text-gray-600 text-sm">Enter your new password below</p>
          <p className="text-gray-500 text-xs mt-1" dir="rtl">
            نیچے اپنا نیا پاس ورڈ داخل کریں
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              name="password"
              placeholder="New Password / نیا پاس ورڈ"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password / پاس ورڈ کی تصدیق"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              disabled={isLoading}
              required
            />
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="small" /> : null}
              Reset Password / پاس ورڈ ری سیٹ کریں
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/auth?tab=login")}
              disabled={isLoading}
            >
              Back to Login / واپس لاگ ان پر
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Password Requirements:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• At least 6 characters</li>
              <li>• One uppercase letter</li>
              <li>• One lowercase letter</li>
              <li>• One number</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            Need help?{" "}
            <button
              onClick={() => navigate("/contact")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact Support
            </button>
          </p>
          <p className="text-xs text-gray-400 mt-2 text-center" dir="rtl">
            مدد چاہیے؟ سپورٹ سے رابطہ کریں
          </p>
        </div>
      </Card>
    </div>
  );
}
