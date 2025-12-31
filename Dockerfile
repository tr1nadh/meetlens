# Use Node 20
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# ... after COPY . . ...

# Provide dummy variables so the static build doesn't crash
ENV GCP_PROJECT_ID=placeholder
ENV VERTEX_API_KEY=placeholder
ENV LEMONFOX_API_KEY=placeholder


# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "build/index.js"]