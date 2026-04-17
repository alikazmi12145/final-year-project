import React, { useState } from "react";
import { Send, Feather } from "lucide-react";
import { Button } from "../ui/Button";

const SubmitPoetryForm = ({ contestId, userPoems = [], onSubmit, loading = false }) => {
  const [selectedPoemId, setSelectedPoemId] = useState("");
  const [newPoetry, setNewPoetry] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [mode, setMode] = useState("existing"); // 'existing' or 'new'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "existing" && selectedPoemId) {
      onSubmit({ poemId: selectedPoemId });
    } else if (mode === "new" && newTitle && newPoetry) {
      onSubmit({ title: newTitle, content: newPoetry, isNew: true });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-urdu-brown flex items-center gap-2">
        <Feather className="w-5 h-5 text-urdu-gold" />
        شاعری جمع کرائیں / Submit Poetry
      </h3>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "existing"
              ? "bg-urdu-brown text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          موجودہ شاعری / Existing Poem
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "new"
              ? "bg-urdu-brown text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          نئی شاعری / New Poem
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "existing" ? (
          <div>
            <label className="block text-sm font-medium text-urdu-brown mb-1">
              اپنی شاعری منتخب کریں / Select Your Poem
            </label>
            {userPoems.length > 0 ? (
              <select
                value={selectedPoemId}
                onChange={(e) => setSelectedPoemId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
              >
                <option value="">-- شاعری منتخب کریں --</option>
                {userPoems.map((poem) => (
                  <option key={poem._id} value={poem._id}>
                    {poem.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500 text-sm">
                آپ کی کوئی شاعری موجود نہیں۔ پہلے شاعری تخلیق کریں۔
              </p>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-1">
                عنوان / Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="شاعری کا عنوان..."
                maxLength={200}
                className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-urdu-brown mb-1">
                شاعری / Poetry Content
              </label>
              <textarea
                value={newPoetry}
                onChange={(e) => setNewPoetry(e.target.value)}
                placeholder="اپنی شاعری یہاں لکھیں..."
                rows={6}
                className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none resize-none bg-white/80 font-urdu leading-relaxed"
              />
            </div>
          </>
        )}

        <Button
          type="submit"
          variant="primary"
          size="small"
          loading={loading}
          disabled={
            loading ||
            (mode === "existing" && !selectedPoemId) ||
            (mode === "new" && (!newTitle || !newPoetry))
          }
        >
          <Send className="w-4 h-4 mr-1" />
          جمع کریں / Submit
        </Button>
      </form>
    </div>
  );
};

export default SubmitPoetryForm;
