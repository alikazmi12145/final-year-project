/**
 * CategoryTabs Component
 * Dynamic category navigation with filtering, statistics, and cultural design
 * Integrates with poetry service APIs for real-time category data
 */

import React, { useState, useEffect } from "react";
import { useCategories } from "../../hooks/usePoetry";
import {
  Hash,
  BookOpen,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import LoadingSpinner from "../ui/LoadingSpinner";

const CategoryTabs = ({
  onCategoryChange = null,
  selectedCategory = "all",
  showStats = true,
  showFilters = false,
  orientation = "horizontal", // 'horizontal' | 'vertical'
  className = "",
  variant = "tabs", // 'tabs' | 'pills' | 'buttons'
}) => {
  // Custom hook for categories
  const { categories, loading, error, selectCategory, getCategoryById } =
    useCategories();

  // Local state
  const [localSelectedCategory, setLocalSelectedCategory] =
    useState(selectedCategory);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Refs
  const tabsContainerRef = React.useRef(null);

  // Default categories with Urdu names
  const defaultCategories = [
    {
      id: "all",
      name: "تمام اقسام",
      nameEn: "All Types",
      description: "تمام اصناف کی شاعری",
      icon: BookOpen,
      color: "urdu-gold",
      count: 0,
    },
    {
      id: "ghazal",
      name: "غزل",
      nameEn: "Ghazal",
      description: "محبت اور عشق کی شاعری",
      icon: Hash,
      color: "rose-500",
      count: 0,
    },
    {
      id: "nazm",
      name: "نظم",
      nameEn: "Nazm",
      description: "آزاد اور پابند نظمیں",
      icon: Hash,
      color: "blue-500",
      count: 0,
    },
    {
      id: "rubai",
      name: "رباعی",
      nameEn: "Rubai",
      description: "چار مصرعوں کی شاعری",
      icon: Hash,
      color: "green-500",
      count: 0,
    },
    {
      id: "qasida",
      name: "قصیدہ",
      nameEn: "Qasida",
      description: "مدحیہ شاعری",
      icon: Hash,
      color: "purple-500",
      count: 0,
    },
    {
      id: "marsiya",
      name: "مرثیہ",
      nameEn: "Marsiya",
      description: "سوگواری کی شاعری",
      icon: Hash,
      color: "gray-600",
      count: 0,
    },
    {
      id: "hamd",
      name: "حمد",
      nameEn: "Hamd",
      description: "خدا کی تعریف",
      icon: Hash,
      color: "yellow-500",
      count: 0,
    },
    {
      id: "naat",
      name: "نعت",
      nameEn: "Naat",
      description: "رسول کریم ﷺ کی تعریف",
      icon: Hash,
      color: "emerald-500",
      count: 0,
    },
    {
      id: "manqabat",
      name: "منقبت",
      nameEn: "Manqabat",
      description: "اولیاء کرام کی تعریف",
      icon: Hash,
      color: "indigo-500",
      count: 0,
    },
  ];

  // Merge default categories with API categories
  const allCategories = React.useMemo(() => {
    if (categories.length > 0) {
      return categories.map((cat) => {
        const defaultCat = defaultCategories.find((def) => def.id === cat.id);
        return { ...defaultCat, ...cat };
      });
    }
    return defaultCategories;
  }, [categories]);

  // Handle category selection
  const handleCategorySelect = (categoryId) => {
    setLocalSelectedCategory(categoryId);
    selectCategory(categoryId);

    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
  };

  // Check if scrolling is needed
  useEffect(() => {
    const checkScrollNeeded = () => {
      if (tabsContainerRef.current) {
        const { scrollWidth, clientWidth } = tabsContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    checkScrollNeeded();
    window.addEventListener("resize", checkScrollNeeded);
    return () => window.removeEventListener("resize", checkScrollNeeded);
  }, [allCategories]);

  // Handle scroll
  const handleScroll = (direction) => {
    if (!tabsContainerRef.current) return;

    const scrollAmount = 200;
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;

    tabsContainerRef.current.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
    setScrollPosition(newPosition);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex justify-center py-4 ${className}`}>
        <LoadingSpinner size="sm" color="urdu-gold" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-red-600 text-sm urdu-body">{error}</p>
      </div>
    );
  }

  const getVariantClasses = (category, isSelected) => {
    const baseClasses = "transition-all duration-200 cursor-pointer relative";

    switch (variant) {
      case "pills":
        return `${baseClasses} px-4 py-2 rounded-full text-sm font-medium ${
          isSelected
            ? "bg-urdu-gold text-white shadow-lg"
            : "bg-white text-gray-700 hover:bg-urdu-cream hover:text-urdu-gold border border-cultural-pearl"
        }`;

      case "buttons":
        return `${baseClasses} px-6 py-3 rounded-lg text-sm font-medium border-2 ${
          isSelected
            ? "bg-urdu-gold text-white border-urdu-gold"
            : "bg-white text-gray-700 hover:bg-urdu-cream hover:text-urdu-gold border-cultural-pearl hover:border-urdu-gold"
        }`;

      default: // tabs
        return `${baseClasses} px-4 py-3 text-sm font-medium border-b-2 ${
          isSelected
            ? "text-urdu-gold border-urdu-gold bg-urdu-cream/20"
            : "text-gray-600 border-transparent hover:text-urdu-gold hover:border-urdu-gold/50"
        }`;
    }
  };

  if (orientation === "vertical") {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        {allCategories.map((category) => {
          const Icon = category.icon || Hash;
          const isSelected = localSelectedCategory === category.id;

          return (
            <div
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={getVariantClasses(category, isSelected)}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isSelected ? "text-white" : `text-${category.color}`
                  }`}
                />

                <div className="flex-1">
                  <div className="urdu-body">{category.name}</div>
                  {showStats && category.count > 0 && (
                    <div
                      className={`text-xs ${
                        isSelected ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      {category.count} نظمیں
                    </div>
                  )}
                </div>

                {showStats && category.trending && (
                  <TrendingUp className="w-3 h-3 text-red-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={`relative ${className}`}>
      {/* Scroll Buttons */}
      {showScrollButtons && (
        <>
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm 
                     shadow-lg rounded-full p-2 text-gray-600 hover:text-urdu-gold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleScroll("right")}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm 
                     shadow-lg rounded-full p-2 text-gray-600 hover:text-urdu-gold transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Categories Container */}
      <div
        ref={tabsContainerRef}
        className={`flex gap-2 overflow-x-auto scrollbar-hide ${
          showScrollButtons ? "px-8" : ""
        } ${variant === "tabs" ? "border-b border-cultural-pearl" : ""}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {allCategories.map((category) => {
          const Icon = category.icon || Hash;
          const isSelected = localSelectedCategory === category.id;

          return (
            <div
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={`${getVariantClasses(
                category,
                isSelected
              )} whitespace-nowrap flex-shrink-0 group`}
              title={category.description}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`w-4 h-4 ${
                    isSelected
                      ? "text-white"
                      : `text-${category.color} group-hover:text-urdu-gold`
                  }`}
                />

                <span className="urdu-body">{category.name}</span>

                {showStats && category.count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-600 group-hover:bg-urdu-cream"
                    }`}
                  >
                    {category.count}
                  </span>
                )}

                {showStats && category.trending && (
                  <TrendingUp className="w-3 h-3 text-red-500" />
                )}
              </div>

              {/* Active indicator for tabs variant */}
              {variant === "tabs" && isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-urdu-gold" />
              )}
            </div>
          );
        })}
      </div>

      {/* Category Stats Panel */}
      {showStats && localSelectedCategory !== "all" && (
        <div className="mt-4 p-4 bg-urdu-cream/20 rounded-lg border border-cultural-pearl">
          {(() => {
            const selectedCat = getCategoryById(localSelectedCategory);
            if (!selectedCat) return null;

            return (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-urdu-brown urdu-heading">
                    {selectedCat.name}
                  </h3>
                  <p className="text-sm text-gray-600 urdu-body">
                    {selectedCat.description}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-urdu-gold">
                    {selectedCat.count || 0}
                  </div>
                  <div className="text-xs text-gray-500 urdu-body">
                    نظمیں دستیاب
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-4 p-4 bg-white/90 backdrop-blur-sm rounded-lg border border-cultural-pearl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-urdu-brown urdu-heading">
              مزید فلٹر
            </h4>
            <Filter className="w-4 h-4 text-urdu-gold" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Era Filter */}
            <select className="px-3 py-2 border border-cultural-pearl rounded-lg text-sm urdu-body focus:ring-2 focus:ring-urdu-gold">
              <option value="all">تمام ادوار</option>
              <option value="classical">کلاسیکی</option>
              <option value="modern">جدید</option>
              <option value="contemporary">عصری</option>
            </select>

            {/* Language Filter */}
            <select className="px-3 py-2 border border-cultural-pearl rounded-lg text-sm urdu-body focus:ring-2 focus:ring-urdu-gold">
              <option value="urdu">اردو</option>
              <option value="persian">فارسی</option>
              <option value="arabic">عربی</option>
            </select>

            {/* Popularity Filter */}
            <select className="px-3 py-2 border border-cultural-pearl rounded-lg text-sm urdu-body focus:ring-2 focus:ring-urdu-gold">
              <option value="all">تمام</option>
              <option value="popular">مقبول</option>
              <option value="trending">رائج</option>
              <option value="recent">حالیہ</option>
            </select>

            {/* Sort Filter */}
            <select className="px-3 py-2 border border-cultural-pearl rounded-lg text-sm urdu-body focus:ring-2 focus:ring-urdu-gold">
              <option value="name">نام</option>
              <option value="date">تاریخ</option>
              <option value="popularity">مقبولیت</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryTabs;
