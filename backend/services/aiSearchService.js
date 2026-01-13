/**
 * AI Search Service - OpenAI GPT-4o Powered
 * Integrated from urdu-ai-search module
 * Provides: Semantic Search, Image OCR, Qaafia (Rhyme), Harf-e-Ravi Analysis
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
let openai = null;
const initializeOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI client initialized for AI Search Service');
  }
  return openai;
};

// Qaafia (Rhyme) fallback dictionary for offline support
// Organized by proper rhyme patterns (last 2-3 characters), not just last letter
const QAAFIA_FALLBACKS = {
  // Pattern: یب (eeb) - نصیب، حبیب، etc.
  'یب': ['نصیب', 'حبیب', 'قریب', 'غریب', 'عجیب', 'طبیب', 'رقیب', 'ادیب', 'خطیب', 'صلیب', 'مصیب', 'ترتیب', 'تعذیب', 'تادیب', 'تہذیب', 'نقیب', 'لبیب', 'کٹیب', 'شبیب'],
  
  // Pattern: اب (aab) - کتاب، جواب، etc.
  'اب': ['کتاب', 'جواب', 'حساب', 'شراب', 'خواب', 'آب', 'تاب', 'باب', 'ثواب', 'عذاب', 'حجاب', 'نقاب', 'سراب', 'رباب', 'گلاب', 'انتخاب', 'اعتصاب', 'احتساب'],
  
  // Pattern: ب (single b) - رب، سبب، etc.
  'ب': ['رب', 'سبب', 'ادب', 'عجب', 'طلب', 'غضب', 'نسب', 'لب', 'قلب', 'کلب', 'صلب', 'حب', 'جذب', 'سلب', 'کسب'],
  
  // Pattern: آ (aa)
  'آ': ['دوا', 'ہوا', 'خدا', 'فضا', 'صدا', 'ندا', 'بقا', 'وفا', 'جفا', 'سزا', 'رضا', 'شفا', 'دعا', 'لقا', 'حنا', 'بلا', 'کھا', 'چھا', 'پا', 'جا', 'آ', 'نا', 'ہا', 'کا', 'ما', 'لا', 'را', 'سا', 'تا', 'دا'],
  
  // Pattern: ات (aat) - بات، رات، etc.
  'ات': ['بات', 'رات', 'جات', 'ذات', 'حیات', 'ملاقات', 'کائنات', 'واقعات', 'حالات', 'سوالات', 'خیالات', 'احساسات', 'جذبات', 'نباتات', 'صفات'],
  
  // Pattern: ت (single t) with vowel
  'ت': ['صورت', 'عزت', 'محبت', 'عادت', 'قسمت', 'دولت', 'شہرت', 'حکومت', 'صحبت', 'نصرت', 'عبرت', 'غربت', 'رحمت', 'نعمت', 'قدرت'],
  
  // Pattern: اج (aaj) - علاج، مزاج، etc.
  'اج': ['علاج', 'مزاج', 'تاج', 'آج', 'محتاج', 'راج', 'باج', 'خراج', 'معراج', 'اخراج', 'امتزاج'],
  
  // Pattern: وچ (ooch) - سوچ، پوچ، etc.
  'وچ': ['سوچ', 'پوچ', 'کوچ'],
  
  // Pattern: یچ (eech)
  'یچ': ['بیچ', 'نیچ', 'کھینچ', 'سینچ'],
  
  // Pattern: رد (ard) - درد، سرد، etc.
  'رد': ['درد', 'سرد', 'فرد', 'مرد', 'ورد', 'گرد', 'نرد', 'برد', 'کرد', 'زرد'],
  
  // Pattern: ار (aar) - یار، پیار، etc.
  'ار': ['یار', 'پیار', 'کار', 'بار', 'دار', 'مار', 'چار', 'نار', 'بہار', 'انتظار', 'اختیار', 'کاروبار', 'سردار', 'مزار', 'بازار', 'دیوار', 'آثار'],
  
  // Pattern: ر (single r)
  'ر': ['شعر', 'بحر', 'نظر', 'سفر', 'قمر', 'اثر', 'خبر', 'ہنر', 'گھر', 'پر', 'سر', 'در', 'زر', 'مر', 'بر', 'جر', 'تر', 'کر'],
  
  // Pattern: از (aaz) - راز، ناز، etc.
  'از': ['راز', 'ناز', 'ساز', 'آواز', 'پرواز', 'نماز', 'آغاز', 'انداز', 'تراز', 'فراز', 'گداز', 'ایاز', 'طراز', 'جواز', 'امتیاز', 'اعزاز'],
  
  // Pattern: وش (osh) - خوش، جوش، etc.
  'وش': ['خوش', 'نوش', 'گوش', 'دوش', 'پوش', 'فروش', 'خروش', 'جوش', 'ہوش', 'سروش', 'خموش'],
  
  // Pattern: اش (aash)
  'اش': ['تلاش', 'آرش', 'فاش', 'چاش', 'داش'],
  
  // Pattern: ش (single sh)
  'ش': ['آتش', 'بخش', 'کوش', 'رامش', 'دانش', 'بینش', 'کاوش', 'پالش', 'نوازش', 'پرورش', 'سازش'],
  
  // Pattern: ض (z)
  'ض': ['مرض', 'عرض', 'فرض', 'قرض', 'غرض', 'ارض'],
  
  // Pattern: اغ (aagh)
  'اغ': ['باغ', 'داغ', 'راغ', 'چراغ', 'فراغ', 'سراغ', 'دماغ', 'زاغ', 'بلاغ', 'ابلاغ'],
  
  // Pattern: ق (q)
  'ق': ['عشق', 'شوق', 'ذوق', 'فوق', 'سوق', 'طوق', 'خلق', 'حلق', 'فرق', 'شرق', 'غرق', 'ورق', 'برق', 'چمق'],
  
  // Pattern: اک (aak)
  'اک': ['پاک', 'خاک', 'چاک', 'تاک', 'ناک', 'لاک', 'ماک', 'راک', 'خطرناک', 'دردناک', 'المناک'],
  
  // Pattern: ک (single k)
  'ک': ['شک', 'لک', 'مک', 'نک', 'فلک', 'ملک', 'سلک', 'چشمک', 'دمک', 'کمک'],
  
  // Pattern: نگ (ang) - رنگ، جنگ، etc.
  'نگ': ['رنگ', 'جنگ', 'سنگ', 'بنگ', 'تنگ', 'چنگ', 'منگ', 'آہنگ', 'درنگ', 'فرنگ', 'پلنگ', 'خدنگ', 'ننگ'],
  
  // Pattern: ل (l)
  'ل': ['دل', 'گل', 'مل', 'جل', 'پل', 'تل', 'کل', 'بل', 'چل', 'ہل', 'اہل', 'فضل', 'وصل', 'فصل'],
  
  // Pattern: ام (aam)
  'ام': ['نام', 'شام', 'کام', 'جام', 'دام', 'بام', 'آرام', 'پیام', 'سلام', 'کلام', 'مقام', 'انعام', 'اہتمام', 'التزام', 'قیام', 'نظام', 'الزام', 'احترام'],
  
  // Pattern: م (single m)
  'م': ['غم', 'سم', 'دم', 'قم', 'کم', 'نم', 'رقم', 'علم', 'قلم', 'ظلم', 'حکم', 'ستم', 'الم'],
  
  // Pattern: ان (aan)
  'ان': ['جان', 'مان', 'پان', 'کان', 'بان', 'دان', 'زبان', 'جہان', 'آسمان', 'زمان', 'انسان', 'نشان', 'مہربان', 'گلستان', 'دوستان', 'عاشقان', 'مسلمان', 'ارمان', 'پاکستان'],
  
  // Pattern: ن (single n)
  'ن': ['من', 'تن', 'بن', 'سن', 'چن', 'دھن', 'گن', 'جن', 'فن', 'وطن', 'بدن', 'سکن', 'دفن', 'کفن'],
  
  // Pattern: و (o/oo)
  'و': ['کو', 'جو', 'ہو', 'تو', 'سو', 'نو', 'بو', 'خو', 'رو', 'مو', 'آرزو', 'گفتگو', 'جستجو', 'بازو', 'زانو'],
  
  // Pattern: اہ (aah)
  'اہ': ['راہ', 'شاہ', 'ماہ', 'چاہ', 'گاہ', 'آہ', 'واہ', 'بادشاہ', 'درگاہ', 'سپاہ', 'نگاہ', 'پناہ', 'گناہ', 'تباہ'],
  
  // Pattern: وہ (oh)
  'وہ': ['کوہ', 'شکوہ', 'اندوہ', 'ستوہ', 'فروہ', 'گروہ', 'جلوہ', 'باوجوہ'],
  
  // Pattern: ی (ee)
  'ی': ['پی', 'می', 'کی', 'جی', 'نی', 'بی', 'سی', 'تی', 'دی', 'ری'],
  
  // Pattern: گی (gi) - زندگی، بندگی، etc.
  'گی': ['زندگی', 'بندگی', 'سادگی', 'آمادگی', 'آزادگی', 'افتادگی', 'شرمندگی', 'دلبستگی'],
  
  // Pattern: ائی (aai)
  'ائی': ['آشنائی', 'تنہائی', 'رسوائی', 'دانائی', 'بینائی', 'شنوائی', 'روشنائی', 'رعنائی', 'غوغائی', 'یکتائی'],
  
  // Pattern: ید (eed)
  'ید': ['امید', 'تائید', 'وعید', 'شہید', 'مزید', 'عید', 'سعید', 'وحید', 'جدید', 'بعید', 'قریب', 'شدید', 'تمہید', 'تجدید'],
  
  // Pattern: ور (or)
  'ور': ['نور', 'حور', 'شور', 'زور', 'دور', 'طور', 'حضور', 'شعور', 'مشہور', 'مجبور', 'منصور', 'غرور', 'سرور', 'قصور', 'ضرور'],
  
  // Pattern: یر (eer)
  'یر': ['تصویر', 'تقدیر', 'تدبیر', 'تحریر', 'شریر', 'اسیر', 'فقیر', 'امیر', 'وزیر', 'خطیر', 'کثیر', 'نظیر', 'بشیر', 'نذیر', 'صغیر', 'کبیر'],
  
  // Pattern: یں (ein)
  'یں': ['میں', 'ہیں', 'نہیں', 'کہیں', 'یہیں', 'وہیں', 'جہیں'],
  
  // Pattern: ین (een)
  'ین': ['دین', 'حسین', 'یقین', 'کمین', 'زمین', 'آستین', 'سنگین', 'رنگین', 'شیرین', 'نگین']
};

// Roman to Urdu poet name mapping
const POET_NAME_MAPPING = {
  "mirza ghalib": "مرزا غالب",
  "ghalib": "مرزا غالب",
  "faiz": "فیض احمد فیض",
  "faiz ahmed faiz": "فیض احمد فیض",
  "iqbal": "علامہ اقبال",
  "allama iqbal": "علامہ اقبال",
  "mir taqi mir": "میر تقی میر",
  "mir": "میر تقی میر",
  "ahmad faraz": "احمد فراز",
  "faraz": "احمد فراز",
  "parveen shakir": "پروین شاکر",
  "jaun elia": "جون ایلیا",
  "sahir ludhianvi": "ساحر لدھیانوی",
  "sahir": "ساحر لدھیانوی",
  "habib jalib": "حبیب جالب",
  "kaifi azmi": "کیفی اعظمی",
  "gulzar": "گلزار",
  "javed akhtar": "جاوید اختر"
};

/**
 * Preprocess query - convert Roman names to Urdu
 */
