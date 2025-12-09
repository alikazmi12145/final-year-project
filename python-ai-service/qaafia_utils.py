# Qaafia Service Module
# Advanced Urdu rhyming patterns with AI-powered matching

URDU_RHYME_PATTERNS = {
    'ل': ['دل', 'گل', 'مل', 'قل', 'بل', 'ہل', 'جل', 'سل', 'کل', 'نل', 'صل', 'فل', 'تل', 'چل', 'ذل', 'ظل', 'عل'],
    'ب': ['شب', 'لب', 'حب', 'رب', 'نب', 'سب', 'تب', 'عب', 'طب', 'حجاب', 'خواب', 'جواب', 'عذاب', 'شراب', 'خراب', 'کتاب', 'باب', 'حساب', 'نقاب'],
    'ت': ['محبت', 'عادت', 'قدرت', 'خصوصیت', 'شخصیت', 'اہمیت', 'حقیقت', 'طاقت', 'رحمت', 'قیامت', 'کرامت', 'غنیمت', 'نعمت', 'برکت', 'حرکت', 'شرکت', 'عزت', 'رات', 'بات', 'ساتھ', 'ہاتھ'],
    'ی': ['زندگی', 'بندگی', 'سادگی', 'خوشی', 'خاموشی', 'فارسی', 'آدمی', 'شاعری', 'عجمی', 'ترکی', 'مولوی', 'درویشی', 'ہنسی', 'روشنی', 'تنہائی', 'رہائی'],
    'ا': ['دنیا', 'کیا', 'لیا', 'دیا', 'پیا', 'جیا', 'تھیا', 'گیا', 'ہوا', 'دوا', 'قوا', 'جوا', 'روا', 'سوا', 'دعا', 'خدا', 'رہا', 'وفا', 'صفا', 'جفا', 'آیا', 'سنایا', 'بنایا'],
    'م': ['غم', 'دم', 'کم', 'ہم', 'رم', 'جم', 'آرام', 'کلام', 'غلام', 'سلام', 'تمام', 'انجام', 'احترام', 'اکرام', 'اسلام', 'مقام', 'نام', 'پیام', 'شام'],
    'ر': ['یار', 'بار', 'دار', 'نار', 'وار', 'مار', 'کار', 'پیار', 'انتظار', 'اظہار', 'اقرار', 'اعتبار', 'افکار', 'بہار', 'منتظر', 'نظر', 'گذر', 'سفر', 'اثر', 'خبر', 'ہنر', 'شکار', 'دیدار', 'قرار'],
    'د': ['امید', 'تائید', 'وعید', 'مزید', 'شدید', 'جدید', 'سعید', 'عید', 'صید', 'قید', 'بعید', 'فرید', 'حمید', 'مجید'],
    'ن': ['آسمان', 'جہان', 'انسان', 'مکان', 'شان', 'زبان', 'بیان', 'میدان', 'ارمان', 'پیمان', 'سامان', 'مہربان', 'ایمان', 'دکان', 'زمین', 'یقین', 'حسین', 'سکون', 'فنون', 'مضمون', 'جنون', 'قانون', 'دوران', 'عنوان'],
    'ق': ['عشق', 'رشق', 'فشق', 'رزق', 'حق', 'شوق', 'ذوق', 'معشوق', 'صدیق', 'رفیق', 'توفیق'],
    'ش': ['آتش', 'خاموش', 'نوش', 'هوش', 'خروش', 'جوش', 'فراموش', 'سرکش', 'آرش', 'درویش', 'خواہش', 'بخش'],
    'ے': ['ہے', 'تھے', 'کیسے', 'جیسے', 'وہیں', 'یہیں', 'کہیں', 'جہیں'],
    'و': ['وہ', 'جو', 'کو', 'سو', 'دو', 'رو', 'کہو', 'سنو'],
    'ں': ['میں', 'ہیں', 'تھیں', 'مجھے', 'تجھے', 'گویں'],
}


