/**
 * Poetry Search Service - Integrated from urdu-ai-search module
 * Handles: Smart Search (DB -> AI -> DB Save), Qaafia, Harf-e-Ravi
 */

import * as urduAiService from './urduAiService.js';
import poetryDb from './poetryDatabase.js';

/**
 * Smart Search: DB First -> AI Fallback -> Save to DB
 * @param {string} queryText - Search query
 * @returns {Promise<Object>} - Search results
 */
export async function smartSearch(queryText) {
    console.log(`[SmartSearch] Query: "${queryText}"`);

    // Pre-process: Map Roman Urdu/English Names to Urdu Script
    const romanToUrduMap = {
        "mirza ghalib": "مرزا غالب",
        "ghalib": "مرزا غالب",
        "allama iqbal": "علامہ اقبال",
        "iqbal": "علامہ اقبال",
        "faiz ahmed faiz": "فیض احمد فیض",
        "faiz": "فیض احمد فیض",
        "parveen shakir": "پروین شاکر",
        "ahmed faraz": "احمد فراز",
        "faraz": "احمد فراز",
        "jaun elia": "جون ایلیا",
        "jaun alia": "جون ایلیا",
        "john elia": "جون ایلیا",
        "mir taqi mir": "میر تقی میر",
        "mir": "میر تقی میر"
    };

    let processedQuery = queryText;
    const lowerQuery = queryText.toLowerCase().trim();
    if (romanToUrduMap[lowerQuery]) {
        console.log(`[SmartSearch] Mapped '${queryText}' -> '${romanToUrduMap[lowerQuery]}'`);
        processedQuery = romanToUrduMap[lowerQuery];
    }

    // 1. Try Local DB First
    try {
        let dbResults = await poetryDb.searchPoems(processedQuery);
        console.log(`[SmartSearch] DB Results: ${dbResults ? dbResults.length : 0}`);

        if (dbResults && dbResults.length > 0) {
            console.log('[SmartSearch] ✅ Found in Database');

            // Deduplication Logic
            const seenContent = new Set();
            let uniqueResults = dbResults.filter(r => {
                const key = r.content ? r.content.substring(0, 50) : r.title;
                if (seenContent.has(key)) return false;
                seenContent.add(key);
                return true;
            });

            // If we found a poet, expand with their catalog
            const isPoetSearch = uniqueResults.some(r => 
                r.poet_name && r.poet_name.toLowerCase().includes(queryText.toLowerCase())
            );

            if (!isPoetSearch && uniqueResults.length > 0 && uniqueResults[0].poet_name) {
                const primaryPoet = uniqueResults[0].poet_name;
                console.log(`[SmartSearch] Expanding context for poet: ${primaryPoet}`);

                try {
                    const allPoetPoems = await poetryDb.getPoemsByPoet(primaryPoet);
                    
                    const seenCatalog = new Set();
                    uniqueResults.forEach(m => seenCatalog.add(m.content ? m.content.substring(0, 50) : m.title));
                    
                    const restOfCatalog = allPoetPoems.filter(r => {
                        const key = r.content ? r.content.substring(0, 50) : r.title;
                        if (seenCatalog.has(key)) return false;
                        seenCatalog.add(key);
                        return true;
                    });

                    uniqueResults = [...uniqueResults, ...restOfCatalog.slice(0, 10)];
                } catch (ex) {
                    console.warn("[SmartSearch] Context expansion failed:", ex.message);
                }
            }

            return { 
                success: true,
                source: 'database', 
                results: uniqueResults,
                count: uniqueResults.length
            };
        }

        // Retry with modified query (remove first word if long)
        const words = queryText.trim().split(/\s+/);
        if (words.length > 3) {
            const retryQuery = words.slice(1).join(' ');
            console.log(`[SmartSearch] Retrying with: "${retryQuery}"`);
            
            dbResults = await poetryDb.searchPoems(retryQuery);
            if (dbResults && dbResults.length > 0) {
                const seenContent = new Set();
                dbResults = dbResults.filter(r => {
                    const key = r.content ? r.content.substring(0, 50) : r.title;
                    if (seenContent.has(key)) return false;
                    seenContent.add(key);
                    return true;
                });

                return { 
                    success: true,
                    source: 'database', 
                    results: dbResults,
                    count: dbResults.length
                };
            }
        }

    } catch (err) {
        console.error("[SmartSearch] DB Read Error:", err.message);
    }

    // 2. Fallback to AI
    console.log('[SmartSearch] 🤖 Not found locally. Calling AI...');
    try {
        const aiResult = await urduAiService.generatePoetrySearch(queryText);

        if (aiResult.success && aiResult.results && aiResult.results.length > 0) {
            console.log(`[SmartSearch] AI returned ${aiResult.results.length} results`);

            // Save to DB for future searches (Incremental Learning)
            aiResult.results.forEach(poem => {
                if (poem.title && poem.content) {
                    poetryDb.savePoem(poem.title, poem.content, poem.poet_name || 'Unknown')
                        .catch(e => console.error("[SmartSearch] Save Error:", e.message));
                }
            });

            return {
                success: true,
                source: 'openai',
                results: aiResult.results,
                analyzed_poem: aiResult.analyzed_poem,
                similar_poems: aiResult.similar_poems,
                count: aiResult.results.length
            };
        }

        return {
            success: false,
            source: 'error',
            results: [],
            message: aiResult.error || "No results found"
        };

    } catch (error) {
        console.error("[SmartSearch] AI Failed:", error.message);
        return { 
            success: false,
            source: 'error', 
            results: [], 
            message: "Search failed. Please try again." 
        };
    }
}

