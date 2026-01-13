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
  const [rekhtaMatches, setRekhtaMatches] = useState([]);
  const [bestRekhtaMatch, setBestRekhtaMatch] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Enhanced OCR processing with backend API (GPT-4o Vision + Python fallback)
  const processImageWithOCR = useCallback(async (imageFile) => {
    setIsProcessing(true);
    setOcrProgress(0);
    setExtractedText("");
    setOcrConfidence(0);

    try {
      // Try backend API first (uses GPT-4o Vision with Python fallback)
      console.log("📸 Sending image to backend AI service for OCR...");
      setOcrProgress(10);

      try {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('searchAfterOCR', 'true');

        // Use backend API which has GPT-4o Vision OCR
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const backendResponse = await fetch(`${API_BASE_URL}/ai-search/image`, {
          method: 'POST',
          body: formData,
        });

        setOcrProgress(50);

        if (backendResponse.ok) {
          const ocrResult = await backendResponse.json();
          setOcrProgress(80);

          if (ocrResult.success && ocrResult.ocr?.extracted_text) {
            console.log("✅ Backend OCR completed successfully!");
            console.log("📊 OCR Stats:");
            console.log("   - Text length:", ocrResult.ocr.extracted_text.length);
            console.log("   - Confidence:", (ocrResult.ocr.confidence * 100).toFixed(2) + "%");
            console.log("   - Method:", ocrResult.ocr.method);
            console.log("   - Extracted text:", ocrResult.ocr.extracted_text);
            
            setExtractedText(ocrResult.ocr.extracted_text);
            setOcrConfidence(ocrResult.ocr.confidence * 100);
            setOcrProgress(100);

            // If backend already searched, use those results
            if (ocrResult.search_results) {
              const aiMatches = ocrResult.search_results.ai_matches || [];
              const localMatches = ocrResult.search_results.local_matches || [];
              setSearchResults([...localMatches, ...aiMatches]);
              setRekhtaMatches(aiMatches);
              if (aiMatches.length > 0) {
                setBestRekhtaMatch(aiMatches[0]);
              }
            } else if (ocrResult.ocr.extracted_text.trim().length > 2) {
              // Perform search if text is meaningful
              await performImageSearch(ocrResult.ocr.extracted_text, ocrResult.ocr.confidence * 100);
            }
            return; // Success, exit early
          } else {
            console.warn("⚠️ Backend service returned no text");
          }
        } else {
          const errorText = await backendResponse.text();
          console.error("⚠️ Backend service returned error:", backendResponse.status, errorText);
          throw new Error(`HTTP ${backendResponse.status}: ${errorText}`);
        }
      } catch (backendError) {
        console.warn("⚠️ Backend OCR failed:", backendError.message);
        console.log("🔄 Falling back to browser OCR (Tesseract.js)...");
        
        // Fallback to browser OCR
        setOcrProgress(10);
        console.log("📸 Using browser OCR (Tesseract.js)...");
          
        const {
          data: { text, confidence },
        } = await Tesseract.recognize(
          imageFile,
          "urd+eng+ara", // Urdu, English, Arabic
          {
            logger: (progress) => {
              if (progress.status === "recognizing text") {
                setOcrProgress(Math.round(10 + progress.progress * 90));
              }
            },
          }
        );

        console.log("✅ Browser OCR completed:", { textLength: text.length, confidence });
        console.log("📝 Extracted text:", text);
        
        setExtractedText(text);
        setOcrConfidence(confidence);
        setOcrProgress(100);

        if (text && text.trim().length > 2) {
          await performImageSearch(text, confidence);
        } else {
          showError("تصویر سے کافی متن نہیں نکل سکا۔ واضح تصویر استعمال کریں۔");
        }
      }
    } catch (error) {
      console.error("❌ OCR processing failed completely:", error);
      showError(
        "متن نکالنے میں خرابی۔ براہ کرم صاف اور واضح تصویر استعمال کریں۔"
      );
      setOcrProgress(0);
    } finally {
      setIsProcessing(false);
    }
  }, [showError]);

  // Dynamic image search with MongoDB integration
  const performImageSearch = useCallback(
    async (text, confidence) => {
      if (!text || text.trim().length === 0) {
        setSearchResults([]);
        setRekhtaMatches([]);
        setBestRekhtaMatch(null);
        return;
      }

      setSearchLoading(true);
      try {
        console.log("📸 Performing image search with extracted text:", text);

        const response = await api.search.image(text, confidence, {
          language: "all",
          useAI: true,
          sortBy: "relevance",
          useRekhta: true, // Enable Rekhta integration
        });

        if (response.data.success) {
          setSearchResults(response.data.results || []);
          
          // Store Rekhta matches if available
          if (response.data.rekhtaMatches) {
            console.log("✅ Received Rekhta matches:", response.data.rekhtaMatches.length);
            setRekhtaMatches(response.data.rekhtaMatches);
          }
          
          if (response.data.bestRekhtaMatch) {
            console.log("🏆 Best Rekhta match:", response.data.bestRekhtaMatch.title);
            setBestRekhtaMatch(response.data.bestRekhtaMatch);
          }

          // Call parent onSearch callback
          if (onSearch) {
            onSearch({
              query: text,
              extractedText: text,
              ocrConfidence: confidence,
              searchType: "image",
              results: response.data.results || [],
              rekhtaMatches: response.data.rekhtaMatches,
              bestRekhtaMatch: response.data.bestRekhtaMatch,
            });
          }
        }
      } catch (error) {
        console.error("❌ Image search error:", error);
        setSearchResults([]);
        setRekhtaMatches([]);
        setBestRekhtaMatch(null);
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

      {/* Rekhta Matches Section */}
      {bestRekhtaMatch && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-2 border-purple-300 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
            </svg>
            <h3 className="text-xl font-bold text-purple-800">
              🏆 ریختہ سے بہترین میچ
            </h3>
            {bestRekhtaMatch.match_score && (
              <span className="ml-auto px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold">
                {Math.round(bestRekhtaMatch.match_score)}% مماثلت
              </span>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg border border-purple-200 mb-3">
            <h4 className="text-lg font-bold text-gray-800 mb-2" dir="rtl">
              {bestRekhtaMatch.title}
            </h4>
            <p className="text-purple-700 font-medium mb-2" dir="rtl">
              شاعر: {bestRekhtaMatch.poet}
            </p>
            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
              {bestRekhtaMatch.category}
            </span>
          </div>

          {bestRekhtaMatch.verses && (
            <div className="bg-white p-4 rounded-lg border border-purple-200 mb-3">
              <h5 className="font-semibold text-gray-700 mb-2">اشعار:</h5>
              <div className="text-gray-800 leading-relaxed whitespace-pre-line" dir="rtl">
                {bestRekhtaMatch.verses}
              </div>
            </div>
          )}

          {bestRekhtaMatch.url && (
            <a
              href={bestRekhtaMatch.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              ریختہ پر مکمل نظم دیکھیں
            </a>
          )}
        </div>
      )}

      {/* More Rekhta Matches */}
      {rekhtaMatches && rekhtaMatches.length > 1 && (
        <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
          <h4 className="font-bold text-purple-800 mb-3 text-lg">
            مزید ریختہ نتائج ({rekhtaMatches.length - 1})
          </h4>
          <div className="space-y-3">
            {rekhtaMatches.slice(1, 4).map((match, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border border-purple-100 hover:border-purple-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-semibold text-gray-800" dir="rtl">{match.title}</h5>
                  {match.match_score && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                      {Math.round(match.match_score)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-purple-600 mb-2" dir="rtl">
                  شاعر: {match.poet}
                </p>
                {match.verses && (
                  <p className="text-sm text-gray-600 line-clamp-2" dir="rtl">
                    {match.verses}
                  </p>
                )}
                {match.url && (
                  <a
                    href={match.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:text-purple-800 underline mt-2 inline-block"
                  >
                    مزید پڑھیں →
                  </a>
                )}
              </div>
            ))}
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
