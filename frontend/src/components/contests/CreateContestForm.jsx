import React, { useState } from "react";
import { PlusCircle, Calendar, List, Award } from "lucide-react";
import { Button } from "../ui/Button";

const CATEGORIES = [
  { value: "ghazal", label: "غزل / Ghazal" },
  { value: "nazm", label: "نظم / Nazm" },
  { value: "rubai", label: "رباعی / Rubai" },
  { value: "free-verse", label: "آزاد نظم / Free Verse" },
  { value: "all", label: "سب / All" },
];

const CreateContestForm = ({ onSubmit, loading = false }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    theme: "",
    category: "ghazal",
    rules: [""],
    submissionDeadline: "",
    votingDeadline: "",
    prizes: [{ position: "1st", title: "Winner", prize: "" }],
    maxParticipants: 100,
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleRuleChange = (index, value) => {
    const newRules = [...form.rules];
    newRules[index] = value;
    setForm((prev) => ({ ...prev, rules: newRules }));
  };

  const addRule = () => {
    if (form.rules.length < 20) {
      setForm((prev) => ({ ...prev, rules: [...prev.rules, ""] }));
    }
  };

  const removeRule = (index) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const handlePrizeChange = (index, field, value) => {
    const newPrizes = [...form.prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    setForm((prev) => ({ ...prev, prizes: newPrizes }));
  };

  const addPrize = () => {
    if (form.prizes.length < 10) {
      const positions = ["1st", "2nd", "3rd", "honorable_mention", "special"];
      const nextPos = positions[form.prizes.length] || "special";
      setForm((prev) => ({
        ...prev,
        prizes: [...prev.prizes, { position: nextPos, title: "", prize: "" }],
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedRules = form.rules.filter((r) => r.trim());
    if (!form.title || !form.description || !form.submissionDeadline || cleanedRules.length === 0) {
      return;
    }
    onSubmit({
      ...form,
      rules: cleanedRules,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-urdu-brown flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-urdu-gold" />
        نیا مقابلہ بنائیں / Create New Contest
      </h2>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-1">عنوان / Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          maxLength={200}
          required
          className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          placeholder="مقابلے کا عنوان..."
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-1">تفصیل / Description *</label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          maxLength={2000}
          rows={4}
          required
          className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none resize-none bg-white/80"
          placeholder="مقابلے کی تفصیل..."
        />
      </div>

      {/* Theme & Category */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">موضوع / Theme</label>
          <input
            type="text"
            value={form.theme}
            onChange={(e) => update("theme", e.target.value)}
            maxLength={100}
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
            placeholder="مثلاً: محبت، وطن..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">قسم / Category *</label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">
            <Calendar className="inline w-4 h-4 mr-1" />
            آخری تاریخ جمع / Submission Deadline *
          </label>
          <input
            type="datetime-local"
            value={form.submissionDeadline}
            onChange={(e) => update("submissionDeadline", e.target.value)}
            required
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">
            <Calendar className="inline w-4 h-4 mr-1" />
            آخری تاریخ ووٹنگ / Voting Deadline
          </label>
          <input
            type="datetime-local"
            value={form.votingDeadline}
            onChange={(e) => update("votingDeadline", e.target.value)}
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          />
        </div>
      </div>

      {/* Rules */}
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-1">
          <List className="inline w-4 h-4 mr-1" />
          قواعد / Rules *
        </label>
        {form.rules.map((rule, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={rule}
              onChange={(e) => handleRuleChange(index, e.target.value)}
              maxLength={500}
              className="flex-1 px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
              placeholder={`قاعدہ ${index + 1}...`}
            />
            {form.rules.length > 1 && (
              <button
                type="button"
                onClick={() => removeRule(index)}
                className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addRule}
          className="text-sm text-urdu-brown hover:text-urdu-gold"
        >
          + مزید قاعدہ شامل کریں
        </button>
      </div>

      {/* Prizes */}
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-1">
          <Award className="inline w-4 h-4 mr-1" />
          انعامات / Prizes
        </label>
        {form.prizes.map((prize, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={prize.title}
              onChange={(e) => handlePrizeChange(index, "title", e.target.value)}
              className="flex-1 px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
              placeholder="انعام کا عنوان..."
            />
            <input
              type="text"
              value={prize.prize}
              onChange={(e) => handlePrizeChange(index, "prize", e.target.value)}
              className="flex-1 px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
              placeholder="انعام (مثلاً: ₹10,000)..."
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addPrize}
          className="text-sm text-urdu-brown hover:text-urdu-gold"
        >
          + مزید انعام شامل کریں
        </button>
      </div>

      {/* Max Participants */}
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-1">
          زیادہ سے زیادہ شرکاء / Max Participants
        </label>
        <input
          type="number"
          value={form.maxParticipants}
          onChange={(e) => update("maxParticipants", e.target.value)}
          min={10}
          max={10000}
          className="w-32 px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
        />
      </div>

      <Button type="submit" variant="primary" loading={loading} disabled={loading}>
        مقابلہ بنائیں / Create Contest
      </Button>
    </form>
  );
};

export default CreateContestForm;
