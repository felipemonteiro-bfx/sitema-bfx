FROM node:20-bullseye-slim AS deps

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install Yarn
RUN corepack enable && corepack prepare yarn@stable --activate

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --frozen-lockfile

FROM node:20-bullseye-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install Yarn
RUN corepack enable && corepack prepare yarn@stable --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn prisma:generate
RUN yarn build

FROM node:20-bullseye-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Full node_modules for runtime (includes Prisma CLI and deps)
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js migrate deploy && node server.js"]
