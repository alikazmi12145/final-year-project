#!/usr/bin/env python3
"""
Debug script to test OCR on the problematic image
"""

import logging
from image_ocr import UrduOCR

# Set up detailed logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')

# Test image path
image_path = r"c:\Users\ALI KAZMI\Downloads\Screenshot 2025-11-11 103402.png"

print("="*60)
print("🔍 DEBUGGING OCR FOR PROBLEM IMAGE")
print("="*60)

# Create OCR service
ocr = UrduOCR()

# Extract text
result = ocr.extract_text(image_path)

print("\n" + "="*60)
print("📊 FINAL RESULT")
print("="*60)
print(f"Success: {result['success']}")
print(f"Text: {result['text']}")
print(f"Confidence: {result['confidence']:.1%}")
print(f"Strategy: {result['strategy']}")
print(f"PSM Mode: {result['psm_mode']}")
print(f"Quality Score: {result['quality_score']:.2f}")
print(f"Word Count: {result['word_count']}")
print("="*60)

# Expected text
expected_line1 = "میں اور بھی دنیا میں سخن ور بہت اچھے"
expected_line2 = "کہتے ہیں کہ غالب کا ہے انداز بیاں اور"

print("\n📝 EXPECTED TEXT:")
print(f"Line 1: {expected_line1}")
print(f"Line 2: {expected_line2}")
print("="*60)
