FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run prisma:generate
RUN npm run build

# Copy static files to standalone directory (required for Next.js standalone)
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node .next/standalone/server.js"]
