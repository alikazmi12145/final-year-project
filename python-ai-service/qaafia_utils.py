# Qaafia Service Module
# Advanced Urdu rhyming patterns with AI-powered matching

URDU_RHYME_PATTERNS = {
    '┘ä': ['╪»┘ä', '┌»┘ä', '┘à┘ä', '┘é┘ä', '╪¿┘ä', '█ü┘ä', '╪¼┘ä', '╪│┘ä', '┌⌐┘ä', '┘å┘ä', '╪╡┘ä', '┘ü┘ä', '╪¬┘ä', '┌å┘ä', '╪░┘ä', '╪╕┘ä', '╪╣┘ä'],
    '╪¿': ['╪┤╪¿', '┘ä╪¿', '╪¡╪¿', '╪▒╪¿', '┘å╪¿', '╪│╪¿', '╪¬╪¿', '╪╣╪¿', '╪╖╪¿', '╪¡╪¼╪º╪¿', '╪«┘ê╪º╪¿', '╪¼┘ê╪º╪¿', '╪╣╪░╪º╪¿', '╪┤╪▒╪º╪¿', '╪«╪▒╪º╪¿', '┌⌐╪¬╪º╪¿', '╪¿╪º╪¿', '╪¡╪│╪º╪¿', '┘å┘é╪º╪¿'],
    '╪¬': ['┘à╪¡╪¿╪¬', '╪╣╪º╪»╪¬', '┘é╪»╪▒╪¬', '╪«╪╡┘ê╪╡█î╪¬', '╪┤╪«╪╡█î╪¬', '╪º█ü┘à█î╪¬', '╪¡┘é█î┘é╪¬', '╪╖╪º┘é╪¬', '╪▒╪¡┘à╪¬', '┘é█î╪º┘à╪¬', '┌⌐╪▒╪º┘à╪¬', '╪║┘å█î┘à╪¬', '┘å╪╣┘à╪¬', '╪¿╪▒┌⌐╪¬', '╪¡╪▒┌⌐╪¬', '╪┤╪▒┌⌐╪¬', '╪╣╪▓╪¬', '╪▒╪º╪¬', '╪¿╪º╪¬', '╪│╪º╪¬┌╛', '█ü╪º╪¬┌╛'],
    '█î': ['╪▓┘å╪»┌»█î', '╪¿┘å╪»┌»█î', '╪│╪º╪»┌»█î', '╪«┘ê╪┤█î', '╪«╪º┘à┘ê╪┤█î', '┘ü╪º╪▒╪│█î', '╪ó╪»┘à█î', '╪┤╪º╪╣╪▒█î', '╪╣╪¼┘à█î', '╪¬╪▒┌⌐█î', '┘à┘ê┘ä┘ê█î', '╪»╪▒┘ê█î╪┤█î', '█ü┘å╪│█î', '╪▒┘ê╪┤┘å█î', '╪¬┘å█ü╪º╪ª█î', '╪▒█ü╪º╪ª█î'],
    '╪º': ['╪»┘å█î╪º', '┌⌐█î╪º', '┘ä█î╪º', '╪»█î╪º', '┘╛█î╪º', '╪¼█î╪º', '╪¬┌╛█î╪º', '┌»█î╪º', '█ü┘ê╪º', '╪»┘ê╪º', '┘é┘ê╪º', '╪¼┘ê╪º', '╪▒┘ê╪º', '╪│┘ê╪º', '╪»╪╣╪º', '╪«╪»╪º', '╪▒█ü╪º', '┘ê┘ü╪º', '╪╡┘ü╪º', '╪¼┘ü╪º', '╪ó█î╪º', '╪│┘å╪º█î╪º', '╪¿┘å╪º█î╪º'],
    '┘à': ['╪║┘à', '╪»┘à', '┌⌐┘à', '█ü┘à', '╪▒┘à', '╪¼┘à', '╪ó╪▒╪º┘à', '┌⌐┘ä╪º┘à', '╪║┘ä╪º┘à', '╪│┘ä╪º┘à', '╪¬┘à╪º┘à', '╪º┘å╪¼╪º┘à', '╪º╪¡╪¬╪▒╪º┘à', '╪º┌⌐╪▒╪º┘à', '╪º╪│┘ä╪º┘à', '┘à┘é╪º┘à', '┘å╪º┘à', '┘╛█î╪º┘à', '╪┤╪º┘à'],
    '╪▒': ['█î╪º╪▒', '╪¿╪º╪▒', '╪»╪º╪▒', '┘å╪º╪▒', '┘ê╪º╪▒', '┘à╪º╪▒', '┌⌐╪º╪▒', '┘╛█î╪º╪▒', '╪º┘å╪¬╪╕╪º╪▒', '╪º╪╕█ü╪º╪▒', '╪º┘é╪▒╪º╪▒', '╪º╪╣╪¬╪¿╪º╪▒', '╪º┘ü┌⌐╪º╪▒', '╪¿█ü╪º╪▒', '┘à┘å╪¬╪╕╪▒', '┘å╪╕╪▒', '┌»╪░╪▒', '╪│┘ü╪▒', '╪º╪½╪▒', '╪«╪¿╪▒', '█ü┘å╪▒', '╪┤┌⌐╪º╪▒', '╪»█î╪»╪º╪▒', '┘é╪▒╪º╪▒'],
    '╪»': ['╪º┘à█î╪»', '╪¬╪º╪ª█î╪»', '┘ê╪╣█î╪»', '┘à╪▓█î╪»', '╪┤╪»█î╪»', '╪¼╪»█î╪»', '╪│╪╣█î╪»', '╪╣█î╪»', '╪╡█î╪»', '┘é█î╪»', '╪¿╪╣█î╪»', '┘ü╪▒█î╪»', '╪¡┘à█î╪»', '┘à╪¼█î╪»'],
    '┘å': ['╪ó╪│┘à╪º┘å', '╪¼█ü╪º┘å', '╪º┘å╪│╪º┘å', '┘à┌⌐╪º┘å', '╪┤╪º┘å', '╪▓╪¿╪º┘å', '╪¿█î╪º┘å', '┘à█î╪»╪º┘å', '╪º╪▒┘à╪º┘å', '┘╛█î┘à╪º┘å', '╪│╪º┘à╪º┘å', '┘à█ü╪▒╪¿╪º┘å', '╪º█î┘à╪º┘å', '╪»┌⌐╪º┘å', '╪▓┘à█î┘å', '█î┘é█î┘å', '╪¡╪│█î┘å', '╪│┌⌐┘ê┘å', '┘ü┘å┘ê┘å', '┘à╪╢┘à┘ê┘å', '╪¼┘å┘ê┘å', '┘é╪º┘å┘ê┘å', '╪»┘ê╪▒╪º┘å', '╪╣┘å┘ê╪º┘å'],
    '┘é': ['╪╣╪┤┘é', '╪▒╪┤┘é', '┘ü╪┤┘é', '╪▒╪▓┘é', '╪¡┘é', '╪┤┘ê┘é', '╪░┘ê┘é', '┘à╪╣╪┤┘ê┘é', '╪╡╪»█î┘é', '╪▒┘ü█î┘é', '╪¬┘ê┘ü█î┘é'],
    '╪┤': ['╪ó╪¬╪┤', '╪«╪º┘à┘ê╪┤', '┘å┘ê╪┤', '┘ç┘ê╪┤', '╪«╪▒┘ê╪┤', '╪¼┘ê╪┤', '┘ü╪▒╪º┘à┘ê╪┤', '╪│╪▒┌⌐╪┤', '╪ó╪▒╪┤', '╪»╪▒┘ê█î╪┤', '╪«┘ê╪º█ü╪┤', '╪¿╪«╪┤'],
    '█Æ': ['█ü█Æ', '╪¬┌╛█Æ', '┌⌐█î╪│█Æ', '╪¼█î╪│█Æ', '┘ê█ü█î┌║', '█î█ü█î┌║', '┌⌐█ü█î┌║', '╪¼█ü█î┌║'],
    '┘ê': ['┘ê█ü', '╪¼┘ê', '┌⌐┘ê', '╪│┘ê', '╪»┘ê', '╪▒┘ê', '┌⌐█ü┘ê', '╪│┘å┘ê'],
    '┌║': ['┘à█î┌║', '█ü█î┌║', '╪¬┌╛█î┌║', '┘à╪¼┌╛█Æ', '╪¬╪¼┌╛█Æ', '┌»┘ê█î┌║'],
}


def get_urdu_phonetic(word):
    """Extract advanced phonetic pattern for Urdu qaafia matching"""
    # Urdu vowels and diacritics
    vowels = '╪º╪ó╪╣█î┘ê█Æ█Æ┘░█î┘ö█é┘ö█é'
    silent_letters = '╪í█ü┌╛'
    diacritics = '┘ï┘î┘ì┘Ä┘Å┘É┘æ┘Æ┘░┘ô┘ö'
    
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
    vowels = '╪º╪ó█î┘ê█Æ┌║█é█ü╪í┘Ä┘Å┘É┘æ┘Æ┘░┘ô┘ö'
    real_qaafia = word
    for i in range(len(word)-1, -1, -1):
        if word[i] not in vowels:
            real_qaafia = word[:i+1]
            break
    
    # Extract consonants for matching
    consonants = [c for c in word if c not in vowels]
    
    # Get vowel pattern (for advanced matching)
    vowel_chars = [c for c in word if c in '╪º╪ó█î┘ê█Æ█Æ┘░']
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
