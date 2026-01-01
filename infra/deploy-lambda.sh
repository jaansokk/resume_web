#!/bin/bash
# Deployment script for chat-api Lambda function
# Uses AWS CLI to create/update Lambda and API Gateway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load .env file if it exists (from infra directory)
SCRIPT_DIR_TEMP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR_TEMP/.env" ]; then
    echo -e "${GREEN}Loading environment variables from .env${NC}"
    set -a  # automatically export all variables
    source "$SCRIPT_DIR_TEMP/.env"
    set +a
fi

# Configuration (override with environment variables or command line args)
LAMBDA_NAME="${LAMBDA_NAME:-chat-api}"
LAMBDA_ROLE_NAME="${LAMBDA_ROLE_NAME:-chat-api-lambda-role}"
REGION="${AWS_REGION:-eu-central-1}"
RUNTIME="${LAMBDA_RUNTIME:-python3.12}"
TIMEOUT="${LAMBDA_TIMEOUT:-60}"
MEMORY="${LAMBDA_MEMORY:-512}"
HANDLER="${LAMBDA_HANDLER:-lambda_handler.lambda_handler}"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LAMBDA_DIR="$REPO_ROOT/chat-api-lambda"
BUILD_DIR="$SCRIPT_DIR/build"
ZIP_FILE="$BUILD_DIR/lambda-deployment.zip"

# Create build directory
mkdir -p "$BUILD_DIR"

echo -e "${GREEN}Deploying Lambda function: $LAMBDA_NAME${NC}"
echo "Region: $REGION"
echo "Runtime: $RUNTIME"
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check we're in the right directory structure
if [ ! -d "$LAMBDA_DIR" ]; then
    echo -e "${RED}Error: Lambda directory not found: $LAMBDA_DIR${NC}"
    exit 1
fi

# Step 1: Create deployment package
echo -e "${YELLOW}Step 1: Creating deployment package...${NC}"

# Clean up old build artifacts
rm -rf "$BUILD_DIR/lambda-package"
mkdir -p "$BUILD_DIR/lambda-package"

# Store original working directory to ensure we don't accidentally modify source
ORIGINAL_DIR=$(pwd)

