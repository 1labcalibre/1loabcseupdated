#!/bin/bash
set -e

echo "Starting Calibre Test Management System build..."

# Navigate to the web app directory
cd apps/web

echo "Installing dependencies with npm..."
npm install --legacy-peer-deps

echo "Building the application..."
npm run build -- --no-lint

echo "Build completed successfully!"
