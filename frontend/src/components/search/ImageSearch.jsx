import React, { useState, useRef, useCallback } from "react";
import { Upload, Image, Camera, X, Eye, Scan, FileImage } from "lucide-react";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useMessage } from "../../context/MessageContext";
import api from "../../services/api";
import Tesseract from "tesseract.js";

const ImageSearch = ({ onSearch, loading = false }) => {
  const { showError } = useMessage();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Enhanced OCR processing with progress tracking
  const processImageWithOCR = useCallback(async (imageFile) => {
    setIsProcessing(true);
    setOcrProgress(0);
    setExtractedText("");
    setOcrConfidence(0);

    try {
      console.log("📸 Starting OCR processing for image search");

      const {
        data: { text, confidence },
      } = await Tesseract.recognize(
        imageFile,
        "urd+eng+ara", // Urdu, English, Arabic
        {
          logger: (progress) => {
            console.log("OCR Progress:", progress);
            if (progress.status === "recognizing text") {
              setOcrProgress(Math.round(progress.progress * 100));
            }
          },
        }
      );

      console.log("📸 OCR completed:", { text, confidence });

      setExtractedText(text);
      setOcrConfidence(confidence);
      setOcrProgress(100);

      // Automatically search if text is extracted with good confidence
      if (text && text.trim().length > 2) {
        await performImageSearch(text, confidence);
      }
    } catch (error) {
      console.error("❌ OCR processing error:", error);
      showError(
        "OCR processing failed. Please try with a clearer image. / OCR پروسیسنگ ناکام ہوگئی۔ واضح تصویر کے ساتھ کوشش کریں۔"
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Dynamic image search with MongoDB integration
  const performImageSearch = useCallback(
    async (text, confidence) => {
      if (!text || text.trim().length === 0) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        console.log("📸 Performing image search with extracted text:", text);

        const response = await api.search.image(text, confidence, {
          language: "all",
          useAI: true,
          sortBy: "relevance",
        });

        if (response.data.success) {
          setSearchResults(response.data.results || []);

          // Call parent onSearch callback
          if (onSearch) {
            onSearch({
              query: text,
              extractedText: text,
              ocrConfidence: confidence,
              searchType: "image",
              results: response.data.results || [],
            });
          }
        }
      } catch (error) {
        console.error("❌ Image search error:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [onSearch]
  );

  const handleImageUpload = useCallback(
    (file) => {
      if (file && file.type.startsWith("image/")) {
        setSelectedImage(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);

        // Clear previous results
        setExtractedText("");
        setOcrProgress(0);
        setSearchResults([]);

        // Process with OCR
        processImageWithOCR(file);
      }
    },
    [processImageWithOCR]
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageUpload(e.dataTransfer.files[0]);
      }
    },
    [handleImageUpload]
  );

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const performOCR = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setOcrProgress(0);

    try {
      const {
        data: { text },
      } = await Tesseract.recognize(
        selectedImage,
        "urd+eng+ara", // Urdu, English, Arabic
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      setExtractedText(text);

      // Auto-search if text is extracted
      if (text && text.trim()) {
        handleImageSearch(text);
      }
    } catch (error) {
      console.error("OCR Error:", error);
      showError(
        "تصویر سے متن نکالنے میں خرابی ہوئی۔ دوبارہ کوشش کریں۔ / Error extracting text from image. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const handleImageSearch = (text = extractedText) => {
    if (text && text.trim()) {
      onSearch({
        image: imagePreview,
        extractedText: text.trim(),
        searchType: "image",
      });
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedText("");
    setOcrProgress(0);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Image Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          dragActive
            ? "border-purple-500 bg-purple-50"
            : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!imagePreview ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-purple-100 rounded-full">
                <FileImage className="w-12 h-12 text-purple-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800">
                تصویر اپ لوڈ کریں
              </h3>
              <p className="text-gray-600" dir="rtl">
                شاعری، کتاب کا صفحہ، یا ہاتھ سے لکھا ہوا متن
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={triggerFileSelect}
                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Upload className="w-4 h-4" />
                فائل منتخب کریں
              </Button>

              <Button
                onClick={triggerCameraCapture}
                variant="outline"
                className="flex items-center gap-2 border-purple-200 hover:border-purple-400"
              >
                <Camera className="w-4 h-4" />
                کیمرا استعمال کریں
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              PNG, JPG, GIF تک 5MB (یہاں کھینچ کر چھوڑ سکتے ہیں)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative inline-block max-w-full">
              <img
                src={imagePreview}
                alt="Uploaded preview"
                className="max-w-full max-h-64 rounded-lg shadow-md"
              />
              <Button
                onClick={clearImage}
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 p-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={performOCR}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    متن نکال رہے ہیں...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    متن نکالیں
                  </>
                )}
              </Button>

              <Button
                onClick={triggerFileSelect}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                دوسری تصویر
              </Button>
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* OCR Progress */}
      {isProcessing && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <LoadingSpinner size="sm" />
            <span className="font-medium text-blue-800">
              متن کی شناخت جاری ہے...
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${ocrProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-blue-600 mt-1">{ocrProgress}% مکمل</p>
        </div>
      )}

      {/* Extracted Text */}
      {extractedText && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-gray-800">نکالا گیا متن:</h4>
            <div className="flex gap-2">
              <Button
                onClick={() => handleImageSearch()}
                disabled={loading}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {loading ? "تلاش جاری..." : "تلاش کریں"}
              </Button>
              <Button
                onClick={() => setExtractedText("")}
                variant="outline"
                size="sm"
              >
                صاف کریں
              </Button>
            </div>
          </div>

          <div
            className="bg-gray-50 p-3 rounded border min-h-[100px]"
            dir="rtl"
          >
            {extractedText ? (
              <div className="space-y-2">
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="w-full bg-transparent border-none resize-none focus:outline-none text-lg leading-relaxed"
                  rows="4"
                  placeholder="یہاں نکالا گیا متن دکھایا جائے گا..."
                />
              </div>
            ) : (
              <p className="text-gray-500 italic">کوئی متن نہیں نکالا گیا...</p>
            )}
          </div>
        </div>
      )}

      {/* Image Search Tips */}
      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
        <h4 className="font-medium text-amber-800 mb-2">بہتر نتائج کے لیے:</h4>
        <ul className="text-sm text-amber-700 space-y-1" dir="rtl">
          <li>• صاف اور واضح تصویر استعمال کریں</li>
          <li>• متن کو اچھی روشنی میں فوٹو کریں</li>
          <li>• تصویر میں صرف متن ہو، دوسری چیزیں نہ ہوں</li>
          <li>• اردو، عربی اور انگریزی تینوں زبانوں کو سپورٹ</li>
          <li>• ہاتھ سے لکھا ہوا متن بھی پڑھ سکتے ہیں</li>
        </ul>
      </div>

      {/* Supported Formats */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-800 mb-2">سپورٹ شدہ فارمیٹس:</h4>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">
            JPG
          </span>
          <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">
            PNG
          </span>
          <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">
            GIF
          </span>
          <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">
            WEBP
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImageSearch;
