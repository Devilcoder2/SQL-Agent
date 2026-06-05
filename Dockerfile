# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Production App Runner
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application files
COPY backend ./backend
COPY data ./data

# Copy built frontend assets to the directory mounted by FastAPI StaticFiles
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set working directory to the backend so imports like `from app.agents...` work properly
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Run FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
