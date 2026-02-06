#!/bin/bash

# Ten10 Project Management - Distribution Package Creator
# This script creates a clean package ready for distribution

set -e

echo "========================================"
echo "Creating distribution package..."
echo "========================================"

# Create a temporary directory for the package
PACKAGE_DIR="ten10-project-management-dist"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PACKAGE_NAME="ten10-project-management_${TIMESTAMP}"

# Remove existing package directory if it exists
if [ -d "$PACKAGE_DIR" ]; then
    rm -rf "$PACKAGE_DIR"
fi

# Create package directory
mkdir "$PACKAGE_DIR"

echo "[INFO] Copying source files..."

# Copy essential source files (excluding node_modules and build artifacts)
mkdir -p "$PACKAGE_DIR/packages/backend"
mkdir -p "$PACKAGE_DIR/packages/frontend"

# Copy backend source and config
cp -r packages/backend/src "$PACKAGE_DIR/packages/backend/"
cp -r packages/backend/prisma "$PACKAGE_DIR/packages/backend/"
cp packages/backend/package.json "$PACKAGE_DIR/packages/backend/"
cp packages/backend/tsconfig.json "$PACKAGE_DIR/packages/backend/"
cp packages/backend/jest.config.js "$PACKAGE_DIR/packages/backend/"
cp packages/backend/jest.config.auth.js "$PACKAGE_DIR/packages/backend/"
cp packages/backend/.eslintrc.js "$PACKAGE_DIR/packages/backend/"

# Copy frontend source and config
cp -r packages/frontend/src "$PACKAGE_DIR/packages/frontend/"
[ -d packages/frontend/public ] && cp -r packages/frontend/public "$PACKAGE_DIR/packages/frontend/"
cp packages/frontend/package.json "$PACKAGE_DIR/packages/frontend/"
cp packages/frontend/tsconfig.json "$PACKAGE_DIR/packages/frontend/"
cp packages/frontend/tsconfig.node.json "$PACKAGE_DIR/packages/frontend/"
cp packages/frontend/vite.config.ts "$PACKAGE_DIR/packages/frontend/"
cp packages/frontend/tailwind.config.js "$PACKAGE_DIR/packages/frontend/"
cp packages/frontend/postcss.config.js "$PACKAGE_DIR/packages/frontend/"
cp packages/frontend/.eslintrc.cjs "$PACKAGE_DIR/packages/frontend/"
cp packages/frontend/index.html "$PACKAGE_DIR/packages/frontend/"

# Copy root files
cp package.json "$PACKAGE_DIR/"
cp package-lock.json "$PACKAGE_DIR/"
cp README.md "$PACKAGE_DIR/"
cp QUICK_START.md "$PACKAGE_DIR/"
cp setup.sh "$PACKAGE_DIR/"
cp setup.bat "$PACKAGE_DIR/"
cp .gitignore "$PACKAGE_DIR/"

# Copy environment examples
cp packages/backend/.env.example "$PACKAGE_DIR/packages/backend/"
if [ -f "packages/frontend/.env.example" ]; then
    cp packages/frontend/.env.example "$PACKAGE_DIR/packages/frontend/"
fi

# Copy spec files (optional - for documentation)
if [ -d ".kiro" ]; then
    cp -r .kiro "$PACKAGE_DIR/"
fi

echo "[INFO] Cleaning up package..."

# Remove any accidentally copied build artifacts
rm -rf "$PACKAGE_DIR/packages/backend/dist" 2>/dev/null || true
rm -rf "$PACKAGE_DIR/packages/frontend/dist" 2>/dev/null || true

# Remove database files
rm -f "$PACKAGE_DIR/packages/backend/prisma/"*.db 2>/dev/null || true

# Make setup scripts executable
chmod +x "$PACKAGE_DIR/setup.sh"

echo "[INFO] Creating archive..."

# Create tar.gz archive
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_DIR"

# Create zip archive for Windows users
if command -v zip &> /dev/null; then
    zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_DIR" > /dev/null
    echo "[OK] Created ${PACKAGE_NAME}.zip"
fi

echo "[OK] Created ${PACKAGE_NAME}.tar.gz"

# Clean up temporary directory
rm -rf "$PACKAGE_DIR"

echo ""
echo "========================================"
echo "Distribution package created!"
echo "========================================"
echo ""
echo "Package files:"
echo "   - ${PACKAGE_NAME}.tar.gz (for macOS/Linux)"
if command -v zip &> /dev/null; then
    echo "   - ${PACKAGE_NAME}.zip (for Windows)"
fi
echo ""
echo "Ready to share!"
echo ""
echo "Recipients should:"
echo "1. Extract the archive"
echo "2. Run the setup script (setup.sh or setup.bat)"
echo "3. Start with: npm run dev"
echo ""
