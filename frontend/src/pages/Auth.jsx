import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Star,
  Shield,
  Feather,
} from "lucide-react";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Button } from "../components/ui/Button";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { login, register, loading, error, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({ mode: "onChange" });

  useEffect(() => {
    setError("");
    setSuccessMessage("");
    reset();
  }, [isLogin, setError, reset]);

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (data) => {
    try {
      console.log("🔄 Form submission:", { email: data.email, isLogin });
      setError("");
      setSuccessMessage("");

      let result;
      if (isLogin) {
        setSuccessMessage("تصدیق کی جا رہی ہے... (Authenticating...)");
        result = await login({ email: data.email, password: data.password });
      } else {
        if (data.password !== data.confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        setSuccessMessage("اکاؤنٹ بنایا جا رہا ہے... (Creating account...)");
        result = await register({
          name: data.name,
          email: data.email,
          password: data.password,
        });
      }

      console.log("📋 Auth result:", result);

      if (result?.success) {
        console.log("✅ Authentication successful");
        setSuccessMessage(
          isLogin
            ? "کامیابی سے لاگ ان ہو گئے! ریڈائریکٹ ہو رہے ہیں... (Successfully logged in! Redirecting...)"
            : "اکاؤنٹ کامیابی سے بن گیا! ریڈائریکٹ ہو رہے ہیں... (Account created successfully! Redirecting...)"
        );

        // Add a small delay to show success message
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 1500);
      } else {
        console.log("❌ Authentication failed:", result?.message);
        setError(result?.message || "Authentication failed. Please try again.");
        setSuccessMessage("");
      }
    } catch (error) {
      console.error("💥 Authentication error:", error);
      setError("An unexpected error occurred. Please try again.");
      setSuccessMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 text-8xl text-urdu-maroon font-urdu">
          ب
        </div>
        <div className="absolute top-40 right-20 text-6xl text-urdu-brown font-urdu">
          ز
        </div>
        <div className="absolute bottom-20 left-1/3 text-7xl text-urdu-gold font-urdu">
          م
        </div>
        <div className="absolute top-1/3 right-10 text-5xl text-urdu-maroon font-urdu">
          س
        </div>
      </div>

      <div className="max-w-6xl w-full flex gap-8 items-center">
        {/* Reader Auto-Registration Info Card */}
        <div className="hidden lg:block w-1/3">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-urdu-gold/20">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-urdu-brown mb-2">
                آسان رجسٹریشن
              </h3>
              <h4 className="text-lg font-semibold text-urdu-maroon mb-2">
                Easy Registration
              </h4>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-urdu-brown font-medium">
                    قارئین کے لیے: صرف لاگ ان کریں
                  </p>
                  <p className="text-gray-600">
                    For Readers: Just login with email & password
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-urdu-brown font-medium">
                    خودکار اکاؤنٹ بنایا جائے گا
                  </p>
                  <p className="text-gray-600">Account created automatically</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-urdu-gold rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-urdu-brown font-medium">فوری رسائی</p>
                  <p className="text-gray-600">Immediate access to poetry</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 text-center">
                No registration needed for readers!
                <br />
                <span className="font-urdu">
                  قارئین کو رجسٹریشن کی ضرورت نہیں!
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="w-full lg:w-2/3 max-w-md mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-urdu-gold/20">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full mb-4 shadow-lg">
                {isLogin ? (
                  <Lock className="w-10 h-10 text-white" />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-urdu-brown mb-2 font-urdu">
                {isLogin ? "داخل ہوں" : "رجسٹر کریں"}
              </h1>
              <h2 className="text-xl font-semibold text-urdu-maroon mb-2">
                {isLogin ? "Login" : "Register"}
              </h2>
              <p className="text-gray-600 text-sm">
                {isLogin ? "اپنے اکاؤنٹ میں داخل ہوں" : "نیا اکاؤنٹ بنائیں"}
              </p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      {successMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name Field - Only for Registration */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-urdu-brown mb-2">
                    <User className="inline w-4 h-4 mr-2" />
                    نام (Name) *
                  </label>
                  <input
                    {...registerField("name", {
                      required: "Name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                    type="text"
                    placeholder="اپنا نام لکھیں / Enter your name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all text-right"
                    style={{ direction: "rtl" }}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2">
                  <Mail className="inline w-4 h-4 mr-2" />
                  ای میل (Email) *
                </label>
                <input
                  {...registerField("email", {
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
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2">
                  <Lock className="inline w-4 h-4 mr-2" />
                  پاس ورڈ (Password) *
                </label>
                <div className="relative">
                  <input
                    {...registerField("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    type={showPassword ? "text" : "password"}
                    placeholder="پاس ورڈ درج کریں / Enter password"
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

              {/* Confirm Password Field - Only for Registration */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-urdu-brown mb-2">
                    <Lock className="inline w-4 h-4 mr-2" />
                    پاس ورڈ کی تصدیق (Confirm Password) *
                  </label>
                  <input
                    {...registerField("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === watch("password") || "Passwords do not match",
                    })}
                    type="password"
                    placeholder="پاس ورڈ دوبارہ درج کریں / Re-enter password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>
                      {isLogin
                        ? "داخل ہو رہے ہیں... (Logging in...)"
                        : "رجسٹر ہو رہے ہیں... (Registering...)"}
                    </span>
                  </div>
                ) : (
                  <span>
                    {isLogin ? "داخل ہوں (Login)" : "رجسٹر کریں (Register)"}
                  </span>
                )}
              </Button>
            </form>

            {/* Toggle Login/Register */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-2">
                {isLogin ? "کیا آپ کا اکاؤنٹ نہیں ہے؟" : "پہلے سے اکاؤنٹ ہے؟"}
              </p>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-urdu-maroon hover:text-urdu-brown font-semibold transition-colors"
              >
                {isLogin
                  ? "نیا اکاؤنٹ بنائیں (Create Account)"
                  : "لاگ ان کریں (Login)"}
              </button>
            </div>

            {/* Features for Users */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-urdu-brown mb-4 text-center">
                بازمِ سخن کی خصوصیات
              </h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center text-gray-600">
                  <Star className="w-4 h-4 text-urdu-gold mr-2 flex-shrink-0" />
                  <span>کلاسیکی اردو شاعری کا خزانہ</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Feather className="w-4 h-4 text-urdu-gold mr-2 flex-shrink-0" />
                  <span>مشاعرے اور شعری مقابلے</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Shield className="w-4 h-4 text-urdu-gold mr-2 flex-shrink-0" />
                  <span>محفوظ اور قابل اعتماد پلیٹ فارم</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
