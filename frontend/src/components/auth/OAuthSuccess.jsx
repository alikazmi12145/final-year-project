import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { getRedirectPathForRole } from "./RoleBasedRedirect";

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const accessToken = urlParams.get("token");
        const refreshToken = urlParams.get("refresh");
        const error = urlParams.get("error");

        if (error) {
          console.error("OAuth error:", error);
          navigate("/auth?error=oauth_failed");
          return;
        }

        if (accessToken && refreshToken) {
          // Store tokens and update auth state
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);

          // Update auth context
          const result = await loginWithTokens(accessToken, refreshToken);

          // Redirect based on user role
          const redirectPath = getRedirectPathForRole(result?.user?.role);
          navigate(redirectPath);
        } else {
          navigate("/auth?error=missing_tokens");
        }
      } catch (error) {
        console.error("OAuth success handler error:", error);
        navigate("/auth?error=oauth_processing_failed");
      }
    };

    handleOAuthCallback();
  }, [location.search, navigate, loginWithTokens]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <h2 className="mt-4 text-xl font-semibold text-urdu-brown nastaleeq-heading">
          لاگ ان ہو رہے ہیں...
        </h2>
        <p className="mt-2 text-gray-600">
          Processing your login, please wait...
        </p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