const preprocessQuery = (query) => {
  if (!query) return query;
  let processedQuery = query.toLowerCase();
  
  for (const [roman, urdu] of Object.entries(POET_NAME_MAPPING)) {
    if (processedQuery.includes(roman)) {
      processedQuery = processedQuery.replace(roman, urdu);
    }
  }
  
  return processedQuery;
};

/**
 * AI-Powered Semantic Poetry Search using GPT-4o
 * Analyzes query and finds related poetry by meaning, theme, and style
 */
export const semanticPoetrySearch = async (queryText, options = {}) => {
  const { maxResults = 10, includeAnalysis = true } = options;
  
  try {
    initializeOpenAI();
    
    if (!openai) {
      console.warn('⚠️ OpenAI not configured, using fallback search');
      return {
        success: false,
        error: 'OpenAI API key not configured',
        fallback: true
      };
    }

    // Preprocess query to convert Roman names to Urdu
    const processedQuery = preprocessQuery(queryText);
    console.log(`🔍 AI Semantic Search: "${queryText}" -> "${processedQuery}"`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `آپ اردو شاعری کے ماہر ہیں۔ آپ کا کام صارف کی تلاش کو سمجھ کر متعلقہ شاعری تلاش کرنا ہے۔

You are an expert in Urdu poetry. Your task is to understand the user's search query and provide relevant poetry analysis.

OUTPUT FORMAT (Strict JSON Structure):
{
  "analyzed_query": {
    "original_query": "user's original query",
    "interpreted_meaning": "what the user is looking for",
    "themes": ["theme1", "theme2"],
    "emotions": ["emotion1", "emotion2"],
    "suggested_poets": ["poet1", "poet2"],
    "time_period": "classical/modern/contemporary",
    "poetry_forms": ["ghazal", "nazm", etc]
  },
  "search_keywords": {
    "urdu_keywords": ["keyword1", "keyword2"],
    "english_keywords": ["keyword1", "keyword2"],
    "semantic_tags": ["tag1", "tag2"]
  },
  "similar_poems": [
    {
      "title": "poem title in Urdu",
      "title_roman": "romanized title",
      "poet": "poet name in Urdu",
      "poet_roman": "poet name in Roman",
      "opening_verse": "first line of poem",
      "themes": ["theme1", "theme2"],
      "relevance_score": 0.95,
      "reason": "why this poem matches"
    }
  ],
  "recommendations": {
    "related_poets": ["poet1", "poet2"],
    "related_themes": ["theme1", "theme2"],
    "search_suggestions": ["suggestion1", "suggestion2"]
  }
}`
        },
        {
          role: "user",
          content: `تلاش کریں: ${processedQuery}

Find Urdu poetry related to: ${queryText}

Provide comprehensive analysis and at least 5 relevant poems if possible.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse GPT response:', parseError);
      return {
        success: false,
        error: 'Failed to parse AI response',
        raw_response: responseText
      };
    }

    return {
      success: true,
      query: queryText,
      processed_query: processedQuery,
      analysis: parsedResponse.analyzed_query,
      keywords: parsedResponse.search_keywords,
      similar_poems: parsedResponse.similar_poems || [],
      recommendations: parsedResponse.recommendations,
      search_method: 'ai_semantic_gpt4o',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ AI Semantic Search Error:', error.message);
    return {
      success: false,
      error: error.message,
      fallback: true
    };
  }
};

/**
 * Extract text from image using GPT-4o Vision with Python Tesseract fallback
 * Specialized for Urdu poetry images
 */
export const extractTextFromImage = async (base64Image, filename = "") => {
  // Helper function to call Python AI service for OCR
  const callPythonOCR = async () => {
    try {
      console.log('🐍 Trying Python Tesseract OCR fallback...');
      const pythonServiceUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5001';
      
      const response = await fetch(`${pythonServiceUrl}/analyze/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image,
          filename: filename || 'uploaded_image.jpg'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Python service returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        return {
          success: true,
          text: data.text,
          confidence: data.confidence || 0.7,
          method: 'python_tesseract',
          filename
        };
      }
      
      return null;
    } catch (err) {
      console.error('❌ Python OCR fallback failed:', err.message);
      return null;
    }
  };

  try {
    initializeOpenAI();
    
    // If OpenAI not configured, try Python service directly
    if (!openai) {
      console.log('⚠️ OpenAI not configured, trying Python OCR...');
      const pythonResult = await callPythonOCR();
      if (pythonResult) return pythonResult;
      
      return {
        success: false,
        error: 'OpenAI API key not configured and Python OCR unavailable'
      };
    }

    console.log(`📸 Extracting text from image: ${filename}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `اس تصویر سے اردو شاعری کا متن نکالیں۔ صرف شاعری کا متن واپس کریں، کوئی اضافی وضاحت نہیں۔

Extract the Urdu poetry text from this image. Return ONLY the poetry text, no additional explanation. If there's Hindi/Devanagari script, also extract it. Preserve line breaks and verse structure.

Format:
- Return the exact text as it appears
- Preserve original formatting
- If you can identify the poet, mention at the end in format: — شاعر: [name]`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const extractedText = response.choices[0].message.content.trim();
    
    return {
      success: true,
      text: extractedText,
      confidence: 0.9,
      method: 'gpt4o_vision',
      filename
    };

  } catch (error) {
    console.error('❌ OpenAI Image OCR Error:', error.message);
    
    // Check if it's a quota/billing error (429) or API key error (401)
    const isQuotaError = error.message.includes('429') || 
                         error.message.includes('quota') || 
                         error.message.includes('billing') ||
                         error.message.includes('rate limit');
    const isAuthError = error.message.includes('401') || error.message.includes('API key');
    
    if (isQuotaError || isAuthError) {
      console.log('⚠️ OpenAI API issue, falling back to Python Tesseract OCR...');
      const pythonResult = await callPythonOCR();
      if (pythonResult) return pythonResult;
    }
    
    return {
      success: false,
      error: error.message,
      text: '',
      suggestion: isQuotaError ? 
        'OpenAI quota exceeded. Please add billing to your OpenAI account or start the Python AI service.' :
        'OCR failed. Please ensure the Python AI service is running.'
    };
  }
};

/**
 * AI-Powered Qaafia (Rhyme) Finder
 * Uses GPT-4o with fallback to local dictionary and internal rhyme discovery
 */
export const findRhymes = async (inputWord, options = {}) => {
  const { limit = 20, useAI = true } = options;
  
  /**
   * Get rhyme pattern - match last 2-3 characters for proper Urdu rhyming
   */
  const getRhymePattern = (word) => {
    const cleanWord = word.trim();
    if (cleanWord.length < 2) return { pattern: cleanWord, length: 1 };
    
    // Try 3 characters first, then 2, then 1
    const last3 = cleanWord.slice(-3);
    const last2 = cleanWord.slice(-2);
    const last1 = cleanWord.slice(-1);
    
    // Check which pattern exists in dictionary (prefer longer patterns)
    if (QAAFIA_FALLBACKS[last3]) return { pattern: last3, length: 3 };
    if (QAAFIA_FALLBACKS[last2]) return { pattern: last2, length: 2 };
    if (QAAFIA_FALLBACKS[last1]) return { pattern: last1, length: 1 };
    
    // If no exact match, return last 2 chars as default pattern
    return { pattern: last2, length: 2 };
  };
  
  // Helper function for internal rhyme discovery (from urdu-ai-search)
  const discoverInternalRhymes = (text) => {
    // Clean and tokenize all words
    const cleanText = text.replace(/[^\u0600-\u06FF\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const allWords = cleanText.split(' ');
    const uniqueWords = [...new Set(allWords)]; // Remove duplicates (filters out Radeef repetition)
    
    // Group by Ending Letter
    const endingGroups = {};
    uniqueWords.forEach(word => {
      if (word.length < 2) return; // Skip single letters
      const lastChar = word.slice(-1);
      if (!endingGroups[lastChar]) endingGroups[lastChar] = [];
      endingGroups[lastChar].push(word);
    });
    
    // Find Best Cluster (Max unique words)
    let bestChar = null;
    let maxCount = 0;
    
    for (const char in endingGroups) {
      if (endingGroups[char].length > maxCount) {
        maxCount = endingGroups[char].length;
        bestChar = char;
      }
    }
    
    // Return Internal Matches if found (at least 2 words)
    if (bestChar && maxCount >= 2) {
      return {
        success: true,
        pattern: `اندرونی قافیہ (حرف "${bestChar}")`,
        explanation: 'ہم نے آپ کی شاعری سے یہ ہم قافیہ الفاظ نکالے ہیں۔',
        rhymes: endingGroups[bestChar].map(w => ({
          word: w,
          similarity: 0.85,
          source: 'internal_discovery'
        })),
        method: 'internal_discovery'
      };
    }
    
    return null;
  };
  
  try {
    // Get proper rhyme pattern (last 2-3 chars) for accurate matching
    const { pattern: rhymePattern, length: patternLength } = getRhymePattern(inputWord);
    let fallbackRhymes = QAAFIA_FALLBACKS[rhymePattern] || [];
    
    // If no match found with pattern, try last character as absolute fallback
    if (fallbackRhymes.length === 0) {
      const lastChar = inputWord.trim().slice(-1);
      fallbackRhymes = QAAFIA_FALLBACKS[lastChar] || [];
    }
    
    // Filter out the input word from results
    fallbackRhymes = fallbackRhymes.filter(w => w !== inputWord.trim());
    
    console.log(`🎵 Qaafia pattern for "${inputWord}": "${rhymePattern}" (${patternLength} chars) - Found ${fallbackRhymes.length} matches`);
    
    // Check if input is poetry (multiple words/lines) - use internal discovery
    const isPoetry = inputWord.includes('\n') || inputWord.split(/\s+/).length > 4;
    if (isPoetry) {
      const internalResult = discoverInternalRhymes(inputWord);
      if (internalResult && internalResult.rhymes.length >= 2) {
        return {
          success: true,
          word: inputWord.substring(0, 50) + (inputWord.length > 50 ? '...' : ''),
          ...internalResult,
          count: internalResult.rhymes.length
        };
      }
    }
    
    // If AI is disabled or not available, use fallback
    if (!useAI) {
      return {
        success: true,
        word: inputWord,
        rhyme_pattern: rhymePattern,
        rhymes: fallbackRhymes.slice(0, limit).map(word => ({
          word,
          similarity: 0.7,
          source: 'dictionary'
        })),
        count: Math.min(fallbackRhymes.length, limit),
        method: 'dictionary_fallback'
      };
    }

    initializeOpenAI();
    
    if (!openai) {
      // Use fallback
      return {
        success: true,
        word: inputWord,
        rhyme_pattern: rhymePattern,
        rhymes: fallbackRhymes.slice(0, limit).map(word => ({
          word,
          similarity: 0.7,
          source: 'dictionary'
        })),
        count: Math.min(fallbackRhymes.length, limit),
        method: 'dictionary_fallback'
      };
    }

    console.log(`🎵 Finding rhymes for: ${inputWord}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `آپ اردو شاعری میں قافیہ بندی کے ماہر ہیں۔

You are an expert in Urdu poetry rhyming (Qaafia). Given a word, find words that rhyme with it following traditional Urdu poetry rules.

OUTPUT FORMAT (JSON):
{
  "input_word": "the input word",
  "rhyme_pattern": "the rhyming pattern identified",
  "rhyming_words": [
    {
      "word": "rhyming word in Urdu",
      "romanized": "romanized version",
      "similarity": 0.95,
      "usage_example": "example usage in poetry"
    }
  ],
  "harf_ravi": "the rhyming letter"
}`
        },
        {
          role: "user",
          content: `اس لفظ کے قوافی تلاش کریں: ${inputWord}

Find at least ${limit} rhyming words (قوافی) for: ${inputWord}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content;
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      // Fallback to dictionary
      return {
        success: true,
        word: inputWord,
        rhymes: fallbackRhymes.slice(0, limit).map(word => ({
          word,
          similarity: 0.7,
          source: 'dictionary'
        })),
        count: Math.min(fallbackRhymes.length, limit),
        method: 'dictionary_fallback'
      };
    }

    // Combine AI results with fallback for more complete results
    const aiRhymes = (parsedResponse.rhyming_words || []).map(r => ({
      word: r.word,
      romanized: r.romanized,
      similarity: r.similarity || 0.9,
      usage_example: r.usage_example,
      source: 'ai'
    }));

    // Add unique fallback rhymes
    const aiWords = new Set(aiRhymes.map(r => r.word));
    const additionalRhymes = fallbackRhymes
      .filter(w => !aiWords.has(w))
      .slice(0, Math.max(0, limit - aiRhymes.length))
      .map(word => ({
        word,
        similarity: 0.7,
        source: 'dictionary'
      }));

    const allRhymes = [...aiRhymes, ...additionalRhymes].slice(0, limit);

    return {
      success: true,
      word: inputWord,
      rhyme_pattern: parsedResponse.rhyme_pattern,
      harf_ravi: parsedResponse.harf_ravi,
      rhymes: allRhymes,
      count: allRhymes.length,
      method: 'ai_gpt4o_enhanced'
    };

  } catch (error) {
    console.error('❌ Qaafia Search Error:', error.message);
    
    // Fallback to dictionary with proper pattern matching
    const { pattern: rhymePattern } = getRhymePattern(inputWord);
    let fallbackRhymes = QAAFIA_FALLBACKS[rhymePattern] || [];
    
    // Try last character if pattern not found
    if (fallbackRhymes.length === 0) {
      const lastChar = inputWord.trim().slice(-1);
      fallbackRhymes = QAAFIA_FALLBACKS[lastChar] || [];
    }
    
    // Filter out the input word
    fallbackRhymes = fallbackRhymes.filter(w => w !== inputWord.trim());
    
    return {
      success: true,
      word: inputWord,
      rhyme_pattern: rhymePattern,
      rhymes: fallbackRhymes.slice(0, limit).map(word => ({
        word,
        similarity: 0.7,
        source: 'dictionary'
      })),
      count: Math.min(fallbackRhymes.length, limit),
      method: 'dictionary_fallback',
      error: error.message
    };
  }
};

/**
 * AI-Powered Harf-e-Ravi (Rhyme Letter) Analysis
 * Analyzes poetry to identify the rhyming pattern
 */
export const analyzeHarfRavi = async (poetryText) => {
  // Basic fallback analysis function
  const performBasicAnalysis = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    
    if (lines.length === 0) {
      return {
        success: true,
        harf_ravi: '',
        analysis: {
          total_lines: 0,
          pattern_type: 'empty',
          method: 'fallback'
        },
        all_candidates: [],
        method: 'fallback'
      };
    }
    
    const lastChars = lines.map(l => {
      const words = l.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      // Remove punctuation from the end
      const cleanWord = lastWord ? lastWord.replace(/[۔،؛:!؟.,:;!?]/g, '') : '';
      return cleanWord ? cleanWord.slice(-1) : '';
    }).filter(c => c);
    
    const charCount = {};
    lastChars.forEach(c => {
      charCount[c] = (charCount[c] || 0) + 1;
    });
    
    const sortedChars = Object.entries(charCount)
      .sort((a, b) => b[1] - a[1]);
    
    const mostCommon = sortedChars[0];
    
    // Build all candidates list
    const allCandidates = sortedChars.map(([letter, freq]) => ({
      letter,
      frequency: freq,
      percentage: Math.round((freq / lines.length) * 100)
    }));
    
    // Get last words for analysis
    const lastWords = lines.map(l => {
      const words = l.trim().split(/\s+/);
      return words[words.length - 1]?.replace(/[۔،؛:!؟.,:;!?]/g, '') || '';
    }).filter(w => w);
    
    return {
      success: true,
      harf_ravi: mostCommon ? mostCommon[0] : '',
      analysis: {
        total_lines: lines.length,
        pattern_type: mostCommon && mostCommon[1] / lines.length > 0.5 ? 'consistent' : 'mixed',
        confidence: mostCommon ? Math.round((mostCommon[1] / lines.length) * 100) / 100 : 0,
        method: 'fallback'
      },
      all_candidates: allCandidates,
      last_words_analyzed: lastWords,
      method: 'fallback'
    };
  };

  try {
    initializeOpenAI();
    
    if (!openai) {
      console.log('⚠️ OpenAI not configured, using fallback analysis');
      return performBasicAnalysis(poetryText);
    }

    console.log(`📝 Analyzing Harf-e-Ravi for text`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `آپ اردو شاعری کے ماہر ہیں۔ حرف روی کا تجزیہ کریں۔

You are an expert in Urdu poetry. Analyze the given poetry to identify the Harf-e-Ravi (rhyming letter/pattern).

OUTPUT FORMAT (JSON):
{
  "harf_ravi": "the main rhyming letter",
  "radif": "the radif (repeated word) if present",
  "qaafia": "the qaafia pattern",
  "analysis": {
    "total_lines": number,
    "rhyme_scheme": "aa, ab, etc",
    "pattern_consistency": 0.95,
    "poetry_form": "ghazal/nazm/etc",
    "notable_features": ["feature1", "feature2"]
  },
  "line_analysis": [
    {
      "line": "the line",
      "last_word": "آخری لفظ",
      "rhyme_letter": "letter"
    }
  ]
}`
        },
        {
          role: "user",
          content: `اس شاعری کا حرف روی تجزیہ کریں:

${poetryText}

Analyze the Harf-e-Ravi (rhyming pattern) of this poetry.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500
    });

    const responseText = completion.choices[0].message.content;
    const parsedResponse = JSON.parse(responseText);

    return {
      success: true,
      harf_ravi: parsedResponse.harf_ravi,
      radif: parsedResponse.radif,
      qaafia: parsedResponse.qaafia,
      analysis: parsedResponse.analysis,
      line_analysis: parsedResponse.line_analysis,
      method: 'ai_gpt4o'
    };

  } catch (error) {
    console.error('❌ Harf-e-Ravi Analysis Error:', error.message);
    console.log('⚠️ Falling back to basic analysis');
    // Always return success with fallback analysis
    return performBasicAnalysis(poetryText);
  }
};

