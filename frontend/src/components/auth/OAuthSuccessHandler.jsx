import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { getRedirectPathForRole } from "./RoleBasedRedirect";

const OAuthSuccessHandler = () => {
  const [searchParams] = useSearchParams();
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      try {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const error = searchParams.get("error");
        const errorMessage = searchParams.get("message");
        const isDev = searchParams.get("dev") === "true";

        if (error) {
          console.error("OAuth Error:", error, errorMessage);
          setStatus("error");
          setMessage(
            errorMessage || "OAuth authentication failed. Please try again."
          );

          // Redirect to auth page with error after 3 seconds
          setTimeout(() => {
            navigate(
              "/auth?error=" +
                error +
                "&message=" +
                encodeURIComponent(errorMessage || "OAuth failed")
            );
          }, 3000);
          return;
        }

        if (!accessToken) {
          setStatus("error");
          setMessage("Invalid OAuth response. Missing access token.");
          setTimeout(() => {
            navigate("/auth");
          }, 3000);
          return;
        }

        // Handle development mode mock authentication
        if (isDev) {
          console.log("🚧 Development Mode: Mock OAuth authentication");
          setStatus("success");
          setMessage(
            "Development mode authentication successful! Redirecting..."
          );

          // Create a mock user and login directly
          setTimeout(() => {
            // Navigate to home instead of dashboard for development
            navigate("/", { replace: true });
          }, 2000);
          return;
        }

        // Use the loginWithTokens method from AuthContext
        const result = await loginWithTokens(accessToken, refreshToken);

        if (result.success) {
          setStatus("success");
          setMessage("Google authentication successful! Redirecting...");

          // Small delay to show success message
          const redirectPath = getRedirectPathForRole(result.user?.role);
          setTimeout(() => {
            navigate(redirectPath, { replace: true });
          }, 2000);
        } else {
          setStatus("error");
          setMessage(result.message || "Failed to authenticate with tokens");
          setTimeout(() => {
            navigate("/auth");
          }, 3000);
        }
      } catch (error) {
        console.error("OAuth Success Handler Error:", error);
        setStatus("error");
        setMessage("An error occurred during authentication");
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      }
    };

    handleOAuthSuccess();
  }, [searchParams, loginWithTokens, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-urdu-gold/20 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {status === "processing" && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full mb-4 shadow-lg">
                <LoadingSpinner size="lg" className="text-white" />
              </div>
            )}

            {status === "success" && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
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
            )}

            {status === "error" && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-4 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
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
              </div>
            )}
          </div>

          {/* Status Title */}
          <h1 className="text-2xl font-bold text-urdu-brown mb-2 nastaleeq-heading">
            {status === "processing" && "تصدیق جاری..."}
            {status === "success" && "کامیابی!"}
            {status === "error" && "خرابی!"}
          </h1>

          <h2 className="text-lg font-semibold text-urdu-maroon mb-4">
            {status === "processing" && "Authenticating..."}
            {status === "success" && "Success!"}
            {status === "error" && "Error!"}
          </h2>

          {/* Status Message */}
          <p className="text-gray-600 text-sm mb-6 nastaleeq-primary leading-relaxed">
            {status === "processing" && (
              <>
                <span className="block mb-2">
                  گوگل کے ساتھ لاگ ان ہو رہے ہیں
                </span>
                <span className="text-xs">Signing in with Google...</span>
              </>
            )}

            {status === "success" && (
              <>
                <span className="block mb-2 text-green-700">
                  کامیابی سے لاگ ان ہو گئے!
                </span>
                <span className="text-xs text-green-600">
                  Successfully authenticated! Redirecting to dashboard...
                </span>
              </>
            )}

            {status === "error" && (
              <>
                <span className="block mb-2 text-red-700">
                  لاگ ان میں خرابی
                </span>
                <span className="text-xs text-red-600">{message}</span>
              </>
            )}
          </p>

          {/* Google Branding */}
          <div className="flex items-center justify-center mb-4">
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm text-gray-600 nastaleeq-primary">
              Google OAuth
            </span>
          </div>

          {/* Progress Animation */}
          {status === "processing" && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-urdu-gold to-urdu-maroon h-2 rounded-full animate-pulse"></div>
            </div>
          )}

          {status === "error" && (
            <button
              onClick={() => navigate("/auth")}
              className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg nastaleeq-primary"
            >
              واپس لاگ ان پر جائیں (Back to Login)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthSuccessHandler;
