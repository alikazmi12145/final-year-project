#!/usr/bin/env python3
"""
Lightweight Qaafia (Urdu Rhyming) Service
Runs without heavy ML dependencies for fast startup
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enhanced Urdu rhyme dictionary organized by phonetic patterns
URDU_RHYME_PATTERNS = {
    # ┘ä family (ul/al/il sounds)
    '┘ä': ['╪»┘ä', '┌»┘ä', '┘à┘ä', '┘é┘ä', '╪¿┘ä', '█ü┘ä', '╪¼┘ä', '╪│┘ä', '┌⌐┘ä', '┘å┘ä', '╪╡┘ä', '┘ü┘ä', '╪¬┘ä', '┌å┘ä'],
    
    # ╪¿ family (ab/ib/ub sounds)
    '╪¿': ['╪┤╪¿', '┘ä╪¿', '╪¡╪¿', '╪▒╪¿', '┘å╪¿', '╪│╪¿', '╪¬╪¿', '╪╣╪¿', '╪╖╪¿', '╪¡╪¼╪º╪¿', '╪«┘ê╪º╪¿', '╪¼┘ê╪º╪¿', '╪╣╪░╪º╪¿', '╪┤╪▒╪º╪¿', '╪«╪▒╪º╪¿'],
    
    # ╪¬ family (at/it/ut sounds)
    '╪¬': ['┘à╪¡╪¿╪¬', '╪╣╪º╪»╪¬', '┘é╪»╪▒╪¬', '╪«╪╡┘ê╪╡█î╪¬', '╪┤╪«╪╡█î╪¬', '╪º█ü┘à█î╪¬', '╪¡┘é█î┘é╪¬', '╪╖╪º┘é╪¬', '╪▒╪¡┘à╪¬', '┘é█î╪º┘à╪¬', '┌⌐╪▒╪º┘à╪¬', '╪║┘å█î┘à╪¬', '┘å╪╣┘à╪¬', '╪¿╪▒┌⌐╪¬', '╪¡╪▒┌⌐╪¬', '╪┤╪▒┌⌐╪¬', '╪╣╪▓╪¬'],
    
    # █î family (i/ee sounds)
    '█î': ['╪▓┘å╪»┌»█î', '╪¿┘å╪»┌»█î', '╪│╪º╪»┌»█î', '╪«┘ê╪┤█î', '╪«╪º┘à┘ê╪┤█î', '┘ü╪º╪▒╪│█î', '╪ó╪»┘à█î', '╪┤╪º╪╣╪▒█î', '╪╣╪¼┘à█î', '╪¬╪▒┌⌐█î', '┘à┘ê┘ä┘ê█î', '╪»╪▒┘ê█î╪┤█î'],
    
    # ╪º (aa) family
    '╪º': ['╪»┘å█î╪º', '┌⌐█î╪º', '┘ä█î╪º', '╪»█î╪º', '┘╛█î╪º', '╪¼█î╪º', '╪¬┌╛█î╪º', '┌»█î╪º', '█ü┘ê╪º', '╪»┘ê╪º', '┘é┘ê╪º', '╪¼┘ê╪º', '╪▒┘ê╪º', '╪│┘ê╪º', '╪»╪╣╪º', '╪«╪»╪º', '╪▒█ü╪º', '┘ê┘ü╪º', '╪╡┘ü╪º', '╪¼┘ü╪º'],
    
    # ┘à family (am/um/im sounds)
    '┘à': ['╪║┘à', '╪»┘à', '┌⌐┘à', '█ü┘à', '╪▒┘à', '╪¼┘à', '╪ó╪▒╪º┘à', '┌⌐┘ä╪º┘à', '╪║┘ä╪º┘à', '╪│┘ä╪º┘à', '╪¬┘à╪º┘à', '╪º┘å╪¼╪º┘à', '╪º╪¡╪¬╪▒╪º┘à', '╪º┌⌐╪▒╪º┘à', '╪º╪│┘ä╪º┘à'],
    
    # ╪▒ family (ar/ur/ir sounds)
    '╪▒': ['█î╪º╪▒', '╪¿╪º╪▒', '╪»╪º╪▒', '┘å╪º╪▒', '┘ê╪º╪▒', '┘à╪º╪▒', '┌⌐╪º╪▒', '┘╛█î╪º╪▒', '╪º┘å╪¬╪╕╪º╪▒', '╪º╪╕█ü╪º╪▒', '╪º┘é╪▒╪º╪▒', '╪º╪╣╪¬╪¿╪º╪▒', '╪º┘ü┌⌐╪º╪▒', '╪¿█ü╪º╪▒', '┘à┘å╪¬╪╕╪▒', '┘å╪╕╪▒', '┌»╪░╪▒', '╪│┘ü╪▒', '╪º╪½╪▒', '╪«╪¿╪▒', '█ü┘å╪▒'],
    
    # ╪» family (ad/ud/id sounds)
    '╪»': ['╪º┘à█î╪»', '╪¬╪º╪ª█î╪»', '┘ê╪╣█î╪»', '┘à╪▓█î╪»', '╪┤╪»█î╪»', '╪¼╪»█î╪»', '╪│╪╣█î╪»', '╪╣█î╪»', '╪╡█î╪»', '┘é█î╪»', '╪¿╪╣█î╪»'],
    
    # ┘å family (an/un/in sounds)
    '┘å': ['╪ó╪│┘à╪º┘å', '╪¼█ü╪º┘å', '╪º┘å╪│╪º┘å', '┘à┌⌐╪º┘å', '╪┤╪º┘å', '╪▓╪¿╪º┘å', '╪¿█î╪º┘å', '┘à█î╪»╪º┘å', '╪º╪▒┘à╪º┘å', '┘╛█î┘à╪º┘å', '╪│╪º┘à╪º┘å', '┘à█ü╪▒╪¿╪º┘å', '╪º█î┘à╪º┘å', '╪»┌⌐╪º┘å', '╪▓┘à█î┘å', '█î┘é█î┘å', '╪¡╪│█î┘å', '╪│┌⌐┘ê┘å', '┘ü┘å┘ê┘å', '┘à╪╢┘à┘ê┘å', '╪¼┘å┘ê┘å', '┘é╪º┘å┘ê┘å'],
    
    # ┘é family (q/iq sounds)
    '┘é': ['╪╣╪┤┘é', '╪▒╪┤┘é', '┘ü╪┤┘é', '╪▒╪▓┘é', '╪¡┘é', '╪┤┘ê┘é', '╪░┘ê┘é', '┘à╪╣╪┤┘ê┘é'],
    
    # ╪┤ family (sh/ash sounds)
    '╪┤': ['╪ó╪¬╪┤', '╪«╪º┘à┘ê╪┤', '┘å┘ê╪┤', '┘ç┘ê╪┤', '╪«╪▒┘ê╪┤', '╪¼┘ê╪┤', '┘ü╪▒╪º┘à┘ê╪┤', '╪│╪▒┌⌐╪┤', '╪ó╪▒╪┤'],
    
    # ╪º┘ä (aal) family
    '╪º┘ä': ['╪¼┘à╪º┘ä', '┌⌐┘à╪º┘ä', '╪«█î╪º┘ä', '┘à╪º┘ä', '╪¡╪º┘ä', '╪│╪º┘ä', '┘å╪º┘ä', '╪▓┘ê╪º┘ä', '┘ê╪╡╪º┘ä', '╪╡╪º┘ä'],
    
    # ╪º█ü (aah) family
    '╪º█ü': ['┘å┌»╪º█ü', '╪▒╪º█ü', '┌å╪º█ü', '╪«┘ê╪º█ü', '┘à╪º█ü', '┌»╪º█ü', '╪ó█ü', '╪¬╪¿╪º█ü', '┘╛┘å╪º█ü', '█ü┘à╪▒╪º█ü'],
    
    # ┘ê╪▒ (oor) family
    '┘ê╪▒': ['┘à┘å╪╕┘ê╪▒', '╪║╪▒┘ê╪▒', '┘å┘ê╪▒', '╪╕█ü┘ê╪▒', '╪¡╪╢┘ê╪▒', '┘à╪┤█ü┘ê╪▒', '┘à╪¼╪¿┘ê╪▒', '╪»┘ê╪▒', '╪╖┘ê╪▒', '╪╢╪▒┘ê╪▒'],
    
    # ┘ê┘ä (ool) family
    '┘ê┘ä': ['┘╛┌╛┘ê┘ä', '┌»┘ê┘ä', '┘à┘ê┘ä', '╪▒┘ê┘ä', '╪¿┘ê┘ä', '┘à┘é╪¿┘ê┘ä', '┘à╪╣┘é┘ê┘ä', '╪º╪╡┘ê┘ä'],
    
    # █î█▓ (ani/aani) family
    '█î█▓': ['┘╛╪º┘å█î', '┘å╪º┘å█î', '╪¿╪º┘å█î', '╪┤╪º┘å█î', '╪¼╪º┘å█î', '╪▒╪º┘å█î', '█ü╪º┘å█î', '╪▒┘ê╪¡╪º┘å█î', '╪¼╪│┘à╪º┘å█î'],
    
    # ╪º╪▒ (aar) family
    '╪º╪▒': ['█î╪º╪▒', '╪º┘å╪¬╪╕╪º╪▒', '╪º╪╕█ü╪º╪▒', '╪º┘ü┌⌐╪º╪▒', '╪º╪╣╪¬╪¿╪º╪▒', '╪º╪╡╪▒╪º╪▒', '╪º╪«╪¬█î╪º╪▒', '╪º┘å┌⌐╪º╪▒', '╪¿█î┘à╪º╪▒', '╪¬█î╪º╪▒'],
    
    # ╪º┘à (aam) family
    '╪º┘à': ['┘å╪º┘à', '┌⌐╪º┘à', '╪¼╪º┘à', '┘╛█î╪º┘à', '╪¬┘à╪º┘à', '╪«╪º┘à', '╪┤╪º┘à', '┘à┘é╪º┘à', '╪ó╪▒╪º┘à'],
    
    # ╪º┘å (aan) family
    '╪º┘å': ['╪¼╪º┘å', '┘à█ü╪▒╪¿╪º┘å', '╪º╪¡╪│╪º┘å', '╪╣┘å┘ê╪º┘å', '┘à█î╪▓╪¿╪º┘å', '┘╛╪º╪│╪¿╪º┘å', '╪»█î┘ê╪º┘å', '╪«╪º┘å╪»╪º┘å'],
    
    # █Æ (ending with ye/e)
    '█Æ': ['█ü█Æ', '╪¬┌╛█Æ', '┘ä█Æ', '╪»█Æ', '╪¼╪º╪ª█Æ', '┌⌐┌╛╪º╪ª█Æ', '╪ó╪ª█Æ', '┘╛╪º╪ª█Æ', '┘å╪ª█Æ', '┌⌐╪ª█Æ'],
    
    # ┌║ (nasal ending)
    '┌║': ['┘à█î┌║', '█ü█î┌║', '┌⌐█ü█î┌║', '█î█ü█î┌║', '┘ê█ü█î┌║', '┘å█ü█î┌║', '╪¼█ü█î┌║', '┌⌐█î┘ê┌║'],
    
    # ┘ê┌║ (oon ending - plural)
    '┘ê┌║': ['╪ó┘å┌⌐┌╛┘ê┌║', '╪¿╪º╪¬┘ê┌║', '╪▒╪º╪¬┘ê┌║', '█ü╪º╪¬┌╛┘ê┌║', '┘ä┘à╪¡┘ê┌║', '╪«┘ê╪º╪¿┘ê┌║', '█î╪º╪»┘ê┌║', '╪»┘å┘ê┌║'],
    
    # ┘å█▓ (sun/shun/chin sounds)
    '┘å█▓': ['╪¡╪│┘å', '╪▒┘ê╪┤┘å', '┌»┘ä╪┤┘å', '┌å┘à┘å', '╪»╪┤┘à┘å', '┘à┘ê┘à┘å', '┘ê╪╖┘å', '╪¿╪»┘å'],
    
    # ┌⌐ family (ak/ik sounds)
    '┌⌐': ['┘à┘ä┌⌐', '┘ü┘ä┌⌐', '█ü┘ä╪º┌⌐', '╪«╪º┌⌐', '┘╛╪º┌⌐', '┘å╪º┌⌐', '╪º┘ü┘ä╪º┌⌐'],
    
    # ╪▓ family (az/uz/iz sounds)
    '╪▓': ['╪▒╪º╪▓', '┘å╪º╪▓', '┘å█î╪º╪▓', '╪º┘å╪»╪º╪▓', '╪ó┘ê╪º╪▓', '╪ó╪║╪º╪▓', '╪º╪╣╪▓╪º╪▓', '┘à┘à╪¬╪º╪▓', '╪│╪▒┘ü╪▒╪º╪▓'],
    
    # ╪│ family (as/us/is sounds)
    '╪│': ['╪¿╪│', '╪º╪│', '┘╛╪│', '┘å┘ü╪│', '╪¡┘ê╪º╪│', '┘ä╪¿╪º╪│', '┘é█î╪º╪│', '┘à┘é╪»╪│'],
}


def get_urdu_phonetic(word):
    """Extract phonetic pattern for Urdu qaafia matching"""
    vowels = '╪º╪ó╪╣█î┘ê█Æ█Æ┘░█î┘ö█é'
    silent_letters = '╪í█ü┌╛█é'
    
    # Remove diacritics
    w_clean = ''.join([c for c in word if c not in '┘ï┘î┘ì┘Ä┘Å┘É┘æ┘Æ┘░┘ô┘ö'])
    
    # Get last consonant-vowel pattern (this is the qaafia)
    phonetic = ''
    for i in range(len(w_clean)-1, -1, -1):
        char = w_clean[i]
        if char in vowels or char in silent_letters:
            continue
        phonetic = char + phonetic
        # Get vowel sound after this consonant
        if i+1 < len(w_clean) and w_clean[i+1] in vowels:
            phonetic = char + w_clean[i+1]
        break
    
    return phonetic if phonetic else w_clean[-1:]


def analyze_word_pattern(word):
    """Analyze Urdu word for qaafia pattern"""
    phonetic = get_urdu_phonetic(word)
    last_char = word[-1] if word else ''
    last_two = word[-2:] if len(word) >= 2 else word
    
    # Remove silent/vowel endings to find real qaafia consonant
    real_qaafia = word
    for i in range(len(word)-1, -1, -1):
        if word[i] not in '╪º╪ó█î┘ê█Æ┌║█é█ü╪í┘Ä┘Å┘É┘æ┘Æ┘░':
            real_qaafia = word[:i+1]
            break
    
    return {
        'phonetic': phonetic,
        'last_char': last_char,
        'last_two': last_two,
        'real_qaafia': real_qaafia,
        'length': len(word)
    }


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'qaafia-service'}), 200


@app.route('/ai/qaafia-search', methods=['POST'])
def qaafia_search():
    """AI-powered Qaafia (rhyming) search"""
    try:
        data = request.json
        word = data.get('word', '').strip()
        limit = data.get('limit', 20)
        min_similarity = data.get('min_similarity', 0.5)
        
        if not word:
            return jsonify({
                'success': False,
                'error': 'Word parameter is required'
            }), 400
        
        logger.info(f"≡ƒöì Qaafia search for: '{word}'")
        
        pattern = analyze_word_pattern(word)
        rhymes_found = []
        seen_words = set()
        
        # Strategy 1: Phonetic/Qaafia matching (proper Urdu rules)
        for key, words in URDU_RHYME_PATTERNS.items():
            for rhyme_word in words:
                if rhyme_word != word and rhyme_word not in seen_words:
                    rhyme_pattern = analyze_word_pattern(rhyme_word)
                    score = 0.0
                    
                    # Rule 1: Exact phonetic match (TRUE qaafia) - highest score
                    if rhyme_pattern['phonetic'] == pattern['phonetic'] and pattern['phonetic']:
                        score = 0.95
                    # Rule 2: Same ending consonant sound
                    elif rhyme_pattern['phonetic'] and pattern['phonetic'] and \
                         rhyme_pattern['phonetic'][0] == pattern['phonetic'][0]:
                        score = 0.80
                    # Rule 3: Same last 2 letters
                    elif rhyme_pattern['last_two'] == pattern['last_two']:
                        score = 0.75
                    # Rule 4: Same last consonant (ignoring vowels)
                    elif rhyme_pattern['real_qaafia'][-1] == pattern['real_qaafia'][-1]:
                        score = 0.65
                    
                    # Bonus: Similar length (meter consideration)
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
                    
                    # Relaxed phonetic matching
                    score = 0.0
                    if candidate_pattern['phonetic'] and pattern['phonetic']:
                        # Check if phonetic patterns share same consonant
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
        
        # Sort by similarity score (best matches first)
        rhymes_found.sort(key=lambda x: x['similarity_score'], reverse=True)
        rhymes_found = rhymes_found[:limit]
        
        # Pattern analysis for educational purposes
        pattern_analysis = {
            'phonetic_qaafia': pattern['phonetic'],
            'word_length': pattern['length'],
            'rhyme_type': 'qaafia',
            'matching_strategy': 'phonetic_consonant_vowel'
        }
        
        logger.info(f"Γ£à Found {len(rhymes_found)} rhymes for '{word}' (phonetic: {pattern['phonetic']})")
        
        return jsonify({
            'success': True,
            'word': word,
            'rhymes': rhymes_found,
            'count': len(rhymes_found),
            'pattern_analysis': pattern_analysis
        }), 200
        
    except Exception as e:
        logger.error(f"Γ¥î Qaafia search error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/ai/harf-ravi-extract', methods=['POST'])
def harf_ravi_extract():
    """Extract Harf-e-Ravi from Urdu text"""
    try:
        data = request.json
        text = data.get('text', '').strip()
        extract_all = data.get('extract_all', True)
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Text parameter is required'
            }), 400
        
        logger.info(f"≡ƒöì Harf-Ravi extraction from: '{text[:50]}...'")
        
        # Extract words
        words = text.split()
        
        # Count letter frequencies
        letter_freq = {}
        for word in words:
            phonetic = get_urdu_phonetic(word)
            if phonetic:
                letter = phonetic[0]  # Get the consonant
                letter_freq[letter] = letter_freq.get(letter, 0) + 1
        
        # Find most common letter
        if not letter_freq:
            return jsonify({
                'success': False,
                'error': 'No valid letters found in text'
            }), 400
        
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
        
        logger.info(f"Γ£à Extracted Harf-Ravi: {harf_ravi} (frequency: {frequency})")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Γ¥î Harf-Ravi extraction error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("≡ƒÜÇ Qaafia AI Service Starting...")
    print("="*60)
    print("≡ƒôì Endpoint: http://localhost:5001")
    print("≡ƒöº Routes:")
    print("   - GET  /health                  (Health check)")
    print("   - POST /ai/qaafia-search        (Rhyme search)")
    print("   - POST /ai/harf-ravi-extract    (Letter extraction)")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False)
