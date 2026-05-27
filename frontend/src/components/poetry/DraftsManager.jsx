import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { poetryAPI } from "../../services/poetryService";
import { EnhancedPoemCard } from "./EnhancedPoemCard";
import { Button } from "../ui/Button";
import { MdAdd, MdPublish, MdDelete, MdEdit } from "react-icons/md";

/**
 * Drafts Manager Component
 * Allows users to view, edit, and publish their draft poems
 */
export function DraftsManager() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedDrafts, setSelectedDrafts] = useState(new Set());

  // Fetch user's draft poems
  const fetchDrafts = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await poetryAPI.getUserDrafts({ page, limit: 20 });
      if (response.success) {
        setDrafts(response.drafts);
        setTotalPages(response.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Publish a single draft
  const handlePublish = async (draftId) => {
    try {
      const response = await poetryAPI.publishPoem(draftId);
      if (response.success) {
        // Remove from drafts and show confirmation
        setDrafts((prev) => prev.filter((d) => d._id !== draftId));
        alert("شاعری کامیابی سے شائع ہو گئی"); // "Poem published successfully"
      }
    } catch (error) {
      console.error("Error publishing poem:", error);
      alert("شائع کرتے وقت خرابی ہوئی"); // "Error publishing poem"
    }
  };

  // Delete a draft
  const handleDelete = async (draftId) => {
    if (!window.confirm("کیا آپ یہ ڈرافٹ حذف کرنا چاہتے ہیں?")) return; // "Delete this draft?"

    try {
      const response = await poetryAPI.deletePoem(draftId);
      if (response.success) {
        setDrafts((prev) => prev.filter((d) => d._id !== draftId));
      }
    } catch (error) {
      console.error("Error deleting draft:", error);
    }
  };

  // Toggle draft selection
  const handleSelectDraft = (draftId) => {
    const newSelected = new Set(selectedDrafts);
    if (newSelected.has(draftId)) {
      newSelected.delete(draftId);
    } else {
      newSelected.add(draftId);
    }
    setSelectedDrafts(newSelected);
  };

  // Batch publish selected drafts
  const handleBatchPublish = async () => {
    if (selectedDrafts.size === 0) return;

    const poemIds = Array.from(selectedDrafts);
    try {
      // Publish each poem individually
      await Promise.all(
        poemIds.map((id) => poetryAPI.publishPoem(id).catch((e) => console.error(e)))
      );

      // Refresh drafts
      fetchDrafts();
      setSelectedDrafts(new Set());
      alert(`${poemIds.length} شاعریں کامیابی سے شائع ہوں گئیں`); // "X poems published successfully"
    } catch (error) {
      console.error("Error batch publishing:", error);
    }
  };

  if (loading && drafts.length === 0) {
    return <div className="text-center py-8">لوڈ ہو رہا ہے...</div>; // "Loading..."
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">میری ڈرافٹ شاعریں</h2> {/* "My Draft Poems" */}
        {selectedDrafts.size > 0 && (
          <Button
            onClick={handleBatchPublish}
            className="flex items-center gap-2"
            variant="primary"
          >
            <MdPublish /> {selectedDrafts.size} شائع کریں {/* "Publish" */}
          </Button>
        )}
      </div>

      {/* Select All Toggle */}
      {drafts.length > 0 && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedDrafts.size === drafts.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedDrafts(new Set(drafts.map((d) => d._id)));
              } else {
                setSelectedDrafts(new Set());
              }
            }}
            className="w-4 h-4"
          />
          <span>تمام منتخب کریں</span> {/* "Select All" */}
        </label>
      )}

      {/* Drafts Grid */}
      {drafts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((draft) => (
            <div key={draft._id} className="relative">
              {/* Selection Checkbox */}
              <label className="absolute top-2 left-2 z-10 flex items-center gap-2 cursor-pointer bg-white rounded-full p-2">
                <input
                  type="checkbox"
                  checked={selectedDrafts.has(draft._id)}
                  onChange={() => handleSelectDraft(draft._id)}
                  className="w-4 h-4"
                />
              </label>

              {/* Poem Card */}
              <EnhancedPoemCard poem={draft} showBadge={false} />

              {/* Action Buttons */}
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => handlePublish(draft._id)}
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2"
                  variant="primary"
                >
                  <MdPublish size={18} />
                  شائع کریں
                </Button>
                <Button
                  onClick={() => {
                    // Navigate to edit page
                    window.location.href = `/poetry/edit/${draft._id}`;
                  }}
                  size="sm"
                  variant="secondary"
                  className="flex items-center justify-center gap-2"
                >
                  <MdEdit size={18} />
                </Button>
                <Button
                  onClick={() => handleDelete(draft._id)}
                  size="sm"
                  variant="danger"
                  className="flex items-center justify-center gap-2"
                >
                  <MdDelete size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <MdAdd size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4">کوئی ڈرافٹ شاعری نہیں</p> {/* "No draft poems" */}
          <Button
            onClick={() => (window.location.href = "/poetry/create")}
            variant="primary"
          >
            نئی شاعری بنائیں
          </Button>{" "}
          {/* "Create New Poem" */}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            پچھلا {/* "Previous" */}
          </Button>
          <span className="px-4 py-2 text-sm">
            صفحہ {page} / {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            اگلا {/* "Next" */}
          </Button>
        </div>
      )}
    </div>
  );
}
