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
    # ل family (ul/al/il sounds)
    'ل': ['دل', 'گل', 'مل', 'قل', 'بل', 'ہل', 'جل', 'سل', 'کل', 'نل', 'صل', 'فل', 'تل', 'چل'],
    
    # ب family (ab/ib/ub sounds)
    'ب': ['شب', 'لب', 'حب', 'رب', 'نب', 'سب', 'تب', 'عب', 'طب', 'حجاب', 'خواب', 'جواب', 'عذاب', 'شراب', 'خراب'],
    
    # ت family (at/it/ut sounds)
    'ت': ['محبت', 'عادت', 'قدرت', 'خصوصیت', 'شخصیت', 'اہمیت', 'حقیقت', 'طاقت', 'رحمت', 'قیامت', 'کرامت', 'غنیمت', 'نعمت', 'برکت', 'حرکت', 'شرکت', 'عزت'],
    
    # ی family (i/ee sounds)
    'ی': ['زندگی', 'بندگی', 'سادگی', 'خوشی', 'خاموشی', 'فارسی', 'آدمی', 'شاعری', 'عجمی', 'ترکی', 'مولوی', 'درویشی'],
    
    # ا (aa) family
    'ا': ['دنیا', 'کیا', 'لیا', 'دیا', 'پیا', 'جیا', 'تھیا', 'گیا', 'ہوا', 'دوا', 'قوا', 'جوا', 'روا', 'سوا', 'دعا', 'خدا', 'رہا', 'وفا', 'صفا', 'جفا'],
    
    # م family (am/um/im sounds)
    'م': ['غم', 'دم', 'کم', 'ہم', 'رم', 'جم', 'آرام', 'کلام', 'غلام', 'سلام', 'تمام', 'انجام', 'احترام', 'اکرام', 'اسلام'],
    
    # ر family (ar/ur/ir sounds)
    'ر': ['یار', 'بار', 'دار', 'نار', 'وار', 'مار', 'کار', 'پیار', 'انتظار', 'اظہار', 'اقرار', 'اعتبار', 'افکار', 'بہار', 'منتظر', 'نظر', 'گذر', 'سفر', 'اثر', 'خبر', 'ہنر'],
    
    # د family (ad/ud/id sounds)
    'د': ['امید', 'تائید', 'وعید', 'مزید', 'شدید', 'جدید', 'سعید', 'عید', 'صید', 'قید', 'بعید'],
    
    # ن family (an/un/in sounds)
    'ن': ['آسمان', 'جہان', 'انسان', 'مکان', 'شان', 'زبان', 'بیان', 'میدان', 'ارمان', 'پیمان', 'سامان', 'مہربان', 'ایمان', 'دکان', 'زمین', 'یقین', 'حسین', 'سکون', 'فنون', 'مضمون', 'جنون', 'قانون'],
    
    # ق family (q/iq sounds)
    'ق': ['عشق', 'رشق', 'فشق', 'رزق', 'حق', 'شوق', 'ذوق', 'معشوق'],
    
    # ش family (sh/ash sounds)
    'ش': ['آتش', 'خاموش', 'نوش', 'هوش', 'خروش', 'جوش', 'فراموش', 'سرکش', 'آرش'],
    
    # ال (aal) family
    'ال': ['جمال', 'کمال', 'خیال', 'مال', 'حال', 'سال', 'نال', 'زوال', 'وصال', 'صال'],
    
    # اہ (aah) family
    'اہ': ['نگاہ', 'راہ', 'چاہ', 'خواہ', 'ماہ', 'گاہ', 'آہ', 'تباہ', 'پناہ', 'ہمراہ'],
    
    # ور (oor) family
    'ور': ['منظور', 'غرور', 'نور', 'ظہور', 'حضور', 'مشہور', 'مجبور', 'دور', 'طور', 'ضرور'],
    
    # ول (ool) family
    'ول': ['پھول', 'گول', 'مول', 'رول', 'بول', 'مقبول', 'معقول', 'اصول'],
    
    # ی۲ (ani/aani) family
    'ی۲': ['پانی', 'نانی', 'بانی', 'شانی', 'جانی', 'رانی', 'ہانی', 'روحانی', 'جسمانی'],
    
    # ار (aar) family
    'ار': ['یار', 'انتظار', 'اظہار', 'افکار', 'اعتبار', 'اصرار', 'اختیار', 'انکار', 'بیمار', 'تیار'],
    
    # ام (aam) family
    'ام': ['نام', 'کام', 'جام', 'پیام', 'تمام', 'خام', 'شام', 'مقام', 'آرام'],
    
    # ان (aan) family
    'ان': ['جان', 'مہربان', 'احسان', 'عنوان', 'میزبان', 'پاسبان', 'دیوان', 'خاندان'],
    
    # ے (ending with ye/e)
    'ے': ['ہے', 'تھے', 'لے', 'دے', 'جائے', 'کھائے', 'آئے', 'پائے', 'نئے', 'کئے'],
    
    # ں (nasal ending)
    'ں': ['میں', 'ہیں', 'کہیں', 'یہیں', 'وہیں', 'نہیں', 'جہیں', 'کیوں'],
    
    # وں (oon ending - plural)
    'وں': ['آنکھوں', 'باتوں', 'راتوں', 'ہاتھوں', 'لمحوں', 'خوابوں', 'یادوں', 'دنوں'],
    
    # ن۲ (sun/shun/chin sounds)
    'ن۲': ['حسن', 'روشن', 'گلشن', 'چمن', 'دشمن', 'مومن', 'وطن', 'بدن'],
    
    # ک family (ak/ik sounds)
    'ک': ['ملک', 'فلک', 'ہلاک', 'خاک', 'پاک', 'ناک', 'افلاک'],
    
    # ز family (az/uz/iz sounds)
    'ز': ['راز', 'ناز', 'نیاز', 'انداز', 'آواز', 'آغاز', 'اعزاز', 'ممتاز', 'سرفراز'],
    
    # س family (as/us/is sounds)
    'س': ['بس', 'اس', 'پس', 'نفس', 'حواس', 'لباس', 'قیاس', 'مقدس'],
}


def get_urdu_phonetic(word):
    """Extract phonetic pattern for Urdu qaafia matching"""
    vowels = 'اآعیوےےٰیٔۂ'
    silent_letters = 'ءہھۂ'
    
    # Remove diacritics
    w_clean = ''.join([c for c in word if c not in 'ًٌٍَُِّْٰٓٔ'])
    
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
        if word[i] not in 'اآیوےںۂہءَُِّْٰ':
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
        
        logger.info(f"🔍 Qaafia search for: '{word}'")
        
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
        
        logger.info(f"✅ Found {len(rhymes_found)} rhymes for '{word}' (phonetic: {pattern['phonetic']})")
        
        return jsonify({
            'success': True,
            'word': word,
            'rhymes': rhymes_found,
            'count': len(rhymes_found),
            'pattern_analysis': pattern_analysis
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Qaafia search error: {str(e)}")
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
        
        logger.info(f"🔍 Harf-Ravi extraction from: '{text[:50]}...'")
        
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
        
        logger.info(f"✅ Extracted Harf-Ravi: {harf_ravi} (frequency: {frequency})")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ Harf-Ravi extraction error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Qaafia AI Service Starting...")
    print("="*60)
    print("📍 Endpoint: http://localhost:5001")
    print("🔧 Routes:")
    print("   - GET  /health                  (Health check)")
    print("   - POST /ai/qaafia-search        (Rhyme search)")
    print("   - POST /ai/harf-ravi-extract    (Letter extraction)")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False)
