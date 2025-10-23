// Quick test file to debug API issues
import { poetryAPI } from "./services/api.jsx";

async function testAPI() {
  try {
    console.log("🧪 Testing poetryAPI.getAllPoems...");
    const response = await poetryAPI.getAllPoems({
      page: 1,
      limit: 5,
      category: undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    console.log("📡 API Response:", response);
    console.log("📊 Response data:", response.data);

    if (response.data?.success) {
      console.log("✅ API call successful!");
      console.log("📝 Poems count:", response.data.poems?.length || 0);
    } else {
      console.log("❌ API call failed:", response.data?.message);
    }
  } catch (error) {
    console.error("💥 API call error:", error);
  }
}

// Auto-run test
testAPI();

export default testAPI;
