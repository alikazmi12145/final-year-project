import React, { useState } from "react";
import { Download, Share2, X } from "lucide-react";
import html2canvas from "html2canvas";

const PoetryCardGenerator = ({ poem, poet, onClose }) => {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const generateImage = async () => {
    setGenerating(true);
    try {
      const cardElement = document.getElementById("poetry-card-preview");
      if (!cardElement) return;

      const canvas = await html2canvas(cardElement, {
        backgroundColor: "#8b4513",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imageUrl = canvas.toDataURL("image/png");
      setPreviewUrl(imageUrl);
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!previewUrl) return;

    const link = document.createElement("a");
    link.download = `${poem.title || "poetry"}-${Date.now()}.png`;
    link.href = previewUrl;
    link.click();
  };

  const shareImage = async () => {
    if (!previewUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const file = new File([blob], `${poem.title || "poetry"}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: poem.title,
          text: `${poem.title} - ${poet?.name || ""}`,
        });
      } else {
        downloadImage();
      }
    } catch (error) {
      console.error("Error sharing image:", error);
      downloadImage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="nastaleeq-heading text-2xl font-bold text-amber-900" dir="rtl">
            شعر کو تصویر کے طور پر محفوظ کریں
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Preview Card */}
        <div className="p-6">
          <div
            id="poetry-card-preview"
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #8b4513 0%, #a0522d 50%, #d2691e 100%)",
              padding: "3rem 2.5rem",
              minHeight: "400px",
            }}
          >
            {/* Decorative Patterns */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpolygon points='30 0 60 30 30 60 0 30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: "40px 40px",
              }}
            ></div>

            {/* Decorative Borders */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-amber-300 rounded-tl-lg"></div>
            <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-amber-300 rounded-tr-lg"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-amber-300 rounded-bl-lg"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-amber-300 rounded-br-lg"></div>

            {/* Content */}
            <div className="relative z-10 text-center space-y-8">
              {/* Logo/Title */}
              <div className="mb-8">
                <h1
                  className="nastaleeq-heading text-4xl md:text-5xl font-bold text-amber-200 mb-2"
                  style={{
                    textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    letterSpacing: "0.05em",
                  }}
                  dir="rtl"
                >
                  بزم سخن
                </h1>
                <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-amber-300 to-transparent"></div>
              </div>

              {/* Poem Title */}
              {poem.title && (
                <h2
                  className="nastaleeq-heading text-2xl md:text-3xl font-bold text-white mb-6"
                  style={{
                    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                  dir="rtl"
                >
                  {poem.title}
                </h2>
              )}

              {/* Poem Content */}
              <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 border-2 border-amber-300/50">
                <div
                  className="nastaleeq-primary text-xl md:text-2xl text-white leading-loose whitespace-pre-line"
                  style={{
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    lineHeight: "2.5",
                    fontWeight: "500",
                  }}
                  dir="rtl"
                >
                  {poem.content.split("\n").slice(0, 4).join("\n")}
                </div>
              </div>

              {/* Poet Name */}
              <div className="pt-6 border-t-2 border-amber-300/50">
                <p
                  className="nastaleeq-primary text-xl text-amber-200 font-semibold"
                  style={{
                    textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                  dir="rtl"
                >
                  {poet?.name || "نامعلوم شاعر"}
                </p>
                {poem.category && (
                  <p className="text-sm text-amber-300 mt-2">
                    {poem.category}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="pt-6">
                <p
                  className="nastaleeq-primary text-sm text-amber-300/80"
                  dir="rtl"
                >
                  اردو شاعری کا ڈیجیٹل ذخیرہ
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={generateImage}
              disabled={generating}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  تیار ہو رہا ہے...
                </span>
              ) : (
                <>
                  <Share2 className="w-5 h-5 ml-2" />
                  <span className="nastaleeq-primary font-bold">تصویر بنائیں</span>
                </>
              )}
            </button>

            {previewUrl && (
              <>
                <button
                  onClick={downloadImage}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-green-700 transition-all duration-300"
                >
                  <Download className="w-5 h-5 ml-2" />
                  <span className="nastaleeq-primary font-bold">ڈاؤن لوڈ</span>
                </button>

                <button
                  onClick={shareImage}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-300"
                >
                  <Share2 className="w-5 h-5 ml-2" />
                  <span className="nastaleeq-primary font-bold">شیئر کریں</span>
                </button>
              </>
            )}
          </div>

          {/* Preview Image */}
          {previewUrl && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-3 text-center nastaleeq-primary" dir="rtl">
                پیش منظر:
              </p>
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoetryCardGenerator;
