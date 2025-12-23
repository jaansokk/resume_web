"""
Retrieval service: vector search and post-processing.
"""
import os
from typing import Dict, Any, List
from src.opensearch_client import OpenSearchClient
from src.openai_client import OpenAIClient


class RetrievalService:
    """Service for retrieving relevant chunks from OpenSearch."""
    
    def __init__(self, opensearch_client: OpenSearchClient, openai_client: OpenAIClient):
        self.opensearch = opensearch_client
        self.openai = openai_client
        
        self.max_background_chunks = int(os.environ.get("MAX_BACKGROUND_CHUNKS", "2"))
        self.max_main_chunks = int(os.environ.get("MAX_MAIN_CHUNKS", "10"))
    
    def retrieve(self, query_text: str, k: int = 40) -> Dict[str, Any]:
        """
        Retrieve relevant chunks using vector search.
        
        Returns:
            {
                "chunks": [
                    {
                        "type": "experience" | "project" | "background",
                        "slug": "...",
                        "chunkId": int,
                        "section": "...",
                        "text": "...",
                        "score": float
                    }
                ],
                "relatedSlugs": ["slug1", "slug2", ...]  # Top 3-6 experience/project slugs
            }
        """
        # Generate embedding
        query_embedding = self.openai.embed(query_text)
        
        # Vector search
        hits = self.opensearch.vector_search(query_embedding, k=k, size=k)
        
        # Post-process: split by type and apply caps
        background_chunks = []
        main_chunks = []
        
        for hit in hits:
            chunk = {
                "type": hit.get("type", "experience"),
                "slug": hit.get("slug", ""),
                "chunkId": hit.get("chunkId", 0),
                "section": hit.get("section", ""),
                "text": hit.get("text", ""),
                "score": hit.get("_score", 0.0)  # Score from OpenSearch hit metadata
            }
            
            if chunk["type"] == "background":
                background_chunks.append(chunk)
            else:
                main_chunks.append(chunk)
        
        # Apply caps
        background_chunks = background_chunks[:self.max_background_chunks]
        main_chunks = main_chunks[:self.max_main_chunks]
        
        # Compute related slugs (only from experience/project)
        related_slugs = self._compute_related_slugs(main_chunks)
        
        return {
            "chunks": main_chunks + background_chunks,  # Main first, then background
            "relatedSlugs": related_slugs
        }
    
    def _compute_related_slugs(self, chunks: List[Dict[str, Any]]) -> List[str]:
        """
        Compute top 3-6 related slugs from chunk hits.
        Groups by slug, ranks by hit count/score, returns top slugs.
        """
        # Group by slug and aggregate scores
        slug_scores = {}
        for chunk in chunks:
            slug = chunk.get("slug", "")
            if not slug or chunk.get("type") == "background":
                continue
            
            if slug not in slug_scores:
                slug_scores[slug] = {"count": 0, "maxScore": 0.0}
            
            slug_scores[slug]["count"] += 1
            score = chunk.get("score", 0.0)
            if score > slug_scores[slug]["maxScore"]:
                slug_scores[slug]["maxScore"] = score
        
        # Sort by count (primary) and maxScore (secondary)
        sorted_slugs = sorted(
            slug_scores.items(),
            key=lambda x: (x[1]["count"], x[1]["maxScore"]),
            reverse=True
        )
        
        # Take top 3-6 slugs
        top_slugs = [slug for slug, _ in sorted_slugs[:6]]
        
        # Validate slugs exist and are UI-visible
        valid_slugs = self.opensearch.validate_slugs(top_slugs)
        
        return valid_slugs

