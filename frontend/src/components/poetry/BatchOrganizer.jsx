import React, { useState } from "react";
import { poetryAPI } from "../../services/poetryService";
import { Button } from "../ui/Button";
import { MdTag, MdFolder, MdCategory } from "react-icons/md";

/**
 * Batch Organizer Component
 * Allows users to organize multiple poems at once
 */
export function BatchOrganizer({ selectedPoemIds, onComplete }) {
  const [action, setAction] = useState("add_tags");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!selectedPoemIds || selectedPoemIds.length === 0) {
    return null;
  }

  const categories = [
    "ghazal",
    "nazm",
    "rubai",
    "qawwali",
    "marsiya",
    "salam",
    "hamd",
    "naat",
    "free-verse",
    "other",
  ];

  const handleOrganize = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        poemIds: Array.from(selectedPoemIds),
        action,
      };

      if (action === "update_category") {
        payload.category = category;
      } else if (action === "add_tags") {
        payload.tags = tags.split(",").map((t) => t.trim());
      } else if (action === "add_to_collection") {
        payload.collectionId = collectionId;
      }

      const response = await poetryAPI.batchOrganizePoems(payload);

      if (response.success) {
        alert(`${selectedPoemIds.length} شاعریں کامیابی سے ترتیب دی گئیں`); // "X poems organized successfully"
        onComplete?.();
      }
    } catch (err) {
      setError(err.message || "خرابی ہوئی"); // "Error occurred"
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <MdFolder size={24} />
        {selectedPoemIds.size} شاعریں منتخب ہیں {/* "X Poems Selected" */}
      </h3>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="space-y-4">
        {/* Action Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">کیا کریں:</label> {/* "Action" */}
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="add_tags">ٹیگز شامل کریں</option> {/* "Add Tags" */}
            <option value="update_category">زمرہ تبدیل کریں</option> {/* "Change Category" */}
            <option value="add_to_collection">مجموعہ میں شامل کریں</option> {/* "Add to Collection" */}
          </select>
        </div>

        {/* Action-specific inputs */}
        {action === "add_tags" && (
          <div>
            <label className="block text-sm font-medium mb-2">ٹیگز (کوما سے الگ):</label> {/* "Tags (comma-separated)" */}
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="مثال: غزل، رومانی، محبت" // "Example: ghazal, romantic, love"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        )}

        {action === "update_category" && (
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <MdCategory /> زمرہ:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">منتخب کریں...</option> {/* "Select..." */}
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {action === "add_to_collection" && (
          <div>
            <label className="block text-sm font-medium mb-2">مجموعہ ID:</label> {/* "Collection ID" */}
            <input
              type="text"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              placeholder="MongoDB ObjectId"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-6">
        <Button
          onClick={handleOrganize}
          disabled={loading || (action === "add_tags" && !tags) || (action === "update_category" && !category)}
          variant="primary"
          className="flex-1"
        >
          {loading ? "جاری ہے..." : "لاگو کریں"} {/* "Apply" */}
        </Button>
        <Button
          onClick={() => onComplete?.()}
          variant="secondary"
          className="flex-1"
        >
          منسوخ کریں {/* "Cancel" */}
        </Button>
      </div>
    </div>
  );
}
