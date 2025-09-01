#!/bin/bash

# Auto-increment version to bust Power BI cache
TIMESTAMP=$(date +%s)
VERSION="1.0.0.$TIMESTAMP"

echo "Building visual with version: $VERSION"

# Update version in pbiviz.json
sed -i "s/\"version\":\"[^\"]*\"/\"version\":\"$VERSION\"/g" pbiviz.json

# Build the visual
node ../bin/pbiviz.js package

# Rename to simple name
rm -f dist/azure.1.0.0.pbiviz
for file in dist/*.pbiviz; do
    if [ -f "$file" ]; then
        mv "$file" dist/azure.1.0.0.pbiviz
        echo "Visual built successfully: dist/azure.1.0.0.pbiviz (internal version: $VERSION)"
        break
    fi
done