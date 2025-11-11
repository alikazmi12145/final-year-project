"""
Rekhta Integration Service
Scrapes Rekhta.org to find poems, poets, and verses based on extracted text
"""

import requests
import logging
import time
from urllib.parse import quote
import re
from typing import Dict, List, Any

# Import BeautifulSoup (required for web scraping)
try:
    from bs4 import BeautifulSoup
except ImportError:
    raise ImportError("BeautifulSoup4 is required. Install with: pip install beautifulsoup4")

logger = logging.getLogger(__name__)


class RekhtaService:
    """Service to scrape and search Rekhta.org for poetry matches"""
    
    BASE_URL = "https://www.rekhta.org"
    SEARCH_URL = f"{BASE_URL}/search"
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
    }
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)
        logger.info("✅ Rekhta service initialized")
    
    def search_text(self, query_text: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Search Rekhta for poems matching the extracted text
        
        Args:
            query_text: Extracted text from OCR
            max_results: Maximum number of results to return
            
        Returns:
            {
                'success': bool,
                'matches': List of poem matches,
                'query': original query,
                'error': error message if failed
            }
        """
        try:
            logger.info(f"🔍 Searching Rekhta for: {query_text[:50]}...")
            
            # Clean query text (remove extra whitespace, keep only meaningful words)
            cleaned_query = self._clean_query(query_text)
            
            if not cleaned_query:
                return {
                    'success': False,
                    'error': 'Query text is empty after cleaning',
                    'matches': []
                }
            
            # Search Rekhta
            search_url = f"{self.SEARCH_URL}?q={quote(cleaned_query)}"
            logger.info(f"📡 GET {search_url}")
            
            response = self.session.get(search_url, timeout=10)
            response.raise_for_status()
            
            # Parse results
            soup = BeautifulSoup(response.content, 'lxml')
            
            matches = []
            
            # Find poem results (Rekhta shows poems/ghazals/nazms)
            poem_results = soup.find_all('div', class_='contentListBody')
            
            if not poem_results:
                # Try alternative selectors
                poem_results = soup.find_all('div', class_=['poemCard', 'ghazal', 'nazm'])
            
            logger.info(f"📊 Found {len(poem_results)} potential matches")
            
            for i, result in enumerate(poem_results[:max_results]):
                try:
                    match_data = self._parse_poem_result(result)
                    if match_data:
                        matches.append(match_data)
                except Exception as e:
                    logger.debug(f"Failed to parse result {i}: {e}")
                    continue
            
            # If no structured results, try searching for poet names
            if not matches:
                matches = self._search_by_verses(soup, cleaned_query)
            
            return {
                'success': True,
                'matches': matches,
                'query': cleaned_query,
                'results_count': len(matches)
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Rekhta request failed: {e}")
            return {
                'success': False,
                'error': f'Network error: {str(e)}',
                'matches': []
            }
        except Exception as e:
            logger.error(f"❌ Rekhta search error: {e}")
            return {
                'success': False,
                'error': str(e),
                'matches': []
            }
    
    def _clean_query(self, text: str) -> str:
        """Clean and prepare query text for search"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = " ".join(text.split())
        
        # Take first few meaningful words (Rekhta works better with shorter queries)
        words = text.split()
        
        # Filter out very short words and keep meaningful ones
        meaningful_words = [w for w in words if len(w) >= 2]
        
        # Take first 5-8 words for better search results
        query = " ".join(meaningful_words[:8])
        
        return query.strip()
    
    def _parse_poem_result(self, result_element) -> Dict[str, Any]:
        """Parse a poem result element from Rekhta search results"""
        try:
            # Extract title
            title_elem = result_element.find(['h2', 'h3', 'div'], class_=['title', 'poemTitle', 'contentTitle'])
            title = title_elem.get_text(strip=True) if title_elem else "Unknown"
            
            # Extract poet name
            poet_elem = result_element.find(['a', 'span', 'div'], class_=['poet', 'author', 'poetName'])
            poet_name = poet_elem.get_text(strip=True) if poet_elem else "Unknown Poet"
            
            # Extract verses/text snippet
            verses_elem = result_element.find(['div', 'p'], class_=['verses', 'couplet', 'content'])
            verses = verses_elem.get_text(strip=True) if verses_elem else ""
            
            # Extract URL
            link_elem = result_element.find('a', href=True)
            url = link_elem['href'] if link_elem else ""
            if url and not url.startswith('http'):
                url = f"{self.BASE_URL}{url}"
            
            # Extract category (Ghazal, Nazm, etc.)
            category_elem = result_element.find(['span', 'div'], class_=['category', 'type'])
            category = category_elem.get_text(strip=True) if category_elem else "Poem"
            
            return {
                'title': title,
                'poet': poet_name,
                'verses': verses,
                'url': url,
                'category': category,
                'source': 'Rekhta'
            }
            
        except Exception as e:
            logger.debug(f"Failed to parse poem element: {e}")
            return None
    
    def _search_by_verses(self, soup: BeautifulSoup, query: str) -> List[Dict[str, Any]]:
        """Fallback: Search for verses in the page content"""
        matches = []
        
        try:
            # Find all text content that might contain verses
            content_divs = soup.find_all(['div', 'p'], class_=re.compile(r'content|verse|couplet|line'))
            
            for div in content_divs[:5]:
                text = div.get_text(strip=True)
                if text and len(text) > 10:
                    # Try to find poet link nearby
                    poet_link = div.find_previous('a', class_=re.compile(r'poet|author'))
                    poet_name = poet_link.get_text(strip=True) if poet_link else "Unknown Poet"
                    
                    matches.append({
                        'title': text[:50] + "...",
                        'poet': poet_name,
                        'verses': text,
                        'url': self.BASE_URL,
                        'category': 'Verse',
                        'source': 'Rekhta'
                    })
            
        except Exception as e:
            logger.debug(f"Verse search failed: {e}")
        
        return matches
    
    def get_poet_details(self, poet_name: str) -> Dict[str, Any]:
        """Get detailed information about a poet"""
        try:
            # Search for poet
            search_url = f"{self.SEARCH_URL}?q={quote(poet_name)}&lang=ur"
            response = self.session.get(search_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Find poet profile link
            poet_links = soup.find_all('a', href=re.compile(r'/poet/'))
            
            if poet_links:
                poet_url = poet_links[0]['href']
                if not poet_url.startswith('http'):
                    poet_url = f"{self.BASE_URL}{poet_url}"
                
                # Get poet page
                poet_response = self.session.get(poet_url, timeout=10)
                poet_soup = BeautifulSoup(poet_response.content, 'lxml')
                
                # Extract poet bio
                bio_elem = poet_soup.find('div', class_=['bio', 'biography', 'about'])
                bio = bio_elem.get_text(strip=True) if bio_elem else ""
                
                return {
                    'success': True,
                    'name': poet_name,
                    'bio': bio,
                    'url': poet_url
                }
            
            return {
                'success': False,
                'error': 'Poet not found'
            }
            
        except Exception as e:
            logger.error(f"Failed to get poet details: {e}")
            return {
                'success': False,
                'error': str(e)
            }


# Singleton instance
_rekhta_service = None


def get_rekhta_service() -> RekhtaService:
    """Get or create Rekhta service singleton"""
    global _rekhta_service
    if _rekhta_service is None:
        _rekhta_service = RekhtaService()
    return _rekhta_service
