"""
Flask API Microservice for AI Multimodal Search
Exposes endpoints for semantic search, image OCR, voice transcription
Uses trained ML models for Urdu poetry search
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
from pydub import AudioSegment
import os
import tempfile
import json
from werkzeug.utils import secure_filename
import logging

# Import custom modules - with error handling for optional features
semantic_engine = None
ocr_engine = None
rekhta_service = None
text_matcher = None

try:
    from semantic_search import get_semantic_engine
    from image_ocr import get_ocr_engine
    from rekhta_service import get_rekhta_service
    from text_matcher import get_text_matcher
    ML_FEATURES_AVAILABLE = True
except ImportError as e:
    ML_FEATURES_AVAILABLE = False
    print(f"⚠️  ML features not available: {e}")

# Import lightweight qaafia utilities
from qaafia_utils import URDU_RHYME_PATTERNS, analyze_word_pattern, get_urdu_phonetic

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Express backend

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3', 'webm', 'ogg', 'm4a'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Initialize AI engines (optional)
if ML_FEATURES_AVAILABLE:
    logger.info("🚀 Initializing AI engines...")
    try:
        semantic_engine = get_semantic_engine()
        ocr_engine = get_ocr_engine()
        rekhta_service = get_rekhta_service()
        text_matcher = get_text_matcher()
        logger.info("✅ AI engines initialized")
    except Exception as e:
        logger.warning(f"⚠️  Could not initialize ML engines: {e}")
        ML_FEATURES_AVAILABLE = False
else:
    logger.info("⚡ Running in lightweight mode (Qaafia + Harf-Ravi only)")


def allowed_file(filename, extensions):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in extensions


def convert_audio_to_wav(audio_path):
    """Convert audio file to WAV format for speech recognition"""
    try:
        audio = AudioSegment.from_file(audio_path)
        wav_path = audio_path.rsplit('.', 1)[0] + '_converted.wav'
        audio.export(wav_path, format='wav')
        return wav_path
    except Exception as e:
        logger.error(f"Audio conversion error: {str(e)}")
        return None


def transcribe_audio(audio_path, language='ur-PK'):
    """
    Transcribe audio using Google Speech Recognition
    
    Args:
        audio_path: Path to audio file
        language: Language code (ur-PK for Urdu, en-US for English, hi-IN for Hindi)
    
    Returns:
        dict: {
            'success': bool,
            'text': str,
            'confidence': float,
            'language': str,
            'error': str (if failed)
        }
    """
    recognizer = sr.Recognizer()
    
    # Convert to WAV if needed
    if not audio_path.endswith('.wav'):
        wav_path = convert_audio_to_wav(audio_path)
        if not wav_path:
            return {
                'success': False,
                'error': 'Failed to convert audio format'
            }
        audio_path = wav_path
    
    try:
        with sr.AudioFile(audio_path) as source:
            # Adjust for ambient noise
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio_data = recognizer.record(source)
            
            # Try primary language
            try:
                text = recognizer.recognize_google(audio_data, language=language)
                return {
                    'success': True,
                    'text': text,
                    'confidence': 0.85,  # Google API doesn't provide confidence
                    'language': language
                }
            except sr.UnknownValueError:
                # Try fallback languages
                fallback_languages = ['en-US', 'hi-IN', 'ur-PK']
                for lang in fallback_languages:
                    if lang != language:
                        try:
                            text = recognizer.recognize_google(audio_data, language=lang)
                            return {
                                'success': True,
                                'text': text,
                                'confidence': 0.7,
                                'language': lang
                            }
                        except sr.UnknownValueError:
                            continue
                
                return {
                    'success': False,
                    'error': 'Could not understand audio in any supported language'
                }
            except sr.RequestError as e:
                return {
                    'success': False,
                    'error': f'Speech recognition service error: {str(e)}'
                }
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
    finally:
        # Cleanup temporary files
        if audio_path.endswith('_converted.wav'):
            try:
                os.remove(audio_path)
            except:
                pass


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Multimodal Search Python Service',
        'version': '1.0.0'
    })


@app.route('/analyze/audio', methods=['POST'])
def analyze_audio():
    """
    Endpoint: POST /analyze/audio
    
    Process audio file and return transcription
    
    Request:
        - file: audio file (multipart/form-data)
        - language: language code (optional, default: ur-PK)
    
    Response:
        {
            "success": true,
            "text": "transcribed text",
            "confidence": 0.85,
            "language": "ur-PK"
        }
    """
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty filename'
            }), 400
        
        if not allowed_file(file.filename, ALLOWED_AUDIO_EXTENSIONS):
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_AUDIO_EXTENSIONS)}'
            }), 400
        
        # Get language parameter
        language = request.form.get('language', 'ur-PK')
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"Processing audio file: {filename} (language: {language})")
        
        # Transcribe audio
        result = transcribe_audio(filepath, language)
        
        # Cleanup
        try:
            os.remove(filepath)
        except:
            pass
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Audio analysis error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/analyze/image', methods=['POST'])
def analyze_image():
    """
    Endpoint: POST /analyze/image
    
    Extract text from image using OCR
    
    Request:
        - file: image file (multipart/form-data)
        OR
        - url: image URL (JSON)
    
    Response:
        {
            "success": true,
            "text": "extracted text",
            "confidence": 0.85,
            "language": "urdu"
        }
    """
    try:
        # Handle file upload
        if 'file' in request.files:
            file = request.files['file']
            
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': 'Empty filename'
                }), 400
            
            if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
                return jsonify({
                    'success': False,
                    'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'
                }), 400
            
            # Save file temporarily
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            logger.info(f"Processing image file: {filename}")
            
            # Extract text using OCR
            result = ocr_engine.extract_text(filepath)
            
            # Cleanup
            try:
                os.remove(filepath)
            except:
                pass
            
            if result['success']:
                return jsonify(result), 200
            else:
                return jsonify(result), 400
        
        # Handle URL
        elif request.is_json and 'url' in request.json:
            url = request.json['url']
            logger.info(f"Processing image URL: {url}")
            
            result = ocr_engine.extract_from_url(url)
            
            if result['success']:
                return jsonify(result), 200
            else:
                return jsonify(result), 400
        
        else:
            return jsonify({
                'success': False,
                'error': 'No image file or URL provided'
            }), 400
            
    except Exception as e:
        logger.error(f"Image analysis error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/analyze/image-with-rekhta', methods=['POST'])
def analyze_image_with_rekhta():
    """
    Endpoint: POST /analyze/image-with-rekhta
    
    Enhanced image OCR + Rekhta integration
    Extract text from image and find matching poems on Rekhta
    
    Request:
        - file: image file (multipart/form-data)
        - auto_detect_language: bool (optional, default=True)
        - max_rekhta_results: int (optional, default=5)
    
    Response:
        {
            "success": true,
            "ocr": {
                "text": "extracted text",
                "confidence": 0.85,
                "language": "urdu",
                "detected_language": "urd"
            },
            "rekhta": {
                "success": true,
                "matches": [
                    {
                        "title": "poem title",
                        "poet": "poet name",
                        "verses": "poem text",
                        "url": "rekhta url",
                        "category": "Ghazal",
                        "match_score": 85.5
                    }
                ],
                "best_match": {...},
                "total_matches": 5
            }
        }
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty filename'
            }), 400
        
        if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'
            }), 400
        
        # Get parameters
        auto_detect = request.form.get('auto_detect_language', 'true').lower() == 'true'
        max_results = int(request.form.get('max_rekhta_results', 5))
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"📸 Processing image with Rekhta integration: {filename}")
        
        try:
            # Step 1: Detect language if enabled
            detected_lang = None
            if auto_detect:
                logger.info("🔍 Auto-detecting language...")
                detected_lang = ocr_engine.detect_language_from_image(filepath)
                logger.info(f"✅ Detected language: {detected_lang}")
            
            # Step 2: Extract text with OCR
            logger.info("📝 Extracting text with OCR...")
            languages = [detected_lang] if detected_lang and detected_lang != 'mixed' else ['urd', 'eng']
            ocr_result = ocr_engine.extract_text(filepath, languages=languages)
            
            if not ocr_result.get('success'):
                return jsonify({
                    'success': False,
                    'error': 'OCR extraction failed',
                    'details': ocr_result.get('error')
                }), 400
            
            extracted_text = ocr_result.get('text', '')
            
            if not extracted_text or len(extracted_text.strip()) < 3:
                return jsonify({
                    'success': False,
                    'error': 'No meaningful text extracted from image',
                    'ocr': ocr_result
                }), 400
            
            logger.info(f"✅ Extracted text: {extracted_text[:100]}...")
            
            # Step 3: Search Rekhta
            logger.info("🔍 Searching Rekhta...")
            rekhta_result = rekhta_service.search_text(extracted_text, max_results=max_results)
            
            # Step 4: Rank matches using fuzzy matching
            if rekhta_result.get('success') and rekhta_result.get('matches'):
                logger.info("📊 Ranking matches by similarity...")
                ranked_matches = text_matcher.rank_matches(
                    extracted_text,
                    rekhta_result['matches']
                )
                
                # Find best match
                best_match, best_score = text_matcher.find_best_match(
                    extracted_text,
                    ranked_matches,
                    min_score=50.0
                )
                
                rekhta_result['matches'] = ranked_matches
                rekhta_result['best_match'] = best_match
                rekhta_result['best_match_score'] = best_score
                
                logger.info(f"✅ Found {len(ranked_matches)} ranked matches")
                if best_match:
                    logger.info(f"🏆 Best match: {best_match.get('title')} by {best_match.get('poet')} ({best_score:.1f}%)")
            
            # Prepare response
            response = {
                'success': True,
                'ocr': {
                    'text': extracted_text,
                    'confidence': ocr_result.get('confidence', 0.0),
                    'language': ocr_result.get('language', 'unknown'),
                    'detected_language': detected_lang,
                    'quality': ocr_result.get('quality', 'unknown')
                },
                'rekhta': rekhta_result
            }
            
            return jsonify(response), 200
            
        finally:
            # Cleanup
            try:
                os.remove(filepath)
            except:
                pass
    
    except Exception as e:
        logger.error(f"❌ Image + Rekhta analysis error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/search/semantic', methods=['POST'])
def semantic_search():
    """
    Endpoint: POST /search/semantic
    
    Perform semantic search using ML model
    
    Request (JSON):
        {
            "query": "search text",
            "top_k": 20,
            "threshold": 0.3
        }
    
    Response:
        {
            "success": true,
            "results": [
                {
                    "_id": "...",
                    "title": "...",
                    "content": "...",
                    "author": "...",
                    "similarity_score": 0.85,
                    "search_method": "semantic"
                }
            ],
            "count": 10
        }
    """
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type must be application/json'
            }), 400
        
        data = request.json
        query = data.get('query', '').strip()
        top_k = data.get('top_k', 20)
        threshold = data.get('threshold', 0.3)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query parameter is required'
            }), 400
        
        logger.info(f"🔍 Semantic search: '{query}' (top_k={top_k}, threshold={threshold})")
        
        # Perform semantic search
        results = semantic_engine.search(query, top_k=top_k, threshold=threshold)
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results),
            'search_method': 'semantic_ml'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Semantic search error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/index/create', methods=['POST'])
