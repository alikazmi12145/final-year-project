/**
 * Language Detection and Styling Utility
 * Automatically detects Urdu text and applies classical typography
 */

/**
 * Detects if text contains Urdu script
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if Urdu is detected
 */
export const isUrduText = (text) => {
  if (!text || typeof text !== 'string') return false;

  // Urdu Unicode ranges:
  // Arabic (0600–06FF)
  // Arabic Supplement (0750–077F)
  // Arabic Extended-A (08A0–08FF)
  // Arabic Presentation Forms-A (FB50–FDFF)
  // Arabic Presentation Forms-B (FE70–FEFF)
  const urduRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  return urduRegex.test(text);
};

/**
 * Detects the primary language of text
 * @param {string} text - Text to analyze
 * @returns {string} - 'urdu', 'english', or 'mixed'
 */
export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'english';

  const urduChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const totalChars = urduChars + englishChars;

  if (totalChars === 0) return 'english';

  const urduPercentage = (urduChars / totalChars) * 100;

  if (urduPercentage > 70) return 'urdu';
  if (urduPercentage < 30) return 'english';
  return 'mixed';
};

/**
 * Gets appropriate CSS class based on detected language
 * @param {string} text - Text to analyze
 * @returns {string} - CSS class names
 */
export const getLanguageClass = (text) => {
  const language = detectLanguage(text);

  switch (language) {
    case 'urdu':
      return 'nastaleeq-primary text-right';
    case 'mixed':
      return 'nastaleeq-primary text-right';
    case 'english':
    default:
      return 'text-left';
  }
};

/**
 * Gets text direction based on detected language
 * @param {string} text - Text to analyze
 * @returns {string} - 'rtl' or 'ltr'
 */
export const getTextDirection = (text) => {
  const language = detectLanguage(text);
  return language === 'urdu' || language === 'mixed' ? 'rtl' : 'ltr';
};

/**
 * Applies language-specific styling to an element
 * @param {HTMLElement} element - DOM element
 * @param {string} text - Text content
 */
export const applyLanguageStyling = (element, text) => {
  if (!element) return;

  const language = detectLanguage(text);
  const direction = getTextDirection(text);

  element.setAttribute('dir', direction);

  // Remove existing language classes
  element.classList.remove('nastaleeq-primary', 'text-right', 'text-left');

  // Add appropriate classes
  if (language === 'urdu' || language === 'mixed') {
    element.classList.add('nastaleeq-primary', 'text-right');
  } else {
    element.classList.add('text-left');
  }
};

/**
 * Formats text with appropriate language markers
 * @param {string} text - Text to format
 * @returns {object} - Formatted text with metadata
 */
export const formatTextWithLanguage = (text) => {
  const language = detectLanguage(text);
  const direction = getTextDirection(text);
  const className = getLanguageClass(text);

  return {
    text,
    language,
    direction,
    className,
    isUrdu: language === 'urdu' || language === 'mixed',
  };
};

/**
 * Validates Urdu text input
 * @param {string} text - Text to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {object} - Validation result
 */
export const validateUrduText = (text, minLength = 1, maxLength = Infinity) => {
  const errors = [];

  if (!text || text.trim().length === 0) {
    errors.push({
      en: 'Text is required',
      ur: 'متن درکار ہے',
    });
  }

  if (text && text.trim().length < minLength) {
    errors.push({
      en: `Text must be at least ${minLength} characters`,
      ur: `متن کم از کم ${minLength} حروف کا ہونا چاہیے`,
    });
  }

  if (text && text.length > maxLength) {
    errors.push({
      en: `Text must not exceed ${maxLength} characters`,
      ur: `متن ${maxLength} حروف سے زیادہ نہیں ہونا چاہیے`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    language: detectLanguage(text),
  };
};

/**
 * Gets localized error message based on detected language
 * @param {object} errorObject - Error object with en and ur properties
 * @param {string} text - Text to detect language from
 * @returns {string} - Localized error message
 */
export const getLocalizedError = (errorObject, text = '') => {
  const language = detectLanguage(text);
  return language === 'urdu' || language === 'mixed' ? errorObject.ur : errorObject.en;
};

/**
 * React hook for detecting and managing language state
 * @param {string} initialText - Initial text value
 * @returns {object} - Language state and utilities
 */
export const useLanguageDetection = (initialText = '') => {
  const [text, setText] = React.useState(initialText);
  const [language, setLanguage] = React.useState(detectLanguage(initialText));
  const [direction, setDirection] = React.useState(getTextDirection(initialText));

  React.useEffect(() => {
    const detectedLanguage = detectLanguage(text);
    const detectedDirection = getTextDirection(text);

    setLanguage(detectedLanguage);
    setDirection(detectedDirection);
  }, [text]);

  return {
    text,
    setText,
    language,
    direction,
    isUrdu: language === 'urdu' || language === 'mixed',
    className: getLanguageClass(text),
  };
};

export default {
  isUrduText,
  detectLanguage,
  getLanguageClass,
  getTextDirection,
  applyLanguageStyling,
  formatTextWithLanguage,
  validateUrduText,
  getLocalizedError,
  useLanguageDetection,
};
