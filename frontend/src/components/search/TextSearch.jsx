import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Sparkles,
  Send,
} from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import api from "../../services/api";

const TextSearch = ({
  onSearch,
  initialQuery = "",
  loading = false,
  onSuggestionRequest,
  suggestions = [],
  showSuggestions = false,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({
    category: "all",
    mood: "all",
    theme: "all",
    language: "all",
    sortBy: "relevance",
    useAI: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  const categories = [
    { value: "all", label: "تمام اقسام" },
    { value: "ghazal", label: "غزل" },
    { value: "nazm", label: "نظم" },
    { value: "rubai", label: "رباعی" },
    { value: "qawwali", label: "قوالی" },
    { value: "marsiya", label: "مرثیہ" },
    { value: "hamd", label: "حمد" },
    { value: "naat", label: "نعت" },
    { value: "free-verse", label: "آزاد نظم" },
  ];

  const moods = [
    { value: "all", label: "تمام کیفیات" },
    { value: "romantic", label: "رومانوی" },
    { value: "sad", label: "اداس" },
    { value: "patriotic", label: "وطن پرستانہ" },
    { value: "spiritual", label: "روحانی" },
    { value: "philosophical", label: "فلسفیانہ" },
    { value: "humorous", label: "مزاحیہ" },
  ];

  const themes = [
    { value: "all", label: "تمام موضوعات" },
    { value: "love", label: "محبت" },
    { value: "separation", label: "جدائی" },
    { value: "nature", label: "فطرت" },
    { value: "friendship", label: "دوستی" },
    { value: "loss", label: "کھونا" },
    { value: "celebration", label: "خوشی" },
    { value: "prayer", label: "دعا" },
  ];

  const sortOptions = [
    { value: "relevance", label: "مطابقت" },
    { value: "newest", label: "نیا سے پرانا" },
    { value: "oldest", label: "پرانا سے نیا" },
    { value: "mostViewed", label: "زیادہ دیکھا گیا" },
    { value: "topRated", label: "بہترین ریٹنگ" },
  ];

  // Dynamic search function with MongoDB integration
  const performDynamicSearch = useCallback(
    async (searchQuery, searchFilters) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        console.log(
          "🔍 Performing dynamic text search:",
          searchQuery,
          searchFilters
        );

        // Check if api.search exists
        if (!api || !api.search || !api.search.text) {
          console.error("❌ API search not available:", api);
          throw new Error("Search API not configured");
        }

        const response = await api.search.text(searchQuery, {
          ...searchFilters,
          page: 1,
          limit: 20,
        });

        console.log("✅ Search response:", response);
        console.log("✅ Search response.data:", response.data);

        if (response && response.data && (response.data.success || response.data.results)) {
          setSearchResults(response.data.results || []);

          // Also call parent onSearch callback
          if (onSearch) {
            onSearch({
              query: searchQuery,
              filters: searchFilters,
              searchType: "text",
              results: response.data.results || [],
            });
          }
        } else {
          console.warn("⚠️ No results found or invalid response structure");
          setSearchResults([]);
        }
      } catch (error) {
        console.error("❌ Dynamic search error:", error);
        console.error("❌ Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          fullResponse: error.response
        });
        console.error("❌ Full error object:", JSON.stringify(error.response?.data, null, 2));
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [onSearch]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performDynamicSearch(query.trim(), filters);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsTyping(true);

    // Clear previous debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new debounce timer for live search
    const newTimer = setTimeout(() => {
      setIsTyping(false);
      if (value.trim().length >= 2) {
        performDynamicSearch(value.trim(), filters);

        // Request AI suggestions
        if (onSuggestionRequest) {
          onSuggestionRequest(value.trim());
        }
      } else {
        setSearchResults([]);
      }
    }, 800); // 800ms debounce

    setDebounceTimer(newTimer);
  };

  // Update search when filters change
  useEffect(() => {
    if (query.trim().length >= 2) {
      performDynamicSearch(query.trim(), filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Only depend on filters, not performDynamicSearch to avoid infinite loops

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    onSearch({
      query: suggestion,
      filters,
      searchType: "text",
    });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Auto-search when filters change if there's a query
    if (query.trim()) {
      onSearch({
        query: query.trim(),
        filters: newFilters,
        searchType: "text",
      });
    }
  };

  const resetFilters = () => {
    const defaultFilters = {
      category: "all",
      mood: "all",
      theme: "all",
      language: "all",
      sortBy: "relevance",
    };
    setFilters(defaultFilters);

    if (query.trim()) {
      onSearch({
        query: query.trim(),
        filters: defaultFilters,
        searchType: "text",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* GPT-Style Search Input */}
      <div className="relative">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 focus-within:border-amber-400 focus-within:bg-white transition-all duration-300">
            <div className="flex items-center p-4">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  placeholder="مجھ سے کچھ پوچھیں... جیسے: غالب کی غزلیں، محبت کی شاعری، یا کوئی بھی سوال"
                  className="w-full border-0 bg-transparent text-lg placeholder-gray-500 focus:outline-none resize-none"
                  dir="rtl"
                />

                {/* AI Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    <div className="p-3">
                      <div className="text-xs text-amber-600 font-medium mb-3 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        AI تجاویز
                      </div>
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-right p-3 hover:bg-amber-50 rounded-lg text-sm transition-colors border-b border-gray-100 last:border-b-0"
                          dir="rtl"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500">✨</span>
                            <span>{suggestion}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-3">
                {filters.useAI && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                    <Sparkles className="w-3 h-3" />
                    AI
                  </div>
                )}
                <Button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  variant="ghost"
                  className="p-2 hover:bg-gray-200 rounded-lg"
                >
                  <Filter className="w-5 h-5 text-gray-500" />
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* GPT-Style Advanced Filters */}
      {showAdvanced && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
            <div className="flex justify-between items-center text-white">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                تفصیلی ترتیبات
              </h3>
              <Button
                onClick={resetFilters}
                variant="ghost"
                className="text-white hover:bg-white/20 rounded-lg px-3 py-1"
              >
                صاف کریں
              </Button>
            </div>
          </div>

          <div className="p-6">
            {/* AI Enhancement Toggle */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:shadow-md transition-all duration-200">
                <input
                  type="checkbox"
                  checked={filters.useAI}
                  onChange={(e) =>
                    handleFilterChange("useAI", e.target.checked)
                  }
                  className="w-5 h-5 text-amber-600 bg-amber-100 border-amber-300 rounded focus:ring-amber-500"
                />
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <div className="text-right flex-1">
                    <div className="font-semibold text-amber-800">AI طاقت</div>
                    <div className="text-sm text-amber-600">
                      ChatGPT کے ساتھ بہتر اور ذہین تلاش
                    </div>
                  </div>
                </div>
              </label>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  قسم
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none bg-white"
                  dir="rtl"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mood Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  کیفیت
                </label>
                <select
                  value={filters.mood}
                  onChange={(e) => handleFilterChange("mood", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none bg-white"
                  dir="rtl"
                >
                  {moods.map((mood) => (
                    <option key={mood.value} value={mood.value}>
                      {mood.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  موضوع
                </label>
                <select
                  value={filters.theme}
                  onChange={(e) => handleFilterChange("theme", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none bg-white"
                  dir="rtl"
                >
                  {themes.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ترتیب
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none bg-white"
                  dir="rtl"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Tips */}
      {!query && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">تلاش کی تجاویز:</h4>
          <ul className="text-sm text-blue-700 space-y-1" dir="rtl">
            <li>• مخصوص الفاظ استعمال کریں جیسے "محبت"، "دل"، "غم"</li>
            <li>• شاعر کا نام تلاش کریں</li>
            <li>• شعر کا کوئی حصہ لکھیں</li>
            <li>• انگریزی یا اردو دونوں میں تلاش کر سکتے ہیں</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TextSearch;
