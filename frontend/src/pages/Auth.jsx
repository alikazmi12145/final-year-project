import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock, Shield, Feather, AlertCircle, RotateCcw } from "lucide-react";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Button } from "../components/ui/Button";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState("reader");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const { login, register, forgotPassword, resetPassword, socialLogin, loading, error, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { register: registerField, handleSubmit, formState: { errors }, reset, watch } = useForm({ mode: "onChange" });

  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
      setTimeout(() => {
        setAlertMessage("");
        setAlertType("");
      }, 300);
    }, 5000);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get("token");
    const error = urlParams.get("error");
    const message = urlParams.get("message");

    if (token) {
      setResetToken(token);
      setIsResetPassword(true);
      setIsLogin(false);
      setIsForgotPassword(false);
    }

    if (error) {
      if (error === "google_not_configured") {
        showAlertMessage(message || "Google OAuth is not configured. Please use email/password login or contact administrator.", "error");
      } else if (error === "oauth_failed") {
        showAlertMessage("OAuth authentication failed. Please try again or use email/password login.", "error");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  useEffect(() => {
    setError("");
    setSuccessMessage("");
    if (!isResetPassword) {
      setSelectedRole("reader");
    }
    reset();
  }, [isLogin, isForgotPassword, isResetPassword, setError, reset]);

  useEffect(() => {
    if (error) showAlertMessage(error, "error");
  }, [error]);

  useEffect(() => {
    if (successMessage) showAlertMessage(successMessage, "success");
  }, [successMessage]);

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (data) => {
    try {
      setError("");
      setSuccessMessage("");
      let result;

      if (isForgotPassword) {
        showAlertMessage("بھیجا جا رہا ہے... / Sending reset email...", "success");
        result = await forgotPassword(data.email);
        if (result?.success) {
          showAlertMessage("پاس ورڈ ری سیٹ لنک آپ کے ای میل پر بھیج دیا گیا ہے۔", "success");
          setTimeout(() => { setIsForgotPassword(false); setIsLogin(true); }, 3000);
        } else {
          setError(result?.message || "Failed to send reset email");
        }
        return;
      }

      if (isResetPassword) {
        if (data.password !== data.confirmPassword) {
          showAlertMessage("پاس ورڈ میں فرق ہے / Passwords do not match", "error");
          return;
        }
        showAlertMessage("پاس ورڈ تبدیل کیا جا رہا ہے...", "success");
        result = await resetPassword(resetToken, data.password);
        if (result?.success) {
          showAlertMessage("پاس ورڈ کامیابی سے تبدیل ہو گیا!", "success");
          setTimeout(() => {
            setIsResetPassword(false);
            setIsLogin(true);
            setResetToken(null);
            navigate("/auth", { replace: true });
          }, 3000);
        } else {
          setError(result?.message || "Failed to reset password");
        }
        return;
      }

      if (isLogin) {
        showAlertMessage("تصدیق کی جا رہی ہے...", "success");
        result = await login({ email: data.email, password: data.password });
      } else {
        if (data.password !== data.confirmPassword) {
          showAlertMessage("پاس ورڈ میں فرق ہے", "error");
          return;
        }
        showAlertMessage("اکاؤنٹ بنایا جا رہا ہے...", "success");
        result = await register({ name: data.name, email: data.email, password: data.password, role: selectedRole });
      }

      if (result?.success) {
        if (!isLogin && result.requiresApproval) {
          const roleMessages = {
            poet: "شاعر اکاؤنٹ کامیابی سے بن گیا! براہ کرم ایڈمن کی منظوری کا انتظار کریں۔",
            moderator: "موڈریٹر اکاؤنٹ کامیابی سے بن گیا!",
            reader: "قاری اکاؤنٹ کامیابی سے بن گیا!"
          };
          showAlertMessage(roleMessages[result.role || selectedRole] || "اکاؤنٹ کامیابی سے بن گیا!", "success");
          setTimeout(() => navigate("/pending-approval", { state: { role: result.role || selectedRole } }), 2000);
          return;
        }
        showAlertMessage(isLogin ? "کامیابی سے لاگ ان ہو گئے!" : "اکاؤنٹ کامیابی سے بن گیا!", "success");
        setTimeout(() => navigate(from, { replace: true }), 1500);
      } else {
        if (result?.code === "PENDING_APPROVAL") {
          showAlertMessage(result?.message || "آپ کا اکاؤنٹ ایڈمن کی منظوری کا منتظر ہے۔", "warning");
          setTimeout(() => navigate("/pending-approval", { state: { role: result?.role || selectedRole } }), 1500);
          return;
        }
        if (result?.code === "POET_PENDING_APPROVAL") { navigate("/pending-approval", { state: { role: "poet" } }); return; }
        if (result?.code === "READER_PENDING_APPROVAL") { navigate("/pending-approval", { state: { role: "reader" } }); return; }
        
        let errorMessage = result?.message || "Authentication failed. Please try again.";
        if (errorMessage.toLowerCase().includes("email")) errorMessage = "آپ کا ای میل درست نہیں ہے۔";
        else if (errorMessage.toLowerCase().includes("password")) errorMessage = "آپ کا پاس ورڈ غلط ہے۔";
        else if (errorMessage.toLowerCase().includes("invalid email or password")) errorMessage = "ای میل یا پاس ورڈ غلط ہے۔";
        setError(errorMessage);
        setShowAlert(false);
      }
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";
      if (error.response?.status === 401) errorMessage = "ای میل یا پاس ورڈ غلط ہے۔";
      else if (error.response?.status === 403) {
        const responseData = error.response?.data;
        if (responseData?.code === "PENDING_APPROVAL") {
          showAlertMessage(responseData?.message || "آپ کا اکاؤنٹ ایڈمن کی منظوری کا منتظر ہے۔", "warning");
          setTimeout(() => navigate("/pending-approval", { state: { role: responseData?.role || selectedRole } }), 1500);
          return;
        }
        errorMessage = responseData?.message || "Access denied.";
      } else if (error.response?.status === 400) errorMessage = "غلط معلومات۔";
      setError(errorMessage);
      setShowAlert(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-4 px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl text-urdu-maroon nastaleeq-heading">ب</div>
        <div className="absolute top-20 right-20 text-5xl text-urdu-brown nastaleeq-heading">ز</div>
        <div className="absolute bottom-20 left-1/4 text-5xl text-urdu-gold nastaleeq-heading">م</div>
        <div className="absolute top-1/3 right-10 text-4xl text-urdu-maroon nastaleeq-heading">س</div>
      </div>

      <div className="w-full max-w-md mx-auto" dir="ltr">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-urdu-gold/20">
          <div className="p-4 sm:p-5 text-left">
            {alertMessage && (
              <div className={`mb-2 p-2 rounded-lg border text-xs transition-opacity duration-300 ${showAlert ? "opacity-100" : "opacity-0"} ${alertType === "error" ? "bg-red-50 border-red-300 text-red-800" : "bg-green-50 border-green-300 text-green-800"}`}>
                <div className="flex items-center gap-2">
                  <span className="flex-1">{alertMessage}</span>
                  <button onClick={() => setShowAlert(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              </div>
            )}

            <div className="text-center mb-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full mb-2 shadow-lg">
                {isForgotPassword ? <Mail className="w-7 h-7 text-white" /> : isResetPassword ? <Lock className="w-7 h-7 text-white" /> : isLogin ? <Lock className="w-7 h-7 text-white" /> : <User className="w-7 h-7 text-white" />}
              </div>
              <h1 className="text-xl font-bold text-urdu-brown">
                {isForgotPassword ? "Forgot Password" : isResetPassword ? "Reset Password" : isLogin ? "Login" : "Register"}
              </h1>
              <p className="text-xs text-gray-500">
                {isForgotPassword ? "Enter your email to reset password" : isResetPassword ? "Create a new password" : isLogin ? "Welcome back! Please login to continue" : "Create your account to get started"}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
              {!isLogin && !isForgotPassword && !isResetPassword && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...registerField("name", { required: "Name is required", minLength: { value: 2, message: "Min 2 characters" }, pattern: { value: /^[a-zA-Z\s\u0600-\u06FF]+$/, message: "No numbers allowed" } })}
                    type="text"
                    placeholder="Enter your name"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all duration-200 hover:border-urdu-gold/50 text-left"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name.message}</p>}
                </div>
              )}

              {!isLogin && !isForgotPassword && !isResetPassword && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your Role <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all duration-200 ${selectedRole === "poet" ? "border-urdu-gold bg-urdu-gold/10 shadow-md" : "border-gray-300 hover:border-urdu-gold/50 hover:bg-gray-50"}`}>
                      <input type="radio" name="role" value="poet" checked={selectedRole === "poet"} onChange={(e) => setSelectedRole(e.target.value)} className="sr-only" />
                      <Feather className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Poet</span>
                    </label>
                    <label className={`flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all duration-200 ${selectedRole === "reader" ? "border-urdu-gold bg-urdu-gold/10 shadow-md" : "border-gray-300 hover:border-urdu-gold/50 hover:bg-gray-50"}`}>
                      <input type="radio" name="role" value="reader" checked={selectedRole === "reader"} onChange={(e) => setSelectedRole(e.target.value)} className="sr-only" />
                      <User className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Reader</span>
                    </label>
                  </div>
                </div>
              )}

              {!isResetPassword && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...registerField("email", { required: "Email is required", pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email" } })}
                    type="email"
                    placeholder="example@gmail.com"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all duration-200 hover:border-urdu-gold/50 text-left"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email.message}</p>}
                </div>
              )}

              {!isForgotPassword && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {isResetPassword ? "New Password" : "Password"} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...registerField("password", { required: "Password is required", minLength: { value: 8, message: "Min 8 chars" }, pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, message: "Need A-Z, a-z, 0-9, @$!%*?&" } })}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent pr-10 transition-all duration-200 hover:border-urdu-gold/50 text-left"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-urdu-maroon transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-0.5">{errors.password.message}</p>}
                </div>
              )}

              {!isLogin && !isForgotPassword && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...registerField("confirmPassword", { required: "Confirm password", validate: (value) => value === watch("password") || "Passwords don't match" })}
                    type="password"
                    placeholder="Confirm password"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-all duration-200 hover:border-urdu-gold/50 text-left"
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-0.5">{errors.confirmPassword.message}</p>}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all text-sm mt-3">
                {loading ? <LoadingSpinner size="sm" /> : (isForgotPassword ? "Send Reset Email" : isResetPassword ? "Reset Password" : isLogin ? "Login" : "Register")}
              </Button>
            </form>

            {(isLogin || (!isLogin && !isForgotPassword && !isResetPassword)) && (
              <>
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-400">Or</span></div>
                </div>
                <Button type="button" onClick={() => socialLogin("google")} disabled={loading} className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all">
                  {isLogin ? "Continue with Google" : "Sign up with Google"} <span>🌐</span>
                </Button>
              </>
            )}

            <div className="mt-3 text-center">
              {!isResetPassword && (
                <>
                  <span className="text-gray-500 text-xs">{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
                  <button type="button" onClick={() => { setIsLogin(!isLogin); setIsForgotPassword(false); }} className="text-urdu-maroon hover:text-urdu-brown font-semibold text-xs hover:underline">
                    {isLogin ? "Register" : "Login"}
                  </button>
                  {isLogin && (
                    <button type="button" onClick={() => navigate("/forgot-password")} className="block mx-auto text-gray-400 hover:text-urdu-maroon text-xs mt-1 hover:underline">
                      Forgot Password?
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
