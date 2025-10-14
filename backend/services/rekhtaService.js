import axios from "axios";
import cheerio from "cheerio";

/**
 * Rekhta API Service for Urdu Poetry Platform
 * Integrates with Rekhta website to fetch classical poems and poets data
 */

class RekhtaService {
  constructor() {
    this.baseURL = "https://www.rekhta.org";
    this.apiTimeout = 15000; // 15 seconds timeout
  }

  /**
   * Fetch poems by a specific poet from Rekhta
   * @param {string} poetSlug - Poet's slug/name from Rekhta URL
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of poems per page
   * @returns {object} - Poems data with metadata
   */
  async getPoemsByPoet(poetSlug, page = 1, limit = 20) {
    try {
      console.log(`🔍 Fetching poems for poet: ${poetSlug} (page ${page})`);

      // Common classical Urdu poets mapping
      const poetMapping = {
        ghalib: "mirza-ghalib",
        iqbal: "allama-iqbal",
        faiz: "faiz-ahmad-faiz",
        mir: "mir-taqi-mir",
        zauq: "ibrahim-zauq",
        momin: "momin-khan-momin",
        dagh: "dagh-dehlvi",
        jigar: "jigar-moradabadi",
        josh: "josh-malihabadi",
        firaq: "firaq-gorakhpuri",
        hasrat: "hasrat-mohani",
        akbar: "akbar-allahabadi",
        nazir: "nazir-akbarabadi",
        sauda: "mirza-sauda",
        mushafi: "shah-muhammad-mushafi",
      };

      const mappedSlug = poetMapping[poetSlug.toLowerCase()] || poetSlug;

      // First, try to get the poet's main page
      const poetURL = `${this.baseURL}/poet/${mappedSlug}`;

      let response;
      try {
        response = await axios.get(poetURL, {
          timeout: this.apiTimeout,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            Connection: "keep-alive",
          },
        });
      } catch (error) {
        console.log(
          `⚠️ Direct poet page failed for ${poetSlug}, trying alternative...`
        );

        // Try alternative URL format
        const altURL = `${this.baseURL}/poets/${mappedSlug}`;
        response = await axios.get(altURL, {
          timeout: this.apiTimeout,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
      }

      const $ = cheerio.load(response.data);

      // Extract poet information
      const poetInfo = this.extractPoetInfo($);

      // Extract poems
      const poems = this.extractPoems($, limit);

      return {
        success: true,
        poet: {
          name: poetInfo.name,
          slug: mappedSlug,
          biography: poetInfo.biography,
          birthYear: poetInfo.birthYear,
          deathYear: poetInfo.deathYear,
          birthPlace: poetInfo.birthPlace,
          image: poetInfo.image,
        },
        poems: poems,
        pagination: {
          currentPage: page,
          totalPoems: poems.length,
          hasMore: poems.length === limit,
        },
        source: "Rekhta.org",
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Error fetching poems for ${poetSlug}:`, error.message);

      // Return fallback data with popular poets
      return this.getFallbackData(poetSlug);
    }
  }

  /**
   * Search for poems on Rekhta
   * @param {string} query - Search query
   * @param {string} type - Search type: 'poem', 'poet', 'ghazal', 'nazm'
   * @returns {object} - Search results
   */
  async searchPoems(query, type = "poem") {
    try {
      console.log(`🔍 Searching Rekhta for: "${query}" (type: ${type})`);

      const searchURL = `${this.baseURL}/search`;
      const response = await axios.get(searchURL, {
        params: {
          q: query,
          type: type,
        },
        timeout: this.apiTimeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const $ = cheerio.load(response.data);
      const results = this.extractSearchResults($, type);

      return {
        success: true,
        results: results,
        query: query,
        type: type,
        source: "Rekhta.org",
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Error searching Rekhta:`, error.message);
      return {
        success: false,
        results: [],
        query: query,
        type: type,
        error: error.message,
      };
    }
  }

  /**
   * Get featured/popular poems from Rekhta
   * @returns {object} - Featured poems
   */
  async getFeaturedPoems() {
    try {
      console.log("🔍 Fetching featured poems from Rekhta");

      const featuredURL = `${this.baseURL}/featured`;
      const response = await axios.get(featuredURL, {
        timeout: this.apiTimeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const $ = cheerio.load(response.data);
      const poems = this.extractPoems($, 20);

      return {
        success: true,
        poems: poems,
        source: "Rekhta.org",
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error fetching featured poems:", error.message);
      return this.getFallbackFeaturedPoems();
    }
  }

  /**
   * Extract poet information from HTML
   * @param {object} $ - Cheerio instance
   * @returns {object} - Poet information
   */
  extractPoetInfo($) {
    try {
      const name =
        $("h1, .poet-name, .title").first().text().trim() ||
        $(".poet-header h1").text().trim() ||
        $("title").text().split("|")[0].trim();

      const biography =
        $(".poet-bio, .biography, .about-poet").first().text().trim() ||
        $(".poet-description").text().trim() ||
        $('meta[name="description"]').attr("content") ||
        "";

      const birthYear =
        this.extractYear($(".birth-year, .born").text()) ||
        this.extractYear($(".poet-details").text()) ||
        null;

      const deathYear =
        this.extractYear($(".death-year, .died").text()) ||
        this.extractYear($(".poet-details").text()) ||
        null;

      const birthPlace =
        $(".birth-place, .birthplace").text().trim() ||
        $(".poet-location").text().trim() ||
        "";

      const image =
        $(".poet-image img, .poet-photo img").attr("src") ||
        $(".profile-image img").attr("src") ||
        "";

      return {
        name,
        biography,
        birthYear,
        deathYear,
        birthPlace,
        image: image
          ? image.startsWith("http")
            ? image
            : `${this.baseURL}${image}`
          : null,
      };
    } catch (error) {
      console.error("Error extracting poet info:", error);
      return {
        name: "Unknown Poet",
        biography: "",
        birthYear: null,
        deathYear: null,
        birthPlace: "",
        image: null,
      };
    }
  }

  /**
   * Extract poems from HTML
   * @param {object} $ - Cheerio instance
   * @param {number} limit - Maximum number of poems to extract
   * @returns {array} - Array of poems
   */
  extractPoems($, limit = 20) {
    const poems = [];

    try {
      // Try multiple selectors for poem containers
      const poemSelectors = [
        ".poem-item",
        ".ghazal-item",
        ".nazm-item",
        ".poetry-item",
        ".content-item",
        ".poem-card",
        ".verse-container",
      ];

      let poemElements = $();
      for (const selector of poemSelectors) {
        poemElements = $(selector);
        if (poemElements.length > 0) break;
      }

      // If no specific containers found, try to extract from general content
      if (poemElements.length === 0) {
        poemElements = $(".content p, .poetry p, .verse, .couplet").slice(
          0,
          limit
        );
      }

      poemElements.each((index, element) => {
        if (poems.length >= limit) return false;

        const $elem = $(element);

        const title =
          $elem.find(".title, .poem-title, h3, h4").first().text().trim() ||
          $elem.find("a").first().text().trim() ||
          `شعر ${poems.length + 1}`; // "Poem {number}" in Urdu

        const content =
          $elem.find(".content, .text, .verse, .couplet").text().trim() ||
          $elem.text().trim();

        const url = $elem.find("a").attr("href") || "";
        const fullURL =
          url && url.startsWith("http")
            ? url
            : url
            ? `${this.baseURL}${url}`
            : "";

        if (content && content.length > 10) {
          poems.push({
            title: title || `شعر ${poems.length + 1}`,
            content: content,
            url: fullURL,
            type: this.detectPoetryType(content),
            extractedAt: new Date().toISOString(),
          });
        }
      });

      return poems;
    } catch (error) {
      console.error("Error extracting poems:", error);
      return [];
    }
  }

  /**
   * Extract search results from HTML
   * @param {object} $ - Cheerio instance
   * @param {string} type - Search type
   * @returns {array} - Search results
   */
  extractSearchResults($, type) {
    const results = [];

    try {
      const resultSelectors = [
        ".search-result",
        ".result-item",
        ".poem-result",
        ".poet-result",
      ];

      let resultElements = $();
      for (const selector of resultSelectors) {
        resultElements = $(selector);
        if (resultElements.length > 0) break;
      }

      resultElements.each((index, element) => {
        const $elem = $(element);

        const title = $elem.find(".title, h3, h4, a").first().text().trim();
        const content = $elem
          .find(".content, .excerpt, .description")
          .text()
          .trim();
        const url = $elem.find("a").attr("href") || "";

        if (title) {
          results.push({
            title,
            content,
            url: url.startsWith("http") ? url : `${this.baseURL}${url}`,
            type: type,
          });
        }
      });

      return results;
    } catch (error) {
      console.error("Error extracting search results:", error);
      return [];
    }
  }

  /**
   * Detect poetry type from content
   * @param {string} content - Poem content
   * @returns {string} - Poetry type
   */
  detectPoetryType(content) {
    const lines = content.split("\n").filter((line) => line.trim());

    // Simple heuristics for poetry type detection
    if (lines.length === 2 && lines.every((line) => line.length < 100)) {
      return "شعر"; // Couplet
    } else if (lines.length >= 5 && content.includes("ردیف")) {
      return "غزل"; // Ghazal
    } else if (lines.length > 10) {
      return "نظم"; // Nazm
    } else if (lines.length === 4) {
      return "رباعی"; // Rubai
    }

    return "شاعری"; // General poetry
  }

  /**
   * Extract year from text
   * @param {string} text - Text containing year
   * @returns {number|null} - Extracted year
   */
  extractYear(text) {
    const yearMatch = text.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  }

  /**
   * Get fallback data when API fails
   * @param {string} poetSlug - Poet slug
   * @returns {object} - Fallback poet data
   */
  getFallbackData(poetSlug) {
    const fallbackPoets = {
      ghalib: {
        name: "میرزا غالب",
        biography:
          "اردو اور فارسی کے عظیم شاعر، جن کا اصل نام میرزا اسد اللہ خان تھا۔",
        birthYear: 1797,
        deathYear: 1869,
        birthPlace: "آگرہ",
        poems: [
          {
            title: "دل ہی تو ہے",
            content: "دل ہی تو ہے نہ سنگ و خشت\nدرد سے بھر نہ آئے کیوں",
            type: "شعر",
          },
          {
            title: "ہزاروں خواہشیں",
            content:
              "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے\nبہت نکلے میرے ارمان لیکن پھر بھی کم نکلے",
            type: "شعر",
          },
        ],
      },
      iqbal: {
        name: "علامہ اقبال",
        biography: "فلسفی، شاعر اور سیاسی رہنما، جنہیں شاعر مشرق کہا جاتا ہے۔",
        birthYear: 1877,
        deathYear: 1938,
        birthPlace: "سیالکوٹ",
        poems: [
          {
            title: "خودی کو کر بلند",
            content:
              "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے",
            type: "شعر",
          },
        ],
      },
      faiz: {
        name: "فیض احمد فیض",
        biography: "جدید اردو شاعری کے عظیم نام، انقلابی شاعر۔",
        birthYear: 1911,
        deathYear: 1984,
        birthPlace: "سیالکوٹ",
        poems: [
          {
            title: "مجھ سے پہلی سی محبت",
            content:
              "مجھ سے پہلی سی محبت میری محبوب نہ مانگ\nمیں نے سمجھا تھا کہ تو ہے تو درخشاں ہے حیات",
            type: "نظم",
          },
        ],
      },
    };

    const poet = fallbackPoets[poetSlug.toLowerCase()];

    if (poet) {
      return {
        success: true,
        poet: {
          name: poet.name,
          slug: poetSlug,
          biography: poet.biography,
          birthYear: poet.birthYear,
          deathYear: poet.deathYear,
          birthPlace: poet.birthPlace,
          image: null,
        },
        poems: poet.poems,
        pagination: {
          currentPage: 1,
          totalPoems: poet.poems.length,
          hasMore: false,
        },
        source: "Fallback Data",
        fetchedAt: new Date().toISOString(),
        note: "Data fetched from local fallback due to API unavailability",
      };
    }

    return {
      success: false,
      error: "Poet not found",
      availablePoets: Object.keys(fallbackPoets),
    };
  }

  /**
   * Get fallback featured poems
   * @returns {object} - Fallback featured poems
   */
  getFallbackFeaturedPoems() {
    return {
      success: true,
      poems: [
        {
          title: "دل ہی تو ہے",
          content: "دل ہی تو ہے نہ سنگ و خشت\nدرد سے بھر نہ آئے کیوں",
          type: "شعر",
          poet: "میرزا غالب",
        },
        {
          title: "خودی کو کر بلند",
          content:
            "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے",
          type: "شعر",
          poet: "علامہ اقبال",
        },
        {
          title: "مجھ سے پہلی سی محبت",
          content:
            "مجھ سے پہلی سی محبت میری محبوب نہ مانگ\nمیں نے سمجھا تھا کہ تو ہے تو درخشاں ہے حیات",
          type: "نظم",
          poet: "فیض احمد فیض",
        },
      ],
      source: "Fallback Data",
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Get list of supported classical poets
   * @returns {array} - List of poets
   */
  getSupportedPoets() {
    return [
      { slug: "ghalib", name: "میرزا غالب", englishName: "Mirza Ghalib" },
      { slug: "iqbal", name: "علامہ اقبال", englishName: "Allama Iqbal" },
      { slug: "faiz", name: "فیض احمد فیض", englishName: "Faiz Ahmad Faiz" },
      { slug: "mir", name: "میر تقی میر", englishName: "Mir Taqi Mir" },
      { slug: "zauq", name: "ابراہیم ذوق", englishName: "Ibrahim Zauq" },
      { slug: "momin", name: "مومن خان مومن", englishName: "Momin Khan Momin" },
      { slug: "dagh", name: "داغ دہلوی", englishName: "Dagh Dehlvi" },
      {
        slug: "jigar",
        name: "جگر مراد آبادی",
        englishName: "Jigar Moradabadi",
      },
      { slug: "josh", name: "جوش ملیح آبادی", englishName: "Josh Malihabadi" },
      {
        slug: "firaq",
        name: "فراق گورکھپوری",
        englishName: "Firaq Gorakhpuri",
      },
    ];
  }
}

export default new RekhtaService();
