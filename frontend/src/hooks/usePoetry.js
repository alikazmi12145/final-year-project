/**
 * Custom Hooks for Poetry Platform
 * Manages state and API calls for poems, poets, categories, and biographies
 * Includes loading states, error handling, and automatic updates
 */

import { useState, useEffect, useCallback, useRef } from "react";
import poetryService from "../services/poetryService";

// =================== POEMS HOOK ===================

/**
 * Hook for managing poems data with dynamic loading and filtering
 * @param {Object} initialOptions - Initial filter options
 * @returns {Object} - Poems state and methods
 */
export const usePoems = (initialOptions = {}) => {
  const [poems, setPoems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [options, setOptions] = useState({
    page: 1,
    limit: 50, // Increased limit for better performance with large datasets
    category: "all",
    sortBy: "popularity",
    ...initialOptions,
  });

  // Ref to track if component is mounted and prevent multiple fetches
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  /**
   * Fetch poems with current options
   * @param {boolean} append - Whether to append to existing poems or replace
   */
  const fetchPoems = useCallback(
    async (append = false) => {
      if (fetchingRef.current || !isMounted.current) return;

      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (isMounted.current && fetchingRef.current) {
          setError("Request timed out. Please try again.");
          setLoading(false);
          fetchingRef.current = false;
        }
      }, 30000); // 30 second timeout

      try {
        const response = await poetryService.fetchPoems(options);

        clearTimeout(timeoutId);

        if (!isMounted.current) return;

        if (response.success) {
          setPoems((prev) =>
            append ? [...prev, ...response.poems] : response.poems
          );
          setTotalPages(response.totalPages);
          setCurrentPage(response.page);
          setHasMore(response.hasMore || response.page < response.totalPages);
        } else {
          setError(response.error || "Failed to load poems");
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (isMounted.current) {
          setError("Network error. Please check your connection.");
          console.error("Poems fetch error:", err);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    },
    [options]
  );

  /**
   * Load more poems (pagination)
   */
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setOptions((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  }, [hasMore, loading]);

  /**
   * Refresh poems (reload first page)
   */
  const refresh = useCallback(() => {
    setOptions((prev) => ({ ...prev, page: 1 }));
    setPoems([]);
  }, []);

  /**
   * Update filter options
   * @param {Object} newOptions - New filter options
   */
  const updateOptions = useCallback((newOptions) => {
    setOptions((prev) => ({ ...prev, ...newOptions, page: 1 }));
    setPoems([]);
  }, []);

  /**
   * Search poems
   * @param {string} query - Search query
   */
  const searchPoems = useCallback(
    (query) => {
      updateOptions({ search: query });
    },
    [updateOptions]
  );

  /**
   * Filter by category
   * @param {string} category - Category to filter by
   */
  const filterByCategory = useCallback(
    (category) => {
      updateOptions({ category });
    },
    [updateOptions]
  );

  // Fetch poems when options change
  useEffect(() => {
    const shouldAppend = options.page > 1 && poems.length > 0;
    fetchPoems(shouldAppend);
  }, [JSON.stringify(options)]); // Use JSON.stringify to avoid infinite re-renders

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    // State
    poems,
    loading,
    error,
    hasMore,
    totalPages,
    currentPage,
    options,

    // Methods
    fetchPoems,
    loadMore,
    refresh,
    updateOptions,
    searchPoems,
    filterByCategory,
  };
};

// =================== POET HOOK ===================

/**
 * Hook for managing individual poet data
 * @param {string} poetId - Poet ID or slug
 * @returns {Object} - Poet state and methods
 */
export const usePoet = (poetId) => {
  const [poet, setPoet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [poems, setPoems] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [translation, setTranslation] = useState(null);

  const isMounted = useRef(true);

  /**
   * Fetch poet data
   */
  const fetchPoet = useCallback(async () => {
    if (!poetId || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await poetryService.fetchPoet(poetId);

      if (!isMounted.current) return;

      if (response.success) {
        setPoet(response);
        setPoems(response.poems || []);
        setAiSummary(response.aiSummary || null);
      } else {
        setError(response.error || "Poet not found");
      }
    } catch (err) {
      if (isMounted.current) {
        setError("Failed to load poet information");
        console.error("Poet fetch error:", err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [poetId, loading]);

  /**
   * Generate biography summary
   */
  const generateSummary = useCallback(async () => {
    if (!poet?.bio || aiSummary) return;

    try {
      const summary = await poetryService.generateBiographySummary(poet.bio);
      if (isMounted.current) {
        setAiSummary(summary);
      }
    } catch (err) {
      console.error("Summary generation failed:", err);
    }
  }, [poet?.bio, aiSummary]);

  /**
   * Translate biography to English
   */
  const translateBio = useCallback(async () => {
    if (!poet?.bio || translation) return;

    try {
      const translated = await poetryService.translateBiography(poet.bio);
      if (isMounted.current) {
        setTranslation(translated);
      }
    } catch (err) {
      console.error("Translation failed:", err);
    }
  }, [poet?.bio, translation]);

  // Fetch poet when poetId changes
  useEffect(() => {
    if (poetId) {
      fetchPoet();
    }
  }, [poetId, fetchPoet]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    // State
    poet,
    loading,
    error,
    poems,
    aiSummary,
    translation,

    // Methods
    fetchPoet,
    generateSummary,
    translateBio,
    refresh: fetchPoet,
  };
};

// =================== CATEGORIES HOOK ===================

/**
 * Hook for managing categories data
 * @returns {Object} - Categories state and methods
 */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const isMounted = useRef(true);

  /**
   * Fetch categories
   */
  const fetchCategories = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await poetryService.fetchCategories();

      if (!isMounted.current) return;

      setCategories(response);
    } catch (err) {
      if (isMounted.current) {
        setError("Failed to load categories");
        console.error("Categories fetch error:", err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [loading]);

  /**
   * Select category
   * @param {string} categoryId - Category ID to select
   */
  const selectCategory = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
  }, []);

  /**
   * Get category by ID
   * @param {string} categoryId - Category ID
   * @returns {Object|null} - Category object
   */
  const getCategoryById = useCallback(
    (categoryId) => {
      return categories.find((cat) => cat.id === categoryId) || null;
    },
    [categories]
  );

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    // State
    categories,
    loading,
    error,
    selectedCategory,

    // Methods
    fetchCategories,
    selectCategory,
    getCategoryById,
    refresh: fetchCategories,
  };
};

// =================== SEARCH HOOK ===================

/**
 * Hook for managing search functionality with debouncing
 * @param {number} debounceMs - Debounce delay in milliseconds
 * @returns {Object} - Search state and methods
 */
export const useSearch = (debounceMs = 300) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({
    poems: [],
    poets: [],
    suggestions: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const isMounted = useRef(true);
  const timeoutRef = useRef(null);

  /**
   * Perform search
   * @param {string} searchQuery - Query to search for
   * @param {Object} options - Search options
   */
  const search = useCallback(async (searchQuery, options = {}) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults({ poems: [], poets: [], suggestions: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await poetryService.smartSearch(searchQuery, options);

      if (!isMounted.current) return;

      setResults(response);
      if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      if (isMounted.current) {
        setError("Search failed. Please try again.");
        console.error("Search error:", err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Get search suggestions
   * @param {string} partialQuery - Partial query for suggestions
   */
  const getSuggestions = useCallback(async (partialQuery) => {
    if (!partialQuery || partialQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await poetryService.getSearchSuggestions(partialQuery);
      if (isMounted.current) {
        setSuggestions(response);
      }
    } catch (err) {
      console.error("Suggestions error:", err);
    }
  }, []);

  /**
   * Debounced search
   * @param {string} searchQuery - Query to search for
   */
  const debouncedSearch = useCallback(
    (searchQuery) => {
      setQuery(searchQuery);

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        search(searchQuery);
      }, debounceMs);
    },
    [search, debounceMs]
  );

  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults({ poems: [], poets: [], suggestions: [] });
    setSuggestions([]);
    setError(null);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    query,
    results,
    loading,
    error,
    suggestions,

    // Methods
    search,
    debouncedSearch,
    getSuggestions,
    clearSearch,
    setQuery,
  };
};

// =================== POEM INTERACTIONS HOOK ===================

/**
 * Hook for managing poem interactions (like, favorite, share, translate)
 * @param {Object} poem - Poem object
 * @returns {Object} - Interaction state and methods
 */
export const usePoemInteractions = (poem) => {
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [relatedPoems, setRelatedPoems] = useState([]);
  const [loading, setLoading] = useState({
    like: false,
    favorite: false,
    translate: false,
    related: false,
  });

  const isMounted = useRef(true);

  /**
   * Toggle like status
   */
  const toggleLike = useCallback(async () => {
    if (loading.like) return;

    setLoading((prev) => ({ ...prev, like: true }));

    try {
      // Simulate API call - replace with actual API
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (isMounted.current) {
        setLiked((prev) => !prev);
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
    } finally {
      if (isMounted.current) {
        setLoading((prev) => ({ ...prev, like: false }));
      }
    }
  }, [loading.like]);

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback(async () => {
    if (loading.favorite) return;

    setLoading((prev) => ({ ...prev, favorite: true }));

    try {
      // Simulate API call - replace with actual API
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (isMounted.current) {
        setFavorited((prev) => !prev);
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
    } finally {
      if (isMounted.current) {
        setLoading((prev) => ({ ...prev, favorite: false }));
      }
    }
  }, [loading.favorite]);

  /**
   * Translate poem
   */
  const translatePoem = useCallback(async () => {
    if (!poem || translation || loading.translate) return;

    setLoading((prev) => ({ ...prev, translate: true }));

    try {
      const translated = await poetryService.translatePoem(poem.content, {
        category: poem.category,
        poet: poem.poet,
        style: poem.metadata?.style,
      });

      if (isMounted.current) {
        setTranslation(translated);
      }
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      if (isMounted.current) {
        setLoading((prev) => ({ ...prev, translate: false }));
      }
    }
  }, [poem, translation, loading.translate]);

  /**
   * Get related poems
   */
  const getRelatedPoems = useCallback(async () => {
    if (!poem || relatedPoems.length > 0 || loading.related) return;

    setLoading((prev) => ({ ...prev, related: true }));

    try {
      const related = await poetryService.getRelatedPoems(poem);

      if (isMounted.current) {
        setRelatedPoems(related);
      }
    } catch (err) {
      console.error("Related poems fetch failed:", err);
    } finally {
      if (isMounted.current) {
        setLoading((prev) => ({ ...prev, related: false }));
      }
    }
  }, [poem, relatedPoems.length, loading.related]);

  /**
   * Share poem
   * @param {string} platform - Platform to share on
   */
  const sharePoem = useCallback(
    async (platform = "copy") => {
      if (!poem) return;

      const shareText = `${poem.title}\n\n${poem.content}\n\n- ${
        poem.poet?.name || "Unknown"
      }`;

      try {
        if (platform === "copy") {
          await navigator.clipboard.writeText(shareText);
          return { success: true, message: "Copied to clipboard" };
        } else if (navigator.share) {
          await navigator.share({
            title: poem.title,
            text: shareText,
          });
          return { success: true, message: "Shared successfully" };
        }
      } catch (err) {
        console.error("Share failed:", err);
        return { success: false, message: "Share failed" };
      }
    },
    [poem]
  );

  // DON'T auto-load related poems - they should be fetched manually when needed
  // This was causing massive performance issues when rendering poem lists
  // useEffect(() => {
  //   if (poem) {
  //     getRelatedPoems();
  //   }
  // }, [poem, getRelatedPoems]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    // State
    liked,
    favorited,
    translation,
    relatedPoems,
    loading,

    // Methods
    toggleLike,
    toggleFavorite,
    translatePoem,
    getRelatedPoems,
    sharePoem,
  };
};

// =================== CACHE MANAGEMENT HOOK ===================

/**
 * Hook for managing poetry service cache
 * @returns {Object} - Cache state and methods
 */
export const useCache = () => {
  const [stats, setStats] = useState({
    poems: 0,
    poets: 0,
    biographies: 0,
    categories: 0,
    total: 0,
  });

  /**
   * Update cache stats
   */
  const updateStats = useCallback(() => {
    const newStats = poetryService.getCacheStats();
    setStats(newStats);
  }, []);

  /**
   * Clear all caches
   */
  const clearCache = useCallback(() => {
    poetryService.clearCache();
    updateStats();
  }, [updateStats]);

  // Update stats on mount
  useEffect(() => {
    updateStats();
  }, [updateStats]);

  return {
    stats,
    updateStats,
    clearCache,
  };
};
