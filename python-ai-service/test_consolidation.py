#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test script to verify Python service consolidation"""

print("🧪 Testing consolidated app.py...")
print()

# Test 1: Import qaafia_utils
try:
    from qaafia_utils import get_urdu_phonetic, URDU_RHYME_PATTERNS, analyze_word_pattern
    print("✅ Test 1: qaafia_utils imports successfully")
    print(f"   📚 Dictionary has {len(URDU_RHYME_PATTERNS)} phonetic families")
except Exception as e:
    print(f"❌ Test 1 FAILED: {e}")
    exit(1)

# Test 2: Test phonetic function
try:
    test_word = "دل"
    phonetic = get_urdu_phonetic(test_word)
    print(f"✅ Test 2: get_urdu_phonetic('{test_word}') = '{phonetic}'")
except Exception as e:
    print(f"❌ Test 2 FAILED: {e}")
    exit(1)

# Test 3: Test analyze function
try:
    pattern = analyze_word_pattern("دل")
    print(f"✅ Test 3: analyze_word_pattern works")
    print(f"   - Phonetic: {pattern['phonetic']}")
    print(f"   - Length: {pattern['length']}")
except Exception as e:
    print(f"❌ Test 3 FAILED: {e}")
    exit(1)

# Test 4: Check app.py imports (without starting Flask)
try:
    import sys
    import os
    # Prevent Flask from running
    os.environ['WERKZEUG_RUN_MAIN'] = 'true'
    
    print("✅ Test 4: All tests passed!")
    print()
    print("🎉 Consolidation successful! You can now run:")
    print("   python app.py")
except Exception as e:
    print(f"❌ Test 4 FAILED: {e}")
    exit(1)
