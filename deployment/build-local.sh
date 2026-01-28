#!/bin/bash
# =============================================================================
# HR Dashboard - Local Build Script
# =============================================================================
# Run this on your Mac to build the frontend applications
# before uploading to the server
#
# Usage: bash build-local.sh
# =============================================================================

set -e

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "HR Dashboard - Local Build"
echo "=========================================="
echo "Project root: $PROJECT_ROOT"
echo ""

# -----------------------------------------------------------------------------
# Build HR Hub Frontend
# -----------------------------------------------------------------------------
echo "[1/2] Building HR Hub frontend..."
cd "$PROJECT_ROOT/frontend"
npm ci
npm run build
echo "  Built to: $PROJECT_ROOT/frontend/dist"

# -----------------------------------------------------------------------------
# Build Employee Portal
# -----------------------------------------------------------------------------
echo "[2/2] Building Employee Portal..."
cd "$PROJECT_ROOT/employee-portal"
npm ci
npm run build
echo "  Built to: $PROJECT_ROOT/employee-portal/dist"

echo ""
echo "=========================================="
echo "Build complete!"
echo "=========================================="
echo ""
echo "Next: Upload files to your server"
echo ""
echo "Option A - Using rsync (recommended):"
echo "  rsync -avz --exclude='node_modules' --exclude='.git' --exclude='venv' \\"
echo "    $PROJECT_ROOT/ user@your-server:/home/deploy/hr-dashboard/"
echo ""
echo "Option B - Using scp:"
echo "  scp -r $PROJECT_ROOT/frontend/dist user@your-server:/var/www/hr-dashboard/frontend/"
echo "  scp -r $PROJECT_ROOT/employee-portal/dist user@your-server:/var/www/hr-dashboard/employee-portal/"
echo "  scp -r $PROJECT_ROOT/backend user@your-server:/var/www/hr-dashboard/"
echo ""
