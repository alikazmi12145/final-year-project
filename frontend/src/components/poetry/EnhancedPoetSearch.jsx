import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  BookOpen,
  User,
  Star,
  Sparkles,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";

const EnhancedPoetSearch = ({ onResults, poets = [] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    era: "all",
    region: "all",
    style: "all",
    theme: "all",
    isAlive: "all",
    hasAwards: false,
    isVerified: false,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter options
  const filterOptions = {
    era: [
      { value: "all", label: "All Eras / تمام ادوار", labelUrdu: "تمام ادوار" },
      {
        value: "classical",
        label: "Classical / کلاسیکی",
        labelUrdu: "کلاسیکی",
      },
      { value: "romantic", label: "Romantic / رومانی", labelUrdu: "رومانی" },
      { value: "modern", label: "Modern / جدید", labelUrdu: "جدید" },
      {
        value: "contemporary",
        label: "Contemporary / عصری",
        labelUrdu: "عصری",
      },
      {
        value: "progressive",
        label: "Progressive / ترقی پسند",
        labelUrdu: "ترقی پسند",
      },
    ],
    region: [
      {
        value: "all",
        label: "All Regions / تمام علاقے",
        labelUrdu: "تمام علاقے",
      },
      { value: "delhi", label: "Delhi / دہلی", labelUrdu: "دہلی" },
      { value: "lucknow", label: "Lucknow / لکھنؤ", labelUrdu: "لکھنؤ" },
      { value: "aligarh", label: "Aligarh / علی گڑھ", labelUrdu: "علی گڑھ" },
      {
        value: "hyderabad",
        label: "Hyderabad / حیدرآباد",
        labelUrdu: "حیدرآباد",
      },
      { value: "lahore", label: "Lahore / لاہور", labelUrdu: "لاہور" },
      { value: "karachi", label: "Karachi / کراچی", labelUrdu: "کراچی" },
      { value: "other", label: "Other / دیگر", labelUrdu: "دیگر" },
    ],
    style: [
      {
        value: "all",
        label: "All Styles / تمام اسالیب",
        labelUrdu: "تمام اسالیب",
      },
      { value: "ghazal", label: "Ghazal / غزل", labelUrdu: "غزل" },
      { value: "nazm", label: "Nazm / نظم", labelUrdu: "نظم" },
      { value: "qasida", label: "Qasida / قصیدہ", labelUrdu: "قصیدہ" },
      { value: "marsiya", label: "Marsiya / مرثیہ", labelUrdu: "مرثیہ" },
      { value: "rubai", label: "Rubai / رباعی", labelUrdu: "رباعی" },
      { value: "masnavi", label: "Masnavi / مثنوی", labelUrdu: "مثنوی" },
    ],
    theme: [
      {
        value: "all",
        label: "All Themes / تمام موضوعات",
        labelUrdu: "تمام موضوعات",
      },
      { value: "love", label: "Love / محبت", labelUrdu: "محبت" },
      { value: "spiritual", label: "Spiritual / روحانی", labelUrdu: "روحانی" },
      { value: "social", label: "Social / سماجی", labelUrdu: "سماجی" },
      { value: "political", label: "Political / سیاسی", labelUrdu: "سیاسی" },
      { value: "nature", label: "Nature / فطرت", labelUrdu: "فطرت" },
      { value: "philosophy", label: "Philosophy / فلسفہ", labelUrdu: "فلسفہ" },
    ],
  };

  // Smart search suggestions
  const searchSuggestions = [
    "Allama Iqbal / علامہ اقبال",
    "Mirza Ghalib / مرزا غالب",
    "Faiz Ahmed Faiz / فیض احمد فیض",
    "Ahmad Faraz / احمد فراز",
    "Classical era poets / کلاسیکی دور کے شاعر",
    "Ghazal masters / غزل کے استاد",
    "Progressive poetry / ترقی پسند شاعری",
    "Sufi poets / صوفی شاعر",
  ];

  // Perform search
  useEffect(() => {
    performSearch();
  }, [searchQuery, filters]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // Simulate API call with AI-enhanced search
      let results = [...poets];

      // Apply text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        results = results.filter(
          (poet) =>
            poet.name?.toLowerCase().includes(query) ||
            poet.bio?.toLowerCase().includes(query) ||
            poet.location?.city?.toLowerCase().includes(query) ||
            poet.location?.country?.toLowerCase().includes(query) ||
            poet.era?.toLowerCase().includes(query) ||
            poet.style?.some((s) => s.toLowerCase().includes(query)) ||
            poet.themes?.some((t) => t.toLowerCase().includes(query))
        );
      }

      // Apply filters
      if (filters.era !== "all") {
        results = results.filter((poet) => poet.era === filters.era);
      }
      if (filters.region !== "all") {
        results = results.filter(
          (poet) =>
            poet.location?.city?.toLowerCase().includes(filters.region) ||
            poet.birthPlace?.toLowerCase().includes(filters.region)
        );
      }
      if (filters.style !== "all") {
        results = results.filter(
          (poet) =>
            poet.style?.includes(filters.style) ||
            poet.specialization?.includes(filters.style)
        );
      }
      if (filters.theme !== "all") {
        results = results.filter(
          (poet) =>
            poet.themes?.includes(filters.theme) ||
            poet.majorThemes?.includes(filters.theme)
        );
      }
      if (filters.isAlive !== "all") {
        const isAlive = filters.isAlive === "alive";
        results = results.filter((poet) => poet.isAlive === isAlive);
      }
      if (filters.hasAwards) {
        results = results.filter(
          (poet) => poet.awards?.length > 0 || poet.stats?.totalAwards > 0
        );
      }
      if (filters.isVerified) {
        results = results.filter((poet) => poet.isVerified);
      }

      // Sort results by relevance
      results.sort((a, b) => {
        // Prioritize verified poets
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;

        // Then by popularity (stats)
        const aPopularity =
          (a.stats?.totalLikes || 0) + (a.stats?.followers || 0);
        const bPopularity =
          (b.stats?.totalLikes || 0) + (b.stats?.followers || 0);
        if (aPopularity !== bPopularity) return bPopularity - aPopularity;

        // Finally by name
        return a.name.localeCompare(b.name);
      });

      onResults(results);
    } catch (error) {
      console.error("Search error:", error);
      onResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      era: "all",
      region: "all",
      style: "all",
      theme: "all",
      isAlive: "all",
      hasAwards: false,
      isVerified: false,
    });
    setSearchQuery("");
  };

  const getActiveFilterCount = () => {
    return Object.entries(filters).filter(([key, value]) => {
      if (typeof value === "boolean") return value;
      return value !== "all";
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Main Search Bar */}
      <Card className="p-6">
        <div className="relative">
          <div className="flex items-center">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search poets by name, era, style, or theme... / شاعروں کو نام، دور، انداز، یا موضوع سے تلاش کریں..."
              className="w-full pl-10 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
            />
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              {getActiveFilterCount() > 0 && (
                <span className="bg-urdu-gold text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getActiveFilterCount()}
                </span>
              )}
            </Button>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
              <LoadingSpinner size="small" />
            </div>
          )}
        </div>

        {/* Search Suggestions */}
        {searchQuery.length === 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {searchSuggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(suggestion.split(" / ")[0])}
                  className="px-3 py-1 bg-gray-100 hover:bg-urdu-gold hover:text-white text-sm rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-urdu-gold" />
              Advanced Filters
              <span className="text-sm text-gray-500 mr-2" dir="rtl">
                اعلیٰ فلٹرز
              </span>
            </h3>
            <Button onClick={clearFilters} variant="ghost" size="sm">
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Era Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Era / دور
              </label>
              <select
                value={filters.era}
                onChange={(e) => handleFilterChange("era", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
              >
                {filterOptions.era.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Region / علاقہ
              </label>
              <select
                value={filters.region}
                onChange={(e) => handleFilterChange("region", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
              >
                {filterOptions.region.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Style Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-1" />
                Style / اسلوب
              </label>
              <select
                value={filters.style}
                onChange={(e) => handleFilterChange("style", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
              >
                {filterOptions.style.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Theme / موضوع
              </label>
              <select
                value={filters.theme}
                onChange={(e) => handleFilterChange("theme", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
              >
                {filterOptions.theme.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status / حالت
                </label>
                <select
                  value={filters.isAlive}
                  onChange={(e) =>
                    handleFilterChange("isAlive", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
                >
                  <option value="all">All / تمام</option>
                  <option value="alive">Living / زندہ</option>
                  <option value="deceased">Deceased / فوت شدہ</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={filters.hasAwards}
                    onChange={(e) =>
                      handleFilterChange("hasAwards", e.target.checked)
                    }
                    className="text-urdu-gold focus:ring-urdu-gold"
                  />
                  <span>Has Awards / ایوارڈ یافتہ</span>
                </label>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={filters.isVerified}
                    onChange={(e) =>
                      handleFilterChange("isVerified", e.target.checked)
                    }
                    className="text-urdu-gold focus:ring-urdu-gold"
                  />
                  <Star className="w-4 h-4 text-urdu-gold" />
                  <span>Verified / تصدیق شدہ</span>
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Found{" "}
          <span className="font-semibold text-urdu-brown">{poets.length}</span>{" "}
          poets
          <span className="mr-2" dir="rtl">
            {poets.length} شاعر ملے
          </span>
        </div>

        {getActiveFilterCount() > 0 && (
          <div className="flex items-center space-x-2">
            <span>Active filters:</span>
            <span className="bg-urdu-gold text-white px-2 py-1 rounded text-xs">
              {getActiveFilterCount()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPoetSearch;
