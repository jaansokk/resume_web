"""
OpenSearch Serverless client with SigV4 signing.
"""
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib
import hmac
import requests
from botocore.credentials import Credentials
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest


class OpenSearchClient:
    """Client for OpenSearch Serverless with SigV4 authentication."""
    
    def __init__(self):
        self.endpoint = os.environ.get(
            "OPENSEARCH_ENDPOINT",
            os.environ.get("AOSS_ENDPOINT", "")
        )
        if not self.endpoint:
            raise ValueError("Missing OPENSEARCH_ENDPOINT or AOSS_ENDPOINT")
        
        # Remove trailing slash
        self.endpoint = self.endpoint.rstrip("/")
        
        self.region = os.environ.get("AWS_REGION", "eu-central-1")
        self.service = os.environ.get("AOSS_SERVICE", "aoss")
        
        self.items_index = os.environ.get("OS_INDEX_ITEMS", "content_items_v1")
        self.chunks_index = os.environ.get("OS_INDEX_CHUNKS", "content_chunks_v1")
    
    def _get_credentials(self):
        """Get AWS credentials from environment or IAM role."""
        # Try environment variables first
        access_key = os.environ.get("AWS_ACCESS_KEY_ID")
        secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        session_token = os.environ.get("AWS_SESSION_TOKEN")
        
        if access_key and secret_key:
            return Credentials(
                access_key=access_key,
                secret_key=secret_key,
                token=session_token
            )
        
        # Fall back to boto3 default credential chain (IAM role)
        import boto3
        session = boto3.Session()
        credentials = session.get_credentials()
        if credentials:
            return credentials
        
        raise ValueError("No AWS credentials found")
    
    def _sign_request(self, method: str, path: str, body: str = "", headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """Sign request with SigV4."""
        url = f"{self.endpoint}{path}"
        request = AWSRequest(
            method=method,
            url=url,
            data=body.encode("utf-8") if body else None,
            headers=headers or {}
        )
        
        credentials = self._get_credentials()
        SigV4Auth(credentials, self.service, self.region).add_auth(request)
        
        return dict(request.headers)
    
    def _request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make signed request to OpenSearch."""
        body_str = json.dumps(body) if body else ""
        signed_headers = self._sign_request(method, path, body_str, headers)
        
        url = f"{self.endpoint}{path}"
        response = requests.request(
            method=method,
            url=url,
            headers=signed_headers,
            data=body_str.encode("utf-8") if body_str else None,
            timeout=30
        )
        
        if not response.ok:
            error_text = response.text[:1200]
            raise Exception(f"OpenSearch request failed ({response.status_code}): {error_text}")
        
        if response.content:
            return response.json()
        return {}
    
    def vector_search(self, embedding: List[float], k: int = 40, size: int = 40) -> List[Dict[str, Any]]:
        """
        Perform vector search in content_chunks_v1.
        
        Returns list of hit documents.
        """
        query = {
            "size": size,
            "query": {
                "knn": {
                    "embedding": {
                        "vector": embedding,
                        "k": k
                    }
                }
            }
        }
        
        result = self._request("POST", f"/{self.chunks_index}/_search", body=query)
        
        hits = result.get("hits", {}).get("hits", [])
        # Preserve score from hit metadata
        return [
            {**hit.get("_source", {}), "_score": hit.get("_score", 0.0)}
            for hit in hits
        ]
    
    def get_item(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get content item by slug from content_items_v1."""
        try:
            result = self._request("GET", f"/{self.items_index}/_doc/{slug}")
            return result.get("_source")
        except Exception:
            return None
    
    def validate_slugs(self, slugs: List[str]) -> List[str]:
        """
        Validate that slugs exist in content_items_v1 and are not background.
        Returns only valid, UI-visible slugs.
        """
        valid_slugs = []
        for slug in slugs:
            item = self.get_item(slug)
            if item and item.get("uiVisible", True) and item.get("type") != "background":
                valid_slugs.append(slug)
        return valid_slugs

