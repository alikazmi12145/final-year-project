import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Home, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/Button";

const Unauthorized = () => {
  const navigate = useNavigate();

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
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-2 shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-urdu-brown">Access Denied</h1>
              <p className="text-xs text-gray-500">You don't have permission to access this page</p>
            </div>

            {/* Message */}
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg mb-3">
              <p className="text-sm text-red-800">
                Please contact an administrator if you believe this is an error.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-gradient-to-r from-urdu-maroon to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </Button>

              <button
                onClick={() => window.history.back()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-urdu-gold text-urdu-maroon rounded-lg hover:bg-urdu-cream/50 transition-all text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                Need help?{" "}
                <a
                  href="mailto:support@bazmesukhan.com"
                  className="text-urdu-maroon hover:text-urdu-brown hover:underline"
                >
                  support@bazmesukhan.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
