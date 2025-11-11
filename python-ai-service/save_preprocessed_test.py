#!/usr/bin/env python3
"""
Save preprocessed images to see what Tesseract sees
"""

from PIL import Image
from image_ocr import UrduOCR

image_path = r"c:\Users\ALI KAZMI\Downloads\Screenshot 2025-11-11 103402.png"

# Create OCR instance
ocr = UrduOCR()

# Load image
image = Image.open(image_path)
original = image.copy()

# Ensure RGB
if image.mode != "RGB":
    image = image.convert("RGB")
if original.mode != "RGB":
    original = original.convert("RGB")

# Apply each preprocessing strategy
strategies = {
    "1_high_contrast_binary": ocr._high_contrast_binary(image.copy()),
    "2_preprocessed": ocr._preprocess_image(image.copy()),
    "3_light_preprocess": ocr._light_preprocess(original.copy()),
    "4_original_grayscale": original.convert("L"),
}

# Save each preprocessed version
for name, processed_img in strategies.items():
    output_path = f"d:/temp_ocr_{name}.png"
    processed_img.save(output_path)
    print(f"✅ Saved: {output_path}")

print("\n📝 Open these images to see what Tesseract is processing!")
