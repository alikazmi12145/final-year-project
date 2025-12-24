import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Clock, Mail, ArrowRight, Home, Feather, User, BookOpen } from "lucide-react";
import { Button } from "../components/ui/Button";

const PendingApproval = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const role = location.state?.role || searchParams.get("role") || "reader";

  const getRoleConfig = () => {
    switch (role) {
      case "poet":
        return {
          title: "Poet Account Pending",
          subtitle: "Your poet account is awaiting admin approval",
          icon: Feather,
          color: "text-blue-600"
        };
      case "moderator":
        return {
          title: "Moderator Account Pending",
          subtitle: "Your moderator account is awaiting admin approval",
          icon: BookOpen,
          color: "text-purple-600"
        };
      case "reader":
      default:
        return {
          title: "Reader Account Pending",
          subtitle: "Your reader account is awaiting admin approval",
          icon: User,
          color: "text-green-600"
        };
    }
  };

  const { title, subtitle, icon: RoleIcon, color } = getRoleConfig();

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
                <RoleIcon className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-urdu-brown">{title}</h1>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>

            {/* Clock Animation */}
            <div className="flex justify-center mb-3">
              <div className="p-2 bg-urdu-gold/10 rounded-full animate-pulse">
                <Clock className="w-6 h-6 text-urdu-maroon" />
              </div>
            </div>

            {/* Info Box */}
            <div className="p-2 bg-urdu-cream/50 border border-urdu-gold/20 rounded-lg mb-3">
              <div className="flex items-center justify-center gap-2 text-urdu-brown mb-1">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-semibold">Check Your Email</span>
              </div>
              <p className="text-xs text-gray-600">
                You will be notified via email once your account is approved
              </p>
            </div>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium mb-3">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              Pending Approval
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
                onClick={() => navigate("/auth")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-urdu-gold text-urdu-maroon rounded-lg hover:bg-urdu-cream/50 transition-all text-sm font-medium"
              >
                Login with Another Account
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                Approval usually takes 24-48 hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