# Copy Lambda source files
echo "Copying Lambda source files..."
# Copy all files including hidden ones (using . to include hidden files)
shopt -s dotglob nullglob
cp -r "$LAMBDA_DIR"/. "$BUILD_DIR/lambda-package/" 2>/dev/null || true
shopt -u dotglob nullglob
# Remove build artifacts that shouldn't be in the package
rm -rf "$BUILD_DIR/lambda-package"/__pycache__ 2>/dev/null || true
rm -rf "$BUILD_DIR/lambda-package"/*.pyc 2>/dev/null || true
rm -rf "$BUILD_DIR/lambda-package"/.git 2>/dev/null || true
rm -f "$BUILD_DIR/lambda-package"/*.zip 2>/dev/null || true

# Install dependencies into build directory
PACKAGE_DIR="$BUILD_DIR/lambda-package"
echo "Installing Python dependencies to: $PACKAGE_DIR"

# Check if Docker is available for proper Lambda-compatible builds
if command -v docker &> /dev/null; then
    echo "Using Docker to build Lambda-compatible dependencies..."
    # Use AWS Lambda Python base image to install dependencies
    # This ensures C extensions are compiled for the correct platform (Amazon Linux 2)
    # Force x86_64 platform to match Lambda's default architecture
    docker run --rm \
        --platform linux/amd64 \
        --entrypoint "" \
        -v "$PACKAGE_DIR":/var/task \
        public.ecr.aws/lambda/python:3.12 \
        pip install -r /var/task/requirements.txt -t /var/task --quiet --no-cache-dir
else
    echo -e "${YELLOW}Warning: Docker not found. Installing with local pip (may not work if packages have C extensions)${NC}"
    echo "For production deployments, install Docker to ensure Lambda compatibility."
    cd "$PACKAGE_DIR"
    # Fallback to local pip with platform-specific wheels
    pip install -r "$PACKAGE_DIR/requirements.txt" -t "$PACKAGE_DIR" \
        --platform manylinux2014_x86_64 \
        --only-binary=:all: \
        --python-version 3.12 \
        --implementation cp \
        --quiet --disable-pip-version-check --no-cache-dir || \
    pip install -r "$PACKAGE_DIR/requirements.txt" -t "$PACKAGE_DIR" \
        --quiet --disable-pip-version-check --no-cache-dir
    cd "$ORIGINAL_DIR"
fi

# Verify installation happened in the right place
if [ ! -d "$PACKAGE_DIR/openai" ]; then
    echo -e "${YELLOW}Warning: Dependencies may not have installed correctly${NC}"
fi

# Create zip (exclude unnecessary files)
echo "Creating zip package..."
rm -f "$ZIP_FILE"
cd "$BUILD_DIR/lambda-package"
zip -r "$ZIP_FILE" . \
    -x "*.git*" \
    -x "*.pyc" \
    -x "__pycache__/*" \
    -x "*.zip" \
    -x "*.md" \
    -x ".gitignore" \
    -x "test_*.py" \
    -x "*.test.py" \
    -x "*.dist-info/*" \
    -x "*.egg-info/*" \
    > /dev/null
cd "$ORIGINAL_DIR"

ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
echo -e "${GREEN}✓ Package created: $ZIP_FILE ($ZIP_SIZE)${NC}"
echo ""

# Step 2: Create IAM role if it doesn't exist
echo -e "${YELLOW}Step 2: Setting up IAM role...${NC}"
ROLE_ARN=""

# Check if role exists
if aws iam get-role --role-name "$LAMBDA_ROLE_NAME" --region "$REGION" &> /dev/null; then
    echo "Role $LAMBDA_ROLE_NAME already exists"
    ROLE_ARN=$(aws iam get-role --role-name "$LAMBDA_ROLE_NAME" --region "$REGION" --query 'Role.Arn' --output text)
else
    echo "Creating IAM role: $LAMBDA_ROLE_NAME"
    
    # Create trust policy for Lambda
    cat > /tmp/lambda-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create role
    aws iam create-role \
        --role-name "$LAMBDA_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
        --region "$REGION" \
        --description "Role for chat-api Lambda function"
    
    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name "$LAMBDA_ROLE_NAME" \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --region "$REGION"
    
    # Wait for role to be available
    echo "Waiting for role to be available..."
    sleep 5
    
    ROLE_ARN=$(aws iam get-role --role-name "$LAMBDA_ROLE_NAME" --region "$REGION" --query 'Role.Arn' --output text)
fi

echo -e "${GREEN}✓ Using role: $ROLE_ARN${NC}"
echo ""

# Step 3: Create or update Lambda function
echo -e "${YELLOW}Step 3: Creating/updating Lambda function...${NC}"

# Check if function exists
if aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" &> /dev/null; then
    echo "Updating existing function: $LAMBDA_NAME"
    aws lambda update-function-code \
        --function-name "$LAMBDA_NAME" \
        --zip-file "fileb://$ZIP_FILE" \
        --region "$REGION" \
        --output json > /dev/null
    
    echo "Waiting for update to complete..."
    aws lambda wait function-updated \
        --function-name "$LAMBDA_NAME" \
        --region "$REGION"
    
    echo "Updating function configuration..."
    aws lambda update-function-configuration \
        --function-name "$LAMBDA_NAME" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY" \
        --handler "$HANDLER" \
        --region "$REGION" \
        --output json > /dev/null
    
    echo "Waiting for configuration update to complete..."
    aws lambda wait function-updated \
        --function-name "$LAMBDA_NAME" \
        --region "$REGION"
    
    echo -e "${GREEN}✓ Function updated${NC}"
else
    echo "Creating new function: $LAMBDA_NAME"
    aws lambda create-function \
        --function-name "$LAMBDA_NAME" \
        --runtime "$RUNTIME" \
        --role "$ROLE_ARN" \
        --handler "$HANDLER" \
        --zip-file "fileb://$ZIP_FILE" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY" \
        --region "$REGION" \
        --output json > /dev/null
    
    echo "Waiting for function to be active..."
    aws lambda wait function-active \
        --function-name "$LAMBDA_NAME" \
        --region "$REGION"
    
    echo -e "${GREEN}✓ Function created${NC}"
fi
echo ""

# Step 4: Set environment variables
echo -e "${YELLOW}Step 4: Setting environment variables...${NC}"

# Create temporary JSON file for environment variables
# Using a file with proper JSON escaping avoids shell quoting issues
ENV_FILE=$(mktemp)

# Use jq if available for proper JSON escaping, otherwise use Python
if command -v jq &> /dev/null; then
    # Use jq with --arg to properly escape all values
    jq -n \
        --arg openai_key "${OPENAI_API_KEY:-}" \
        --arg chat_model "${OPENAI_CHAT_MODEL:-gpt-4o-mini}" \
        --arg router_model "${OPENAI_ROUTER_MODEL:-gpt-5-nano}" \
        --arg router_effort "${OPENAI_ROUTER_EFFORT:-low}" \
        --arg router_verbosity "${OPENAI_ROUTER_VERBOSITY:-low}" \
        --arg answer_effort "${OPENAI_ANSWER_EFFORT:-}" \
        --arg answer_verbosity "${OPENAI_ANSWER_VERBOSITY:-}" \
        --arg embed_model "${OPENAI_EMBED_MODEL:-text-embedding-3-small}" \
        --arg embed_dim "${EMBEDDING_DIM:-1536}" \
        --arg opensearch_endpoint "${OPENSEARCH_ENDPOINT:-${AOSS_ENDPOINT:-}}" \
        --arg items_index "${OS_INDEX_ITEMS:-content_items_v1}" \
        --arg chunks_index "${OS_INDEX_CHUNKS:-content_chunks_v1}" \
        --arg allowed_origins "${ALLOWED_ORIGINS:-*}" \
        --arg retrieval_k "${RETRIEVAL_K:-40}" \
        --arg max_bg_chunks "${MAX_BACKGROUND_CHUNKS:-2}" \
        --arg max_main_chunks "${MAX_MAIN_CHUNKS:-10}" \
        '{
          Variables: {
            OPENAI_API_KEY: $openai_key,
            OPENAI_CHAT_MODEL: $chat_model,
            OPENAI_ROUTER_MODEL: $router_model,
            OPENAI_ROUTER_EFFORT: $router_effort,
            OPENAI_ROUTER_VERBOSITY: $router_verbosity,
            OPENAI_ANSWER_EFFORT: $answer_effort,
            OPENAI_ANSWER_VERBOSITY: $answer_verbosity,
            OPENAI_EMBED_MODEL: $embed_model,
            EMBEDDING_DIM: $embed_dim,
            OPENSEARCH_ENDPOINT: $opensearch_endpoint,
            OS_INDEX_ITEMS: $items_index,
            OS_INDEX_CHUNKS: $chunks_index,
            ALLOWED_ORIGINS: $allowed_origins,
            RETRIEVAL_K: $retrieval_k,
            MAX_BACKGROUND_CHUNKS: $max_bg_chunks,
            MAX_MAIN_CHUNKS: $max_main_chunks
          }
        }' > "$ENV_FILE"
elif command -v python3 &> /dev/null; then
    # Fallback to Python for JSON escaping (more reliable than shell)
    python3 <<PYTHON_EOF > "$ENV_FILE"
import json
import os

env_vars = {
    "Variables": {
        "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY", ""),
        "OPENAI_CHAT_MODEL": os.environ.get("OPENAI_CHAT_MODEL", "gpt-5-mini"),
        "OPENAI_ROUTER_MODEL": os.environ.get("OPENAI_ROUTER_MODEL", "gpt-5-nano"),
        "OPENAI_ROUTER_EFFORT": os.environ.get("OPENAI_ROUTER_EFFORT", "low"),
        "OPENAI_ROUTER_VERBOSITY": os.environ.get("OPENAI_ROUTER_VERBOSITY", "low"),
        "OPENAI_ANSWER_EFFORT": os.environ.get("OPENAI_ANSWER_EFFORT", "low"),
        "OPENAI_ANSWER_VERBOSITY": os.environ.get("OPENAI_ANSWER_VERBOSITY", "medium"),
        "OPENAI_EMBED_MODEL": os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
        "EMBEDDING_DIM": os.environ.get("EMBEDDING_DIM", "1536"),
        "OPENSEARCH_ENDPOINT": os.environ.get("OPENSEARCH_ENDPOINT") or os.environ.get("AOSS_ENDPOINT", ""),
        "OS_INDEX_ITEMS": os.environ.get("OS_INDEX_ITEMS", "content_items_v1"),
        "OS_INDEX_CHUNKS": os.environ.get("OS_INDEX_CHUNKS", "content_chunks_v1"),
        "ALLOWED_ORIGINS": os.environ.get("ALLOWED_ORIGINS", "*"),
        "RETRIEVAL_K": os.environ.get("RETRIEVAL_K", "40"),
        "MAX_BACKGROUND_CHUNKS": os.environ.get("MAX_BACKGROUND_CHUNKS", "2"),
        "MAX_MAIN_CHUNKS": os.environ.get("MAX_MAIN_CHUNKS", "10")
    }
}
print(json.dumps(env_vars))
PYTHON_EOF
else
    # Last resort: basic escaping (may fail with special characters)
    escape_json() {
        printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
    }
    cat > "$ENV_FILE" <<EOF
{
  "Variables": {
    "OPENAI_API_KEY": "$(escape_json "${OPENAI_API_KEY:-}")",
    "OPENAI_CHAT_MODEL": "$(escape_json "${OPENAI_CHAT_MODEL:-gpt-5-mini}")",
    "OPENAI_ROUTER_MODEL": "$(escape_json "${OPENAI_ROUTER_MODEL:-gpt-5-nano}")",
    "OPENAI_ROUTER_EFFORT": "$(escape_json "${OPENAI_ROUTER_EFFORT:-low}")",
    "OPENAI_ROUTER_VERBOSITY": "$(escape_json "${OPENAI_ROUTER_VERBOSITY:-low}")",
    "OPENAI_ANSWER_EFFORT": "$(escape_json "${OPENAI_ANSWER_EFFORT:-low}")",
    "OPENAI_ANSWER_VERBOSITY": "$(escape_json "${OPENAI_ANSWER_VERBOSITY:-medium}")",
    "OPENAI_EMBED_MODEL": "$(escape_json "${OPENAI_EMBED_MODEL:-text-embedding-3-small}")",
    "EMBEDDING_DIM": "$(escape_json "${EMBEDDING_DIM:-1536}")",
    "OPENSEARCH_ENDPOINT": "$(escape_json "${OPENSEARCH_ENDPOINT:-${AOSS_ENDPOINT:-}}")",
    "OS_INDEX_ITEMS": "$(escape_json "${OS_INDEX_ITEMS:-content_items_v1}")",
    "OS_INDEX_CHUNKS": "$(escape_json "${OS_INDEX_CHUNKS:-content_chunks_v1}")",
    "ALLOWED_ORIGINS": "$(escape_json "${ALLOWED_ORIGINS:-*}")",
    "RETRIEVAL_K": "$(escape_json "${RETRIEVAL_K:-40}")",
    "MAX_BACKGROUND_CHUNKS": "$(escape_json "${MAX_BACKGROUND_CHUNKS:-2}")",
    "MAX_MAIN_CHUNKS": "$(escape_json "${MAX_MAIN_CHUNKS:-10}")"
  }
}
EOF
fi

aws lambda update-function-configuration \
    --function-name "$LAMBDA_NAME" \
    --environment "file://$ENV_FILE" \
    --region "$REGION" \
    --output json > /dev/null

# Cleanup
rm -f "$ENV_FILE"

echo -e "${GREEN}✓ Environment variables set${NC}"
echo ""

# Step 5: Add OpenSearch permissions (if needed)
echo -e "${YELLOW}Step 5: Checking OpenSearch permissions...${NC}"
echo "Note: You may need to add OpenSearch Serverless access policy to the role manually."
echo "The role needs permissions to access your OpenSearch Serverless collection."
echo ""

# Step 6: Get function ARN
FUNCTION_ARN=$(aws lambda get-function \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    --query 'Configuration.FunctionArn' \
    --output text)

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Function ARN: $FUNCTION_ARN"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Add OpenSearch Serverless access policy to role: $LAMBDA_ROLE_NAME"
echo "2. Set up API Gateway to expose this Lambda (see deploy-api-gateway.sh)"
echo "3. Test the function: ./invoke-lambda.sh"
echo ""

# Cleanup
rm -f /tmp/lambda-trust-policy.json
echo "Build artifacts are in: $BUILD_DIR"
echo "You can safely delete this directory after deployment if needed."

