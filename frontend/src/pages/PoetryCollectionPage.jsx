import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PoemList from "../components/poetry/PoemList";
import { useAuth } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";

/**
 * Poetry Collection Page
 * Main page for browsing poems with filtering and search
 * Enhanced with full dynamic functionality and cultural design
 */

const PoetryCollectionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showConfirm } = useMessage();

  const [poems, setPoems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    category: "all",
    era: "all",
    poetryLanguage: "urdu",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Import API function dynamically to avoid circular dependencies
  const fetchPoems = useCallback(async () => {
    try {
      setLoading(true);

      const { poetryAPI } = await import("../services/api.jsx");

      const params = {
        ...filters,
        search: searchTerm || undefined,
        category: filters.category === "all" ? undefined : filters.category,
        era: filters.era === "all" ? undefined : filters.era,
        language: filters.poetryLanguage, // Map poetryLanguage back to language for API
      };

      const response = await poetryAPI.getAllPoems(params);

      if (response.data.success) {
        setPoems(response.data.poems || []);
      } else {
        console.error("Failed to fetch poems:", response.data.message);
        setPoems([]);
      }
    } catch (error) {
      console.error("Error fetching poems:", error);
      showError("نظمیں لوڈ کرنے میں خرابی / Error loading poems");
      setPoems([]);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, showError]);

  useEffect(() => {
    fetchPoems();
  }, [fetchPoems]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleFilter = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const handleCreateNew = useCallback(() => {
    navigate("/poems/create");
  }, [navigate]);

  const handleEdit = useCallback(
    (poemId) => {
      navigate(`/poems/${poemId}/edit`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (poemId) => {
      const confirmed = await showConfirm(
        "کیا آپ واقعی اس نظم کو حذف کرنا چاہتے ہیں؟",
        "Are you sure you want to delete this poem?"
      );

      if (!confirmed) return;

      try {
        const { poetryAPI } = await import("../services/api.jsx");
        const response = await poetryAPI.deletePoem(poemId);

        if (response.data.success) {
          setPoems((prev) => prev.filter((poem) => poem._id !== poemId));
          showSuccess("نظم کامیابی سے حذف ہو گئی / Poem deleted successfully");
        } else {
          showError("نظم حذف کرنے میں خرابی ہوئی / Error deleting poem");
        }
      } catch (error) {
        console.error("Delete error:", error);
        showError("نظم حذف کرنے میں خرابی ہوئی / Error deleting poem");
      }
    },
    [showConfirm, showSuccess, showError]
  );

  return (
    <div className="min-h-screen pt-20">
      {/* Added proper top padding to account for navbar */}
      <PoemList
        poems={poems}
        loading={loading}
        showActions={user?.role === "poet" || user?.role === "admin"}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSearch={handleSearch}
        onFilter={handleFilter}
        showHeader={true}
        showCreateButton={user?.role === "poet" || user?.role === "admin"}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
};

export default PoetryCollectionPage;
