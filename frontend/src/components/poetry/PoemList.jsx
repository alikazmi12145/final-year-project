import React, { useState, useEffect } from "react";
import { Search, Filter, Plus, Grid, List, X, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMessage } from "../../context/MessageContext";
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
  const { showMessage } = useMessage();
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
      showMessage(
        "براہ کرم لاگ ان کریں",
        "Please login to bookmark poems",
        "info"
      );
      return;
    }

    try {
      // Dynamic import to avoid circular dependencies
      const { poetryAPI } = await import("../../services/api.jsx");
      const response = await poetryAPI.toggleBookmark(poemId);

      return response;
    } catch (error) {
      console.error("Bookmark error:", error);
      showMessage(
        "نیٹ ورک کی خرابی",
        "Network error, please try again",
        "error"
      );
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
    { value: "medieval", label: "قرون وسطیٰ" },
    { value: "modern", label: "جدید دور" },
    { value: "contemporary", label: "عصری دور" },
  ];

  const languages = [
    { value: "urdu", label: "اردو" },
    { value: "arabic", label: "عربی" },
    { value: "persian", label: "فارسی" },
    { value: "punjabi", label: "پنجابی" },
    { value: "english", label: "انگریزی" },
  ];

  const sortOptions = [
    { value: "createdAt", label: "تاریخ" },
    { value: "title", label: "عنوان" },
    { value: "author", label: "شاعر" },
    { value: "likesCount", label: "پسندیدگی" },
    { value: "viewsCount", label: "نظارے" },
  ];

  // Search handler with debouncing
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

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedEra("all");
    setSelectedLanguage("urdu");
    setSortBy("createdAt");
    setSortOrder("desc");
    setSearchTerm("");
  };

  const hasActiveFilters = () => {
    return (
      selectedCategory !== "all" ||
      selectedEra !== "all" ||
      selectedLanguage !== "urdu" ||
      sortBy !== "createdAt" ||
      sortOrder !== "desc" ||
      searchTerm !== ""
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-urdu-cream/30 via-white to-urdu-gold/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream/30 via-white to-urdu-gold/10 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showHeader && (
          <div className="mb-8">
            {/* Enhanced Header */}
            <div className="text-center mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-urdu-cream">
                <h1 className="text-4xl md:text-5xl font-bold text-urdu-brown mb-4 urdu-text">
                  شاعری کا خزانہ
                </h1>
                <p className="text-urdu-maroon text-lg mb-6">
                  اردو ادب کے بہترین کلام کا مجموعہ
                </p>

                {/* Stats */}
                <div className="flex justify-center items-center space-x-8 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-urdu-gold">
                      {poems.length}
                    </div>
                    <div className="text-sm text-urdu-maroon">نظمیں</div>
                  </div>
                  <div className="w-px h-12 bg-urdu-cream"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-urdu-gold">
                      {poems.reduce(
                        (total, poem) =>
                          total +
                          (Array.isArray(poem.likes) ? poem.likes.length : 0),
                        0
                      )}
                    </div>
                    <div className="text-sm text-urdu-maroon">پسندیدگی</div>
                  </div>
                  <div className="w-px h-12 bg-urdu-cream"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-urdu-gold">
                      {poems.reduce(
                        (total, poem) => total + (poem.views || 0),
                        0
                      )}
                    </div>
                    <div className="text-sm text-urdu-maroon">مطالعہ</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center items-center space-x-4">
                  {showCreateButton && (
                    <button
                      onClick={onCreateNew}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      <Plus className="w-5 h-5" />
                      <span>نئی نظم لکھیں</span>
                    </button>
                  )}

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === "grid"
                          ? "bg-urdu-gold text-white"
                          : "bg-gray-100 text-urdu-brown hover:bg-urdu-cream"
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === "list"
                          ? "bg-urdu-gold text-white"
                          : "bg-gray-100 text-urdu-brown hover:bg-urdu-cream"
                      }`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Search and Filter Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-urdu-cream/50 mb-6">
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-urdu-maroon w-5 h-5" />
                <input
                  type="text"
                  placeholder="شاعر، نظم، یا مضمون تلاش کریں..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-12 py-3 border border-urdu-cream rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-urdu-brown placeholder-urdu-maroon/60 bg-white/90"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-urdu-maroon hover:text-urdu-gold transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Filter Toggle */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 px-4 py-2 bg-urdu-cream hover:bg-urdu-cream/80 text-urdu-brown rounded-lg transition-all duration-200"
                  >
                    <Filter className="w-4 h-4" />
                    <span>فلٹر {showFilters ? "چھپائیں" : "دکھائیں"}</span>
                  </button>

                  {hasActiveFilters() && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 text-sm"
                    >
                      فلٹر صاف کریں
                    </button>
                  )}
                </div>

                <div className="text-sm text-urdu-maroon bg-urdu-gold/10 px-3 py-2 rounded-lg flex items-center space-x-2">
                  <span className="font-medium">{poems.length}</span>
                  <span>نظمیں ملیں</span>
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-2 p-1 hover:bg-urdu-gold/20 rounded transition-colors"
                    title="دوبارہ لوڈ کریں"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Category Filter Buttons - As shown in image */}
              <div className="flex flex-wrap gap-3 mb-6">
                {[
                  { value: "all", label: "تمام اقسام" },
                  { value: "ghazal", label: "غزل" },
                  { value: "nazm", label: "نظم" },
                  { value: "rubai", label: "رباعی" },
                  { value: "manqabat", label: "منقبت" },
                ].map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category.value
                        ? "bg-urdu-brown text-white shadow-lg"
                        : "bg-urdu-cream text-urdu-brown hover:bg-urdu-brown hover:text-white"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Advanced Filters Panel */}
              {showFilters && (
                <div className="mt-6 p-6 bg-gradient-to-r from-urdu-cream/20 to-urdu-gold/10 rounded-xl border border-urdu-cream">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-urdu-brown mb-2">
                        صنف
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-urdu-cream rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm bg-white"
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
                      <label className="block text-sm font-medium text-urdu-brown mb-2">
                        دور
                      </label>
                      <select
                        value={selectedEra}
                        onChange={(e) => setSelectedEra(e.target.value)}
                        className="w-full px-3 py-2 border border-urdu-cream rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm bg-white"
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
                      <label className="block text-sm font-medium text-urdu-brown mb-2">
                        زبان
                      </label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full px-3 py-2 border border-urdu-cream rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm bg-white"
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
                      <label className="block text-sm font-medium text-urdu-brown mb-2">
                        ترتیب
                      </label>
                      <div className="flex space-x-2">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="flex-1 px-3 py-2 border border-urdu-cream rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm bg-white"
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
                          className="px-3 py-2 border border-urdu-cream rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent text-sm bg-white"
                        >
                          <option value="desc">نازل</option>
                          <option value="asc">صاعد</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Poems Grid/List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-urdu-gold mx-auto mb-4"></div>
              <p className="text-urdu-brown">نظمیں لوڈ ہو رہی ہیں...</p>
            </div>
          </div>
        ) : poems.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"
                : "space-y-6"
            }
          >
            {poems.map((poem) => (
              <div
                key={poem._id}
                className="flex transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <PoemCard
                  poem={poem}
                  showActions={showActions}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onBookmark={handleBookmark}
                  isBookmarked={
                    user?.bookmarkedPoems?.includes(poem._id) || false
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-urdu-cream">
              <h3 className="text-xl font-semibold text-urdu-brown mb-2">
                کوئی نظم نہیں ملی
              </h3>
              <p className="text-urdu-maroon mb-4">
                اپنی تلاش کو تبدیل کرنے کی کوشش کریں یا فلٹر کو صاف کریں
              </p>
              {showCreateButton && (
                <button
                  onClick={onCreateNew}
                  className="px-6 py-3 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
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
