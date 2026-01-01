# Chat API Lambda

Lambda function for `/chat` endpoint implementing RAG flow per `chat-api-rag-contract.md` spec.

## Structure

- `lambda_handler.py` - Main Lambda entry point
- `src/` - Source modules:
  - `opensearch_client.py` - OpenSearch Serverless client with SigV4 signing
  - `openai_client.py` - OpenAI API client (embeddings + chat)
  - `router.py` - Router LLM call (classification, tone, retrieval query)
  - `retrieval.py` - Vector search and post-processing
  - `answer.py` - Grounded answer generation
  - `validation.py` - Request/response validation

## Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key
- `OPENSEARCH_ENDPOINT` or `AOSS_ENDPOINT` - OpenSearch Serverless endpoint URL
- `AWS_REGION` - AWS region (default: `eu-central-1`)

Optional:
- `OPENAI_CHAT_MODEL` - Chat model (default: `gpt-4o-mini`)
- `OPENAI_ROUTER_MODEL` - Router model used only for routing/classification (default: `gpt-5-nano`)
- `OPENAI_ROUTER_EFFORT` - Router reasoning effort (default: `low`)
- `OPENAI_ROUTER_VERBOSITY` - Router text verbosity (default: `low`)
- `OPENAI_ANSWER_EFFORT` - Answer reasoning effort (optional; if set, use Responses API for answer call)
- `OPENAI_ANSWER_VERBOSITY` - Answer text verbosity (optional; if set, use Responses API for answer call)
- `OPENAI_EMBED_MODEL` - Embedding model (default: `text-embedding-3-small`)
- `EMBEDDING_DIM` - Embedding dimension (default: `1536`)
- `OS_INDEX_ITEMS` - Items index name (default: `content_items_v1`)
- `OS_INDEX_CHUNKS` - Chunks index name (default: `content_chunks_v1`)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `RETRIEVAL_K` - Number of chunks to retrieve (default: `40`)
- `MAX_BACKGROUND_CHUNKS` - Max background chunks in context (default: `2`)
- `MAX_MAIN_CHUNKS` - Max experience/project chunks in context (default: `10`)

## AWS Credentials

The Lambda uses AWS credentials from:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`)
2. IAM role credentials (when running in Lambda)

For local testing, set environment variables or use AWS credentials file.

## Deployment

1. Install dependencies:
```bash
pip install -r requirements.txt -t .
```

2. Create deployment package:
```bash
zip -r lambda-deployment.zip . -x "*.git*" "*.pyc" "__pycache__/*"
```

3. Deploy via AWS CLI, CDK, or Terraform (see `infra/` directory).

## Testing

Test locally with AWS SAM or by invoking the handler directly:

```python
from lambda_handler import lambda_handler

event = {
    "httpMethod": "POST",
    "body": json.dumps({
        "conversationId": "test-123",
        "client": {"origin": "https://example.com"},
        "messages": [
            {"role": "user", "text": "Tell me about your PM experience"}
        ]
    })
}

response = lambda_handler(event, None)
```

## API Contract

See `_specs/chat-api-rag-contract.md` for full API contract and RAG flow details.

