import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Clock, Mail, ArrowRight, Home } from "lucide-react";

const PendingApproval = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get role from either location state or URL query param
  const role = location.state?.role || searchParams.get("role") || "reader";

  const getRoleMessage = () => {
    switch (role) {
      case "poet":
        return {
          title: "شاعر اکاؤنٹ زیر التواء",
          message: "آپ کا شاعر اکاؤنٹ ایڈمن کی منظوری کا منتظر ہے۔ منظوری کے بعد آپ کو ای میل موصول ہوگی۔",
          icon: "✍️"
        };
      case "moderator":
        return {
          title: "موڈریٹر اکاؤنٹ زیر التواء",
          message: "آپ کا موڈریٹر اکاؤنٹ ایڈمن کی منظوری کا منتظر ہے۔ منظوری کے بعد آپ کو ای میل موصول ہوگی۔",
          icon: "🛡️"
        };
      case "reader":
      default:
        return {
          title: "قاری اکاؤنٹ زیر التواء",
          message: "آپ کا قاری اکاؤنٹ ایڈمن کی منظوری کا منتظر ہے۔ منظوری کے بعد آپ کو ای میل موصول ہوگی۔",
          icon: "📚"
        };
    }
  };

  const { title, message, icon } = getRoleMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4 urdu-text-local">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
            <span className="text-5xl">{icon}</span>
          </div>

          {/* Clock Animation */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full animate-pulse">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-800 mb-4" dir="rtl">
            {title}
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed" dir="rtl">
            {message}
          </p>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6" dir="rtl">
            <div className="flex items-center justify-center gap-2 text-amber-700 mb-2">
              <Mail className="w-5 h-5" />
              <span className="font-semibold">ای میل چیک کریں</span>
            </div>
            <p className="text-sm text-amber-600">
              منظوری کے بعد آپ کو ای میل کے ذریعے مطلع کیا جائے گا
            </p>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            زیر التواء - Pending Approval
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
            >
              <Home className="w-5 h-5" />
              <span>ہوم پیج پر جائیں</span>
            </button>

            <button
              onClick={() => navigate("/auth")}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-amber-500 text-amber-600 rounded-xl hover:bg-amber-50 transition-all"
            >
              <span>دوسرے اکاؤنٹ سے لاگ ان</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Footer */}
          <p className="mt-6 text-xs text-gray-400" dir="rtl">
            منظوری میں عام طور پر 24-48 گھنٹے لگتے ہیں
          </p>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
