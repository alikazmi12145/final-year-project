import { useState, useEffect, useCallback } from "react";
import BookmarkAPI from "../services/bookmarkAPI";

/**
 * Custom hook for managing bookmarks
 * @param {Object} options - Hook options
 * @returns {Object} Bookmark state and methods
 */
export const useBookmarks = (options = {}) => {
  const { autoFetch = true, page = 1, limit = 20 } = options;

  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  /**
   * Fetch user's bookmarks
   */
  const fetchBookmarks = useCallback(
    async (params = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await BookmarkAPI.getBookmarks({
          page,
          limit,
          ...params,
        });
        setBookmarks(response.bookmarks);
        setPagination(response.pagination);
      } catch (err) {
        setError(err.message);
        console.error("Fetch bookmarks error:", err);
      } finally {
        setLoading(false);
      }
    },
    [page, limit]
  );

  /**
   * Add a bookmark
   */
  const addBookmark = useCallback(async (poemId) => {
    try {
      setError(null);
      const response = await BookmarkAPI.addBookmark(poemId);
      
      // If new bookmark, add to local state
      if (response.isNew) {
        setBookmarks((prev) => [response.bookmark, ...prev]);
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      console.error("Add bookmark error:", err);
      throw err;
    }
  }, []);

  /**
   * Remove a bookmark
   */
  const removeBookmark = useCallback(async (bookmarkId) => {
    try {
      setError(null);
      await BookmarkAPI.removeBookmark(bookmarkId);
      
      // Remove from local state
      setBookmarks((prev) =>
        prev.filter((bookmark) => bookmark._id !== bookmarkId)
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error("Remove bookmark error:", err);
      throw err;
    }
  }, []);

  /**
   * Remove bookmark by poem ID
   */
  const removeBookmarkByPoem = useCallback(async (poemId) => {
    try {
      setError(null);
      await BookmarkAPI.removeBookmarkByPoem(poemId);
      
      // Remove from local state
      setBookmarks((prev) =>
        prev.filter((bookmark) => bookmark.poem?._id !== poemId)
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error("Remove bookmark by poem error:", err);
      throw err;
    }
  }, []);

  /**
   * Check if poem is bookmarked
   */
  const checkBookmark = useCallback(async (poemId) => {
    try {
      const response = await BookmarkAPI.checkBookmark(poemId);
      return response.isBookmarked;
    } catch (err) {
      console.error("Check bookmark error:", err);
      return false;
    }
  }, []);

  /**
   * Clear all bookmarks
   */
  const clearBookmarks = useCallback(async () => {
    try {
      setError(null);
      await BookmarkAPI.clearBookmarks();
      setBookmarks([]);
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error("Clear bookmarks error:", err);
      throw err;
    }
  }, []);

  /**
   * Refresh bookmarks
   */
  const refresh = useCallback(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchBookmarks();
    }
  }, [autoFetch, fetchBookmarks]);

  return {
    bookmarks,
    loading,
    error,
    pagination,
    addBookmark,
    removeBookmark,
    removeBookmarkByPoem,
    checkBookmark,
    clearBookmarks,
    refresh,
    fetchBookmarks,
  };
};

/**
 * Custom hook for checking if a poem is bookmarked
 * @param {string} poemId - Poem ID to check
 * @returns {Object} Bookmark state
 */
export const useIsBookmarked = (poemId) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBookmark = async () => {
      if (!poemId) {
        setLoading(false);
        return;
      }

      try {
        const response = await BookmarkAPI.checkBookmark(poemId);
        setIsBookmarked(response.isBookmarked);
        setBookmarkId(response.bookmarkId);
      } catch (err) {
        console.error("Check bookmark error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkBookmark();
  }, [poemId]);

  const toggleBookmark = useCallback(async () => {
    try {
      if (isBookmarked) {
        if (bookmarkId) {
          await BookmarkAPI.removeBookmark(bookmarkId);
        } else {
          await BookmarkAPI.removeBookmarkByPoem(poemId);
        }
        setIsBookmarked(false);
        setBookmarkId(null);
      } else {
        const response = await BookmarkAPI.addBookmark(poemId);
        setIsBookmarked(true);
        setBookmarkId(response.bookmark._id);
      }
    } catch (err) {
      console.error("Toggle bookmark error:", err);
      throw err;
    }
  }, [isBookmarked, bookmarkId, poemId]);

  return {
    isBookmarked,
    bookmarkId,
    loading,
    toggleBookmark,
  };
};

export default useBookmarks;
