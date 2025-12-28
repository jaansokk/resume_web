#!/bin/bash
# Script to set up API Gateway for the chat-api Lambda function
# Creates REST API with /chat endpoint

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LAMBDA_NAME="${LAMBDA_NAME:-chat-api}"
API_NAME="${API_NAME:-chat-api}"
REGION="${AWS_REGION:-eu-central-1}"
STAGE="${API_STAGE:-prod}"

echo -e "${GREEN}Setting up API Gateway for Lambda: $LAMBDA_NAME${NC}"
echo "Region: $REGION"
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    --query 'Configuration.FunctionArn' \
    --output text 2>/dev/null)

if [ -z "$LAMBDA_ARN" ]; then
    echo -e "${RED}Error: Lambda function not found: $LAMBDA_NAME${NC}"
    echo "Please deploy the Lambda first using deploy-lambda.sh"
    exit 1
fi

echo "Lambda ARN: $LAMBDA_ARN"
echo ""

# Step 1: Create or get REST API
echo -e "${YELLOW}Step 1: Creating/getting REST API...${NC}"

API_ID=$(aws apigateway get-rest-apis \
    --region "$REGION" \
    --query "items[?name=='$API_NAME'].id" \
    --output text 2>/dev/null)

if [ -z "$API_ID" ]; then
    echo "Creating REST API: $API_NAME"
    API_ID=$(aws apigateway create-rest-api \
        --name "$API_NAME" \
        --region "$REGION" \
        --description "API Gateway for chat-api Lambda" \
        --endpoint-configuration types=REGIONAL \
        --query 'id' \
        --output text)
    echo -e "${GREEN}✓ API created: $API_ID${NC}"
else
    echo "Using existing API: $API_ID"
fi
echo ""

# Step 2: Get root resource ID
echo -e "${YELLOW}Step 2: Getting root resource...${NC}"
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --query 'items[?path==`/`].id' \
    --output text)
echo "Root resource ID: $ROOT_RESOURCE_ID"
echo ""

# Step 3: Create /chat resource if it doesn't exist
echo -e "${YELLOW}Step 3: Creating /chat resource...${NC}"
CHAT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --query "items[?path=='/chat'].id" \
    --output text 2>/dev/null)

if [ -z "$CHAT_RESOURCE_ID" ]; then
    echo "Creating /chat resource"
    CHAT_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id "$API_ID" \
        --region "$REGION" \
        --parent-id "$ROOT_RESOURCE_ID" \
        --path-part "chat" \
        --query 'id' \
        --output text)
    echo -e "${GREEN}✓ Resource created${NC}"
else
    echo "Resource already exists"
fi
echo ""

# Step 4: Create POST method
echo -e "${YELLOW}Step 4: Creating POST method...${NC}"
aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --resource-id "$CHAT_RESOURCE_ID" \
    --http-method POST \
    --authorization-type NONE \
    --no-api-key-required \
    > /dev/null 2>&1 || echo "Method may already exist"

echo -e "${GREEN}✓ POST method configured${NC}"
echo ""

# Step 5: Set up Lambda integration
echo -e "${YELLOW}Step 5: Setting up Lambda integration...${NC}"
aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --resource-id "$CHAT_RESOURCE_ID" \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    > /dev/null

echo -e "${GREEN}✓ Integration configured${NC}"
echo ""

# Step 6: Add Lambda permission for API Gateway
echo -e "${YELLOW}Step 6: Adding Lambda permission...${NC}"

# Get AWS account ID for proper ARN construction
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${YELLOW}Warning: Could not get AWS account ID. Skipping permission.${NC}"
    echo "You may need to add Lambda permission manually or the integration may not work."
else
    # Construct proper source ARN with account ID
    # Format: arn:aws:execute-api:region:account-id:api-id/*/*
    SOURCE_ARN="arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*"
    
    # Check if permission already exists by checking the policy
    POLICY_EXISTS=$(aws lambda get-policy \
        --function-name "$LAMBDA_NAME" \
        --region "$REGION" \
        --query "Policy" \
        --output text 2>/dev/null | grep -q "$API_ID" && echo "yes" || echo "no")
    
    if [ "$POLICY_EXISTS" = "no" ]; then
        STATEMENT_ID="api-gateway-$(date +%s)"
        if aws lambda add-permission \
            --function-name "$LAMBDA_NAME" \
            --region "$REGION" \
            --statement-id "$STATEMENT_ID" \
            --action lambda:InvokeFunction \
            --principal apigateway.amazonaws.com \
            --source-arn "$SOURCE_ARN" \
            > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Permission added${NC}"
        else
            echo -e "${YELLOW}Note: Permission may already exist or there was an error${NC}"
            echo "This is usually safe to ignore if the integration works."
        fi
    else
        echo "Permission already exists"
    fi
fi
echo ""

# Step 7: Enable CORS (OPTIONS preflight)
# IMPORTANT: Any method changes require a (re)deployment to the stage to take effect on the public URL.
echo -e "${YELLOW}Step 7: Configuring CORS (OPTIONS)...${NC}"
# Note: CORS is handled by Lambda response headers, but we can also add OPTIONS method
aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --resource-id "$CHAT_RESOURCE_ID" \
    --http-method OPTIONS \
    --authorization-type NONE \
    --no-api-key-required \
    > /dev/null 2>&1 || echo "OPTIONS method may already exist"

# Mock integration for OPTIONS (Lambda handles CORS in response)
aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --resource-id "$CHAT_RESOURCE_ID" \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    > /dev/null 2>&1 || echo "OPTIONS integration may already exist"

aws apigateway put-method-response \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --resource-id "$CHAT_RESOURCE_ID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin": true, "method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true}' \
    > /dev/null 2>&1 || echo "OPTIONS response may already exist"

aws apigateway put-integration-response \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --resource-id "$CHAT_RESOURCE_ID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin": "'\''*'\''", "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type'\''", "method.response.header.Access-Control-Allow-Methods": "'\''POST,OPTIONS'\''"}' \
    > /dev/null 2>&1 || echo "OPTIONS integration response may already exist"

echo -e "${GREEN}✓ CORS configured${NC}"
echo ""

# Step 8: Deploy API (after OPTIONS/CORS is configured)
echo -e "${YELLOW}Step 8: Deploying API to stage: $STAGE...${NC}"
aws apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --stage-name "$STAGE" \
    --description "Deployment $(date +%Y-%m-%d-%H-%M-%S)" \
    > /dev/null 2>&1 || aws apigateway create-deployment \
        --rest-api-id "$API_ID" \
        --region "$REGION" \
        --stage-name "$STAGE" \
        --description "Deployment $(date +%Y-%m-%d-%H-%M-%S)" \
        > /dev/null

echo -e "${GREEN}✓ API deployed${NC}"
echo ""

# Get API URL
API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE/chat"

echo -e "${GREEN}✓ API Gateway setup complete!${NC}"
echo ""
echo "API URL: $API_URL"
echo ""
echo -e "${YELLOW}Test the API:${NC}"
echo "curl -X POST $API_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"conversationId\": \"test-123\", \"messages\": [{\"role\": \"user\", \"text\": \"Hello\"}]}'"
echo ""

