import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Bookmark API Service
 * Handles all bookmark-related API calls
 */
class BookmarkAPI {
  /**
   * Add a bookmark
   */
  static async addBookmark(poemId) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/bookmarks`,
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
   * Remove bookmark by ID
   */
  static async removeBookmark(bookmarkId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/bookmarks/${bookmarkId}`,
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
   * Remove bookmark by poem ID
   */
  static async removeBookmarkByPoem(poemId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/bookmarks/poem/${poemId}`,
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
   * Get user's bookmarks
   */
  static async getBookmarks(params = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookmarks`, {
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
   * Check if poem is bookmarked
   */
  static async checkBookmark(poemId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/bookmarks/check/${poemId}`,
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
   * Get bookmark statistics
   */
  static async getStats() {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookmarks/stats`, {
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
   * Clear all bookmarks
   */
  static async clearBookmarks() {
    try {
      const response = await axios.delete(`${API_BASE_URL}/bookmarks/clear`, {
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

export default BookmarkAPI;
