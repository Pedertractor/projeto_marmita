FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

# Para proxy corporativo com MITM TLS: --build-arg ALLOW_INSECURE_TLS=1
ARG ALLOW_INSECURE_TLS=0
RUN if [ "$ALLOW_INSECURE_TLS" = "1" ]; then \
      npm set strict-ssl false && \
      export NODE_TLS_REJECT_UNAUTHORIZED=0; \
    fi && \
    npm install

# prisma.config.ts exige DATABASE_URL ao carregar; .env não entra no build (.dockerignore)
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

COPY . .

RUN npm run build

FROM node:22-alpine

WORKDIR /usr/src/app

ARG ALLOW_INSECURE_TLS=0
RUN if [ "$ALLOW_INSECURE_TLS" = "1" ]; then \
      npm set strict-ssl false && \
      echo "NODE_TLS_REJECT_UNAUTHORIZED=0" >> /etc/environment; \
    fi

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/prisma.config.ts ./prisma.config.ts
# Seed roda com tsx e importa integrações em src/ (a API em produção usa só dist/).
COPY --from=build /usr/src/app/src ./src

RUN mkdir -p /usr/src/app/uploads && chown -R node:node /usr/src/app

VOLUME /usr/src/app/uploads

USER node

# porta que vai ficar exposta para acessar o back-end
EXPOSE 3404

# prisma generate atualiza src/generated; seed é idempotente.
# Em produção o seed só roda com ALLOW_PROD_SEED=true (ver prisma/seed.ts).
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && (npx prisma db seed || true) && npm run start"]
