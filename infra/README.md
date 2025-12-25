# Infrastructure Deployment Scripts

Scripts for deploying and testing the chat-api Lambda function using AWS CLI.

## Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws --version
   aws configure
   ```

2. **Docker installed** (required for building Lambda dependencies)
   ```bash
   docker --version
   ```
   
   The deployment script uses Docker to build Python dependencies for Lambda's Amazon Linux environment. This ensures packages with C extensions (like `pydantic_core`) are compiled for the correct platform.

3. **Required environment variables** (set before running scripts):
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   export OPENSEARCH_ENDPOINT="https://your-opensearch-endpoint.aoss.amazonaws.com"
   export AWS_REGION="eu-central-1"  # Optional, defaults to eu-central-1
   export ALLOWED_ORIGINS="https://your-vps-domain.com"  # Optional, defaults to *
   ```

3. **AWS credentials** with permissions for:
   - Lambda (create/update functions, invoke)
   - IAM (create roles, attach policies)
   - API Gateway (create/update APIs, deploy)
   - OpenSearch Serverless (read access - configure separately)

## Scripts

### 1. `deploy-lambda.sh` - Deploy Lambda Function

Creates or updates the Lambda function with all dependencies.

```bash
# Basic usage
./deploy-lambda.sh

# With custom configuration
export LAMBDA_NAME="my-chat-api"
export LAMBDA_MEMORY=1024
export LAMBDA_TIMEOUT=120
./deploy-lambda.sh
```

**What it does:**
- Uses Docker to build Lambda-compatible dependencies (Python packages compiled for Amazon Linux x86_64)
- Creates deployment package (zip file) in `build/` directory
- Creates IAM role if needed
- Creates/updates Lambda function
- Sets environment variables
- Configures timeout and memory

**Note:** Build artifacts are created in `infra/build/` directory and are ignored by git (see `.gitignore`). The script uses the official AWS Lambda Python Docker image to ensure all dependencies (especially those with C extensions) are compiled for the correct platform.

**Configuration options:**
- `LAMBDA_NAME` - Function name (default: `chat-api`)
- `LAMBDA_ROLE_NAME` - IAM role name (default: `chat-api-lambda-role`)
- `LAMBDA_RUNTIME` - Python runtime (default: `python3.12`)
- `LAMBDA_TIMEOUT` - Timeout in seconds (default: `60`)
- `LAMBDA_MEMORY` - Memory in MB (default: `512`)

### 2. `invoke-lambda.sh` - Test Lambda Function

Invokes the Lambda function directly for testing.

```bash
# Use built-in test payload
./invoke-lambda.sh -t new_opportunity

# Use custom payload file
./invoke-lambda.sh -f my-test-payload.json

# Pretty print output
./invoke-lambda.sh -t conversation --format pretty
```

**Built-in payload types:**
- `new_opportunity` - Test hiring/opportunity classification
- `general_talk` - Test general conversation
- `conversation` - Test multi-turn conversation

**Options:**
- `-f, --file FILE` - Use payload from JSON file
- `-t, --type TYPE` - Use built-in payload type
- `-n, --name NAME` - Lambda function name
- `-r, --region REGION` - AWS region
- `--format FORMAT` - Output format: `json` or `pretty`

### 3. `deploy-api-gateway.sh` - Set up API Gateway

Creates REST API Gateway with `/chat` endpoint.

```bash
# Basic usage
./deploy-api-gateway.sh

# With custom configuration
export API_NAME="my-chat-api"
export API_STAGE="dev"
./deploy-api-gateway.sh
```

**What it does:**
- Creates REST API
- Creates `/chat` resource
- Configures POST method
- Sets up Lambda integration
- Adds Lambda permissions
- Deploys to stage
- Configures CORS

**Configuration options:**
- `API_NAME` - API name (default: `chat-api`)
- `API_STAGE` - Deployment stage (default: `prod`)
- `LAMBDA_NAME` - Lambda function name (default: `chat-api`)

## Deployment Workflow

1. **Deploy Lambda:**
   ```bash
   cd infra
   ./deploy-lambda.sh
   ```

2. **Set up OpenSearch permissions:**
   - Go to AWS Console → IAM → Roles
   - Find `chat-api-lambda-role`
   - Add inline policy for OpenSearch Serverless access:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "aoss:APIAccessAll"
           ],
           "Resource": "arn:aws:aoss:REGION:ACCOUNT:collection/COLLECTION_ID"
         }
       ]
     }
     ```

3. **Deploy API Gateway:**
   ```bash
   ./deploy-api-gateway.sh
   ```

4. **Test:**
   ```bash
   # Test Lambda directly
   ./invoke-lambda.sh -t new_opportunity
   
   # Test via API Gateway
   curl -X POST https://API_ID.execute-api.REGION.amazonaws.com/prod/chat \
     -H 'Content-Type: application/json' \
     -d '{"conversationId": "test", "messages": [{"role": "user", "text": "Hello"}]}'
   ```

## Environment Variables

Set these before deployment:

**Required:**
- `OPENAI_API_KEY` - OpenAI API key
- `OPENSEARCH_ENDPOINT` or `AOSS_ENDPOINT` - OpenSearch Serverless endpoint

**Optional:**
- `OPENAI_CHAT_MODEL` - Chat model (default: `gpt-4o-mini`)
- `OPENAI_EMBED_MODEL` - Embedding model (default: `text-embedding-3-small`)
- `EMBEDDING_DIM` - Embedding dimension (default: `1536`)
- `ALLOWED_ORIGINS` - CORS allowed origins (default: `*`)
- `AWS_REGION` - AWS region (default: `eu-central-1`)

## Troubleshooting

### Lambda deployment fails
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM permissions
- Check zip file size (must be < 50MB uncompressed, < 250MB compressed)

### Lambda invocation fails
- Check function exists: `aws lambda get-function --function-name chat-api`
- Check environment variables are set
- Check CloudWatch logs: `aws logs tail /aws/lambda/chat-api --follow`

### API Gateway returns 502
- Check Lambda function is working: `./invoke-lambda.sh`
- Check Lambda permissions for API Gateway
- Check API Gateway logs in CloudWatch

### OpenSearch access denied
- Verify IAM role has OpenSearch Serverless permissions
- Check collection access policy allows the role
- Verify endpoint URL is correct

## Notes

- The scripts use `python3` for JSON validation (should be available on most systems)
- Deployment packages are created in the `infra/` directory
- IAM roles are created with basic Lambda execution permissions
- OpenSearch permissions must be added manually (see step 2 above)

