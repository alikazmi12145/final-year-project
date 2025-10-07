import React, { useState, useEffect } from "react";
import {
  Search as SearchIcon,
  Mic,
  Camera,
  Brain,
  History,
  Sparkles,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import TextSearch from "../components/search/TextSearch.jsx";
import VoiceSearch from "../components/search/VoiceSearch.jsx";
import ImageSearch from "../components/search/ImageSearch.jsx";
import SearchResults from "../components/search/SearchResults.jsx";
import { searchAPI } from "../services/api";

const Search = () => {
  const [activeTab, setActiveTab] = useState("text");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMeta, setSearchMeta] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchTabs = [
    {
      id: "text",
      label: "متن",
      icon: SearchIcon,
      description: "الفاظ اور جملے",
      color: "bg-amber-500",
    },
    {
      id: "voice",
      label: "آواز",
      icon: Mic,
      description: "بولیں",
      color: "bg-blue-500",
    },
    {
      id: "image",
      label: "تصویر",
      icon: Camera,
      description: "اپ لوڈ کریں",
      color: "bg-green-500",
    },
    {
      id: "fuzzy",
      label: "ذہین",
      icon: Brain,
      description: "غلط ہجے",
      color: "bg-purple-500",
    },
  ];

  useEffect(() => {
    // Load search history from localStorage
    const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    setSearchHistory(history.slice(0, 10)); // Keep last 10 searches
  }, []);

  const getSmartSuggestions = async (partialQuery) => {
    if (!partialQuery || partialQuery.length < 2) {
      setSmartSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await searchAPI.getSmartSuggestions(partialQuery.trim());

      if (response.data.success) {
        setSmartSuggestions([
          ...(response.data.aiSuggestions || []),
          ...(response.data.popularSuggestions || []),
        ]);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Failed to get suggestions:", error);
      setSmartSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const saveSearchToHistory = (searchData) => {
    const historyItem = {
      ...searchData,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    };

    const newHistory = [
      historyItem,
      ...searchHistory.filter((h) => h.id !== historyItem.id),
    ].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  const handleSearch = async (searchData) => {
    setIsSearching(true);
    setSearchResults([]);
    setSearchMeta({});

    try {
      let response;
      const { searchType } = searchData;

      // Save to history
      saveSearchToHistory(searchData);

      switch (searchType) {
        case "text":
          response = await searchAPI.textSearch(searchData.query, {
            filters: searchData.filters,
            limit: searchData.limit || 20,
            page: searchData.page || 1,
            useAI: searchData.filters?.useAI || true,
          });
          break;

        case "voice":
          response = await searchAPI.voiceSearch(
            searchData.transcribedText,
            searchData.confidence
          );
          break;

        case "image":
          response = await searchAPI.imageSearch(searchData.image);
          setSearchMeta((prev) => ({
            ...prev,
            extractedText: response.data.extractedText,
            ocrConfidence: response.data.ocrConfidence,
            textAnalysis: response.data.textAnalysis,
          }));
          break;

        case "fuzzy":
          response = await searchAPI.fuzzySearch(
            searchData.query,
            searchData.limit || 30
          );
          break;

        case "advanced":
          response = await searchAPI.advancedSearch(searchData);
          break;

        default:
          throw new Error("Invalid search type");
      }

      setSearchResults(response.data.results || []);
      setSearchMeta({
        ...searchMeta,
        totalResults: response.data.results?.length || 0,
        searchType: searchType,
        query: searchData.query || searchData.transcribedText,
        searchTime: Date.now(),
        pagination: response.data.pagination,
        aiEnhancement: response.data.aiEnhancement,
        improvementData: response.data.improvementData,
        textAnalysis: response.data.textAnalysis,
        searchTermsUsed: response.data.searchTermsUsed,
        ...response.data.searchMeta,
      });
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setSearchMeta({
        error:
          error.response?.data?.message ||
          error.message ||
          "تلاش میں خرابی ہوئی",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFuzzySearch = async (searchData) => {
    await handleSearch({
      ...searchData,
      searchType: "fuzzy",
    });
  };

  const clearResults = () => {
    setSearchResults([]);
    setSearchMeta({});
  };

  const renderSearchInterface = () => {
    switch (activeTab) {
      case "text":
        return (
          <TextSearch
            onSearch={handleSearch}
            loading={isSearching}
            onSuggestionRequest={getSmartSuggestions}
            suggestions={smartSuggestions}
            showSuggestions={showSuggestions}
          />
        );

      case "voice":
        return <VoiceSearch onSearch={handleSearch} loading={isSearching} />;

      case "image":
        return <ImageSearch onSearch={handleSearch} loading={isSearching} />;

      case "fuzzy":
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">
                Smart Search
              </h3>
              <p className="text-purple-700 text-sm" dir="rtl">
                غلط ہجے اور ملتے جلتے الفاظ کو سمجھتا ہے
              </p>
            </div>
            <TextSearch
              onSearch={handleFuzzySearch}
              loading={isSearching}
              onSuggestionRequest={getSmartSuggestions}
              suggestions={smartSuggestions}
              showSuggestions={showSuggestions}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Cultural Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <SearchIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-amber-900 mb-1">
                AI Search
              </h1>
              <p
                className="nastaleeq-primary text-xl text-amber-700 font-medium"
                dir="rtl"
              >
                شاعری کی ذہین تلاش
              </p>
            </div>
          </div>

          {/* Cultural decorative element */}
          <div className="flex justify-center items-center mb-6">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-amber-400"></div>
            <Sparkles className="mx-4 w-6 h-6 text-amber-500" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-amber-400"></div>
          </div>
        </div>

        {/* Enhanced Search Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-amber-200">
            <div className="flex gap-2">
              {searchTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    clearResults();
                  }}
                  className={`flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg transform scale-105"
                      : "text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <div className="text-center">
                    <div className="nastaleeq-heading text-base font-bold">
                      {tab.label}
                    </div>
                    <div
                      className="nastaleeq-primary text-xs opacity-90"
                      dir="rtl"
                    >
                      {tab.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cultural Search Interface */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-200">
            <h3
              className="nastaleeq-heading text-lg font-bold text-amber-900"
              dir="rtl"
            >
              {activeTab === "text" && "متنی تلاش"}
              {activeTab === "voice" && "صوتی تلاش"}
              {activeTab === "image" && "تصویری تلاش"}
              {activeTab === "fuzzy" && "ذہین تلاش"}
            </h3>
          </div>
          <div className="p-6">{renderSearchInterface()}</div>
        </div>

        {/* Enhanced Recent Searches */}
        {searchHistory.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <History className="w-6 h-6 text-amber-600" />
              <h3 className="nastaleeq-heading font-bold text-amber-900">
                Recent Searches
              </h3>
              <span className="nastaleeq-primary text-amber-700" dir="rtl">
                حالیہ تلاش
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchHistory.slice(0, 6).map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (
                      item.searchType === "text" ||
                      item.searchType === "fuzzy"
                    ) {
                      setActiveTab(item.searchType);
                      handleSearch(item);
                    }
                  }}
                  className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:shadow-lg hover:bg-gradient-to-br hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 transition-all duration-300 text-right transform hover:scale-105"
                  dir="rtl"
                >
                  <div className="nastaleeq-primary font-semibold text-amber-900 truncate mb-2">
                    {item.query || item.transcribedText || "تصویری تلاش"}
                  </div>
                  <div className="nastaleeq-primary text-sm text-amber-600">
                    {item.searchType === "text" && "متن"}
                    {item.searchType === "voice" && "آواز"}
                    {item.searchType === "image" && "تصویر"}
                    {item.searchType === "fuzzy" && "ذہین"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        <SearchResults
          results={searchResults}
          loading={isSearching}
          searchMeta={searchMeta}
        />

        {/* Error Display */}
        {searchMeta.error && (
          <Card className="p-6 bg-red-50 border border-red-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">خرابی</h3>
              <p className="text-red-700" dir="rtl">
                {searchMeta.error}
              </p>
            </div>
          </Card>
        )}

        {/* Enhanced Cultural Welcome State */}
        {!isSearching && !searchResults.length && !searchMeta.error && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200 p-8 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <SearchIcon className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-amber-900 mb-4">
                Start Your Poetry Search
              </h3>
              <p
                className="nastaleeq-primary text-lg text-amber-700 max-w-lg mx-auto leading-relaxed"
                dir="rtl"
              >
                آپ کیا تلاش کرنا چاہتے ہیں؟ شاعری، شاعر، غزل، نظم یا کوئی خاص
                موضوع
              </p>
            </div>

            {/* Enhanced Quick Search Suggestions */}
            <div className="mb-8">
              <h4 className="nastaleeq-heading font-bold text-amber-900 mb-6 text-xl">
                Quick Searches
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { emoji: "💝", title: "محبت", query: "محبت کی شاعری" },
                  { emoji: "📚", title: "غالب", query: "غالب" },
                  { emoji: "🌙", title: "غزل", query: "غزل" },
                  { emoji: "📖", title: "نظم", query: "نظم" },
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveTab("text");
                      handleSearch({
                        query: suggestion.query,
                        searchType: "text",
                        filters: { useAI: true },
                      });
                    }}
                    className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl hover:shadow-lg hover:bg-gradient-to-br hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="text-3xl mb-3">{suggestion.emoji}</div>
                    <div
                      className="nastaleeq-heading font-bold text-amber-900 text-lg"
                      dir="rtl"
                    >
                      {suggestion.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Popular Poetry Topics */}
            <div>
              <h4 className="nastaleeq-heading font-bold text-amber-900 mb-6 text-xl">
                Popular Poetry Topics
              </h4>
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  "غالب",
                  "فیض",
                  "اقبال",
                  "میر",
                  "غزل",
                  "نظم",
                  "محبت",
                  "غم",
                  "وطن",
                  "دوستی",
                  "حمد",
                  "نعت",
                  "مرثیہ",
                  "قطعہ",
                  "رباعی",
                  "مثنوی",
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setActiveTab("text");
                      handleSearch({
                        query: tag,
                        searchType: "text",
                        filters: {},
                      });
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 text-amber-800 rounded-full hover:bg-gradient-to-r hover:from-amber-200 hover:to-orange-200 hover:border-amber-400 transition-all duration-300 transform hover:scale-105 nastaleeq-primary font-medium"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Poetry Search Tips */}
            <div className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
              <h5 className="nastaleeq-heading font-bold text-amber-900 mb-4">
                Search Tips
              </h5>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="nastaleeq-primary text-amber-700" dir="rtl">
                    • شاعر کا نام لکھیں جیسے "غالب" یا "اقبال"
                  </p>
                  <p className="nastaleeq-primary text-amber-700" dir="rtl">
                    • شعر کا ٹکڑا لکھیں جیسے "ہزاروں خواہشیں"
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="nastaleeq-primary text-amber-700" dir="rtl">
                    • موضوع لکھیں جیسے "محبت" یا "وطن"
                  </p>
                  <p className="nastaleeq-primary text-amber-700" dir="rtl">
                    • صنف لکھیں جیسے "غزل" یا "نظم"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
