# --- Stage 1: build the frontend + install prod deps -----------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install all dependencies (incl. dev) for the build step.
COPY package*.json ./
RUN npm ci

# Build the frontend into /app/dist.
COPY . .
RUN npm run build

# --- Stage 2: lean runtime image ------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Only the manifests + production dependencies are needed at runtime.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built frontend and the server/shared sources.
# The server runs via tsx, so it needs the TypeScript sources at runtime.
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src ./src
COPY tsconfig*.json ./

EXPOSE 3001

# Basic container health check hitting the server's /healthz endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/healthz || exit 1

CMD ["npm", "start"]