/**
 * Generate Text-to-Speech for Urdu poetry
 */
export const generateSpeech = async (text, options = {}) => {
  const { voice = 'onyx', speed = 1.0 } = options;
  
  try {
    initializeOpenAI();
    
    if (!openai) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    console.log(`🔊 Generating speech for text`);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
      speed: speed
    });

    // Generate unique filename
    const filename = `speech_${Date.now()}.mp3`;
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'tts');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return {
      success: true,
      filename,
      path: `/uploads/tts/${filename}`,
      duration_estimate: Math.ceil(text.length / 15), // rough estimate in seconds
      voice,
      method: 'openai_tts'
    };

  } catch (error) {
    console.error('❌ TTS Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Analyze poem tone, emotions, and literary devices
 */
export const analyzePoem = async (poemText, options = {}) => {
  try {
    initializeOpenAI();
    
    if (!openai) {
      return {
        success: true,
        analysis: {
          summary: "یہ شاعری جذبات اور خیالات کا خوبصورت اظہار ہے۔",
          themes: ["محبت", "زندگی"],
          emotions: ["خوشی", "غم"],
          literary_devices: ["استعارہ", "تشبیہ"],
          tone: "رومانوی",
          fallback: true
        }
      };
    }

    console.log(`📖 Analyzing poem`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `آپ اردو ادب کے ماہر نقاد ہیں۔

You are an expert Urdu literary critic. Analyze the given poem comprehensively.

OUTPUT FORMAT (JSON):
{
  "summary": "brief summary in Urdu",
  "summary_english": "brief summary in English",
  "themes": ["theme1", "theme2"],
  "emotions": ["emotion1", "emotion2"],
  "literary_devices": [
    {
      "device": "name of device",
      "example": "example from poem",
      "explanation": "brief explanation"
    }
  ],
  "tone": "overall tone",
  "imagery": ["image1", "image2"],
  "cultural_references": ["reference1", "reference2"],
  "poetic_form": "ghazal/nazm/etc",
  "language_style": "classical/modern/colloquial",
  "interpretation": "deeper meaning and interpretation"
}`
        },
        {
          role: "user",
          content: `اس شاعری کا تجزیہ کریں:

${poemText}

Provide a comprehensive literary analysis.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 2000
    });

    const parsedResponse = JSON.parse(completion.choices[0].message.content);

    return {
      success: true,
      analysis: parsedResponse,
      method: 'ai_gpt4o'
    };

  } catch (error) {
    console.error('❌ Poem Analysis Error:', error.message);
    return {
      success: true,
      analysis: {
        summary: "یہ شاعری جذبات اور خیالات کا خوبصورت اظہار ہے۔",
        themes: ["محبت", "زندگی"],
        emotions: ["خوشی", "غم"],
        literary_devices: ["استعارہ", "تشبیہ"],
        tone: "رومانوی",
        fallback: true,
        error: error.message
      }
    };
  }
};

/**
 * Check if AI service is available
 */
export const checkAIServiceStatus = () => {
  initializeOpenAI();
  return {
    available: !!openai,
    configured: !!process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    features: [
      'semantic_search',
      'image_ocr',
      'qaafia_finder',
      'harf_ravi_analysis',
      'poem_analysis',
      'text_to_speech'
    ]
  };
};

export default {
  semanticPoetrySearch,
  extractTextFromImage,
  findRhymes,
  analyzeHarfRavi,
  generateSpeech,
  analyzePoem,
  checkAIServiceStatus
};