/**
 * Get Qaafia (Rhymes) for a word or poetry
 * @param {string} word - Input word or poetry
 * @returns {Promise<Object>} - Qaafia analysis
 */
export async function getQaafia(word) {
    if (!word) {
        return { 
            success: false, 
            qafia_words: [],
            error: 'No input provided'
        };
    }

    const ending = word.slice(-1);
    const rhymes = new Set();

    // Try to find rhymes from local DB first
    try {
        const allPoems = await poetryDb.getAllPoems();
        allPoems.forEach(row => {
            if (!row.content) return;
            const lines = row.content.split('\n');
            lines.forEach(line => {
                const words = line.split(/\s+/);
                words.forEach(w => {
                    const cleanW = w.replace(/[.,!؟"'`]/g, '').trim();
                    if (!cleanW) return;
                    if (cleanW.endsWith(ending) && cleanW !== word && cleanW.length > 1) {
                        rhymes.add(cleanW);
                    }
                });
            });
        });
    } catch (err) {
        console.error("DB Error in Qaafia:", err.message);
    }

    // If low results, use AI
    let aiPattern = null;
    let aiExplanation = null;

    if (rhymes.size < 5) {
        console.log("[Qaafia] Low local results, asking AI...");
        const aiData = await urduAiService.findRhymes(word);

        if (aiData.success && aiData.qafia_words && Array.isArray(aiData.qafia_words)) {
            aiData.qafia_words.forEach(r => rhymes.add(r));
            aiPattern = aiData.pattern;
            aiExplanation = aiData.explanation;
        }
    }

    return {
        success: true,
        qafia_words: Array.from(rhymes).slice(0, 30),
        pattern: aiPattern || `حرف "${ending}" کی آواز`,
        explanation: aiExplanation || "یہ الفاظ ایک ہی آواز پر ختم ہوتے ہیں۔",
        count: rhymes.size
    };
}

/**
 * Get Harf-e-Ravi analysis for a verse
 * @param {string} verse - Poetry verse
 * @returns {Promise<Object>} - Harf-e-Ravi analysis
 */
export async function getHarfRavi(verse) {
    if (!verse) {
        return { 
            success: false,
            harf: null,
            error: 'No verse provided'
        };
    }

    try {
        const analysis = await urduAiService.analyzeHarfRavi(verse);
        return analysis;
    } catch (err) {
        console.error("Error in Harf-e-Ravi:", err.message);
        return { 
            success: false,
            harf: null,
            error: err.message
        };
    }
}

/**
 * Get all poets from database
 * @returns {Promise<Array>} - List of poets
 */
export async function getPoets() {
    try {
        return await poetryDb.getAllPoets();
    } catch (err) {
        console.error("Error getting poets:", err.message);
        return [];
    }
}

/**
 * Process image for OCR and search
 * @param {string} base64Image - Base64 image
 * @param {string} filename - Filename
 * @returns {Promise<Object>} - OCR result with search
 */
export async function processImageSearch(base64Image, filename) {
    try {
        // Extract text from image
        const ocrResult = await urduAiService.extractTextFromImage(base64Image, filename);
        
        if (!ocrResult.success || !ocrResult.text) {
            return {
                success: false,
                error: ocrResult.error || 'OCR failed to extract text'
            };
        }

        console.log(`[ImageSearch] Extracted: "${ocrResult.text.substring(0, 50)}..."`);

        // Search for the extracted text
        const searchResult = await smartSearch(ocrResult.text);

        return {
            success: true,
            extracted_text: ocrResult.text,
            ocr_confidence: ocrResult.confidence,
            ocr_method: ocrResult.method,
            results: searchResult.results,
            source: searchResult.source
        };

    } catch (error) {
        console.error("[ImageSearch] Error:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process voice for transcription and search
 * @param {string} filePath - Audio file path
 * @returns {Promise<Object>} - Transcription result with search
 */
export async function processVoiceSearch(filePath) {
    try {
        // Transcribe audio
        const transcribedText = await urduAiService.transcribeAudio(filePath);
        
        if (!transcribedText) {
            return {
                success: false,
                error: 'Voice transcription failed or returned empty'
            };
        }

        console.log(`[VoiceSearch] Transcribed: "${transcribedText}"`);

        // Search for the transcribed text
        const searchResult = await smartSearch(transcribedText);

        return {
            success: true,
            transcribed_text: transcribedText,
            results: searchResult.results,
            source: searchResult.source
        };

    } catch (error) {
        console.error("[VoiceSearch] Error:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

export default {
    smartSearch,
    getQaafia,
    getHarfRavi,
    getPoets,
    processImageSearch,
    processVoiceSearch
};
