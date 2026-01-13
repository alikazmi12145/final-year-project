"""
Advanced OCR Module for Urdu Poetry Images
Uses Tesseract with improved validation and robust parsing
"""

import logging
import os
import shutil

from PIL import Image

logger = logging.getLogger(__name__)

# Try to import langdetect for language detection (optional)
try:
    from langdetect import detect, detect_langs
    HAS_LANGDETECT = True
except ImportError:
    HAS_LANGDETECT = False
    logger.debug("langdetect not available - language auto-detection will use fallback method")


class UrduOCR:
    """
    OCR engine optimized for Urdu poetry text extraction
    """

    def __init__(self, tesseract_cmd=None):
        """Initialize Urdu OCR engine and validate tesseract availability"""
        try:
            import pytesseract  # local import to allow module import even if not installed
        except Exception:
            pytesseract = None

        self.pytesseract = pytesseract

        # allow override from constructor
        if tesseract_cmd:
            self._set_tesseract_cmd(tesseract_cmd)
        else:
            # Try common install locations or system PATH
            candidates = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ]

            found = None
            for p in candidates:
                if os.path.exists(p):
                    found = p
                    break

            if not found:
                # check PATH
                which = shutil.which("tesseract")
                if which:
                    found = which

            if found:
                self._set_tesseract_cmd(found)
            else:
                # leave unset — we will surface an error when attempting OCR
                logger.warning("Tesseract binary not found in common locations or system PATH.")

        # validate by calling pytesseract.get_tesseract_version if available
        if self.pytesseract:
            try:
                _ = self.pytesseract.get_tesseract_version()
                logger.info("✅ Tesseract is available and responding.")
            except Exception as e:
                logger.warning(f"Tesseract appears not usable: {e}")

    def _set_tesseract_cmd(self, path):
        # set only if pytesseract imported
        if self.pytesseract:
            self.pytesseract.pytesseract.tesseract_cmd = path
            logger.info(f"✅ Tesseract command set to: {path}")

    def extract_text(self, image_path, languages=None):
        """
        Extract text from image using Tesseract OCR

        Args:
            image_path: Path to image file
            languages: List of languages (urd=Urdu, eng=English, hin=Hindi)
        Returns:
            dict with 'success', 'text' / 'error', 'confidence' (0-1), etc.
        """
        if languages is None:
            languages = ["urd", "eng"]

        if not self.pytesseract:
            return {"success": False, "error": "pytesseract is not installed."}

        import pytesseract  # guaranteed, assigned in __init__

        # verify image exists
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        try:
            image = Image.open(image_path)
            original_image = image.copy()  # Keep original for fallback
        except Exception as e:
            logger.error(f"Failed to open image: {e}")
            return {"success": False, "error": f"Failed to open image: {e}"}

        # ensure RGB for preprocessing
        if image.mode != "RGB":
            image = image.convert("RGB")
        if original_image.mode != "RGB":
            original_image = original_image.convert("RGB")

        # Try multiple strategies - including for artistic/calligraphic text
        # Order matters: try adaptive binarization first (best for artistic text)
        strategies = [
            ("adaptive_binary", self._binarize_adaptive(original_image.copy())),
            ("inverted", self._invert_colors(original_image.copy())),
            ("preprocessed", self._preprocess_image(image)),
            ("light_preprocess", self._light_preprocess(original_image.copy())),
            ("original_grayscale", original_image.convert("L")),
        ]
        
        logger.info("=" * 60)
        logger.info("🚀 STARTING 5-STRATEGY OCR APPROACH (includes artistic text)")
        logger.info(f"📋 Strategies: adaptive_binary, inverted, preprocessed, light_preprocess, original_grayscale")
        logger.info(f"📝 Languages requested: {languages}")
        logger.info("=" * 60)

        # PRIORITIZE URDU! Only use Urdu language model
        # Using multiple languages causes English to interfere with Urdu text
        lang_str = "urd"  # ONLY URDU! This is critical!
        logger.info(f"🎯 Using language: {lang_str} (Urdu ONLY to avoid English interference)")

        # PSM modes to try - extended for artistic text
        # PSM 6: Uniform block of text (most common)
        # PSM 3: Fully automatic page segmentation
        # PSM 4: Single column of text (variable sizes)
        # PSM 11: Sparse text (find as much text as possible)
        # PSM 13: Raw line (treat image as single text line)
        # PSM 7: Treat image as single text line
        # PSM 8: Treat image as single word
        psm_modes = [6, 3, 4, 11, 13, 7, 8]
        
        # Also try Arabic language model (urd sometimes fails on Nastaliq)
        lang_options = ["urd", "ara"]

        best_text = ""
        best_conf = -1.0
        best_psm = None
        best_strategy = None
        best_lang = None

        # Try each strategy
        for strategy_name, processed_img in strategies:
            logger.info(f"🔄 Trying strategy: {strategy_name}")
            
            for lang in lang_options:
                for psm in psm_modes:
                    # Use Urdu language only, without character whitelist (too restrictive)
                    custom_config = f"--oem 3 --psm {psm}"
                    logger.debug(f"  🔍 Trying lang={lang}, PSM {psm}...")
                    try:
                        # Get text using image_to_string (often more complete)
                        text_string = pytesseract.image_to_string(
                            processed_img, lang=lang, config=custom_config
                        ).strip()
                        
                        # Get confidence data
                        data = pytesseract.image_to_data(
                            processed_img, lang=lang, config=custom_config, output_type=pytesseract.Output.DICT
                        )
                        
                        # Calculate confidence
                        confs = []
                        for c in data.get("conf", []):
                            try:
                                fc = float(c)
                                if fc >= 0:
                                    confs.append(fc)
                            except Exception:
                                continue
                        
                        avg_conf = sum(confs) / len(confs) if confs else 0.0
                        
                        # Clean the text
                        cleaned_text = self._clean_extracted_text(text_string)
                        
                        if cleaned_text:
                            logger.info(f"  {lang} PSM {psm}: '{cleaned_text[:50]}...' ({len(cleaned_text)} chars, {avg_conf:.1f}% conf)")
                        
                        if not cleaned_text:
                            continue
                        
                        # Score based on confidence and length
                        # Also check text quality
                        quality_score = self._calculate_text_quality(cleaned_text)
                        score = avg_conf * (1 + min(1, len(cleaned_text) / 100)) * quality_score
                        
                        if score > best_conf or (score == best_conf and len(cleaned_text) > len(best_text)):
                            best_text = cleaned_text
                            best_conf = avg_conf
                            best_psm = psm
                            best_strategy = strategy_name
                            best_lang = lang
                            logger.debug(f"  ✅ New best: score={score:.2f}, quality={quality_score:.2f}")
                    
                    except Exception as e:
                        logger.debug(f"  {lang} PSM {psm} failed: {e}")
                        continue
            
            # If we got good results, no need to try more strategies
            if best_text and best_conf > 70 and len(best_text) > 10:
                logger.info(f"✅ Good result with {best_strategy}, skipping remaining strategies")
                break

        # Log final result
        if best_text:
            logger.info(f"🎯 Final OCR result ({best_strategy}, lang={best_lang}): '{best_text}' ({len(best_text)} chars, {best_conf:.1f}% confidence, PSM {best_psm})")
        else:
            logger.warning(f"⚠️ No text extracted after trying all strategies and PSM modes")

        # Quality checks
        if best_text:
            quality_score = self._calculate_text_quality(best_text)
            
            # Check if text quality is acceptable
            if quality_score < 0.3:
                logger.warning(f"⚠️ Text quality is poor (score: {quality_score:.2f})")
                
                return {
                    "success": True,
                    "text": best_text,
                    "confidence": best_conf / 100.0,
                    "language": self._detect_language(best_text),
                    "word_count": len(best_text.split()),
                    "psm_mode": best_psm,
                    "strategy": best_strategy,
                    "quality": "poor",
                    "quality_score": quality_score,
                    "is_garbled": True,
                    "warning": "Text quality is poor. Try a clearer image with better contrast.",
                }

        detected_lang = self._detect_language(best_text) if best_text else "unknown"
        quality_score = self._calculate_text_quality(best_text) if best_text else 0.0
        
        logger.info(f"✅ OCR completed successfully (quality: {quality_score:.2f})")

        return {
            "success": True,
            "text": best_text,
            "confidence": best_conf / 100.0,
            "language": detected_lang,
            "word_count": len(best_text.split()),
            "psm_mode": best_psm,
            "strategy": best_strategy,
            "quality": "good" if quality_score > 0.5 else "questionable",
            "quality_score": quality_score,
            "is_garbled": False,
        }

    def _preprocess_image(self, image):
        """
        Preprocess image for better OCR accuracy (PIL Image in RGB)
        Balanced approach - not too aggressive to preserve text
        """
        from PIL import ImageEnhance, ImageFilter, ImageOps, ImageStat

        try:
            import numpy as np
            has_numpy = True
        except Exception:
            has_numpy = False
            logger.debug("NumPy not available, using simpler preprocessing")

        # Ensure RGB -> then convert to grayscale for processing
        if image.mode != "RGB":
            image = image.convert("RGB")

        logger.info("🖼️ Starting GENTLE preprocessing (optimized for Urdu)")

        width, height = image.size
        original_size = (width, height)

        # Resize only if necessary - maintain aspect ratio
        min_w = 1200
        max_w = 3000
        if width < min_w:
            scale = min_w / width
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"📐 Resized image from {original_size} to {new_size}")
        elif width > max_w:
            scale = max_w / width
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"📐 Downscaled large image from {original_size} to {new_size}")

        # Convert to grayscale
        image = image.convert("L")
        
        # VERY GENTLE contrast enhancement (just 1.2x) - less is more for Urdu!
        image = ImageEnhance.Contrast(image).enhance(1.2)
        logger.info("✅ Applied gentle contrast (1.2x)")
        
        # VERY GENTLE sharpening (just 1.1x)
        image = ImageEnhance.Sharpness(image).enhance(1.1)
        logger.info("✅ Applied gentle sharpening (1.1x)")
        
        logger.info("✅ GENTLE preprocessing completed - avoided over-processing")
        return image

    def _clean_extracted_text(self, text):
        """
        Clean extracted text and remove English characters that interfere with Urdu
        """
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = " ".join(text.split())
        
        def is_urdu_char(c):
            """Check if character is Urdu/Arabic script"""
            code = ord(c)
            return (0x0600 <= code <= 0x06FF or  # Arabic
                    0x0750 <= code <= 0x077F or  # Arabic Supplement
                    0x08A0 <= code <= 0x08FF or  # Arabic Extended-A
                    0xFB50 <= code <= 0xFDFF or  # Arabic Presentation Forms-A
                    0xFE70 <= code <= 0xFEFF)    # Arabic Presentation Forms-B
        
        # Remove English letters that interfere with Urdu
        # Keep: Urdu chars, numbers, spaces, and Urdu punctuation
        cleaned = []
        for char in text:
            if (is_urdu_char(char) or           # Urdu/Arabic characters
                char.isspace() or                # Spaces
                char.isdigit() or                # Numbers
                char in '۔،؛؟'):                 # Urdu punctuation
                cleaned.append(char)
            elif char in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ':
                # Skip English letters that are OCR errors
                logger.debug(f"Removed English char: {char}")
                continue
            else:
                # Keep other characters (might be valid)
                cleaned.append(char)
        
        result = "".join(cleaned).strip()
        
        # Remove excessive whitespace again
        result = " ".join(result.split())
        
        return result
    
    def _calculate_text_quality(self, text):
        """
        Calculate quality score for extracted text (0-1)
        Higher score = better quality
        """
        if not text:
            return 0.0
        
        def is_urdu_char(ch):
            code = ord(ch)
            ranges = [
                (0x0600, 0x06FF),
                (0x0750, 0x077F),
                (0x08A0, 0x08FF),
                (0xFB50, 0xFDFF),
                (0xFE70, 0xFEFF),
            ]
            return any(start <= code <= end for start, end in ranges)
        
        total_chars = sum(1 for c in text if not c.isspace())
        if total_chars == 0:
            return 0.0
        
        urdu_chars = sum(1 for c in text if is_urdu_char(c))
        eng_chars = sum(1 for c in text if c.isalpha() and ord(c) < 128)
        digit_chars = sum(1 for c in text if c.isdigit())
        special_chars = sum(
            1 for c in text 
            if not (is_urdu_char(c) or (c.isalpha() and ord(c) < 128) or c.isdigit() or c.isspace())
        )
        
        # Calculate ratios
        urdu_ratio = urdu_chars / total_chars
        eng_ratio = eng_chars / total_chars
        special_ratio = special_chars / total_chars
        
        # Quality score based on content
        # Good text should have high Urdu/English ratio and low special char ratio
        valid_content_ratio = (urdu_ratio + eng_ratio)
        
        # Penalize high special character ratio
        special_penalty = max(0, 1 - (special_ratio * 2))
        
        # Bonus for having reasonable length
        length_bonus = min(1.0, len(text) / 50)  # Max bonus at 50+ chars
        
        quality = valid_content_ratio * special_penalty * (0.7 + 0.3 * length_bonus)
        
        return max(0.0, min(1.0, quality))
    
    def _binarize_adaptive(self, image):
        """
        Adaptive binarization for artistic/calligraphic text on complex backgrounds
        Best for decorative Nastaliq fonts and images with gradients
        """
        logger.info("🖼️ ADAPTIVE BINARIZATION - for artistic text")
        
        try:
            import numpy as np
            import cv2
            has_cv2 = True
        except ImportError:
            has_cv2 = False
            logger.warning("OpenCV not available, falling back to PIL binarization")
        
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize if needed
        width, height = image.size
        min_w = 1500
        if width < min_w:
            scale = min_w / width
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"📐 Resized to {new_size}")
        
        if has_cv2:
            import numpy as np
            import cv2
            
            # Convert to numpy array
            img_array = np.array(image)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Apply bilateral filter to reduce noise while keeping edges sharp
            denoised = cv2.bilateralFilter(gray, 9, 75, 75)
            
            # Adaptive threshold - better for varying lighting/backgrounds
            binary = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 31, 10
            )
            
            # Check if text is inverted (light text on dark background)
            # Count black vs white pixels
            white_pixels = np.sum(binary == 255)
            black_pixels = np.sum(binary == 0)
            
            # If more black pixels, text is likely white - invert
            if black_pixels > white_pixels:
                binary = cv2.bitwise_not(binary)
                logger.info("🔄 Detected inverted text - flipped image")
            
            # Convert back to PIL
            result = Image.fromarray(binary)
            logger.info("✅ Adaptive binarization complete")
            return result
        else:
            # Fallback to PIL-based processing
            gray = image.convert("L")
            # Simple threshold
            threshold = 128
            binary = gray.point(lambda x: 255 if x > threshold else 0, '1')
            return binary.convert("L")
    
    def _invert_colors(self, image):
        """
        Invert image colors - for light text on dark backgrounds
        """
        logger.info("🖼️ INVERTING colors - for light text on dark background")
        
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize if needed
        width, height = image.size
        min_w = 1500
        if width < min_w:
            scale = min_w / width
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to grayscale and invert
        from PIL import ImageOps
        gray = image.convert("L")
        inverted = ImageOps.invert(gray)
        
        logger.info("✅ Color inversion complete")
        return inverted

    def _light_preprocess(self, image):
        """
        MINIMAL preprocessing - just resize and grayscale
        For images that are already good quality
        """
        logger.info("🖼️ MINIMAL preprocessing - just grayscale")
        
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize if needed
        width, height = image.size
        min_w = 1200
        max_w = 3000
        if width < min_w:
            scale = min_w / width
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"📐 Resized to {new_size}")
        elif width > max_w:
            scale = max_w / width
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"📐 Downscaled to {new_size}")
        
        # Convert to grayscale - that's it!
        image = image.convert("L")
        logger.info("✅ MINIMAL preprocessing done")
        
        return image

    def detect_language_from_image(self, image_path):
        """
        Detect language from image using quick OCR scan
        Returns: 'urd' for Urdu, 'eng' for English, or 'mixed'
        """
        if not self.pytesseract:
            return 'urd'  # Default to Urdu
        
        import pytesseract
        
        try:
            # Quick scan with both languages
            image = Image.open(image_path)
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Convert to grayscale for quick test
            gray = image.convert("L")
            
            # Quick OCR with script detection
            osd = pytesseract.image_to_osd(gray)
            
            # Parse OSD output for script info
            if 'Arabic' in osd or 'Urdu' in osd:
                logger.info("🌍 Detected: Urdu/Arabic script")
                return 'urd'
            elif 'Latin' in osd or 'English' in osd:
                logger.info("🌍 Detected: English/Latin script")
                return 'eng'
            
        except Exception as e:
            logger.debug(f"OSD detection failed: {e}")
        
        # Fallback: Try character-based detection
        try:
            text = pytesseract.image_to_string(image, lang='urd+eng', config='--psm 6')
            
            def is_urdu_char(ch):
                code = ord(ch)
                return (0x0600 <= code <= 0x06FF or  # Arabic
                        0x0750 <= code <= 0x077F or  # Arabic Supplement
                        0xFB50 <= code <= 0xFDFF or  # Arabic Presentation Forms-A
                        0xFE70 <= code <= 0xFEFF)    # Arabic Presentation Forms-B
            
            urdu_count = sum(1 for c in text if is_urdu_char(c))
            eng_count = sum(1 for c in text if c.isalpha() and ord(c) < 128)
            
            if urdu_count > eng_count:
                logger.info(f"🌍 Detected: Urdu (Urdu chars: {urdu_count}, Eng: {eng_count})")
                return 'urd'
            elif eng_count > urdu_count:
                logger.info(f"🌍 Detected: English (Eng chars: {eng_count}, Urdu: {urdu_count})")
                return 'eng'
            else:
                logger.info(f"🌍 Detected: Mixed (Urdu: {urdu_count}, Eng: {eng_count})")
                return 'mixed'
                
        except Exception as e:
            logger.debug(f"Character-based detection failed: {e}")
        
        # Default to Urdu for poetry images
        return 'urd'

    def _detect_language(self, text):
        """
        Detect primary language from extracted text
        """
        if not text:
            return "unknown"

        def is_urdu_char(ch):
            code = ord(ch)
            ranges = [
                (0x0600, 0x06FF),
                (0x0750, 0x077F),
                (0x08A0, 0x08FF),
                (0xFB50, 0xFDFF),
                (0xFE70, 0xFEFF),
            ]
            return any(start <= code <= end for start, end in ranges)

        urdu_chars = sum(1 for ch in text if is_urdu_char(ch))
        eng_chars = sum(1 for ch in text if ch.isalpha() and ord(ch) < 128)

        if urdu_chars > eng_chars and urdu_chars > 0:
            return "urdu"
        if eng_chars > urdu_chars and eng_chars > 0:
            return "english"
        return "mixed"

    def extract_from_url(self, image_url):
        """
        Extract text from image URL
        """
        try:
            import requests
        except Exception:
            return {"success": False, "error": "requests library not available to download image."}

        try:
            from io import BytesIO
            response = requests.get(image_url, timeout=12)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content))
        except Exception as e:
            logger.error(f"❌ Error downloading or opening image from URL: {e}")
            return {"success": False, "error": str(e)}

        # use a temporary file to reuse extract_text
        import tempfile
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                tmp_path = tmp.name
                image.save(tmp_path)
            return self.extract_text(tmp_path)
        finally:
            try:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass


# Global instance helper
ocr_engine = None


def get_ocr_engine():
    global ocr_engine
    if ocr_engine is None:
        ocr_engine = UrduOCR()
    return ocr_engine
