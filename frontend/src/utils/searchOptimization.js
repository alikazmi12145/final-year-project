// Utility functions for optimizing Urdu text processing and search

/**
 * Normalize Urdu text for better search results
 * @param {string} text - The text to normalize
 * @returns {string} - Normalized text
 */
export const normalizeUrduText = (text) => {
  if (!text) return "";

  return (
    text
      // Remove diacritics (aerab)
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      // Normalize different forms of the same letter
      .replace(/ي/g, "ی") // Normalize yay
      .replace(/ك/g, "ک") // Normalize kaaf
      .replace(/ة/g, "ہ") // Normalize tay marboota
      .replace(/إ|أ/g, "ا") // Normalize alif variations
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  );
};

/**
 * Extract keywords from Urdu text
 * @param {string} text - The text to extract keywords from
 * @returns {string[]} - Array of keywords
 */
export const extractUrduKeywords = (text) => {
  if (!text) return [];

  const urduStopWords = new Set([
    "کا",
    "کی",
    "کے",
    "میں",
    "کو",
    "سے",
    "پر",
    "اور",
    "یا",
    "لیے",
    "ہے",
    "ہیں",
    "تھا",
    "تھے",
    "گا",
    "گی",
    "گے",
    "نے",
    "کہ",
    "جو",
    "جس",
    "تو",
    "یہ",
    "وہ",
    "اس",
    "ان",
    "کوئی",
    "کچھ",
    "سب",
    "تمام",
    "بہت",
    "زیادہ",
    "کم",
    "ایک",
    "دو",
    "تین",
    "چار",
    "پانچ",
    "ہر",
    "ہزار",
    "لاکھ",
    "کروڑ",
    "کل",
    "آج",
    "کل",
    "پرسوں",
  ]);

  const normalizedText = normalizeUrduText(text);
  const words = normalizedText.split(/\s+/);

  return words
    .filter((word) => word.length > 2) // Remove very short words
    .filter((word) => !urduStopWords.has(word)) // Remove stop words
    .filter((word) => !/^\d+$/.test(word)) // Remove pure numbers
    .filter((word) => word.length <= 20) // Remove very long words (likely corrupted)
    .slice(0, 50); // Limit to 50 keywords max
};

/**
 * Calculate similarity between two Urdu texts
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} - Similarity score between 0 and 1
 */
export const calculateUrduTextSimilarity = (text1, text2) => {
  const keywords1 = new Set(extractUrduKeywords(text1));
  const keywords2 = new Set(extractUrduKeywords(text2));

  if (keywords1.size === 0 && keywords2.size === 0) return 1;
  if (keywords1.size === 0 || keywords2.size === 0) return 0;

  const intersection = new Set(
    [...keywords1].filter((word) => keywords2.has(word))
  );
  const union = new Set([...keywords1, ...keywords2]);

  return intersection.size / union.size;
};

/**
 * Generate search suggestions based on input
 * @param {string} input - User input
 * @param {string[]} corpus - Array of texts to suggest from
 * @returns {string[]} - Array of suggestions
 */
export const generateSearchSuggestions = (input, corpus = []) => {
  if (!input || input.length < 2) return [];

  const normalizedInput = normalizeUrduText(input);
  const suggestions = new Set();

  // Common Urdu poetry terms
  const commonTerms = [
    "محبت",
    "عشق",
    "دل",
    "آنکھ",
    "نظر",
    "خواب",
    "یاد",
    "غم",
    "خوشی",
    "زندگی",
    "موت",
    "دوستی",
    "جدائی",
    "ملاقات",
    "انتظار",
    "فراق",
    "وصال",
    "تصور",
    "حسن",
    "جمال",
    "نور",
    "چاند",
    "سورج",
    "ستارے",
    "پھول",
    "گلاب",
    "بہار",
    "خزاں",
    "بارش",
    "ہوا",
    "سمندر",
    "پہاڑ",
    "دریا",
    "باغ",
    "گلشن",
    "غزل",
    "نظم",
    "رباعی",
    "قطعہ",
    "مرثیہ",
    "حمد",
    "نعت",
    "منقبت",
    "غالب",
    "اقبال",
    "فیض",
    "میر",
    "سودا",
    "ظفر",
    "حالی",
    "شبلی",
  ];

  // Add matching common terms
  commonTerms.forEach((term) => {
    if (term.includes(normalizedInput) || normalizedInput.includes(term)) {
      suggestions.add(term);
    }
  });

  // Add matching terms from corpus
  corpus.forEach((text) => {
    const keywords = extractUrduKeywords(text);
    keywords.forEach((keyword) => {
      if (
        keyword.includes(normalizedInput) ||
        normalizedInput.includes(keyword)
      ) {
        suggestions.add(keyword);
      }
    });
  });

  return Array.from(suggestions).slice(0, 10);
};

