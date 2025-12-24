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
        setError("Passwords do not match");
        return;
      }

      const result = await resetPassword(token, data.password);

      if (result.success) {
        setMessage("Password changed successfully!");

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
      <div dir="ltr" className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-4 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-10 left-10 text-6xl text-urdu-maroon nastaleeq-heading">ب</div>
          <div className="absolute top-20 right-20 text-5xl text-urdu-brown nastaleeq-heading">ز</div>
          <div className="absolute bottom-20 left-1/4 text-5xl text-urdu-gold nastaleeq-heading">م</div>
          <div className="absolute top-1/3 right-10 text-4xl text-urdu-maroon nastaleeq-heading">س</div>
        </div>
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-urdu-gold/20 p-4 sm:p-5">
            <div className="text-center mb-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-2 shadow-lg">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-red-700">Invalid Reset Link</h1>
              <p className="text-xs text-gray-500">This reset link is invalid or has expired</p>
            </div>
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 font-medium text-xs">{error}</p>
            </div>
            <div className="space-y-2">
              <Button onClick={() => navigate("/forgot-password")} className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all text-sm">
                Request New Reset Link
              </Button>
              <Button onClick={() => navigate("/auth")} className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-1.5 rounded-lg transition-all hover:shadow-md text-xs">
                <ArrowLeft className="w-3 h-3 inline mr-1" />Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="ltr" className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-4 px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl text-urdu-maroon nastaleeq-heading">ب</div>
        <div className="absolute top-20 right-20 text-5xl text-urdu-brown nastaleeq-heading">ز</div>
        <div className="absolute bottom-20 left-1/4 text-5xl text-urdu-gold nastaleeq-heading">م</div>
        <div className="absolute top-1/3 right-10 text-4xl text-urdu-maroon nastaleeq-heading">س</div>
      </div>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-urdu-gold/20">
          <div className="p-4 sm:p-5">
            <div className="text-center mb-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full mb-2 shadow-lg">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-urdu-brown">Reset Password</h1>
              <p className="text-xs text-gray-500">Create your new secure password</p>
            </div>

            {error && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 font-medium text-xs">{error}</p>
              </div>
            )}

            {message && (
              <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-green-700 font-medium text-xs">{message}</p>
                  <p className="text-green-600 text-xs mt-0.5">Redirecting to login page...</p>
                </div>
              </div>
            )}

            {!message && (
              <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register("password", {
                        required: "Password is required",
                        minLength: { value: 8, message: "Min 8 chars" },
                        pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: "Need A-Z, a-z, 0-9" },
                      })}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      className="w-full px-3 py-1.5 text-sm pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all duration-200 hover:border-urdu-gold/50"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-urdu-maroon transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-0.5 text-left">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register("confirmPassword", {
                        required: "Confirm password",
                        validate: (value) => value === watch("password") || "Passwords don't match",
                      })}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      className="w-full px-3 py-1.5 text-sm pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all duration-200 hover:border-urdu-gold/50"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-urdu-maroon transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-0.5 text-left">{errors.confirmPassword.message}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all text-sm mt-3">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <span>Save New Password</span>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-3 text-center">
              <span className="text-gray-500 text-xs">Remember your password? </span>
              <button onClick={() => navigate("/auth")} className="text-urdu-maroon hover:text-urdu-brown font-semibold text-xs hover:underline">
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
