# Build Stage
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# --- EMERGENCY FIX: Dummy variables for build-time ---
ENV VERTEX_API_KEY="dummy"
ENV GOOGLE_APPLICATION_CREDENTIALS="dummy"
ENV GCP_PROJECT_ID="dummy"
ENV LEMONFOX_API_KEY="dummy"
ENV GMAIL_ADDRESS="dummy"
ENV GMAIL_APP_PASSWORD="dummy"
ENV PUBLIC_SUPABASE_URL="https://dummy.supabase.co"
ENV PUBLIC_SUPABASE_ANON_KEY="dummy"
ENV SUPABASE_SERVICE_ROLE_KEY="dummy"
# Add this near your other ENV lines
ENV ORIGIN=https://meetlensai.up.railway.app
# -----------------------------------------------------

# Run build
RUN npm run build

# Production Stage
FROM node:20-slim
WORKDIR /app

# Copy necessary files from builder
# We use 'cp -r' logic via Docker's COPY to ensure the directory is handled correctly
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Railway Specific Networking
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# Start the server
CMD ["node", "build/index.js"]