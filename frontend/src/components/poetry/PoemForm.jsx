import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const PoemForm = ({ onSubmit, initialData = null, isLoading = false, apiError = null }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "ghazal",
    description: "",
    tags: [],
    poetryLanguage: "urdu",
  });

  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [apiErrors, setApiErrors] = useState([]);

  // Categories for poetry
  const categories = [
    { value: "ghazal", label: "غزل" },
    { value: "nazm", label: "نظم" },
    { value: "rubai", label: "رباعی" },
    { value: "qasida", label: "قصیدہ" },
    { value: "masnavi", label: "مثنوی" },
    { value: "free_verse", label: "آزاد نظم" },
    { value: "hamd", label: "حمد" },
    { value: "naat", label: "نعت" },
    { value: "manqabat", label: "منقبت" },
    { value: "marsiya", label: "مرثیہ" },
  ];

  const languages = [
    { value: "urdu", label: "اردو" },
    { value: "punjabi", label: "پنجابی" },
    { value: "arabic", label: "عربی" },
    { value: "persian", label: "فارسی" },
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        content: initialData.content || "",
        category: initialData.category || "ghazal",
        description: initialData.description || "",
        tags: initialData.tags || [],
        poetryLanguage: initialData.poetryLanguage || "urdu",
      });
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "شیر مطلوب ہے";
    } else if (formData.title.length < 2) {
      newErrors.title = "شیر کم از کم 2 حروف کا ہونا چاہیے";
    }

    if (!formData.content.trim()) {
      newErrors.content = "نظم کا متن مطلوب ہے";
    } else if (formData.content.length < 10) {
      newErrors.content = "نظم کا متن کم از کم 10 حروف کا ہونا چاہیے";
    }

    if (!formData.category) {
      newErrors.category = "نظم کی قسم مطلوب ہے";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setApiErrors([]);
    if (!validateForm()) {
      return;
    }

    onSubmit(formData, setApiErrors);
  };

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-urdu-brown hover:bg-urdu-cream rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-urdu-brown">
              {isEditing ? "نظم میں تبدیلی" : "نئی نظم"}
            </h1>
          </div>
        </div>

        {/* API Error Display */}
        {(apiError || apiErrors.length > 0) && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded text-red-700">
            {apiError && <div>{apiError}</div>}
            {apiErrors.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {apiErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-2">
                شیر <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-colors urdu-text ${
                  errors.title ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="نظم کا شیر لکھیں..."
                dir="rtl"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Category and Language */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2">
                  نظم کی قسم <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-colors ${
                    errors.category ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2">
                  زبان
                </label>
                <select
                  name="poetryLanguage"
                  value={formData.poetryLanguage}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-colors"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-2">
                نظم کا متن <span className="text-red-500">*</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows={12}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-colors urdu-text ${
                  errors.content ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="اپنی نظم یہاں لکھیں..."
                dir="rtl"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content}</p>
              )}
              <p className="mt-1 text-sm text-urdu-maroon">
                حروف: {formData.content.length}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-2">
                تفصیل
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-colors urdu-text"
                placeholder="نظم کی تفصیل یا پس منظر..."
                dir="rtl"
              />
              <p className="mt-1 text-sm text-urdu-maroon">
                حروف: {formData.description.length}/500
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-2">
                ٹیگز
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent transition-colors"
                  placeholder="ٹیگ لکھیں..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddTag(e);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
                >
                  شامل کریں
                </button>
              </div>

              {/* Current Tags */}
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-1 bg-urdu-cream text-urdu-brown px-3 py-1 rounded-full text-sm"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-urdu-maroon hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <p className="mt-1 text-sm text-urdu-maroon">
                ٹیگز: {formData.tags.length}/10
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              منسوخ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-3 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>
                {isLoading
                  ? "محفوظ ہو رہا ہے..."
                  : isEditing
                  ? "تبدیلی محفوظ کریں"
                  : "نظم محفوظ کریں"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PoemForm;