def create_index():
    """
    Endpoint: POST /index/create
    
    Create semantic index from poems data
    
    Request (JSON):
        {
            "poems": [
                {
                    "_id": "...",
                    "title": "...",
                    "content": "...",
                    "author": "...",
                    ...
                }
            ]
        }
    
    Response:
        {
            "success": true,
            "message": "Index created with N poems"
        }
    """
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type must be application/json'
            }), 400
        
        data = request.json
        poems = data.get('poems', [])
        
        if not poems:
            return jsonify({
                'success': False,
                'error': 'No poems provided'
            }), 400
        
        logger.info(f"📚 Creating semantic index for {len(poems)} poems...")
        
        # Create index
        success = semantic_engine.create_index(poems)
        
        if success:
            # Save index to disk
            semantic_engine.save_index()
            
            return jsonify({
                'success': True,
                'message': f'Semantic index created with {len(poems)} poems',
                'poem_count': len(poems)
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create index'
            }), 500
            
    except Exception as e:
        logger.error(f"❌ Index creation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/index/update', methods=['POST'])
def update_index():
    """
    Endpoint: POST /index/update
    
    Update semantic index with new poems (incremental)
    
    Request (JSON):
        {
            "poems": [new poems to add]
        }
    
    Response:
        {
            "success": true,
            "message": "Index updated"
        }
    """
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type must be application/json'
            }), 400
        
        data = request.json
        new_poems = data.get('poems', [])
        
        if not new_poems:
            return jsonify({
                'success': True,
                'message': 'No new poems to add'
            }), 200
        
        logger.info(f"📚 Updating semantic index with {len(new_poems)} new poems...")
        
        # Update index
        success = semantic_engine.update_index(new_poems)
        
        if success:
            # Save updated index
            semantic_engine.save_index()
            
            return jsonify({
                'success': True,
                'message': f'Index updated with {len(new_poems)} new poems',
                'total_poems': len(semantic_engine.poems_data)
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update index'
            }), 500
            
    except Exception as e:
        logger.error(f"❌ Index update error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/ai/qaafia-search', methods=['POST'])
def ai_qaafia_search():
    """AI-powered Urdu rhyming word (qaafia) search"""
    try:
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Content-Type must be application/json'}), 400
        
        data = request.json
        word = data.get('word', '').strip()
        limit = data.get('limit', 20)
        min_similarity = data.get('min_similarity', 0.5)
        
        if not word:
            return jsonify({'success': False, 'error': 'Word parameter is required'}), 400
        
        logger.info(f"🔍 AI Qaafia search for: '{word}'")
        
        pattern = analyze_word_pattern(word)
        rhymes_found = []
        seen_words = set()
        
        # Strategy 1: Phonetic/Qaafia matching
        for key, words in URDU_RHYME_PATTERNS.items():
            for rhyme_word in words:
                if rhyme_word != word and rhyme_word not in seen_words:
                    rhyme_pattern = analyze_word_pattern(rhyme_word)
                    score = 0.0
                    
                    if rhyme_pattern['phonetic'] == pattern['phonetic'] and pattern['phonetic']:
                        score = 0.95
                    elif rhyme_pattern['phonetic'] and pattern['phonetic'] and \
                         rhyme_pattern['phonetic'][0] == pattern['phonetic'][0]:
                        score = 0.80
                    elif rhyme_pattern['last_two'] == pattern['last_two']:
                        score = 0.75
                    elif rhyme_pattern['real_qaafia'][-1] == pattern['real_qaafia'][-1]:
                        score = 0.65
                    
                    if abs(rhyme_pattern['length'] - pattern['length']) <= 1:
                        score += 0.05
                    
                    if score >= min_similarity:
                        rhymes_found.append({
                            'word': rhyme_word,
                            'similarity_score': round(score, 2),
                            'phonetic_pattern': rhyme_pattern['phonetic'],
                            'qaafia_type': 'exact' if score >= 0.9 else 'similar'
                        })
                        seen_words.add(rhyme_word)
        
        # Strategy 2: Extended search if needed
        if len(rhymes_found) < limit // 2:
            all_words = [w for words in URDU_RHYME_PATTERNS.values() for w in words]
            for candidate in all_words:
                if candidate != word and candidate not in seen_words:
                    candidate_pattern = analyze_word_pattern(candidate)
                    score = 0.0
                    if candidate_pattern['phonetic'] and pattern['phonetic']:
                        if candidate_pattern['phonetic'][0] == pattern['phonetic'][0]:
                            score = 0.60
                    elif candidate[-1] == word[-1]:
                        score = 0.50
                    
                    if score >= min_similarity and len(rhymes_found) < limit:
                        rhymes_found.append({
                            'word': candidate,
                            'similarity_score': round(score, 2),
                            'phonetic_pattern': candidate_pattern['phonetic'],
                            'qaafia_type': 'loose'
                        })
                        seen_words.add(candidate)
        
        rhymes_found.sort(key=lambda x: x['similarity_score'], reverse=True)
        rhymes_found = rhymes_found[:limit]
        
        pattern_analysis = {
            'phonetic_qaafia': pattern['phonetic'],
            'word_length': pattern['length'],
            'rhyme_type': 'qaafia',
            'matching_strategy': 'phonetic_consonant_vowel'
        }
        
        logger.info(f"✅ Found {len(rhymes_found)} rhymes for '{word}'")
        
        return jsonify({
            'success': True,
            'word': word,
            'rhymes': rhymes_found,
            'count': len(rhymes_found),
            'pattern_analysis': pattern_analysis
        }), 200
        
    except Exception as e:
        logger.error(f"❌ AI Qaafia search error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/ai/harf-ravi-extract', methods=['POST'])
def ai_harf_ravi_extract():
    """AI-powered Harf-e-Ravi extraction"""
    try:
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Content-Type must be application/json'}), 400
        
        data = request.json
        text = data.get('text', '').strip()
        extract_all = data.get('extract_all', True)
        
        if not text:
            return jsonify({'success': False, 'error': 'Text parameter is required'}), 400
        
        logger.info(f"🔍 AI Harf-e-Ravi extraction from: '{text[:50]}...'")
        
        # Import qaafia logic
        from qaafia_utils import get_urdu_phonetic
        
        words = text.split()
        letter_freq = {}
        
        for word in words:
            phonetic = get_urdu_phonetic(word)
            if phonetic:
                letter = phonetic[0]
                letter_freq[letter] = letter_freq.get(letter, 0) + 1
        
        if not letter_freq:
            return jsonify({'success': False, 'error': 'No valid letters found in text'}), 400
        
        sorted_letters = sorted(letter_freq.items(), key=lambda x: x[1], reverse=True)
        harf_ravi = sorted_letters[0][0]
        frequency = sorted_letters[0][1]
        
        all_candidates = [{'letter': letter, 'frequency': freq} for letter, freq in sorted_letters]
        
        result = {
            'success': True,
            'harf_ravi': harf_ravi,
            'analysis': {
                'confidence': round(frequency / len(words), 2),
                'frequency': frequency,
                'pattern': get_urdu_phonetic(harf_ravi),
                'total_words': len(words)
            },
            'all_candidates': all_candidates if extract_all else all_candidates[:5]
        }
        
        logger.info(f"✅ Extracted Harf-Ravi: {harf_ravi}")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ AI Harf-e-Ravi extraction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/search/fuzzy', methods=['POST'])
def fuzzy_search():
    """
    Endpoint: POST /search/fuzzy
    
    Note: Fuzzy search is handled by Fuse.js on the Express backend
    This endpoint is kept for compatibility
    
    Response:
        {
            "success": false,
            "message": "Use Fuse.js on Express backend for fuzzy search"
        }
    """
    return jsonify({
        'success': False,
        'message': 'Fuzzy search is handled by Fuse.js on the Express backend. Use the /search or /multimodal/search endpoints instead.'
    }), 501


@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'error': 'File too large. Maximum size is 16MB.'
    }), 413


