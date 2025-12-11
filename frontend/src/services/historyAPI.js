import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Reading History API Service
 * Handles all reading history-related API calls
 */
class HistoryAPI {
  /**
   * Add or update reading history
   */
  static async addHistory(poemId) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/history`,
        { poemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user's reading history
   */
  static async getHistory(params = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/history`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get recent reading history
   */
  static async getRecentHistory(limit = 10) {
    try {
      const response = await axios.get(`${API_BASE_URL}/history/recent`, {
        params: { limit },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get reading statistics
   */
  static async getStats() {
    try {
      const response = await axios.get(`${API_BASE_URL}/history/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get reading streak
   */
  static async getStreak() {
    try {
      const response = await axios.get(`${API_BASE_URL}/history/streak`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Clear reading history
   */
  static async clearHistory() {
    try {
      const response = await axios.delete(`${API_BASE_URL}/history/clear`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Remove specific history entry
   */
  static async removeHistoryEntry(historyId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/history/${historyId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  static handleError(error) {
    if (error.response) {
      return new Error(error.response.data.message || "Request failed");
    } else if (error.request) {
      return new Error("No response from server");
    } else {
      return new Error(error.message || "Request failed");
    }
  }
}

export default HistoryAPI;
