#!/bin/bash
# FastAPI Startup Script for Unix/Linux/Mac
# This script activates the virtual environment and starts the FastAPI server

echo "Starting Machine Prediction FastAPI Server..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Activate virtual environment
VENV_PATH="$SCRIPT_DIR/env2/bin/activate"

if [ -f "$VENV_PATH" ]; then
    echo "Activating virtual environment..."
    source "$VENV_PATH"
else
    echo "Virtual environment not found at: $VENV_PATH"
    echo "Please create a virtual environment first or update the path"
    exit 1
fi

# Start FastAPI server
echo "Starting FastAPI server on http://localhost:8000..."
echo "API Documentation available at: http://localhost:8000/docs"
echo "Press Ctrl+C to stop the server"
echo ""

python predict.py
