"""
Semantic Search Engine for Urdu Poetry
Uses Sentence Transformers for multilingual embeddings
"""

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import pickle
import os
import logging

logger = logging.getLogger(__name__)


class SemanticSearchEngine:
    """
    Semantic search engine using sentence embeddings
    Supports Urdu, English, and Hindi poetry search
    """
    
    def __init__(self, model_name='paraphrase-multilingual-mpnet-base-v2'):
        """
        Initialize semantic search engine
        
        Args:
            model_name: Pre-trained sentence transformer model
        """
        logger.info(f"🔄 Loading semantic search model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.poems_data = []
        self.dimension = 768  # mpnet-base embedding dimension
        
        logger.info("✅ Semantic search model loaded successfully")
    
    
    def create_index(self, poems):
        """
        Create FAISS index from poems data
        
        Args:
            poems: List of poem dictionaries with fields:
                   {_id, title, content, author, category, etc.}
        
        Returns:
            bool: Success status
        """
        try:
            if not poems or len(poems) == 0:
                logger.warning("⚠️ No poems provided for indexing")
                return False
            
            logger.info(f"🔄 Creating semantic index for {len(poems)} poems")
            
            # Store poems data
            self.poems_data = poems
            
            # Prepare texts for embedding (title + content + author)
            texts = []
            for poem in poems:
                text = f"{poem.get('title', '')} {poem.get('content', '')} {poem.get('author', '')}"
                texts.append(text)
            
            # Generate embeddings
            logger.info("🔄 Generating embeddings...")
            embeddings = self.model.encode(texts, show_progress_bar=True)
            embeddings = np.array(embeddings).astype('float32')
            
            # Create FAISS index
            self.index = faiss.IndexFlatIP(self.dimension)  # Inner Product for cosine similarity
            
            # Normalize embeddings for cosine similarity
            faiss.normalize_L2(embeddings)
            
            # Add to index
            self.index.add(embeddings)
            
            logger.info(f"✅ Semantic index created with {self.index.ntotal} poems")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error creating semantic index: {str(e)}")
            return False
    
    
    def search(self, query, top_k=20, threshold=0.3):
        """
        Semantic search for poems
        
        Args:
            query: Search query text
            top_k: Number of results to return
            threshold: Minimum similarity threshold (0-1)
        
        Returns:
            list: List of matching poems with similarity scores
        """
        try:
            if self.index is None or self.index.ntotal == 0:
                logger.warning("⚠️ No semantic index available")
                return []
            
            # Generate query embedding
            query_embedding = self.model.encode([query])
            query_embedding = np.array(query_embedding).astype('float32')
            
            # Normalize for cosine similarity
            faiss.normalize_L2(query_embedding)
            
            # Search
            scores, indices = self.index.search(query_embedding, min(top_k, self.index.ntotal))
            
            # Prepare results
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(self.poems_data) and score >= threshold:
                    poem = self.poems_data[idx].copy()
                    poem['similarity_score'] = float(score)
                    poem['search_method'] = 'semantic'
                    results.append(poem)
            
            logger.info(f"✅ Found {len(results)} semantic matches for query: {query[:50]}")
            return results
            
        except Exception as e:
            logger.error(f"❌ Semantic search error: {str(e)}")
            return []
    
    
    def save_index(self, filepath='semantic_index.pkl'):
        """Save index and poems data to disk"""
        try:
            if self.index is None:
                logger.warning("⚠️ No index to save")
                return False
            
            # Save FAISS index
            faiss.write_index(self.index, filepath.replace('.pkl', '.faiss'))
            
            # Save poems data
            with open(filepath, 'wb') as f:
                pickle.dump(self.poems_data, f)
            
            logger.info(f"✅ Semantic index saved to {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error saving index: {str(e)}")
            return False
    
    
    def load_index(self, filepath='semantic_index.pkl'):
        """Load index and poems data from disk"""
        try:
            faiss_path = filepath.replace('.pkl', '.faiss')
            
            if not os.path.exists(faiss_path) or not os.path.exists(filepath):
                logger.warning(f"⚠️ Index files not found: {filepath}")
                return False
            
            # Load FAISS index
            self.index = faiss.read_index(faiss_path)
            
            # Load poems data
            with open(filepath, 'rb') as f:
                self.poems_data = pickle.load(f)
            
            logger.info(f"✅ Semantic index loaded: {self.index.ntotal} poems")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error loading index: {str(e)}")
            return False
    
    
    def update_index(self, new_poems):
        """
        Update index with new poems (incremental)
        
        Args:
            new_poems: List of new poem dictionaries
        
        Returns:
            bool: Success status
        """
        try:
            if not new_poems:
                return True
            
            logger.info(f"🔄 Updating index with {len(new_poems)} new poems")
            
            # Add to poems data
            self.poems_data.extend(new_poems)
            
            # Generate embeddings for new poems
            texts = [f"{p.get('title', '')} {p.get('content', '')} {p.get('author', '')}" 
                    for p in new_poems]
            embeddings = self.model.encode(texts)
            embeddings = np.array(embeddings).astype('float32')
            
            # Normalize
            faiss.normalize_L2(embeddings)
            
            # Add to index
            if self.index is None:
                self.index = faiss.IndexFlatIP(self.dimension)
            
            self.index.add(embeddings)
            
            logger.info(f"✅ Index updated: now {self.index.ntotal} poems")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error updating index: {str(e)}")
            return False


# Global instance
semantic_engine = None


def get_semantic_engine():
    """Get or create global semantic search engine"""
    global semantic_engine
    if semantic_engine is None:
        semantic_engine = SemanticSearchEngine()
    return semantic_engine
