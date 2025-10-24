// Enhanced Search Service for Frontend
// This replaces your existing search API calls with unified search

class UnifiedSearchService {
  constructor(baseURL = "http://localhost:5000/api") {
    this.baseURL = baseURL;
  }

  /**
   * Unified search across database and OpenAI (Rekhta disabled)
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<object>} - Search results from all sources
   */
  async searchAll(query, options = {}) {
    const {
      limit = 20,
      page = 1,
      useAI = true,
      includeRekhta = false, // Disabled by default
      sources = ["database", "ai"], // Only use database and AI
    } = options;

    try {
      const response = await fetch(`${this.baseURL}/search/unified`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit,
          page,
          useAI,
          includeRekhta,
          sources,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Search failed");
      }

      return {
        success: true,
        query: data.query,
        results: {
          // Combined results from all sources
          all: data.combined || [],

          // Results by source
          database: data.sources?.database?.poems || [],
          // Rekhta removed
          aiSuggestions: data.sources?.ai?.suggestions || [],
          aiRecommendations: data.sources?.ai?.recommendations || [],
        },

        // Summary statistics
        summary: {
          total: data.combined?.length || 0,
          databaseCount: data.sources?.database?.count || 0,
          // Rekhta removed
          aiSuggestionCount: data.sources?.ai?.suggestions?.length || 0,
        },

        // Search metadata
        meta: {
          searchTime: data.searchTime,
          sources: data.sources,
          ...data.summary,
        },
      };
    } catch (error) {
      console.error("Unified search error:", error);
      return {
        success: false,
        error: error.message,
        results: {
          all: [],
          database: [],
          // Rekhta removed
          aiSuggestions: [],
          aiRecommendations: [],
        },
        summary: {
          total: 0,
          databaseCount: 0,
          // Rekhta removed
          aiSuggestionCount: 0,
        },
      };
    }
  }

  /**
   * Search only local database (for fast queries)
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<object>} - Database search results
   */
  async searchDatabase(query, options = {}) {
    return this.searchAll(query, {
      ...options,
      sources: ["database"],
      includeRekhta: false,
      useAI: false,
    });
  }

  /**
   * Search with AI enhancements (writing suggestions, recommendations)
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<object>} - AI-enhanced search results
   */
  async searchWithAI(query, options = {}) {
    return this.searchAll(query, {
      ...options,
      useAI: true,
      sources: ["database", "ai"],
    });
  }

  /**
   * Search classical poetry from Rekhta
   * @param {string} query - Search query (poet name or poem content)
   * @param {object} options - Search options
   * @returns {Promise<object>} - Rekhta search results
   */
  async searchRekhta(query, options = {}) {
    return this.searchAll(query, {
      ...options,
      sources: ["rekhta"],
      useAI: false,
    });
  }

  /**
   * Get search suggestions based on partial query
   * @param {string} partialQuery - Partial search query
   * @returns {Promise<array>} - Search suggestions
   */
  async getSuggestions(partialQuery) {
    try {
      const response = await fetch(`${this.baseURL}/search/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ partialQuery }),
      });

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error("Suggestions error:", error);
      return [];
    }
  }
}

// Export for use in your React components
export default UnifiedSearchService;

// Example usage in a React component:
/*
import UnifiedSearchService from './path/to/UnifiedSearchService';

const SearchComponent = () => {
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const searchService = new UnifiedSearchService();

  const handleSearch = async (query) => {
    setLoading(true);
    try {
      const results = await searchService.searchAll(query, {
        limit: 20,
        useAI: true,
        includeRekhta: true
      });
      
      setSearchResults(results);
      
      // Display results
      console.log('Total results:', results.summary.total);
      console.log('Database poems:', results.results.database);
      console.log('Rekhta poems:', results.results.rekhta);
      console.log('AI suggestions:', results.results.aiSuggestions);
      
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        type="text" 
        placeholder="اردو شاعری تلاش کریں..."
        onKeyPress={(e) => e.key === 'Enter' && handleSearch(e.target.value)}
      />
      
      {loading && <div>تلاش جاری ہے...</div>}
      
      {searchResults && (
        <div>
          <h3>تلاش کے نتائج ({searchResults.summary.total})</h3>
          
          {searchResults.results.database.length > 0 && (
            <section>
              <h4>مقامی ڈیٹابیس ({searchResults.summary.databaseCount})</h4>
              {searchResults.results.database.map(poem => (
                <div key={poem._id}>
                  <h5>{poem.title}</h5>
                  <p>{poem.excerpt}</p>
                  <small>شاعر: {poem.poet?.name || poem.author?.name}</small>
                </div>
              ))}
            </section>
          )}
          
          {searchResults.results.rekhta.length > 0 && (
            <section>
              <h4>ریختہ ({searchResults.summary.rekhtaCount})</h4>
              {searchResults.results.rekhta.map((poem, index) => (
                <div key={index}>
                  <h5>{poem.title}</h5>
                  <p>{poem.excerpt}</p>
                  <small>ماخذ: {poem.source}</small>
                </div>
              ))}
            </section>
          )}
          
          {searchResults.results.aiSuggestions.length > 0 && (
            <section>
              <h4>AI تجاویز</h4>
              <ul>
                {searchResults.results.aiSuggestions.keyWords?.map((word, index) => (
                  <li key={index}>{word}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
*/
