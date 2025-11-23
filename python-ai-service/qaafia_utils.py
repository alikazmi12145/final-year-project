# Qaafia Service Module
# Lightweight Urdu rhyming patterns - no dependencies needed

URDU_RHYME_PATTERNS = {
    'ل': ['دل', 'گل', 'مل', 'قل', 'بل', 'ہل', 'جل', 'سل', 'کل', 'نل', 'صل', 'فل', 'تل', 'چل'],
    'ب': ['شب', 'لب', 'حب', 'رب', 'نب', 'سب', 'تب', 'عب', 'طب', 'حجاب', 'خواب', 'جواب', 'عذاب', 'شراب', 'خراب'],
    'ت': ['محبت', 'عادت', 'قدرت', 'خصوصیت', 'شخصیت', 'اہمیت', 'حقیقت', 'طاقت', 'رحمت', 'قیامت', 'کرامت', 'غنیمت', 'نعمت', 'برکت', 'حرکت', 'شرکت', 'عزت'],
    'ی': ['زندگی', 'بندگی', 'سادگی', 'خوشی', 'خاموشی', 'فارسی', 'آدمی', 'شاعری', 'عجمی', 'ترکی', 'مولوی', 'درویشی'],
    'ا': ['دنیا', 'کیا', 'لیا', 'دیا', 'پیا', 'جیا', 'تھیا', 'گیا', 'ہوا', 'دوا', 'قوا', 'جوا', 'روا', 'سوا', 'دعا', 'خدا', 'رہا', 'وفا', 'صفا', 'جفا'],
    'م': ['غم', 'دم', 'کم', 'ہم', 'رم', 'جم', 'آرام', 'کلام', 'غلام', 'سلام', 'تمام', 'انجام', 'احترام', 'اکرام', 'اسلام'],
    'ر': ['یار', 'بار', 'دار', 'نار', 'وار', 'مار', 'کار', 'پیار', 'انتظار', 'اظہار', 'اقرار', 'اعتبار', 'افکار', 'بہار', 'منتظر', 'نظر', 'گذر', 'سفر', 'اثر', 'خبر', 'ہنر'],
    'د': ['امید', 'تائید', 'وعید', 'مزید', 'شدید', 'جدید', 'سعید', 'عید', 'صید', 'قید', 'بعید'],
    'ن': ['آسمان', 'جہان', 'انسان', 'مکان', 'شان', 'زبان', 'بیان', 'میدان', 'ارمان', 'پیمان', 'سامان', 'مہربان', 'ایمان', 'دکان', 'زمین', 'یقین', 'حسین', 'سکون', 'فنون', 'مضمون', 'جنون', 'قانون'],
    'ق': ['عشق', 'رشق', 'فشق', 'رزق', 'حق', 'شوق', 'ذوق', 'معشوق'],
    'ش': ['آتش', 'خاموش', 'نوش', 'هوش', 'خروش', 'جوش', 'فراموش', 'سرکش', 'آرش'],
}


def get_urdu_phonetic(word):
    """Extract phonetic pattern for Urdu qaafia matching"""
    vowels = 'اآعیوےےٰیٔۂ'
    silent_letters = 'ءہھۂ'
    
    w_clean = ''.join([c for c in word if c not in 'ًٌٍَُِّْٰٓٔ'])
    
    phonetic = ''
    for i in range(len(w_clean)-1, -1, -1):
        char = w_clean[i]
        if char in vowels or char in silent_letters:
            continue
        phonetic = char + phonetic
        if i+1 < len(w_clean) and w_clean[i+1] in vowels:
            phonetic = char + w_clean[i+1]
        break
    
    return phonetic if phonetic else w_clean[-1:]


def analyze_word_pattern(word):
    """Analyze Urdu word for qaafia pattern"""
    phonetic = get_urdu_phonetic(word)
    last_char = word[-1] if word else ''
    last_two = word[-2:] if len(word) >= 2 else word
    
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
