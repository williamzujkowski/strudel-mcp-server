FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Install dependencies without running prepare hook
RUN npm ci --ignore-scripts

# Now build after source is available
RUN npm run build

FROM node:20-alpine AS runtime

RUN apk add --no-cache chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create patterns directory (doesn't exist in repo)
RUN mkdir -p patterns

# Copy config if it exists (optional)
COPY config.json ./ 2>/dev/null || echo '{"headless":true}' > config.json

EXPOSE 3000
CMD ["node", "dist/index.js"]