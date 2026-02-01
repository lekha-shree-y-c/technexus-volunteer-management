#!/bin/bash

# Test script for daily-task-email Supabase Edge Function
# Usage: ./test-function.sh

set -e

echo "🧪 Testing daily-task-email Supabase Edge Function"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI is installed${NC}"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Project not linked. Please run:${NC}"
    echo "npx supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo -e "${GREEN}✅ Project is linked${NC}"
echo ""

# Test the function
echo "🚀 Invoking daily-task-email function..."
echo ""

response=$(npx supabase functions invoke daily-task-email 2>&1)
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ Function invoked successfully!${NC}"
    echo ""
    echo "📊 Response:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    
    # Parse response if jq is available
    if command -v jq &> /dev/null; then
        emails_sent=$(echo "$response" | jq -r '.emails_sent // "N/A"')
        emails_skipped=$(echo "$response" | jq -r '.emails_skipped // "N/A"')
        emails_failed=$(echo "$response" | jq -r '.emails_failed // "N/A"')
        total_tasks=$(echo "$response" | jq -r '.total_incomplete_tasks // "N/A"')
        
        echo "📈 Summary:"
        echo "  • Total incomplete tasks: $total_tasks"
        echo "  • Emails sent: $emails_sent"
        echo "  • Emails skipped: $emails_skipped"
        echo "  • Emails failed: $emails_failed"
    fi
else
    echo -e "${RED}❌ Function invocation failed${NC}"
    echo "$response"
    exit 1
fi

echo ""
echo "💡 To view function logs, run:"
echo "   npx supabase functions logs daily-task-email"
echo ""
echo "🎉 Test completed!"
