"""
Text Matching Utility using Fuzzy Matching
Compares extracted OCR text with Rekhta results to find best matches
"""

import logging
from typing import List, Dict, Any, Tuple

# Import rapidfuzz for fuzzy text matching (required)
try:
    from rapidfuzz import fuzz, process  # type: ignore
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False
    # Will log warning in __init__

logger = logging.getLogger(__name__)


class TextMatcher:
    """Fuzzy text matching for poetry comparison"""
    
    def __init__(self):
        if not HAS_RAPIDFUZZ:
            logger.error("❌ rapidfuzz not installed! Install with: pip install rapidfuzz")
            raise ImportError(
                "rapidfuzz is required for text matching. "
                "Install it with: pip install rapidfuzz"
            )
        else:
            logger.info("✅ Text matcher initialized with rapidfuzz")
    
    def rank_matches(self, extracted_text: str, rekhta_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rank Rekhta results by similarity to extracted text
        
        Args:
            extracted_text: Text extracted from OCR
            rekhta_results: List of poem matches from Rekhta
            
        Returns:
            Sorted list of matches with similarity scores
        """
        if not extracted_text or not rekhta_results:
            return rekhta_results
        
        if not HAS_RAPIDFUZZ:
            # Return as-is if no fuzzy matching available
            logger.warning("Fuzzy matching unavailable - returning results without ranking")
            return rekhta_results
        
        # Clean extracted text
        extracted_clean = self._clean_text(extracted_text)
        
        scored_results = []
        
        for result in rekhta_results:
            # Compare with verses
            verses = result.get('verses', '')
            title = result.get('title', '')
            
            # Calculate similarity scores
            verse_score = self._calculate_similarity(extracted_clean, verses)
            title_score = self._calculate_similarity(extracted_clean, title)
            
            # Combined score (verses weighted more heavily)
            combined_score = (verse_score * 0.7) + (title_score * 0.3)
            
            # Add score to result
            result_with_score = result.copy()
            result_with_score['match_score'] = combined_score
            result_with_score['verse_similarity'] = verse_score
            result_with_score['title_similarity'] = title_score
            
            scored_results.append(result_with_score)
        
        # Sort by match score (highest first)
        scored_results.sort(key=lambda x: x['match_score'], reverse=True)
        
        logger.info(f"📊 Ranked {len(scored_results)} matches by similarity")
        if scored_results:
            logger.info(f"🏆 Best match score: {scored_results[0]['match_score']:.1f}%")
        
        return scored_results
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two texts
        Returns: Similarity score 0-100
        """
        if not text1 or not text2:
            return 0.0
        
        text1_clean = self._clean_text(text1)
        text2_clean = self._clean_text(text2)
        
        if not text1_clean or not text2_clean:
            return 0.0
        
        # Use token_sort_ratio for better Urdu text comparison
        # This handles word order differences and is better for poetry
        score = fuzz.token_sort_ratio(text1_clean, text2_clean)
        
        return float(score)
    
    def _clean_text(self, text: str) -> str:
        """Clean text for comparison"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = " ".join(text.split())
        
        # Remove common punctuation that might differ
        text = text.replace('۔', ' ').replace('،', ' ')
        text = text.replace('.', ' ').replace(',', ' ')
        
        # Normalize whitespace again
        text = " ".join(text.split())
        
        return text.strip().lower()
    
    def find_best_match(self, extracted_text: str, rekhta_results: List[Dict[str, Any]], 
                       min_score: float = 50.0) -> Tuple[Dict[str, Any], float]:
        """
        Find the single best match from Rekhta results
        
        Args:
            extracted_text: Extracted OCR text
            rekhta_results: List of Rekhta matches
            min_score: Minimum similarity score to consider (0-100)
            
        Returns:
            Tuple of (best_match_dict, score) or (None, 0.0) if no good match
        """
        ranked = self.rank_matches(extracted_text, rekhta_results)
        
        if not ranked:
            return None, 0.0
        
        best = ranked[0]
        score = best.get('match_score', 0.0)
        
        if score >= min_score:
            logger.info(f"✅ Found good match: {best.get('title', 'Unknown')} (score: {score:.1f}%)")
            return best, score
        else:
            logger.info(f"⚠️ Best match score {score:.1f}% below threshold {min_score}%")
            return None, 0.0
    
    def highlight_matching_parts(self, extracted_text: str, poem_text: str) -> Dict[str, List[str]]:
        """
        Find matching parts between extracted text and poem
        
        Returns:
            {
                'matching_lines': List of matching lines/verses,
                'extracted_snippets': Matching parts from extracted text,
                'poem_snippets': Corresponding parts from poem
            }
        """
        if not HAS_RAPIDFUZZ or not extracted_text or not poem_text:
            return {
                'matching_lines': [],
                'extracted_snippets': [],
                'poem_snippets': []
            }
        
        # Split into lines
        extracted_lines = [l.strip() for l in extracted_text.split('\n') if l.strip()]
        poem_lines = [l.strip() for l in poem_text.split('\n') if l.strip()]
        
        matching_pairs = []
        
        for ext_line in extracted_lines:
            if len(ext_line) < 5:  # Skip very short lines
                continue
            
            # Find best matching poem line
            best_match = process.extractOne(
                ext_line,
                poem_lines,
                scorer=fuzz.token_sort_ratio
            )
            
            if best_match and best_match[1] > 60:  # Score > 60%
                matching_pairs.append({
                    'extracted': ext_line,
                    'poem': best_match[0],
                    'score': best_match[1]
                })
        
        return {
            'matching_lines': [p['poem'] for p in matching_pairs],
            'extracted_snippets': [p['extracted'] for p in matching_pairs],
            'poem_snippets': [p['poem'] for p in matching_pairs],
            'match_scores': [p['score'] for p in matching_pairs]
        }


# Singleton
_text_matcher = None


def get_text_matcher() -> TextMatcher:
    """Get or create TextMatcher singleton"""
    global _text_matcher
    if _text_matcher is None:
        _text_matcher = TextMatcher()
    return _text_matcher