def get_urdu_phonetic(word):
    """Extract advanced phonetic pattern for Urdu qaafia matching"""
    # Urdu vowels and diacritics
    vowels = 'اآعیوےےٰیٔۂٔۂ'
    silent_letters = 'ءہھ'
    diacritics = 'ًٌٍَُِّْٰٓٔ'
    
    # Remove diacritics but keep track of structure
    w_clean = ''.join([c for c in word if c not in diacritics])
    
    if not w_clean:
        return ''
    
    # Extract rhyme pattern from end (last 1-3 characters)
    phonetic_parts = []
    consonant_count = 0
    
    for i in range(len(w_clean)-1, -1, -1):
        char = w_clean[i]
        
        # Skip pure silent letters at the end
        if i == len(w_clean)-1 and char in silent_letters:
            continue
            
        # Add character to pattern
        phonetic_parts.insert(0, char)
        
        # Count consonants (non-vowels)
        if char not in vowels and char not in silent_letters:
            consonant_count += 1
            
        # Get last consonant + vowel pattern (CVC pattern)
        if consonant_count >= 1:
            # Include up to 3 chars for better matching
            if len(phonetic_parts) >= 3:
                break
    
    phonetic = ''.join(phonetic_parts[-3:])  # Last 3 chars max
    return phonetic if phonetic else w_clean[-1:]


def analyze_word_pattern(word):
    """Analyze Urdu word for comprehensive qaafia pattern"""
    if not word:
        return {
            'phonetic': '',
            'last_char': '',
            'last_two': '',
            'last_three': '',
            'real_qaafia': '',
            'length': 0,
            'consonants': [],
            'vowel_pattern': ''
        }
    
    # Get phonetic pattern
    phonetic = get_urdu_phonetic(word)
    
    # Get ending patterns
    last_char = word[-1] if word else ''
    last_two = word[-2:] if len(word) >= 2 else word
    last_three = word[-3:] if len(word) >= 3 else word
    
    # Find real qaafia (ignore silent endings)
    vowels = 'اآیوےںۂہءَُِّْٰٓٔ'
    real_qaafia = word
    for i in range(len(word)-1, -1, -1):
        if word[i] not in vowels:
            real_qaafia = word[:i+1]
            break
    
    # Extract consonants for matching
    consonants = [c for c in word if c not in vowels]
    
    # Get vowel pattern (for advanced matching)
    vowel_chars = [c for c in word if c in 'اآیوےےٰ']
    vowel_pattern = ''.join(vowel_chars[-2:]) if vowel_chars else ''
    
    return {
        'phonetic': phonetic,
        'last_char': last_char,
        'last_two': last_two,
        'last_three': last_three,
        'real_qaafia': real_qaafia,
        'length': len(word),
        'consonants': consonants,
        'vowel_pattern': vowel_pattern
    }


def calculate_qaafia_similarity(word1, word2):
    """Calculate weighted similarity score between two Urdu words for qaafia matching"""
    pattern1 = analyze_word_pattern(word1)
    pattern2 = analyze_word_pattern(word2)
    
    score = 0.0
    
    # Exact phonetic match (highest weight)
    if pattern1['phonetic'] and pattern2['phonetic']:
        if pattern1['phonetic'] == pattern2['phonetic']:
            score += 0.50  # 50% weight
        elif pattern1['phonetic'][-2:] == pattern2['phonetic'][-2:]:
            score += 0.35  # 35% weight for last 2 chars
        elif pattern1['phonetic'][-1] == pattern2['phonetic'][-1]:
            score += 0.20  # 20% weight for last char only
    
    # Last 3 characters match
    if pattern1['last_three'] == pattern2['last_three']:
        score += 0.25  # 25% weight
    elif pattern1['last_two'] == pattern2['last_two']:
        score += 0.15  # 15% weight
    elif pattern1['last_char'] == pattern2['last_char']:
        score += 0.08  # 8% weight
    
    # Real qaafia ending match
    if pattern1['real_qaafia'] and pattern2['real_qaafia']:
        if pattern1['real_qaafia'][-2:] == pattern2['real_qaafia'][-2:]:
            score += 0.10  # 10% weight
    
    # Vowel pattern similarity
    if pattern1['vowel_pattern'] and pattern2['vowel_pattern']:
        if pattern1['vowel_pattern'] == pattern2['vowel_pattern']:
            score += 0.05  # 5% weight
    
    # Length similarity bonus (prefer similar length words)
    length_diff = abs(pattern1['length'] - pattern2['length'])
    if length_diff == 0:
        score += 0.05  # 5% weight
    elif length_diff == 1:
        score += 0.02  # 2% weight
    
    # Consonant ending similarity
    if pattern1['consonants'] and pattern2['consonants']:
        if pattern1['consonants'][-1] == pattern2['consonants'][-1]:
            score += 0.03  # 3% weight
    
    return min(score, 1.0)  # Cap at 1.0
