import React, { useEffect, useState } from "react";
import { poetryAPI } from "../../services/api"; // ✅ fixed path

const ReaderDashboard = () => {
  const [poems, setPoems] = useState([]);

  useEffect(() => {
    const fetchPoems = async () => {
      try {
        const res = await poetryAPI.getAllPoems();
        setPoems(res.data);
      } catch (error) {
        console.error("❌ Error fetching poems:", error);
      }
    };

    fetchPoems();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 nastaleeq-heading">
        📖 قاری ڈیش بورڈ
      </h2>
      {poems.length === 0 ? (
        <p className="nastaleeq-primary">ابھی کوئی شاعری دستیاب نہیں ہے۔</p>
      ) : (
        <ul className="space-y-2">
          {poems.map((poem) => (
            <li
              key={poem._id}
              className="p-3 bg-gray-100 rounded-md shadow-sm hover:bg-gray-200 transition"
            >
              <h3 className="text-lg font-semibold">{poem.title}</h3>
              <p className="text-sm text-gray-600">by {poem.poetName}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReaderDashboard;
