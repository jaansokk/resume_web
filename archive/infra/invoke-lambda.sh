#!/bin/bash
# Script to invoke the chat-api Lambda function for testing
# Uses AWS CLI to invoke the function directly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LAMBDA_NAME="${LAMBDA_NAME:-chat-api}"
REGION="${AWS_REGION:-eu-central-1}"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Function to create a test payload
create_test_payload() {
    local payload_type="$1"
    
    case "$payload_type" in
        "new_opportunity")
            cat <<EOF
{
  "conversationId": "test-$(date +%s)",
  "client": {
    "origin": "https://example.com",
    "page": {
      "path": "/experience",
      "activeSlug": null
    }
  },
  "messages": [
    {
      "role": "user",
      "text": "We're looking for a product manager with experience in B2B SaaS. Do you have relevant experience?"
    }
  ]
}
EOF
            ;;
        "general_talk")
            cat <<EOF
{
  "conversationId": "test-$(date +%s)",
  "client": {
    "origin": "https://example.com",
    "page": {
      "path": "/",
      "activeSlug": null
    }
  },
  "messages": [
    {
      "role": "user",
      "text": "Tell me about yourself"
    }
  ]
}
EOF
            ;;
        "conversation")
            cat <<EOF
{
  "conversationId": "test-$(date +%s)",
  "client": {
    "origin": "https://example.com",
    "page": {
      "path": "/experience/guardtime",
      "activeSlug": "guardtime-po"
    }
  },
  "messages": [
    {
      "role": "user",
      "text": "What's your experience with product management?"
    },
    {
      "role": "assistant",
      "text": "I have extensive experience in product management, particularly in B2B SaaS and data products."
    },
    {
      "role": "user",
      "text": "Can you tell me more about your work at Guardtime?"
    }
  ]
}
EOF
            ;;
        *)
            echo -e "${RED}Unknown payload type: $payload_type${NC}"
            echo "Available types: new_opportunity, general_talk, conversation"
            exit 1
            ;;
    esac
}

# Parse command line arguments
PAYLOAD_FILE=""
PAYLOAD_TYPE="new_opportunity"
FORMAT="json"

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            PAYLOAD_FILE="$2"
            shift 2
            ;;
        -t|--type)
            PAYLOAD_TYPE="$2"
            shift 2
            ;;
        -n|--name)
            LAMBDA_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -f, --file FILE      Use payload from JSON file"
            echo "  -t, --type TYPE      Use built-in payload type (new_opportunity, general_talk, conversation)"
            echo "  -n, --name NAME      Lambda function name (default: chat-api)"
            echo "  -r, --region REGION  AWS region (default: eu-central-1)"
            echo "  --format FORMAT      Output format: json, pretty (default: json)"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 -t new_opportunity"
            echo "  $0 -f my-payload.json"
            echo "  $0 -t conversation --format pretty"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Get payload
if [ -n "$PAYLOAD_FILE" ]; then
    if [ ! -f "$PAYLOAD_FILE" ]; then
        echo -e "${RED}Error: Payload file not found: $PAYLOAD_FILE${NC}"
        exit 1
    fi
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    echo -e "${BLUE}Using payload from file: $PAYLOAD_FILE${NC}"
else
    PAYLOAD=$(create_test_payload "$PAYLOAD_TYPE")
    echo -e "${BLUE}Using built-in payload type: $PAYLOAD_TYPE${NC}"
fi

# Validate JSON
if ! echo "$PAYLOAD" | python3 -m json.tool > /dev/null 2>&1; then
    echo -e "${RED}Error: Invalid JSON payload${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Invoking Lambda function: $LAMBDA_NAME${NC}"
echo "Region: $REGION"
echo ""

# Create temporary file for payload
TEMP_PAYLOAD=$(mktemp)
echo "$PAYLOAD" > "$TEMP_PAYLOAD"

# Invoke Lambda
echo -e "${YELLOW}Invoking function...${NC}"
START_TIME=$(date +%s%N)

# Create temp file for response
TEMP_RESPONSE=$(mktemp)

aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    --payload "file://$TEMP_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    "$TEMP_RESPONSE" 2>&1 | grep -v "ExecutedVersion" || true

END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

# Parse response
RESPONSE=$(cat "$TEMP_RESPONSE")
rm -f "$TEMP_PAYLOAD" "$TEMP_RESPONSE"

# Check for function error
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if (d.get('errorMessage') or d.get('errorType')) else 1)" 2>/dev/null; then
    echo -e "${RED}✗ Function error occurred${NC}"
    echo ""
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Extract response body (Lambda returns JSON with 'body' field for API Gateway format)
RESPONSE_BODY=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('body', json.dumps(d)))" 2>/dev/null || echo "$RESPONSE")

# Format output
echo -e "${GREEN}✓ Function invoked successfully${NC}"
echo "Duration: ${DURATION}ms"
echo ""

if [ "$FORMAT" = "pretty" ]; then
    echo -e "${YELLOW}Response:${NC}"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
else
    echo "$RESPONSE_BODY"
fi

# Check for errors in response
if echo "$RESPONSE_BODY" | grep -q '"error"'; then
    echo ""
    echo -e "${RED}⚠ Response contains an error${NC}"
    exit 1
fi