/**
 * Convert Roman Urdu to Urdu script (basic conversion)
 * @param {string} romanText - Roman Urdu text
 * @returns {string} - Urdu text
 */
export const romanToUrdu = (romanText) => {
  if (!romanText) return "";

  const romanToUrduMap = {
    // Basic mappings
    a: "ا",
    aa: "آ",
    i: "اِ",
    u: "اُ",
    e: "ے",
    o: "او",
    b: "ب",
    p: "پ",
    t: "ت",
    th: "تھ",
    j: "ج",
    ch: "چ",
    h: "ح",
    kh: "خ",
    d: "د",
    dh: "دھ",
    r: "ر",
    z: "ز",
    zh: "ژ",
    s: "س",
    sh: "ش",
    x: "ص",
    z: "ض",
    t: "ط",
    z: "ظ",
    a: "ع",
    gh: "غ",
    f: "ف",
    q: "ق",
    k: "ک",
    g: "گ",
    l: "ل",
    m: "م",
    n: "ن",
    w: "و",
    h: "ہ",
    y: "ی",
    // Common words
    muhabbat: "محبت",
    mohabbat: "محبت",
    ishq: "عشق",
    dil: "دل",
    aankh: "آنکھ",
    nazar: "نظر",
    khwab: "خواب",
    yaad: "یاد",
    gham: "غم",
    khushi: "خوشی",
    zindagi: "زندگی",
    maut: "موت",
    dosti: "دوستی",
    judai: "جدائی",
    intezar: "انتظار",
    ghazal: "غزل",
    nazm: "نظم",
    rubai: "رباعی",
    ghalib: "غالب",
    iqbal: "اقبال",
    faiz: "فیض",
    meer: "میر",
  };

  let urduText = romanText.toLowerCase();

  // Replace longer patterns first
  Object.keys(romanToUrduMap)
    .sort((a, b) => b.length - a.length)
    .forEach((roman) => {
      const urdu = romanToUrduMap[roman];
      urduText = urduText.replace(new RegExp(roman, "gi"), urdu);
    });

  return urduText;
};

/**
 * Detect if text contains Urdu characters
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains Urdu characters
 */
export const containsUrdu = (text) => {
  if (!text) return false;
  // Urdu Unicode range: U+0600 to U+06FF, U+0750 to U+077F, U+08A0 to U+08FF, U+FB50 to U+FDFF, U+FE70 to U+FEFF
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text
  );
};

/**
 * Clean OCR extracted text
 * @param {string} ocrText - Text from OCR
 * @returns {string} - Cleaned text
 */
export const cleanOCRText = (ocrText) => {
  if (!ocrText) return "";

  return (
    ocrText
      // Remove common OCR errors
      .replace(
        /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0020-\u007E\s]/g,
        ""
      )
      // Fix common character misrecognitions
      .replace(/0/g, "و") // Zero often misread as waw
      .replace(/1/g, "ا") // One often misread as alif
      .replace(/\|/g, "ا") // Pipe often misread as alif
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
};

/**
 * Performance optimization for search
 * @param {Function} searchFunction - The search function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounceSearch = (searchFunction, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => searchFunction.apply(null, args), delay);
  };
};

/**
 * Cache for search results
 */
class SearchCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (this.cache.has(key)) {
      // Move to end to mark as recently used
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

export const searchCache = new SearchCache(50);

/**
 * Create a cache key for search parameters
 * @param {Object} searchParams - Search parameters
 * @returns {string} - Cache key
 */
export const createCacheKey = (searchParams) => {
  return JSON.stringify(searchParams);
};
