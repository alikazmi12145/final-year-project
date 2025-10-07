import React, { useState, useEffect } from "react";
import { Search, Filter, Plus, Grid, List } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PoemCard from "./PoemCard";
import { LoadingSpinner } from "../ui/LoadingSpinner";

const PoemList = ({
  poems = [],
  loading = false,
  showActions = false,
  onEdit,
  onDelete,
  onSearch,
  onFilter,
  showHeader = true,
  showCreateButton = false,
  onCreateNew,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEra, setSelectedEra] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("urdu");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Handle bookmark functionality
  const handleBookmark = async (poemId) => {
    if (!user) {
      alert("برا کرم لاگ ان کریں - Please login to bookmark poems");
      return;
    }

    try {
      // Dynamic import to avoid circular dependencies
      const { poetryAPI } = await import("../../services/api");
      const response = await poetryAPI.toggleBookmark(poemId);

      console.log("✅ بُک مارک اپڈیٹ ہو گیا - Bookmark updated!");
      return response;
    } catch (error) {
      console.error("Bookmark error:", error);
      alert("نیٹ ورک کی خرابی - Network error, please try again");
      throw error;
    }
  };

  const categories = [
    { value: "all", label: "تمام اقسام" },
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

  const eras = [
    { value: "all", label: "تمام ادوار" },
    { value: "classical", label: "کلاسیکی دور" },
    { value: "modern", label: "جدید دور" },
    { value: "contemporary", label: "عصر حاضر" },
  ];

  const languages = [
    { value: "urdu", label: "اردو" },
    { value: "punjabi", label: "پنجابی" },
    { value: "arabic", label: "عربی" },
    { value: "persian", label: "فارسی" },
  ];

  const sortOptions = [
    { value: "createdAt", label: "تاریخ" },
    { value: "likesCount", label: "پسندیدگی" },
    { value: "viewsCount", label: "نظریں" },
    { value: "title", label: "شیر" },
  ];

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  // Filter change handler
  useEffect(() => {
    if (onFilter) {
      onFilter({
        category: selectedCategory,
        era: selectedEra,
        language: selectedLanguage,
        sortBy,
        sortOrder,
      });
    }
  }, [
    selectedCategory,
    selectedEra,
    selectedLanguage,
    sortBy,
    sortOrder,
    onFilter,
  ]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {showHeader && (
          <div className="mb-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-urdu-brown">
                شاعری کا خزانہ
              </h1>
              <div className="flex items-center space-x-4">
                {showCreateButton && (
                  <button
                    onClick={onCreateNew}
                    className="flex items-center space-x-2 px-4 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>نئی نظم</span>
                  </button>
                )}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "grid"
                        ? "bg-urdu-gold text-white"
                        : "text-urdu-brown hover:bg-urdu-cream"
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "list"
                        ? "bg-urdu-gold text-white"
                        : "text-urdu-brown hover:bg-urdu-cream"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
                      placeholder="نظمیں تلاش کریں..."
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span>فلٹر</span>
                </button>
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-urdu-brown mb-1">
                      قسم
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Era Filter */}
                  <div>
                    <label className="block text-sm font-medium text-urdu-brown mb-1">
                      دور
                    </label>
                    <select
                      value={selectedEra}
                      onChange={(e) => setSelectedEra(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm"
                    >
                      {eras.map((era) => (
                        <option key={era.value} value={era.value}>
                          {era.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Language Filter */}
                  <div>
                    <label className="block text-sm font-medium text-urdu-brown mb-1">
                      زبان
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm"
                    >
                      {languages.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <label className="block text-sm font-medium text-urdu-brown mb-1">
                      ترتیب
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm"
                      >
                        <option value="desc">نازل</option>
                        <option value="asc">صاعد</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mb-4">
          <p className="text-urdu-maroon">{poems.length} نظمیں ملیں</p>
        </div>

        {/* Poems Grid/List */}
        {poems.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {poems.map((poem) => (
              <PoemCard
                key={poem._id}
                poem={poem}
                showActions={showActions}
                onEdit={onEdit}
                onDelete={onDelete}
                onBookmark={handleBookmark}
                isBookmarked={
                  user?.bookmarkedPoems?.includes(poem._id) || false
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="card p-8">
              <h3 className="text-xl font-semibold text-urdu-brown mb-2">
                کوئی نظم نہیں ملی
              </h3>
              <p className="text-urdu-maroon mb-4">
                اپنی تلاش کو تبدیل کرنے کی کوشش کریں یا فلٹر کو صاف کریں
              </p>
              {showCreateButton && (
                <button
                  onClick={onCreateNew}
                  className="px-6 py-3 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
                >
                  پہلی نظم بنائیں
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoemList;
