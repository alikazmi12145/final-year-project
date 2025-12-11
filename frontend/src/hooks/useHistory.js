import { useState, useEffect, useCallback } from "react";
import HistoryAPI from "../services/historyAPI";

/**
 * Custom hook for managing reading history
 * @param {Object} options - Hook options
 * @returns {Object} History state and methods
 */
export const useHistory = (options = {}) => {
  const { autoFetch = true, page = 1, limit = 50 } = options;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);

  /**
   * Fetch user's reading history
   */
  const fetchHistory = useCallback(
    async (params = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await HistoryAPI.getHistory({
          page,
          limit,
          ...params,
        });
        setHistory(response.history);
        setPagination(response.pagination);
      } catch (err) {
        setError(err.message);
        console.error("Fetch history error:", err);
      } finally {
        setLoading(false);
      }
    },
    [page, limit]
  );

  /**
   * Add or update reading history
   */
  const addHistory = useCallback(async (poemId) => {
    try {
      setError(null);
      const response = await HistoryAPI.addHistory(poemId);
      
      // Update local state
      setHistory((prev) => {
        const existing = prev.find((item) => item.poem?._id === poemId);
        if (existing) {
          return prev.map((item) =>
            item.poem?._id === poemId ? response.history : item
          );
        } else {
          return [response.history, ...prev];
        }
      });
      
      return response;
    } catch (err) {
      setError(err.message);
      console.error("Add history error:", err);
      throw err;
    }
  }, []);

  /**
   * Get recent reading history
   */
  const fetchRecentHistory = useCallback(async (limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const response = await HistoryAPI.getRecentHistory(limit);
      return response.history;
    } catch (err) {
      setError(err.message);
      console.error("Fetch recent history error:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Remove history entry
   */
  const removeHistoryEntry = useCallback(async (historyId) => {
    try {
      setError(null);
      await HistoryAPI.removeHistoryEntry(historyId);
      
      // Remove from local state
      setHistory((prev) => prev.filter((item) => item._id !== historyId));
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error("Remove history entry error:", err);
      throw err;
    }
  }, []);

  /**
   * Clear all reading history
   */
  const clearHistory = useCallback(async () => {
    try {
      setError(null);
      await HistoryAPI.clearHistory();
      setHistory([]);
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error("Clear history error:", err);
      throw err;
    }
  }, []);

  /**
   * Fetch reading statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await HistoryAPI.getStats();
      setStats(response.stats);
      return response.stats;
    } catch (err) {
      console.error("Fetch stats error:", err);
      return null;
    }
  }, []);

  /**
   * Refresh history
   */
  const refresh = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchHistory();
    }
  }, [autoFetch, fetchHistory]);

  return {
    history,
    loading,
    error,
    pagination,
    stats,
    addHistory,
    removeHistoryEntry,
    clearHistory,
    fetchHistory,
    fetchRecentHistory,
    fetchStats,
    refresh,
  };
};

/**
 * Custom hook for reading streak
 * @returns {Object} Streak state
 */
export const useReadingStreak = () => {
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    try {
      setLoading(true);
      const response = await HistoryAPI.getStreak();
      setStreak({
        currentStreak: response.currentStreak,
        longestStreak: response.longestStreak,
      });
    } catch (err) {
      console.error("Fetch streak error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    loading,
    refresh: fetchStreak,
  };
};

/**
 * Custom hook for tracking poem views
 * Automatically adds to history when poem is viewed
 * @param {string} poemId - Poem ID to track
 */
export const useTrackPoemView = (poemId) => {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    const trackView = async () => {
      if (!poemId || tracked) return;

      try {
        await HistoryAPI.addHistory(poemId);
        setTracked(true);
      } catch (err) {
        console.error("Track poem view error:", err);
      }
    };

    // Track after a short delay to ensure user actually viewed the poem
    const timer = setTimeout(trackView, 2000);
    return () => clearTimeout(timer);
  }, [poemId, tracked]);

  return { tracked };
};

export default useHistory;
