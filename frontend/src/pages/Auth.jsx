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
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Button } from "../components/ui/Button";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState("reader"); // Default to reader
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState(""); // "error" or "success"
  const [showAlert, setShowAlert] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const {
    login,
    register,
    forgotPassword,
    resetPassword,
    loading,
    error,
    setError,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({ mode: "onChange" });

  // Function to show alert with auto-dismiss
  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setShowAlert(false);
      setTimeout(() => {
        setAlertMessage("");
        setAlertType("");
      }, 300); // Wait for fade-out animation
    }, 3000);
  };

  useEffect(() => {
    setError("");
    setSuccessMessage("");
    setSelectedRole("reader"); // Reset role selection
    setShowAlert(false);
    setAlertMessage("");
    setAlertType("");
    reset();

    // Check for reset token in URL
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get("token");
    if (token) {
      setResetToken(token);
      setIsResetPassword(true);
      setIsLogin(false);
      setIsForgotPassword(false);
    }
  }, [
    isLogin,
    isForgotPassword,
    isResetPassword,
    setError,
    reset,
    location.search,
  ]);

  // Handle error state changes from AuthContext
  useEffect(() => {
    if (error) {
      showAlertMessage(error, "error");
    }
  }, [error]);

  // Handle success message changes
  useEffect(() => {
    if (successMessage) {
      showAlertMessage(successMessage, "success");
    }
  }, [successMessage]);

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (data) => {
    try {
      setError("");
      setSuccessMessage("");

      let result;

      if (isForgotPassword) {
        showAlertMessage(
          "بھیجا جا رہا ہے... / Sending reset email...",
          "success"
        );
        result = await forgotPassword(data.email);

        if (result?.success) {
          showAlertMessage(
            "پاس ورڈ ری سیٹ لنک آپ کے ای میل پر بھیج دیا گیا ہے۔ / Password reset link has been sent to your email.",
            "success"
          );
          setTimeout(() => {
            setIsForgotPassword(false);
            setIsLogin(true);
          }, 3000);
        } else {
          setError(result?.message || "Failed to send reset email");
        }
        return;
      }

      if (isResetPassword) {
        if (data.password !== data.confirmPassword) {
          showAlertMessage(
            "پاس ورڈ میں فرق ہے / Passwords do not match",
            "error"
          );
          return;
        }

        showAlertMessage(
          "پاس ورڈ تبدیل کیا جا رہا ہے... / Resetting password...",
          "success"
        );
        result = await resetPassword(resetToken, data.password);

        if (result?.success) {
          showAlertMessage(
            "پاس ورڈ کامیابی سے تبدیل ہو گیا! اب لاگ ان کریں۔ / Password reset successfully! Please login now.",
            "success"
          );
          setTimeout(() => {
            setIsResetPassword(false);
            setIsLogin(true);
            setResetToken(null);
            // Clear URL parameters
            navigate("/auth", { replace: true });
          }, 3000);
        } else {
          setError(result?.message || "Failed to reset password");
        }
        return;
      }

      if (isLogin) {
        showAlertMessage(
          "تصدیق کی جا رہی ہے... / Authenticating...",
          "success"
        );
        result = await login({ email: data.email, password: data.password });
      } else {
        if (data.password !== data.confirmPassword) {
          showAlertMessage(
            "پاس ورڈ میں فرق ہے / Passwords do not match",
            "error"
          );
          return;
        }
        showAlertMessage(
          "اکاؤنٹ بنایا جا رہا ہے... / Creating account...",
          "success"
        );
        result = await register({
          name: data.name,
          email: data.email,
          password: data.password,
          role: selectedRole, // Include selected role
        });
      }

      console.log("📋 Auth result:", result);

      if (result?.success) {
        console.log("✅ Authentication successful");

        if (!isLogin && result.requiresApproval) {
          // For poet registration requiring approval, redirect to signin
          showAlertMessage(
            "اکاؤنٹ کامیابی سے بن گیا! براہ کرم ایڈمن کی منظوری کا انتظار کریں۔ / Account created successfully! Please wait for admin approval.",
            "success"
          );
          setTimeout(() => {
            setIsLogin(true); // Switch to login mode
            reset(); // Clear form
            showAlertMessage(
              "اب آپ لاگ ان کر سکتے ہیں جب ایڈمن آپ کے اکاؤنٹ کی منظوری دے دے۔ / You can now login once admin approves your account.",
              "success"
            );
          }, 3000);
          return;
        }

        showAlertMessage(
          isLogin
            ? "کامیابی سے لاگ ان ہو گئے! ریڈائریکٹ ہو رہے ہیں... / Successfully logged in! Redirecting..."
            : "اکاؤنٹ کامیابی سے بن گیا! ریڈائریکٹ ہو رہے ہیں... / Account created successfully! Redirecting...",
          "success"
        );

        // Add a small delay to show success message
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 1500);
      } else {
        console.log("❌ Authentication failed:", result?.message);

        // Show specific error messages
        let errorMessage =
          result?.message || "Authentication failed. Please try again.";

        if (result?.code === "POET_PENDING_APPROVAL") {
          errorMessage =
            "Authentication failed: Your poet account is pending admin approval. Please wait for approval.";
        } else if (result?.code === "READER_PENDING_APPROVAL") {
          errorMessage =
            "Authentication failed: Your reader account is pending admin approval. Please wait for approval.";
        } else if (errorMessage.toLowerCase().includes("email")) {
          errorMessage =
            "آپ کا ای میل درست نہیں ہے۔ براہ کرم چیک کریں۔ (Your email is not correct. Please check.)";
        } else if (errorMessage.toLowerCase().includes("password")) {
          errorMessage =
            "آپ کا پاس ورڈ غلط ہے۔ براہ کرم چیک کریں۔ (Your password is incorrect. Please check.)";
        } else if (
          errorMessage.toLowerCase().includes("invalid email or password")
        ) {
          errorMessage =
            "ای میل یا پاس ورڈ غلط ہے۔ براہ کرم چیک کریں۔ (Email or password is incorrect. Please check.)";
        }

        setError(errorMessage);
        setShowAlert(false);
      }
    } catch (error) {
      console.error("💥 Authentication error:", error);

      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.response?.status === 401) {
        errorMessage =
          "ای میل یا پاس ورڈ غلط ہے۔ براہ کرم چیک کریں۔ (Email or password is incorrect. Please check.)";
      } else if (error.response?.status === 403) {
        const responseData = error.response?.data;
        if (responseData?.code === "POET_PENDING_APPROVAL") {
          errorMessage =
            "Authentication failed: Your poet account is pending admin approval. Please wait for approval.";
        } else if (responseData?.code === "READER_PENDING_APPROVAL") {
          errorMessage =
            "Authentication failed: Your reader account is pending admin approval. Please wait for approval.";
        } else {
          errorMessage =
            responseData?.message || "Access denied. Please contact support.";
        }
      } else if (error.response?.status === 400) {
        errorMessage =
          "غلط معلومات۔ براہ کرم چیک کریں۔ (Invalid information. Please check.)";
      }

      setError(errorMessage);
      setShowAlert(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 text-8xl text-urdu-maroon nastaleeq-heading">
          ب
        </div>
        <div className="absolute top-40 right-20 text-6xl text-urdu-brown nastaleeq-heading">
          ز
        </div>
        <div className="absolute bottom-20 left-1/3 text-7xl text-urdu-gold nastaleeq-heading">
          م
        </div>
        <div className="absolute top-1/3 right-10 text-5xl text-urdu-maroon nastaleeq-heading">
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
              <h3 className="text-xl font-bold text-urdu-brown mb-2 nastaleeq-heading">
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
                  <p className="text-urdu-brown font-medium nastaleeq-primary">
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
                  <p className="text-urdu-brown font-medium nastaleeq-primary">
                    خودکار اکاؤنٹ بنایا جائے گا
                  </p>
                  <p className="text-gray-600">Account created automatically</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-urdu-gold rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-urdu-brown font-medium nastaleeq-primary">
                    فوری رسائی
                  </p>
                  <p className="text-gray-600">Immediate access to poetry</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 text-center">
                No registration needed for readers!
                <br />
                <span className="font-urdu nastaleeq-primary">
                  قارئین کو رجسٹریشن کی ضرورت نہیں!
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="w-full lg:w-2/3 max-w-md mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-urdu-gold/20">
            {/* Dynamic Alert Message */}
            {alertMessage && (
              <div
                className={`mb-6 p-4 rounded-lg shadow-lg border-2 transition-all duration-300 transform ${
                  showAlert
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 -translate-y-2 scale-95"
                } ${
                  alertType === "error"
                    ? "bg-red-50 border-red-300 text-red-800"
                    : "bg-green-50 border-green-300 text-green-800"
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        alertType === "error" ? "bg-red-500" : "bg-green-500"
                      }`}
                    >
                      {alertType === "error" ? (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-white"
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
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3
                      className={`text-sm font-bold mb-1 ${
                        alertType === "error"
                          ? "text-red-800"
                          : "text-green-800"
                      }`}
                    >
                      {alertType === "error"
                        ? "خرابی / Error"
                        : "کامیابی / Success"}
                    </h3>
                    <p
                      className={`text-sm font-medium leading-relaxed ${
                        alertType === "error"
                          ? "text-red-700"
                          : "text-green-700"
                      }`}
                    >
                      {alertMessage}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAlert(false)}
                    className={`ml-2 ${
                      alertType === "error"
                        ? "text-red-400 hover:text-red-600"
                        : "text-green-400 hover:text-green-600"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
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
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full mb-4 shadow-lg">
                {isForgotPassword ? (
                  <Mail className="w-10 h-10 text-white" />
                ) : isResetPassword ? (
                  <RotateCcw className="w-10 h-10 text-white" />
                ) : isLogin ? (
                  <Lock className="w-10 h-10 text-white" />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-urdu-brown mb-2 nastaleeq-heading">
                {isForgotPassword
                  ? "پاس ورڈ بھول گئے"
                  : isResetPassword
                  ? "نیا پاس ورڈ"
                  : isLogin
                  ? "داخل ہوں"
                  : "رجسٹر کریں"}
              </h1>
              <h2 className="text-xl font-semibold text-urdu-maroon mb-2">
                {isForgotPassword
                  ? "Forgot Password"
                  : isResetPassword
                  ? "Reset Password"
                  : isLogin
                  ? "Login"
                  : "Register"}
              </h2>
              <p className="text-gray-600 text-sm nastaleeq-primary">
                {isForgotPassword
                  ? "اپنا ای میل درج کریں"
                  : isResetPassword
                  ? "نیا پاس ورڈ درج کریں"
                  : isLogin
                  ? "اپنے اکاؤنٹ میں داخل ہوں"
                  : "نیا اکاؤنٹ بنائیں"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name Field - Only for Registration */}
              {!isLogin && !isForgotPassword && !isResetPassword && (
                <div>
                  <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all text-right nastaleeq-primary"
                    style={{ direction: "rtl" }}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              )}

              {/* Role Selection - Only for Registration */}
              {!isLogin && !isForgotPassword && !isResetPassword && (
                <div>
                  <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                    <Shield className="inline w-4 h-4 mr-2" />
                    آپ کا کردار (Your Role) *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedRole === "reader"
                          ? "border-urdu-gold bg-urdu-gold/10"
                          : "border-gray-300 hover:border-urdu-gold/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="reader"
                        checked={selectedRole === "reader"}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-center w-full">
                        <User className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <span className="text-sm font-medium text-urdu-brown nastaleeq-primary">
                          قارئ (Reader)
                        </span>
                        <p className="text-xs text-gray-500 mt-1 nastaleeq-primary">
                          شاعری پڑھیں اور لطف اٹھائیں
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedRole === "poet"
                          ? "border-urdu-gold bg-urdu-gold/10"
                          : "border-gray-300 hover:border-urdu-gold/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="poet"
                        checked={selectedRole === "poet"}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-center w-full">
                        <Feather className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <span className="text-sm font-medium text-urdu-brown nastaleeq-primary">
                          شاعر (Poet)
                        </span>
                        <p className="text-xs text-gray-500 mt-1 nastaleeq-primary">
                          شاعری لکھیں اور شیئر کریں
                        </p>
                      </div>
                    </label>
                  </div>
                  {selectedRole === "poet" && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-yellow-700 nastaleeq-primary">
                            <strong>شاعر اکاؤنٹ کے لیے:</strong> آپ کے اکاؤنٹ کو
                            ایڈمن کی منظوری درکار ہوگی۔ رجسٹریشن کے بعد لاگ ان
                            کرنے سے پہلے منظوری کا انتظار کریں۔
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            <strong>For Poet Account:</strong> Your account will
                            require admin approval. Please wait for approval
                            before attempting to login.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
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

              {/* Password Field - Only for Login, Register, and Reset Password */}
              {!isForgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                    <Lock className="inline w-4 h-4 mr-2" />
                    {isResetPassword
                      ? "نیا پاس ورڈ (New Password)"
                      : "پاس ورڈ (Password)"}{" "}
                    *
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
                      placeholder={
                        isResetPassword
                          ? "نیا پاس ورڈ درج کریں / Enter new password"
                          : "پاس ورڈ درج کریں / Enter password"
                      }
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all nastaleeq-primary"
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
              )}

              {/* Confirm Password Field - Only for Registration and Reset Password */}
              {!isLogin && !isForgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all nastaleeq-primary"
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
                className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg nastaleeq-primary"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>
                      {isForgotPassword
                        ? "بھیجا جا رہا ہے... (Sending...)"
                        : isResetPassword
                        ? "تبدیل کیا جا رہا ہے... (Resetting...)"
                        : isLogin
                        ? "داخل ہو رہے ہیں... (Logging in...)"
                        : "رجسٹر ہو رہے ہیں... (Registering...)"}
                    </span>
                  </div>
                ) : (
                  <span>
                    {isForgotPassword
                      ? "ای میل بھیجیں (Send Email)"
                      : isResetPassword
                      ? "پاس ورڈ تبدیل کریں (Reset Password)"
                      : isLogin
                      ? "داخل ہوں (Login)"
                      : "رجسٹر کریں (Register)"}
                  </span>
                )}
              </Button>
            </form>

            {/* Navigation Links */}
            <div className="mt-8 text-center space-y-4">
              {!isResetPassword && (
                <>
                  <div>
                    <p className="text-gray-600 mb-2 nastaleeq-primary">
                      {isForgotPassword
                        ? "واپس لاگ ان میں جانا چاہتے ہیں؟"
                        : isLogin
                        ? "کیا آپ کا اکاؤنٹ نہیں ہے؟"
                        : "پہلے سے اکاؤنٹ ہے؟"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (isForgotPassword) {
                          setIsForgotPassword(false);
                          setIsLogin(true);
                        } else {
                          setIsLogin(!isLogin);
                          setIsForgotPassword(false);
                        }
                      }}
                      className="text-urdu-maroon hover:text-urdu-brown font-semibold transition-colors nastaleeq-primary"
                    >
                      {isForgotPassword
                        ? "واپس لاگ ان (Back to Login)"
                        : isLogin
                        ? "نیا اکاؤنٹ بنائیں (Create Account)"
                        : "لاگ ان کریں (Login)"}
                    </button>
                  </div>

                  {isLogin && !isForgotPassword && (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setIsLogin(false);
                        }}
                        className="text-gray-500 hover:text-urdu-maroon text-sm transition-colors nastaleeq-primary"
                      >
                        پاس ورڈ بھول گئے؟ (Forgot Password?)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Features for Users or Reset Password Info */}
            {!isResetPassword ? (
              <div className="mt-8 border-t border-gray-200 pt-6">
                {isForgotPassword ? (
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-urdu-brown mb-3 nastaleeq-heading">
                      پاس ورڈ ری سیٹ کی معلومات
                    </h3>
                    <div className="text-sm text-gray-600 space-y-2 nastaleeq-primary">
                      <p>• اپنا رجسٹرڈ ای میل ایڈریس درج کریں</p>
                      <p>• آپ کو ای میل میں ری سیٹ لنک ملے گا</p>
                      <p>• لنک پر کلک کر کے نیا پاس ورڈ بنائیں</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-urdu-brown mb-4 text-center nastaleeq-heading">
                      بازمِ سخن کی خصوصیات
                    </h3>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Star className="w-4 h-4 text-urdu-gold mr-2 flex-shrink-0" />
                        <span className="nastaleeq-primary">
                          کلاسیکی اردو شاعری کا خزانہ
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Feather className="w-4 h-4 text-urdu-gold mr-2 flex-shrink-0" />
                        <span className="nastaleeq-primary">
                          مشاعرے اور شعری مقابلے
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Shield className="w-4 h-4 text-urdu-gold mr-2 flex-shrink-0" />
                        <span className="nastaleeq-primary">
                          محفوظ اور قابل اعتماد پلیٹ فارم
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-urdu-brown mb-3 nastaleeq-heading">
                    نیا پاس ورڈ بنانے کی ہدایات
                  </h3>
                  <div className="text-sm text-gray-600 space-y-2 nastaleeq-primary">
                    <p>• کم از کم 6 حروف کا پاس ورڈ استعمال کریں</p>
                    <p>• مضبوط پاس ورڈ بنانے کے لیے حروف اور نمبر ملائیں</p>
                    <p>• نیا پاس ورڈ محفوظ جگہ محفوظ کریں</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
