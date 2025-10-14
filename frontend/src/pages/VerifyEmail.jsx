import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { CulturalElements } from "../components/ui/CulturalElements";
import api from "../services/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        setIsLoading(false);
        return;
      }

      try {
        console.log("🔍 Verifying email with token:", token);

        const response = await api.post("/auth/verify-email", { token });

        if (response.data.success) {
          setStatus("success");
          setMessage("Email verified successfully!");
          setRequiresApproval(response.data.requiresApproval || false);

          // If no approval required, redirect to login after delay
          if (!response.data.requiresApproval) {
            setTimeout(() => {
              navigate("/auth?tab=login", {
                state: { message: "Email verified! You can now log in." },
              });
            }, 3000);
          }
        } else {
          setStatus("error");
          setMessage(response.data.message || "Email verification failed");
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");

        if (error.response?.data?.message) {
          setMessage(error.response.data.message);
        } else if (error.response?.status === 400) {
          setMessage("Invalid or expired verification token");
        } else {
          setMessage("Email verification failed. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendVerification = async () => {
    const email = prompt(
      "Please enter your email address to resend verification:"
    );
    if (!email) return;

    try {
      setIsLoading(true);
      const response = await api.post("/auth/resend-verification", { email });

      if (response.data.success) {
        alert("Verification email sent! Please check your inbox.");
      } else {
        alert("Failed to resend verification email: " + response.data.message);
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      alert("Failed to resend verification email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "verifying":
      default:
        return "🔄";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "verifying":
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <CulturalElements />

      <Card className="w-full max-w-md p-8 text-center relative z-10 bg-white/90 backdrop-blur-sm">
        <div className="mb-6">
          <div className="text-6xl mb-4">{getStatusIcon()}</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Email Verification
          </h1>
          <h2 className="text-lg text-gray-600 mb-4" dir="rtl">
            ای میل کی تصدیق
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <LoadingSpinner size="large" />
            <p className="text-gray-600">Verifying your email...</p>
            <p className="text-sm text-gray-500" dir="rtl">
              آپ کی ای میل کی تصدیق ہو رہی ہے...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`text-lg font-medium ${getStatusColor()}`}>
              {message}
            </div>

            {status === "success" && (
              <div className="space-y-4">
                {requiresApproval ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-yellow-800">
                      <p className="font-medium">✋ Awaiting Approval</p>
                      <p className="text-sm mt-2">
                        Your poet account is now verified but requires admin
                        approval before you can start publishing poetry.
                      </p>
                      <p className="text-sm mt-2 text-right" dir="rtl">
                        آپ کا شاعر اکاؤنٹ تصدیق ہو گیا لیکن منظوری کا انتظار ہے۔
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-green-800">
                      <p className="font-medium">🎉 Account Activated</p>
                      <p className="text-sm mt-2">
                        Your account is now fully activated! Redirecting to
                        login...
                      </p>
                      <p className="text-sm mt-2 text-right" dir="rtl">
                        آپ کا اکاؤنٹ فعال ہو گیا! لاگ ان پیج پر بھیج رہے ہیں...
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => navigate("/auth?tab=login")}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  Continue to Login / لاگ ان کریں
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800">
                    <p className="font-medium">⚠️ Verification Failed</p>
                    <p className="text-sm mt-2">
                      The verification link may be expired or invalid.
                    </p>
                    <p className="text-sm mt-2 text-right" dir="rtl">
                      تصدیقی لنک کی میعاد ختم ہو سکتی ہے یا غلط ہے۔
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleResendVerification}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? <LoadingSpinner size="small" /> : null}
                    Resend Verification Email
                  </Button>

                  <Button
                    onClick={() => navigate("/auth?tab=register")}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to Registration
                  </Button>
                </div>
              </div>
            )}

            {status === "verifying" && (
              <div className="space-y-4">
                <LoadingSpinner size="large" />
                <p className="text-gray-600">
                  Please wait while we verify your email address...
                </p>
                <p className="text-sm text-gray-500" dir="rtl">
                  براہ کرم انتظار کریں، آپ کی ای میل کی تصدیق ہو رہی ہے...
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help?{" "}
            <button
              onClick={() => navigate("/contact")}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Contact Support
            </button>
          </p>
          <p className="text-xs text-gray-400 mt-2" dir="rtl">
            مدد چاہیے؟ سپورٹ سے رابطہ کریں
          </p>
        </div>
      </Card>
    </div>
  );
}
