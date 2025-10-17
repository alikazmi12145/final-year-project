import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Button } from "../components/ui/Button";

const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { forgotPassword, resetPassword, loading } = useAuth();

  const [step, setStep] = useState("request"); // request, sent, reset, success
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({ mode: "onChange" });

  // Check for reset token in URL
  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");

    if (token) {
      setResetToken(token);
      setStep("reset");
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, [searchParams]);

  const handleForgotPassword = async (data) => {
    try {
      setError("");
      setMessage("");

      const result = await forgotPassword(data.email);

      if (result.success) {
        setEmail(data.email);
        setStep("sent");
        setMessage("پاس ورڈ ری سیٹ لنک آپ کے ای میل پر بھیج دیا گیا ہے۔");
      } else {
        setError(result.message || "Failed to send reset email");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleResetPassword = async (data) => {
    try {
      setError("");
      setMessage("");

      if (data.password !== data.confirmPassword) {
        setError("پاس ورڈ میں فرق ہے - Passwords do not match");
        return;
      }

      const result = await resetPassword(resetToken, data.password);

      if (result.success) {
        setStep("success");
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

  const renderRequestStep = () => (
    <form onSubmit={handleSubmit(handleForgotPassword)} className="space-y-6">
      {/* Email Field */}
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
          <Mail className="inline w-4 h-4 mr-2" />
          آپ کا رجسٹرڈ ای میل (Your Registered Email) *
        </label>
        <input
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address",
            },
          })}
          type="email"
          placeholder="example@gmail.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all"
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
        )}
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
            <span>ای میل بھیجا جا رہا ہے... (Sending Email...)</span>
          </div>
        ) : (
          <span>پاس ورڈ ری سیٹ لنک بھیجیں (Send Reset Link)</span>
        )}
      </Button>
    </form>
  );

  const renderSentStep = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-6 shadow-lg">
        <Mail className="w-10 h-10 text-white" />
      </div>

      <div>
        <h3 className="text-xl font-bold text-green-700 mb-2 nastaleeq-heading">
          ای میل بھیج دیا گیا!
        </h3>
        <h4 className="text-lg font-semibold text-green-600 mb-4">
          Email Sent Successfully!
        </h4>
        <p className="text-gray-600 nastaleeq-primary leading-relaxed">
          <span className="block mb-2">
            پاس ورڈ ری سیٹ لنک <strong>{email}</strong> پر بھیج دیا گیا ہے
          </span>
          <span className="text-sm">
            Password reset link has been sent to your email address. Please
            check your inbox and spam folder.
          </span>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">
          اگلے قدامات - Next Steps:
        </h5>
        <ul className="text-sm text-blue-700 space-y-1 text-right nastaleeq-primary">
          <li>• اپنا ای میل چیک کریں</li>
          <li>• "پاس ورڈ ری سیٹ" لنک پر کلک کریں</li>
          <li>• نیا پاس ورڈ بنائیں</li>
          <li>• نئے پاس ورڈ سے لاگ ان کریں</li>
        </ul>
      </div>

      <Button
        onClick={() => setStep("request")}
        className="bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 px-6 rounded-lg transition-colors nastaleeq-primary"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />
        دوبارہ کوشش (Try Again)
      </Button>
    </div>
  );

  const renderResetStep = () => (
    <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-6">
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
          <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
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
            <span>پاس ورڈ تبدیل کیا جا رہا ہے... (Updating Password...)</span>
          </div>
        ) : (
          <span>نیا پاس ورڈ محفوظ کریں (Save New Password)</span>
        )}
      </Button>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-6 shadow-lg">
        <CheckCircle className="w-10 h-10 text-white" />
      </div>

      <div>
        <h3 className="text-xl font-bold text-green-700 mb-2 nastaleeq-heading">
          پاس ورڈ تبدیل ہو گیا!
        </h3>
        <h4 className="text-lg font-semibold text-green-600 mb-4">
          Password Updated Successfully!
        </h4>
        <p className="text-gray-600 nastaleeq-primary leading-relaxed">
          <span className="block mb-2">
            آپ کا پاس ورڈ کامیابی سے تبدیل ہو گیا ہے
          </span>
          <span className="text-sm">
            Your password has been successfully updated. You will be redirected
            to the login page shortly.
          </span>
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-700 text-sm nastaleeq-primary">
          <strong>اگلا قدم:</strong> آپ کو خودکار طور پر لاگ ان صفحے پر بھیج دیا
          جائے گا
        </p>
      </div>

      <Button
        onClick={() => navigate("/auth")}
        className="bg-urdu-maroon text-white hover:bg-urdu-brown py-3 px-8 rounded-lg transition-colors nastaleeq-primary"
      >
        اب لاگ ان کریں (Login Now)
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 text-8xl text-urdu-maroon nastaleeq-heading">
          🔒
        </div>
        <div className="absolute top-40 right-20 text-6xl text-urdu-brown nastaleeq-heading">
          🔑
        </div>
        <div className="absolute bottom-20 left-1/3 text-7xl text-urdu-gold nastaleeq-heading">
          🛡️
        </div>
      </div>

      <div className="max-w-md w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-urdu-gold/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full mb-4 shadow-lg">
              {step === "request" && <Mail className="w-10 h-10 text-white" />}
              {step === "sent" && <Mail className="w-10 h-10 text-white" />}
              {step === "reset" && <Lock className="w-10 h-10 text-white" />}
              {step === "success" && (
                <CheckCircle className="w-10 h-10 text-white" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-urdu-brown mb-2 nastaleeq-heading">
              {step === "request" && "پاس ورڈ بھول گئے"}
              {step === "sent" && "ای میل بھیج دیا گیا"}
              {step === "reset" && "نیا پاس ورڈ"}
              {step === "success" && "کامیابی!"}
            </h1>

            <h2 className="text-xl font-semibold text-urdu-maroon mb-2">
              {step === "request" && "Forgot Password"}
              {step === "sent" && "Email Sent"}
              {step === "reset" && "Reset Password"}
              {step === "success" && "Success!"}
            </h2>

            <p className="text-gray-600 text-sm nastaleeq-primary">
              {step === "request" && "اپنا رجسٹرڈ ای میل ایڈریس درج کریں"}
              {step === "sent" && "آپ کے ای میل پر ری سیٹ لنک بھیج دیا گیا"}
              {step === "reset" && "اپنا نیا محفوظ پاس ورڈ بنائیں"}
              {step === "success" && "آپ کا پاس ورڈ کامیابی سے تبدیل ہو گیا"}
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
              </div>
            </div>
          )}

          {/* Step Content */}
          <div>
            {step === "request" && renderRequestStep()}
            {step === "sent" && renderSentStep()}
            {step === "reset" && renderResetStep()}
            {step === "success" && renderSuccessStep()}
          </div>

          {/* Navigation Links */}
          {(step === "request" || step === "reset") && (
            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-2 nastaleeq-primary">یاد آ گیا؟</p>
              <button
                onClick={() => navigate("/auth")}
                className="text-urdu-maroon hover:text-urdu-brown font-semibold transition-colors nastaleeq-primary"
              >
                واپس لاگ ان میں جائیں (Back to Login)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
