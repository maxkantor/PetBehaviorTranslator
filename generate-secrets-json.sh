#!/bin/bash

# Script to generate secrets JSON for AWS Secrets Manager
# Usage: ./generate-secrets-json.sh

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     🔐 Generate Secrets JSON for AWS Secrets Manager         ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will create a secrets.json file with all your configuration."
echo ""

# Collect secrets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Required Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "OpenAI API Key (required): " OPENAI_API_KEY
read -p "Admin User ID (required): " ADMIN_USER_ID

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📧 Email Configuration (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "SMTP Host (leave empty to skip): " SMTP_HOST
read -p "SMTP Port [587]: " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-587}
read -p "SMTP Username (leave empty to skip): " SMTP_USERNAME
read -s -p "SMTP Password (leave empty to skip): " SMTP_PASSWORD
echo ""
read -p "Support Email [support@petbehaviortranslator.com]: " SUPPORT_EMAIL
SUPPORT_EMAIL=${SUPPORT_EMAIL:-support@petbehaviortranslator.com}
read -p "Admin Email (leave empty to skip): " ADMIN_EMAIL

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💰 Payment & Affiliate (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Amazon Associate Tag (leave empty to skip): " AMAZON_ASSOCIATE_TAG
read -p "Stripe Secret Key (leave empty to skip): " STRIPE_SECRET_KEY
read -s -p "Stripe Webhook Secret (leave empty to skip): " STRIPE_WEBHOOK_SECRET
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend & Analytics (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Frontend URL [https://www.petbehaviortranslator.com]: " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-https://www.petbehaviortranslator.com}
read -p "Google Analytics Measurement ID (leave empty to skip): " GA_MEASUREMENT_ID
read -p "Mixpanel Token (leave empty to skip): " MIXPANEL_TOKEN

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Logging (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Event Log S3 Bucket (leave empty to skip): " EVENT_LOG_BUCKET

# Build JSON
JSON="{"

# Required
JSON+="\n  \"OPENAI_API_KEY\": \"${OPENAI_API_KEY}\","
JSON+="\n  \"ADMIN_USER_ID\": \"${ADMIN_USER_ID}\""

# Optional - only add if provided
if [ -n "$AMAZON_ASSOCIATE_TAG" ]; then
  JSON+=",\n  \"AMAZON_ASSOCIATE_TAG\": \"${AMAZON_ASSOCIATE_TAG}\""
fi

if [ -n "$SMTP_HOST" ]; then
  JSON+=",\n  \"SMTP_HOST\": \"${SMTP_HOST}\","
  JSON+="\n  \"SMTP_PORT\": \"${SMTP_PORT}\""
  if [ -n "$SMTP_USERNAME" ]; then
    JSON+=",\n  \"SMTP_USERNAME\": \"${SMTP_USERNAME}\""
  fi
  if [ -n "$SMTP_PASSWORD" ]; then
    JSON+=",\n  \"SMTP_PASSWORD\": \"${SMTP_PASSWORD}\""
  fi
fi

if [ -n "$SUPPORT_EMAIL" ]; then
  JSON+=",\n  \"SUPPORT_EMAIL\": \"${SUPPORT_EMAIL}\""
fi

if [ -n "$ADMIN_EMAIL" ]; then
  JSON+=",\n  \"ADMIN_EMAIL\": \"${ADMIN_EMAIL}\""
fi

if [ -n "$STRIPE_SECRET_KEY" ]; then
  JSON+=",\n  \"STRIPE_SECRET_KEY\": \"${STRIPE_SECRET_KEY}\""
fi

if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
  JSON+=",\n  \"STRIPE_WEBHOOK_SECRET\": \"${STRIPE_WEBHOOK_SECRET}\""
fi

if [ -n "$FRONTEND_URL" ]; then
  JSON+=",\n  \"FRONTEND_URL\": \"${FRONTEND_URL}\""
fi

if [ -n "$GA_MEASUREMENT_ID" ]; then
  JSON+=",\n  \"GA_MEASUREMENT_ID\": \"${GA_MEASUREMENT_ID}\""
fi

if [ -n "$MIXPANEL_TOKEN" ]; then
  JSON+=",\n  \"MIXPANEL_TOKEN\": \"${MIXPANEL_TOKEN}\""
fi

if [ -n "$EVENT_LOG_BUCKET" ]; then
  JSON+=",\n  \"EVENT_LOG_BUCKET\": \"${EVENT_LOG_BUCKET}\""
fi

JSON+="\n}"

# Write to file
echo -e "$JSON" > secrets.json

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Secrets JSON Generated!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "File created: secrets.json"
echo ""
echo "Preview:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat secrets.json | python3 -m json.tool 2>/dev/null || cat secrets.json
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Review secrets.json"
echo "2. Go to AWS Secrets Manager Console"
echo "3. Create or update secret: /pettranslator/app-secrets"
echo "4. Paste the JSON content"
echo ""
echo "Or use AWS CLI:"
echo ""
echo "  aws secretsmanager create-secret \\"
echo "    --name /pettranslator/app-secrets \\"
echo "    --secret-string file://secrets.json"
echo ""
echo "Or update existing:"
echo ""
echo "  aws secretsmanager update-secret \\"
echo "    --secret-id /pettranslator/app-secrets \\"
echo "    --secret-string file://secrets.json"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  SECURITY: Keep secrets.json secure! Don't commit to git!"
echo ""


