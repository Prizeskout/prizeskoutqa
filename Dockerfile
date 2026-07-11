# ---- build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# Public Supabase values — baked into the client bundle at build time.
# These are the anon/publishable keys, safe to include here.
ENV VITE_SUPABASE_URL=https://itfhekcvmcbntjndvhzg.supabase.co
ENV VITE_SUPABASE_PROJECT_ID=itfhekcvmcbntjndvhzg
ENV VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo
ENV SUPABASE_URL=https://itfhekcvmcbntjndvhzg.supabase.co
ENV SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo

RUN npm run build

# ---- runtime stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only what's needed to run the server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "server.mjs"]
