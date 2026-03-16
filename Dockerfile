# Polaris — single image for backend and frontend (different commands in compose)
FROM node:20-alpine

WORKDIR /app

# Copy workspace and app package files for npm install
COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

RUN npm install

# Copy full source
COPY . .

# Build shared package (required by backend and frontend)
RUN npm run build --workspace=packages/shared

# Generate Prisma client + build backend in one step (prisma generate must precede tsc)
RUN cd apps/backend && npx prisma generate && cd /app && npm run build --workspace=apps/backend

EXPOSE 3001 5173

# Default: run backend (compose overrides for frontend service)
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy && npx prisma generate && node dist/index.js"]
