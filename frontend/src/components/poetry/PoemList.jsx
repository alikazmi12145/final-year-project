import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Plus,
  Grid,
  List,
  X,
  RefreshCw,
  BookOpen,
  Heart,
  Languages,
  Share2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMessage } from "../../context/MessageContext";
import { usePoems, usePoemInteractions } from "../../hooks/usePoetry";
import PoemCard from "./PoemCard";
import { LoadingSpinner } from "../ui/LoadingSpinner";

// Throttle utility function for performance optimization
const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

const PoemList = ({
  poems: poemsProp, // Accept poems as prop
  loading: loadingProp, // Accept loading as prop
  loadingMore: loadingMoreProp, // Accept loadingMore as prop
  totalCount: totalCountProp, // Accept total count as prop
  hasMore: hasMoreProp, // Accept hasMore as prop
  onLoadMore, // Accept onLoadMore callback
  initialCategory = "all",
  initialSortBy = "popularity",
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

  // Use custom hooks for dynamic poetry data ONLY if poems not provided as prop
  const {
    poems: poemsFromHook,
    loading: loadingFromHook,
    error,
    hasMore,
    options,
    loadMore,
    updateOptions,
    searchPoems: searchPoemsHook,
    filterByCategory,
    refresh,
  } = usePoems({
    category: initialCategory,
    sortBy: initialSortBy,
  });

  // Use props if provided, otherwise use hook data
  const poems = poemsProp !== undefined ? poemsProp : poemsFromHook;
  const loading = loadingProp !== undefined ? loadingProp : loadingFromHook;
  const totalCount = totalCountProp !== undefined ? totalCountProp : poems.length;
  const loadingMore = loadingMoreProp !== undefined ? loadingMoreProp : false;
  const hasMorePoems = hasMoreProp !== undefined ? hasMoreProp : hasMore;

  // Debug logging
  React.useEffect(() => {
    console.log("🎨 PoemList rendering:");
    console.log("  - Poems from prop:", poemsProp?.length);
    console.log("  - Poems from hook:", poemsFromHook?.length);
    console.log("  - Using poems:", poems?.length);
    console.log("  - Loading:", loading);
  }, [poemsProp, poemsFromHook, poems, loading]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedEra, setSelectedEra] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("urdu");
  const [sortBy, setSortBy] = useState(initialSortBy);
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
      // Use new bookmark system
      const BookmarkAPI = (await import('../../services/bookmarkAPI')).default;
      const isBookmarked = poems.find(p => p._id === poemId)?.isBookmarked;
      
      if (isBookmarked) {
        await BookmarkAPI.removeByPoemId(poemId);
      } else {
        await BookmarkAPI.addBookmark(poemId);
      }
      
      const response = { data: { success: true, isBookmarked: !isBookmarked } };

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
    { value: "averageRating", label: "اعلیٰ ریٹنگ" },
  ];

  // Search handler with debouncing - enhanced with dynamic API
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        // Use onSearch prop if provided, otherwise use hook
        if (onSearch) {
          onSearch(searchTerm);
        } else {
          searchPoemsHook(searchTerm);
        }
      } else {
        if (onSearch) {
          onSearch("");
        } else {
          updateOptions({ search: undefined });
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearch, searchPoemsHook, updateOptions]);

  // Filter change handler - enhanced with dynamic API
  useEffect(() => {
    // Use onFilter prop if provided, otherwise use hook
    if (onFilter) {
      onFilter({
        category: selectedCategory,
        era: selectedEra,
        language: selectedLanguage,
        sortBy,
        sortOrder,
      });
    } else {
      updateOptions({
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
    updateOptions,
  ]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSelectedCategory(initialCategory);
    setSelectedEra("all");
    setSelectedLanguage("urdu");
    setSortBy(initialSortBy);
    setSortOrder("desc");
    setSearchTerm("");
    // Refresh data with cleared filters
    if (onFilter) {
      onFilter({
        category: initialCategory,
        era: "all",
        language: "urdu",
        sortBy: initialSortBy,
        sortOrder: "desc",
      });
    } else {
      refresh();
    }
  };

  const hasActiveFilters = () => {
    return (
      selectedCategory !== initialCategory ||
      selectedEra !== "all" ||
      selectedLanguage !== "urdu" ||
      sortBy !== initialSortBy ||
      sortOrder !== "desc" ||
      searchTerm !== ""
    );
  };

  // Handle infinite scroll with throttling for better performance
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 &&
      hasMore &&
      !loading
    ) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Throttled scroll handler
  const throttledHandleScroll = useCallback(
    throttle(handleScroll, 100), // Throttle to once every 100ms
    [handleScroll]
  );

  useEffect(() => {
    window.addEventListener("scroll", throttledHandleScroll);
    return () => window.removeEventListener("scroll", throttledHandleScroll);
  }, [throttledHandleScroll]);

  // Show error state
  if (error && poems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-urdu-cream/30 via-white to-urdu-gold/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-red-800 font-medium mb-2 urdu-text">خرابی</h3>
              <p className="text-red-600 text-sm urdu-text">{error}</p>
              <button
                onClick={refresh}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors urdu-text"
              >
                دوبارہ کوشش کریں
              </button>
            </div>
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
                      {totalCount}
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
                  {hasMore && (
                    <span className="text-xs text-urdu-gold">
                      • مزید لوڈ ہو رہا ہے
                    </span>
                  )}
                  <button
                    onClick={refresh}
                    className="ml-2 p-1 hover:bg-urdu-gold/20 rounded transition-colors"
                    title="دوبارہ لوڈ کریں"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Quick Category Filter Buttons - Enhanced with dynamic filtering */}
              <div className="flex flex-wrap gap-3 mb-6">
                {[
                  { value: "all", label: "تمام اقسام" },
                  { value: "ghazal", label: "غزل" },
                  { value: "nazm", label: "نظم" },
                  { value: "rubai", label: "رباعی" },
                  { value: "qasida", label: "قصیدہ" },
                  { value: "manqabat", label: "منقبت" },
                ].map((category) => (
                  <button
                    key={category.value}
                    onClick={() => {
                      setSelectedCategory(category.value);
                      filterByCategory(category.value);
                    }}
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

        {/* Poems Grid/List - Enhanced with infinite scroll and interactions */}
        {loading && poems.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-urdu-gold mx-auto mb-4"></div>
              <p className="text-urdu-brown urdu-text">
                نظمیں لوڈ ہو رہی ہیں...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {poems.length > 0
                  ? `${poems.length} نظمیں لوڈ ہو چکی ہیں`
                  : "براہ کرم انتظار کریں"}
              </p>
            </div>
          </div>
        ) : poems.length > 0 ? (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"
                  : "space-y-6"
              }
            >
              {poems.map((poem, index) => (
                <div
                  key={`${poem._id || poem.id}-${index}`} // Ensure unique keys
                  className="flex transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <EnhancedPoemCard
                    poem={poem}
                    viewMode={viewMode}
                    showActions={showActions}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onBookmark={handleBookmark}
                    isBookmarked={
                      user?.bookmarkedPoems?.includes(poem._id || poem.id) ||
                      false
                    }
                  />
                </div>
              ))}
            </div>

            {/* Loading more indicator */}
            {loadingMore && poems.length > 0 && (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-3 text-urdu-gold">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-urdu-gold"></div>
                  <span className="urdu-text">
                    مزید نظمیں لوڈ ہو رہی ہیں...
                  </span>
                </div>
              </div>
            )}

            {/* Load More Button */}
            {hasMorePoems && !loadingMore && poems.length > 0 && (
              <div className="flex justify-center py-8">
                <button
                  onClick={onLoadMore || loadMore}
                  className="px-8 py-3 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 urdu-text font-semibold"
                >
                  مزید نظمیں دیکھیں ({poems.length} / {totalCount})
                </button>
              </div>
            )}

            {/* End of results */}
            {!hasMorePoems && poems.length > 0 && (
              <div className="text-center py-8 text-gray-500 urdu-text">
                <div className="bg-urdu-cream/30 rounded-lg p-4">
                  تمام شاعری دکھائی گئی ہے ({totalCount} نظمیں)
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-urdu-cream">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-urdu-brown mb-2 urdu-text">
                کوئی نظم نہیں ملی
              </h3>
              <p className="text-urdu-maroon mb-4 urdu-text">
                اپنی تلاش کو تبدیل کرنے کی کوشش کریں یا فلٹر کو صاف کریں
              </p>
              {showCreateButton && (
                <button
                  onClick={onCreateNew}
                  className="px-6 py-3 bg-gradient-to-r from-urdu-gold to-urdu-maroon text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 urdu-text"
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

/**
 * Enhanced Poem Card with Dynamic Interactions
 */
const EnhancedPoemCard = ({
  poem,
  viewMode = "grid",
  showActions = false,
  onEdit,
  onDelete,
  onBookmark,
  isBookmarked = false,
}) => {
  const navigate = useNavigate();
  const {
    liked,
    favorited,
    translation,
    loading,
    toggleLike,
    toggleFavorite,
    translatePoem,
    sharePoem,
  } = usePoemInteractions(poem);

  const [showFullContent, setShowFullContent] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [localBookmarked, setLocalBookmarked] = useState(isBookmarked);

  // Navigate to poem detail page
  const handlePoemClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('.action-button') || e.target.closest('button')) {
      return;
    }
    navigate(`/poems/${poem._id || poem.id}`);
  };

  // Handle bookmark
  const handleBookmarkClick = async () => {
    try {
      if (onBookmark) {
        await onBookmark(poem._id || poem.id);
        setLocalBookmarked(!localBookmarked);
      }
    } catch (error) {
      console.error("Bookmark error:", error);
    }
  };

  // Handle share
  const handleShare = async () => {
    const result = await sharePoem("copy");
    setShareMessage(result.message);
    setTimeout(() => setShareMessage(""), 3000);
  };

  const truncatedContent =
    poem.content?.length > 200
      ? poem.content.substring(0, 200) + "..."
      : poem.content;

  const contentToShow = showFullContent ? poem.content : truncatedContent;

  if (viewMode === "list") {
    return (
      <div 
        className="bg-white/90 backdrop-blur-sm border border-cultural-pearl rounded-lg p-6 hover:shadow-lg transition-all duration-300 w-full cursor-pointer"
        onClick={handlePoemClick}
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-800 urdu-heading">
                {poem.title}
              </h3>
              <span className="text-sm text-urdu-gold bg-urdu-cream px-2 py-1 rounded">
                {poem.category}
              </span>
            </div>

            <p
              className="text-gray-600 urdu-body leading-relaxed mb-4"
              dir="rtl"
            >
              {contentToShow}
            </p>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 urdu-body">
                <span>شاعر: {typeof poem.poet === 'object' ? poem.poet?.name : poem.poet || poem.author || "نامعلوم"}</span>
                {poem.metadata?.era && (
                  <span className="mr-4">دور: {poem.metadata.era}</span>
                )}
              </div>

              {poem.content?.length > 200 && (
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="text-urdu-gold hover:text-urdu-gold/80 text-sm urdu-body"
                >
                  {showFullContent ? "کم دکھائیں" : "مزید پڑھیں"}
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Interactions */}
          <div className="flex md:flex-col gap-2">
            <ActionButton
              icon={Heart}
              active={liked}
              loading={loading.like}
              onClick={toggleLike}
              tooltip="پسند کریں"
            />
            <ActionButton
              icon={BookOpen}
              active={localBookmarked}
              onClick={handleBookmarkClick}
              tooltip="محفوظ کریں"
            />
            <ActionButton
              icon={Languages}
              loading={loading.translate}
              onClick={translatePoem}
              tooltip="ترجمہ"
            />
            <ActionButton
              icon={Share2}
              onClick={handleShare}
              tooltip="شیئر کریں"
            />
          </div>
        </div>

        {/* Translation */}
        {translation && (
          <div className="mt-4 pt-4 border-t border-cultural-pearl">
            <h4 className="text-sm font-medium text-urdu-gold mb-2">
              English Translation:
            </h4>
            <p className="text-gray-600 text-sm leading-relaxed" dir="ltr">
              {translation}
            </p>
          </div>
        )}

        {/* Share message */}
        {shareMessage && (
          <div className="mt-2 text-sm text-green-600 urdu-body">
            {shareMessage}
          </div>
        )}
      </div>
    );
  }

  // Grid view - Enhanced
  return (
    <div 
      className="bg-white/90 backdrop-blur-sm border border-cultural-pearl rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 group w-full cursor-pointer"
      onClick={handlePoemClick}
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-urdu-cream to-cultural-pearl/20">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-800 urdu-heading group-hover:text-urdu-gold transition-colors">
            {poem.title}
          </h3>
          <span className="text-xs text-urdu-gold bg-white px-2 py-1 rounded">
            {poem.category}
          </span>
        </div>
        <p className="text-sm text-gray-600 urdu-body">
          {typeof poem.poet === 'object' ? poem.poet?.name : poem.poet || poem.author || "نامعلوم"}
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        <p
          className="text-gray-700 urdu-body leading-relaxed mb-4 line-clamp-4"
          dir="rtl"
        >
          {poem.content}
        </p>

        {/* Metadata */}
        {poem.metadata && (
          <div className="flex flex-wrap gap-2 mb-4 text-xs text-gray-500">
            {poem.metadata.era && (
              <span className="bg-gray-100 px-2 py-1 rounded urdu-body">
                {poem.metadata.era}
              </span>
            )}
            {poem.metadata.style && (
              <span className="bg-gray-100 px-2 py-1 rounded urdu-body">
                {poem.metadata.style}
              </span>
            )}
          </div>
        )}

        {/* Enhanced Interactions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <ActionButton
              icon={Heart}
              active={liked}
              loading={loading.like}
              onClick={toggleLike}
              size="sm"
            />
            <ActionButton
              icon={BookOpen}
              active={localBookmarked}
              onClick={handleBookmarkClick}
              size="sm"
            />
          </div>

          <div className="flex gap-2">
            <ActionButton
              icon={Languages}
              loading={loading.translate}
              onClick={translatePoem}
              size="sm"
            />
            <ActionButton icon={Share2} onClick={handleShare} size="sm" />
          </div>
        </div>

        {/* Translation */}
        {translation && (
          <div className="mt-4 pt-4 border-t border-cultural-pearl">
            <h5 className="text-xs font-medium text-urdu-gold mb-2">
              Translation:
            </h5>
            <p className="text-gray-600 text-xs leading-relaxed" dir="ltr">
              {translation}
            </p>
          </div>
        )}

        {/* Share message */}
        {shareMessage && (
          <div className="mt-2 text-xs text-green-600 urdu-body">
            {shareMessage}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Action Button Component for Poem Interactions
 */
const ActionButton = ({
  icon: Icon,
  active = false,
  loading = false,
  onClick,
  tooltip = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "p-1.5 w-7 h-7",
    md: "p-2 w-9 h-9",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent card click when clicking action button
        onClick?.();
      }}
      disabled={loading}
      title={tooltip}
      className={`action-button ${
        sizeClasses[size]
      } rounded-lg border transition-all duration-200 ${
        active
          ? "bg-urdu-gold text-white border-urdu-gold"
          : "bg-white text-gray-600 border-cultural-pearl hover:bg-urdu-cream hover:border-urdu-gold hover:text-urdu-gold"
      } ${loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
    >
      {loading ? (
        <div
          className={`animate-spin rounded-full border-2 border-current border-t-transparent ${iconSizes[size]}`}
        />
      ) : (
        <Icon className={iconSizes[size]} />
      )}
    </button>
  );
};

export default PoemList;