@app.errorhandler(500)
def internal_error(e):
    """Handle internal server error"""
    logger.error(f"Internal error: {str(e)}")
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    
    print("=" * 70)
    print("🐍 AI Multimodal Search Python Service with ML Models")
    print("=" * 70)
    print(f"🚀 Starting Flask server on http://localhost:{port}")
    print("🤖 ML Models Loaded:")
    print("   ✓ Semantic Search: paraphrase-multilingual-mpnet-base-v2")
    print("   ✓ OCR Engine: Tesseract (Urdu/English/Hindi)")
    print("   ✓ Voice Recognition: Google Speech API")
    print("   ✓ Rekhta Integration: Poetry matching & search")
    print("   ✓ Fuzzy Matching: RapidFuzz for text comparison")
    print("   ✓ Qaafia Service: Urdu rhyming patterns (lightweight)")
    print("   ✓ Harf-e-Ravi: Core rhyme extraction")
    print("")
    print("📡 Available endpoints:")
    print("   - GET  /health")
    print("   - POST /analyze/audio               (Voice transcription)")
    print("   - POST /analyze/image               (Image OCR)")
    print("   - POST /analyze/image-with-rekhta   (OCR + Rekhta poetry matching)")
    print("   - POST /search/semantic             (ML-powered semantic search)")
    print("   - POST /index/create                (Create semantic index)")
    print("   - POST /index/update                (Update semantic index)")
    print("   - POST /ai/qaafia-search            (🎯 AI Rhyming word search)")
    print("   - POST /ai/harf-ravi-extract        (🎯 AI Harf-e-Ravi extraction)")
    print("=" * 70)
    
    # Try to load existing index
    try:
        if semantic_engine.load_index():
            print(f"✅ Loaded existing semantic index: {semantic_engine.index.ntotal} poems")
        else:
            print("⚠️  No existing index found. Create one via /index/create")
    except Exception as e:
        print(f"⚠️  Could not load index: {str(e)}")
    
    print("=" * 70)
    print("✨ All Python AI services ready! Use 'python app.py' to run.")
    print("=" * 70)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )
