# syntax=docker/dockerfile:1.4
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Default to dev mode
CMD ["npm", "run", "dev"]
