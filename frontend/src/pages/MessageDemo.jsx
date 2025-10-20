import React from "react";
import { useMessage } from "../context/MessageContext";

const MessageDemo = () => {
  const { showSuccess, showError, showWarning, showInfo } = useMessage();

  const demoMessages = [
    {
      title: "Success Message",
      action: () =>
        showSuccess("کامیابی سے مکمل ہو گیا! / Successfully completed!", {
          position: "top-center",
          duration: 5000,
        }),
      color: "bg-emerald-500",
    },
    {
      title: "Error Message",
      action: () =>
        showError("خرابی! کچھ غلط ہو گیا / Error! Something went wrong", {
          position: "top-right",
          duration: 6000,
        }),
      color: "bg-red-500",
    },
    {
      title: "Warning Message",
      action: () =>
        showWarning("تنبیہ! احتیاط کریں / Warning! Please be careful", {
          position: "bottom-center",
          duration: 4000,
        }),
      color: "bg-amber-500",
    },
    {
      title: "Info Message",
      action: () =>
        showInfo(
          "معلومات: یہ ایک ٹیسٹ پیغام ہے / Info: This is a test message",
          {
            position: "center",
            duration: 7000,
          }
        ),
      color: "bg-blue-500",
    },
  ];

  return (
    <div className="min-h-screen cultural-bg py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-urdu-brown mb-4" dir="rtl">
            ثقافتی پیغام پاپ اپ ڈیمو
          </h1>
          <h2 className="text-2xl text-gray-600 mb-8">
            Cultural Message Popup Demo
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            یہاں مختلف قسم کے ثقافتی پیغامات کا تجربہ کریں جو صارفین کو خوبصورت
            انداز میں آگاہ کرتے ہیں
          </p>
          <p className="text-base text-gray-600 mt-2">
            Try different types of cultural messages that inform users in a
            beautiful way
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demoMessages.map((msg, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center mb-4">
                <div className={`w-4 h-4 rounded-full ${msg.color} mr-3`}></div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {msg.title}
                </h3>
              </div>

              <button
                onClick={msg.action}
                className={`w-full py-3 px-6 ${msg.color} text-white rounded-lg font-medium
                  hover:opacity-90 transform hover:scale-105 transition-all duration-200
                  shadow-md hover:shadow-lg`}
              >
                Show {msg.title}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-8 border border-amber-200">
          <h3 className="text-xl font-bold text-amber-800 mb-4 text-center">
            Features / خصوصیات
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p>• Islamic geometric patterns / اسلامی ہندسی نقوش</p>
              <p>• Traditional decorative corners / روایتی سجاوٹی کونے</p>
              <p>• Bilingual support (Urdu/English) / دو لسانی سہولت</p>
              <p>• Multiple positions / متعدد جگہیں</p>
            </div>
            <div className="space-y-2">
              <p>• Auto-close with timer / خودکار بند ہونا</p>
              <p>• Cultural color schemes / ثقافتی رنگ سکیم</p>
              <p>• Smooth animations / ہموار حرکات</p>
              <p>• Responsive design / ریسپانسو ڈیزائن</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Click any button above to see the cultural message popup in action!
          </p>
          <p className="text-sm text-gray-500 mt-2" dir="rtl">
            اوپر کسی بھی بٹن پر کلک کریں تاکہ ثقافتی پیغام پاپ اپ کو عمل میں
            دیکھ سکیں!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageDemo;
