"""
Lambda handler for /chat endpoint.
Implements RAG flow per chat-api-rag-contract.md spec.
"""
import json
import os
import time
from typing import Dict, Any, List, Optional

from src.router import Router
from src.retrieval import RetrievalService
from src.answer import AnswerGenerator
from src.validation import validate_request, validate_response
from src.opensearch_client import OpenSearchClient
from src.openai_client import OpenAIClient


def get_env_var(name: str, default: Optional[str] = None) -> str:
    """Get required environment variable."""
    value = os.environ.get(name, default)
    if value is None:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def cors_headers(origin: Optional[str] = None) -> Dict[str, str]:
    """Generate CORS headers."""
    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
    allowed_origins = [o.strip() for o in allowed_origins if o.strip()]
    
    # If origin matches allowed list, use it; otherwise use first allowed or *
    if origin and origin in allowed_origins:
        allow_origin = origin
    elif allowed_origins:
        allow_origin = allowed_origins[0]
    else:
        allow_origin = "*"
    
    return {
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "3600",
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for POST /chat.
    
    Request format (per spec):
    {
        "conversationId": "uuid-v4",
        "client": {
            "origin": "https://...",
            "page": { "path": "/experience/guardtime", "activeSlug": "guardtime-po" }
        },
        "messages": [
            { "role": "system", "text": "..." },
            { "role": "user", "text": "..." },
            { "role": "assistant", "text": "..." }
        ]
    }
    """
    start_time = time.time()
    conversation_id = None
    
    try:
        # Handle OPTIONS preflight
        if event.get("httpMethod") == "OPTIONS":
            origin = event.get("headers", {}).get("origin") or event.get("headers", {}).get("Origin")
            return {
                "statusCode": 200,
                "headers": cors_headers(origin),
                "body": ""
            }
        
        # Parse request
        body = json.loads(event.get("body", "{}"))
        conversation_id = body.get("conversationId", "unknown")
        origin = body.get("client", {}).get("origin") or event.get("headers", {}).get("origin")
        
        # Validate request
        validate_request(body)
        
        # Initialize clients
        opensearch_client = OpenSearchClient()
        openai_client = OpenAIClient()
        
        # Initialize services
        router = Router(openai_client)
        retrieval_service = RetrievalService(opensearch_client, openai_client)
        answer_generator = AnswerGenerator(openai_client, opensearch_client)
        
        # Step 1: Router LLM call (classification, tone, retrieval query)
        router_start = time.time()
        router_output = router.process(body)
        router_latency = time.time() - router_start
        
        # Step 2: Retrieval (vector search)
        retrieval_start = time.time()
        retrieval_results = retrieval_service.retrieve(
            query_text=router_output.get("retrievalQuery") or body["messages"][-1]["text"],
            k=int(os.environ.get("RETRIEVAL_K", "40"))
        )
        retrieval_latency = time.time() - retrieval_start
        
        # Step 3: Answer LLM call (grounded generation)
        answer_start = time.time()
        response = answer_generator.generate(
            messages=body["messages"],
            router_output=router_output,
            retrieval_results=retrieval_results
        )
        answer_latency = time.time() - answer_start
        
        # Step 4: Validate and sanitize response
        validate_response(response)
        
        # Log observability metrics
        total_latency = time.time() - start_time
        print(json.dumps({
            "conversationId": conversation_id,
            "latency": {
                "total": round(total_latency, 3),
                "router": round(router_latency, 3),
                "retrieval": round(retrieval_latency, 3),
                "answer": round(answer_latency, 3),
            },
            "chunksRetrieved": len(retrieval_results.get("chunks", [])),
            "topSlugs": [r["slug"] for r in response.get("related", [])[:3]]
        }))
        
        return {
            "statusCode": 200,
            "headers": {
                **cors_headers(origin),
                "Content-Type": "application/json"
            },
            "body": json.dumps(response)
        }
        
    except ValueError as e:
        # Validation error
        return {
            "statusCode": 400,
            "headers": cors_headers(),
            "body": json.dumps({"error": str(e)})
        }
    except Exception as e:
        # Internal error
        print(f"Error in lambda_handler: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": "Internal server error"})
        }

