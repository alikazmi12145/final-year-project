/**
 * Enhanced SearchBar Component
 * Provides dynamic search with live suggestions, voice search, advanced filters,
 * and seamless integration with poetry service APIs
 */

import React, { useState, useRef, useEffect } from "react";
import { useSearch } from "../../hooks/usePoetry";
import {
  Search,
  Mic,
  MicOff,
  Filter,
  X,
  BookOpen,
  User,
  Hash,
  Loader,
  ArrowRight,
} from "lucide-react";

const SearchBar = ({
  placeholder = "شاعر، نظم، یا مضمون تلاش کریں...",
  onSearchResults = null,
  onFilterChange = null,
  showAdvancedFilters = true,
  showVoiceSearch = true,
  autoFocus = false,
  className = "",
}) => {
  // Custom hook for search functionality
  const {
    query,
    results,
    loading,
    error,
    suggestions,
    debouncedSearch,
    getSuggestions,
    clearSearch,
    setQuery,
  } = useSearch(300);

  // Local state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Advanced filters state
  const [filters, setFilters] = useState({
    category: "all",
    era: "all",
    language: "urdu",
    sortBy: "relevance",
  });

  // Refs
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const recognition = useRef(null);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();

      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = "ur-PK"; // Urdu language

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        debouncedSearch(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [setQuery, debouncedSearch]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);

    // Get suggestions for non-empty queries
    if (value.trim().length > 1) {
      getSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }

    setSelectedSuggestionIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        } else if (query.trim()) {
          handleSearch();
        }
        break;

      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text || suggestion);
    debouncedSearch(suggestion.text || suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Handle search
  const handleSearch = () => {
    if (query.trim()) {
      debouncedSearch(query);
      setShowSuggestions(false);

      // Callback with results
      if (onSearchResults && results) {
        onSearchResults(results);
      }
    }
  };

  // Handle voice search
  const handleVoiceSearch = () => {
    if (!recognition.current) return;

    if (isListening) {
      recognition.current.stop();
      setIsListening(false);
    } else {
      recognition.current.start();
      setIsListening(true);
    }
  };

  // Handle clear
  const handleClear = () => {
    clearSearch();
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    if (onFilterChange) {
      onFilterChange({ ...filters, ...newFilters });
    }
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          {/* Search Icon */}
          <div className="absolute right-4 z-10">
            {loading ? (
              <Loader className="w-5 h-5 text-urdu-gold animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-urdu-maroon" />
            )}
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-4 pr-12 py-4 text-lg bg-white/90 backdrop-blur-sm border-2 border-cultural-pearl 
                     rounded-xl focus:ring-2 focus:ring-urdu-gold focus:border-urdu-gold 
                     text-urdu-brown placeholder-urdu-maroon/60 urdu-body transition-all duration-300
                     hover:border-urdu-gold/50"
            dir="rtl"
          />

          {/* Action Buttons */}
          <div className="absolute left-2 flex items-center gap-2">
            {/* Clear Button */}
            {query && (
              <button
                onClick={handleClear}
                className="p-1.5 text-gray-400 hover:text-urdu-gold hover:bg-urdu-cream rounded-lg transition-colors"
                title="صاف کریں"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Voice Search Button */}
            {showVoiceSearch && recognition.current && (
              <button
                onClick={handleVoiceSearch}
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-gray-400 hover:text-urdu-gold hover:bg-urdu-cream"
                }`}
                title={isListening ? "رک جائیں" : "آواز سے تلاش کریں"}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Filters Button */}
            {showAdvancedFilters && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showFilters
                    ? "bg-urdu-gold text-white"
                    : "text-gray-400 hover:text-urdu-gold hover:bg-urdu-cream"
                }`}
                title="فلٹر"
              >
                <Filter className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Voice Recognition Indicator */}
        {isListening && (
          <div className="absolute inset-0 border-2 border-red-400 rounded-xl animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-cultural-pearl 
                   rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                index === selectedSuggestionIndex
                  ? "bg-urdu-cream text-urdu-gold"
                  : "hover:bg-urdu-cream/50"
              }`}
            >
              {/* Suggestion Icon */}
              <div className="text-urdu-gold">
                {suggestion.type === "poet" ? (
                  <User className="w-4 h-4" />
                ) : suggestion.type === "category" ? (
                  <Hash className="w-4 h-4" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
              </div>

              {/* Suggestion Text */}
              <div className="flex-1">
                <div className="text-gray-800 urdu-body" dir="rtl">
                  {suggestion.text || suggestion}
                </div>
                {suggestion.subtitle && (
                  <div className="text-sm text-gray-500 urdu-body">
                    {suggestion.subtitle}
                  </div>
                )}
              </div>

              {/* Suggestion Arrow */}
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && showAdvancedFilters && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-cultural-pearl 
                      rounded-lg shadow-xl z-40 p-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-2 urdu-body">
                صنف
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  handleFilterChange({ category: e.target.value })
                }
                className="w-full px-3 py-2 border border-cultural-pearl rounded-lg focus:ring-2 focus:ring-urdu-gold 
                         focus:border-transparent text-sm bg-white urdu-body"
              >
                <option value="all">تمام اقسام</option>
                <option value="ghazal">غزل</option>
                <option value="nazm">نظم</option>
                <option value="rubai">رباعی</option>
                <option value="qasida">قصیدہ</option>
                <option value="marsiya">مرثیہ</option>
              </select>
            </div>

            {/* Era Filter */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-2 urdu-body">
                دور
              </label>
              <select
                value={filters.era}
                onChange={(e) => handleFilterChange({ era: e.target.value })}
                className="w-full px-3 py-2 border border-cultural-pearl rounded-lg focus:ring-2 focus:ring-urdu-gold 
                         focus:border-transparent text-sm bg-white urdu-body"
              >
                <option value="all">تمام ادوار</option>
                <option value="classical">کلاسیکی</option>
                <option value="medieval">قرون وسطیٰ</option>
                <option value="modern">جدید</option>
                <option value="contemporary">عصری</option>
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-2 urdu-body">
                زبان
              </label>
              <select
                value={filters.language}
                onChange={(e) =>
                  handleFilterChange({ language: e.target.value })
                }
                className="w-full px-3 py-2 border border-cultural-pearl rounded-lg focus:ring-2 focus:ring-urdu-gold 
                         focus:border-transparent text-sm bg-white urdu-body"
              >
                <option value="urdu">اردو</option>
                <option value="persian">فارسی</option>
                <option value="arabic">عربی</option>
                <option value="punjabi">پنجابی</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-2 urdu-body">
                ترتیب
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                className="w-full px-3 py-2 border border-cultural-pearl rounded-lg focus:ring-2 focus:ring-urdu-gold 
                         focus:border-transparent text-sm bg-white urdu-body"
              >
                <option value="relevance">مطابقت</option>
                <option value="popularity">مقبولیت</option>
                <option value="date">تاریخ</option>
                <option value="title">عنوان</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-cultural-pearl">
            <button
              onClick={() => {
                setFilters({
                  category: "all",
                  era: "all",
                  language: "urdu",
                  sortBy: "relevance",
                });
                handleFilterChange({
                  category: "all",
                  era: "all",
                  language: "urdu",
                  sortBy: "relevance",
                });
              }}
              className="text-sm text-gray-500 hover:text-urdu-gold transition-colors urdu-body"
            >
              فلٹر صاف کریں
            </button>

            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-gold/90 transition-colors text-sm urdu-body"
            >
              لاگو کریں
            </button>
          </div>
        </div>
      )}

      {/* Search Error */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-red-50 border border-red-200 rounded-lg p-3 z-30">
          <p className="text-red-600 text-sm urdu-body">{error}</p>
        </div>
      )}

      {/* Quick Results Preview */}
      {results &&
        (results.poems?.length > 0 || results.poets?.length > 0) &&
        showSuggestions && (
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-cultural-pearl 
                      rounded-lg shadow-xl z-30 p-4 max-h-80 overflow-y-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Poems Results */}
              {results.poems?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-urdu-gold mb-2 urdu-body">
                    نظمیں
                  </h4>
                  <div className="space-y-2">
                    {results.poems.slice(0, 3).map((poem, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-700 urdu-body hover:text-urdu-gold cursor-pointer"
                      >
                        {poem.title} - {poem.poet?.name || "نامعلوم"}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Poets Results */}
              {results.poets?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-urdu-gold mb-2 urdu-body">
                    شعراء
                  </h4>
                  <div className="space-y-2">
                    {results.poets.slice(0, 3).map((poet, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-700 urdu-body hover:text-urdu-gold cursor-pointer"
                      >
                        {poet.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default SearchBar;
