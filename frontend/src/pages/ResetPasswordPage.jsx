import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import {
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Button } from "../components/ui/Button";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, loading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [isValidToken, setIsValidToken] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({ mode: "onChange" });

  // Check for reset token in URL
  useEffect(() => {
    const tokenParam = searchParams.get("token");

    if (tokenParam) {
      setToken(tokenParam);
      setIsValidToken(true);
    } else {
      setError("Invalid reset link. Please request a new password reset.");
      setIsValidToken(false);
    }
  }, [searchParams]);

  const handleResetPassword = async (data) => {
    try {
      setError("");
      setMessage("");

      if (data.password !== data.confirmPassword) {
        setError("پاس ورڈ میں فرق ہے - Passwords do not match");
        return;
      }

      const result = await resetPassword(token, data.password);

      if (result.success) {
        setMessage("پاس ورڈ کامیابی سے تبدیل ہو گیا!");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      } else {
        setError(result.message || "Failed to reset password");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 text-8xl text-urdu-maroon nastaleeq-heading">
            ❌
          </div>
          <div className="absolute top-40 right-20 text-6xl text-urdu-brown nastaleeq-heading">
            🔗
          </div>
          <div className="absolute bottom-20 left-1/3 text-7xl text-urdu-gold nastaleeq-heading">
            ⚠️
          </div>
        </div>

        <div className="max-w-md w-full">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-urdu-gold/20">
            {/* Error Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-4 shadow-lg">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-3xl font-bold text-red-700 mb-2 nastaleeq-heading">
                غلط لنک
              </h1>

              <h2 className="text-xl font-semibold text-red-600 mb-2">
                Invalid Reset Link
              </h2>

              <p className="text-gray-600 text-sm nastaleeq-primary">
                یہ ری سیٹ لنک غلط یا ختم ہو گیا ہے
              </p>
            </div>

            {/* Error Display */}
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium text-sm">{error}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={() => navigate("/forgot-password")}
                className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg nastaleeq-primary"
              >
                نیا ری سیٹ لنک مانگیں (Request New Reset Link)
              </Button>

              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 px-6 rounded-lg transition-colors nastaleeq-primary"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                واپس لاگ ان میں جائیں (Back to Login)
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 text-8xl text-urdu-maroon nastaleeq-heading">
          🔑
        </div>
        <div className="absolute top-40 right-20 text-6xl text-urdu-brown nastaleeq-heading">
          🛡️
        </div>
        <div className="absolute bottom-20 left-1/3 text-7xl text-urdu-gold nastaleeq-heading">
          🔐
        </div>
      </div>

      <div className="max-w-md w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-urdu-gold/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full mb-4 shadow-lg">
              <Lock className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-urdu-brown mb-2 nastaleeq-heading">
              نیا پاس ورڈ
            </h1>

            <h2 className="text-xl font-semibold text-urdu-maroon mb-2">
              Reset Password
            </h2>

            <p className="text-gray-600 text-sm nastaleeq-primary">
              اپنا نیا محفوظ پاس ورڈ بنائیں
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-700 font-medium text-sm">{message}</p>
                <p className="text-green-600 text-xs mt-1">
                  آپ کو خودکار طور پر لاگ ان صفحے پر بھیج دیا جائے گا
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          {!message && (
            <form
              onSubmit={handleSubmit(handleResetPassword)}
              className="space-y-6"
            >
              {/* New Password Field */}
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                  <Lock className="inline w-4 h-4 mr-2" />
                  نیا پاس ورڈ (New Password) *
                </label>
                <div className="relative">
                  <input
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message:
                          "Password must contain uppercase, lowercase and number",
                      },
                    })}
                    type={showPassword ? "text" : "password"}
                    placeholder="نیا محفوظ پاس ورڈ بنائیں"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                  <Shield className="inline w-4 h-4 mr-2" />
                  پاس ورڈ کی تصدیق (Confirm Password) *
                </label>
                <div className="relative">
                  <input
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === watch("password") || "Passwords do not match",
                    })}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="پاس ورڈ دوبارہ درج کریں"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-2 nastaleeq-primary">
                  پاس ورڈ کی شرائط:
                </h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center">
                    <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                    کم از کم 6 حروف
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                    کم از کم ایک بڑا اور چھوٹا حرف
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                    کم از کم ایک نمبر
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg nastaleeq-primary"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>
                      پاس ورڈ تبدیل کیا جا رہا ہے... (Updating Password...)
                    </span>
                  </div>
                ) : (
                  <span>نیا پاس ورڈ محفوظ کریں (Save New Password)</span>
                )}
              </Button>
            </form>
          )}

          {/* Navigation Links */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-2 nastaleeq-primary">یاد آ گیا؟</p>
            <button
              onClick={() => navigate("/auth")}
              className="text-urdu-maroon hover:text-urdu-brown font-semibold transition-colors nastaleeq-primary"
            >
              واپس لاگ ان میں جائیں (Back to Login)
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-800 mb-2 flex items-center nastaleeq-primary">
              <Shield className="w-4 h-4 mr-2" />
              سیکورٹی نوٹ
            </h5>
            <p className="text-blue-700 text-sm nastaleeq-primary">
              پاس ورڈ تبدیل کرنے کے بعد تمام ڈیوائسز سے لاگ آؤٹ ہو جائیں گے
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
