# CubickEdu — production image
FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Dependencies first so they are cached between updates
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci

COPY . .
# The database is not reachable while building; pages read it only at request time
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" SESSION_SECRET="build-only-secret-build-only-secret" npm run build

ENV NODE_ENV=production
EXPOSE 3000
# Apply new database migrations, then start the site
CMD ["sh", "-c", "npx prisma migrate deploy && exec npx next start -H 0.0.0.0 -p 3000"]
