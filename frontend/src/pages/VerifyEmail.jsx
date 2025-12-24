import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Mail, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/Button";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useMessage } from "../context/MessageContext";
import api from "../services/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { showSuccess, showError } = useMessage();

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
    const email = prompt("Please enter your email address to resend verification:");
    if (!email) return;

    try {
      setIsLoading(true);
      const response = await api.post("/auth/resend-verification", { email });

      if (response.data.success) {
        showSuccess("Verification email sent! Please check your inbox.");
      } else {
        showError("Failed to resend verification email: " + response.data.message);
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      showError("Failed to resend verification email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-4 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl text-urdu-maroon nastaleeq-heading">ب</div>
        <div className="absolute top-20 right-20 text-5xl text-urdu-brown nastaleeq-heading">ز</div>
        <div className="absolute bottom-20 left-1/4 text-5xl text-urdu-gold nastaleeq-heading">م</div>
        <div className="absolute top-1/3 right-10 text-4xl text-urdu-maroon nastaleeq-heading">س</div>
      </div>

      <div className="w-full max-w-md mx-auto" dir="ltr">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-urdu-gold/20">
          <div className="p-4 sm:p-5 text-center">
            {/* Header */}
            <div className="mb-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full mb-2 shadow-lg">
                {status === "success" ? (
                  <CheckCircle className="w-7 h-7 text-white" />
                ) : status === "error" ? (
                  <AlertCircle className="w-7 h-7 text-white" />
                ) : (
                  <Mail className="w-7 h-7 text-white" />
                )}
              </div>
              <h1 className="text-xl font-bold text-urdu-brown">Email Verification</h1>
              <p className="text-xs text-gray-500">Verify your email to continue</p>
            </div>

            {/* Loading State */}
            {isLoading && status === "verifying" && (
              <div className="space-y-2">
                <LoadingSpinner size="md" />
                <p className="text-sm text-gray-600">Verifying your email...</p>
              </div>
            )}

            {/* Success State */}
            {!isLoading && status === "success" && (
              <div className="space-y-2">
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">{message}</p>
                </div>

                {requiresApproval ? (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      Your account is verified but requires admin approval before you can start publishing.
                    </p>
                  </div>
                ) : (
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-800">
                      Your account is fully activated! Redirecting to login...
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => navigate("/auth?tab=login")}
                  className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
                >
                  Continue to Login
                </Button>
              </div>
            )}

            {/* Error State */}
            {!isLoading && status === "error" && (
              <div className="space-y-2">
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">{message}</p>
                  <p className="text-xs text-red-600 mt-1">
                    The verification link may be expired or invalid.
                  </p>
                </div>

                <Button
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : <RotateCcw className="w-4 h-4" />}
                  Resend Verification Email
                </Button>

                <button
                  onClick={() => navigate("/auth?tab=register")}
                  className="text-urdu-maroon hover:text-urdu-brown font-semibold text-xs hover:underline"
                >
                  Back to Registration
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                Need help?{" "}
                <button
                  onClick={() => navigate("/contact")}
                  className="text-urdu-maroon hover:text-urdu-brown hover:underline"
                >
                  Contact Support
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
